// Términos de Servicio de Zyfit Academy. Contenido propio (no reutiliza el de
// la app móvil de entrenamiento): distinto producto, distintos datos y riesgos
// (cursos/quizzes/comunidad/tutor IA, no generación de rutinas ni datos de salud).

import { LegalLayout, LegalList, LegalSection } from '@/components/layout/LegalLayout'

const LAST_UPDATED = '3 de julio de 2026'
const COMPANY = 'Zyfit Technologies'
const APP_NAME = 'Zyfit Academy'
const CONTACT_EMAIL = 'legal@zyfit.app'

export function TermsPage() {
  return (
    <LegalLayout title="Términos de Servicio" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Aceptación de los términos">
        <p>
          Al crear una cuenta o utilizar {APP_NAME} (en adelante, "la Plataforma"), usted acepta quedar
          vinculado por estos Términos de Servicio. Si no está de acuerdo con alguno de estos términos, no
          debe utilizar la Plataforma.
        </p>
        <p>
          Estos Términos constituyen un acuerdo entre usted ("Usuario") y {COMPANY} ("la Empresa",
          "nosotros"). Su cuenta de {APP_NAME} es la misma cuenta que utiliza en el resto de productos de
          Zyfit (por ejemplo, la app móvil de entrenamiento) cuando comparte el mismo correo electrónico.
        </p>
      </LegalSection>

      <LegalSection title="2. Descripción del servicio">
        <p>
          {APP_NAME} es una plataforma de formación en línea (e-learning) enfocada en ciencia del
          entrenamiento y desarrollo deportivo. Los servicios incluyen, entre otros:
        </p>
        <LegalList
          items={[
            'Cursos organizados en escuelas, módulos y lecciones (texto, video, audio y sesiones en vivo).',
            'Evaluaciones (quizzes) calificadas automáticamente en nuestros servidores.',
            'Certificados digitales verificables al completar un curso.',
            'Un tutor conversacional asistido por inteligencia artificial, anclado al contenido de los cursos.',
            'Una comunidad de preguntas y respuestas entre alumnos.',
            'Racha de estudio, insignias y otros elementos de seguimiento de progreso.',
          ]}
        />
        <p>
          Algunos cursos (por ejemplo, los de licenciamiento de entrenadores) están desarrollados en
          colaboración con organizaciones deportivas. Completar un curso y obtener su certificado de{' '}
          {APP_NAME} <strong>no equivale por sí solo</strong> a una licencia o acreditación oficial: cuando
          un curso forma parte de un proceso de licenciamiento de una federación u organización deportiva,
          la acreditación final depende de los requisitos y procesos propios de esa organización, no de{' '}
          {COMPANY}.
        </p>
      </LegalSection>

      <LegalSection title="3. Cuenta de usuario">
        <p>
          Para usar la Plataforma más allá del catálogo de exploración gratuito, el Usuario debe crear una
          cuenta con un correo electrónico válido y una contraseña. El Usuario es responsable de:
        </p>
        <LegalList
          items={[
            'Mantener la confidencialidad de sus credenciales de acceso.',
            'Notificar de inmediato cualquier acceso no autorizado a su cuenta.',
            'Toda actividad que ocurra bajo su cuenta.',
            'Proporcionar información veraz y actualizada al registrarse.',
          ]}
        />
        <p>
          Antes de registrarse, un visitante puede navegar el catálogo y consumir el contenido marcado
          como gratuito sin crear una cuenta, mediante una sesión anónima temporal. Al registrarse, el
          progreso de esa sesión anónima se asocia a la nueva cuenta.
        </p>
        <p>
          La Empresa se reserva el derecho de suspender cuentas que infrinjan estos Términos, que
          proporcionen información falsa, o cuyo uso sea abusivo o perjudicial para otros usuarios o para
          el servicio.
        </p>
      </LegalSection>

      <LegalSection title="4. Suscripción Zyfit Academy Pro">
        <p>
          Ciertos módulos de cada curso son de acceso gratuito; el resto del catálogo requiere una
          suscripción "Zyfit Academy Pro", independiente de cualquier otra suscripción de la familia de
          productos Zyfit.
        </p>
        <p>
          <strong>Estado actual del cobro:</strong> a la fecha de esta versión de los Términos, la
          Plataforma todavía no procesa pagos en línea de forma autónoma; la activación de Academy Pro se
          realiza de forma administrada. Cuando se habilite el cobro en línea, estos Términos se
          actualizarán con las condiciones de precio, renovación y cancelación aplicables, y se le
          notificará antes de que se le cobre por primera vez.
        </p>
        <p>
          El Usuario puede cancelar su suscripción en cualquier momento desde la sección de Suscripción de
          la Plataforma; la cancelación conserva el acceso Pro hasta el final del período ya cubierto.
        </p>
      </LegalSection>

      <LegalSection title="5. Tutor de inteligencia artificial">
        <p>
          El tutor conversacional utiliza modelos de lenguaje de un proveedor externo (actualmente Groq,
          Inc.) para responder preguntas ancladas al contenido de los cursos. El Usuario reconoce que:
        </p>
        <LegalList
          items={[
            'Las respuestas del tutor son de naturaleza probabilística y pueden contener imprecisiones.',
            'El tutor no está diseñado para dar diagnósticos médicos, indicaciones sobre lesiones, ni para diseñar programas de entrenamiento personalizados; ese tipo de preguntas se redirige automáticamente en vez de responderse.',
            'Las conversaciones con el tutor se almacenan para poder mostrarle su historial y mejorar el servicio.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Contenido de la comunidad">
        <p>
          La sección de Comunidad permite publicar preguntas y respuestas visibles para otros alumnos.
          Todo contenido publicado pasa por un filtro automático (reglas deterministas y, cuando hace
          falta, un clasificador de inteligencia artificial) antes o después de publicarse, para detectar
          spam, contenido fuera de tema o dañino; el contenido reportado por otros usuarios también puede
          ocultarse automáticamente al superar un umbral de reportes.
        </p>
        <p>Al publicar en la Comunidad, el Usuario declara que el contenido es propio y se compromete a no:</p>
        <LegalList
          items={[
            'Publicar contenido difamatorio, discriminatorio, spam o con fines comerciales no autorizados.',
            'Compartir datos personales de terceros sin su consentimiento.',
            'Hacerse pasar por otra persona o entidad.',
          ]}
        />
        <p>
          El Usuario conserva los derechos sobre su propio contenido, pero otorga a la Empresa una
          licencia para mostrarlo dentro de la Plataforma a otros alumnos con el mismo curso o escuela.
        </p>
      </LegalSection>

      <LegalSection title="7. Uso aceptable">
        <p>El Usuario se compromete a no:</p>
        <LegalList
          items={[
            'Utilizar la Plataforma para fines ilegales o no autorizados.',
            'Intentar acceder a datos de otros usuarios o a áreas no autorizadas de la Plataforma.',
            'Reproducir, distribuir o crear obras derivadas del contenido de los cursos sin autorización.',
            'Utilizar medios automatizados para extraer contenido o respuestas de evaluaciones de la Plataforma.',
            'Compartir su cuenta con terceros.',
          ]}
        />
      </LegalSection>

      <LegalSection title="8. Propiedad intelectual">
        <p>
          El contenido de los cursos, el diseño, el código, las marcas y demás elementos de la Plataforma
          son propiedad de {COMPANY} o de sus licenciantes (incluyendo organizaciones deportivas
          colaboradoras en cursos específicos). Se le concede una licencia limitada, personal y revocable
          para acceder al contenido de los cursos en los que esté inscrito, exclusivamente para su
          formación personal.
        </p>
      </LegalSection>

      <LegalSection title="9. Certificados">
        <p>
          Al completar un curso y aprobar sus evaluaciones, la Plataforma emite un certificado digital con
          un código único verificable. La Empresa puede revocar un certificado obtenido mediante fraude o
          incumplimiento de estos Términos.
        </p>
      </LegalSection>

      <LegalSection title="10. Limitación de responsabilidad">
        <p>En la máxima medida permitida por la ley aplicable, {COMPANY} no será responsable por:</p>
        <LegalList
          items={[
            'Daños indirectos, incidentales o consecuentes derivados del uso de la Plataforma.',
            'Pérdida de datos o interrupciones del servicio que escapen a su control razonable.',
            'Decisiones profesionales o de licenciamiento tomadas por terceros (federaciones, empleadores) con base en un certificado emitido por la Plataforma.',
            'Acciones u omisiones de proveedores externos, incluyendo el proveedor de inteligencia artificial.',
          ]}
        />
      </LegalSection>

      <LegalSection title="11. Modificaciones">
        <p>
          Podemos actualizar estos Términos o el servicio en cualquier momento. El uso continuado de la
          Plataforma tras la publicación de cambios constituye su aceptación de los nuevos Términos.
        </p>
      </LegalSection>

      <LegalSection title="12. Terminación">
        <p>
          El Usuario puede eliminar su cuenta en cualquier momento. La Empresa puede suspender el acceso
          de un Usuario que incumpla estos Términos. Tras la terminación, los datos se eliminan conforme a
          lo descrito en la Política de Privacidad.
        </p>
      </LegalSection>

      <LegalSection title="13. Contacto">
        <p>Para preguntas sobre estos Términos, escríbanos a:</p>
        <p>
          {COMPANY} — {CONTACT_EMAIL}
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
