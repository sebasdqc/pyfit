from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0003_evolucion_360'),
    ]

    operations = [
        migrations.CreateModel(
            name='Tenant',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True,
                                        serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=120)),
                ('slug', models.SlugField(unique=True)),
                ('dominio', models.CharField(max_length=253, unique=True)),
                ('dominio_custom', models.CharField(blank=True, max_length=253)),
                ('activo', models.BooleanField(default=True)),
                ('branding', models.JSONField(blank=True, default=dict)),
                ('settings', models.JSONField(blank=True, default=dict)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'academy_tenants'},
        ),
        migrations.AddField(
            model_name='course',
            name='tenant',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cursos',
                to='academy.tenant',
            ),
        ),
    ]
