// Política de Privacidad de Zyfit Academy. Contenido propio (no reutiliza el
// de la app móvil de entrenamiento): a diferencia de esa app, Academy NO
// recopila datos biométricos ni de salud — solo datos de cuenta, progreso
// académico y las interacciones descritas abajo.

import { LegalLayout, LegalList, LegalSection } from '@/components/layout/LegalLayout'

const LAST_UPDATED = '3 de julio de 2026'
const COMPANY = 'Zyfit Technologies'
const APP_NAME = 'Zyfit Academy'
const CONTACT_EMAIL = 'legal@zyfit.app'

export function PrivacyPage() {
  return (
    <LegalLayout title="Política de Privacidad" lastUpdated={LAST_UPDATED}>
      <LegalSection title="1. Responsable del tratamiento">
        <p>
          {COMPANY} es responsable del tratamiento de los datos personales que usted nos proporciona al
          utilizar {APP_NAME} (en adelante, "la Plataforma"). Esta política describe qué datos
          recopilamos, para qué los usamos, con quién los compartimos y qué derechos tiene sobre ellos.
        </p>
        <p>
          A diferencia de otras apps de la familia Zyfit, {APP_NAME} <strong>no recopila datos
          biométricos ni de salud</strong> (peso, lesiones, frecuencia cardíaca, ciclo menstrual, etc.):
          es una plataforma de formación, no de generación de rutinas de entrenamiento.
        </p>
        <p>Para cualquier consulta sobre el tratamiento de sus datos, escríbanos a {CONTACT_EMAIL}.</p>
      </LegalSection>

      <LegalSection title="2. Datos que recopilamos">
        <p>
          <strong>Datos de cuenta:</strong> correo electrónico, contraseña (almacenada siempre cifrada),
          nombre. Es la misma cuenta que usted usa en el resto de productos Zyfit.
        </p>
        <p>
          <strong>Datos de progreso académico:</strong> inscripciones a cursos, lecciones completadas,
          respuestas y puntajes de evaluaciones, entregas de tareas, certificados obtenidos, racha de
          estudio e insignias.
        </p>
        <p>
          <strong>Contenido de la comunidad:</strong> preguntas y respuestas que usted publique, votos y
          reportes que emita.
        </p>
        <p>
          <strong>Conversaciones con el tutor de IA:</strong> las preguntas que le hace al tutor, las
          respuestas generadas y su feedback sobre ellas (útil / no útil).
        </p>
        <p>
          <strong>Sesión de exploración anónima:</strong> si navega el catálogo sin cuenta, generamos un
          identificador de sesión temporal (sin datos personales) para recordar su progreso en el
          contenido gratuito. Este identificador expira a los 30 días si no se registra, y se asocia a su
          cuenta si decide registrarse.
        </p>
        <p>
          <strong>Datos técnicos:</strong> el token de sesión (JWT) se guarda en el almacenamiento local
          de su navegador para mantenerlo conectado; registros técnicos necesarios para operar y
          diagnosticar la Plataforma.
        </p>
      </LegalSection>

      <LegalSection title="3. Para qué usamos sus datos">
        <LegalList
          items={[
            'Crear y gestionar su cuenta y su acceso a los cursos.',
            'Calificar evaluaciones y emitir certificados.',
            'Generar respuestas del tutor de IA ancladas al contenido de sus cursos.',
            'Moderar automáticamente el contenido publicado en la Comunidad.',
            'Mostrarle su progreso, racha de estudio e insignias.',
            'Enviarle notificaciones relacionadas con su actividad académica (por ejemplo, que su entrega fue revisada).',
            'Cumplir obligaciones legales.',
          ]}
        />
        <p>
          No utilizamos sus datos para publicidad de terceros ni los vendemos a ninguna empresa externa.
        </p>
      </LegalSection>

      <LegalSection title="4. Con quién compartimos datos">
        <p>
          <strong>Groq, Inc.</strong> (Estados Unidos): procesa el texto de sus preguntas al tutor de IA y
          el contenido publicado en la Comunidad (para la moderación automática) con el único fin de
          generar la respuesta o clasificación correspondiente. No lo utiliza para entrenar sus propios
          modelos.
        </p>
        <p>
          <strong>DigitalOcean, LLC</strong> (Estados Unidos): aloja los servidores y la base de datos de
          la Plataforma, con cifrado en tránsito.
        </p>
        <p>
          Si usted accede a la Plataforma a través de una organización asociada (por ejemplo, una
          federación deportiva con catálogo propio), su progreso en los cursos de esa organización puede
          ser visible para los administradores de esa organización dentro de la Plataforma.
        </p>
        <p>
          No compartimos sus datos con ningún otro tercero, salvo obligación legal o su consentimiento
          explícito. Las transferencias internacionales de datos se realizan bajo las garantías
          contractuales adecuadas.
        </p>
      </LegalSection>

      <LegalSection title="5. Conservación de los datos">
        <LegalList
          items={[
            'Datos de cuenta y progreso académico: mientras su cuenta esté activa.',
            'Certificados: se conservan indefinidamente para permitir su verificación pública mediante el código único, incluso si más adelante elimina su cuenta.',
            'Sesiones de exploración anónima sin registrar: se eliminan automáticamente a los 30 días.',
            'Conversaciones con el tutor de IA y contenido de la Comunidad: mientras su cuenta esté activa; puede solicitar su eliminación anticipada escribiéndonos.',
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Seguridad">
        <p>Aplicamos medidas técnicas y organizativas para proteger sus datos, entre ellas:</p>
        <LegalList
          items={[
            'Cifrado de contraseñas mediante algoritmos de hash seguros.',
            'Comunicación cifrada (HTTPS/TLS) entre la Plataforma y nuestros servidores.',
            'Las respuestas correctas de las evaluaciones nunca se envían al navegador del alumno.',
            'Acceso restringido a los datos personales, bajo el principio de mínimo privilegio.',
          ]}
        />
        <p>
          Ningún sistema es completamente infalible. Si ocurriera una violación de seguridad que afecte
          sus datos, se lo notificaremos conforme a la normativa aplicable.
        </p>
      </LegalSection>

      <LegalSection title="7. Sus derechos">
        <p>Usted tiene los siguientes derechos sobre sus datos personales:</p>
        <LegalList
          items={[
            'Acceso: solicitar una copia de los datos que tenemos sobre usted.',
            'Rectificación: corregir datos inexactos desde su Perfil o contactándonos.',
            'Supresión: solicitar la eliminación de su cuenta y sus datos asociados.',
            'Portabilidad: solicitar sus datos en un formato estructurado.',
            'Oposición y limitación: oponerse o limitar el tratamiento de sus datos en determinadas circunstancias.',
          ]}
        />
        <p>
          Para ejercer cualquiera de estos derechos, escriba a {CONTACT_EMAIL}. Responderemos en un plazo
          máximo de 30 días hábiles. Tenga en cuenta que los certificados ya emitidos permanecen
          verificables por su código público aun si posteriormente elimina su cuenta, dado su propósito de
          acreditación frente a terceros.
        </p>
      </LegalSection>

      <LegalSection title="8. Menores de edad">
        <p>
          {APP_NAME} no está dirigida a personas menores de 18 años. No recopilamos intencionadamente
          datos de menores. Si detecta que un menor nos proporcionó datos sin consentimiento parental,
          escríbanos a {CONTACT_EMAIL} para eliminarlos.
        </p>
      </LegalSection>

      <LegalSection title="9. Cookies y almacenamiento local">
        <p>
          La Plataforma no utiliza cookies de seguimiento ni publicidad de terceros. Utiliza el
          almacenamiento local del navegador (localStorage) para mantener su sesión iniciada y recordar el
          identificador de una sesión de exploración anónima.
        </p>
      </LegalSection>

      <LegalSection title="10. Modificaciones de esta política">
        <p>
          Podemos actualizar esta Política periódicamente. La fecha de la última actualización siempre
          estará visible al inicio de este documento.
        </p>
      </LegalSection>

      <LegalSection title="11. Contacto y reclamaciones">
        <p>
          {COMPANY} — {CONTACT_EMAIL}
        </p>
        <p>
          Si considera que el tratamiento de sus datos no se ajusta a la normativa aplicable, tiene
          derecho a presentar una reclamación ante la autoridad de protección de datos de su país de
          residencia.
        </p>
      </LegalSection>
    </LegalLayout>
  )
}
