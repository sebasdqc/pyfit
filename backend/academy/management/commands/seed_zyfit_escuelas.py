"""Seed de las 7 Escuelas de Zyfit Academy (catálogo definitivo por ahora).

Jerarquía: Escuela → Curso → Módulo (sin contenido de lección — solo estructura
para los cursos nuevos que se definan aquí; los cursos ya existentes con
lecciones reales no se tocan salvo su asignación de escuela/metadatos).

Idempotente: re-ejecutar el comando sincroniza descripciones y módulos sin
duplicar registros. No toca lecciones, quizzes ni matrículas existentes.

Nota: en un entorno ya seedeado con el catálogo de 9 escuelas anterior, la
migración de datos `0016_reestructura_7_escuelas` es la que hace el
renombre/reubicación/fusión real la primera vez. Este comando sirve para
entornos nuevos (bootstrap) y para resincronizar descripciones/orden más
adelante.

Uso:
    python manage.py seed_zyfit_escuelas
    python manage.py seed_zyfit_escuelas --publicar  # publica los cursos con módulos definidos aquí
"""

from django.core.management.base import BaseCommand

from academy.models import Course, Module, School, NIVEL_PRINCIPIANTE, NIVEL_INTERMEDIO, NIVEL_AVANZADO

ESCUELAS = [
    {
        'nombre': 'Ciencia del Entrenamiento',
        'slug': 'ciencia-del-entrenamiento',
        'descripcion': (
            'Bases científicas de la programación del entrenamiento: '
            'periodización, gestión de la carga y manejo de la fatiga a lo '
            'largo del ciclo de entrenamiento.'
        ),
        'orden': 1,
        'cursos': [
            {
                'titulo': 'Fundamentos de Periodización',
                'slug': 'fundamentos-de-periodizacion',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'entrenamiento',
                'resumen': 'Modelos lineal, ondulado y polarizado; diseña tu primer macrociclo.',
                'descripcion': (
                    'Modelos lineal, ondulado y polarizado; cómo estructurar un macrociclo '
                    'de entrenamiento desde cero.'
                ),
                'modulos': [
                    'Introducción a la periodización deportiva',
                    'Modelo de periodización lineal',
                    'Modelo de periodización ondulada',
                    'Modelo de periodización polarizada',
                    'Diseño de un macrociclo completo',
                ],
            },
            {
                'titulo': 'Gestión de la Carga de Entrenamiento',
                'slug': 'gestion-de-la-carga-de-entrenamiento',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'entrenamiento',
                'resumen': 'El marco MEV/MAV/MRV aplicado a la progresión real de volumen e intensidad.',
                'descripcion': (
                    'El marco MEV/MAV/MRV aplicado a la progresión real de volumen e intensidad.'
                ),
                'modulos': [
                    'Fundamentos de volumen e intensidad',
                    'El marco MEV/MAV/MRV',
                    'Progresión de carga semana a semana',
                    'Señales para escalar o retroceder carga',
                    'Casos prácticos de ajuste de carga',
                ],
            },
            {
                'titulo': 'Deload y Gestión de la Fatiga',
                'slug': 'deload-y-gestion-de-la-fatiga',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'entrenamiento',
                'resumen': 'Cuándo y cómo programar descarga; detecta el sobreentrenamiento a tiempo.',
                'descripcion': (
                    'Cuándo y cómo programar descarga, y cómo identificar señales de '
                    'sobreentrenamiento a tiempo.'
                ),
                'modulos': [
                    'Qué es la fatiga acumulada y por qué importa',
                    'Señales de sobreentrenamiento',
                    'Cuándo programar una descarga',
                    'Diseño de una semana de deload',
                    'Protocolos de recuperación entre ciclos',
                ],
            },
            {
                'titulo': 'Entrenamiento Concurrente: Fuerza y Resistencia sin Interferencia',
                'slug': 'entrenamiento-concurrente-fuerza-resistencia',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'entrenamiento',
                'resumen': 'De dónde viene el "efecto interferencia" y qué variables sí ayudan a minimizarlo.',
                'descripcion': (
                    'Por qué el hallazgo original de 1980 fue confirmado en 2012 y luego matizado '
                    'por una revisión más reciente y rigurosa, y qué variables de modalidad, '
                    'secuencia y tiempo entre sesiones tienen respaldo real en la práctica.'
                ),
                'modulos': [
                    'El "efecto interferencia": de dónde viene y por qué tendría sentido fisiológico',
                    'La controversia actualizada: cuando un meta-análisis más reciente contradice al anterior',
                    'Qué hacer en la práctica: modalidad, secuencia y tiempo entre sesiones',
                    'Capstone: diseña el bloque de entrenamiento concurrente de un atleta',
                ],
            },
        ],
    },
    {
        'nombre': 'Analítica y Rendimiento Deportivo',
        'slug': 'analitica-y-rendimiento-deportivo',
        'descripcion': (
            'Cuantificación de la carga interna y externa, herramientas de '
            'monitoreo como el ACWR e individualización del rendimiento '
            'basada en datos con el Zyfit Score.'
        ),
        'orden': 2,
        'cursos': [
            {
                'titulo': 'Carga Interna 101: sRPE y TRIMP',
                'slug': 'carga-interna-101-srpe-y-trimp',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'analítica',
                'resumen': 'Cuantifica el esfuerzo percibido y tradúcelo en decisiones de entrenamiento.',
                'descripcion': (
                    'Cómo cuantificar el esfuerzo percibido y traducirlo en decisiones '
                    'de entrenamiento.'
                ),
                'modulos': [
                    'Qué es la carga interna y por qué medirla',
                    'El método sRPE paso a paso',
                    'Cálculo e interpretación del TRIMP',
                    'De la percepción del esfuerzo a la decisión de entrenamiento',
                    'Errores comunes al medir carga interna',
                ],
            },
            {
                'titulo': 'ACWR y Prevención de Picos de Carga',
                'slug': 'acwr-y-prevencion-de-picos-de-carga',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'analítica',
                'resumen': 'El tema más disputado del catálogo: de dónde viene el ACWR y por qué se cuestiona.',
                'descripcion': (
                    'Por qué una parte seria de la comunidad científica pide descartar el ACWR '
                    'como predictor de lesión, y qué hacer en la práctica con datos de carga sin '
                    'apoyarse en un ratio con problemas estadísticos documentados.'
                ),
                'modulos': [
                    'Qué es el ACWR y de dónde viene',
                    'La controversia real: por qué se cuestiona seriamente el ACWR',
                    'Qué hacer en la práctica, dado el estado real del debate',
                    'Capstone: interpreta el caso de un jugador con "ACWR en zona roja"',
                ],
            },
            {
                'titulo': 'De los Datos a la Decisión: Individualización con Zyfit Score',
                'slug': 'de-los-datos-a-la-decision-zyfit-score',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'analítica',
                'resumen': 'Qué mide con evidencia real cada pilar del Zyfit Score, y qué parte es diseño de producto.',
                'descripcion': (
                    'Los tres pilares del Zyfit Score (consistencia, adaptabilidad, progresión) '
                    'con su respaldo científico individual, por qué la ponderación 40/35/25 es una '
                    'decisión de diseño y no un hallazgo de laboratorio, y cómo usar la puntuación '
                    'para decidir sin tratarla como un oráculo.'
                ),
                'modulos': [
                    'Los tres pilares: qué dice la ciencia de cada uno por separado',
                    'La ponderación 40/35/25: diseño de producto, no hallazgo científico',
                    'De la puntuación a la decisión: usar el score sin tratarlo como oráculo',
                    'Capstone: explica el Zyfit Score a un cliente escéptico',
                ],
            },
            {
                'titulo': 'Métricas Externas de Carga: GPS y Análisis de Movimiento',
                'slug': 'metricas-externas-carga-gps',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'analítica',
                'resumen': 'Qué métricas de GPS son fiables, cuáles no tanto, y por qué el umbral de velocidad importa.',
                'descripcion': (
                    'Carga externa vía GPS: qué tan precisas son la distancia total, la velocidad '
                    'pico y la carrera de alta intensidad, y por qué elegir un umbral absoluto o '
                    'individualizado puede cambiar por completo una conclusión sobre demandas de posición.'
                ),
                'modulos': [
                    'Qué mide bien el GPS y qué mide mal',
                    'Umbrales absolutos vs. individualizados: un debate real y no resuelto',
                    'Qué hacer en la práctica: confiar en la métrica correcta para la pregunta correcta',
                    'Capstone: interpreta el panel de GPS de un equipo',
                ],
            },
        ],
    },
    {
        'nombre': 'Recuperación, Prevención y Wellness',
        'slug': 'recuperacion-prevencion-y-wellness',
        'descripcion': (
            'Monitoreo de HRV y sueño, prevención de lesiones basada en '
            'datos, y carga psicológica y wellness del atleta para sostener '
            'el rendimiento en el tiempo.'
        ),
        'orden': 3,
        'cursos': [
            {
                'titulo': 'Fundamentos de Recuperación y Monitoreo de HRV',
                'slug': 'fundamentos-de-recuperacion-y-hrv',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'recuperación',
                'resumen': 'Qué es el HRV y cómo leerlo día a día para tomar mejores decisiones.',
                'descripcion': (
                    'Qué es la variabilidad de la frecuencia cardíaca y cómo leerla día '
                    'a día para tomar decisiones.'
                ),
                'modulos': [
                    'Qué es la variabilidad de la frecuencia cardíaca (HRV)',
                    'Cómo se mide el HRV día a día',
                    'Interpretar tendencias de HRV',
                    'HRV y decisiones de entrenamiento diario',
                    'Errores comunes al monitorear HRV',
                ],
            },
            {
                'titulo': 'Prevención de Lesiones Basada en Datos',
                'slug': 'prevencion-de-lesiones-basada-en-datos',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'prevención',
                'resumen': 'Factores de riesgo, señales tempranas y trabajo preventivo basado en datos.',
                'descripcion': (
                    'Factores de riesgo, señales tempranas y diseño de trabajo preventivo '
                    'basado en datos.'
                ),
                'modulos': [
                    'Factores de riesgo de lesión en el deporte',
                    'Señales tempranas de alerta',
                    'Diseño de trabajo preventivo',
                    'Integración de carga y prevención',
                    'Casos prácticos de prevención basada en datos',
                ],
            },
            {
                'titulo': 'Carga Psicológica y Wellness del Atleta',
                'slug': 'carga-psicologica-y-wellness-del-atleta',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'wellness',
                'resumen': 'El estrés como factor de riesgo de lesión documentado, y qué tan bien predicen los cuestionarios.',
                'descripcion': (
                    'El modelo de estrés y lesión, la evidencia real detrás de los cuestionarios '
                    'de bienestar más usados en la práctica, y cómo usarlos como facilitadores de '
                    'conversación en vez de oráculos de decisión.'
                ),
                'modulos': [
                    'El modelo de estrés y lesión: la conexión real entre lo psicológico y lo físico',
                    'Cuestionarios de bienestar: qué tan sólida es la herramienta más usada',
                    'De la puntuación a la conversación: usar los datos de wellness sin sobre-interpretar',
                    'Capstone: interpreta el caso de la jugadora en periodo de estrés',
                ],
            },
            {
                'titulo': 'Sueño y Rendimiento Deportivo',
                'slug': 'sueno-y-rendimiento-deportivo',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'recuperación',
                'resumen': 'Qué tan sólida es realmente la evidencia detrás de "dormir más mejora tu rendimiento".',
                'descripcion': (
                    'La privación de sueño perjudica el rendimiento con evidencia sólida; que '
                    'dormir más de lo habitual lo mejore está mucho menos probado de lo que su '
                    'popularidad sugiere. Incluye cuánto confiar en los dispositivos de seguimiento.'
                ),
                'modulos': [
                    'Privación de sueño y rendimiento: la evidencia más sólida del dominio',
                    'Extensión de sueño: el estudio más citado tiene menos peso del que parece',
                    'Dispositivos de seguimiento de sueño: buenos para una cosa, débiles para otra',
                    'Capstone: aconseja a un atleta sobre su estrategia de sueño',
                ],
            },
        ],
    },
    {
        'nombre': 'Fisiología y Nutrición Aplicada',
        'slug': 'fisiologia-y-nutricion-aplicada',
        'descripcion': (
            'Bases fisiológicas del ejercicio, nutrición aplicada al '
            'rendimiento y estrategias de composición corporal e '
            'hidratación basadas en datos.'
        ),
        'orden': 4,
        'cursos': [
            {
                'titulo': 'Bioenergética Aplicada al Entrenamiento',
                'slug': 'bioenergetica-aplicada-al-entrenamiento',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'fisiología',
                'resumen': 'Identifica qué sistema energético predomina en cada tarea y ajusta la sesión en consecuencia.',
                'descripcion': (
                    'Los tres sistemas energéticos (fosfágeno, glucolítico, oxidativo) como un '
                    'continuo, no compartimentos estancos, y cómo esa predominancia relativa '
                    'debe cambiar el diseño de descansos, series y microciclos.'
                ),
                'modulos': [
                    'Los tres sistemas: qué son y cuándo se activan',
                    'Sistema ATP-PC: potencia y fuerza máxima',
                    'Sistema glucolítico y el lactato como combustible',
                    'Sistema oxidativo: la base que sostiene todo',
                    'Capstone: diseña el microciclo según predominancia energética',
                ],
            },
            {
                'titulo': 'Composición Corporal: Medición y Manipulación Basada en Datos',
                'slug': 'composicion-corporal-medicion-y-manipulacion',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'recomposición',
                'resumen': 'Qué método de medición usar según contexto, y por qué el peso diario engaña.',
                'descripcion': (
                    'Jerarquía real de métodos de medición (DEXA, BIA, skinfolds), el mito de '
                    'bulk o cut, y cómo leer datos de tendencia en vez de reaccionar al peso '
                    'de un solo día.'
                ),
                'modulos': [
                    'Jerarquía de métodos de medición',
                    'El mito de "bulk o cut": recomposición corporal',
                    'Manipulación basada en datos: seguimiento real, no solo la báscula',
                    'Capstone: diseña el protocolo de seguimiento y ajuste',
                ],
            },
            {
                'titulo': 'Nutrición para Rendimiento: Mitos vs. Evidencia',
                'slug': 'nutricion-para-rendimiento-mitos-vs-evidencia',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'nutrición',
                'resumen': 'La ventana anabólica, los carbohidratos y los suplementos: qué separa el mito de la evidencia.',
                'descripcion': (
                    'Por qué la ventana anabólica estricta no tiene el respaldo que se le '
                    'atribuye, el rol del glucógeno en esfuerzos intermitentes, y la jerarquía '
                    'real de evidencia en suplementación.'
                ),
                'modulos': [
                    'El mito de la ventana anabólica',
                    'Carbohidratos: disponibilidad de glucógeno y rendimiento',
                    'Suplementos: jerarquía real de evidencia',
                    'Capstone: diseña el plan nutricional de un caso mixto',
                ],
            },
            {
                'titulo': 'Hidratación y Termorregulación en el Rendimiento',
                'slug': 'hidratacion-y-termorregulacion-en-el-rendimiento',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'fisiología',
                'resumen': 'El umbral del 2% de deshidratación y el riesgo real, a veces mortal, del extremo opuesto.',
                'descripcion': (
                    'Qué tan sólida es la evidencia del umbral de deshidratación, el riesgo '
                    'documentado de hiponatremia por exceso de líquidos, y cuándo planificar la '
                    'hidratación en vez de solo beber según la sed.'
                ),
                'modulos': [
                    'El umbral del 2% de deshidratación: ciencia real con un matiz metodológico importante',
                    'Hiponatremia: el riesgo real del extremo opuesto',
                    'Hidratación planificada vs. beber según la sed: cuándo usar cada enfoque',
                    'Capstone: diseña el plan de hidratación de una corredora de maratón',
                ],
            },
        ],
    },
    {
        'nombre': 'Psicología del Rendimiento',
        'slug': 'psicologia-del-rendimiento',
        'descripcion': (
            'Motivación, activación, rutinas mentales, liderazgo de '
            'equipos y retorno psicológico al deporte aplicados al '
            'rendimiento del atleta.'
        ),
        'orden': 5,
        'cursos': [
            {
                'titulo': 'Fundamentos de Psicología Deportiva',
                'slug': 'fundamentos-de-psicologia-deportiva',
                'nivel': NIVEL_PRINCIPIANTE,
                'categoria': 'psicología',
                'resumen': 'Qué mueve realmente la motivación de un atleta y cómo se relaciona la activación con el rendimiento.',
                'descripcion': (
                    'Teoría de la Autodeterminación, por qué el modelo clásico de la U invertida '
                    'quedó superado, y la distinción entre ansiedad cognitiva y somática.'
                ),
                'modulos': [
                    'Motivación: por qué compite realmente un atleta',
                    'Activación y rendimiento: del mito de la U invertida a modelos más completos',
                    'Ansiedad competitiva: cognitiva vs. somática',
                    'Capstone: diseña el perfil de activación de un atleta',
                ],
            },
            {
                'titulo': 'Construcción Mental de Rutinas de Alto Rendimiento',
                'slug': 'rutinas-mentales-de-alto-rendimiento',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'psicología',
                'resumen': 'Rutinas pre-competitivas, visualización PETTLEP y quiet eye: la versión con evidencia real.',
                'descripcion': (
                    'De la rutina pre-competitiva con respaldo meta-analítico al modelo PETTLEP '
                    'de visualización y el entrenamiento de foco atencional (quiet eye).'
                ),
                'modulos': [
                    'Rutinas pre-competitivas: qué dice la evidencia real',
                    'Visualización: del "imagina tu éxito" genérico al modelo PETTLEP',
                    'Foco atencional: qué hacer con los ojos y la mente bajo presión',
                    'Capstone: diseña la rutina completa de un atleta',
                ],
            },
            {
                'titulo': 'Liderazgo y Dinámica de Grupo en Equipos Deportivos',
                'slug': 'liderazgo-y-dinamica-de-grupo-en-equipos',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'psicología',
                'resumen': 'Cohesión de tarea, pereza social y liderazgo situacional, sin confundir correlación con causalidad.',
                'descripcion': (
                    'Por qué la cohesión de tarea predice rendimiento mejor que la social, el '
                    'efecto Ringelmann, y los límites reales del liderazgo transformacional.'
                ),
                'modulos': [
                    'Cohesión de equipo: el mito de "más unión social = más rendimiento"',
                    'Pereza social: por qué los equipos grandes rinden menos per cápita',
                    'Liderazgo del entrenador: marco y sus límites',
                    'Capstone: diseña la intervención de equipo',
                ],
            },
            {
                'titulo': 'Retorno Psicológico al Deporte tras Lesión',
                'slug': 'retorno-psicologico-al-deporte-tras-lesion',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'psicología',
                'resumen': 'Qué tan bien predice realmente el ACL-RSI, y por qué ninguna prueba aislada basta.',
                'descripcion': (
                    'El ACL-RSI y su evidencia real, la kinesiofobia como riesgo mecánico, y '
                    'por qué combinar criterios físicos y psicológicos es la práctica más defendible.'
                ),
                'modulos': [
                    'El ACL-RSI: qué tan bien predice realmente el retorno al deporte',
                    'Kinesiofobia: el miedo a moverse que puede perpetuar el riesgo',
                    'Combinar pruebas físicas y psicológicas: ninguna sola basta',
                    'Capstone: evalúa el retorno de un jugador tras reconstrucción de LCA',
                ],
            },
        ],
    },
    {
        'nombre': 'Poblaciones Especiales y Salud Clínica',
        'slug': 'poblaciones-especiales-y-salud-clinica',
        'descripcion': (
            'Entrenamiento adaptado a poblaciones con necesidades '
            'específicas: enfermedad crónica, envejecimiento, embarazo, '
            'poblaciones pediátricas y discapacidad.'
        ),
        'orden': 6,
        'cursos': [
            {
                'titulo': 'Entrenamiento en Poblaciones con Enfermedad Crónica',
                'slug': 'entrenamiento-en-poblaciones-con-enfermedad-cronica',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'salud clínica',
                'resumen': 'Qué beneficios del ejercicio están bien documentados en cardiovascular, diabetes y cáncer.',
                'descripcion': (
                    'Rehabilitación cardíaca basada en ejercicio, control glucémico en diabetes '
                    'tipo 2, y el giro de "reposo total" a "ejercicio seguro" en pacientes '
                    'oncológicos — siempre en coordinación con el equipo médico tratante.'
                ),
                'modulos': [
                    'Enfermedad cardiovascular: rehabilitación basada en ejercicio',
                    'Enfermedad metabólica: ejercicio y control glucémico en diabetes tipo 2',
                    'Cáncer: ejercicio durante y después del tratamiento oncológico',
                    'Capstone: diseña el marco de decisión para un caso con comorbilidad',
                ],
            },
            {
                'titulo': 'Ejercicio y Envejecimiento: Sarcopenia y Funcionalidad',
                'slug': 'ejercicio-y-envejecimiento-sarcopenia-y-funcionalidad',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'salud clínica',
                'resumen': 'Diagnóstico real de sarcopenia, fuerza vs. potencia, y qué ejercicio previene caídas de verdad.',
                'descripcion': (
                    'Criterios EWGSOP2 para sarcopenia, el debate fuerza vs. potencia en '
                    'adultos mayores, y por qué solo los programas con componente de equilibrio '
                    'reducen caídas de forma consistente.'
                ),
                'modulos': [
                    'Sarcopenia: qué es y cómo se diagnostica con criterios reales',
                    'Entrenamiento de fuerza vs. potencia: qué dice la evidencia comparada',
                    'Prevención de caídas: no todo ejercicio previene caídas por igual',
                    'Capstone: diseña el programa para un adulto mayor con sarcopenia y riesgo de caídas',
                ],
            },
            {
                'titulo': 'Adaptaciones para Embarazo, Postparto y Poblaciones Pediátricas',
                'slug': 'adaptaciones-embarazo-postparto-y-poblaciones-pediatricas',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'salud clínica',
                'resumen': 'El mito del límite de frecuencia cardíaca, la diástasis abdominal y el entrenamiento de fuerza infantil.',
                'descripcion': (
                    'Seguridad real del ejercicio en el embarazo, qué sí funciona en '
                    'rehabilitación postparto (y qué todavía no), y por qué el entrenamiento de '
                    'fuerza pediátrico supervisado no detiene el crecimiento.'
                ),
                'modulos': [
                    'Embarazo: seguridad real y el mito del límite de frecuencia cardíaca',
                    'Postparto: diástasis abdominal y piso pélvico — qué sí funciona y qué todavía no',
                    'Poblaciones pediátricas: el mito de que el entrenamiento de fuerza "detiene el crecimiento"',
                    'Capstone: diseña el marco de comunicación para las tres poblaciones',
                ],
            },
            {
                'titulo': 'Entrenamiento Adaptado para Personas con Discapacidad',
                'slug': 'entrenamiento-adaptado-para-personas-con-discapacidad',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'salud clínica',
                'resumen': 'Guías de ejercicio para lesión medular y un riesgo de seguridad poco conocido: la autodisreflexia.',
                'descripcion': (
                    'Guías internacionales de ejercicio para lesión medular, el riesgo real del '
                    '"boosting" por autodisreflexia, y por qué esta población exige más '
                    'coordinación interdisciplinaria que cualquier otra.'
                ),
                'modulos': [
                    'Guías de ejercicio basadas en evidencia para lesión medular',
                    'Autodisreflexia y "boosting": un riesgo real y poco conocido fuera del deporte paralímpico',
                    'Por qué el entrenamiento adaptado exige más coordinación interdisciplinaria que cualquier otra población',
                    'Capstone: diseña el enfoque para un nuevo cliente con lesión medular',
                ],
            },
        ],
    },
    {
        'nombre': 'Negocio, Coaching y Marca Profesional',
        'slug': 'negocio-coaching-y-marca-profesional',
        'descripcion': (
            'Herramientas de negocio, marca personal, comunicación con el '
            'cliente/atleta y ética profesional para entrenadores y '
            'profesionales del deporte independientes.'
        ),
        'orden': 7,
        'cursos': [
            {
                'titulo': 'Construcción de Marca Personal para Profesionales del Deporte',
                'slug': 'construccion-de-marca-personal-para-profesionales-del-deporte',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'negocio',
                'resumen': 'Qué dice la investigación real sobre marca personal, y qué es promesa de marketing.',
                'descripcion': (
                    'Evidencia correlacional real sobre marca personal y carrera, el valor y '
                    'los límites de la especialización de nicho, y por qué autenticidad y '
                    'consistencia son los dos pilares que más se repiten entre fuentes.'
                ),
                'modulos': [
                    'Marca personal: qué dice la investigación real, no la anécdota',
                    'Diferenciación y especialización: ventajas documentadas, con cautela de fuente',
                    'Autenticidad y consistencia: los dos pilares que sí se repiten entre fuentes',
                    'Capstone: diseña el posicionamiento de un profesional del deporte',
                ],
            },
            {
                'titulo': 'Modelos de Negocio para Entrenadores Independientes',
                'slug': 'modelos-de-negocio-para-entrenadores-independientes',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'negocio',
                'resumen': 'Precio por hora vs. basado en valor, el mito de "retener es más barato", y cómo escalar sin perder calidad.',
                'descripcion': (
                    'Por qué cobrar por hora desalinea incentivos, de dónde viene realmente la '
                    'cifra viral de retención vs. adquisición, y por qué la disyuntiva real al '
                    'escalar es con acompañamiento humano o sin él.'
                ),
                'modulos': [
                    'Modelos de precio: por hora vs. basado en valor',
                    'Retención de clientes: el mito del "5 veces más barato retener"',
                    'Escalar sin perder calidad: la disyuntiva real no es grupal vs. individual',
                    'Capstone: diseña el modelo de negocio de un entrenador independiente',
                ],
            },
            {
                'titulo': 'Comunicación con el Cliente/Atleta: De la Ciencia a la Adherencia',
                'slug': 'comunicacion-con-el-cliente-atleta-de-la-ciencia-a-la-adherencia',
                'nivel': NIVEL_AVANZADO,
                'categoria': 'negocio',
                'resumen': 'Entrevista motivacional, framing de mensajes y por qué combinar técnicas de autorregulación funciona mejor.',
                'descripcion': (
                    'Qué tan sólida es realmente la evidencia de la entrevista motivacional, '
                    'una controversia real y no resuelta sobre framing de ganancia/pérdida, y '
                    'por qué ninguna técnica de autorregulación aislada basta.'
                ),
                'modulos': [
                    'Entrevista motivacional: qué tan sólida es la evidencia realmente',
                    'Framing de mensajes: ganancia vs. pérdida — una controversia real, no resuelta',
                    'Autorregistro y metas: el combo que funciona, no la técnica aislada',
                    'Capstone: diseña la estrategia de comunicación para un caso real',
                ],
            },
            {
                'titulo': 'Ética Profesional y Responsabilidad Legal para Entrenadores Independientes',
                'slug': 'etica-profesional-y-responsabilidad-legal-para-entrenadores',
                'nivel': NIVEL_INTERMEDIO,
                'categoria': 'negocio',
                'resumen': 'Alcance de práctica, negligencia y qué protege realmente un descargo de responsabilidad.',
                'descripcion': (
                    'El riesgo legal de exceder el alcance de práctica (especialmente en '
                    'nutrición), los patrones recurrentes en demandas reales de negligencia, y '
                    'qué cubre y qué no un waiver — con la salvedad de que el marco legal varía '
                    'por país.'
                ),
                'modulos': [
                    'Alcance de práctica: el hallazgo más preocupante del catálogo',
                    'Negligencia y deber de cuidado: qué muestran los casos reales',
                    'Descargos de responsabilidad (waivers): qué protegen y qué no',
                    'Capstone: evalúa el riesgo legal de un caso real',
                ],
            },
        ],
    },
]


class Command(BaseCommand):
    help = 'Crea (o sincroniza) las 7 escuelas de Zyfit Academy con sus cursos y módulos.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--publicar',
            action='store_true',
            help='Publica los cursos con módulos definidos aquí (publicado=True). Por defecto quedan como borradores.',
        )

    def handle(self, *args, **options):
        publicar = options['publicar']

        n_escuelas = n_cursos = n_modulos = 0

        for escuela_data in ESCUELAS:
            cursos_data = escuela_data.pop('cursos')

            school, created = School.objects.update_or_create(
                slug=escuela_data['slug'],
                defaults={
                    'nombre': escuela_data['nombre'],
                    'descripcion': escuela_data['descripcion'],
                    'orden': escuela_data['orden'],
                },
            )
            n_escuelas += 1
            tag = 'CREADA' if created else 'ACTUALIZADA'
            self.stdout.write(f'  Escuela {tag}: {school.nombre}')

            for curso_data in cursos_data:
                modulos_titulos = curso_data.pop('modulos')

                course, c_created = Course.objects.update_or_create(
                    slug=curso_data['slug'],
                    defaults={
                        'school': school,
                        'titulo': curso_data['titulo'],
                        'nivel': curso_data['nivel'],
                        'categoria': curso_data['categoria'],
                        'resumen': curso_data['resumen'],
                        'descripcion': curso_data['descripcion'],
                        **(({'publicado': True}) if publicar else {}),
                    },
                )
                n_cursos += 1
                c_tag = 'CREADO' if c_created else 'ACTUALIZADO'
                self.stdout.write(f'    Curso {c_tag}: {course.titulo}')

                # Sincroniza módulos por orden — no toca lecciones existentes.
                modulos_existentes = {
                    m.orden: m for m in course.modulos.all()
                }
                for orden, titulo in enumerate(modulos_titulos, start=1):
                    n_modulos += 1
                    if orden in modulos_existentes:
                        mod = modulos_existentes[orden]
                        if mod.titulo != titulo:
                            mod.titulo = titulo
                            mod.save(update_fields=['titulo'])
                            self.stdout.write(f'      Módulo ACTUALIZADO [{orden}]: {titulo}')
                    else:
                        Module.objects.create(course=course, orden=orden, titulo=titulo)
                        self.stdout.write(f'      Módulo CREADO [{orden}]: {titulo}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed completado: {n_escuelas} escuelas, {n_cursos} cursos con estructura definida, '
            f'{n_modulos} módulos.'
        ))
        if not publicar:
            self.stdout.write(
                '  Los cursos definidos aquí están en borrador. Usa --publicar para publicarlos.'
            )
