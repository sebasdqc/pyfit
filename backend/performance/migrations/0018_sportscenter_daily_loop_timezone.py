from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('performance', '0017_sportscenter_proteccion_menores_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='sportscenter',
            name='daily_loop_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='sportscenter',
            name='timezone',
            field=models.CharField(default='UTC', max_length=64),
        ),
    ]
