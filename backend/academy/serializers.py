"""Serializers de Zyfit Academy.

Regla de seguridad clave: la CLAVE de respuestas de un quiz
(`Question.respuestas_correctas`) solo se expone a quien puede editar el curso.
Para el estudiante se serializa sin ese campo. El interruptor es el flag de
contexto `include_answers` (lo fija la vista según el rol).
"""

from django.contrib.auth import get_user_model
from rest_framework import serializers

from . import access_service
from .blog_models import BlogPost
from .community_models import CommunityPost, CommunityReply, CommunityReport
from .library_models import LibraryResource
from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
    Submission, CourseBadge, School,
)

User = get_user_model()


def _display_name(user):
    """Nombre visible de una cuenta (sin depender de un Profile)."""
    if user is None:
        return ''
    full = (user.get_full_name() or '').strip()
    return full or user.first_name or user.email.split('@')[0]


def localized_text(instance, field, context):
    """Valor de `field` en el idioma de `context['locale']` (lo fija
    `academy.middleware.LocaleMiddleware` vía las vistas). Cae siempre al
    español si no hay traducción todavía, o si `instance` es None (ej. un
    post de comunidad sin curso asociado)."""
    if instance is None:
        return None
    value = getattr(instance, field, '')
    if context.get('locale') == 'en':
        en_value = getattr(instance, f'{field}_en', '')
        if en_value:
            return en_value
    return value


class LocalizedFieldsMixin:
    """Para cada nombre de campo en `LOCALIZED_FIELDS`, sustituye el valor en
    español por su `<campo>_en` cuando el contexto pide inglés (`locale='en'`)
    y existe traducción; si no, deja el español. El contexto lo arma la vista
    a partir de `request.locale`."""

    LOCALIZED_FIELDS = ()

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if self.context.get('locale') == 'en':
            for field in self.LOCALIZED_FIELDS:
                en_value = getattr(instance, f'{field}_en', '')
                if en_value:
                    data[field] = en_value
        return data


# ─── Preguntas / Quiz ─────────────────────────────────────────────────────────

class QuestionSerializer(serializers.ModelSerializer):
    """Pregunta. Oculta `respuestas_correctas` salvo que el contexto pida la clave
    (`include_answers=True`), de modo que el estudiante nunca recibe la solución."""

    class Meta:
        model = Question
        fields = [
            'id', 'quiz', 'orden', 'enunciado', 'video_url', 'tipo',
            'opciones', 'respuestas_correctas', 'puntos',
        ]
        read_only_fields = ['id', 'quiz']

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if not self.context.get('include_answers'):
            data.pop('respuestas_correctas', None)
        return data

    def validate(self, attrs):
        # La clave de respuestas debe referenciar ids de opción existentes.
        opciones = attrs.get('opciones', getattr(self.instance, 'opciones', []) or [])
        correctas = attrs.get('respuestas_correctas',
                              getattr(self.instance, 'respuestas_correctas', []) or [])
        ids = {str(o.get('id')) for o in opciones if isinstance(o, dict)}
        for c in correctas:
            if str(c) not in ids:
                raise serializers.ValidationError(
                    {'respuestas_correctas': f'La opción {c!r} no existe en `opciones`.'}
                )
        return attrs


class QuizSerializer(serializers.ModelSerializer):
    preguntas = QuestionSerializer(many=True, read_only=True)
    total_puntos = serializers.SerializerMethodField()

    class Meta:
        model = Quiz
        fields = ['id', 'lesson', 'titulo', 'puntaje_aprobacion', 'preguntas', 'total_puntos']
        read_only_fields = ['id', 'lesson']

    def get_total_puntos(self, obj):
        return sum(p.puntos for p in obj.preguntas.all())


# ─── Lecciones / Módulos ──────────────────────────────────────────────────────

class LessonSerializer(serializers.ModelSerializer):
    """`bloqueado` refleja el gating freemium (ver academy.access_service):
    visible pero bloqueado, no oculto — el estudiante Free ve que la lección
    existe (título/tipo/duración) pero no su contenido. El contexto debe traer
    `nivel_academia` ('starter'/'pro'); si no se provee (rutas de autoría,
    siempre desbloqueadas) se asume 'pro'."""

    quiz = serializers.SerializerMethodField()
    bloqueado = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'orden', 'titulo', 'tipo',
            'contenido', 'video_url', 'duracion_min',
            'fecha_en_vivo', 'entregable_tipo', 'quiz', 'bloqueado', 'created_at',
        ]
        read_only_fields = ['id', 'module', 'created_at']

    def _bloqueado(self, obj):
        nivel = self.context.get('nivel_academia', access_service.NIVEL_PRO)
        return not access_service.puede_ver_leccion(nivel, obj)

    def get_bloqueado(self, obj):
        return self._bloqueado(obj)

    def get_quiz(self, obj):
        if self._bloqueado(obj):
            return None
        quiz = getattr(obj, 'quiz', None)
        if not quiz:
            return None
        return QuizSerializer(quiz, context=self.context).data

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('bloqueado'):
            data['contenido'] = ''
            data['video_url'] = ''
        return data


class ModuleSerializer(LocalizedFieldsMixin, serializers.ModelSerializer):
    LOCALIZED_FIELDS = ('titulo', 'descripcion')

    lecciones = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'course', 'orden', 'titulo', 'descripcion', 'es_gratuito', 'lecciones', 'created_at']
        read_only_fields = ['id', 'course', 'created_at']


# ─── Insignias (Check-list de Competencias del Programa 360°) ─────────────────

class CourseBadgeSerializer(serializers.ModelSerializer):
    """Definición de una insignia del curso (hito → lección que la otorga)."""

    class Meta:
        model = CourseBadge
        fields = ['id', 'course', 'orden', 'nombre', 'icono', 'descripcion', 'lesson']
        read_only_fields = ['id', 'course']


# ─── Cursos ───────────────────────────────────────────────────────────────────

class SchoolSerializer(LocalizedFieldsMixin, serializers.ModelSerializer):
    LOCALIZED_FIELDS = ('nombre', 'descripcion')

    total_cursos = serializers.SerializerMethodField()

    class Meta:
        model = School
        fields = ['id', 'nombre', 'slug', 'descripcion', 'orden', 'total_cursos', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_total_cursos(self, obj):
        return obj.cursos.filter(publicado=True).count()


class SchoolWithCoursesSerializer(SchoolSerializer):
    """Escuela con sus cursos publicados anidados — para el catálogo agrupado."""

    cursos = serializers.SerializerMethodField()

    class Meta(SchoolSerializer.Meta):
        fields = SchoolSerializer.Meta.fields + ['cursos']

    def get_cursos(self, obj):
        cursos = obj.cursos.filter(publicado=True).order_by('created_at')
        return CourseSerializer(cursos, many=True, context=self.context).data


class CourseSerializer(LocalizedFieldsMixin, serializers.ModelSerializer):
    """Resumen de curso para el catálogo y la autoría."""

    LOCALIZED_FIELDS = ('titulo', 'resumen', 'descripcion')

    instructor_nombre = serializers.SerializerMethodField()
    escuela_nombre = serializers.SerializerMethodField()
    escuela_slug = serializers.SerializerMethodField()
    total_modulos = serializers.SerializerMethodField()
    total_lecciones = serializers.SerializerMethodField()
    total_inscritos = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'school', 'escuela_nombre', 'escuela_slug', 'instructor', 'instructor_nombre',
            'titulo', 'slug', 'resumen',
            'descripcion', 'categoria', 'nivel',
            'disciplina', 'licencia', 'modalidad', 'carga_horaria_h', 'acredita_renovacion',
            'portada', 'duracion_estimada_min',
            'publicado', 'total_modulos', 'total_lecciones', 'total_inscritos',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'instructor', 'created_at', 'updated_at']

    def get_escuela_nombre(self, obj):
        return localized_text(obj.school, 'nombre', self.context) if obj.school_id else None

    def get_escuela_slug(self, obj):
        return obj.school.slug if obj.school_id else None

    def get_instructor_nombre(self, obj):
        return _display_name(obj.instructor)

    def get_total_modulos(self, obj):
        return obj.modulos.count()

    def get_total_lecciones(self, obj):
        return Lesson.objects.filter(module__course=obj).count()

    def get_total_inscritos(self, obj):
        return obj.enrollments.count()

    def validate_school(self, value):
        """La escuela debe pertenecer al mismo tenant que el curso (o ambos ser
        del catálogo raíz sin tenant) — si no, un instructor podría colgar su
        curso de una escuela de OTRO tenant. El contexto trae `tenant`
        (lo fija la vista según el dominio de la request)."""
        if value is None:
            return value
        tenant = self.context.get('tenant')
        tenant_id = tenant.id if tenant else None
        if value.tenant_id != tenant_id:
            raise serializers.ValidationError('La escuela no pertenece a este tenant.')
        return value

    def validate_portada(self, value):
        # Acepta vacío, un data URL de imagen o una URL http(s).
        if not value:
            return value
        if value.startswith('data:image/'):
            if len(value) > 1_500_000:  # ~1 MB de imagen — margen holgado en base64
                raise serializers.ValidationError('La portada es demasiado grande.')
            return value
        if value.startswith('http://') or value.startswith('https://'):
            return value
        raise serializers.ValidationError('La portada debe ser un data URL de imagen o una URL.')


class CourseDetailSerializer(CourseSerializer):
    """Curso con su árbol completo (módulos → lecciones → quiz) e insignias."""

    modulos = ModuleSerializer(many=True, read_only=True)
    insignias = CourseBadgeSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['modulos', 'insignias']


# ─── Aprendizaje (matrículas / progreso / intentos / certificados) ────────────

class CertificateSerializer(serializers.ModelSerializer):
    curso_titulo = serializers.SerializerMethodField()
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ['id', 'enrollment', 'codigo', 'curso_titulo', 'estudiante_nombre', 'emitido_at']
        read_only_fields = fields

    def get_curso_titulo(self, obj):
        return localized_text(obj.enrollment.course, 'titulo', self.context)

    def get_estudiante_nombre(self, obj):
        return _display_name(obj.enrollment.student)


class SubmissionSerializer(serializers.ModelSerializer):
    """Entrega de un "entregable". El estudiante solo envía `texto`/`video_url`
    (lo gestiona la vista); estado, feedback y revisión los escribe el servidor."""

    estudiante_nombre = serializers.SerializerMethodField()
    leccion_titulo = serializers.CharField(source='lesson.titulo', read_only=True)
    entregable_tipo = serializers.CharField(source='lesson.entregable_tipo', read_only=True)
    revisado_por_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Submission
        fields = [
            'id', 'enrollment', 'lesson', 'leccion_titulo', 'entregable_tipo',
            'estudiante_nombre', 'texto', 'video_url', 'estado', 'feedback',
            'revisado_por', 'revisado_por_nombre', 'revisado_at',
            'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_estudiante_nombre(self, obj):
        return _display_name(obj.enrollment.student)

    def get_revisado_por_nombre(self, obj):
        return _display_name(obj.revisado_por)


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = [
            'id', 'enrollment', 'quiz', 'respuestas', 'detalle',
            'puntaje', 'aprobado', 'created_at',
        ]
        # Todo lo calcula el servidor; el cliente solo envía `respuestas` a la vista.
        read_only_fields = fields


class EnrollmentSerializer(serializers.ModelSerializer):
    """Resumen de matrícula (lista 'mis cursos' / inscritos de un curso)."""

    curso_titulo = serializers.SerializerMethodField()
    curso_slug = serializers.CharField(source='course.slug', read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()
    certificado = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = [
            'id', 'student', 'course', 'curso_titulo', 'curso_slug',
            'estudiante_nombre', 'estado', 'progreso', 'certificado',
            'created_at', 'completado_at',
        ]
        read_only_fields = fields

    def get_curso_titulo(self, obj):
        return localized_text(obj.course, 'titulo', self.context)

    def get_estudiante_nombre(self, obj):
        return _display_name(obj.student)

    def get_certificado(self, obj):
        cert = getattr(obj, 'certificado', None)
        return cert.codigo if cert else None


class EnrollmentDetailSerializer(EnrollmentSerializer):
    """Matrícula con el árbol del curso y el progreso del estudiante.

    `lecciones_completadas` son los ids de lección ya marcados; `intentos` el
    historial de quizzes. El árbol del curso se sirve SIN clave de respuestas
    (contexto de estudiante)."""

    curso = serializers.SerializerMethodField()
    lecciones_completadas = serializers.SerializerMethodField()
    intentos = QuizAttemptSerializer(many=True, read_only=True)
    entregas = SubmissionSerializer(many=True, read_only=True)
    insignias_obtenidas = serializers.SerializerMethodField()

    class Meta(EnrollmentSerializer.Meta):
        fields = EnrollmentSerializer.Meta.fields + [
            'curso', 'lecciones_completadas', 'intentos', 'entregas', 'insignias_obtenidas',
        ]

    def get_curso(self, obj):
        # Estudiante: nunca incluir la clave de respuestas; propaga el nivel
        # de acceso a Academy ya resuelto por la vista (gating freemium) y el
        # idioma para que el árbol del curso (módulos incluidos) también salga
        # traducido.
        return CourseDetailSerializer(obj.course, context={
            'include_answers': False,
            'nivel_academia': self.context.get('nivel_academia'),
            'locale': self.context.get('locale'),
        }).data

    def get_lecciones_completadas(self, obj):
        return list(
            obj.lecciones_progreso.filter(completado=True).values_list('lesson_id', flat=True)
        )

    def get_insignias_obtenidas(self, obj):
        return [
            {'badge': e.badge_id, 'otorgada_at': e.otorgada_at}
            for e in obj.insignias_obtenidas.all()
        ]


# ─── Comunidad (foro Q&A) ───────────────────────────────────────────────────────

class CommunityReplySerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = CommunityReply
        fields = [
            'id', 'post', 'autor', 'autor_nombre', 'contenido', 'estado',
            'votos_count', 'es_mejor_respuesta', 'created_at',
        ]
        read_only_fields = fields

    def get_autor_nombre(self, obj):
        return _display_name(obj.autor)


class CommunityPostSerializer(serializers.ModelSerializer):
    """Resumen de post para el listado."""

    autor_nombre = serializers.SerializerMethodField()
    escuela_nombre = serializers.SerializerMethodField()
    curso_titulo = serializers.SerializerMethodField()

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'autor', 'autor_nombre', 'escuela', 'escuela_nombre',
            'curso', 'curso_titulo', 'modulo', 'titulo', 'contenido', 'estado',
            'respuestas_count', 'mejor_respuesta', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

    def get_escuela_nombre(self, obj):
        return localized_text(obj.escuela, 'nombre', self.context)

    def get_curso_titulo(self, obj):
        return localized_text(obj.curso, 'titulo', self.context)

    def get_autor_nombre(self, obj):
        return _display_name(obj.autor)


class CommunityPostDetailSerializer(CommunityPostSerializer):
    """Post con sus respuestas anidadas (mejor respuesta primero, ver
    `CommunityReply.Meta.ordering`). Solo respuestas visibles: lo oculto por
    moderación/reportes no se lista a los alumnos, ni siquiera al autor del
    post (lo revisa staff vía Django Admin)."""

    respuestas = serializers.SerializerMethodField()

    class Meta(CommunityPostSerializer.Meta):
        fields = CommunityPostSerializer.Meta.fields + ['respuestas']

    def get_respuestas(self, obj):
        from .community_models import ESTADO_VISIBLE
        visibles = obj.respuestas.filter(estado=ESTADO_VISIBLE)
        return CommunityReplySerializer(visibles, many=True).data


class CommunityReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityReport
        fields = ['id', 'post', 'reply', 'reportado_por', 'motivo', 'detalle', 'created_at']
        read_only_fields = fields


# ─── Biblioteca de recursos ─────────────────────────────────────────────────────

class LibraryResourceSerializer(LocalizedFieldsMixin, serializers.ModelSerializer):
    """Recurso de la biblioteca. `bloqueado`/`favorito` dependen del USUARIO de
    la request — el contexto trae `nivel` (nivel_academia_de) y `favoritos_ids`
    (calculado en bloque por la vista, sin una query por fila). Cuando
    `bloqueado=True` la URL real no se expone (mismo criterio que
    Lesson.contenido/video_url con bloqueado=True)."""

    LOCALIZED_FIELDS = ('titulo', 'descripcion')

    escuela_nombre = serializers.SerializerMethodField()
    curso_titulo = serializers.SerializerMethodField()
    favorito = serializers.SerializerMethodField()
    bloqueado = serializers.SerializerMethodField()

    class Meta:
        model = LibraryResource
        fields = [
            'id', 'tipo', 'school', 'escuela_nombre', 'course', 'curso_titulo',
            'titulo', 'descripcion', 'fuente', 'url', 'miniatura', 'etiquetas',
            'es_gratuito', 'destacado', 'vistas', 'favorito', 'bloqueado', 'created_at',
        ]
        read_only_fields = ['id', 'vistas', 'created_at']

    def get_escuela_nombre(self, obj):
        return localized_text(obj.school, 'nombre', self.context) if obj.school_id else None

    def get_curso_titulo(self, obj):
        return localized_text(obj.course, 'titulo', self.context) if obj.course_id else None

    def get_favorito(self, obj):
        return obj.id in self.context.get('favoritos_ids', set())

    def get_bloqueado(self, obj):
        nivel = self.context.get('nivel', access_service.NIVEL_STARTER)
        return not (obj.es_gratuito or nivel == access_service.NIVEL_PRO)

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if data.get('bloqueado'):
            data['url'] = ''
        return data


# ─── Blog editorial ─────────────────────────────────────────────────────────

class BlogPostSerializer(serializers.ModelSerializer):
    """Resumen de post para el catálogo público y el listado "mis publicaciones"
    (sin `contenido`, igual criterio que CourseSerializer vs CourseDetailSerializer)."""

    autor_nombre = serializers.SerializerMethodField()
    escuela_nombre = serializers.SerializerMethodField()
    escuela_slug = serializers.SerializerMethodField()

    class Meta:
        model = BlogPost
        fields = [
            'id', 'school', 'escuela_nombre', 'escuela_slug', 'autor', 'autor_nombre',
            'titulo', 'slug', 'resumen', 'meta_titulo', 'meta_descripcion', 'portada', 'etiquetas',
            'publicado', 'publicado_en', 'vistas', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'autor', 'publicado_en', 'vistas', 'created_at', 'updated_at']

    def get_autor_nombre(self, obj):
        return _display_name(obj.autor)

    def get_escuela_nombre(self, obj):
        return obj.school.nombre if obj.school_id else None

    def get_escuela_slug(self, obj):
        return obj.school.slug if obj.school_id else None

    def validate_school(self, value):
        """La escuela debe pertenecer al mismo tenant que el post — mismo
        criterio que CourseSerializer.validate_school (evita colgar el post de
        una escuela de OTRO tenant)."""
        if value is None:
            return value
        tenant = self.context.get('tenant')
        tenant_id = tenant.id if tenant else None
        if value.tenant_id != tenant_id:
            raise serializers.ValidationError('La escuela no pertenece a este tenant.')
        return value

    def validate_portada(self, value):
        # Acepta vacío, un data URL de imagen o una URL http(s) — mismo
        # criterio que CourseSerializer.validate_portada.
        if not value:
            return value
        if value.startswith('data:image/'):
            if len(value) > 1_500_000:  # ~1 MB de imagen — margen holgado en base64
                raise serializers.ValidationError('La portada es demasiado grande.')
            return value
        if value.startswith('http://') or value.startswith('https://'):
            return value
        raise serializers.ValidationError('La portada debe ser un data URL de imagen o una URL.')


class BlogPostDetailSerializer(BlogPostSerializer):
    """Post completo (con `contenido`) — detalle público y autoría."""

    class Meta(BlogPostSerializer.Meta):
        fields = BlogPostSerializer.Meta.fields + ['contenido']


# ─── Administración de usuarios (SOLO admin, ver academy.permissions.IsAcademyAdmin) ──

ACADEMY_ROL_ADMIN = 'admin'
ACADEMY_ROL_PROFESOR = 'profesor'
ACADEMY_ROL_ESTUDIANTE = 'estudiante'
ACADEMY_ROL_CHOICES = [ACADEMY_ROL_ADMIN, ACADEMY_ROL_PROFESOR, ACADEMY_ROL_ESTUDIANTE]


def _academy_rol_de(user) -> str:
    if user.is_admin or user.academy_admin:
        return ACADEMY_ROL_ADMIN
    if user.academy_instructor:
        return ACADEMY_ROL_PROFESOR
    return ACADEMY_ROL_ESTUDIANTE


class AcademyUserCreateSerializer(serializers.Serializer):
    """Alta de una cuenta desde el panel de administración de Academy.

    `rol` decide a qué combinación de `User.academy_admin`/`academy_instructor`
    mapea la cuenta nueva:
      - 'admin'      → academy_admin=True (administrador SOLO de Academy).
      - 'profesor'   → academy_instructor=True (autoría de cursos).
      - 'estudiante' → cuenta normal (academy_acceso ya es abierto a cualquiera).
    Deliberadamente NUNCA toca `User.role`/`ROLE_ADMIN` (ese campo es GLOBAL
    entre los 3 productos y concede acceso B2B completo a Zyfit Performance,
    incluido el módulo Psicológico) — hallazgo crítico de auditoría
    (2026-07-09) corregido acá; el admin "de producto" real solo se crea vía
    `academy.views.bootstrap_admin`, un flujo aparte y deliberado.
    Crea también el Profile mínimo en el mismo paso — sin él, otras pantallas
    del producto que asumen `user.profile` (dashboard, perfil) fallarían,
    igual que hace `users.RegisterSerializer` en el registro público."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    nombre = serializers.CharField(max_length=100)
    rol = serializers.ChoiceField(choices=ACADEMY_ROL_CHOICES)

    def validate_email(self, value):
        value = value.strip().lower()
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('Ya existe una cuenta con este correo.')
        return value

    def validate_password(self, value):
        from django.contrib.auth.password_validation import validate_password
        from django.core.exceptions import ValidationError as DjangoValidationError
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def create(self, validated_data):
        from users.models import Profile

        email = validated_data['email']
        rol = validated_data['rol']
        user = User.objects.create_user(
            username=email, email=email, password=validated_data['password'],
            academy_admin=(rol == ACADEMY_ROL_ADMIN),
            academy_instructor=(rol == ACADEMY_ROL_PROFESOR),
        )
        tenant = self.context.get('tenant')
        if tenant:
            user.academy_tenant = tenant
            user.save(update_fields=['academy_tenant'])
        Profile.objects.create(user=user, nombre=validated_data['nombre'])
        return user


class AcademyUserSerializer(serializers.Serializer):
    """Fila de la lista de usuarios del panel de administración."""

    id = serializers.IntegerField()
    email = serializers.EmailField()
    nombre = serializers.SerializerMethodField()
    rol = serializers.SerializerMethodField()
    is_active = serializers.BooleanField()
    date_joined = serializers.DateTimeField()

    def get_nombre(self, obj):
        profile = getattr(obj, 'profile', None)
        return profile.nombre if profile else _display_name(obj)

    def get_rol(self, obj):
        return _academy_rol_de(obj)
