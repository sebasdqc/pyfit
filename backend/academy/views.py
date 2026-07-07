"""Endpoints de Zyfit Academy (plataforma e-learning).

Montados bajo /api/academy/ en pyfit/urls.py. Resumen de la API:

    POST /auth/login/                              login de la academia
    GET/PATCH /me/                                 identidad + flags + resumen

    # Catálogo y AUTORÍA (instructor / admin)
    GET/POST            /courses/                  catálogo / crear curso
    GET/PUT/PATCH/DELETE /courses/<id>/            detalle / editar / borrar
    GET/POST            /courses/<id>/modules/
    PUT/PATCH/DELETE     /courses/<id>/modules/<mid>/
    GET/POST            /courses/<id>/modules/<mid>/lessons/
    GET/PUT/PATCH/DELETE /courses/<id>/modules/<mid>/lessons/<lid>/
    GET/PUT              /lessons/<lid>/quiz/        upsert del quiz de una lección
    GET/POST            /quizzes/<qid>/questions/
    PUT/PATCH/DELETE     /quizzes/<qid>/questions/<question_id>/

    # APRENDIZAJE (estudiante)
    POST /courses/<id>/enroll/                      inscribirse
    GET  /courses/<id>/enrollments/                 inscritos del curso (instructor)
    GET  /enrollments/                              mis matrículas
    GET  /enrollments/<eid>/                        mi matrícula (árbol + progreso)
    POST /enrollments/<eid>/lessons/<lid>/complete/ marcar lección completada
    POST /enrollments/<eid>/quizzes/<qid>/attempt/  rendir un quiz (calificado servidor)
    GET  /enrollments/<eid>/certificate/            certificado (si emitido)
    GET  /certificates/verify/<codigo>/             verificar un certificado
    GET  /dashboard/                                Home: progreso por escuela/curso, racha, insignias, continuar
    GET  /badges/                                   catálogo de insignias de identidad (obtenida/no)

    # ENTREGABLES del Programa Evolución 360° (hitos con revisión del instructor)
    GET/POST /enrollments/<eid>/lessons/<lid>/submission/  mi entrega (ver / enviar)
    GET  /courses/<id>/submissions/                 entregas del curso (instructor)
    POST /submissions/<sid>/review/                 aprobar/rechazar una entrega

El scope (¿este recurso es visible/editable para este usuario?) se resuelve en
las vistas con helpers, igual que en Zyfit Performance. El "scoring" (calificar
quizzes, recalcular progreso, emitir certificado) vive en academy.grading.
"""

import hmac
from datetime import date

from django.conf import settings
from django.contrib.auth import get_user_model
from django.http import Http404
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.crypto import get_random_string
from django.utils.dateparse import parse_date
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from pyfit.throttles import LoginRateThrottle
from . import access_service, badges_service, dashboard_service, grading, streak_service
from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate, Submission, Tenant, School,
)
from .permissions import IsAcademyUser, can_edit_course, is_author, tenant_mismatch
from .serializers import (
    CourseSerializer, CourseDetailSerializer, ModuleSerializer, LessonSerializer,
    QuizSerializer, QuestionSerializer, EnrollmentSerializer, EnrollmentDetailSerializer,
    QuizAttemptSerializer, CertificateSerializer, SubmissionSerializer,
    SchoolSerializer, SchoolWithCoursesSerializer, localized_text,
)

User = get_user_model()


# ─── Branding por defecto (fallback cuando no hay tenant) ─────────────────────

_DEFAULT_BRANDING = {
    'nombre_plataforma': 'Zyfit Academy',
    'color_brand':        '#cc1f36',
    'color_brand_dark':   '#a61729',
    'color_brand_deep':   '#7a0f1d',
    'color_accent':       '#e63950',
    'color_accent_light': '#f06272',
    'color_accent_dark':  '#b8182e',
    'color_ok':     '#16a34a',
    'color_warn':   '#d97706',
    'color_danger': '#dc2626',
    'fuente':      'Inter',
    'tagline':     '',
    'logo_url':    '',
    'favicon_url': '',
    'tema':        'light',
}


# ─── Helpers de scope ─────────────────────────────────────────────────────────

def _get_local_date(request) -> date:
    """Fecha LOCAL del alumno (header X-Local-Date), con el mismo criterio que el
    resto del backend (workouts._get_local_date): se acepta la fecha del cliente
    solo si cae dentro de ±1 día del servidor (cubre la zona horaria sin permitir
    fechas arbitrarias que manipulen la racha). Cae a UTC si no llega.

    Es CLAVE para la racha de estudio: el "día" del streak es el del dispositivo,
    no el del servidor."""
    server_today = date.today()
    header = request.headers.get('X-Local-Date', '').strip()
    if header:
        try:
            client_date = date.fromisoformat(header)
            if abs((client_date - server_today).days) <= 1:
                return client_date
        except ValueError:
            pass
    return server_today


def _registrar_actividad_estudio(user, request, origen=''):
    """Registra actividad de estudio para la racha (efecto colateral de completar
    una lección/quiz). Failure-safe: un fallo de la racha NUNCA debe tumbar el
    flujo de aprendizaje. Devuelve la racha actual o None."""
    try:
        streak = streak_service.record_study_activity(
            user, hoy=_get_local_date(request), origen=origen,
        )
        return streak.racha_actual
    except Exception:
        return None


def _otorgar_insignias(user):
    """Evalúa y otorga (efecto colateral, failure-safe) las insignias de
    identidad recién cumplidas por `user`. Llamar SIEMPRE al final de la vista,
    después de recompute_progress y _registrar_actividad_estudio (necesita el
    estado ya guardado de ambos: progreso/estado de matrícula y racha del día).
    Nunca debe tumbar el flujo de aprendizaje."""
    try:
        nuevas = badges_service.evaluate_badges(user)
        return [
            {'id': e.badge_id, 'nombre': e.badge.nombre, 'icono': e.badge.icono}
            for e in nuevas
        ]
    except Exception:
        return []


def _course_for_read(user, pk, tenant=None):
    """Curso visible para el usuario dentro del tenant activo."""
    course = get_object_or_404(Course, pk=pk, tenant=tenant)
    if course.publicado or can_edit_course(user, course):
        return course
    raise Http404


def _course_for_edit(user, pk, tenant=None):
    """Curso editable por el usuario dentro del tenant activo, o 403/404."""
    course = get_object_or_404(Course, pk=pk, tenant=tenant)
    if not can_edit_course(user, course):
        raise PermissionDenied('No puedes editar este curso.')
    return course


def _author_context(request, course):
    """Contexto para serializar: incluye la clave de respuestas, el nivel de
    acceso a Academy (gating freemium — autor/admin nunca ven bloqueado) y el
    idioma resuelto por LocaleMiddleware."""
    user = request.user
    puede_editar = can_edit_course(user, course)
    nivel = access_service.NIVEL_PRO if puede_editar else access_service.nivel_academia_de(user)
    return {
        'include_answers': puede_editar,
        'nivel_academia': nivel,
        'locale': getattr(request, 'locale', 'es'),
    }


# ─── Config pública del tenant (sin auth) ─────────────────────────────────────

@api_view(['GET'])
@permission_classes([AllowAny])
def tenant_config(request):
    """Devuelve el branding del tenant resuelto por dominio.

    Sin autenticación: el frontend lo llama antes del login para aplicar los
    colores, logo y tipografía correctos. Si el dominio no es de ningún tenant
    registrado, devuelve los defaults de Zyfit Academy.
    """
    tenant = getattr(request, 'tenant', None)
    if tenant:
        data = {**_DEFAULT_BRANDING, **tenant.branding, 'slug': tenant.slug}
    else:
        data = dict(_DEFAULT_BRANDING)
    return Response(data)


# ─── Auth ─────────────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([AllowAny])
@throttle_classes([LoginRateThrottle])
def academy_login(request):
    """Login de la academia. Acepta las mismas credenciales que el resto del
    backend y exige `academy_acceso` (hoy: cualquier cuenta activa). Una cuenta
    inactiva recibe 403 sin revelar el motivo."""
    email = request.data.get('email', '').lower().strip()
    password = request.data.get('password', '')
    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.check_password(password):
        return Response({'error': 'Credenciales incorrectas'}, status=status.HTTP_401_UNAUTHORIZED)
    if not user.academy_acceso:
        return Response(
            {'detail': 'Esta cuenta no tiene acceso a Zyfit Academy.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    if tenant_mismatch(user, request):
        return Response(
            {'detail': 'Esta cuenta pertenece a otra organización de Zyfit Academy.'},
            status=status.HTTP_403_FORBIDDEN,
        )
    refresh = RefreshToken.for_user(user)
    return Response({
        'access': str(refresh.access_token),
        'refresh': str(refresh),
        'user': _user_payload(user),
    })


# Redes soportadas en "Datos personales". Claves libres fuera de esta lista se
# descartan en el PATCH (el JSONField no tiene schema propio).
_REDES_SOCIALES_KEYS = {'instagram', 'tiktok', 'linkedin', 'twitter', 'sitio_web'}


@api_view(['GET', 'PATCH'])
@permission_classes([IsAcademyUser])
def academy_me(request):
    """Identidad del usuario en la academia: rol, flags y resumen. PATCH deja al
    propio usuario actualizar su nombre visible y sus datos personales (país,
    ciudad, fecha de nacimiento, profesión, intereses, redes sociales) — a la
    espera de un onboarding propio de la academia."""
    user = request.user
    if request.method == 'PATCH':
        from users.models import Profile

        data = request.data
        updates = {}
        if 'nombre' in data:
            nombre = (data.get('nombre') or '').strip()
            if not nombre:
                return Response({'nombre': 'El nombre no puede estar vacío.'},
                                status=status.HTTP_400_BAD_REQUEST)
            user.first_name = nombre
            user.last_name = ''
            user.save(update_fields=['first_name', 'last_name'])
            updates['nombre'] = nombre
        if 'pais' in data:
            updates['pais'] = (data.get('pais') or '').strip()[:80]
        if 'ciudad' in data:
            updates['ciudad'] = (data.get('ciudad') or '').strip()[:120]
        if 'profesion' in data:
            updates['profesion'] = (data.get('profesion') or '').strip()[:150]
        if 'fecha_nacimiento' in data:
            raw = (data.get('fecha_nacimiento') or '').strip()
            parsed = parse_date(raw) if raw else None
            if raw and not parsed:
                return Response({'fecha_nacimiento': 'Fecha inválida.'},
                                status=status.HTTP_400_BAD_REQUEST)
            updates['fecha_nacimiento'] = parsed
        if 'intereses' in data:
            raw = data.get('intereses')
            if not isinstance(raw, list):
                return Response({'intereses': 'Debe ser una lista de textos.'},
                                status=status.HTTP_400_BAD_REQUEST)
            updates['intereses'] = [str(x).strip()[:40] for x in raw if str(x).strip()][:20]
        if 'redes_sociales' in data:
            raw = data.get('redes_sociales')
            if not isinstance(raw, dict):
                return Response({'redes_sociales': 'Debe ser un objeto.'},
                                status=status.HTTP_400_BAD_REQUEST)
            updates['redes_sociales'] = {
                k: str(v).strip()[:200]
                for k, v in raw.items()
                if k in _REDES_SOCIALES_KEYS and str(v or '').strip()
            }
        if 'perfil_deportivo' in data:
            valor = (data.get('perfil_deportivo') or '').strip()
            if valor and valor not in dict(Profile.PERFIL_DEPORTIVO_CHOICES):
                return Response({'perfil_deportivo': 'Valor inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            updates['perfil_deportivo'] = valor
        if 'anios_experiencia_deporte' in data:
            raw = data.get('anios_experiencia_deporte')
            if raw in (None, ''):
                updates['anios_experiencia_deporte'] = None
            else:
                try:
                    anios = int(raw)
                except (TypeError, ValueError):
                    return Response({'anios_experiencia_deporte': 'Debe ser un número.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                if not 0 <= anios <= 80:
                    return Response({'anios_experiencia_deporte': 'Debe estar entre 0 y 80.'},
                                    status=status.HTTP_400_BAD_REQUEST)
                updates['anios_experiencia_deporte'] = anios
        if 'modalidad_preferida' in data:
            valor = (data.get('modalidad_preferida') or '').strip()
            if valor and valor not in dict(Profile.MODALIDAD_ACADEMIA_CHOICES):
                return Response({'modalidad_preferida': 'Valor inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            updates['modalidad_preferida'] = valor
        if 'disponibilidad_estudio' in data:
            valor = (data.get('disponibilidad_estudio') or '').strip()
            if valor and valor not in dict(Profile.DISPONIBILIDAD_ACADEMIA_CHOICES):
                return Response({'disponibilidad_estudio': 'Valor inválido.'}, status=status.HTTP_400_BAD_REQUEST)
            updates['disponibilidad_estudio'] = valor
        if 'escuelas_interes' in data:
            raw = data.get('escuelas_interes')
            if not isinstance(raw, list):
                return Response({'escuelas_interes': 'Debe ser una lista.'}, status=status.HTTP_400_BAD_REQUEST)
            try:
                escuelas = sorted({int(x) for x in raw})[:20]
            except (TypeError, ValueError):
                return Response({'escuelas_interes': 'Debe ser una lista de IDs.'}, status=status.HTTP_400_BAD_REQUEST)
            updates['escuelas_interes'] = escuelas
        if data.get('onboarding_academia_completo') is True:
            updates['onboarding_academia_completo'] = True
        if updates:
            nombre_fallback = updates.get('nombre') or user.get_full_name() or user.first_name or user.email.split('@')[0]
            Profile.objects.update_or_create(
                user=user,
                defaults=updates,
                create_defaults={**updates, 'nombre': nombre_fallback},
            )
    return Response(_user_payload(user))


def _user_payload(user):
    """Resumen del usuario para la web de la academia, incluyendo los datos
    personales que vive en Profile (compartido con la app móvil)."""
    from users.models import Profile

    es_admin = user.is_admin or user.is_staff
    profile = Profile.objects.filter(user=user).first()
    return {
        'id': user.id,
        'email': user.email,
        'nombre': (user.get_full_name() or user.first_name or user.email.split('@')[0]),
        'role': user.role,
        'is_admin': es_admin,
        'is_instructor': bool(user.academy_instructor or es_admin),
        'puede_crear_cursos': is_author(user),
        'total_inscripciones': Enrollment.objects.filter(student=user).count(),
        'total_cursos_creados': Course.objects.filter(instructor=user).count(),
        'nivel_academia': access_service.nivel_academia_de(user),
        'pais': profile.pais if profile else '',
        'ciudad': profile.ciudad if profile else '',
        'fecha_nacimiento': profile.fecha_nacimiento.isoformat() if profile and profile.fecha_nacimiento else None,
        'profesion': profile.profesion if profile else '',
        'intereses': profile.intereses if profile else [],
        'redes_sociales': profile.redes_sociales if profile else {},
        'perfil_deportivo': profile.perfil_deportivo if profile else '',
        'anios_experiencia_deporte': profile.anios_experiencia_deporte if profile else None,
        'modalidad_preferida': profile.modalidad_preferida if profile else '',
        'disponibilidad_estudio': profile.disponibilidad_estudio if profile else '',
        'escuelas_interes': profile.escuelas_interes if profile else [],
        'onboarding_academia_completo': profile.onboarding_academia_completo if profile else False,
    }


# ─── Cursos (catálogo + autoría) ──────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def courses_view(request):
    """GET lista el catálogo; POST crea un curso (instructor/admin).

    GET admite filtros: `?mine=1` (mis cursos, incluye no publicados si soy autor),
    `?categoria=`, `?nivel=`, `?disciplina=`, `?licencia=`, `?q=` (búsqueda en
    título/resumen).
    """
    tenant = getattr(request, 'tenant', None)

    if request.method == 'POST':
        if not is_author(request.user):
            return Response({'detail': 'Solo un instructor o admin puede crear cursos.'},
                            status=status.HTTP_403_FORBIDDEN)
        serializer = CourseSerializer(data=request.data, context={'tenant': tenant})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        course = serializer.save(instructor=request.user, tenant=tenant)
        return Response(CourseSerializer(course).data, status=status.HTTP_201_CREATED)

    qs = Course.objects.filter(tenant=tenant)
    if request.query_params.get('mine') and is_author(request.user):
        qs = qs.filter(instructor=request.user)
    else:
        # Catálogo: solo publicados (el autor ve los suyos con ?mine=1).
        qs = qs.filter(publicado=True)
    categoria = request.query_params.get('categoria')
    nivel = request.query_params.get('nivel')
    disciplina = request.query_params.get('disciplina')
    licencia = request.query_params.get('licencia')
    q = request.query_params.get('q')
    if categoria:
        qs = qs.filter(categoria=categoria)
    if nivel:
        qs = qs.filter(nivel=nivel)
    if disciplina:
        qs = qs.filter(disciplina=disciplina)
    if licencia:
        qs = qs.filter(licencia=licencia)
    if q:
        from django.db.models import Q
        qs = qs.filter(Q(titulo__icontains=q) | Q(resumen__icontains=q))
    return Response(CourseSerializer(qs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def schools_view(request):
    """Lista las escuelas del tenant con sus cursos publicados anidados.

    Devuelve solo escuelas que tienen al menos un curso publicado, ordenadas
    por `orden`. Cada escuela incluye el array `cursos` (publicados).
    """
    tenant = getattr(request, 'tenant', None)
    schools = (
        School.objects
        .filter(tenant=tenant)
        .prefetch_related('cursos')
        .order_by('orden', 'nombre')
    )
    # Excluir escuelas sin cursos publicados (no tendría sentido mostrarlas).
    schools = [s for s in schools if s.cursos.filter(publicado=True).exists()]
    return Response(SchoolWithCoursesSerializer(schools, many=True).data)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAcademyUser])
def course_detail(request, pk):
    """Detalle del curso (árbol completo). Editar/borrar: solo autor/admin."""
    tenant = getattr(request, 'tenant', None)
    if request.method == 'GET':
        course = _course_for_read(request.user, pk, tenant)
        return Response(CourseDetailSerializer(course, context=_author_context(request, course)).data)

    course = _course_for_edit(request.user, pk, tenant)
    if request.method == 'DELETE':
        course.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = CourseSerializer(course, data=request.data, partial=request.method == 'PATCH',
                                   context={'tenant': tenant})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(CourseDetailSerializer(course, context=_author_context(request, course)).data)


# ─── Módulos ──────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def course_modules(request, pk):
    """Lista (lectura) o crea (autor) módulos de un curso."""
    tenant = getattr(request, 'tenant', None)
    if request.method == 'POST':
        course = _course_for_edit(request.user, pk, tenant)
        serializer = ModuleSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(course=course)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    course = _course_for_read(request.user, pk, tenant)
    return Response(ModuleSerializer(course.modulos.all(), many=True,
                                     context=_author_context(request, course)).data)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAcademyUser])
def module_detail(request, pk, module_id):
    """Edita o elimina un módulo de un curso (autor/admin)."""
    course = _course_for_edit(request.user, pk, getattr(request, 'tenant', None))
    module = get_object_or_404(Module, pk=module_id, course=course)
    if request.method == 'DELETE':
        module.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = ModuleSerializer(module, data=request.data, partial=request.method == 'PATCH')
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ─── Lecciones ────────────────────────────────────────────────────────────────

@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def module_lessons(request, pk, module_id):
    """Lista (lectura) o crea (autor) lecciones de un módulo."""
    tenant = getattr(request, 'tenant', None)
    if request.method == 'POST':
        course = _course_for_edit(request.user, pk, tenant)
        module = get_object_or_404(Module, pk=module_id, course=course)
        serializer = LessonSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(module=module)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    course = _course_for_read(request.user, pk, tenant)
    module = get_object_or_404(Module, pk=module_id, course=course)
    return Response(LessonSerializer(module.lecciones.all(), many=True,
                                     context=_author_context(request, course)).data)


def _bloqueo_academy_pro(request, course, lesson):
    """403 si `lesson` requiere Academy Pro y el usuario no tiene acceso
    (defensa en profundidad: aunque el árbol ya sirve la lección bloqueada sin
    contenido, esto evita leerla/completarla llamando al endpoint directo por
    id). Autor/admin del curso nunca están bloqueados. None si puede continuar."""
    user = request.user
    if can_edit_course(user, course):
        return None
    nivel = access_service.nivel_academia_de(user)
    if access_service.puede_ver_leccion(nivel, lesson):
        return None
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(
        {
            'detail': 'requiere_academy_pro',
            'modulo': localized_text(lesson.module, 'titulo', context),
            'curso': localized_text(course, 'titulo', context),
        },
        status=status.HTTP_403_FORBIDDEN,
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAcademyUser])
def lesson_detail(request, pk, module_id, lesson_id):
    """Consulta (lectura), edita o elimina una lección (autor/admin para mutar)."""
    tenant = getattr(request, 'tenant', None)
    if request.method == 'GET':
        course = _course_for_read(request.user, pk, tenant)
        module = get_object_or_404(Module, pk=module_id, course=course)
        lesson = get_object_or_404(Lesson, pk=lesson_id, module=module)
        bloqueo = _bloqueo_academy_pro(request, course, lesson)
        if bloqueo:
            return bloqueo
        return Response(LessonSerializer(lesson, context=_author_context(request, course)).data)

    course = _course_for_edit(request.user, pk, tenant)
    module = get_object_or_404(Module, pk=module_id, course=course)
    lesson = get_object_or_404(Lesson, pk=lesson_id, module=module)
    if request.method == 'DELETE':
        lesson.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = LessonSerializer(lesson, data=request.data, partial=request.method == 'PATCH')
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(LessonSerializer(lesson, context=_author_context(request, course)).data)


# ─── Quiz y preguntas ─────────────────────────────────────────────────────────

def _lesson_course(lesson):
    return lesson.module.course


@api_view(['GET', 'PUT'])
@permission_classes([IsAcademyUser])
def lesson_quiz(request, lesson_id):
    """GET el quiz de una lección (sin clave si es estudiante); PUT lo crea/actualiza
    (autor). El quiz es 1:1 con la lección; PUT hace upsert."""
    lesson = get_object_or_404(Lesson, pk=lesson_id)
    course = _lesson_course(lesson)

    if request.method == 'GET':
        # Lectura: visible si el curso es legible para el usuario.
        if not (course.publicado or can_edit_course(request.user, course)):
            raise Http404
        bloqueo = _bloqueo_academy_pro(request, course, lesson)
        if bloqueo:
            return bloqueo
        quiz = getattr(lesson, 'quiz', None)
        if not quiz:
            return Response({'detail': 'Esta lección no tiene quiz.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(QuizSerializer(quiz, context=_author_context(request, course)).data)

    # PUT (autor): upsert.
    if not can_edit_course(request.user, course):
        raise PermissionDenied('No puedes editar este curso.')
    quiz = getattr(lesson, 'quiz', None)
    serializer = QuizSerializer(quiz, data=request.data, partial=quiz is not None)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save(lesson=lesson)
    return Response(serializer.data, status=status.HTTP_200_OK if quiz else status.HTTP_201_CREATED)


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def quiz_questions(request, quiz_id):
    """Lista (lectura) o crea (autor) preguntas de un quiz."""
    quiz = get_object_or_404(Quiz, pk=quiz_id)
    course = _lesson_course(quiz.lesson)

    if request.method == 'POST':
        if not can_edit_course(request.user, course):
            raise PermissionDenied('No puedes editar este curso.')
        serializer = QuestionSerializer(data=request.data,
                                        context={'include_answers': True})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        serializer.save(quiz=quiz)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    if not (course.publicado or can_edit_course(request.user, course)):
        raise Http404
    return Response(QuestionSerializer(quiz.preguntas.all(), many=True,
                                       context=_author_context(request, course)).data)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAcademyUser])
def question_detail(request, quiz_id, question_id):
    """Edita o elimina una pregunta de un quiz (autor/admin)."""
    quiz = get_object_or_404(Quiz, pk=quiz_id)
    course = _lesson_course(quiz.lesson)
    if not can_edit_course(request.user, course):
        raise PermissionDenied('No puedes editar este curso.')
    question = get_object_or_404(Question, pk=question_id, quiz=quiz)
    if request.method == 'DELETE':
        question.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    serializer = QuestionSerializer(question, data=request.data, partial=request.method == 'PATCH',
                                    context={'include_answers': True})
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    serializer.save()
    return Response(serializer.data)


# ─── Inscripción ──────────────────────────────────────────────────────────────

@api_view(['POST'])
@permission_classes([IsAcademyUser])
def course_enroll(request, pk):
    """Inscribe al usuario autenticado en un curso publicado (idempotente)."""
    course = _course_for_read(request.user, pk, getattr(request, 'tenant', None))
    if not course.publicado and not can_edit_course(request.user, course):
        return Response({'detail': 'El curso no está disponible.'}, status=status.HTTP_400_BAD_REQUEST)
    enrollment, _created = Enrollment.objects.get_or_create(student=request.user, course=course)
    grading.recompute_progress(enrollment)
    return Response(
        EnrollmentSerializer(enrollment, context={'locale': getattr(request, 'locale', 'es')}).data,
        status=status.HTTP_201_CREATED if _created else status.HTTP_200_OK,
    )


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def course_enrollments(request, pk):
    """Inscritos de un curso (solo autor/admin): quién está y su progreso."""
    course = _course_for_edit(request.user, pk, getattr(request, 'tenant', None))
    qs = course.enrollments.select_related('student').all()
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(EnrollmentSerializer(qs, many=True, context=context).data)


# ─── Aprendizaje (matrículas del estudiante) ──────────────────────────────────

def _my_enrollment_or_404(user, enrollment_id):
    """Matrícula del propio estudiante (o accesible por el autor/admin del curso)."""
    enrollment = get_object_or_404(Enrollment, pk=enrollment_id)
    if enrollment.student_id == user.id or can_edit_course(user, enrollment.course):
        return enrollment
    raise Http404


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def my_enrollments(request):
    """Mis matrículas (mis cursos en curso / completados)."""
    qs = Enrollment.objects.filter(student=request.user).select_related('course')
    context = {'locale': getattr(request, 'locale', 'es')}
    return Response(EnrollmentSerializer(qs, many=True, context=context).data)


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def enrollment_detail(request, enrollment_id):
    """Matrícula con el árbol del curso, lecciones completadas e intentos."""
    enrollment = _my_enrollment_or_404(request.user, enrollment_id)
    context = _author_context(request, enrollment.course)
    return Response(EnrollmentDetailSerializer(enrollment, context=context).data)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def lesson_complete(request, enrollment_id, lesson_id):
    """Marca una lección como completada dentro de la matrícula y recalcula el
    progreso (el estudiante solo opera sobre su propia matrícula). Una lección
    "entregable" NO se puede autocompletar: la completa el instructor al aprobar
    la entrega (submission_review)."""
    enrollment = get_object_or_404(Enrollment, pk=enrollment_id, student=request.user)
    lesson = get_object_or_404(Lesson, pk=lesson_id, module__course=enrollment.course)
    bloqueo = _bloqueo_academy_pro(request, enrollment.course, lesson)
    if bloqueo:
        return bloqueo
    if lesson.tipo == 'entregable':
        return Response(
            {'detail': 'Esta lección se completa cuando el instructor aprueba tu entrega.'},
            status=status.HTTP_400_BAD_REQUEST,
        )
    LessonProgress.objects.get_or_create(
        enrollment=enrollment, lesson=lesson, defaults={'completado': True},
    )
    pct = grading.recompute_progress(enrollment)
    # La racha de estudio se actualiza como efecto colateral de la acción real de
    # aprendizaje (sin endpoint aparte que el front deba llamar).
    racha = _registrar_actividad_estudio(request.user, request, origen='leccion')
    # Insignias de identidad: SIEMPRE al final, después de que progreso y racha
    # ya quedaron guardados (ver docstring de _otorgar_insignias).
    nuevas_insignias = _otorgar_insignias(request.user)
    return Response({
        'progreso': pct, 'estado': enrollment.estado, 'racha_estudio': racha,
        'nuevas_insignias': nuevas_insignias,
    })


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def quiz_attempt(request, enrollment_id, quiz_id):
    """Rinde un quiz: el SERVIDOR califica las respuestas crudas, guarda el intento
    y, si aprueba, marca la lección del quiz como completada y recalcula el progreso.
    Body: `{respuestas: {question_id: [opcion_ids]}}`."""
    enrollment = get_object_or_404(Enrollment, pk=enrollment_id, student=request.user)
    quiz = get_object_or_404(Quiz, pk=quiz_id, lesson__module__course=enrollment.course)
    bloqueo = _bloqueo_academy_pro(request, enrollment.course, quiz.lesson)
    if bloqueo:
        return bloqueo

    resultado = grading.grade_attempt(quiz, request.data.get('respuestas') or {})
    attempt = QuizAttempt.objects.create(
        enrollment=enrollment, quiz=quiz,
        respuestas=request.data.get('respuestas') or {},
        detalle=resultado['detalle'],
        puntaje=resultado['puntaje'],
        aprobado=resultado['aprobado'],
    )
    # Al aprobar, la lección del quiz queda completada (cuenta para el progreso).
    if resultado['aprobado']:
        LessonProgress.objects.get_or_create(
            enrollment=enrollment, lesson=quiz.lesson, defaults={'completado': True},
        )
    pct = grading.recompute_progress(enrollment)
    # Rendir un quiz cuenta como actividad de estudio del día (aprobado o no).
    racha = _registrar_actividad_estudio(request.user, request, origen='quiz')
    # Insignias de identidad: SIEMPRE al final, después de que progreso y racha
    # ya quedaron guardados (ver docstring de _otorgar_insignias).
    nuevas_insignias = _otorgar_insignias(request.user)
    data = QuizAttemptSerializer(attempt).data
    data['progreso'] = pct
    data['estado'] = enrollment.estado
    data['racha_estudio'] = racha
    data['nuevas_insignias'] = nuevas_insignias
    return Response(data, status=status.HTTP_201_CREATED)


# ─── Racha de estudio (gamificación de retención) ─────────────────────────────

@api_view(['GET'])
@permission_classes([IsAcademyUser])
def streak_view(request):
    """Estado de la racha de estudio del usuario autenticado: racha activa, mejor
    racha histórica, freezes disponibles, estado (activa/en_riesgo/congelada/
    recuperable), alerta motivacional y ventana de recuperación. Solo lectura: la
    racha se actualiza sola al completar lecciones/quizzes (ver streak_service)."""
    return Response(streak_service.get_or_create_state(
        request.user, hoy=_get_local_date(request),
    ))


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def dashboard_view(request):
    """Home del estudiante: progreso por escuela/curso, racha, insignias,
    continuar/siguiente-paso y estadísticas de por vida, en una sola llamada.
    Solo lectura y en vivo (sin caché) — ver dashboard_service.build_dashboard."""
    return Response(dashboard_service.build_dashboard(
        request.user, tenant=getattr(request, 'tenant', None), hoy=_get_local_date(request),
    ))


# ─── Insignias de identidad (gamificación transversal) ─────────────────────────

@api_view(['GET'])
@permission_classes([IsAcademyUser])
def badges_view(request):
    """Catálogo de insignias de identidad (activas) con estado obtenida/no del
    usuario autenticado — para pintar la galería completa (obtenidas a color,
    no obtenidas en silueta) en el dashboard/perfil. Solo lectura: el
    otorgamiento ocurre solo como efecto colateral de completar una
    lección/quiz/entrega (ver badges_service)."""
    return Response(badges_service.catalog_state(request.user))


# ─── Simulador de carga interna (escuela Analítica y Rendimiento Deportivo) ────
# Expone SOLO la familia "carga" (sRPE → carga semanal/monotonía/strain → ACWR)
# del motor de calculadoras de Zyfit Performance (performance.calculators) como
# herramienta pedagógica: mismo cálculo que corre en el panel B2B, sin exigir
# cuenta de Performance (`performance_acceso`) — cualquier estudiante autenticado
# de la Academia lo usa con datos de un caso ficticio. No expone el resto del
# catálogo (físico/técnico/táctico), que es contenido propietario de Performance.

SIMULADOR_CARGA_SLUGS = {'srpe', 'carga-semanal', 'acwr'}


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def simulador_carga_catalog(request):
    """Esquema de inputs de las calculadoras de carga disponibles en el simulador."""
    from performance.calculators import catalog as performance_catalog

    items = [c for c in performance_catalog() if c['slug'] in SIMULADOR_CARGA_SLUGS]
    return Response(items)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def simulador_carga_compute(request):
    """Calcula un test de la familia 'carga' sin persistir (previsualización en vivo).

    Body: `{test_slug, inputs}`. Reutiliza el MISMO motor que Zyfit Performance
    (single source of truth de las fórmulas); restringido a SIMULADOR_CARGA_SLUGS.
    """
    from performance.calculators import CalculatorError, get_calculator

    slug = (request.data.get('test_slug') or '').strip()
    if slug not in SIMULADOR_CARGA_SLUGS:
        return Response(
            {'errors': {'test_slug': 'Calculadora no disponible en este simulador.'}},
            status=status.HTTP_400_BAD_REQUEST,
        )
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


# ─── Simulador de planificación de sesión (escuela Ciencia del Entrenamiento) ──────────────
# Práctica pedagógica sobre calcular_fatiga/calcular_rpe_target de ai_workout —
# ver academy.simulador_sesion (el número correcto SIEMPRE sale de esas
# funciones reales, nunca de una reimplementación propia de la Academia).

@api_view(['GET'])
@permission_classes([IsAcademyUser])
def simulador_sesion_casos(request):
    """Catálogo de casos del simulador, sin las respuestas correctas."""
    from . import simulador_sesion
    return Response(simulador_sesion.listar_casos())


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def simulador_sesion_evaluar(request):
    """Corrige la propuesta del estudiante para un caso. Body:
    `{caso_id, fatiga, rpe_target, ejercicios_seleccionados}`."""
    from . import simulador_sesion

    caso_id = (request.data.get('caso_id') or '').strip()
    try:
        resultado = simulador_sesion.evaluar(caso_id, request.data)
    except simulador_sesion.SimuladorSesionError as e:
        return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
    return Response(resultado)


# ─── Simulador de Return-to-Play (escuela Recuperación, Prevención y Wellness) ─────────────
# Reutiliza la familia 'prevencion' del motor de Zyfit Performance — ver
# academy.simulador_prevencion (los resultados de los tests SIEMPRE salen de
# performance.calculators; la Academia solo añade la capa de decisión).

@api_view(['GET'])
@permission_classes([IsAcademyUser])
def simulador_prevencion_casos(request):
    """Catálogo de casos del simulador, sin resolver (sin decisión correcta)."""
    from . import simulador_prevencion
    return Response(simulador_prevencion.listar_casos())


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def simulador_prevencion_evaluar(request):
    """Corrige la decisión del estudiante para un caso. Body: `{caso_id, decision}`."""
    from . import simulador_prevencion

    caso_id = (request.data.get('caso_id') or '').strip()
    decision = (request.data.get('decision') or '').strip()
    try:
        resultado = simulador_prevencion.evaluar(caso_id, decision)
    except simulador_prevencion.SimuladorPrevencionError as e:
        return Response({'errors': e.errors}, status=status.HTTP_400_BAD_REQUEST)
    return Response(resultado)


@api_view(['POST'])
@permission_classes([AllowAny])
def streak_sweep(request):
    """Barrido diario de rachas por HTTP (equivalente al comando academy_streak_sweep).

    Pensado para dispararse desde un cron externo (GitHub Actions) que no tiene
    sesión de usuario. Se protege con un secreto compartido (settings.CRON_SECRET):
    la request debe traer la cabecera `X-Cron-Secret`. Sin CRON_SECRET configurado
    el endpoint queda deshabilitado (503). Compara en tiempo constante."""
    secret = getattr(settings, 'CRON_SECRET', '') or ''
    if not secret:
        return Response({'detail': 'Cron deshabilitado (falta CRON_SECRET).'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    provided = request.headers.get('X-Cron-Secret', '')
    if not hmac.compare_digest(provided, secret):
        return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)
    return Response(streak_service.run_daily_maintenance())


@api_view(['POST'])
@permission_classes([AllowAny])
def bootstrap_admin(request):
    """Crea o promueve una cuenta a admin de producto (`role='admin'`) sin
    necesitar acceso a shell en producción. Mismo secreto compartido y mismo
    patrón que `streak_sweep` (cabecera `X-Cron-Secret`, comparación en
    tiempo constante, 503 si `CRON_SECRET` no está configurado) — pensado
    para dispararse una vez a mano (curl/Postman), no desde un cron.

    Idempotente por email: si la cuenta ya existe, solo la promueve (nunca
    toca su contraseña). Si no existe, la crea con una contraseña aleatoria
    devuelta UNA sola vez en la respuesta — no se guarda en texto plano en
    ningún lado."""
    secret = getattr(settings, 'CRON_SECRET', '') or ''
    if not secret:
        return Response({'detail': 'Deshabilitado (falta CRON_SECRET).'},
                        status=status.HTTP_503_SERVICE_UNAVAILABLE)
    provided = request.headers.get('X-Cron-Secret', '')
    if not hmac.compare_digest(provided, secret):
        return Response({'detail': 'No autorizado.'}, status=status.HTTP_403_FORBIDDEN)

    email = (request.data.get('email') or '').strip().lower()
    if not email:
        return Response({'error': 'email requerido'}, status=status.HTTP_400_BAD_REQUEST)

    user = User.objects.filter(email__iexact=email).first()
    if user:
        user.role = User.ROLE_ADMIN
        user.save(update_fields=['role'])
        return Response({'email': email, 'role': user.role, 'created': False})

    password = get_random_string(20)
    user = User.objects.create_user(
        username=email, email=email, password=password, role=User.ROLE_ADMIN,
    )
    return Response({'email': email, 'role': user.role, 'created': True, 'password': password})


# ─── Entregables del Programa Evolución 360° ──────────────────────────────────

def _validar_entrega(lesson, texto, video_url):
    """Valida el contenido de una entrega según el tipo de entregable de la
    lección. Devuelve un mensaje de error o None si es válida."""
    if lesson.tipo != 'entregable':
        return 'Esta lección no es un entregable.'
    if lesson.entregable_tipo == 'video':
        if not (video_url.startswith('http://') or video_url.startswith('https://')):
            return 'Este entregable requiere la URL de tu video (http/https).'
    elif not texto.strip():
        return 'Este entregable requiere un texto (tu análisis o planificación).'
    return None


@api_view(['GET', 'POST'])
@permission_classes([IsAcademyUser])
def lesson_submission(request, enrollment_id, lesson_id):
    """Mi entrega para una lección entregable.

    GET devuelve la entrega (404 si aún no envié nada). POST la crea o, si fue
    rechazada o sigue en revisión, la reemplaza y vuelve a 'enviada'. Una entrega
    aprobada queda cerrada. Body: `{texto, video_url}` según el tipo.
    """
    enrollment = get_object_or_404(Enrollment, pk=enrollment_id, student=request.user)
    lesson = get_object_or_404(Lesson, pk=lesson_id, module__course=enrollment.course)
    submission = Submission.objects.filter(enrollment=enrollment, lesson=lesson).first()

    if request.method == 'GET':
        if not submission:
            return Response({'detail': 'Aún no has enviado esta entrega.'},
                            status=status.HTTP_404_NOT_FOUND)
        return Response(SubmissionSerializer(submission).data)

    texto = (request.data.get('texto') or '').strip()
    video_url = (request.data.get('video_url') or '').strip()
    error = _validar_entrega(lesson, texto, video_url)
    if error:
        return Response({'detail': error}, status=status.HTTP_400_BAD_REQUEST)
    if submission and submission.estado == Submission.ESTADO_APROBADA:
        return Response({'detail': 'Esta entrega ya fue aprobada.'},
                        status=status.HTTP_400_BAD_REQUEST)

    if submission:
        submission.texto = texto
        submission.video_url = video_url
        submission.estado = Submission.ESTADO_ENVIADA
        submission.save(update_fields=['texto', 'video_url', 'estado', 'updated_at'])
        created = False
    else:
        submission = Submission.objects.create(
            enrollment=enrollment, lesson=lesson, texto=texto, video_url=video_url,
        )
        created = True
    return Response(SubmissionSerializer(submission).data,
                    status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def course_submissions(request, pk):
    """Entregas de un curso para revisión (solo autor/admin). Filtro `?estado=`
    (enviada/aprobada/rechazada); por defecto las pendientes primero."""
    course = _course_for_edit(request.user, pk, getattr(request, 'tenant', None))
    qs = (Submission.objects
          .filter(enrollment__course=course)
          .select_related('enrollment__student', 'lesson', 'revisado_por'))
    estado = request.query_params.get('estado')
    if estado:
        qs = qs.filter(estado=estado)
    return Response(SubmissionSerializer(qs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAcademyUser])
def submission_review(request, submission_id):
    """Revisión del instructor: `{estado: aprobada|rechazada, feedback}`.

    Al aprobar, la lección del entregable queda completada y el servidor
    recalcula progreso, insignias y (si procede) certificado. Al rechazar, la
    entrega vuelve al estudiante con el feedback para reenviar."""
    submission = get_object_or_404(
        Submission.objects.select_related('enrollment__course', 'lesson'), pk=submission_id,
    )
    if not can_edit_course(request.user, submission.enrollment.course):
        raise PermissionDenied('No puedes revisar entregas de este curso.')

    estado = request.data.get('estado')
    if estado not in (Submission.ESTADO_APROBADA, Submission.ESTADO_RECHAZADA):
        return Response({'estado': "Debe ser 'aprobada' o 'rechazada'."},
                        status=status.HTTP_400_BAD_REQUEST)

    submission.estado = estado
    submission.feedback = (request.data.get('feedback') or '').strip()
    submission.revisado_por = request.user
    submission.revisado_at = timezone.now()
    submission.save(update_fields=['estado', 'feedback', 'revisado_por', 'revisado_at', 'updated_at'])

    enrollment = submission.enrollment
    if estado == Submission.ESTADO_APROBADA:
        LessonProgress.objects.get_or_create(
            enrollment=enrollment, lesson=submission.lesson, defaults={'completado': True},
        )
    else:
        # Si se revierte una aprobación previa, la lección deja de contar.
        LessonProgress.objects.filter(enrollment=enrollment, lesson=submission.lesson).delete()
    grading.recompute_progress(enrollment)
    # Insignias de identidad: son del ALUMNO de la matrícula, no de request.user
    # (quien llama este endpoint es el instructor revisando la entrega).
    nuevas_insignias = _otorgar_insignias(enrollment.student)

    data = SubmissionSerializer(submission).data
    data['progreso'] = enrollment.progreso
    data['estado_matricula'] = enrollment.estado
    data['nuevas_insignias'] = nuevas_insignias
    return Response(data)


# ─── Certificados ─────────────────────────────────────────────────────────────

@api_view(['GET'])
@permission_classes([IsAcademyUser])
def enrollment_certificate(request, enrollment_id):
    """Certificado de una matrícula (si ya se emitió por haberla completado)."""
    enrollment = _my_enrollment_or_404(request.user, enrollment_id)
    cert = getattr(enrollment, 'certificado', None)
    if not cert:
        return Response({'detail': 'Aún no hay certificado para esta matrícula.'},
                        status=status.HTTP_404_NOT_FOUND)
    return Response(CertificateSerializer(cert, context={'locale': getattr(request, 'locale', 'es')}).data)


@api_view(['GET'])
@permission_classes([IsAcademyUser])
def certificate_verify(request, codigo):
    """Verifica un certificado por su código: devuelve curso + estudiante + fecha."""
    cert = get_object_or_404(Certificate, codigo=codigo.upper())
    return Response(CertificateSerializer(cert, context={'locale': getattr(request, 'locale', 'es')}).data)
