"""Seed de los primeros 3 posts editoriales del Blog de Zyfit Academy.

Contenido de marca/SEO real (no de prueba): recuperación activa, adaptación
individual al entrenamiento y expectativas realistas de resultados — cada uno
con meta_titulo/meta_descripcion, subtítulos (##/###), una tabla mito vs.
evidencia y un CTA a un curso real + la landing, siguiendo el mismo criterio
editorial que el resto de Zyfit Academy: etiqueta de nivel de evidencia en
cada afirmación, y ninguna cifra de estudio inventada.

Autoría: como no existe todavía una cuenta de instructor "editorial" (los
seeds de Course tampoco asignan instructor), este comando crea una cuenta de
solo-lectura ("Equipo Zyfit Academy", sin contraseña utilizable) para que el
byline y el `author` del JSON-LD no queden vacíos — un admin puede reasignar
la autoría después desde /instructor/blog si hace falta.

Idempotente: `update_or_create` por slug. Los `Course`/`School` se resuelven
por slug (no por id, que difiere entre entornos) — si un curso no existe
todavía en ese entorno, el CTA cae al catálogo general (`/explorar`) en vez
de rifar un link roto.

Uso:
    python manage.py seed_blog_posts
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.utils.text import slugify

from academy.blog_models import BlogPost
from academy.models import Course, School

AUTOR_EMAIL = 'equipo@zyfit.academy'

POSTS = [
    {
        'titulo': 'Recuperación activa: la ciencia vs. lo que dicen las redes',
        'meta_titulo': 'Recuperación activa: mitos y evidencia real | Zyfit Academy',
        'meta_descripcion': (
            'Separamos la recuperación activa de los mitos virales: qué apoya '
            'realmente la evidencia sobre el descanso entre entrenamientos y '
            'qué es solo moda de redes.'
        ),
        'resumen': (
            'Foam rolling, hielo, compresión, estiramientos infinitos: las '
            'redes prometen recuperación exprés. Repasamos, mito por mito, qué '
            'sostiene realmente la evidencia sobre el descanso entre '
            'entrenamientos.'
        ),
        'etiquetas': ['recuperación activa', 'mitos de recuperación muscular', 'descanso entre entrenamientos'],
        'school_slug': 'recuperacion-prevencion-y-wellness',
        'curso_slug': 'fundamentos-de-recuperacion-y-hrv',
        'contenido': """Después de una sesión pesada de piernas, es fácil sentir que hay que "hacer algo" para recuperarse rápido. Bicicleta suave, foam roller, mangas de compresión, hielo en las rodillas — el ritual completo, calcado de lo que promete el último reel viral. La pregunta que rara vez se hace es: ¿cuánto de eso realmente acelera la recuperación, y cuánto es simplemente ritual?

La recuperación activa —moverse suave después de entrenar, en vez de quedarse completamente quieto— es una de las prácticas más recomendadas y, a la vez, más malentendidas del entrenamiento. Antes de sumar un paso más a la rutina post-entreno porque "lo dice todo el mundo en Instagram", vale la pena separar lo que sostiene la evidencia de lo que es simplemente marketing de suplementos y accesorios.

## ¿Qué es la recuperación activa, exactamente?

La recuperación activa se refiere a realizar actividad física de baja intensidad —caminar, pedalear suave, nadar tranquilo— en las horas o días posteriores a un entrenamiento exigente, en lugar de un descanso completamente pasivo. La lógica fisiológica detrás es razonable: el movimiento suave mantiene el flujo sanguíneo elevado en los músculos trabajados, lo que en teoría podría favorecer el transporte de nutrientes y la eliminación de productos metabólicos.

Hasta ahí, la ciencia y las redes están de acuerdo. El problema empieza cuando esa lógica básica se estira para justificar afirmaciones mucho más grandes: que "elimina" el ácido láctico, que "cura" las agujetas, o que sin ella el progreso se estanca. Ahí es donde conviene frenar y revisar mito por mito.

## Mito 1: "hay que sacar el ácido láctico para no acumular fatiga"

### Qué dice la evidencia

Este es probablemente el mito más viejo del gimnasio. La idea de que el lactato se "acumula" tras el entrenamiento y hay que "purgarlo" con movimiento lleva décadas circulando, pero no refleja bien la fisiología actual. El lactato producido durante el ejercicio intenso se metaboliza con relativa rapidez una vez que termina la sesión, en un margen de tiempo bastante más corto de lo que asume la creencia popular, y no es el responsable del dolor muscular que aparece uno o dos días después. La evidencia en fisiología del ejercicio es consistente en que el lactato no es un "desecho tóxico" que haya que expulsar, sino un metabolito que el propio cuerpo reutiliza como fuente de energía.

Nivel de evidencia: **alta**. El malentendido persiste más por herencia cultural del mundo fitness que por falta de datos.

## Mito 2: "el foam roller elimina las agujetas (DOMS)"

### Qué dice la evidencia

El dolor muscular de aparición tardía (DOMS, por sus siglas en inglés) —esa rigidez que aparece 24 a 48 horas después de un estímulo nuevo o intenso— tiene un origen relacionado con microdaño estructural en la fibra muscular y la respuesta inflamatoria que le sigue, no con lactato acumulado. El foam roller y otras técnicas de liberación miofascial pueden generar una sensación de alivio percibido y, según la evidencia disponible, un efecto modesto sobre la percepción de dolor y la rigidez en las horas siguientes. Lo que no sostiene la evidencia es que "elimine" las agujetas o acelere de forma relevante la reparación del tejido muscular.

Nivel de evidencia: **media**. Hay beneficio percibido documentado, pero el efecto sobre la recuperación estructural real es pequeño y no debería venderse como solución mágica.

## Mito 3: "más recuperación activa siempre es mejor que descansar"

### Qué dice la evidencia

Aquí es donde el entusiasmo suele pasarse de rosca. Si un poco de movimiento suave ayuda, la lógica de redes sociales asume que más sesiones de "recuperación activa" —cardio extra, movilidad extra, otra sesión ligera— deben ayudar todavía más. La evidencia no respalda esa progresión lineal. El cuerpo necesita también recuperación pasiva real: sueño, tejido en reposo y una reducción neta del volumen de estrés físico. Sumar actividad de más, incluso de baja intensidad, sobre una base de fatiga acumulada puede terminar compitiendo con la recuperación en lugar de acelerarla.

Nivel de evidencia: **media-alta**. El principio de que existe un punto de rendimientos decrecientes en el volumen de actividad post-entreno es ampliamente aceptado en la literatura sobre gestión de la carga de entrenamiento.

## Mito 4: "la ropa de compresión acelera la recuperación muscular"

### Qué dice la evidencia

Las prendas de compresión son, probablemente, el producto que más se beneficia del halo científico de la recuperación activa. La evidencia sobre su efecto en la recuperación muscular objetiva —fuerza, rango de movimiento, marcadores de daño muscular— es mixta e inconsistente entre estudios, con efectos que, cuando aparecen, suelen ser pequeños. Donde sí hay algo más de consistencia es en la sensación subjetiva de menor pesadez o fatiga percibida, que no es poco —el confort importa— pero es un beneficio distinto al que promete el marketing.

Nivel de evidencia: **baja-media**. Vale como comodidad, no como acelerador comprobado de la recuperación fisiológica.

## Mito vs. evidencia, de un vistazo

| Mito | Qué dice la evidencia | Nivel de evidencia |
| --- | --- | --- |
| Hay que "sacar" el ácido láctico | El lactato se metaboliza con rapidez tras el ejercicio y no causa el dolor muscular tardío | Alta |
| El foam roller elimina las agujetas | Reduce algo la percepción de dolor y rigidez; no acelera la reparación estructural del tejido | Media |
| Más recuperación activa siempre es mejor | Existe un punto de rendimientos decrecientes; el descanso pasivo real (sueño) sigue siendo necesario | Media-alta |
| La compresión acelera la recuperación muscular | Efecto objetivo mixto y pequeño; el beneficio más claro es el confort percibido | Baja-media |

## Entonces, ¿qué vale la pena hacer después de entrenar?

Ninguno de estos mitos significa que la recuperación activa sea inútil — significa que su beneficio real es más modesto y más específico de lo que promete el contenido viral. Lo que sostiene mejor la evidencia disponible, en conjunto, es priorizar el movimiento suave y breve el día después de una sesión exigente sin buscar "sudar" de nuevo, poner el sueño por encima de cualquier accesorio como variable de recuperación, gestionar el volumen total de entrenamiento en la semana en vez de mirar solo las 24 horas posteriores a una sesión puntual, y usar foam roller o compresión si generan confort real — como complemento, nunca como sustituto de lo anterior.

La recuperación no es un producto que se compra ni un ritual que se improvisa mirando redes: es una variable que se planifica, como cualquier otra parte del entrenamiento.

## Seguí aprendiendo

Si te interesa entender cómo diseñar la recuperación de un deportista con datos reales —HRV, carga interna, indicadores de fatiga— en vez de intuición, el curso [Fundamentos de Recuperación y Monitoreo de HRV](/explorar/cursos/__CURSO_ID__) de Zyfit Academy es el siguiente paso lógico. Y si estás empezando a explorar la plataforma, podés conocer todo lo que ofrece Zyfit Academy en la [página principal](/).

## Fuentes y referencias

Este artículo se apoya en el consenso general de la fisiología del ejercicio y la medicina del deporte sobre metabolismo del lactato, dolor muscular de aparición tardía (DOMS) y gestión de la carga de entrenamiento, sin citar estudios puntuales para evitar cifras que no podamos verificar con la fuente exacta. Para quien quiera profundizar con literatura primaria, recomendamos revisiones sistemáticas y position stands de sociedades como el American College of Sports Medicine (ACSM) o la National Strength and Conditioning Association (NSCA) sobre recuperación y DOMS.""",
    },
    {
        'titulo': 'Adaptación al entrenamiento: por qué copiar una rutina genérica no funciona',
        'meta_titulo': 'Rutina personalizada vs. genérica: por qué no progresás',
        'meta_descripcion': (
            'Por qué no progreso en el gym con una rutina genérica: la ciencia '
            'de la adaptación individual y por qué el entrenamiento adaptativo '
            'cambia el resultado.'
        ),
        'resumen': (
            'Dos personas, la misma rutina, resultados opuestos. No es mala '
            'suerte: es la diferencia entre una rutina genérica y una que se '
            'adapta a quien la entrena.'
        ),
        'etiquetas': ['rutina personalizada vs genérica', 'por qué no progreso en el gym', 'entrenamiento adaptativo'],
        'school_slug': 'ciencia-del-entrenamiento',
        'curso_slug': 'gestion-de-la-carga-de-entrenamiento',
        'contenido': """Mica y Fede arrancan el mismo programa de fuerza el mismo lunes: mismos ejercicios, mismas series, mismas repeticiones, calcado de la rutina que le funcionó a un influencer con "abs de acero". Ocho semanas después, Fede subió su marca en sentadilla y se nota más definido. Mica, siguiendo exactamente el mismo plan, apenas notó cambios y terminó con una molestia en el hombro que no tenía antes. ¿Cuál de las dos rutinas "no funcionó"? Ninguna — y las dos. El problema no estuvo en los ejercicios elegidos, sino en asumir que el mismo estímulo produce la misma respuesta en cualquier cuerpo.

## El mismo estímulo, dos respuestas distintas

Esto no es un caso raro ni una excepción — es, en rigor, lo esperable. La fisiología del entrenamiento reconoce desde hace décadas que ante una misma carga de trabajo, distintos organismos adaptan de forma distinta, y a distinta velocidad. Es lo que la literatura describe como adaptación específica a la demanda impuesta: el cuerpo se adapta al estímulo que recibe, pero el "cuánto" y el "qué tan rápido" dependen de variables individuales que una rutina genérica, por definición, no puede conocer.

Nivel de evidencia: **alta**. La variabilidad individual en la respuesta al entrenamiento de fuerza está ampliamente documentada; no es una idea de marketing, es uno de los hallazgos más consistentes del campo.

Esto no quiere decir que los ejercicios elegidos sean irrelevantes, ni que "cualquier rutina sirve si se individualiza". Significa que el diseño del estímulo es solo una parte de la ecuación: la otra parte, tan importante como la primera, es cómo esa persona en particular procesa, tolera y recupera ese estímulo. Ignorar esa segunda mitad es, precisamente, el punto ciego de cualquier rutina pensada para "el usuario promedio".

## ¿Qué hace que Mica y Fede respondan distinto?

### Historial de entrenamiento y punto de partida

Fede lleva tres años entrenando con cierta regularidad; Mica volvió al gimnasio después de año y medio de parate. En términos de adaptación, no parten del mismo lugar: alguien con menos historial reciente suele necesitar una progresión de carga más conservadora al inicio, mientras que alguien más entrenado puede tolerar —y necesitar— estímulos más exigentes para seguir progresando. Aplicarles la misma progresión a los dos ignora esa diferencia de base.

Nivel de evidencia: **alta**.

### Recuperación, sueño y estrés de la vida real

La rutina "funciona" en el papel, pero el cuerpo no se adapta al papel: se adapta a lo que le queda disponible después de dormir, comer y manejar el estrés cotidiano. Si Mica duerme seis horas cortadas por turnos rotativos y Fede duerme ocho horas estables, ambos "cumplen" el mismo plan de entrenamiento pero con una capacidad de recuperación real muy distinta.

Nivel de evidencia: **alta** para el rol general del sueño en la recuperación; **media** para la magnitud exacta del efecto, que varía persona a persona.

### Diferencias biomecánicas e historial de lesiones

La rutina viral asumía un patrón de movimiento de hombro "estándar" que no consideraba que Mica ya tenía una movilidad reducida de base. Un ejercicio que para Fede es neutro puede ser, para otra persona con distinta anatomía o historial de lesiones, una fuente de sobrecarga acumulada. Ninguna rutina genérica —por buena que sea su diseño general— puede anticipar eso sin conocer a la persona que la ejecuta.

Nivel de evidencia: **alta**, como principio general de programación individualizada en fuerza y readaptación.

## Mito vs. evidencia

| Mito | Qué dice la evidencia | Nivel de evidencia |
| --- | --- | --- |
| "Si la rutina le funcionó a alguien, me va a funcionar igual a mí" | La respuesta al mismo estímulo varía según historial de entrenamiento, recuperación y biomecánica individual | Alta |
| "Entrenar más duro siempre es mejor que entrenar distinto" | Más carga sin ajustar a la capacidad de recuperación individual aumenta el riesgo de estancamiento o lesión, no garantiza progreso | Alta |
| "Una rutina genérica bien diseñada sirve para cualquier nivel" | Un buen diseño general no reemplaza el ajuste a variables individuales de quien la ejecuta | Media-alta |

## De principio científico a práctica: qué significa "entrenamiento adaptativo"

Entrenamiento adaptativo, en el sentido en que lo usa la ciencia del ejercicio, no es una palabra de moda: es la práctica de ajustar variables —volumen, intensidad, selección de ejercicios, progresión— en función de cómo responde la persona real, no de un plan fijo escrito de antemano para "el usuario promedio". Eso puede hacerlo un entrenador humano con experiencia, observando y ajustando sesión a sesión — es, de hecho, lo que hace un buen entrenador desde siempre.

Lo que cambia con la tecnología es la posibilidad de sistematizar ese ajuste con datos: registrar cómo respondió cada sesión —esfuerzo percibido, feedback, progreso real— y usar esa información para modificar la siguiente. Esa es, en términos generales, la lógica detrás de una app de entrenamiento adaptativo como Zyfit: generar una rutina que parte de datos individuales y se ajusta con el feedback real de cada sesión, en vez de aplicar el mismo plan a todo el mundo. Vale aclarar que el "cómo" exacto de ese ajuste —el algoritmo específico de Zyfit— es una decisión de producto propia, no un hallazgo de la literatura científica; lo que sí respalda la evidencia es el principio general de que individualizar el estímulo según la respuesta de cada persona produce mejores resultados que aplicar un plan fijo para todos.

## Seguí aprendiendo

Si te interesa entender en profundidad cómo se gestiona la carga de entrenamiento para que se ajuste a cada persona —volumen, intensidad, progresión, fatiga acumulada— en vez de aplicar la misma tabla a todo el mundo, el curso [Gestión de la Carga de Entrenamiento](/explorar/cursos/__CURSO_ID__) de Zyfit Academy desarrolla el principio en detalle. Y si querés ver cómo se aplica en una app real, podés conocer Zyfit desde la [página principal](/).

## Fuentes y referencias

Este artículo se basa en el consenso general de la fisiología del ejercicio sobre variabilidad individual en la respuesta al entrenamiento de fuerza, el rol del sueño en la recuperación y los principios de programación individualizada, sin citar estudios puntuales para no incluir cifras que no podamos verificar con la fuente exacta. Para profundizar con literatura primaria, recomendamos revisiones sobre variabilidad de la respuesta al entrenamiento (responders/non-responders) y los position stands de NSCA/ACSM sobre diseño de programas de fuerza.""",
    },
    {
        'titulo': '¿Cuánto tiempo toma ver resultados reales en el gym?',
        'meta_titulo': 'Cuánto tiempo para ver resultados reales en el gym | Zyfit',
        'meta_descripcion': (
            'Cuánto tarda ganar músculo y ver resultados reales en el gym: un '
            'timeline honesto con hitos a 2 semanas, 1 mes, 3 meses y 6+ '
            'meses, según la evidencia.'
        ),
        'resumen': (
            'Nada de transformaciones en 30 días. Un timeline honesto, con '
            'nivel de evidencia en cada hito, de lo que realmente se puede '
            'esperar del entrenamiento.'
        ),
        'etiquetas': ['cuánto tiempo para ver resultados en el gym', 'expectativas realistas fitness', 'cuánto tarda ganar músculo'],
        'school_slug': 'fisiologia-y-nutricion-aplicada',
        'curso_slug': 'composicion-corporal-medicion-y-manipulacion',
        'contenido': """Es la pregunta que casi todo el mundo googlea la primera semana de entrenar: "¿cuánto tarda en verse resultados?". Y la respuesta que ofrece el algoritmo suele ser una avalancha de anuncios de "transformación en 30 días" y fotos de antes/después que, en el mejor de los casos, omiten meses de preparación previa y, en el peor, directamente no son reales. Alguien que empieza hoy, entrena con constancia y no ve gran diferencia en el espejo a las tres semanas, tiene motivos legítimos para pensar que "algo está mal" — cuando en realidad está exactamente donde la fisiología predice que debería estar.

## Por qué "¿cuánto tarda?" no tiene una sola respuesta

La pregunta agrupa, sin darse cuenta, varios procesos fisiológicos distintos que ocurren a velocidades distintas: ganar fuerza no es lo mismo que ganar masa muscular visible, y ninguna de las dos es lo mismo que perder grasa corporal. Cada uno tiene su propio cronograma, y confundirlos es la fuente principal de expectativas poco realistas.

Nivel de evidencia: **alta**, como principio general de fisiología del ejercicio.

## Las primeras 2 semanas: cambios reales, pero invisibles al espejo

### Qué mejora (y qué todavía no)

En las primeras dos semanas de un programa de fuerza es común notar mejoras genuinas de rendimiento —más peso movido, mejor técnica, más confianza en el movimiento— sin que haya un cambio visible de composición corporal. Esas primeras ganancias se explican mayormente por adaptaciones neuromusculares: el sistema nervioso se vuelve más eficiente reclutando el músculo que ya existe, antes de que el músculo en sí crezca. Es una fase real de progreso, aunque no se note al mirarse en el espejo.

Nivel de evidencia: **alta**.

## Al mes: la fuerza se consolida, la composición corporal recién empieza

### Lo que puede notarse hacia la semana 4

Hacia las cuatro semanas de entrenamiento constante, las ganancias de fuerza suelen ser más claras y algo más estables, y en personas muy consistentes con el entrenamiento y la alimentación pueden empezar a asomar cambios leves de composición corporal, generalmente medibles antes de ser visibles a simple vista. La visibilidad depende mucho del punto de partida: alguien con menor porcentaje de grasa corporal previo suele notar cambios "a la vista" antes que alguien que parte de un punto distinto, sin que eso signifique que esté progresando mejor o peor.

Nivel de evidencia: **media-alta**.

## A los 3 meses: cuando el cambio empieza a notarse para la mayoría

### Composición corporal, no solo la balanza

El entorno de tres meses es, para buena parte de las personas que entrenan con constancia real —no solo "cuando se puede"—, el punto donde los cambios de composición corporal empiezan a ser evidentes para otras personas, no solo para uno mismo mirándose con lupa. Esto varía considerablemente según genética, adherencia al plan, punto de partida y calidad del descanso: no es un número mágico igual para todos, es un rango donde la mayoría empieza a ver algo tangible si fue consistente.

Nivel de evidencia: **media**. Hay bastante consenso general en el rango, pero la variabilidad individual es alta y está bien documentada.

## A los 6 meses y más allá: la consolidación (y lo que de verdad hace la diferencia)

### Por qué la adherencia pesa más que la rutina "perfecta"

Pasados los seis meses de entrenamiento constante, los cambios estructurales —fuerza, composición corporal, capacidad de trabajo— suelen ser sustanciales y sostenidos para quien mantuvo la regularidad. A esta altura, la variable que más predice el resultado ya no es el detalle fino de qué rutina se siguió, sino la adherencia sostenida en el tiempo: quien entrenó con constancia moderada durante seis meses casi siempre le saca ventaja a quien persiguió la rutina "perfecta" de forma intermitente.

Nivel de evidencia: **alta**, como principio general — la adherencia es uno de los predictores de resultado más consistentes en la literatura sobre entrenamiento y cambio de composición corporal.

## Un timeline realista, de un vistazo

| Hito | Qué es realista esperar | Nivel de evidencia |
| --- | --- | --- |
| 2 semanas | Mejoras de fuerza y técnica por adaptación neuromuscular; el cambio visible de composición corporal todavía no aparece | Alta |
| 1 mes | Fuerza más consolidada; en personas muy constantes, primeros cambios leves y medibles de composición corporal | Media-alta |
| 3 meses | Cambios de composición corporal visibles para la mayoría de quienes fueron consistentes; el rango exacto varía mucho según el punto de partida | Media |
| 6+ meses | Cambios estructurales sustanciales y sostenidos; la adherencia pesa más que cualquier detalle de programación | Alta |

## Lo que esto significa para las expectativas

Nada de esto es una promesa de que "todo el mundo" va a ver determinado cambio en determinada semana — es, al revés, un llamado a desconfiar de cualquiera que prometa eso. Lo que sí sostiene la evidencia es que hay un orden esperable (primero rendimiento, después composición corporal visible) y que la variable que más se puede controlar —la constancia sostenida— es más determinante que encontrar la rutina "ideal". Las primeras semanas sin cambios visibles no son una señal de que algo salió mal: son, casi siempre, la fisiología funcionando exactamente como se espera.

## Seguí aprendiendo

Si te interesa entender cómo se mide de verdad un cambio de composición corporal —más allá de la balanza y las fotos de "antes y después"—, el curso [Composición Corporal: Medición y Manipulación Basada en Datos](/explorar/cursos/__CURSO_ID__) de Zyfit Academy profundiza en las herramientas y la evidencia detrás de esas mediciones. Y si querés conocer el resto de lo que ofrece Zyfit Academy, podés hacerlo desde la [página principal](/).

## Fuentes y referencias

Este artículo se apoya en el consenso general de la fisiología del ejercicio sobre adaptación neuromuscular temprana, hipertrofia y cambios de composición corporal a mediano/largo plazo, sin citar estudios puntuales para evitar cifras que no podamos verificar con la fuente exacta. Para profundizar con literatura primaria, recomendamos revisiones sistemáticas sobre cronología de la adaptación al entrenamiento de fuerza y los position stands de ACSM sobre progresión de programas de entrenamiento de resistencia.""",
    },
]


class Command(BaseCommand):
    help = 'Crea (o sincroniza) los 3 primeros posts editoriales del Blog de Zyfit Academy.'

    def handle(self, *args, **options):
        User = get_user_model()
        autor, autor_creado = User.objects.get_or_create(
            email=AUTOR_EMAIL,
            defaults={'username': 'equipo_zyfit_academy', 'first_name': 'Equipo Zyfit Academy',
                      'academy_instructor': True, 'is_active': True},
        )
        if autor_creado:
            autor.set_unusable_password()
            autor.save(update_fields=['password'])
            self.stdout.write(self.style.SUCCESS(f'  Cuenta editorial creada: {AUTOR_EMAIL}'))

        creados = actualizados = 0
        for data in POSTS:
            data = dict(data)
            school = School.objects.filter(slug=data.pop('school_slug'), tenant=None).first()
            curso = Course.objects.filter(slug=data.pop('curso_slug'), tenant=None).first()
            curso_href = f'/explorar/cursos/{curso.id}' if curso else '/explorar'
            if curso is None:
                self.stdout.write(self.style.WARNING(
                    f'  Curso no encontrado para "{data["titulo"]}" — el CTA cae a /explorar.',
                ))

            slug = slugify(data['titulo'])
            contenido = data.pop('contenido').replace('/explorar/cursos/__CURSO_ID__', curso_href)

            post, created = BlogPost.objects.update_or_create(
                slug=slug,
                defaults={
                    **data,
                    'contenido': contenido,
                    'school': school,
                    'autor': autor,
                    'tenant': None,
                    'publicado': True,
                },
            )
            if post.publicado_en is None:
                post.publicado_en = timezone.now()
                post.save(update_fields=['publicado_en'])

            tag = 'CREADO' if created else 'ACTUALIZADO'
            creados += created
            actualizados += not created
            self.stdout.write(f'  Post {tag}: {post.titulo}')

        self.stdout.write(self.style.SUCCESS(
            f'\n✓ Seed completado: {creados} creados, {actualizados} actualizados.',
        ))
