import datetime
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0007_notification_preference'),
    ]

    operations = [
        migrations.AddField(
            model_name='notificationpreference',
            name='hora_inicio',
            field=models.TimeField(default=datetime.time(7, 0)),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='hora_fin',
            field=models.TimeField(default=datetime.time(22, 0)),
        ),
        migrations.AddField(
            model_name='notificationpreference',
            name='silencio',
            field=models.BooleanField(default=False),
        ),
    ]
