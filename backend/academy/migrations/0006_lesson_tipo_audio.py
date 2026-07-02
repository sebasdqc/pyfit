from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0005_school'),
    ]

    operations = [
        migrations.AlterField(
            model_name='lesson',
            name='tipo',
            field=models.CharField(
                choices=[
                    ('video', 'Video'), ('texto', 'Texto'), ('audio', 'Audio'),
                    ('quiz', 'Quiz'), ('en_vivo', 'Sesión en vivo'),
                    ('practica', 'Práctica presencial'), ('entregable', 'Entregable'),
                ],
                default='texto', max_length=10,
            ),
        ),
    ]
