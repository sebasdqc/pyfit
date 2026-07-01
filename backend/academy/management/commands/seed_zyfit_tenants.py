"""Crea (o actualiza) los dos tenants principales de Zyfit Academy.

  • zyfit-academy — Zyfit Academy (Ciencias del Deporte). Rojo moderno.
  • conmebol      — CONMEBOL Evolución. Azul navy. Hereda los cursos que
                    actualmente tienen tenant=NULL (sembrados antes de la
                    migración multi-tenant).

Uso:
    python manage.py seed_zyfit_tenants
    python manage.py seed_zyfit_tenants --only zyfit-academy
    python manage.py seed_zyfit_tenants --only conmebol
"""

from django.core.management.base import BaseCommand

from academy.models import Tenant, Course


TENANTS = {
    'zyfit-academy': {
        'nombre': 'Zyfit Academy',
        'dominio': 'zyfit-academy.internal',   # placeholder; resolución por header
        'branding': {
            'nombre_plataforma': 'Zyfit Academy',
            'tagline':           'Ciencia en movimiento',
            'fuente':            'Inter',
            'color_brand':        '#cc1f36',
            'color_brand_dark':   '#a61729',
            'color_brand_deep':   '#7a0f1d',
            'color_accent':       '#e63950',
            'color_accent_light': '#f06272',
            'color_accent_dark':  '#b8182e',
            'color_ok':     '#16a34a',
            'color_warn':   '#d97706',
            'color_danger': '#dc2626',
            'tema': 'light',
        },
        'assign_null_courses': False,
    },
    'conmebol': {
        'nombre': 'CONMEBOL Evolución',
        'dominio': 'conmebol-evolucion.internal',  # placeholder; resolución por header
        'branding': {
            'nombre_plataforma': 'CONMEBOL Evolución',
            'tagline':           'Cree en grande',
            'fuente':            'Ubuntu',
            'color_brand':        '#1a3e72',
            'color_brand_dark':   '#13294d',
            'color_brand_deep':   '#0c1a30',
            'color_accent':       '#0066b3',
            'color_accent_light': '#2a82d6',
            'color_accent_dark':  '#004a87',
            'color_ok':     '#1f9d6b',
            'color_warn':   '#e08a00',
            'color_danger': '#d64545',
            'tema': 'light',
        },
        # Los cursos CONMEBOL sembrados antes del multi-tenant tienen tenant=NULL;
        # migrarlos a este tenant para aislar su catálogo.
        'assign_null_courses': True,
    },
}


class Command(BaseCommand):
    help = 'Crea/actualiza los tenants principales de Zyfit Academy.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--only',
            choices=list(TENANTS.keys()),
            default=None,
            help='Crear solo este tenant en vez de los dos.',
        )

    def handle(self, *args, **options):
        slugs = [options['only']] if options['only'] else list(TENANTS.keys())

        for slug in slugs:
            cfg = TENANTS[slug]
            tenant, created = Tenant.objects.get_or_create(
                slug=slug,
                defaults={
                    'nombre':   cfg['nombre'],
                    'dominio':  cfg['dominio'],
                    'branding': cfg['branding'],
                },
            )
            if not created:
                # Actualiza branding y nombre; preserva dominio custom si ya existe
                tenant.nombre   = cfg['nombre']
                tenant.branding = {**tenant.branding, **cfg['branding']}
                if not tenant.dominio:
                    tenant.dominio = cfg['dominio']
                tenant.save()
                self.stdout.write(self.style.WARNING(f'Tenant "{slug}" actualizado.'))
            else:
                self.stdout.write(self.style.SUCCESS(f'Tenant "{slug}" creado (id={tenant.id}).'))

            if cfg['assign_null_courses']:
                updated = Course.objects.filter(tenant__isnull=True).update(tenant=tenant)
                if updated:
                    self.stdout.write(
                        self.style.SUCCESS(f'  {updated} curso(s) asignados a "{slug}".')
                    )

        self.stdout.write('')
        self.stdout.write('Siguiente paso en producción:')
        self.stdout.write('  Desplegar los dos Static Sites de DO y verificar que')
        self.stdout.write('  cada uno envía X-Tenant-Slug correcto vía VITE_TENANT_SLUG.')
