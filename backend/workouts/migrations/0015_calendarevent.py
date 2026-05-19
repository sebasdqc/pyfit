from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('workouts', '0014_sessionexercise_series_log'),
    ]

    operations = [
        migrations.CreateModel(
            name='CalendarEvent',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('fecha', models.DateField()),
                ('titulo', models.CharField(max_length=100)),
                ('tipo', models.CharField(
                    choices=[('competicion', 'Competición'), ('descanso', 'Descanso'), ('otro', 'Otro')],
                    default='otro',
                    max_length=20,
                )),
                ('notas', models.TextField(blank=True, default='')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='calendar_events',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'db_table': 'calendar_events',
                'ordering': ['fecha', 'created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='calendarevent',
            index=models.Index(fields=['user', 'fecha'], name='cal_ev_user_fecha_idx'),
        ),
    ]
