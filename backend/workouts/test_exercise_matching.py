"""Tests de workouts/exercise_matching.py::resolve_exercise_fk — usado al
crear SessionExercise (generación IA, regeneración, rutina de coach) para
poblar la FK exercise sin bloquear la creación de la sesión si no matchea."""
from django.test import TestCase

from .exercise_matching import build_exercises_map, resolve_exercise_fk
from .models import Exercise


class ResolveExerciseFkTests(TestCase):
    def setUp(self):
        self.sentadilla = Exercise.objects.create(nombre='Sentadilla con barra', patron_movimiento='sentadilla')
        self.press = Exercise.objects.create(nombre='Press de banca', patron_movimiento='empuje_horizontal')
        self.inactivo = Exercise.objects.create(
            nombre='Ejercicio viejo', patron_movimiento='aislamiento', activo=False,
        )

    def test_match_exacto_case_insensitive(self):
        self.assertEqual(resolve_exercise_fk('sentadilla con barra'), self.sentadilla)
        self.assertEqual(resolve_exercise_fk('SENTADILLA CON BARRA'), self.sentadilla)

    def test_match_substring_tolerante(self):
        # nombre generado por IA con texto extra alrededor del nombre del catálogo
        self.assertEqual(resolve_exercise_fk('Sentadilla con barra (variante atlética)'), self.sentadilla)

    def test_sin_match_devuelve_none(self):
        self.assertIsNone(resolve_exercise_fk('Ejercicio totalmente inventado xyz'))

    def test_nombre_vacio_devuelve_none(self):
        self.assertIsNone(resolve_exercise_fk(''))
        self.assertIsNone(resolve_exercise_fk('   '))

    def test_no_matchea_ejercicios_inactivos(self):
        self.assertIsNone(resolve_exercise_fk('Ejercicio viejo'))

    def test_usa_mapa_precalculado(self):
        mapa = build_exercises_map()
        self.assertIn('sentadilla con barra', mapa)
        self.assertNotIn('ejercicio viejo', mapa)
        self.assertEqual(resolve_exercise_fk('press de banca', mapa), self.press)
