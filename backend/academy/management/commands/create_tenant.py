"""Crea o actualiza un tenant de Zyfit Academy.

Uso básico:
    python manage.py create_tenant \\
        --nombre "CONMEBOL Evolución" \\
        --slug conmebol \\
        --dominio conmebol.zyfit.app

Con dominio custom y branding completo:
    python manage.py create_tenant \\
        --nombre "Real Federación Española de Fútbol" \\
        --slug rfef \\
        --dominio rfef.zyfit.app \\
        --dominio-custom academia.rfef.es \\
        --color-brand "#c00000" \\
        --color-accent "#e8a000" \\
        --fuente "Roboto" \\
        --tagline "El fútbol es nuestro" \\
        --logo-url "https://cdn.rfef.es/logo.svg"

Con --assign-courses asigna al nuevo tenant todos los cursos que actualmente
tienen tenant=NULL (útil para migrar los cursos sembrados con seed commands
anteriores a la migración multi-tenant):
    python manage.py create_tenant --slug conmebol ... --assign-courses
"""

import json

from django.core.management.base import BaseCommand, CommandError

from academy.models import Tenant, Course


class Command(BaseCommand):
    help = 'Crea o actualiza un tenant de Zyfit Academy (white-label).'

    def add_arguments(self, parser):
        parser.add_argument('--nombre',    required=True,  help='Nombre visible de la plataforma.')
        parser.add_argument('--slug',      required=True,  help='Slug único (a-z, sin espacios).')
        parser.add_argument('--dominio',   required=True,  help='Subdominio gestionado por Zyfit (ej. conmebol.zyfit.app).')
        parser.add_argument('--dominio-custom', default='', help='Dominio propio del cliente (ej. evolucion.conmebol.com).')
        # Colores de branding (hex, opcional — se aplican sobre los defaults de Zyfit)
        parser.add_argument('--color-brand',         default='', help='Color principal hex (ej. #1a3e72).')
        parser.add_argument('--color-brand-dark',    default='')
        parser.add_argument('--color-brand-deep',    default='')
        parser.add_argument('--color-accent',        default='', help='Color de interacción hex.')
        parser.add_argument('--color-accent-light',  default='')
        parser.add_argument('--color-accent-dark',   default='')
        parser.add_argument('--color-ok',            default='')
        parser.add_argument('--color-warn',          default='')
        parser.add_argument('--color-danger',        default='')
        # Identidad textual y tipografía
        parser.add_argument('--nombre-plataforma',   default='', help='Nombre visible en la web (si difiere de --nombre).')
        parser.add_argument('--tagline',             default='', help='Frase de marca (ej. "Cree en grande").')
        parser.add_argument('--fuente',              default='', help='Nombre de Google Font (ej. Roboto).')
        parser.add_argument('--logo-url',            default='', help='URL pública del logo (imagen o SVG).')
        parser.add_argument('--favicon-url',         default='', help='URL del favicon.')
        parser.add_argument('--tema',                default='', choices=['', 'light', 'dark'],
                            help='Tema de color: light (default) o dark.')
        # Acciones adicionales
        parser.add_argument('--assign-courses', action='store_true',
                            help='Asignar al nuevo tenant todos los cursos sin tenant (tenant=NULL).')
        parser.add_argument('--update', action='store_true',
                            help='Si el slug ya existe, actualizar en vez de fallar.')

    def handle(self, *args, **options):
        slug = options['slug'].strip().lower()

        # Construir branding parcial (solo los valores no vacíos sobreescriben los defaults)
        branding = {}
        color_fields = [
            'color_brand', 'color_brand_dark', 'color_brand_deep',
            'color_accent', 'color_accent_light', 'color_accent_dark',
            'color_ok', 'color_warn', 'color_danger',
        ]
        for field in color_fields:
            val = options[field.replace('_', '-')].strip()
            if val:
                branding[field] = val if val.startswith('#') else f'#{val}'

        text_fields = {
            'nombre_plataforma': options['nombre-plataforma'] or options['nombre'],
            'tagline':    options['tagline'],
            'fuente':     options['fuente'],
            'logo_url':   options['logo-url'],
            'favicon_url':options['favicon-url'],
            'tema':       options['tema'],
        }
        for key, val in text_fields.items():
            if val:
                branding[key] = val

        existing = Tenant.objects.filter(slug=slug).first()
        if existing and not options['update']:
            raise CommandError(
                f'Ya existe un tenant con slug="{slug}". '
                f'Usa --update para modificarlo.'
            )

        if existing:
            existing.nombre = options['nombre']
            existing.dominio = options['dominio']
            existing.dominio_custom = options['dominio_custom']
            existing.branding = {**existing.branding, **branding}
            existing.save()
            tenant = existing
            self.stdout.write(self.style.WARNING(f'Tenant "{slug}" actualizado.'))
        else:
            tenant = Tenant.objects.create(
                nombre=options['nombre'],
                slug=slug,
                dominio=options['dominio'],
                dominio_custom=options['dominio_custom'],
                branding=branding,
            )
            self.stdout.write(self.style.SUCCESS(f'Tenant "{slug}" creado (id={tenant.id}).'))

        self.stdout.write(f'  Dominio: {tenant.dominio}')
        if tenant.dominio_custom:
            self.stdout.write(f'  Dominio custom: {tenant.dominio_custom}')
        self.stdout.write(f'  Branding: {json.dumps(tenant.branding, ensure_ascii=False)}')

        if options['assign_courses']:
            updated = Course.objects.filter(tenant__isnull=True).update(tenant=tenant)
            if updated:
                self.stdout.write(self.style.SUCCESS(
                    f'  {updated} curso(s) sin tenant asignados a "{slug}".'
                ))
            else:
                self.stdout.write('  Sin cursos sin tenant que asignar.')

        self.stdout.write('')
        self.stdout.write('Para activar en producción:')
        self.stdout.write(f'  1. Apuntar DNS: {tenant.dominio} → app DO de academy-web')
        if tenant.dominio_custom:
            self.stdout.write(f'     (ídem para {tenant.dominio_custom} con dominio custom DO)')
        self.stdout.write(f'  2. Añadir "{tenant.dominio}" a CORS_ALLOWED_ORIGINS del backend')
        self.stdout.write(f'  3. Crear cuentas de instructor con tenant={slug} si aplica')
