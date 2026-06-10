"""Siembra el curso del **Programa Evolución 360° — "Del Clic a la Cancha"**.

Materializa en Zyfit Academy la propuesta de innovación académica
(`Propuesta_Evolucion_360.md`): un curso de modalidad **híbrida evolutiva** en
cinco fases (Sesión Virtual 1 → Intermedio Digital → Sesión Virtual 2 → Fase
Presencial → Sesión Virtual 3), con **evaluación gamificada** (video-quiz de
lectura de juego, Escenario Crítico, Diario de Estrategia en video) y el
**Check-list de Competencias**: tres hitos con insignia (Aplicador, Analista,
Estratega) más la evaluación final que cierra el Certificado Digital (Hito 4).

Usa los tipos de lección del Programa 360°: `en_vivo` (sesión sincrónica),
`practica` (día presencial) y `entregable` (tarea que revisa y aprueba el
instructor — la lección solo se completa con la entrega aprobada).

    python manage.py seed_evolucion_360 [--instructor-email correo@dominio]

Idempotente por slug: se omite si el curso ya existe. NO se ejecuta en el
arranque (no está en entrypoint.sh): es una herramienta de siembra manual.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from academy.models import Course, CourseBadge, Module, Lesson, Quiz, Question

User = get_user_model()

VF = [{'id': 'v', 'texto': 'Verdadero'}, {'id': 'f', 'texto': 'Falso'}]

# Cada lección puede declarar 'ref' (clave interna) para que una insignia del
# check-list apunte a ella; 'entregable_tipo' en los entregables; y
# 'duracion_min' como estimación de consumo.
CURSO = {
    'slug': 'programa-evolucion-360-del-clic-a-la-cancha',
    'titulo': 'Programa Evolución 360°: Del Clic a la Cancha',
    'resumen': 'Modalidad híbrida evolutiva: la teoría en digital, la cancha 100% práctica '
               'y una evaluación gamificada que te lleva del saber al saber hacer.',
    'descripcion': (
        'El Programa Evolución 360° lleva la formación de entrenadores del modelo de '
        '"escucha pasiva" (retención menor al 20%) al **Aprendizaje Basado en la Acción**: '
        'el entrenador no es un espectador, sino un protagonista que resuelve problemas '
        'reales. Las evaluaciones situacionales estimulan el paso del "saber" al "saber '
        'hacer", transformando los conceptos de los Cursos Evolución en competencias '
        'reales de campo.\n\n'
        'La modalidad es **híbrida evolutiva** en cinco fases: dos sesiones virtuales en '
        'vivo y un intermedio digital entregan la teoría (el qué) antes de la fase '
        'presencial, para que los tres días en cancha se dediquen exclusivamente a la '
        'práctica de alta intensidad (el cómo); una sesión virtual final evalúa con '
        'estudios de caso post-presenciales. El video-análisis inmediato aporta feedback '
        'objetivo: el entrenador se ve a sí mismo, identifica sus errores de comunicación '
        'o posicionamiento y los corrige bajo la supervisión de expertos internacionales.\n\n'
        'El avance se gestiona con el **Check-list de Competencias**: Hito 1 — análisis '
        'entregado (Insignia de Aplicador); Hito 2 — video cargado (Insignia de Analista); '
        'Hito 3 — planificación aprobada (Insignia de Estratega); Hito 4 — evaluación '
        'respondida (Certificado Digital). Este seguimiento evita el "olvido post-curso" y '
        'genera un efecto multiplicador en el club o academia de origen.'
    ),
    'categoria': 'formación de entrenadores',
    'nivel': 'intermedio',
    'disciplina': 'futbol',
    'licencia': '',  # curso/taller del ecosistema Evolución (no otorga licencia)
    'modalidad': 'semipresencial',
    'carga_horaria_h': 40,
    'acredita_renovacion': True,
    'insignias': [
        {
            'orden': 1, 'nombre': 'Insignia de Aplicador', 'icono': '🎯',
            'descripcion': 'Hito 1 · Análisis de estudio de caso entregado y aprobado.',
            'lesson_ref': 'analisis',
        },
        {
            'orden': 2, 'nombre': 'Insignia de Analista', 'icono': '🎥',
            'descripcion': 'Hito 2 · Diario de Estrategia (video) cargado y aprobado.',
            'lesson_ref': 'video',
        },
        {
            'orden': 3, 'nombre': 'Insignia de Estratega', 'icono': '📋',
            'descripcion': 'Hito 3 · Planificación del Escenario Crítico aprobada.',
            'lesson_ref': 'planificacion',
        },
    ],
    'modulos': [
        # ─────────────── FASE 1 · Sesión Virtual 1 (sincrónica, 3 h) ───────────
        {
            'titulo': 'Fase 1 · Sesión Virtual 1 (en vivo, 3 h)',
            'descripcion': 'Presentación de los temas seleccionados por los instructores '
                           'asignados. La teoría se entrega en digital: la cancha será '
                           '100% práctica.',
            'lecciones': [
                {
                    'tipo': 'texto',
                    'titulo': 'Bienvenida: el Aprendizaje Basado en la Acción',
                    'duracion_min': 15,
                    'contenido': (
                        'El modelo tradicional de "escucha pasiva" retiene menos del 20% de '
                        'los conocimientos. Este programa se fundamenta en el **Aprendizaje '
                        'Basado en la Acción**: aquí no eres un espectador, eres un '
                        'protagonista que debe resolver problemas reales. Las evaluaciones '
                        'situacionales estimulan a tu cerebro a pasar del "saber" al '
                        '"saber hacer".\n\n'
                        'El programa tiene cinco fases:\n\n'
                        '1. **Sesión Virtual 1** (en vivo, 3 h) — presentación de temas.\n'
                        '2. **Intermedio Digital** (1 semana, a tu ritmo) — manuales y guías.\n'
                        '3. **Sesión Virtual 2** (en vivo, 3 h) — ponencias, estudios de caso '
                        'y asignación de tareas para la cancha.\n'
                        '4. **Fase Presencial** (3 días inmersivos) — aplicación práctica, '
                        'corrección en tiempo real y liderazgo de grupos.\n'
                        '5. **Sesión Virtual 3** (asincrónica) — evaluación con estudios de '
                        'caso post-presenciales.\n\n'
                        'Tu avance se gestiona con el **Check-list de Competencias**:\n\n'
                        '- Hito 1: análisis entregado → 🎯 Insignia de Aplicador.\n'
                        '- Hito 2: video cargado → 🎥 Insignia de Analista.\n'
                        '- Hito 3: planificación aprobada → 📋 Insignia de Estratega.\n'
                        '- Hito 4: evaluación respondida → 🎓 Certificado Digital.\n\n'
                        'Los entregables los revisa y aprueba tu instructor: esa revisión es '
                        'el feedback experto que instala el conocimiento en tu club o '
                        'academia de origen.'
                    ),
                },
                {
                    'tipo': 'en_vivo',
                    'titulo': 'Sesión Virtual 1 — Ponencia inaugural (en vivo)',
                    'duracion_min': 180,
                    'contenido': (
                        'Sesión sincrónica de 3 horas con los instructores asignados.\n\n'
                        'Agenda:\n\n'
                        '- Presentación de los temas seleccionados del programa.\n'
                        '- Cómo funcionan las cinco fases y el Check-list de Competencias.\n'
                        '- Asignación de las lecturas del Intermedio Digital.\n\n'
                        'La fecha, la hora y el enlace de la reunión los publica tu '
                        'instructor en esta lección. Al participar, marca la sesión como '
                        'completada.'
                    ),
                },
            ],
        },
        # ─────────────── FASE 2 · Intermedio Digital (asincrónico, 1 semana) ───
        {
            'titulo': 'Fase 2 · Intermedio Digital (1 semana, a tu ritmo)',
            'descripcion': 'Lectura de manuales y guías en la plataforma. La teoría (el qué) '
                           'se completa aquí para liberar la cancha (el cómo).',
            'lecciones': [
                {
                    'tipo': 'texto',
                    'titulo': 'Manual: el modelo de juego como herramienta de decisión',
                    'duracion_min': 40,
                    'contenido': (
                        'El modelo de juego es el marco que ordena las decisiones del '
                        'entrenador en los cuatro momentos: organización ofensiva, '
                        'transición defensiva, organización defensiva y transición '
                        'ofensiva, atravesados por el balón parado.\n\n'
                        'Para este programa interesa el modelo como **herramienta de '
                        'decisión bajo presión**: ante un problema del juego (un marcador '
                        'adverso, una expulsión, una presión alta del rival), el entrenador '
                        'competente no improvisa — selecciona un ajuste coherente con sus '
                        'principios, lo comunica con claridad y diseña la tarea de '
                        'entrenamiento que lo instala en el equipo.\n\n'
                        'Durante la Fase Presencial dirigirás prácticas enfocadas en '
                        'resolver escenarios críticos. Toda la teoría que necesitas para '
                        'diseñar esos ajustes está en este intermedio digital: estudia con '
                        'intención, porque en la cancha no habrá clase tradicional.'
                    ),
                },
                {
                    'tipo': 'texto',
                    'titulo': 'Guía: cómo analizar un estudio de caso',
                    'duracion_min': 30,
                    'contenido': (
                        'En la Sesión Virtual 2 se te asignará un estudio de caso real. '
                        'Usa esta guía de análisis en cuatro pasos:\n\n'
                        '1. **Contexto** — marcador, minuto, plan inicial, estado del '
                        'rival y del propio equipo (físico, anímico, numérico).\n'
                        '2. **Problema** — qué está fallando y por qué: identifica la '
                        'causa táctica, no solo el síntoma.\n'
                        '3. **Alternativas** — al menos dos ajustes posibles, con el costo '
                        'y el beneficio de cada uno.\n'
                        '4. **Decisión y variantes** — el ajuste elegido, cómo lo '
                        'comunicas en caliente y qué variante preparas si no funciona.\n\n'
                        'Este es el formato del Hito 1 (análisis entregado) y la base de '
                        'la planificación del Escenario Crítico (Hito 3). El análisis se '
                        'realiza de forma grupal e individual según el tema asignado.'
                    ),
                },
                {
                    'tipo': 'quiz',
                    'titulo': 'Autoevaluación del Intermedio Digital',
                    'duracion_min': 15,
                    'quiz': {
                        'puntaje_aprobacion': 70,
                        'preguntas': [
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'En el Programa Evolución 360°, ¿por qué la teoría se '
                                             'entrega en digital antes de la fase presencial?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Para reducir la carga horaria total'},
                                    {'id': 'b', 'texto': 'Para que los tres días en cancha se dediquen '
                                                         'exclusivamente a la práctica de alta intensidad'},
                                    {'id': 'c', 'texto': 'Porque la teoría es opcional'},
                                    {'id': 'd', 'texto': 'Para evaluar la velocidad de lectura'},
                                ],
                                'correctas': ['b'],
                            },
                            {
                                'tipo': 'verdadero_falso',
                                'enunciado': 'El modelo tradicional de "escucha pasiva" tiene una tasa '
                                             'de retención de conocimientos menor al 20%.',
                                'opciones': VF,
                                'correctas': ['v'],
                            },
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'En el Aprendizaje Basado en la Acción, el entrenador es…',
                                'opciones': [
                                    {'id': 'a', 'texto': 'un espectador que toma apuntes'},
                                    {'id': 'b', 'texto': 'un evaluador externo del juego'},
                                    {'id': 'c', 'texto': 'un protagonista que debe resolver problemas reales'},
                                    {'id': 'd', 'texto': 'un asistente del instructor'},
                                ],
                                'correctas': ['c'],
                            },
                            {
                                'tipo': 'opcion_multiple',
                                'enunciado': '¿Qué pasos forman la guía de análisis de un estudio de caso?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Contexto'},
                                    {'id': 'b', 'texto': 'Problema (causa táctica)'},
                                    {'id': 'c', 'texto': 'Alternativas con costo/beneficio'},
                                    {'id': 'd', 'texto': 'Decisión y variantes'},
                                    {'id': 'e', 'texto': 'Resultado del sorteo del fixture'},
                                ],
                                'correctas': ['a', 'b', 'c', 'd'],
                            },
                        ],
                    },
                },
            ],
        },
        # ─────────────── FASE 3 · Sesión Virtual 2 (sincrónica, 3 h) ───────────
        {
            'titulo': 'Fase 3 · Sesión Virtual 2 (en vivo, 3 h)',
            'descripcion': 'Ponencias, resolución de problemas y estudios de caso. Se asignan '
                           'las tareas a ejecutar en las sesiones presenciales.',
            'lecciones': [
                {
                    'tipo': 'en_vivo',
                    'titulo': 'Sesión Virtual 2 — Ponencias y resolución de problemas (en vivo)',
                    'duracion_min': 180,
                    'contenido': (
                        'Sesión sincrónica de 3 horas.\n\n'
                        'Agenda:\n\n'
                        '- Presentación de ponencias de los instructores.\n'
                        '- Resolución de problemas y estudios de caso en grupos.\n'
                        '- **Video-Quiz Interactivo**: se proyectan clips de situaciones de '
                        'juego seleccionados por los instructores y respondes en tiempo '
                        'real desde tu celular.\n'
                        '- Asignación de tareas para ejecutar en la Fase Presencial.\n\n'
                        'La fecha, la hora y el enlace los publica tu instructor en esta '
                        'lección.'
                    ),
                },
                {
                    'tipo': 'quiz',
                    'titulo': 'Video-Quiz Interactivo: lectura de juego',
                    'duracion_min': 20,
                    'quiz': {
                        'puntaje_aprobacion': 70,
                        'preguntas': [
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'Clip 1 — Tu equipo pierde 1-0 al minuto 75 y el rival se '
                                             'repliega en bloque bajo. ¿Cuál es el primer ajuste '
                                             'razonable?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Rematar desde cualquier posición'},
                                    {'id': 'b', 'texto': 'Dar amplitud y cambiar la orientación para '
                                                         'abrir el bloque y atacar los intervalos'},
                                    {'id': 'c', 'texto': 'Replegar también al propio equipo'},
                                    {'id': 'd', 'texto': 'Adelantar al arquero desde ya'},
                                ],
                                'correctas': ['b'],
                            },
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'Clip 2 — Tras una pérdida, tu lateral queda en 1 contra 2 '
                                             'en banda. En el video-análisis inmediato, ¿qué corrección '
                                             'priorizas?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'La basculación y cobertura del central más cercano'},
                                    {'id': 'b', 'texto': 'El saque del arquero'},
                                    {'id': 'c', 'texto': 'Adelantar a toda la línea sin referencia'},
                                    {'id': 'd', 'texto': 'Ninguna: es un problema del lateral'},
                                ],
                                'correctas': ['a'],
                            },
                            {
                                'tipo': 'verdadero_falso',
                                'enunciado': 'El video-análisis inmediato busca que el entrenador se vea '
                                             'a sí mismo e identifique sus errores de comunicación o '
                                             'posicionamiento para corregirlos con los expertos.',
                                'opciones': VF,
                                'correctas': ['v'],
                            },
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'Clip 3 — Ganas 2-1 con un expulsado, faltan 10 minutos y '
                                             'el rival presiona alto. ¿Qué decides?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Mantener la salida corta exactamente igual'},
                                    {'id': 'b', 'texto': 'Compactar en bloque medio-bajo y definir una '
                                                         'salida directa con una referencia clara y '
                                                         'caída a segunda jugada'},
                                    {'id': 'c', 'texto': 'Presionar hombre a hombre en todo el campo'},
                                    {'id': 'd', 'texto': 'Hacer tiempo sin un plan definido'},
                                ],
                                'correctas': ['b'],
                            },
                        ],
                    },
                },
                {
                    'tipo': 'entregable',
                    'ref': 'analisis',
                    'entregable_tipo': 'texto',
                    'titulo': 'Hito 1 · Entregable: análisis de estudio de caso',
                    'duracion_min': 60,
                    'contenido': (
                        'Aplica la guía de análisis (Fase 2) al estudio de caso asignado en '
                        'la Sesión Virtual 2.\n\n'
                        'Tu entrega debe incluir, en máximo 600 palabras:\n\n'
                        '1. Contexto del caso.\n'
                        '2. Problema y su causa táctica.\n'
                        '3. Dos alternativas de solución con costo y beneficio.\n'
                        '4. Tu decisión, cómo la comunicas y la variante de respaldo.\n\n'
                        'El instructor revisará tu análisis: al aprobarlo obtienes la '
                        '🎯 **Insignia de Aplicador** (Hito 1 del Check-list de '
                        'Competencias). Si te pide ajustes, corrige y reenvía.'
                    ),
                },
            ],
        },
        # ─────────────── FASE 4 · Fase Presencial (3 días inmersivos) ──────────
        {
            'titulo': 'Fase 4 · Fase Presencial (3 días inmersivos)',
            'descripcion': 'Aplicación práctica, corrección en tiempo real y liderazgo de '
                           'grupos. Cada minuto en cancha es práctica de alta intensidad.',
            'lecciones': [
                {
                    'tipo': 'practica',
                    'titulo': 'Día 1 — Aplicación práctica y corrección en tiempo real',
                    'duracion_min': 480,
                    'contenido': (
                        'Jornada en cancha dedicada a ejecutar las tareas asignadas en la '
                        'Sesión Virtual 2. No hay clase tradicional: el contenido teórico '
                        'ya fue cubierto en las fases virtuales.\n\n'
                        '- Dirección de tareas en grupos reducidos con rotación de roles.\n'
                        '- **Video-análisis inmediato**: cada intervención se graba y se '
                        'revisa al momento; te ves a ti mismo, identificas errores de '
                        'comunicación o posicionamiento y los corriges bajo supervisión '
                        'de los expertos internacionales.\n'
                        '- Intercambio de saberes entre participantes en la práctica.\n\n'
                        'Marca esta jornada como completada al finalizar tu asistencia.'
                    ),
                },
                {
                    'tipo': 'practica',
                    'titulo': 'Día 2 — Escenario Crítico: evaluación de desempeño',
                    'duracion_min': 480,
                    'contenido': (
                        'En lugar de una clase tradicional, hoy se te asigna un '
                        '**Escenario Crítico**. Ejemplo:\n\n'
                        '> "Vas perdiendo 1-0, minuto 30, tienes un expulsado y el rival '
                        'presiona alto. ¿Qué ajuste haces?"\n\n'
                        'Debes **dirigir 10 minutos de práctica enfocada** en resolver ese '
                        'escenario y crear alternativas. Se evalúa tu desempeño real: la '
                        'claridad del ajuste, la comunicación con los jugadores, tu '
                        'posicionamiento y el diseño de la tarea con sus variantes.\n\n'
                        'Tu planificación escrita de esta práctica es el Hito 3 (siguiente '
                        'lección): llévala preparada y ajústala con lo vivido en cancha.'
                    ),
                },
                {
                    'tipo': 'entregable',
                    'ref': 'planificacion',
                    'entregable_tipo': 'planificacion',
                    'titulo': 'Hito 3 · Entregable: planificación del Escenario Crítico',
                    'duracion_min': 60,
                    'contenido': (
                        'Entrega la planificación de los 10 minutos de práctica con los que '
                        'resolviste tu Escenario Crítico.\n\n'
                        'Estructura requerida:\n\n'
                        '1. Escenario asignado y objetivo del ajuste.\n'
                        '2. Ajuste táctico elegido y por qué.\n'
                        '3. Tarea de entrenamiento: organización, espacio, tiempos y '
                        'consignas.\n'
                        '4. Variantes y progresiones si la tarea no funciona.\n'
                        '5. Criterios de éxito observables.\n\n'
                        'Al aprobarla el instructor obtienes la 📋 **Insignia de '
                        'Estratega** (Hito 3 del Check-list de Competencias).'
                    ),
                },
                {
                    'tipo': 'practica',
                    'titulo': 'Día 3 — Liderazgo de grupos y diseño de variantes',
                    'duracion_min': 480,
                    'contenido': (
                        'Cierre presencial orientado al liderazgo:\n\n'
                        '- Dirección de grupos completos con los ajustes diseñados el Día 2.\n'
                        '- Diseño y ejecución de variantes sobre las tareas de otros '
                        'participantes (pensamiento adaptativo).\n'
                        '- Feedback cruzado entre participantes e instructores con apoyo '
                        'del video-análisis.\n\n'
                        'Marca esta jornada como completada al finalizar tu asistencia.'
                    ),
                },
            ],
        },
        # ─────────────── FASE 5 · Sesión Virtual 3 (asincrónica, post) ─────────
        {
            'titulo': 'Fase 5 · Sesión Virtual 3 (post-presencial)',
            'descripcion': 'Evaluación de conocimientos con estudios de caso post-presenciales '
                           'y cierre del Check-list de Competencias.',
            'lecciones': [
                {
                    'tipo': 'entregable',
                    'ref': 'video',
                    'entregable_tipo': 'video',
                    'titulo': 'Hito 2 · Entregable: el Diario de Estrategia (video, máx. 3 min)',
                    'duracion_min': 45,
                    'contenido': (
                        'Graba un **video corto (máximo 3 minutos)** explicando tu filosofía '
                        'de entrenamiento tras lo aprendido en el programa: qué cambió en tu '
                        'forma de leer el juego, decidir y comunicar.\n\n'
                        'Sube el video a YouTube (oculto), Vimeo o Drive con enlace '
                        'compartible y pega aquí la URL.\n\n'
                        'Al aprobarlo el instructor obtienes la 🎥 **Insignia de Analista** '
                        '(Hito 2). Estos diarios crean un banco de contenido que multiplica '
                        'el conocimiento en el fútbol de la región.'
                    ),
                },
                {
                    'tipo': 'quiz',
                    'titulo': 'Hito 4 · Evaluación final: estudios de caso post-presenciales',
                    'duracion_min': 30,
                    'quiz': {
                        'puntaje_aprobacion': 70,
                        'preguntas': [
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': 'Estudio de caso — Vas perdiendo 1-0, minuto 30, tienes un '
                                             'expulsado y el rival presiona alto. ¿Qué ajuste inicial es '
                                             'más coherente?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Mantener la salida corta idéntica al plan inicial'},
                                    {'id': 'b', 'texto': 'Reorganizar la estructura, asegurar la primera '
                                                         'línea de pase y definir una salida directa con '
                                                         'referencia y caída a segunda jugada'},
                                    {'id': 'c', 'texto': 'Adelantar a todo el equipo a presionar'},
                                    {'id': 'd', 'texto': 'Cambiar simultáneamente el rol de los once'},
                                ],
                                'correctas': ['b'],
                            },
                            {
                                'tipo': 'opcion_multiple',
                                'enunciado': 'En los 10 minutos de práctica del Escenario Crítico se '
                                             'evalúa…',
                                'opciones': [
                                    {'id': 'a', 'texto': 'La comunicación del entrenador'},
                                    {'id': 'b', 'texto': 'Su posicionamiento durante la tarea'},
                                    {'id': 'c', 'texto': 'El diseño de la tarea y sus variantes'},
                                    {'id': 'd', 'texto': 'El marcador final del partido del fin de semana'},
                                ],
                                'correctas': ['a', 'b', 'c'],
                            },
                            {
                                'tipo': 'verdadero_falso',
                                'enunciado': 'El seguimiento post-curso busca evitar el "olvido '
                                             'post-curso" y generar un efecto multiplicador en el club o '
                                             'academia de origen.',
                                'opciones': VF,
                                'correctas': ['v'],
                            },
                            {
                                'tipo': 'opcion_unica',
                                'enunciado': '"Del Clic a la Cancha" resume que…',
                                'opciones': [
                                    {'id': 'a', 'texto': 'el programa es 100% online'},
                                    {'id': 'b', 'texto': 'la teoría digital debe transformarse en '
                                                         'competencias reales de campo'},
                                    {'id': 'c', 'texto': 'la cancha se reserva por internet'},
                                    {'id': 'd', 'texto': 'el clic sustituye al entrenamiento'},
                                ],
                                'correctas': ['b'],
                            },
                            {
                                'tipo': 'opcion_multiple',
                                'enunciado': '¿Cuáles son hitos del Check-list de Competencias?',
                                'opciones': [
                                    {'id': 'a', 'texto': 'Análisis entregado (Aplicador)'},
                                    {'id': 'b', 'texto': 'Video cargado (Analista)'},
                                    {'id': 'c', 'texto': 'Planificación aprobada (Estratega)'},
                                    {'id': 'd', 'texto': 'Evaluación respondida (Certificado Digital)'},
                                    {'id': 'e', 'texto': 'Asistir a un partido profesional'},
                                ],
                                'correctas': ['a', 'b', 'c', 'd'],
                            },
                        ],
                    },
                },
            ],
        },
    ],
}


class Command(BaseCommand):
    help = ('Siembra el curso "Programa Evolución 360°: Del Clic a la Cancha" '
            '(idempotente) en Zyfit Academy.')

    def add_arguments(self, parser):
        parser.add_argument(
            '--instructor-email', default=None,
            help='Email de la cuenta instructor/admin que figura como autor. '
                 'Por defecto el primer admin/staff que exista.',
        )

    def handle(self, *args, **opts):
        instructor = self._resolve_instructor(opts.get('instructor_email'))

        if Course.objects.filter(slug=CURSO['slug']).exists():
            self.stdout.write(self.style.WARNING(
                f'• "{CURSO["slug"]}" ya existe — se omite.'))
            return

        course = self._create_course(CURSO, instructor)
        autor = instructor.email if instructor else 'sin instructor'
        self.stdout.write(self.style.SUCCESS(
            f'Listo: "{course.titulo}" creado (autor={autor}, '
            f'{course.modulos.count()} fases, {course.insignias.count()} insignias).'
        ))

    @transaction.atomic
    def _create_course(self, data, instructor):
        course = Course.objects.create(
            instructor=instructor,
            titulo=data['titulo'],
            slug=data['slug'],
            resumen=data['resumen'],
            descripcion=data['descripcion'],
            categoria=data['categoria'],
            nivel=data['nivel'],
            disciplina=data['disciplina'],
            licencia=data['licencia'],
            modalidad=data['modalidad'],
            carga_horaria_h=data['carga_horaria_h'],
            acredita_renovacion=data['acredita_renovacion'],
            publicado=True,
        )
        lessons_by_ref = {}
        for m_idx, m in enumerate(data['modulos'], start=1):
            module = Module.objects.create(
                course=course, orden=m_idx, titulo=m['titulo'],
                descripcion=m.get('descripcion', ''),
            )
            for l_idx, lec in enumerate(m['lecciones'], start=1):
                lesson = Lesson.objects.create(
                    module=module, orden=l_idx, titulo=lec['titulo'],
                    tipo=lec['tipo'], contenido=lec.get('contenido', ''),
                    duracion_min=lec.get('duracion_min', 0),
                    entregable_tipo=lec.get('entregable_tipo', ''),
                )
                if 'ref' in lec:
                    lessons_by_ref[lec['ref']] = lesson
                if lec['tipo'] == 'quiz':
                    self._create_quiz(lesson, lec['quiz'])

        for b in data['insignias']:
            CourseBadge.objects.create(
                course=course, orden=b['orden'], nombre=b['nombre'],
                icono=b['icono'], descripcion=b['descripcion'],
                lesson=lessons_by_ref[b['lesson_ref']],
            )
        return course

    def _create_quiz(self, lesson, qdata):
        quiz = Quiz.objects.create(
            lesson=lesson, titulo=lesson.titulo,
            puntaje_aprobacion=qdata.get('puntaje_aprobacion', 70),
        )
        for q_idx, q in enumerate(qdata['preguntas'], start=1):
            Question.objects.create(
                quiz=quiz, orden=q_idx, tipo=q['tipo'], enunciado=q['enunciado'],
                video_url=q.get('video_url', ''),
                opciones=q['opciones'], respuestas_correctas=q['correctas'],
                puntos=q.get('puntos', 1),
            )

    def _resolve_instructor(self, email):
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                self.stdout.write(self.style.WARNING(
                    f'No existe cuenta {email}; el curso se crea sin instructor.'))
            return user
        return User.objects.filter(is_staff=True).first() or User.objects.filter(role='admin').first()
