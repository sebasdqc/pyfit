"""Puntos por defecto por tipo de lección, para las lecciones ya existentes
(las nuevas ya nacen con Lesson.puntos=10 salvo que se edite). Valores
razonables de partida — ver nota en Lesson.puntos, ajustables libremente
después vía CourseContentPage o Django Admin."""

from django.db import migrations

PUNTOS_POR_TIPO = {
    'quiz': 20,
    'entregable': 30,
    'practica': 20,
    'en_vivo': 15,
    # texto/video/audio se quedan en el default=10 de la migración anterior.
}


def seed_puntos(apps, schema_editor):
    Lesson = apps.get_model('academy', 'Lesson')
    for tipo, puntos in PUNTOS_POR_TIPO.items():
        Lesson.objects.filter(tipo=tipo).update(puntos=puntos)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0021_lesson_puntos'),
    ]

    operations = [
        migrations.RunPython(seed_puntos, noop),
    ]
