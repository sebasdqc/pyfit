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
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from pyfit.throttles import LoginRateThrottle
from .calculators import CalculatorError, catalog, get_calculator
from .models import (
    SportsCenter, CenterMembership, CenterAthlete,
    PerformanceMetric, InjuryReport, PhysicalTest, TrainingPlan, PsychAssessment,
    Mesocycle, Microcycle,
    ALL_MODULES, MODULE_RENDIMIENTO, MODULE_LESIONES, MODULE_TEST,
    MODULE_PLANIFICACION, MODULE_PSICOLOGICO,
)
from .permissions import IsPerformanceUser, IsDirectorOrAdmin, user_centers
from .serializers import (
    SportsCenterSerializer, CenterMembershipSerializer, CenterAthleteSerializer,
    PerformanceMetricSerializer, InjuryReportSerializer, PhysicalTestSerializer,
    TrainingPlanSerializer, TrainingPlanDetailSerializer, PsychAssessmentSerializer,
    MesocycleSerializer, MicrocycleSerializer,
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


@api_view(['GET'])
@permission_classes([IsPerformanceUser])
def performance_me(request):
    """Identidad del usuario en el panel: rol global, centros y módulos visibles."""
    return Response(_user_payload(request.user))


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
        serializer = CenterAthleteSerializer(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(registrado_por=request.user)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = center.atletas.select_related('athlete').all()
    return Response(CenterAthleteSerializer(qs, many=True).data)


# ─── Módulos (rendimiento / lesiones / test / planificación / psicológico) ────

def _module_endpoint(request, pk, model, serializer_cls, owner_field):
    """Lista/crea registros de un módulo, siempre acotados al centro.

    owner_field: nombre del FK que guarda al staff autor ('registrado_por' o
    'creado_por'), inyectado en la creación a partir del usuario autenticado.
    """
    center = _get_center_or_404(request.user, pk)
    if request.method == 'POST':
        data = {**request.data, 'center': center.id}
        serializer = serializer_cls(data=data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(**{owner_field: request.user})
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    qs = model.objects.filter(center=center)
    return Response(serializer_cls(qs, many=True).data)


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_rendimiento(request, pk):
    return _module_endpoint(request, pk, PerformanceMetric, PerformanceMetricSerializer, 'registrado_por')


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_lesiones(request, pk):
    return _module_endpoint(request, pk, InjuryReport, InjuryReportSerializer, 'registrado_por')


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


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_planificacion(request, pk):
    return _module_endpoint(request, pk, TrainingPlan, TrainingPlanSerializer, 'creado_por')


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


@api_view(['GET', 'POST'])
@permission_classes([IsPerformanceUser])
def module_psicologico(request, pk):
    return _module_endpoint(request, pk, PsychAssessment, PsychAssessmentSerializer, 'registrado_por')
