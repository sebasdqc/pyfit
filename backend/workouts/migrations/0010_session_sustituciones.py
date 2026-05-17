from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0009_session_logro'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='sustituciones',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
