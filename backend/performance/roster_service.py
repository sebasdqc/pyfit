"""Resolución de plantel activo por centro/grupo — compartida por
`team_session_generator.py` y `planning_advisor.py` (ambos necesitan "los
atletas activos de este centro, opcionalmente de este grupo" antes de agregar
carga/bienestar/lesiones)."""

from .models import CenterAthlete


def team_athlete_ids(center, grupo=''):
    qs = CenterAthlete.objects.filter(center=center, estado=CenterAthlete.ESTADO_ACTIVO)
    if grupo:
        qs = qs.filter(grupo=grupo)
    return list(qs.values_list('athlete_id', flat=True))
