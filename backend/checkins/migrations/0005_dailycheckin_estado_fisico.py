from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('checkins', '0004_dailycheckin_daily_check_user_id_968392_idx'),
    ]

    operations = [
        migrations.AddField(
            model_name='dailycheckin',
            name='estado_fisico',
            field=models.IntegerField(blank=True, null=True),
        ),
    ]
