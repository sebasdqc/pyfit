import React from 'react'
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'

const LAST_UPDATED = '14 de mayo de 2026'
const COMPANY = 'Zyfit Technologies'
const APP_NAME = 'Zyfit'
const CONTACT_EMAIL = 'legal@zyfit.app'

type Styles = ReturnType<typeof makeStyles>

function Section({ title, children, s }: { title: string; children: React.ReactNode; s: Styles }) {
  return (
    <View style={s.section}>
      <Text style={s.sectionTitle}>{title}</Text>
      {children}
    </View>
  )
}

function P({ children, s }: { children: React.ReactNode; s: Styles }) {
  return <Text style={s.body}>{children}</Text>
}

function Li({ children, s }: { children: React.ReactNode; s: Styles }) {
  return (
    <View style={s.liRow}>
      <Text style={s.liBullet}>•</Text>
      <Text style={s.liText}>{children}</Text>
    </View>
  )
}

export default function TerminosScreen() {
  const { colors } = useTheme()
  const s = React.useMemo(() => makeStyles(colors), [colors])

  return (
    <View style={s.root}>
      <LinearGradient
        colors={[colors.gradientTop, 'transparent']}
        style={s.gradient}
      />

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Términos de Servicio</Text>
        <Text style={s.headerSub}>Última actualización: {LAST_UPDATED}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        <Section title="1. Aceptación de los Términos" s={s}>
          <P s={s}>
            Al descargar, instalar o utilizar la aplicación {APP_NAME} (en adelante, "la Aplicación"), usted acepta quedar vinculado por estos Términos de Servicio ("Términos"). Si no está de acuerdo con alguno de estos términos, no debe utilizar la Aplicación.
          </P>
          <P s={s}>
            Estos Términos constituyen un acuerdo legal vinculante entre usted ("Usuario") y {COMPANY} ("la Empresa", "nosotros"). El uso continuado de la Aplicación después de cualquier modificación de estos Términos constituye su aceptación de los nuevos términos.
          </P>
        </Section>

        <Section title="2. Descripción del Servicio" s={s}>
          <P s={s}>
            {APP_NAME} es una plataforma de entrenamiento físico personalizado asistida por inteligencia artificial. La Aplicación genera planes de entrenamiento adaptados a las características, objetivos y condición física del Usuario, utilizando datos proporcionados por el propio Usuario y tecnología de IA de terceros.
          </P>
          <P s={s}>Los servicios incluyen, entre otros:</P>
          <Li s={s}>Generación automatizada de rutinas de entrenamiento personalizadas mediante IA.</Li>
          <Li s={s}>Seguimiento del progreso físico y métricas de rendimiento.</Li>
          <Li s={s}>Registro de sesiones de entrenamiento y feedback post-entrenamiento.</Li>
          <Li s={s}>Análisis adaptativo basado en el historial de entrenamientos del Usuario.</Li>
          <Li s={s}>Gestión de datos de salud como peso, altura, frecuencia cardíaca variable (HRV) y ciclo menstrual (de forma opcional).</Li>
        </Section>

        <Section title="3. Programa Beta — Condiciones Especiales" s={s}>
          <P s={s}>
            Actualmente, {APP_NAME} se encuentra en fase de acceso anticipado (Beta). Al participar en este programa, el Usuario reconoce y acepta que:
          </P>
          <Li s={s}>La Aplicación puede contener errores, fallos o comportamientos inesperados propios de una versión en desarrollo.</Li>
          <Li s={s}>Las funcionalidades pueden cambiar, añadirse o eliminarse sin previo aviso.</Li>
          <Li s={s}>El acceso completo a todas las funcionalidades durante la fase Beta es gratuito y puede estar sujeto a condiciones comerciales en versiones futuras.</Li>
          <Li s={s}>El Usuario acepta proporcionar retroalimentación honesta sobre su experiencia con la Aplicación, lo cual es fundamental para el desarrollo del producto.</Li>
          <Li s={s}>La Empresa no garantiza disponibilidad continua del servicio durante esta fase.</Li>
        </Section>

        <Section title="4. Registro y Cuenta de Usuario" s={s}>
          <P s={s}>
            Para utilizar la Aplicación, el Usuario debe crear una cuenta proporcionando una dirección de correo electrónico válida y una contraseña. El Usuario es responsable de:
          </P>
          <Li s={s}>Mantener la confidencialidad de sus credenciales de acceso.</Li>
          <Li s={s}>Notificar de inmediato a la Empresa cualquier acceso no autorizado a su cuenta.</Li>
          <Li s={s}>Toda actividad que ocurra bajo su cuenta, independientemente de si fue realizada por el Usuario o por un tercero.</Li>
          <Li s={s}>Proporcionar información veraz, actualizada y completa durante el registro y uso de la Aplicación.</Li>
          <P s={s}>
            La Empresa se reserva el derecho de suspender o cancelar cuentas que infrinjan estos Términos, que proporcionen información falsa, o cuyo uso sea considerado abusivo o perjudicial para otros usuarios o para el servicio.
          </P>
        </Section>

        <Section title="5. Aviso de Salud y Exención de Responsabilidad Médica" s={s}>
          <P s={s}>
            ESTE APARTADO ES ESPECIALMENTE IMPORTANTE. LEA DETENIDAMENTE.
          </P>
          <P s={s}>
            {APP_NAME} es una herramienta de apoyo al entrenamiento físico y no constituye en ningún caso un dispositivo médico, un servicio de salud, ni proporciona asesoramiento médico, diagnóstico o tratamiento de ningún tipo.
          </P>
          <Li s={s}>Consulte siempre a un médico o profesional de la salud antes de iniciar cualquier programa de ejercicio, especialmente si padece o sospecha que padece alguna condición de salud, lesión o enfermedad.</Li>
          <Li s={s}>Las recomendaciones de entrenamiento generadas por la Aplicación son de carácter general y orientativo. No sustituyen la supervisión de un entrenador personal certificado ni de un profesional médico.</Li>
          <Li s={s}>El Usuario asume plena responsabilidad por su seguridad durante la realización de los ejercicios recomendados por la Aplicación.</Li>
          <Li s={s}>Si experimenta dolor, mareos, dificultad para respirar o cualquier malestar durante el ejercicio, deténgase de inmediato y busque atención médica.</Li>
          <Li s={s}>La gestión de lesiones en la Aplicación tiene como único propósito adaptar las recomendaciones de entrenamiento para evitar ejercicios contraindicados. No reemplaza el diagnóstico ni el tratamiento médico profesional.</Li>
          <P s={s}>
            La Empresa no será responsable de lesiones, daños a la salud, o cualquier consecuencia adversa derivada del uso de los planes de entrenamiento generados por la Aplicación.
          </P>
        </Section>

        <Section title="6. Uso Aceptable" s={s}>
          <P s={s}>El Usuario se compromete a utilizar la Aplicación únicamente para los fines previstos y de conformidad con estos Términos. Queda expresamente prohibido:</P>
          <Li s={s}>Utilizar la Aplicación para fines ilegales o no autorizados.</Li>
          <Li s={s}>Intentar acceder a datos de otros usuarios o a sistemas no autorizados de la Aplicación.</Li>
          <Li s={s}>Reproducir, distribuir, modificar o crear obras derivadas de la Aplicación sin autorización expresa.</Li>
          <Li s={s}>Introducir virus, malware u otro código malicioso en la Aplicación.</Li>
          <Li s={s}>Utilizar medios automatizados para acceder, extraer o recopilar datos de la Aplicación.</Li>
          <Li s={s}>Compartir su cuenta con terceros o permitir el acceso no autorizado a la misma.</Li>
          <Li s={s}>Suplantar la identidad de otra persona o entidad.</Li>
        </Section>

        <Section title="7. Inteligencia Artificial y Contenido Generado" s={s}>
          <P s={s}>
            Los planes de entrenamiento y recomendaciones generados por {APP_NAME} son producidos mediante sistemas de inteligencia artificial. El Usuario reconoce que:
          </P>
          <Li s={s}>El contenido generado por IA es de naturaleza probabilística y puede contener imprecisiones o no adaptarse perfectamente a las necesidades individuales de cada Usuario.</Li>
          <Li s={s}>La calidad y precisión de las recomendaciones depende directamente de la exactitud y completitud de los datos proporcionados por el Usuario.</Li>
          <Li s={s}>La Empresa utiliza proveedores externos de IA (actualmente Groq, Inc.) para el procesamiento de datos necesario para generar los planes de entrenamiento. Al utilizar la Aplicación, el Usuario consiente el procesamiento de sus datos por parte de dichos proveedores en los términos descritos en nuestra Política de Privacidad.</Li>
          <Li s={s}>La Empresa no garantiza que el contenido generado por IA sea siempre preciso, completo o adecuado para las circunstancias específicas del Usuario.</Li>
        </Section>

        <Section title="8. Propiedad Intelectual" s={s}>
          <P s={s}>
            Todo el contenido, diseño, código fuente, interfaces, algoritmos, marcas, logotipos y demás elementos de la Aplicación son propiedad exclusiva de {COMPANY} o de sus licenciantes, y están protegidos por las leyes aplicables de propiedad intelectual e industrial.
          </P>
          <P s={s}>
            El presente acuerdo no le otorga ningún derecho de propiedad sobre la Aplicación ni sobre su contenido. Se le concede únicamente una licencia limitada, no exclusiva, no transferible y revocable para utilizar la Aplicación en su dispositivo personal, exclusivamente para los fines descritos en estos Términos.
          </P>
          <P s={s}>
            Los datos y estadísticas de entrenamiento generados por el Usuario dentro de la Aplicación son propiedad del Usuario. La Empresa puede utilizar estos datos de forma anonimizada y agregada para mejorar el servicio, tal como se describe en la Política de Privacidad.
          </P>
        </Section>

        <Section title="9. Limitación de Responsabilidad" s={s}>
          <P s={s}>
            En la máxima medida permitida por la ley aplicable, {COMPANY} no será responsable por:
          </P>
          <Li s={s}>Daños directos, indirectos, incidentales, especiales, consecuentes o punitivos derivados del uso o la imposibilidad de uso de la Aplicación.</Li>
          <Li s={s}>Pérdida de datos, interrupciones del servicio, errores técnicos o fallas en la seguridad que escapen a su control razonable.</Li>
          <Li s={s}>Daños físicos, lesiones o problemas de salud derivados de la realización de los ejercicios recomendados por la Aplicación.</Li>
          <Li s={s}>Acciones u omisiones de proveedores de servicios externos, incluyendo proveedores de IA, servicios de almacenamiento en la nube o plataformas de distribución.</Li>
          <P s={s}>
            La responsabilidad total de la Empresa hacia el Usuario, por cualquier causa y con independencia de la forma de la acción, se limitará en todo caso al importe abonado por el Usuario por el uso de la Aplicación en los doce (12) meses anteriores al evento que origina la reclamación.
          </P>
        </Section>

        <Section title="10. Privacidad y Protección de Datos" s={s}>
          <P s={s}>
            El tratamiento de sus datos personales se rige por nuestra Política de Privacidad, que forma parte integrante de estos Términos. Al aceptar estos Términos, el Usuario también acepta la Política de Privacidad. Le recomendamos que la lea detenidamente antes de utilizar la Aplicación.
          </P>
        </Section>

        <Section title="11. Modificaciones del Servicio y los Términos" s={s}>
          <P s={s}>
            La Empresa se reserva el derecho de modificar, suspender o discontinuar la Aplicación, o cualquier parte de ella, en cualquier momento, con o sin previo aviso. Asimismo, la Empresa puede actualizar estos Términos en cualquier momento. Las modificaciones entrarán en vigor en el momento de su publicación en la Aplicación.
          </P>
          <P s={s}>
            El uso continuado de la Aplicación tras la publicación de los Términos modificados constituirá la aceptación de dichos cambios. Si no está de acuerdo con los nuevos términos, debe dejar de utilizar la Aplicación.
          </P>
        </Section>

        <Section title="12. Terminación" s={s}>
          <P s={s}>
            El Usuario puede cancelar su cuenta y dejar de utilizar la Aplicación en cualquier momento. La Empresa puede suspender o cancelar el acceso del Usuario a la Aplicación de forma inmediata si considera que el Usuario ha incumplido estos Términos o si el servicio es discontinuado.
          </P>
          <P s={s}>
            Tras la terminación, todos los datos del Usuario podrán ser eliminados de conformidad con lo establecido en la Política de Privacidad, salvo que la ley aplicable exija su conservación durante un período determinado.
          </P>
        </Section>

        <Section title="13. Ley Aplicable y Jurisdicción" s={s}>
          <P s={s}>
            Estos Términos se regirán e interpretarán de conformidad con las leyes aplicables en la jurisdicción donde {COMPANY} se encuentre legalmente constituida. Cualquier controversia que surja en relación con estos Términos se someterá a la jurisdicción exclusiva de los tribunales competentes de dicha jurisdicción.
          </P>
          <P s={s}>
            En la medida en que la ley aplicable lo permita, las partes renuncian a cualquier derecho a juicio por jurado en relación con cualquier disputa, reclamación o acción que surja de o esté relacionada con estos Términos.
          </P>
        </Section>

        <Section title="14. Contacto" s={s}>
          <P s={s}>
            Si tiene preguntas, inquietudes o comentarios sobre estos Términos de Servicio, puede ponerse en contacto con nosotros en:
          </P>
          <P s={s}>{COMPANY}</P>
          <P s={s}>Correo electrónico: {CONTACT_EMAIL}</P>
        </Section>

        <View style={s.footer}>
          <Text style={s.footerText}>
            Al utilizar {APP_NAME}, confirma que ha leído, comprendido y aceptado estos Términos de Servicio en su totalidad.
          </Text>
        </View>

      </ScrollView>
    </View>
  )
}

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 300,
    },
    header: {
      paddingTop: 56,
      paddingHorizontal: 24,
      paddingBottom: 20,
      borderBottomWidth: 1,
      borderBottomColor: c.borderDefault,
    },
    backBtn: {
      marginBottom: 16,
    },
    backText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 14,
      color: c.accent,
    },
    headerTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      color: c.inkPrimary,
      letterSpacing: -0.5,
      marginBottom: 4,
    },
    headerSub: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 0.5,
    },
    scroll: {
      flex: 1,
    },
    content: {
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 60,
      gap: 8,
    },
    section: {
      marginBottom: 24,
      gap: 10,
    },
    sectionTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 15,
      color: c.inkPrimary,
      letterSpacing: -0.2,
      marginBottom: 4,
    },
    body: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 22,
    },
    liRow: {
      flexDirection: 'row',
      gap: 10,
      paddingLeft: 4,
    },
    liBullet: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.accent,
      lineHeight: 22,
      marginTop: 1,
    },
    liText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkSecondary,
      lineHeight: 22,
      flex: 1,
    },
    footer: {
      marginTop: 16,
      padding: 16,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
    },
    footerText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
      lineHeight: 20,
      textAlign: 'center',
    },
  })
}
