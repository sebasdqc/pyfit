from django.conf import settings
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('checkins', '0005_dailycheckin_estado_fisico'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='dailycheckin',
            unique_together=set(),
        ),
    ]
