"""Crea un curso de demostración completo en Zyfit Academy.

Útil para probar la academia en DigitalOcean sin construir todo a mano: deja un
curso publicado con dos módulos, lecciones de cada tipo y un quiz calificable.
Idempotente: se reconoce por el slug y no duplica.

    python manage.py seed_academy_demo [--instructor-email correo@dominio]

NO se ejecuta en el arranque (no está en entrypoint.sh): es una herramienta de
siembra manual, no datos de producción.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from academy.models import Course, Module, Lesson, Quiz, Question

User = get_user_model()

DEMO_SLUG = 'fundamentos-de-fuerza'


class Command(BaseCommand):
    help = 'Crea un curso de demostración (idempotente) en Zyfit Academy.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--instructor-email', default=None,
            help='Email de la cuenta instructor/admin que figura como autor. '
                 'Por defecto el primer admin/staff que exista.',
        )

    def handle(self, *args, **opts):
        if Course.objects.filter(slug=DEMO_SLUG).exists():
            self.stdout.write(self.style.WARNING(f'El curso demo "{DEMO_SLUG}" ya existe. Nada que hacer.'))
            return

        instructor = self._resolve_instructor(opts.get('instructor_email'))

        course = Course.objects.create(
            instructor=instructor,
            titulo='Fundamentos de Fuerza',
            slug=DEMO_SLUG,
            resumen='Aprende a entrenar fuerza con técnica y progresión segura.',
            descripcion='Curso introductorio sobre los pilares del entrenamiento de fuerza: '
                        'patrones de movimiento, progresión de cargas y prevención de lesiones.',
            categoria='entrenamiento',
            nivel='principiante',
            duracion_estimada_min=90,
            publicado=True,
        )

        m1 = Module.objects.create(course=course, orden=1, titulo='Introducción',
                                   descripcion='Por qué entrenar fuerza.')
        Lesson.objects.create(module=m1, orden=1, titulo='Bienvenida', tipo='video',
                              video_url='https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                              contenido='Presentación del curso.', duracion_min=5)
        Lesson.objects.create(module=m1, orden=2, titulo='Principios básicos', tipo='texto',
                              contenido='Sobrecarga progresiva, especificidad y recuperación.',
                              duracion_min=10)

        m2 = Module.objects.create(course=course, orden=2, titulo='Evaluación',
                                   descripcion='Comprueba lo aprendido.')
        quiz_lesson = Lesson.objects.create(module=m2, orden=1, titulo='Quiz de fundamentos',
                                            tipo='quiz', duracion_min=10)
        quiz = Quiz.objects.create(lesson=quiz_lesson, titulo='Quiz de fundamentos',
                                   puntaje_aprobacion=70)
        Question.objects.create(
            quiz=quiz, orden=1, tipo='opcion_unica',
            enunciado='¿Qué principio describe aumentar la carga con el tiempo?',
            opciones=[{'id': 'a', 'texto': 'Especificidad'},
                      {'id': 'b', 'texto': 'Sobrecarga progresiva'},
                      {'id': 'c', 'texto': 'Reversibilidad'}],
            respuestas_correctas=['b'], puntos=1,
        )
        Question.objects.create(
            quiz=quiz, orden=2, tipo='verdadero_falso',
            enunciado='La recuperación forma parte del proceso de adaptación.',
            opciones=[{'id': 'v', 'texto': 'Verdadero'}, {'id': 'f', 'texto': 'Falso'}],
            respuestas_correctas=['v'], puntos=1,
        )

        autor = instructor.email if instructor else 'sin instructor'
        self.stdout.write(self.style.SUCCESS(
            f'Curso demo "{course.titulo}" creado (slug={course.slug}, autor={autor}).'
        ))

    def _resolve_instructor(self, email):
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                self.stdout.write(self.style.WARNING(
                    f'No existe cuenta {email}; el curso se crea sin instructor.'))
            return user
        return User.objects.filter(is_staff=True).first() or User.objects.filter(role='admin').first()
