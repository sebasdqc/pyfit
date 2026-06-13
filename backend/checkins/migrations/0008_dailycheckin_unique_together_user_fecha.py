from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('checkins', '0007_alter_dailycheckin_calidad_sueno_and_more'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='dailycheckin',
            unique_together={('user', 'fecha')},
        ),
    ]
