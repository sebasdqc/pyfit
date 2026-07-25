import json
from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from workouts.models import Exercise


def _row(nombre, confianza='media', **overrides):
    row = dict(
        nombre=nombre,
        evidence_score=3,
        evidence_rationale='Justificación de prueba.',
        goal_tags=['hipertrofia'],
        goal_primary='hipertrofia',
        lengthened_bias=False,
        injury_risk_profile='bajo',
        confianza=confianza,
    )
    row.update(overrides)
    return row


class ApplyEvidenceBackfillTests(TestCase):
    """El comando aplica zyfit_evidencia_backfill_220.json vía update() por
    nombre — nunca crea filas nuevas ni toca los 2 ejercicios que
    seed_08_gap_fill.sql ya actualizó directamente."""

    def setUp(self):
        self.a = Exercise.objects.create(nombre='Ejercicio de prueba A', patron_movimiento='aislamiento')
        self.b = Exercise.objects.create(nombre='Ejercicio de prueba B', patron_movimiento='aislamiento')
        Exercise.objects.create(nombre='Plancha de Copenhague', patron_movimiento='core_antirrotacion')

        self.payload = {
            'ejercicios': [
                _row('Ejercicio de prueba A', confianza='alta', evidence_score=5, goal_primary='rendimiento'),
                _row('Ejercicio de prueba B', confianza='baja'),
                _row('Plancha de Copenhague'),  # ya aplicado en batch 08 — debe saltarse
                _row('Ejercicio que no existe'),  # no matchea ninguna fila — debe reportarse
            ],
        }

    def _run(self, dry_run=False):
        with patch('workouts.management.commands.apply_evidence_backfill.JSON_FILE') as mock_path:
            mock_path.exists.return_value = True
            mock_path.read_text.return_value = json.dumps(self.payload)
            out = StringIO()
            args = ['apply_evidence_backfill']
            if dry_run:
                args.append('--dry-run')
            call_command(*args, stdout=out)
            return out.getvalue()

    def test_actualiza_por_nombre(self):
        self._run()
        self.a.refresh_from_db()
        self.assertEqual(self.a.evidence_score, 5)
        self.assertEqual(self.a.goal_primary, 'rendimiento')

    def test_salta_los_ya_aplicados_en_batch_08(self):
        out = self._run()
        copenhague = Exercise.objects.get(nombre='Plancha de Copenhague')
        # No lo tocó — sigue con los campos de evidencia vacíos por defecto.
        self.assertEqual(copenhague.evidence_score, None)
        self.assertIn('Ya aplicados en batch 08 (saltados): 1', out)

    def test_reporta_no_encontrados_sin_fallar(self):
        out = self._run()
        self.assertIn('No encontrados en la BD: 1', out)
        self.assertIn('No encontrado en la BD: Ejercicio que no existe', out)

    def test_dry_run_no_escribe_nada(self):
        self._run(dry_run=True)
        self.a.refresh_from_db()
        self.b.refresh_from_db()
        self.assertIsNone(self.a.evidence_score)
        self.assertIsNone(self.b.evidence_score)

    def test_es_idempotente(self):
        self._run()
        self._run()  # correrlo dos veces no debe fallar ni duplicar nada
        self.a.refresh_from_db()
        self.assertEqual(self.a.evidence_score, 5)
        self.assertEqual(Exercise.objects.filter(nombre='Ejercicio de prueba A').count(), 1)
