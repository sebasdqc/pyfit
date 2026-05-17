from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0006_notification'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='NotificationPreference',
            fields=[
                ('id',          models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('invitacion',  models.BooleanField(default=True)),
                ('insight',     models.BooleanField(default=True)),
                ('alerta',      models.BooleanField(default=True)),
                ('logro',       models.BooleanField(default=True)),
                ('reencuentro', models.BooleanField(default=True)),
                ('user', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notification_prefs',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'notification_preferences',
            },
        ),
    ]
