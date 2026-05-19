from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0013_normalized_exercise_catalog'),
    ]

    operations = [
        migrations.AddField(
            model_name='sessionexercise',
            name='series_log',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
