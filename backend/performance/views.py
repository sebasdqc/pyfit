"""Endpoints del panel Zyfit Performance (vertical B2B).

Estructura de la API (montada bajo /api/performance/ en pyfit/urls.py):

    POST /auth/login/                         login del panel (gatea acceso B2B)
    GET  /me/                                 usuario + centros + módulos visibles

    GET/POST  /centers/                       listar / crear centros
    GET       /centers/<id>/                  detalle de centro
    GET/POST  /centers/<id>/staff/            staff del centro / alta de staff
    GET/POST  /centers/<id>/athletes/         atletas / registrar atleta (director)

    GET/POST  /centers/<id>/rendimiento/      módulo RENDIMIENTO
    GET/POST  /centers/<id>/lesiones/         módulo LESIONES
    GET/POST  /centers/<id>/test/             módulo TEST
    GET/POST  /centers/<id>/planificacion/    módulo PLANIFICACIÓN
    GET/POST  /centers/<id>/psicologico/      módulo PSICOLÓGICO

Las vistas implementan el esqueleto: auth, scoping por centro y permisos. El
filtrado avanzado, paginación y la UI quedan fuera de alcance de este andamiaje.
"""

from django.contrib.auth import get_user_model
from django.db import IntegrityError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from pyfit.throttles import LoginRateThrottle
from .calculators import CalculatorError, catalog, get_calculator
from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    Mesocycle, Microcycle, WellnessCheckin, TacticalPlay, CalendarEvent,
    ALL_MODULES, MODULE_RENDIMIENTO, MODULE_LESIONES, MODULE_TEST,
    MODULE_PLANIFICACION, MODULE_PSICOLOGICO,
)
from .permissions import IsPerformanceUser, IsDirectorOrAdmin, user_centers, can_access_module
from .serializers import (
    SportsCenterSerializer, CenterMembershipSerializer, CenterAthleteSerializer,
    PerformanceMetricSerializer, InjuryReportSerializer, PhysicalTestSerializer,
    TrainingPlanSerializer, TrainingPlanDetailSerializer, PsychAssessmentSerializer,
    MesocycleSerializer, MicrocycleSerializer, WellnessCheckinSerializer,
    TacticalPlaySerializer, CalendarEventSerializer,
)

User = get_user_model()


# ─── Helpers de scope ─────────────────────────────────────────────────────────

def _get_center_or_404(user, pk):
    """Devuelve el centro si el usuario puede verlo, o lanza 404.

    Evita filtrar la existencia de centros ajenos: si no está en el scope del
    usuario, responde 404 igual que si no existiera."""
    center = get_object_or_404(SportsCenter, pk=pk)
    allowed = user_centers(user)
    if allowed is not None and center.id not in allowed:
        from django.http import Http404
        raise Http404
    return center


def _assert_module(user, center, modulo):
    """Gating fino server-side: 403 si el usuario no tiene `modulo` en este centro.

    El scope (¿pertenece al centro?) ya se validó con _get_center_or_404; esto
    añade la capa de "¿qué módulos de este centro puede ver?" según su rol/whitelist
    (antes solo lo aplicaba el sidebar del frontend). Ver permissions.can_access_module.
    """
    if not can_access_module(user, center, modulo):
        raise PermissionDenied('No tienes acceso a este módulo en este centro.')


def _resolve_or_create_user(email, nombre, password=None, *, require_password=False):
    """Vincula a una persona por email para darla de alta como staff o atleta.

    Devuelve (user, error_str). Si la cuenta existe, la reutiliza (ignora la
    contraseña). Si no existe, la crea:
      - staff (require_password=True): necesita contraseña — entra al panel.
      - atleta (require_password=False): se crea con contraseña no usable; es una
        cuenta de consumo que la persona podrá reclamar luego en la app móvil.
    Crea también un Profile con el nombre para mantenerlo visible y consistente.
    """
    from users.models import Profile

    email = (email or '').lower().strip()
    nombre = (nombre or '').strip()
    if not email or '@' not in email:
        return None, 'Indica un email válido.'

    existing = User.objects.filter(email__iexact=email).first()
    if existing:
        return existing, None

    if require_password:
        if not password or len(password) < 8:
            return None, 'La contraseña temporal debe tener al menos 8 caracteres.'

    try:
        # password=None hace que create_user fije una contraseña no usable.
        user = User.objects.create_user(
            username=email, email=email, password=password if require_password else None,
        )
    except IntegrityError:
        return None, 'Ya existe una cuenta con ese email.'

    if nombre:
        user.first_name = nombre
        user.save(update_fields=['first_name'])
    Profile.objects.get_or_create(user=user, defaults={'nombre': nombre or email.split('@')[0]})
    return user, None


# ─── Auth ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def performance_login(request):
    """Login del panel B2B. Acepta las mismas credenciales que el resto del
    backend pero exige `performance_acceso` (director, admin o staff). Si la
    cuenta existe pero no tiene acceso al panel, responde 403 sin revelar el rol.
    """
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.check_password(password):
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.performance_acceso:
        return Response(
            {'detail': 'Esta cuenta no tiene acceso a Zyfit Performance.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': _user_payload(user),
    })


@api_view(['GET', 'PATCH'])
@permission_classes([IsPerformanceUser])
def performance_me(request):
    """Identidad del usuario en el panel: rol global, centros y módulos visibles.

    PATCH deja que el propio usuario actualice su nombre visible. Se guarda en
    `first_name` (sin `last_name`), igual que `_resolve_or_create_user`, de modo
    que `_user_payload` lo lea de `get_full_name()` y se refleje en todo el panel
    (saludo "Hola, X", avatares, perfil). Mantiene `Profile.nombre` consistente.
    """
    user = request.user
    if request.method == 'PATCH':
        if 'nombre' in request.data:
            nombre = (request.data.get('nombre') or '').strip()
            if not nombre:
                return Response(
                    {'nombre': 'El nombre no puede estar vacío.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            user.first_name = nombre
            user.last_name = ''
            user.save(update_fields=['first_name', 'last_name'])
            from users.models import Profile
            Profile.objects.update_or_create(user=user, defaults={'nombre': nombre})
    return Response(_user_payload(user))


def _user_payload(user):
    """Resumen del usuario para el frontend: rol, flags y pertenencias."""
    memberships = (
        CenterMembership.objects.filter(user=user, activo=True)
        .select_related('center')
    )
    centros = [
        {
            'center_id': m.center_id,
            'center_nombre': m.center.nombre,
            'rol': m.rol,
            'modulos': m.modulos,
        }
        for m in memberships
    ]
    # El admin/staff ve todos los módulos en cualquier centro.
    es_admin = user.is_admin or user.is_staff
    return {
        'id': user.id,
        'email': user.email,
        'nombre': (user.get_full_name() or user.first_name or user.email.split('@')[0]),
        'role': user.role,
        'is_admin': es_admin,
        'is_director': user.is_director,
        'modulos_globales': ALL_MODULES if es_admin else [],
        'centros': centros,
    }


# ─── Centros ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def centers_view(request):
    if request.method == 'POST':
        # Crear un centro es acción de director/admin.
        if not (request.user.is_director or request.user.is_admin or request.user.is_staff):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = SportsCenterSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        center = serializer.save(director_principal=request.user)
        # El creador queda como director técnico del centro.
        CenterMembership.objects.get_or_create(
            center=center, user=request.user,
            defaults={'rol': CenterMembership.ROL_DIRECTOR},
        )
        return Response(SportsCenterSerializer(center).data, status=status.HTTP_201_CREATED)

    allowed = user_centers(request.user)
    qs = SportsCenter.objects.all()
    if allowed is not None:
        qs = qs.filter(id__in=allowed)
    return Response(SportsCenterSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsPerformanceUser])
def center_detail(request, pk):
    center = _get_center_or_404(request.user, pk)
    return Response(SportsCenterSerializer(center).data)


# ─── Staff del centro ─────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def center_staff(request, pk):
    center = _get_center_or_404(request.user, pk)
    if request.method == 'POST':
        if not (request.user.is_director or request.user.is_admin or request.user.is_staff):
            return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
        data = {**request.data, 'center': center.id}
        # Alta por email: vincula o crea la cuenta del staff (necesita contraseña
        # para entrar al panel). También se acepta un `user` por id directamente.
        if not data.get('user'):
            user_obj, err = _resolve_or_create_user(
                data.get('email'), data.get('nombre'), data.get('password'),
                require_password=True,
            )
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            data['user'] = user_obj.id
        serializer = CenterMembershipSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = center.memberships.select_related('user').all()
    return Response(CenterMembershipSerializer(qs, many=True).data)


# ─── Atletas del centro (Paso 2: los registra el director) ────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def center_athletes(request, pk):
    center = _get_center_or_404(request.user, pk)
    if request.method == 'POST':
        # A diferencia del consumo (el atleta ingresa un código), aquí el director
        # registra al atleta: por eso la alta exige rol director/admin.
        if not (request.user.is_director or request.user.is_admin or request.user.is_staff):
            return Response(
                {'detail': 'Solo el director técnico puede registrar atletas.'},
                status=status.HTTP_403_FORBIDDEN,
            )
        data = {**request.data, 'center': center.id}
        # Alta por email: vincula o crea la cuenta del atleta (sin contraseña; es
        # una cuenta de consumo que reclamará luego). También se acepta `athlete`
        # por id directamente.
        if not data.get('athlete'):
            user_obj, err = _resolve_or_create_user(
                data.get('email'), data.get('nombre'), require_password=False,
            )
            if err:
                return Response({'detail': err}, status=status.HTTP_400_BAD_REQUEST)
            data['athlete'] = user_obj.id
        serializer = CenterAthleteSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = center.atletas.select_related('athlete').all()
    return Response(CenterAthleteSerializer(qs, many=True).data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def center_athlete_detail(request, pk, athlete_pk):
    """Ficha de un atleta del centro: consulta, edición (incluida la foto) y baja.

    `athlete_pk` es el id del vínculo CenterAthlete (no el del usuario). La
    edición y la baja exigen rol director/admin, como el alta. La foto viaja en
    el payload como data URL (ver CenterAthleteSerializer.validate_foto).
    """
    center = _get_center_or_404(request.user, pk)
    link = get_object_or_404(CenterAthlete, pk=athlete_pk, center=center)

    if request.method == 'GET':
        return Response(CenterAthleteSerializer(link).data)

    if not (request.user.is_director or request.user.is_admin or request.user.is_staff):
        return Response(
            {'detail': 'Solo el director técnico puede editar atletas.'},
            status=status.HTTP_403_FORBIDDEN,
        )

    if request.method == 'DELETE':
        link.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    partial = request.method == 'PATCH'
    serializer = CenterAthleteSerializer(link, data=request.data, partial=partial)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ─── Módulos (rendimiento / lesiones / test / planificación / psicológico) ────

def _module_endpoint(request, pk, model, serializer_cls, owner_field, modulo):
    """Lista/crea registros de un módulo, siempre acotados al centro.

    owner_field: nombre del FK que guarda al staff autor ('registrado_por' o
    'creado_por'), inyectado en la creación a partir del usuario autenticado.
    modulo: id de módulo que el usuario debe tener habilitado en el centro.
    """
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, modulo)
    if request.method == 'POST':
        data = {**request.data, 'center': center.id}
        serializer = serializer_cls(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(**{owner_field: request.user})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = model.objects.filter(center=center)
    return Response(serializer_cls(qs, many=True).data)


def _module_detail(request, pk, record_id, model, serializer_cls, modulo, *, editable=True):
    """Consulta / edita / borra un registro de un módulo, acotado al centro.

    Comparte el gating fino y el scope con la lista. `editable=False` deja solo
    GET/DELETE (sin PATCH): es el caso de Test y Psicológico, donde los resultados
    los calcula el servidor y no deben poder reescribirse desde el cliente.
    """
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, modulo)
    obj = get_object_or_404(model, pk=record_id, center=center)
    if request.method == 'GET':
        return Response(serializer_cls(obj).data)
    if request.method == 'DELETE':
        obj.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    if not editable:
        return Response(
            {'detail': 'Este registro no admite edición (el cálculo lo hace el servidor).'},
            status=status.HTTP_405_METHOD_NOT_ALLOWED,
        )
    serializer = serializer_cls(obj, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_rendimiento(request, pk):
    return _module_endpoint(request, pk, PerformanceMetric, PerformanceMetricSerializer, 'registrado_por', MODULE_RENDIMIENTO)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_lesiones(request, pk):
    return _module_endpoint(request, pk, InjuryReport, InjuryReportSerializer, 'registrado_por', MODULE_LESIONES)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def lesiones_detail(request, pk, record_id):
    """Parte de lesión: consulta, edición (p. ej. dar de alta) y borrado."""
    return _module_detail(request, pk, record_id, InjuryReport, InjuryReportSerializer, MODULE_LESIONES)


# ─── Módulo TEST: catálogo, cálculo en vivo y registro ────────────────────────

@api_view(['GET'])
@permission_classes([IsPerformanceUser])
def tests_catalog(request):
    """Catálogo de tests disponibles (slug, familia, nombre, descripción y
    `input_schema` que el frontend renderiza como formulario).

    Se sirve del REGISTRY del motor (fuente única de verdad), no de la tabla
    TestDefinition: así el catálogo del panel siempre refleja el código vigente.
    Filtro opcional `?familia=fisico|tecnico|tactico`.
    """
    items = catalog()
    familia = request.query_params.get('familia')
    if familia:
        items = [c for c in items if c['familia'] == familia]
    return Response(items)


@api_view(['POST'])
@permission_classes([IsPerformanceUser])
def tests_compute(request):
    """Calcula los resultados de un test SIN persistir (previsualización en vivo).

    Body: `{test_slug, inputs}`. El cálculo ocurre siempre en el servidor; el
    frontend solo captura inputs crudos. Errores de validación → 400 por campo.
    """
    slug = (request.data.get('test_slug') or '').strip()
    try:
        calc = get_calculator(slug)
        resultados = calc.run(request.data.get('inputs') or {})
    except CalculatorError as e:
        return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
    return Response({
        'test_slug': calc.slug,
        'nombre': calc.nombre,
        'familia': calc.familia,
        'resultados': resultados,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_test(request, pk):
    """Módulo TEST. GET lista los resultados del centro; POST registra uno.

    Dos vías de POST:
      • Con calculadora: enviar `test_slug` + `inputs`. El SERVIDOR valida y
        calcula (nunca confía en resultados que mande el cliente) y persiste
        `inputs` (entrada validada) + `resultados` (salida del motor).
      • Manual / legado: enviar `nombre` + `resultado` (+ `unidad`), un único valor.
    """
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_TEST)
    if request.method == 'POST':
        slug = (request.data.get('test_slug') or '').strip()
        data = {
            'center': center.id,
            'athlete': request.data.get('athlete'),
            'fecha': request.data.get('fecha'),
            'notas': request.data.get('notas', ''),
        }
        if slug:
            # Vía calculadora: el servidor recalcula desde los inputs crudos.
            try:
                calc = get_calculator(slug)
                clean = calc.validate(request.data.get('inputs') or {})
                resultados = calc.compute(clean)
            except CalculatorError as e:
                return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
            data.update({
                'test_slug': calc.slug,
                'nombre': calc.nombre,
                'categoria': calc.familia,
                'inputs': clean,
                'resultados': resultados,
                'resultado': None,
                'unidad': '',
            })
        else:
            # Vía manual: un único valor; no se aceptan blobs de cálculo del cliente.
            data.update({
                'test_slug': '',
                'nombre': request.data.get('nombre', ''),
                'categoria': request.data.get('categoria', ''),
                'inputs': {},
                'resultados': {},
                'resultado': request.data.get('resultado'),
                'unidad': request.data.get('unidad', ''),
            })
        serializer = PhysicalTestSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = PhysicalTest.objects.filter(center=center)
    return Response(PhysicalTestSerializer(qs, many=True).data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsPerformanceUser])
def test_detail(request, pk, record_id):
    """Resultado de test: consulta o borrado. No editable (lo calcula el servidor)."""
    return _module_detail(request, pk, record_id, PhysicalTest, PhysicalTestSerializer, MODULE_TEST, editable=False)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_planificacion(request, pk):
    return _module_endpoint(request, pk, TrainingPlan, TrainingPlanSerializer, 'creado_por', MODULE_PLANIFICACION)


# ─── Planificación: periodización (macrociclo → mesociclos → microciclos) ─────
# Todo cuelga del macrociclo (TrainingPlan). Cada handler valida la cadena de
# pertenencia centro → plan → mesociclo → microciclo y devuelve 404 si se rompe,
# de modo que no se puede tocar la periodización de un centro ajeno.

def _get_plan_or_404(center, plan_id):
    return get_object_or_404(TrainingPlan, pk=plan_id, center=center)


@api_view(['GET', 'DELETE'])
@permission_classes([IsPerformanceUser])
def plan_detail(request, pk, plan_id):
    """Árbol completo del macrociclo (fases + semanas), o lo elimina."""
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PLANIFICACION)
    plan = _get_plan_or_404(center, plan_id)
    if request.method == 'DELETE':
        plan.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    return Response(TrainingPlanDetailSerializer(plan).data)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def plan_mesociclos(request, pk, plan_id):
    """Lista / crea las fases (mesociclos) de un macrociclo."""
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PLANIFICACION)
    plan = _get_plan_or_404(center, plan_id)
    if request.method == 'POST':
        serializer = MesocycleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(plan=plan)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(MesocycleSerializer(plan.mesociclos.all(), many=True).data)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def mesociclo_detail(request, pk, plan_id, meso_id):
    """Actualiza o elimina una fase del macrociclo."""
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PLANIFICACION)
    plan = _get_plan_or_404(center, plan_id)
    meso = get_object_or_404(Mesocycle, pk=meso_id, plan=plan)
    if request.method == 'DELETE':
        meso.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = MesocycleSerializer(meso, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def meso_microciclos(request, pk, plan_id, meso_id):
    """Lista / crea las semanas (microciclos) de una fase."""
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PLANIFICACION)
    plan = _get_plan_or_404(center, plan_id)
    meso = get_object_or_404(Mesocycle, pk=meso_id, plan=plan)
    if request.method == 'POST':
        serializer = MicrocycleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(mesociclo=meso)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(MicrocycleSerializer(meso.microciclos.all(), many=True).data)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def microciclo_detail(request, pk, plan_id, meso_id, micro_id):
    """Actualiza o elimina una semana de una fase."""
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PLANIFICACION)
    plan = _get_plan_or_404(center, plan_id)
    meso = get_object_or_404(Mesocycle, pk=meso_id, plan=plan)
    micro = get_object_or_404(Microcycle, pk=micro_id, mesociclo=meso)
    if request.method == 'DELETE':
        micro.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = MicrocycleSerializer(micro, data=request.data, partial=True)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsPerformanceUser])
def instruments_catalog(request):
    """Catálogo de cuestionarios validados (slug, nombre, subescalas) para que el
    frontend pinte cada formulario. Se sirve de `performance.psicometria`."""
    from .psicometria import catalog
    return Response(catalog())


@api_view(['POST'])
@permission_classes([IsPerformanceUser])
def instruments_score(request):
    """Calcula los resultados de un cuestionario SIN persistir. Body:
    `{instrument, subescalas}`. El cálculo ocurre siempre en el servidor."""
    from .psicometria import InstrumentError, score
    try:
        out = score((request.data.get('instrument') or '').strip(), request.data.get('subescalas') or {})
    except InstrumentError as e:
        return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
    return Response(out)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_psicologico(request, pk):
    """Módulo PSICOLÓGICO. GET lista; POST registra una evaluación.

    Dos vías de POST:
      • Con instrumento: `instrument` + `subescalas`. El SERVIDOR calcula los
        resultados (nunca confía en los del cliente) y guarda el índice principal.
      • Manual: `tipo` + `puntuacion`.
    """
    from .psicometria import InstrumentError, score
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PSICOLOGICO)
    if request.method == 'POST':
        slug = (request.data.get('instrument') or '').strip()
        data = {
            'center': center.id,
            'athlete': request.data.get('athlete'),
            'fecha': request.data.get('fecha'),
            'notas': request.data.get('notas', ''),
        }
        if slug:
            try:
                out = score(slug, request.data.get('subescalas') or {})
            except InstrumentError as e:
                return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
            data.update({
                'tipo': 'otro',
                'instrument': out['instrument'],
                'subescalas': out['subescalas'],
                'resultados': out['resultados'],
                'puntuacion': out['resultados'].get('indice'),
            })
        else:
            data.update({
                'tipo': request.data.get('tipo', 'otro'),
                'instrument': '',
                'subescalas': {},
                'resultados': {},
                'puntuacion': request.data.get('puntuacion'),
            })
        serializer = PsychAssessmentSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = PsychAssessment.objects.filter(center=center)
    return Response(PsychAssessmentSerializer(qs, many=True).data)


@api_view(['GET', 'DELETE'])
@permission_classes([IsPerformanceUser])
def psicologico_detail(request, pk, record_id):
    """Evaluación psicológica: consulta o borrado. No editable (scoring en servidor)."""
    return _module_detail(request, pk, record_id, PsychAssessment, PsychAssessmentSerializer, MODULE_PSICOLOGICO, editable=False)


# ─── Psicológico: monitoreo de bienestar (wellness check-ins) ─────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def psicologico_wellness(request, pk):
    """Lista / registra check-ins de bienestar de un centro. El índice de
    bienestar lo calcula el servidor al guardar. Filtro opcional `?athlete=<id>`.
    """
    center = _get_center_or_404(request.user, pk)
    _assert_module(request.user, center, MODULE_PSICOLOGICO)
    if request.method == 'POST':
        data = {**request.data, 'center': center.id}
        serializer = WellnessCheckinSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = WellnessCheckin.objects.filter(center=center)
    athlete = request.query_params.get('athlete')
    if athlete:
        qs = qs.filter(athlete=athlete)
    return Response(WellnessCheckinSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsPerformanceUser])
def wellness_compute(request):
    """Calcula el índice de bienestar (0–100) + estado SIN persistir, desde las 5
    subescalas (1–7). El cálculo ocurre siempre en el servidor."""
    from .wellness import ITEM_NAMES, SCALE_MAX, SCALE_MIN, compute_index, estado
    vals, errors = {}, {}
    for n in ITEM_NAMES:
        try:
            iv = int(request.data.get(n))
            if iv < SCALE_MIN or iv > SCALE_MAX:
                raise ValueError
            vals[n] = iv
        except (TypeError, ValueError):
            errors[n] = f'Debe ser un entero entre {SCALE_MIN} y {SCALE_MAX}.'
    if errors:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)
    idx = compute_index(vals)
    return Response({'indice_bienestar': idx, 'estado': estado(idx)})


# ─── Simulador (pizarra táctica) ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def center_plays(request, pk):
    """Lista / crea jugadas de la pizarra táctica del centro.

    La escena llega con coordenadas normalizadas (0..1); el serializer las valida.
    Cualquier usuario con acceso al panel y al centro puede crear jugadas (es una
    herramienta de trabajo del cuerpo técnico, no un alta administrativa)."""
    center = _get_center_or_404(request.user, pk)
    if request.method == 'POST':
        serializer = TacticalPlaySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(center=center, registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    qs = center.jugadas.select_related('registrado_por').all()
    return Response(TacticalPlaySerializer(qs, many=True).data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def play_detail(request, pk, play_id):
    """Consulta, actualiza o elimina una jugada del centro."""
    center = _get_center_or_404(request.user, pk)
    play = get_object_or_404(TacticalPlay, pk=play_id, center=center)
    if request.method == 'GET':
        return Response(TacticalPlaySerializer(play).data)
    if request.method == 'DELETE':
        play.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    partial = request.method == 'PATCH'
    serializer = TacticalPlaySerializer(play, data=request.data, partial=partial)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ─── Calendario (temporadas, torneos, partidos, eventos) ──────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def center_events(request, pk):
    """Lista / crea eventos del calendario del centro.

    GET admite un filtro de rango opcional con ?desde=YYYY-MM-DD&hasta=YYYY-MM-DD
    que devuelve los eventos que SOLAPAN ese rango (un evento abarca desde
    fecha_inicio hasta fecha_fin, o solo fecha_inicio si fecha_fin es null).

    Cualquier usuario con acceso al panel y al centro puede gestionar el
    calendario (es una herramienta del cuerpo técnico, no un alta administrativa).
    """
    center = _get_center_or_404(request.user, pk)
    if request.method == 'POST':
        serializer = CalendarEventSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(center=center, registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = center.eventos.select_related('registrado_por').all()
    desde = request.query_params.get('desde')
    hasta = request.query_params.get('hasta')
    if desde or hasta:
        from django.db.models import F
        from django.db.models.functions import Coalesce
        qs = qs.annotate(_fin=Coalesce('fecha_fin', F('fecha_inicio')))
        if hasta:
            qs = qs.filter(fecha_inicio__lte=hasta)
        if desde:
            qs = qs.filter(_fin__gte=desde)
    return Response(CalendarEventSerializer(qs, many=True).data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsPerformanceUser])
def event_detail(request, pk, event_id):
    """Consulta, actualiza o elimina un evento del calendario del centro."""
    center = _get_center_or_404(request.user, pk)
    event = get_object_or_404(CalendarEvent, pk=event_id, center=center)
    if request.method == 'GET':
        return Response(CalendarEventSerializer(event).data)
    if request.method == 'DELETE':
        event.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    partial = request.method == 'PATCH'
    serializer = CalendarEventSerializer(event, data=request.data, partial=partial)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)
