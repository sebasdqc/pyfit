from datetime import date, timedelta

from django.test import SimpleTestCase

from . import periodization as pz

MONDAY = date(2026, 6, 22)


class ResolvePhaseTests(SimpleTestCase):
    def test_competencia_cerca_fuerza_taper_aunque_meta_fecha_diga_otra_cosa(self):
        fase = pz.resolve_phase(
            ref_date=MONDAY, has_competition_soon=True,
            meta_fecha=MONDAY + timedelta(days=60), started_at=MONDAY,
            semana_actual=1,
        )
        self.assertEqual(fase, 'taper')

    def test_taper_cerca_de_la_meta(self):
        fase = pz.resolve_phase(
            ref_date=MONDAY, has_competition_soon=False,
            meta_fecha=MONDAY + timedelta(days=5), started_at=MONDAY,
            semana_actual=1,
        )
        self.assertEqual(fase, 'taper')

    def test_peak_a_dos_semanas(self):
        fase = pz.resolve_phase(
            ref_date=MONDAY, has_competition_soon=False,
            meta_fecha=MONDAY + timedelta(days=14), started_at=MONDAY - timedelta(weeks=8),
            semana_actual=1,
        )
        self.assertEqual(fase, 'peak')

    def test_base_al_inicio_del_plan(self):
        fase = pz.resolve_phase(
            ref_date=MONDAY, has_competition_soon=False,
            meta_fecha=MONDAY + timedelta(weeks=12), started_at=MONDAY,
            semana_actual=1,
        )
        self.assertEqual(fase, 'base')

    def test_build_a_mitad_del_plan(self):
        started = MONDAY - timedelta(weeks=6)
        meta = MONDAY + timedelta(weeks=6)
        fase = pz.resolve_phase(
            ref_date=MONDAY, has_competition_soon=False,
            meta_fecha=meta, started_at=started, semana_actual=1,
        )
        self.assertEqual(fase, 'build')

    def test_modo_continuo_ciclo_de_4_semanas(self):
        # semana_actual: 1→base, 2→base, 3→build, 4→recovery, 5→base (vuelta)
        esperado = {1: 'base', 2: 'base', 3: 'build', 4: 'recovery', 5: 'base'}
        for semana, fase_esperada in esperado.items():
            fase = pz.resolve_phase(
                ref_date=MONDAY, has_competition_soon=False,
                meta_fecha=None, started_at=MONDAY, semana_actual=semana,
            )
            self.assertEqual(fase, fase_esperada, f'semana {semana}')
