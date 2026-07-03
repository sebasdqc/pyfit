"""Serializers de Zyfit Academy.

Regla de seguridad clave: la CLAVE de respuestas de un quiz
(`Question.respuestas_correctas`) solo se expone a quien puede editar el curso.
Para el estudiante se serializa sin ese campo. El interruptor es el flag de
contexto `include_answers` (lo fija la vista según el rol).
"""

from rest_framework import serializers

from . import access_service
from .community_models import CommunityPost, CommunityReply, CommunityReport
from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
    Submission, CourseBadge, School,
)


def _display_name(user):
    """Nombre visible de una cuenta (sin depender de un Profile)."""
    if user is None:
        return ''
    full = (user.get_full_name() or '').strip()
    return full or user.first_name or user.email.split('@')[0]


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


class ModuleSerializer(serializers.ModelSerializer):
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

class SchoolSerializer(serializers.ModelSerializer):
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


class CourseSerializer(serializers.ModelSerializer):
    """Resumen de curso para el catálogo y la autoría."""

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
        return obj.school.nombre if obj.school_id else None

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
    curso_titulo = serializers.CharField(source='enrollment.course.titulo', read_only=True)
    estudiante_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Certificate
        fields = ['id', 'enrollment', 'codigo', 'curso_titulo', 'estudiante_nombre', 'emitido_at']
        read_only_fields = fields

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

    curso_titulo = serializers.CharField(source='course.titulo', read_only=True)
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
        # de acceso a Academy ya resuelto por la vista (gating freemium).
        return CourseDetailSerializer(obj.course, context={
            'include_answers': False,
            'nivel_academia': self.context.get('nivel_academia'),
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
    escuela_nombre = serializers.CharField(source='escuela.nombre', read_only=True)
    curso_titulo = serializers.CharField(source='curso.titulo', read_only=True, default=None)

    class Meta:
        model = CommunityPost
        fields = [
            'id', 'autor', 'autor_nombre', 'escuela', 'escuela_nombre',
            'curso', 'curso_titulo', 'modulo', 'titulo', 'contenido', 'estado',
            'respuestas_count', 'mejor_respuesta', 'created_at', 'updated_at',
        ]
        read_only_fields = fields

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
