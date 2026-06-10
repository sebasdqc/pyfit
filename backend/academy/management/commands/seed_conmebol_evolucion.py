"""Siembra los cursos de la formación de entrenadores **CONMEBOL Evolución**.

Crea en Zyfit Academy la adaptación al sistema de Licencias CONMEBOL descrito en
`formacion-conmebol.md`: un curso insignia de **Licencia C de Fútbol** (los cinco
ejes de la formación: sistema de licencias, pedagogía, modelo de juego,
preparación física y ética/reglamento) y un curso de **Licencia C de Futsal**
(lógica interna, los seis momentos del juego y los principios tácticos).

Cada curso lleva los ejes CONMEBOL (disciplina, licencia, modalidad, carga
horaria) y termina con quizzes calificados en el servidor, construidos sobre el
banco de preguntas "plausibles y coherentes" del documento (no son el examen
oficial). El contenido es educativo y referencial: la marca y el examen oficial
pertenecen a la CONMEBOL.

    python manage.py seed_conmebol_evolucion [--instructor-email correo@dominio]

Idempotente por slug: cada curso se omite si ya existe (no duplica). NO se ejecuta
en el arranque (no está en entrypoint.sh): es una herramienta de siembra manual.
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from academy.models import Course, Module, Lesson, Quiz, Question

User = get_user_model()


# ── Banco de cursos (estructura declarativa que el builder materializa) ─────────
#
# Cada curso: campos de Course + 'modulos' → cada módulo con 'lecciones' →
# cada lección de tipo 'texto' (contenido) o 'quiz' (con 'quiz': {...}).
# En un quiz, cada pregunta declara opciones [{id,texto}] y `correctas` (ids).

VF = [{'id': 'v', 'texto': 'Verdadero'}, {'id': 'f', 'texto': 'Falso'}]

CURSOS = [
    # ───────────────────────────── FÚTBOL · Licencia C ────────────────────────
    {
        'slug': 'conmebol-evolucion-licencia-c-futbol',
        'titulo': 'CONMEBOL Evolución — Licencia C: Fundamentos del Entrenador',
        'resumen': 'La puerta de entrada al sistema de Licencias CONMEBOL: '
                   'pedagogía, modelo de juego, preparación física y ética del entrenador.',
        'descripcion': (
            'Curso introductorio del itinerario de Licencias CONMEBOL (C → B → A → PRO), '
            'orientado al fútbol base e infantil. Recorre los cinco ejes de la formación del '
            'entrenador según el programa CONMEBOL Evolución: el sistema de licencias y su marco '
            'normativo, la metodología y pedagogía del entrenador adulto (andragogía y "ADN '
            'sudamericano"), el modelo de juego y los principios tácticos, la preparación física '
            'y la salud, y la ética, la integridad y el reglamento.\n\n'
            'Contenido educativo y referencial, alineado con los manuales orientadores de CONMEBOL '
            'Evolución. No reemplaza la certificación oficial, que otorgan las Asociaciones Miembro.'
        ),
        'categoria': 'formación de entrenadores',
        'nivel': 'principiante',
        'disciplina': 'futbol',
        'licencia': 'C',
        'modalidad': 'semipresencial',
        'carga_horaria_h': 140,
        'acredita_renovacion': True,
        'modulos': [
            {
                'titulo': 'El sistema de Licencias CONMEBOL',
                'descripcion': 'Qué es CONMEBOL Evolución, cómo se estructura el itinerario de '
                               'licencias y quién lo dicta, valida y renueva.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'CONMEBOL Evolución: el ecosistema de formación',
                        'contenido': (
                            'La CONMEBOL concentra su oferta formativa bajo el programa **CONMEBOL '
                            'Evolución**, gestionado por la Dirección de Desarrollo, bajo el pilar '
                            '"Cree en Grande / Believe Big". No existe un único curso, sino un '
                            'ecosistema con dos grandes vías:\n\n'
                            '1. **El sistema de Licencias CONMEBOL** — la certificación profesional '
                            'formal del entrenador, regida por la *Convención de Licencias de '
                            'Entrenadores y Entrenadoras de la CONMEBOL 2026*.\n'
                            '2. **Evolución Educación** (evolucion.conmebol.com) — plataforma '
                            'digital de cursos cortos certificados directamente por la CONMEBOL, '
                            '100% online y asincrónica.\n\n'
                            'Además, se organizan cursos-taller temáticos presenciales con cada '
                            'Asociación Miembro (Futsal, Fútbol Femenino, Arqueros, etc.) que sirven '
                            'de actualización, aunque no otorgan licencia.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'La escalera de licencias: C → B → A → PRO',
                        'contenido': (
                            'El itinerario es escalonado y obligatorio en orden:\n\n'
                            '- **Licencia C** — entrada al sistema; orientada al fútbol base/infantil '
                            '(~6 a 12 años).\n'
                            '- **Licencia B** — fútbol formativo (categorías hasta sub-14/15).\n'
                            '- **Licencia A** — fútbol juvenil de élite/alto rendimiento (sub-16 a '
                            'sub-20) y categorías inferiores profesionales.\n'
                            '- **Licencia PRO** — máximo nivel; habilita a dirigir como técnico '
                            'principal en Primera y Segunda División y selecciones, y es la exigida '
                            'por el Reglamento de Licencia de Clubes para torneos CONMEBOL '
                            '(Libertadores, Sudamericana).\n\n'
                            'Cada salto exige temporadas de experiencia documentada como técnico '
                            'principal o ayudante.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Quién dicta, valida y renueva tu licencia',
                        'contenido': (
                            'La CONMEBOL **no dicta directamente** los cursos de licencia: los '
                            'imparten las **Asociaciones Miembro (AM)** que firman la Convención '
                            '(AFA, CBF, AUF, FCF, FPF, ANFP, APF, FVF, FBF, FEF) a través de sus '
                            'institutos y universidades aliadas. La supervisión académica recae en '
                            'la **Comisión Técnica Docente (CTD)** de la CONMEBOL.\n\n'
                            '**Validez y formación continua (Art. 38):** una licencia es válida por '
                            '**3 años calendario**, hasta el 31 de diciembre del tercer año posterior '
                            'a su primera emisión. Para renovarla se exige formación continua: un '
                            'mínimo de **20 horas** de actualización durante los últimos 3 años.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Sistema de licencias',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿En qué orden se cursan los niveles de licencia de '
                                                 'entrenador de la CONMEBOL?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'PRO → A → B → C'},
                                        {'id': 'b', 'texto': 'C → B → A → PRO'},
                                        {'id': 'c', 'texto': 'A → B → C → PRO'},
                                        {'id': 'd', 'texto': 'C → A → B → PRO'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Cuál es el período de validez de una licencia CONMEBOL?',
                                    'opciones': [
                                        {'id': 'a', 'texto': '1 año'},
                                        {'id': 'b', 'texto': '2 años'},
                                        {'id': 'c', 'texto': '3 años calendario'},
                                        {'id': 'd', 'texto': 'Es indefinida'},
                                    ],
                                    'correctas': ['c'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué órgano supervisa la aplicación de la Convención '
                                                 'de Licencias?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'La FIFA'},
                                        {'id': 'b', 'texto': 'La Comisión Técnica Docente (CTD)'},
                                        {'id': 'c', 'texto': 'La Dirección de Marketing'},
                                        {'id': 'd', 'texto': 'El club de cada entrenador'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Cuántas horas mínimas de actualización se exigen en '
                                                 '3 años para renovar la licencia?',
                                    'opciones': [
                                        {'id': 'a', 'texto': '10 horas'},
                                        {'id': 'b', 'texto': '20 horas'},
                                        {'id': 'c', 'texto': '40 horas'},
                                        {'id': 'd', 'texto': '60 horas'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'verdadero_falso',
                                    'enunciado': 'La CONMEBOL dicta directamente los cursos de licencia.',
                                    'opciones': VF,
                                    'correctas': ['f'],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                'titulo': 'Metodología y pedagogía del entrenador',
                'descripcion': 'Cómo se forma a un adulto que ya vive el fútbol: andragogía, '
                               'aprendizaje basado en situaciones reales y el ADN sudamericano.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Andragogía: enseñar a adultos que ya juegan',
                        'contenido': (
                            'La formación CONMEBOL se apoya en la **andragogía** (educación de '
                            'adultos): el alumno-entrenador trae experiencia previa y aprende mejor '
                            'cuando el contenido es práctico, relevante y aplicable de inmediato a su '
                            'realidad. La metodología está **centrada en el alumno**, no en el '
                            'docente, y privilegia la reflexión sobre la transmisión pasiva.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Situaciones reales y el círculo de aprendizaje',
                        'contenido': (
                            'El **aprendizaje basado en situaciones reales del juego** propone partir '
                            'de problemas concretos de la cancha y no de la teoría aislada. Se '
                            'estructura en un **círculo de aprendizaje**:\n\n'
                            '**actividad → reflexión → construcción teórica → planeamiento → '
                            'actividad**.\n\n'
                            'El entrenador hace, reflexiona sobre lo que pasó, construye la teoría '
                            'que lo explica, planifica la mejora y vuelve a la actividad. El '
                            'aprendizaje es cíclico y continuo.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'El ADN sudamericano',
                        'contenido': (
                            'El **"ADN sudamericano"** es el núcleo conceptual de la formación: '
                            'preservar la **identidad técnica y creativa** de la región —la gambeta, '
                            'la improvisación, el talento individual— y combinarla con el '
                            '**conocimiento científico moderno** (preparación física, análisis de '
                            'datos, periodización). No se trata de copiar el modelo europeo, sino de '
                            'potenciar lo propio con herramientas actuales.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Metodología y pedagogía',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué principio pedagógico orienta la formación de '
                                                 'entrenadores adultos en la Convención?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'La pedagogía infantil'},
                                        {'id': 'b', 'texto': 'La andragogía (educación de adultos)'},
                                        {'id': 'c', 'texto': 'La instrucción militar'},
                                        {'id': 'd', 'texto': 'El aprendizaje por castigo'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': 'El "aprendizaje basado en situaciones reales del '
                                                 'juego" propone que el entrenador aprenda principalmente…',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'memorizando teoría aislada'},
                                        {'id': 'b', 'texto': 'a partir de situaciones reales y '
                                                             'contextualizadas del juego'},
                                        {'id': 'c', 'texto': 'sin practicar nunca en cancha'},
                                        {'id': 'd', 'texto': 'copiando exactamente a otro técnico'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué describe el "ADN sudamericano" aplicado a la '
                                                 'formación?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'copiar íntegramente el modelo europeo'},
                                        {'id': 'b', 'texto': 'preservar la identidad técnica/creativa '
                                                             'regional combinada con el conocimiento '
                                                             'científico moderno'},
                                        {'id': 'c', 'texto': 'priorizar solo la fuerza física'},
                                        {'id': 'd', 'texto': 'eliminar la gambeta del juego'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Cuál de estas secuencias representa el "círculo de '
                                                 'aprendizaje"?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'teoría → examen → olvido'},
                                        {'id': 'b', 'texto': 'actividad → reflexión → construcción '
                                                             'teórica → planeamiento → actividad'},
                                        {'id': 'c', 'texto': 'castigo → repetición → premio'},
                                        {'id': 'd', 'texto': 'solo práctica, sin reflexión'},
                                    ],
                                    'correctas': ['b'],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                'titulo': 'Modelo de juego y táctica',
                'descripcion': 'Las fases del juego, los principios tácticos y cómo se construye un '
                               'modelo de juego propio.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Fases del juego y transiciones',
                        'contenido': (
                            'El juego se organiza en cuatro **momentos** que se suceden de forma '
                            'continua:\n\n'
                            '1. **Organización ofensiva** — con balón, construir y atacar.\n'
                            '2. **Transición ataque-defensa** — al perder el balón.\n'
                            '3. **Organización defensiva** — sin balón, defender de forma ordenada.\n'
                            '4. **Transición defensa-ataque** — al recuperar el balón.\n\n'
                            'A ellos se suman las **acciones a balón parado** (ofensivas y '
                            'defensivas). En cada momento el entrenador define qué priorizar.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Principios tácticos ofensivos y defensivos',
                        'contenido': (
                            '**Principios ofensivos:** penetración, cobertura ofensiva, movilidad, '
                            'espacio y unidad ofensiva.\n\n'
                            '**Principios defensivos:** contención, cobertura defensiva, equilibrio, '
                            'concentración y unidad defensiva.\n\n'
                            'Cada principio se traduce en comportamientos concretos del jugador. Por '
                            'ejemplo, "espacio" en ataque implica abrir la cancha para generar líneas '
                            'de pase; "contención" en defensa implica frenar el avance del rival sin '
                            'comprometerse.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Construir un modelo de juego',
                        'contenido': (
                            'El **modelo de juego** es la forma de jugar que el entrenador busca: el '
                            'conjunto de ideas y principios que guían a su equipo en cada fase del '
                            'juego. No es una alineación fija ni el resultado del último partido: es '
                            'la **idea de juego** llevada a comportamientos entrenables. Se construye '
                            'a partir de la identidad del club, las características de los jugadores y '
                            'las convicciones del entrenador, y se enseña con tareas que reproducen '
                            'esas situaciones.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Modelo de juego y táctica',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_multiple',
                                    'enunciado': '¿Cuáles de los siguientes son principios tácticos '
                                                 'OFENSIVOS? (marca todas las correctas)',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Penetración'},
                                        {'id': 'b', 'texto': 'Movilidad'},
                                        {'id': 'c', 'texto': 'Espacio'},
                                        {'id': 'd', 'texto': 'Contención'},
                                        {'id': 'e', 'texto': 'Equilibrio'},
                                    ],
                                    'correctas': ['a', 'b', 'c'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': 'Un "modelo de juego" se define mejor como…',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'una alineación fija de 11 jugadores'},
                                        {'id': 'b', 'texto': 'la forma de jugar que el entrenador '
                                                             'busca, con principios e ideas en cada '
                                                             'fase del juego'},
                                        {'id': 'c', 'texto': 'el resultado del último partido'},
                                        {'id': 'd', 'texto': 'la lista de jugadores convocados'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Cuáles son los cuatro momentos clásicos del juego?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'calentamiento, partido, descanso, '
                                                             'vuelta a la calma'},
                                        {'id': 'b', 'texto': 'organización ofensiva, transición '
                                                             'ataque-defensa, organización defensiva, '
                                                             'transición defensa-ataque'},
                                        {'id': 'c', 'texto': 'defensa, mediocampo, ataque, banca'},
                                        {'id': 'd', 'texto': 'primer tiempo, entretiempo, segundo '
                                                             'tiempo, prórroga'},
                                    ],
                                    'correctas': ['b'],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                'titulo': 'Preparación física, salud y planificación',
                'descripcion': 'Periodización, tipos de carga y nociones básicas de salud y primeros '
                               'auxilios que todo entrenador debe manejar.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Periodización y tipos de carga',
                        'contenido': (
                            'La **periodización** es la organización planificada de las cargas de '
                            'entrenamiento a lo largo del tiempo para optimizar el rendimiento y '
                            'evitar el sobreentrenamiento. Se planifican distintas capacidades:\n\n'
                            '- **Capacidades condicionales** (físicas): fuerza, resistencia, '
                            'velocidad, flexibilidad.\n'
                            '- **Capacidades coordinativas** (técnicas): equilibrio, ritmo, '
                            'orientación, reacción.\n\n'
                            'El plan distribuye estas cargas en ciclos (macro, meso y micro) según el '
                            'calendario de competición.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Salud y primeros auxilios básicos',
                        'contenido': (
                            'El entrenador debe conocer nociones mínimas de **medicina deportiva y '
                            'primeros auxilios**: reconocer una lesión, aplicar el protocolo básico '
                            'ante un golpe o una caída, saber cuándo detener la actividad y derivar a '
                            'un profesional. En el fútbol formativo, la prioridad es siempre la '
                            'seguridad y el bienestar del jugador por encima del resultado.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Preparación física y salud',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué es la periodización del entrenamiento?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'jugar siempre con la misma intensidad'},
                                        {'id': 'b', 'texto': 'la organización planificada de las '
                                                             'cargas a lo largo del tiempo para '
                                                             'optimizar el rendimiento'},
                                        {'id': 'c', 'texto': 'entrenar solo el día antes del partido'},
                                        {'id': 'd', 'texto': 'descansar durante toda la pretemporada'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_multiple',
                                    'enunciado': '¿Qué tipos de capacidades/carga se planifican en el '
                                                 'entrenamiento? (marca las correctas)',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Condicionales (físicas)'},
                                        {'id': 'b', 'texto': 'Coordinativas (técnicas)'},
                                        {'id': 'c', 'texto': 'Comerciales'},
                                        {'id': 'd', 'texto': 'Decorativas'},
                                    ],
                                    'correctas': ['a', 'b'],
                                },
                                {
                                    'tipo': 'verdadero_falso',
                                    'enunciado': 'En el fútbol formativo, la seguridad y el bienestar '
                                                 'del jugador están por encima del resultado.',
                                    'opciones': VF,
                                    'correctas': ['v'],
                                },
                            ],
                        },
                    },
                ],
            },
            {
                'titulo': 'Ética, integridad y reglamento',
                'descripcion': 'Salvaguarda de menores, integridad del juego y el marco reglamentario '
                               'que rige la actividad del entrenador.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Salvaguarda y protección de menores',
                        'contenido': (
                            'La **salvaguarda** es la protección de la integridad y el bienestar de '
                            'los menores y de las personas en situación de vulnerabilidad en el '
                            'entorno del fútbol. Implica prevenir el abuso, el maltrato y el acoso, '
                            'crear ambientes seguros y saber actuar y reportar ante una sospecha. Es '
                            'una responsabilidad central del entrenador de fútbol formativo.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Integridad: violencia, dopaje y discriminación',
                        'contenido': (
                            'La CONMEBOL promueve la **ética, los valores y la integridad** del juego '
                            'y busca prevenir conductas antideportivas como la **violencia**, el '
                            '**dopaje** y el **racismo, la xenofobia y toda forma de discriminación**. '
                            'El entrenador es un referente de conducta: su ejemplo educa tanto como '
                            'su trabajo táctico.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Reglamento y la exigencia de Licencia PRO',
                        'contenido': (
                            'El entrenador debe dominar el **reglamento de juego** y el marco '
                            'normativo de la competición. En el plano profesional, el **Reglamento de '
                            'Licencia de Clubes** exige la **Licencia PRO** para el primer entrenador '
                            'de un equipo que dispute torneos internacionales CONMEBOL (Copa '
                            'Libertadores, Copa Sudamericana). Es el techo del itinerario C → B → A → '
                            'PRO.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Ética, integridad y reglamento',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué es la "salvaguarda" en el fútbol formativo?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'guardar bajo llave el material deportivo'},
                                        {'id': 'b', 'texto': 'la protección de la integridad y el '
                                                             'bienestar de los menores y personas '
                                                             'vulnerables'},
                                        {'id': 'c', 'texto': 'un seguro médico para el club'},
                                        {'id': 'd', 'texto': 'un fondo de ahorro del entrenador'},
                                    ],
                                    'correctas': ['b'],
                                },
                                {
                                    'tipo': 'opcion_multiple',
                                    'enunciado': '¿Qué conductas antideportivas busca prevenir la '
                                                 'CONMEBOL? (marca todas las correctas)',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Violencia'},
                                        {'id': 'b', 'texto': 'Dopaje'},
                                        {'id': 'c', 'texto': 'Racismo y discriminación'},
                                        {'id': 'd', 'texto': 'Aplaudir al equipo rival'},
                                    ],
                                    'correctas': ['a', 'b', 'c'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué licencia exige el Reglamento de Licencia de '
                                                 'Clubes para el primer entrenador de un equipo en '
                                                 'torneos internacionales CONMEBOL?',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Licencia C'},
                                        {'id': 'b', 'texto': 'Licencia B'},
                                        {'id': 'c', 'texto': 'Licencia A'},
                                        {'id': 'd', 'texto': 'Licencia PRO'},
                                    ],
                                    'correctas': ['d'],
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    },
    # ───────────────────────────── FUTSAL · Licencia C ────────────────────────
    {
        'slug': 'conmebol-evolucion-licencia-c-futsal',
        'titulo': 'CONMEBOL Evolución — Futsal: Lógica del Juego y Modelo (Licencia C)',
        'resumen': 'La lógica interna del futsal, los seis momentos del juego y los principios '
                   'tácticos del Manual Evolución de Futsal.',
        'descripcion': (
            'La Convención 2026 amplió las Licencias de Futsal a los cuatro niveles (C, B, A, PRO). '
            'Este curso de entrada recorre el Manual Evolución de Futsal: la lógica interna del '
            'juego, los seis momentos del partido, los principios tácticos ofensivos y defensivos, '
            'el rol del pívot y el currículo de formación del jugador juvenil.\n\n'
            'Contenido educativo y referencial, alineado con los manuales orientadores de CONMEBOL '
            'Evolución.'
        ),
        'categoria': 'formación de entrenadores',
        'nivel': 'principiante',
        'disciplina': 'futsal',
        'licencia': 'C',
        'modalidad': 'virtual',
        'carga_horaria_h': 120,
        'acredita_renovacion': True,
        'modulos': [
            {
                'titulo': 'La lógica interna del futsal',
                'descripcion': 'Qué hace único al futsal y por qué exige decisiones más rápidas.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Qué hace único al futsal',
                        'contenido': (
                            'La **lógica interna del futsal** parte de su contexto: **espacio '
                            'escaso**, **marcación intensa**, dinamismo, imprevisibilidad y '
                            'autoorganización. El jugador debe apelar constantemente a la '
                            '**inteligencia de juego**, la técnica depurada y la lectura del rival.\n\n'
                            'Como el espacio es reducido y la presión es alta, **la toma de '
                            'decisiones debe ser más rápida** que en el fútbol de campo: hay menos '
                            'tiempo y menos margen de error para resolver cada situación.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Etapas de formación del jugador',
                        'contenido': (
                            'El currículo de formación del jugador de futsal distingue dos etapas:\n\n'
                            '- **Iniciación:** 6 a 13 años.\n'
                            '- **Especialización:** 14 a 20 años.\n\n'
                            'Cada etapa tiene objetivos técnicos, tácticos y físicos propios, '
                            'respetando el desarrollo madurativo del jugador.'
                        ),
                    },
                ],
            },
            {
                'titulo': 'Los seis momentos y los principios tácticos',
                'descripcion': 'La estructura del juego de futsal y los principios que lo ordenan.',
                'lecciones': [
                    {
                        'tipo': 'texto',
                        'titulo': 'Los seis momentos del juego',
                        'contenido': (
                            'El juego de futsal se estructura en **seis momentos**:\n\n'
                            '1. Organización ofensiva.\n'
                            '2. Transición ataque-defensa.\n'
                            '3. Organización defensiva.\n'
                            '4. Transición defensa-ataque.\n'
                            '5. Balón parado (ofensivo y defensivo).\n'
                            '6. Juego de línea del arquero.\n\n'
                            'El modelo de juego se construye definiendo qué se busca en cada uno de '
                            'estos momentos.'
                        ),
                    },
                    {
                        'tipo': 'texto',
                        'titulo': 'Principios tácticos y el rol del pívot',
                        'contenido': (
                            '**Principios tácticos ofensivos:** penetración, cobertura ofensiva, '
                            'movilidad, espacio y unidad ofensiva.\n'
                            '**Principios tácticos defensivos:** contención, cobertura defensiva, '
                            'equilibrio, concentración y unidad defensiva.\n\n'
                            'El **pívot** es el jugador de referencia ofensiva que actúa de espaldas '
                            'al arco: **fija** al defensor, **protege el balón** ("pelota de tiempo '
                            'al pívot") y **abre espacios** para que el equipo juegue en profundidad.'
                        ),
                    },
                    {
                        'tipo': 'quiz',
                        'titulo': 'Evaluación · Futsal',
                        'quiz': {
                            'puntaje_aprobacion': 70,
                            'preguntas': [
                                {
                                    'tipo': 'opcion_multiple',
                                    'enunciado': '¿Cuáles son momentos del juego de futsal? (marca '
                                                 'todos los correctos)',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Organización ofensiva'},
                                        {'id': 'b', 'texto': 'Transición ataque-defensa'},
                                        {'id': 'c', 'texto': 'Organización defensiva'},
                                        {'id': 'd', 'texto': 'Transición defensa-ataque'},
                                        {'id': 'e', 'texto': 'Balón parado'},
                                        {'id': 'f', 'texto': 'Juego de línea del arquero'},
                                        {'id': 'g', 'texto': 'El sorteo inicial'},
                                    ],
                                    'correctas': ['a', 'b', 'c', 'd', 'e', 'f'],
                                },
                                {
                                    'tipo': 'opcion_multiple',
                                    'enunciado': 'Según el Manual CONMEBOL, ¿cuáles son principios '
                                                 'tácticos OFENSIVOS del futsal? (marca todos)',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'Penetración'},
                                        {'id': 'b', 'texto': 'Cobertura ofensiva'},
                                        {'id': 'c', 'texto': 'Movilidad'},
                                        {'id': 'd', 'texto': 'Espacio'},
                                        {'id': 'e', 'texto': 'Unidad ofensiva'},
                                        {'id': 'f', 'texto': 'Contención'},
                                    ],
                                    'correctas': ['a', 'b', 'c', 'd', 'e'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': '¿Qué rango de edad corresponde a la etapa de '
                                                 'iniciación en futsal?',
                                    'opciones': [
                                        {'id': 'a', 'texto': '6 a 13 años'},
                                        {'id': 'b', 'texto': '14 a 20 años'},
                                        {'id': 'c', 'texto': '18 a 23 años'},
                                        {'id': 'd', 'texto': '4 a 6 años'},
                                    ],
                                    'correctas': ['a'],
                                },
                                {
                                    'tipo': 'opcion_unica',
                                    'enunciado': 'El pívot en futsal es…',
                                    'opciones': [
                                        {'id': 'a', 'texto': 'el arquero'},
                                        {'id': 'b', 'texto': 'el jugador de referencia ofensiva, de '
                                                             'espaldas al arco, que fija al defensor y '
                                                             'genera espacio'},
                                        {'id': 'c', 'texto': 'el árbitro auxiliar'},
                                        {'id': 'd', 'texto': 'el preparador físico'},
                                    ],
                                    'correctas': ['b'],
                                },
                            ],
                        },
                    },
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Siembra los cursos de la formación CONMEBOL Evolución (idempotente) en Zyfit Academy.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--instructor-email', default=None,
            help='Email de la cuenta instructor/admin que figura como autor. '
                 'Por defecto el primer admin/staff que exista.',
        )

    def handle(self, *args, **opts):
        instructor = self._resolve_instructor(opts.get('instructor_email'))

        creados = 0
        for data in CURSOS:
            if Course.objects.filter(slug=data['slug']).exists():
                self.stdout.write(self.style.WARNING(
                    f'• "{data["slug"]}" ya existe — se omite.'))
                continue
            self._create_course(data, instructor)
            creados += 1

        autor = instructor.email if instructor else 'sin instructor'
        self.stdout.write(self.style.SUCCESS(
            f'Listo: {creados} curso(s) CONMEBOL Evolución creado(s) (autor={autor}).'
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
        for m_idx, m in enumerate(data['modulos'], start=1):
            module = Module.objects.create(
                course=course, orden=m_idx, titulo=m['titulo'],
                descripcion=m.get('descripcion', ''),
            )
            for l_idx, lec in enumerate(m['lecciones'], start=1):
                lesson = Lesson.objects.create(
                    module=module, orden=l_idx, titulo=lec['titulo'],
                    tipo=lec['tipo'], contenido=lec.get('contenido', ''),
                )
                if lec['tipo'] == 'quiz':
                    self._create_quiz(lesson, lec['quiz'])

        self.stdout.write(self.style.SUCCESS(
            f'✓ "{course.titulo}" (slug={course.slug}, {course.modulos.count()} módulos).'))

    def _create_quiz(self, lesson, qdata):
        quiz = Quiz.objects.create(
            lesson=lesson, titulo=lesson.titulo,
            puntaje_aprobacion=qdata.get('puntaje_aprobacion', 70),
        )
        for q_idx, q in enumerate(qdata['preguntas'], start=1):
            Question.objects.create(
                quiz=quiz, orden=q_idx, tipo=q['tipo'], enunciado=q['enunciado'],
                opciones=q['opciones'], respuestas_correctas=q['correctas'],
                puntos=q.get('puntos', 1),
            )

    def _resolve_instructor(self, email):
        if email:
            user = User.objects.filter(email__iexact=email).first()
            if not user:
                self.stdout.write(self.style.WARNING(
                    f'No existe cuenta {email}; los cursos se crean sin instructor.'))
            return user
        return User.objects.filter(is_staff=True).first() or User.objects.filter(role='admin').first()
