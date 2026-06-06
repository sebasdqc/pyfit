"""Motor de cálculo de tests de evaluación deportiva (Zyfit Performance).

REGLA INNEGOCIABLE: todo el cálculo de resultados derivados, scores y normativas
vive aquí, en el servidor. El frontend solo captura inputs crudos y envía.

Cada test es una subclase de `TestCalculator` registrada por `slug` con `@register`.
El REGISTRY es la fuente única de verdad del catálogo (slug, familia, esquema de
inputs) y de las fórmulas. Añadir un test nuevo = declarar una subclase y
decorarla; no requiere migraciones (la tabla TestDefinition se siembra desde aquí
con `manage.py seed_tests`).

Flujo: calculator.run(raw) → validate(raw) (coerciona y valida) → compute(clean).
Los errores de validación se lanzan como `CalculatorError` con mensajes claros por
campo; la vista los traduce a HTTP 400.
"""

from __future__ import annotations

# Familias del catálogo.
FAMILIA_FISICO = 'fisico'
FAMILIA_TECNICO = 'tecnico'
FAMILIA_TACTICO = 'tactico'
FAMILIAS = (FAMILIA_FISICO, FAMILIA_TECNICO, FAMILIA_TACTICO)


class CalculatorError(Exception):
    """Error de validación de inputs.

    `errors` es un dict {campo: mensaje}. Un string se normaliza a
    {'__all__': mensaje}. La vista lo serializa como 400.
    """

    def __init__(self, errors):
        if isinstance(errors, str):
            errors = {'__all__': errors}
        self.errors = errors
        super().__init__(str(errors))


def round2(x):
    """Redondea a 2 decimales conservando None."""
    return None if x is None else round(float(x), 2)


class TestCalculator:
    """Base de toda calculadora de test.

    Subclases definen: slug, familia, nombre, descripcion, input_schema y
    compute(). Pueden sobreescribir validate() para reglas que cruzan campos.
    """

    slug: str = ''
    familia: str = ''
    nombre: str = ''
    descripcion: str = ''
    # Esquema de inputs que el frontend debe renderizar. Cada item:
    #   {name, label, type ('int'|'number'|'list'), unit, required, min?, max?}
    input_schema: list[dict] = []

    # ── API pública ──────────────────────────────────────────────────────────
    def run(self, raw: dict) -> dict:
        return self.compute(self.validate(raw))

    def validate(self, raw: dict) -> dict:
        """Valida/normaliza los inputs declarados. Devuelve un dict limpio con los
        tipos coercionados (solo los campos presentes). Lanza CalculatorError."""
        if not isinstance(raw, dict):
            raise CalculatorError('Los datos de entrada deben ser un objeto.')
        clean: dict = {}
        errors: dict = {}
        for field in self.input_schema:
            name = field['name']
            present = name in raw and raw[name] not in (None, '')
            if not present:
                if field.get('required', True):
                    errors[name] = 'Campo obligatorio.'
                continue
            try:
                clean[name] = self._coerce(raw[name], field)
            except CalculatorError as e:
                errors[name] = e.errors.get('__all__', 'Valor inválido.')
        if errors:
            raise CalculatorError(errors)
        return clean

    def _coerce(self, value, field):
        ftype = field.get('type', 'number')
        try:
            if ftype == 'int':
                v = int(value)
            elif ftype == 'list':
                if not isinstance(value, (list, tuple)) or len(value) == 0:
                    raise ValueError
                v = [float(x) for x in value]
            else:  # 'number'
                v = float(value)
        except (TypeError, ValueError):
            kind = {'int': 'número entero', 'list': 'lista de números'}.get(ftype, 'número')
            raise CalculatorError(f'Debe ser un {kind}.')
        mn, mx = field.get('min'), field.get('max')
        for s in (v if isinstance(v, list) else [v]):
            if mn is not None and s < mn:
                raise CalculatorError(f'Debe ser ≥ {mn}.')
            if mx is not None and s > mx:
                raise CalculatorError(f'Debe ser ≤ {mx}.')
        return v

    def compute(self, clean: dict) -> dict:  # pragma: no cover - abstract
        raise NotImplementedError

    # ── Catálogo ─────────────────────────────────────────────────────────────
    def as_catalog(self) -> dict:
        return {
            'slug': self.slug,
            'familia': self.familia,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'input_schema': self.input_schema,
        }


# ── Registry / dispatcher ─────────────────────────────────────────────────────
REGISTRY: dict[str, TestCalculator] = {}


def register(cls):
    """Decorador que instancia y registra una calculadora por su slug."""
    inst = cls()
    if not inst.slug:
        raise ValueError(f'{cls.__name__} no define slug.')
    if inst.familia not in FAMILIAS:
        raise ValueError(f'{cls.__name__}: familia inválida {inst.familia!r}.')
    if inst.slug in REGISTRY:
        raise ValueError(f'slug duplicado en el registry: {inst.slug!r}')
    REGISTRY[inst.slug] = inst
    return cls


def get_calculator(slug: str) -> TestCalculator:
    """Devuelve la calculadora del slug, o lanza CalculatorError si no existe."""
    try:
        return REGISTRY[slug]
    except KeyError:
        raise CalculatorError({'test_slug': f'Test desconocido: {slug!r}.'})


def catalog() -> list[dict]:
    """Catálogo completo (ordenado por slug) para el endpoint público."""
    return [REGISTRY[s].as_catalog() for s in sorted(REGISTRY)]
