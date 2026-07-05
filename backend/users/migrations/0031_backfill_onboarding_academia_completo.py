# Backfill: los usuarios que ya existían antes de este feature no deben ver el
# wizard de /bienvenida al volver a iniciar sesión — "primera vez" se refiere a
# cuentas nuevas, no a las ya registradas. Los Profile creados a partir de acá
# sí nacen con onboarding_academia_completo=False (default del modelo).

from django.db import migrations


def marcar_completo(apps, schema_editor):
    Profile = apps.get_model('users', 'Profile')
    Profile.objects.filter(onboarding_academia_completo=False).update(onboarding_academia_completo=True)


def revertir(apps, schema_editor):
    pass  # no reversible: no hay forma de distinguir quién lo tenía en False originalmente


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0030_profile_anios_experiencia_deporte_and_more'),
    ]

    operations = [
        migrations.RunPython(marcar_completo, revertir),
    ]
