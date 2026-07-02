from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0004_tenant'),
    ]

    operations = [
        migrations.CreateModel(
            name='School',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True,
                                           serialize=False, verbose_name='ID')),
                ('nombre', models.CharField(max_length=160)),
                ('slug', models.SlugField(max_length=90, unique=True)),
                ('descripcion', models.TextField(blank=True)),
                ('orden', models.PositiveIntegerField(
                    default=0,
                    help_text='Orden de aparición en el catálogo.',
                )),
                ('tenant', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='escuelas',
                    to='academy.tenant',
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'db_table': 'academy_schools', 'ordering': ['orden', 'nombre']},
        ),
        migrations.AddField(
            model_name='course',
            name='school',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='cursos',
                to='academy.school',
            ),
        ),
    ]
