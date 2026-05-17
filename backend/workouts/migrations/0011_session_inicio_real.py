from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0010_session_sustituciones'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='inicio_real',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
