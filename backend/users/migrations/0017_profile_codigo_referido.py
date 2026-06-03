import secrets

from django.db import migrations, models

# Alfabeto sin caracteres ambiguos (sin 0/O, 1/I/L) — debe coincidir con
# users.models.REFERRAL_CODE_ALPHABET. Se replica aquí porque las migraciones no
# deben depender del código de la app (que puede cambiar en el futuro).
_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def _gen(length=6):
    return ''.join(secrets.choice(_ALPHABET) for _ in range(length))


def backfill_codigos(apps, schema_editor):
    """Rellena un código único para cada perfil existente sin código."""
    Profile = apps.get_model('users', 'Profile')

    usados = set(
        Profile.objects
        .exclude(codigo_referido__isnull=True)
        .exclude(codigo_referido='')
        .values_list('codigo_referido', flat=True)
    )

    pendientes = Profile.objects.filter(
        models.Q(codigo_referido__isnull=True) | models.Q(codigo_referido='')
    ).only('id', 'codigo_referido')

    to_update = []
    for p in pendientes.iterator():
        code = _gen()
        while code in usados:
            code = _gen()
        usados.add(code)
        p.codigo_referido = code
        to_update.append(p)

    Profile.objects.bulk_update(to_update, ['codigo_referido'], batch_size=500)


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0016_user_coach_activo_user_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='codigo_referido',
            field=models.CharField(blank=True, max_length=12, null=True, unique=True),
        ),
        migrations.RunPython(backfill_codigos, noop),
    ]
