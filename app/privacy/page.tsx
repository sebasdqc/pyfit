import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Política de Privacidad — Zyfit',
  description: 'Política de privacidad de la aplicación Zyfit. Conoce cómo recopilamos, usamos y protegemos tu información personal.',
}

const LAST_UPDATED = '18 de junio de 2026'
const CONTACT_EMAIL = 'privacidad@zyfit.app'
const APP_NAME = 'Zyfit'
const COMPANY = 'Zyfit'

export default function PrivacyPolicy() {
  return (
    <main style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <header style={styles.header}>
          <img src="/logo-zyfit.png" alt="Zyfit" style={styles.logo} />
          <h1 style={styles.h1}>Política de Privacidad</h1>
          <p style={styles.subtitle}>Última actualización: {LAST_UPDATED}</p>
        </header>

        <div style={styles.intro}>
          <p>
            En <strong>{COMPANY}</strong> nos comprometemos a proteger tu privacidad. Esta Política de Privacidad
            describe qué datos recopilamos a través de la aplicación <strong>{APP_NAME}</strong> (disponible en
            iOS y Android), cómo los usamos, con quién los compartimos y cuáles son tus derechos. Al usar
            la app, aceptas las prácticas descritas en este documento.
          </p>
        </div>

        <Section number="1" title="Información que recopilamos">

          <SubSection title="1.1 Información de cuenta">
            <ul>
              <li><strong>Correo electrónico y contraseña</strong> — para crear y acceder a tu cuenta.</li>
              <li><strong>Nombre</strong> — para personalizar la experiencia y la comunicación dentro de la app.</li>
              <li><strong>Foto de perfil</strong> (opcional) — si decides subirla desde tu galería.</li>
            </ul>
          </SubSection>

          <SubSection title="1.2 Perfil físico y de salud">
            <p>Para generar rutinas de entrenamiento personalizadas recopilamos:</p>
            <ul>
              <li>Fecha de nacimiento, sexo biológico, peso y altura.</li>
              <li>Objetivo de entrenamiento (pérdida de grasa, ganancia muscular, rendimiento deportivo, salud general, etc.).</li>
              <li>Nivel de experiencia, estilo de entrenamiento preferido y días disponibles por semana.</li>
              <li>Lesiones o limitaciones físicas declaradas.</li>
              <li>Condiciones médicas declaradas y notas médicas adicionales.</li>
              <li>Ejercicios favoritos y ejercicios a evitar.</li>
              <li>Marcadores de rendimiento (1RM de sentadilla, peso muerto, press banca y press hombro), introducidos voluntariamente.</li>
              <li>Información sobre el ciclo menstrual (opcional, solo si el usuario activa esta función).</li>
              <li>Nivel de estrés habitual y tipo de trabajo (sedentario, mixto o activo).</li>
              <li>Horario de entrenamiento preferido.</li>
            </ul>
          </SubSection>

          <SubSection title="1.3 Datos de check-in diario">
            <p>Cada vez que realizas un check-in antes de entrenar recopilamos:</p>
            <ul>
              <li>Estado de ánimo (escala 1-5).</li>
              <li>Calidad de sueño (horas).</li>
              <li>Variabilidad de frecuencia cardíaca — HRV (opcional, introducido manualmente).</li>
              <li>Dolor o molestia del día (texto libre, opcional).</li>
              <li>Foco de entrenamiento del día.</li>
              <li>Duración disponible para entrenar.</li>
              <li>Notas personales (texto libre, opcional).</li>
            </ul>
          </SubSection>

          <SubSection title="1.4 Datos de entrenamiento">
            <ul>
              <li>Sesiones generadas: título, fases, ejercicios, series, repeticiones, descansos y RPE.</li>
              <li>Ejecución de ejercicios: peso levantado, repeticiones completadas y series reales.</li>
              <li>Feedback post-sesión: RPE real, cumplimiento (0-100%), calificación (1-5) y notas.</li>
              <li>Historial de sesiones, racha de entrenamiento y estadísticas de adherencia.</li>
              <li>Competiciones o eventos deportivos registrados voluntariamente.</li>
            </ul>
          </SubSection>

          <SubSection title="1.5 Datos de ubicación">
            <p>
              <strong>Ubicación precisa (GPS) — en primer plano y en segundo plano.</strong> La función
              "Free Run" registra tu recorrido GPS durante una sesión de carrera al aire libre. La app
              solicita acceso a la ubicación en segundo plano para que el tracking continúe cuando la
              pantalla está apagada o cuando cambias de aplicación. La ubicación se usa exclusivamente para:
            </p>
            <ul>
              <li>Trazar el recorrido de tu carrera en el mapa.</li>
              <li>Calcular distancia recorrida, ritmo, velocidad y desnivel acumulado.</li>
            </ul>
            <p>
              <strong>La ubicación NO se comparte con terceros con fines publicitarios ni de seguimiento.</strong> Los
              datos de ubicación se almacenan asociados a tu sesión de carrera y puedes eliminarlos borrando
              la sesión.
            </p>
            <p>
              También recopilamos tus <strong>ubicaciones de entrenamiento guardadas</strong> (nombre, tipo —
              gimnasio, casa o exterior — e implementos disponibles) para contextualizar la generación de rutinas.
            </p>
          </SubSection>

          <SubSection title="1.6 Datos de uso y técnicos">
            <ul>
              <li>Identificador único de dispositivo y sistema operativo.</li>
              <li>Versión de la app instalada.</li>
              <li>Registros de errores y eventos de diagnóstico (a través de Sentry, ver sección 3).</li>
              <li>Fecha y hora de las acciones principales dentro de la app.</li>
            </ul>
          </SubSection>

        </Section>

        <Section number="2" title="Cómo usamos tu información">
          <p>Usamos los datos recopilados para los siguientes fines:</p>
          <ul>
            <li><strong>Generar rutinas de entrenamiento personalizadas con IA</strong> — el conjunto completo del perfil, check-in diario e historial de sesiones se envía a nuestro motor de IA para diseñar una sesión adaptada a tu estado físico y objetivos del día.</li>
            <li><strong>Personalizar la experiencia</strong> — adaptar recomendaciones, notificaciones y contenido según tus preferencias y progreso.</li>
            <li><strong>Calcular métricas de rendimiento</strong> — fatiga acumulada, volumen semanal, ACWR, adherencia, racha y nivel de gamificación.</li>
            <li><strong>Registrar el historial de entrenamientos</strong> — para que puedas consultar tu evolución a lo largo del tiempo.</li>
            <li><strong>Mejorar la app</strong> — análisis de errores y patrones de uso agregados para optimizar el producto.</li>
            <li><strong>Comunicación de servicio</strong> — envío de correos transaccionales (confirmación de registro, recuperación de contraseña).</li>
            <li><strong>Seguridad y prevención de fraude</strong> — detección de actividad inusual en las cuentas.</li>
          </ul>
          <p>
            <strong>No usamos tus datos para publicidad dirigida ni los vendemos a terceros.</strong>
          </p>
        </Section>

        <Section number="3" title="Terceros que reciben tus datos">

          <SubSection title="3.1 Groq (motor de IA)">
            <p>
              Para generar tu rutina de entrenamiento, enviamos a <strong>Groq, Inc.</strong> el contexto de tu
              sesión: perfil físico, estado del día (check-in), historial reciente de entrenamientos y
              parámetros de la sesión. Este contexto se envía en forma de texto estructurado y no incluye
              tu nombre completo, correo electrónico ni información de identificación directa.
              Groq procesa la solicitud y devuelve la rutina generada; no almacena tus datos de forma
              persistente según sus términos de servicio. Más información:{' '}
              <a href="https://groq.com/privacy-policy" style={styles.link} target="_blank" rel="noopener noreferrer">groq.com/privacy-policy</a>.
            </p>
          </SubSection>

          <SubSection title="3.2 Sentry (diagnóstico de errores)">
            <p>
              Usamos <strong>Sentry</strong> para registrar errores técnicos que ocurren mientras usas la app.
              Los reportes incluyen información del dispositivo, versión de la app, tipo de error y traza de
              código. <strong>Las contraseñas, tokens de autenticación y cualquier credencial son eliminados
              automáticamente antes de enviarse a Sentry.</strong> Más información:{' '}
              <a href="https://sentry.io/privacy/" style={styles.link} target="_blank" rel="noopener noreferrer">sentry.io/privacy</a>.
            </p>
          </SubSection>

          <SubSection title="3.3 DigitalOcean (infraestructura de servidor)">
            <p>
              Nuestro backend y base de datos están alojados en <strong>DigitalOcean</strong>. Todos tus datos
              se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo. Más
              información:{' '}
              <a href="https://www.digitalocean.com/legal/privacy-policy" style={styles.link} target="_blank" rel="noopener noreferrer">digitalocean.com/legal/privacy-policy</a>.
            </p>
          </SubSection>

          <SubSection title="3.4 Google Sign-In (inicio de sesión opcional)">
            <p>
              Si eliges iniciar sesión con Google, tu cuenta de Google comparte con {APP_NAME} tu nombre,
              correo electrónico y foto de perfil pública. No recibimos tu contraseña de Google. Más
              información:{' '}
              <a href="https://policies.google.com/privacy" style={styles.link} target="_blank" rel="noopener noreferrer">policies.google.com/privacy</a>.
            </p>
          </SubSection>

        </Section>

        <Section number="4" title="Retención de datos">
          <ul>
            <li><strong>Datos de cuenta y perfil</strong> — se conservan mientras tu cuenta esté activa. Al eliminar tu cuenta, todos tus datos personales son eliminados en un plazo máximo de 30 días.</li>
            <li><strong>Sesiones de entrenamiento</strong> — se conservan durante toda la vida de la cuenta para mantener tu historial. Puedes eliminar sesiones individuales en cualquier momento desde la app.</li>
            <li><strong>Tokens de autenticación</strong> — los tokens de acceso expiran tras 1 hora. Los tokens de actualización expiran tras 14 días y se invalidan automáticamente al hacer login en un nuevo dispositivo o al cerrar sesión.</li>
            <li><strong>Logs de errores (Sentry)</strong> — se retienen según la política de Sentry (máximo 90 días en el plan actual).</li>
            <li><strong>Datos de ubicación GPS</strong> — se almacenan asociados a la sesión de carrera correspondiente. Se eliminan junto con la sesión si el usuario la borra.</li>
          </ul>
        </Section>

        <Section number="5" title="Seguridad">
          <p>Implementamos las siguientes medidas técnicas para proteger tu información:</p>
          <ul>
            <li>Todas las comunicaciones entre la app y el servidor se cifran con <strong>TLS 1.2+</strong>.</li>
            <li>Las contraseñas se almacenan utilizando <strong>hashing seguro</strong> (PBKDF2 con SHA-256, estándar de Django).</li>
            <li>La autenticación usa <strong>JWT firmados</strong> con rotación automática y lista negra de tokens invalidados.</li>
            <li>Los tokens de autenticación se almacenan en el <strong>almacenamiento seguro cifrado</strong> del dispositivo (iOS Keychain / Android Keystore).</li>
            <li>Los endpoints de la API tienen <strong>límites de velocidad (rate limiting)</strong> para prevenir ataques de fuerza bruta.</li>
            <li>Los datos sensibles se eliminan de los logs de diagnóstico antes de ser enviados a servicios externos.</li>
          </ul>
          <p>
            Aunque implementamos medidas razonables de seguridad, ningún sistema es 100% invulnerable.
            Si detectas una vulnerabilidad, repórtala a <a href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>{CONTACT_EMAIL}</a>.
          </p>
        </Section>

        <Section number="6" title="Tus derechos">
          <p>Dependiendo de tu jurisdicción, tienes los siguientes derechos sobre tus datos personales:</p>
          <ul>
            <li><strong>Acceso</strong> — solicitar una copia de los datos personales que tenemos sobre ti.</li>
            <li><strong>Rectificación</strong> — corregir datos inexactos o incompletos (puedes hacerlo directamente desde la sección "Perfil" de la app).</li>
            <li><strong>Eliminación</strong> — solicitar la eliminación de tu cuenta y todos tus datos asociados.</li>
            <li><strong>Portabilidad</strong> — solicitar una exportación de tus datos en formato legible por máquina.</li>
            <li><strong>Oposición</strong> — oponerte al procesamiento de tus datos para ciertos fines.</li>
            <li><strong>Retirar el consentimiento</strong> — retirar permisos como el acceso a ubicación en cualquier momento desde los ajustes del sistema operativo.</li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, contáctanos en{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>{CONTACT_EMAIL}</a>.
            Responderemos en un plazo máximo de 30 días.
          </p>
        </Section>

        <Section number="7" title="Datos de menores">
          <p>
            {APP_NAME} está dirigida a personas mayores de 16 años. No recopilamos intencionadamente
            datos personales de menores de 16 años. Si eres padre, madre o tutor y crees que tu hijo
            ha proporcionado datos personales, contáctanos en{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>{CONTACT_EMAIL}</a> y eliminaremos
            esa información a la brevedad.
          </p>
        </Section>

        <Section number="8" title="Transferencias internacionales de datos">
          <p>
            Tus datos pueden ser procesados en servidores ubicados fuera de tu país de residencia.
            En particular, Groq, Inc. opera en Estados Unidos. Al usar la app aceptas estas transferencias,
            que se realizan con garantías técnicas adecuadas (cifrado TLS en tránsito, acuerdos de
            procesamiento de datos).
          </p>
        </Section>

        <Section number="9" title="Cambios a esta política">
          <p>
            Podemos actualizar esta Política de Privacidad periódicamente. Cuando hagamos cambios
            significativos, te notificaremos a través de la app o por correo electrónico con al menos
            7 días de anticipación. La fecha de la última actualización aparece en la parte superior
            de este documento. El uso continuado de la app tras la entrada en vigencia de los cambios
            constituye tu aceptación de la política actualizada.
          </p>
        </Section>

        <Section number="10" title="Contacto">
          <p>Si tienes preguntas, solicitudes o inquietudes sobre esta Política de Privacidad o el tratamiento de tus datos, contáctanos:</p>
          <div style={styles.contactBox}>
            <p><strong>{COMPANY}</strong></p>
            <p>Email: <a href={`mailto:${CONTACT_EMAIL}`} style={styles.link}>{CONTACT_EMAIL}</a></p>
          </div>
        </Section>

        <footer style={styles.footer}>
          <p>© {new Date().getFullYear()} {COMPANY}. Todos los derechos reservados.</p>
          <p style={{ marginTop: 4 }}>Esta política aplica a la aplicación móvil Zyfit (iOS y Android).</p>
        </footer>

      </div>
    </main>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Section({ number, title, children }: { number: string; title: string; children: React.ReactNode }) {
  return (
    <section style={styles.section}>
      <h2 style={styles.h2}>{number}. {title}</h2>
      {children}
    </section>
  )
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={styles.subsection}>
      <h3 style={styles.h3}>{title}</h3>
      {children}
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    backgroundColor: '#f9fafb',
    minHeight: '100vh',
    padding: '40px 16px 80px',
    // globals.css pone color: var(--ink) (casi blanco) en el body; sin esto el
    // cuerpo del texto se hereda blanco sobre la tarjeta blanca y no se lee.
    color: '#1f2937',
    fontSize: 15,
    lineHeight: 1.7,
  },
  container: {
    maxWidth: 820,
    margin: '0 auto',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
    padding: '48px 56px',
  },
  header: {
    textAlign: 'center',
    marginBottom: 40,
    paddingBottom: 32,
    borderBottom: '1px solid #e5e7eb',
  },
  logo: {
    height: 40,
    marginBottom: 20,
  },
  h1: {
    fontSize: 32,
    fontWeight: 700,
    color: '#111827',
    margin: '0 0 8px',
    letterSpacing: '-0.5px',
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    margin: 0,
  },
  intro: {
    backgroundColor: '#f0f7ff',
    border: '1px solid #bfdbfe',
    borderRadius: 8,
    padding: '16px 20px',
    marginBottom: 40,
    fontSize: 15,
    lineHeight: 1.7,
    color: '#1e40af',
  },
  section: {
    marginBottom: 40,
    paddingBottom: 40,
    borderBottom: '1px solid #f3f4f6',
  },
  h2: {
    fontSize: 20,
    fontWeight: 700,
    color: '#111827',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottom: '2px solid #2563ff',
    display: 'inline-block',
  },
  subsection: {
    marginTop: 20,
    paddingLeft: 16,
    borderLeft: '1px solid #e5e7eb',
  },
  h3: {
    fontSize: 16,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 10,
  },
  contactBox: {
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '16px 20px',
    marginTop: 12,
  },
  link: {
    color: '#2563ff',
    textDecoration: 'underline',
  },
  footer: {
    textAlign: 'center',
    marginTop: 40,
    paddingTop: 24,
    borderTop: '1px solid #f3f4f6',
    color: '#6b7280',
    fontSize: 13,
  },
}
