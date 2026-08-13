"""Reabre el wizard para quien lo completó antes de que existiera el segmento.

El onboarding se desplegó sin la pregunta de público (equipos / instituciones
educativas / atletas de alto rendimiento) y se agregó ~1 hora después. Las
cuentas que alcanzaron a completarlo en esa ventana quedaron con
`completado=True` y `segmento=''`: no volverían a ver el wizard nunca y su
registro quedaría incompleto justo en el campo que más encuadra al resto.

Alcance real: solo las filas de esa ventana. Una cuenta que complete el wizard
de acá en adelante no puede quedar sin segmento — la vista lo exige en
`_ONBOARDING_REQUERIDOS` antes de marcar `completado`.
"""

from django.db import migrations


def reabrir_sin_segmento(apps, schema_editor):
    PerformanceOnboarding = apps.get_model('performance', 'PerformanceOnboarding')
    PerformanceOnboarding.objects.filter(completado=True, segmento='').update(
        completado=False, completado_at=None,
    )


def sin_vuelta_atras(apps, schema_editor):
    """No se revierte: no hay forma de saber cuáles de las filas sin segmento
    estaban completas antes de esta migración y cuáles no. Dejarlo como no-op
    es preferible a re-marcar como completo algo que quedó a medias."""


class Migration(migrations.Migration):

    dependencies = [
        ('performance', '0014_performanceonboarding_segmento_and_more'),
    ]

    operations = [
        migrations.RunPython(reabrir_sin_segmento, sin_vuelta_atras),
    ]
