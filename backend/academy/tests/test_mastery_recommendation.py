"""Tests de `mastery_service.recomendar_siguiente` — el motor de recomendación
adaptativa que cruza escuelas.

Por qué existe este archivo: hasta el 2026-07-31 este motor **no tenía ni un
test de comportamiento**. La única cobertura era indirecta, vía el conteo de
queries de `test_dashboard`, y encima `dashboard_service._recomendacion_ia`
envuelve la llamada en un try/except que devuelve `None` ante cualquier fallo (a
propósito: esta feature nunca debe tumbar el dashboard). La combinación era
mala: **un bug acá dejaba al estudiante sin recomendación en silencio y la suite
entera seguía en verde**. Se detectó al deduplicar la consulta de matrículas
activas dentro de `recomendar_siguiente` y notar que ningún test podía haber
detectado si el refactor la rompía.

Mismo estilo que test_dashboard.py: BD real (TestCase), sin HTTP — se llama al
servicio directo, que es donde vive la lógica.
"""

from django.contrib.auth import get_user_model
from django.test import TestCase

from academy import mastery_service
from academy.competency_models import Competency, LessonCompetencyTag, StudentCompetencyMastery
from academy.models import Course, Enrollment, Lesson, LessonProgress, Module, School
from users.models import Profile

User = get_user_model()


class RecomendarSiguienteTests(TestCase):
    def setUp(self):
        self.student = User.objects.create_user(username='alu@x.com', email='alu@x.com', password='x')
        self.instructor = User.objects.create_user(
            username='ins@x.com', email='ins@x.com', password='x', academy_instructor=True,
        )

    # ── helpers ──────────────────────────────────────────────────────────────

    def _school(self, nombre='Escuela 1', slug='escuela-1'):
        return School.objects.create(nombre=nombre, slug=slug)

    def _course(self, school, slug='curso-1', titulo='Curso 1', publicado=True):
        return Course.objects.create(
            school=school, instructor=self.instructor, titulo=titulo, slug=slug,
            categoria='entrenamiento', nivel='principiante', publicado=publicado,
        )

    def _lesson(self, course, titulo='Lección 1', es_gratuito=False, orden=1):
        module = Module.objects.create(
            course=course, orden=orden, titulo=f'M{orden}', es_gratuito=es_gratuito,
        )
        return Lesson.objects.create(module=module, orden=1, titulo=titulo, tipo='texto')

    def _tag(self, lesson, competency_slug, peso=1.0):
        competency, _ = Competency.objects.get_or_create(
            slug=competency_slug, defaults={'nombre': competency_slug.replace('-', ' ').title()},
        )
        return LessonCompetencyTag.objects.create(lesson=lesson, competency=competency, peso=peso)

    def _escuelas_interes(self, *schools):
        """El Profile no se crea solo con el usuario (`getattr(student,
        'profile', None)` en el servicio devuelve None si no existe, así que la
        rama de descubrimiento simplemente no corre)."""
        Profile.objects.create(
            user=self.student, nombre='Alumno',
            escuelas_interes=[s.id for s in schools],
        )

    def _mastery(self, competency_slug, nivel):
        competency = Competency.objects.get(slug=competency_slug)
        return StudentCompetencyMastery.objects.create(
            student=self.student, competency=competency, nivel=nivel, evidencia_n=1,
        )

    # ── rama de candidato matriculado ────────────────────────────────────────

    def test_recomienda_leccion_de_una_matricula_activa(self):
        curso = self._course(self._school())
        leccion = self._lesson(curso, es_gratuito=True)
        self._tag(leccion, 'fuerza')
        enrollment = Enrollment.objects.create(student=self.student, course=curso)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertIsNotNone(rec)
        self.assertEqual(rec['leccion_id'], leccion.id)
        self.assertEqual(rec['curso_id'], curso.id)
        self.assertEqual(rec['competencia_nombre'], 'Fuerza')
        # La rama de matriculado SÍ devuelve enrollment_id; la de descubrimiento no.
        self.assertEqual(rec['enrollment_id'], enrollment.id)

    def test_prioriza_la_competencia_con_menos_dominio(self):
        """El corazón del motor: `peso * (100 - nivel)`. Con pesos iguales debe
        ganar la lección de la competencia peor dominada, no la primera ni la
        más nueva."""
        curso = self._course(self._school())
        dominada = self._lesson(curso, titulo='Ya la domino', es_gratuito=True, orden=1)
        floja = self._lesson(curso, titulo='Acá estoy flojo', es_gratuito=True, orden=2)
        self._tag(dominada, 'dominada')
        self._tag(floja, 'floja')
        Enrollment.objects.create(student=self.student, course=curso)
        self._mastery('dominada', 95.0)
        self._mastery('floja', 10.0)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], floja.id)

    def test_el_peso_del_tag_puede_dar_vuelta_el_gap(self):
        """Un gap grande con peso bajo pierde contra un gap menor con peso alto:
        `0.1 * 90 = 9` < `1.0 * 40 = 40`."""
        curso = self._course(self._school())
        gap_grande = self._lesson(curso, titulo='Gap grande, peso bajo', es_gratuito=True, orden=1)
        peso_alto = self._lesson(curso, titulo='Gap menor, peso alto', es_gratuito=True, orden=2)
        self._tag(gap_grande, 'marginal', peso=0.1)
        self._tag(peso_alto, 'central', peso=1.0)
        Enrollment.objects.create(student=self.student, course=curso)
        self._mastery('marginal', 10.0)
        self._mastery('central', 60.0)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], peso_alto.id)

    def test_no_recomienda_una_leccion_ya_completada(self):
        curso = self._course(self._school())
        hecha = self._lesson(curso, titulo='Hecha', es_gratuito=True, orden=1)
        pendiente = self._lesson(curso, titulo='Pendiente', es_gratuito=True, orden=2)
        self._tag(hecha, 'fuerza')
        self._tag(pendiente, 'resistencia')
        enrollment = Enrollment.objects.create(student=self.student, course=curso)
        LessonProgress.objects.create(enrollment=enrollment, lesson=hecha, completado=True)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], pendiente.id)

    def test_respeta_excluir_lesson_ids(self):
        """`excluir_lesson_ids` son las lecciones que el dashboard ya muestra en
        las cards `continuar`/`siguiente_paso`: no se repiten acá."""
        curso = self._course(self._school())
        ya_en_otra_card = self._lesson(curso, titulo='Ya visible arriba', es_gratuito=True, orden=1)
        otra = self._lesson(curso, titulo='Otra', es_gratuito=True, orden=2)
        self._tag(ya_en_otra_card, 'fuerza')
        self._tag(otra, 'resistencia')
        Enrollment.objects.create(student=self.student, course=curso)

        rec = mastery_service.recomendar_siguiente(
            self.student, excluir_lesson_ids=[ya_en_otra_card.id],
        )

        self.assertEqual(rec['leccion_id'], otra.id)

    def test_una_matricula_no_activa_no_aporta_candidatos(self):
        curso = self._course(self._school())
        leccion = self._lesson(curso, es_gratuito=True)
        self._tag(leccion, 'fuerza')
        Enrollment.objects.create(
            student=self.student, course=curso, estado=Enrollment.ESTADO_COMPLETADA,
        )

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_el_paywall_oculta_lecciones_de_modulos_pagos(self):
        """Un starter no puede recibir como recomendación una lección de un
        módulo que no puede abrir."""
        curso = self._course(self._school())
        pago = self._lesson(curso, titulo='Módulo pago', es_gratuito=False)
        self._tag(pago, 'fuerza')
        Enrollment.objects.create(student=self.student, course=curso)

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_cruza_escuelas(self):
        """El pitch de la feature: la recomendación puede venir de otra escuela
        distinta a la del curso que el estudiante viene tocando."""
        curso_a = self._course(self._school('Nutrición', 'nutricion'), slug='c-a', titulo='C A')
        curso_b = self._course(self._school('Recuperación', 'recuperacion'), slug='c-b', titulo='C B')
        leccion_a = self._lesson(curso_a, titulo='De A', es_gratuito=True)
        leccion_b = self._lesson(curso_b, titulo='De B', es_gratuito=True)
        self._tag(leccion_a, 'bien-dominada')
        self._tag(leccion_b, 'mal-dominada')
        Enrollment.objects.create(student=self.student, course=curso_a)
        Enrollment.objects.create(student=self.student, course=curso_b)
        self._mastery('bien-dominada', 98.0)
        self._mastery('mal-dominada', 5.0)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], leccion_b.id)
        self.assertEqual(rec['escuela_nombre'], 'Recuperación')

    # ── rama de descubrimiento ───────────────────────────────────────────────

    def test_descubrimiento_cuando_no_hay_candidato_matriculado(self):
        """Sin matrículas, una lección gratuita de una escuela de interés es
        candidata, y viene SIN enrollment_id."""
        escuela = self._school('Interés', 'interes')
        curso = self._course(escuela)
        leccion = self._lesson(curso, es_gratuito=True)
        self._tag(leccion, 'fuerza')
        self._escuelas_interes(escuela)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertIsNotNone(rec)
        self.assertEqual(rec['leccion_id'], leccion.id)
        self.assertIsNone(rec['enrollment_id'])

    def test_descubrimiento_excluye_cursos_ya_matriculados(self):
        """Cubre puntualmente el refactor que dedupló la consulta de matrículas
        activas: la rama de descubrimiento recibe los `course_id` desde
        `recomendar_siguiente` en vez de volver a consultarlos.

        El aislamiento es fino y vale explicarlo, porque la primera versión de
        este test no detectaba nada: hay que construir una lección que la rama de
        matriculado descarte y que SOLO la exclusión por curso matriculado frene
        en la de descubrimiento. La lección va en un módulo **gratuito** (si fuera
        paga la filtraría `es_gratuito=True` y el test pasaría por el motivo
        equivocado) y **ya completada** — la rama de matriculado excluye las
        completadas, y la de descubrimiento **no**, solo mira el curso.

        O sea: si esa lista de cursos llega vacía o mal, el motor recomienda una
        lección que el estudiante YA terminó. Verificado con una mutación
        (pasando `[]`): con ella este test falla."""
        escuela = self._school('Interés', 'interes')
        matriculado = self._course(escuela, slug='c-mat', titulo='Ya matriculado')
        ya_hecha = self._lesson(matriculado, titulo='Ya la hice', es_gratuito=True)
        self._tag(ya_hecha, 'fuerza')
        enrollment = Enrollment.objects.create(student=self.student, course=matriculado)
        LessonProgress.objects.create(enrollment=enrollment, lesson=ya_hecha, completado=True)

        self._escuelas_interes(escuela)

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_descubrimiento_ignora_cursos_no_publicados(self):
        escuela = self._school('Interés', 'interes')
        borrador = self._course(escuela, publicado=False)
        leccion = self._lesson(borrador, es_gratuito=True)
        self._tag(leccion, 'fuerza')
        self._escuelas_interes(escuela)

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_sin_escuelas_de_interes_no_hay_descubrimiento(self):
        escuela = self._school()
        curso = self._course(escuela)
        self._tag(self._lesson(curso, es_gratuito=True), 'fuerza')
        # `escuelas_interes` vacío (default del Profile) — silencio, no ruido.

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    # ── silencio > ruido ─────────────────────────────────────────────────────

    def test_no_recomienda_nada_si_el_dominio_ya_es_alto(self):
        """Con `SCORE_MINIMO_RECOMENDACION = 20`, un gap de 10 (nivel 90) con
        peso 1.0 puntúa 10 y no alcanza: mejor no decir nada."""
        curso = self._course(self._school())
        leccion = self._lesson(curso, es_gratuito=True)
        self._tag(leccion, 'casi-dominada')
        Enrollment.objects.create(student=self.student, course=curso)
        self._mastery('casi-dominada', 90.0)

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_una_leccion_sin_tags_no_es_candidata(self):
        """El motor razona sobre competencias: una lección sin tagear es
        invisible para él (de ahí que el tagging en prod sea un requisito)."""
        curso = self._course(self._school())
        self._lesson(curso, es_gratuito=True)  # sin _tag()
        Enrollment.objects.create(student=self.student, course=curso)

        self.assertIsNone(mastery_service.recomendar_siguiente(self.student))

    def test_sin_evidencia_usa_el_prior_y_alcanza_para_recomendar(self):
        """Un estudiante nuevo (sin `StudentCompetencyMastery`) parte del prior
        neutral-bajo de 40, que da `1.0 * 60 = 60` y supera el mínimo. Si el
        prior subiera por encima de 80, la feature dejaría de recomendar a los
        estudiantes nuevos — que son justo los que más la necesitan."""
        self.assertFalse(StudentCompetencyMastery.objects.filter(student=self.student).exists())
        curso = self._course(self._school())
        leccion = self._lesson(curso, es_gratuito=True)
        self._tag(leccion, 'nueva')
        Enrollment.objects.create(student=self.student, course=curso)

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], leccion.id)

    def test_no_filtra_lecciones_de_otro_estudiante(self):
        """El mastery de otra cuenta no debe influir en esta recomendación."""
        otro = User.objects.create_user(username='otro@x.com', email='otro@x.com', password='x')
        curso = self._course(self._school())
        leccion = self._lesson(curso, es_gratuito=True)
        tag = self._tag(leccion, 'fuerza')
        Enrollment.objects.create(student=self.student, course=curso)
        # El OTRO domina la competencia; este estudiante no tiene evidencia.
        StudentCompetencyMastery.objects.create(
            student=otro, competency=tag.competency, nivel=99.0, evidencia_n=1,
        )

        rec = mastery_service.recomendar_siguiente(self.student)

        self.assertEqual(rec['leccion_id'], leccion.id)
