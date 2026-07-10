"""Semilla de FAQ por defecto para el catálogo raíz de Zyfit (tenant=None).

Corre como parte de `migrate` (ya automático en entrypoint.sh) — liviano
(unos pocos INSERT de texto), no requiere el paso manual que sí exigen
comandos pesados como `index_tutor_content` (ver backend/CLAUDE.md).
Idempotente: no hace nada si ya hay FAQ cargada (evita duplicar si alguien
la corre dos veces en un entorno de test)."""

from django.db import migrations

FAQS = [
    ('cuenta', '¿Cómo recupero mi contraseña?',
     'Desde la pantalla de inicio de sesión tocá "¿Olvidaste tu contraseña?" e ingresá tu email. '
     'Te enviaremos un código para crear una nueva contraseña.'),
    ('certificados', '¿Cómo obtengo mi certificado de un curso?',
     'El certificado se emite automáticamente cuando completás el 100% de las lecciones y aprobás '
     'todos los quizzes del curso. Lo encontrás en la sección "Certificados", con un código único '
     'que cualquiera puede verificar.'),
    ('gamificación', '¿Qué es la racha de estudio y cómo funciona?',
     'La racha cuenta los días consecutivos en que avanzaste contenido. Tenés hasta 1 freeze '
     'automático (máximo 3 por racha) para no perderla si un día no estudiás, y una ventana de '
     '48 horas para recuperarla si se corta.'),
    ('gamificación', '¿Qué son las insignias y cómo las gano?',
     'Las insignias premian hitos de tu recorrido: completar una escuela, mantener tu racha, o '
     'terminar el Check-list de Competencias de un curso del Programa Evolución 360°. Se otorgan '
     'automáticamente, sin que tengas que reclamarlas.'),
    ('suscripción', '¿Qué diferencia hay entre el plan gratuito y Zyfit Academy Pro?',
     'El plan gratuito (Starter) te da acceso a los módulos y recursos marcados como gratuitos. '
     'Zyfit Academy Pro desbloquea el catálogo completo de las 7 escuelas, certificado en cada '
     'curso y una cuota diaria ampliada del Tutor IA (30 preguntas vs. 3).'),
    ('tutor ia', '¿Qué es el Tutor IA y cuántas preguntas puedo hacerle?',
     'Es un asistente conversacional que responde dudas sobre el contenido de los cursos. El plan '
     'Starter incluye 3 preguntas por día; Zyfit Academy Pro amplía la cuota a 30 preguntas diarias.'),
    ('general', '¿Zyfit Academy tiene versión para celular?',
     'Hoy Zyfit Academy es una plataforma web — podés usarla desde el navegador de tu celular con '
     'la misma cuenta. Zyfit APP (la app de entrenamiento con IA) es una aplicación aparte, todavía '
     'no publicada en las tiendas.'),
    ('general', '¿Cómo cambio el idioma de la plataforma?',
     'Desde el ícono de idioma en la barra superior podés alternar entre español e inglés. La '
     'preferencia se guarda en tu cuenta.'),
]


def seed_faqs(apps, schema_editor):
    SupportFAQ = apps.get_model('academy', 'SupportFAQ')
    if SupportFAQ.objects.exists():
        return
    for orden, (categoria, pregunta, respuesta) in enumerate(FAQS):
        SupportFAQ.objects.create(
            tenant=None, categoria=categoria, pregunta=pregunta, respuesta=respuesta,
            orden=orden, publicado=True,
        )


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('academy', '0019_supportfaq_supportmessage'),
    ]

    operations = [
        migrations.RunPython(seed_faqs, noop),
    ]
