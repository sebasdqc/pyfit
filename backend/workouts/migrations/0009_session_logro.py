from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0008_session_decisiones_evidencia'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='logro',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
