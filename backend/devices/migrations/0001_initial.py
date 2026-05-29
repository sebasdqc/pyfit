from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import devices.fields


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='DeviceIntegration',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('device', models.CharField(
                    choices=[('garmin', 'Garmin Connect')],
                    max_length=50,
                )),
                ('status', models.CharField(
                    choices=[('connected', 'Conectado'), ('disconnected', 'Desconectado')],
                    default='disconnected',
                    max_length=20,
                )),
                ('access_token',  devices.fields.EncryptedTextField(blank=True, null=True)),
                ('refresh_token', devices.fields.EncryptedTextField(blank=True, null=True)),
                ('token_expires_at', models.DateTimeField(blank=True, null=True)),
                ('last_synced_at',   models.DateTimeField(blank=True, null=True)),
                ('hrv',          models.FloatField(blank=True, null=True, help_text='HRV nocturno (ms)')),
                ('sleep_score',  models.FloatField(blank=True, null=True, help_text='Score sueño Garmin 0–100')),
                ('resting_hr',   models.FloatField(blank=True, null=True, help_text='FC en reposo (bpm)')),
                ('stress_level', models.FloatField(blank=True, null=True, help_text='Nivel de estrés Garmin 0–100')),
                ('body_battery', models.FloatField(blank=True, null=True, help_text='Body Battery cargada 0–100')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='device_integrations',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Integración de dispositivo',
                'verbose_name_plural': 'Integraciones de dispositivos',
                'ordering': ['-updated_at'],
                'unique_together': {('user', 'device')},
            },
        ),
    ]
