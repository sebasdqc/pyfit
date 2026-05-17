from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0005_horario_no_choices'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Notification',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('tipo', models.CharField(
                    choices=[
                        ('invitacion',  'Invitación a entrenar'),
                        ('insight',     'Insight semanal'),
                        ('alerta',      'Alerta de patrón'),
                        ('logro',       'Logro desbloqueado'),
                        ('reencuentro', 'Reencuentro'),
                    ],
                    max_length=20,
                )),
                ('texto', models.TextField()),
                ('leida', models.BooleanField(default=False)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='notifications',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'notifications',
                'ordering': ['leida', '-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='notification',
            index=models.Index(fields=['user', 'leida', '-created_at'], name='notif_user_leida_idx'),
        ),
    ]
