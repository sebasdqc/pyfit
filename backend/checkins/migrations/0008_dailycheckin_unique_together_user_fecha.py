from django.conf import settings
from django.db import migrations
from django.db.models import Count, Max


def deduplicate_checkins(apps, schema_editor):
    """Elimina check-ins duplicados por (user, fecha) conservando el de ID mayor.

    La tabla daily_checkin puede tener filas duplicadas en producción (mismo
    usuario, misma fecha) creadas antes de que existiera la restricción única.
    Este paso previo es necesario para que AlterUniqueTogether no falle con
    IntegrityError al intentar crear el índice único.
    """
    DailyCheckin = apps.get_model('checkins', 'DailyCheckin')
    dupes = (
        DailyCheckin.objects
        .values('user_id', 'fecha')
        .annotate(cnt=Count('id'), max_id=Max('id'))
        .filter(cnt__gt=1)
    )
    deleted_total = 0
    for dupe in dupes:
        deleted, _ = (
            DailyCheckin.objects
            .filter(user_id=dupe['user_id'], fecha=dupe['fecha'])
            .exclude(id=dupe['max_id'])
            .delete()
        )
        deleted_total += deleted
    if deleted_total:
        print(f'\n  Eliminados {deleted_total} check-in(s) duplicados antes de crear el índice único.')


class Migration(migrations.Migration):

    dependencies = [
        ('checkins', '0007_alter_dailycheckin_calidad_sueno_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RunPython(deduplicate_checkins, migrations.RunPython.noop),
        migrations.AlterUniqueTogether(
            name='dailycheckin',
            unique_together={('user', 'fecha')},
        ),
    ]
