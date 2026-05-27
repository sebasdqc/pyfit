from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('users', '0011_periodization_models'),
    ]
    operations = [
        migrations.AddField(
            model_name='profile',
            name='avatar',
            field=models.TextField(blank=True, default=''),
        ),
    ]
