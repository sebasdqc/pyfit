# Fotos de sesión: de FileField (object storage/disco) a data URI base64 en la BD,
# igual que users.User.avatar — evita depender de DO Spaces (de pago). Las fotos
# previas vivían en disco efímero de DO (se perdían en cada redeploy), así que no
# hay datos que migrar.
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0025_session_fin_ejercicios'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='sessionphoto',
            name='image',
        ),
        migrations.AddField(
            model_name='sessionphoto',
            name='image_data',
            field=models.TextField(default=''),
            preserve_default=False,
        ),
    ]
