# Generated manually for Zyfit Academy's immediate quiz feedback feature.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0024_competency_lessoncompetencytag_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='question',
            name='feedback_correcta',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Explicación que verá el estudiante cuando responda correctamente.',
            ),
        ),
        migrations.AddField(
            model_name='question',
            name='feedback_incorrecta',
            field=models.TextField(
                blank=True,
                default='',
                help_text='Explicación que verá el estudiante cuando responda incorrectamente.',
            ),
        ),
    ]
