from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('workouts', '0007_training_dna'),
    ]

    operations = [
        migrations.AddField(
            model_name='session',
            name='decisiones',
            field=models.JSONField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='session',
            name='evidencia',
            field=models.JSONField(blank=True, null=True),
        ),
    ]
