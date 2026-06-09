"""Serializers de Zyfit Academy.

Regla de seguridad clave: la CLAVE de respuestas de un quiz
(`Question.respuestas_correctas`) solo se expone a quien puede editar el curso.
Para el estudiante se serializa sin ese campo. El interruptor es el flag de
contexto `include_answers` (lo fija la vista según el rol).
"""

from rest_framework import serializers

from .models import (
    Course, Module, Lesson, Quiz, Question,
    Enrollment, LessonProgress, QuizAttempt, Certificate,
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
            'id', 'quiz', 'orden', 'enunciado', 'tipo',
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
    quiz = serializers.SerializerMethodField()

    class Meta:
        model = Lesson
        fields = [
            'id', 'module', 'orden', 'titulo', 'tipo',
            'contenido', 'video_url', 'duracion_min', 'quiz', 'created_at',
        ]
        read_only_fields = ['id', 'module', 'created_at']

    def get_quiz(self, obj):
        quiz = getattr(obj, 'quiz', None)
        if not quiz:
            return None
        return QuizSerializer(quiz, context=self.context).data


class ModuleSerializer(serializers.ModelSerializer):
    lecciones = LessonSerializer(many=True, read_only=True)

    class Meta:
        model = Module
        fields = ['id', 'course', 'orden', 'titulo', 'descripcion', 'lecciones', 'created_at']
        read_only_fields = ['id', 'course', 'created_at']


# ─── Cursos ───────────────────────────────────────────────────────────────────

class CourseSerializer(serializers.ModelSerializer):
    """Resumen de curso para el catálogo y la autoría."""

    instructor_nombre = serializers.SerializerMethodField()
    total_modulos = serializers.SerializerMethodField()
    total_lecciones = serializers.SerializerMethodField()
    total_inscritos = serializers.SerializerMethodField()

    class Meta:
        model = Course
        fields = [
            'id', 'instructor', 'instructor_nombre', 'titulo', 'slug', 'resumen',
            'descripcion', 'categoria', 'nivel', 'portada', 'duracion_estimada_min',
            'publicado', 'total_modulos', 'total_lecciones', 'total_inscritos',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'instructor', 'created_at', 'updated_at']

    def get_instructor_nombre(self, obj):
        return _display_name(obj.instructor)

    def get_total_modulos(self, obj):
        return obj.modulos.count()

    def get_total_lecciones(self, obj):
        return Lesson.objects.filter(module__course=obj).count()

    def get_total_inscritos(self, obj):
        return obj.enrollments.count()

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
    """Curso con su árbol completo (módulos → lecciones → quiz)."""

    modulos = ModuleSerializer(many=True, read_only=True)

    class Meta(CourseSerializer.Meta):
        fields = CourseSerializer.Meta.fields + ['modulos']


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

    class Meta(EnrollmentSerializer.Meta):
        fields = EnrollmentSerializer.Meta.fields + ['curso', 'lecciones_completadas', 'intentos']

    def get_curso(self, obj):
        # Estudiante: nunca incluir la clave de respuestas.
        return CourseDetailSerializer(obj.course, context={'include_answers': False}).data

    def get_lecciones_completadas(self, obj):
        return list(
            obj.lecciones_progreso.filter(completado=True).values_list('lesson_id', flat=True)
        )
