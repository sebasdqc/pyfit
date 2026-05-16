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

function TableRow({ label, value, s }: { label: string; value: string; s: Styles }) {
  return (
    <View style={s.tableRow}>
      <Text style={s.tableLabel}>{label}</Text>
      <Text style={s.tableValue}>{value}</Text>
    </View>
  )
}

export default function PrivacidadScreen() {
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
        <Text style={s.headerTitle}>Política de Privacidad</Text>
        <Text style={s.headerSub}>Última actualización: {LAST_UPDATED}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        <Section title="1. Introducción y Responsable del Tratamiento" s={s}>
          <P s={s}>
            {COMPANY} ("la Empresa", "nosotros") es responsable del tratamiento de los datos personales que usted nos proporciona al utilizar la aplicación {APP_NAME} (en adelante, "la Aplicación"). Nos comprometemos a proteger su privacidad y a tratar sus datos personales con transparencia, seguridad y respeto a sus derechos.
          </P>
          <P s={s}>
            Esta Política de Privacidad describe qué datos recopilamos, cómo los usamos, con quién los compartimos, cuánto tiempo los conservamos y qué derechos tiene usted sobre ellos. Al utilizar la Aplicación, usted acepta las prácticas descritas en esta Política.
          </P>
          <P s={s}>
            Para cualquier consulta relacionada con el tratamiento de sus datos, puede contactarnos en: {CONTACT_EMAIL}
          </P>
        </Section>

        <Section title="2. Datos Personales que Recopilamos" s={s}>
          <P s={s}>Recopilamos los siguientes categorías de datos personales:</P>

          <Text style={s.subTitle}>2.1 Datos de identificación y cuenta</Text>
          <Li s={s}>Dirección de correo electrónico (obligatorio para el registro).</Li>
          <Li s={s}>Contraseña (almacenada siempre de forma encriptada; nunca en texto plano).</Li>
          <Li s={s}>Nombre o nombre de usuario.</Li>

          <Text style={s.subTitle}>2.2 Datos de salud y condición física</Text>
          <P s={s}>
            Estos datos son considerados datos sensibles y los tratamos con especial cuidado. Son proporcionados voluntariamente por el Usuario para personalizar los entrenamientos:
          </P>
          <Li s={s}>Datos biométricos: peso, altura, fecha de nacimiento, sexo.</Li>
          <Li s={s}>Marcas de rendimiento: repetición máxima (RM) en sentadilla, peso muerto, press de banca y press de hombro.</Li>
          <Li s={s}>Lesiones activas o pasadas: zona corporal afectada y nivel de severidad.</Li>
          <Li s={s}>Ciclo menstrual: fecha de inicio y duración (completamente opcional).</Li>
          <Li s={s}>Estado de ánimo diario (escala 1-5).</Li>
          <Li s={s}>Calidad del sueño (escala horaria).</Li>
          <Li s={s}>Frecuencia cardíaca variable (HRV) cuando el Usuario la registra manualmente.</Li>
          <Li s={s}>Zonas de dolor corporal reportadas en cada sesión.</Li>

          <Text style={s.subTitle}>2.3 Datos de entrenamiento y actividad</Text>
          <Li s={s}>Historial completo de sesiones de entrenamiento (ejercicios, series, repeticiones, RPE).</Li>
          <Li s={s}>Feedback post-sesión: esfuerzo percibido real, cumplimiento y valoración general.</Li>
          <Li s={s}>Check-ins diarios: estado de ánimo, sueño, foco de entrenamiento y duración disponible.</Li>
          <Li s={s}>Ubicaciones de entrenamiento y equipamiento disponible.</Li>
          <Li s={s}>Objetivos de entrenamiento, estilo y preferencias.</Li>
          <Li s={s}>Competencias o eventos deportivos registrados.</Li>

          <Text style={s.subTitle}>2.4 Datos técnicos</Text>
          <Li s={s}>Tokens de autenticación JWT almacenados de forma segura en el dispositivo.</Li>
          <Li s={s}>Datos de uso de la Aplicación necesarios para su funcionamiento.</Li>
        </Section>

        <Section title="3. Finalidades del Tratamiento" s={s}>
          <P s={s}>Tratamos sus datos personales para las siguientes finalidades:</P>

          <View style={s.tableContainer}>
            <TableRow label="Finalidad" value="Base legal" s={s} />
            <View style={s.tableDivider} />
            <TableRow label="Crear y gestionar su cuenta de usuario" value="Ejecución del contrato" s={s} />
            <TableRow label="Generar planes de entrenamiento personalizados mediante IA" value="Ejecución del contrato" s={s} />
            <TableRow label="Adaptar las recomendaciones a sus lesiones y preferencias" value="Interés legítimo / Consentimiento" s={s} />
            <TableRow label="Procesar datos de salud (ciclo menstrual, HRV)" value="Consentimiento explícito" s={s} />
            <TableRow label="Mejorar el servicio con datos anonimizados y agregados" value="Interés legítimo" s={s} />
            <TableRow label="Enviar comunicaciones relacionadas con el servicio" value="Ejecución del contrato" s={s} />
            <TableRow label="Cumplir obligaciones legales" value="Obligación legal" s={s} />
          </View>

          <P s={s}>
            No utilizamos sus datos para publicidad de terceros, no vendemos sus datos a ninguna empresa externa, y no realizamos perfilado automatizado con fines distintos a la personalización del entrenamiento.
          </P>
        </Section>

        <Section title="4. Datos de Salud — Tratamiento Especial" s={s}>
          <P s={s}>
            Los datos relativos a la salud constituyen una categoría especial de datos personales que requieren protección reforzada. En {APP_NAME} tratamos los siguientes datos de salud únicamente con su consentimiento explícito:
          </P>
          <Li s={s}>Lesiones corporales y su severidad.</Li>
          <Li s={s}>Datos del ciclo menstrual (solo si el Usuario activa esta función voluntariamente).</Li>
          <Li s={s}>Métricas de recuperación como HRV y calidad del sueño.</Li>
          <P s={s}>
            Puede revocar su consentimiento para el tratamiento de estos datos en cualquier momento a través de la sección de Perfil de la Aplicación. La revocación no afectará a la licitud del tratamiento efectuado con anterioridad.
          </P>
        </Section>

        <Section title="5. Transferencia de Datos a Terceros" s={s}>
          <P s={s}>
            Para prestar el servicio, compartimos determinados datos con los siguientes proveedores de confianza:
          </P>

          <Text style={s.subTitle}>5.1 Proveedor de Inteligencia Artificial</Text>
          <P s={s}>
            Groq, Inc. (Estados Unidos): utilizamos los modelos de lenguaje de Groq para generar los planes de entrenamiento personalizados. Los datos del perfil del Usuario (objetivos, nivel, lesiones, métricas de condición física) son procesados por los servidores de Groq exclusivamente para generar las recomendaciones de entrenamiento. Groq no almacena estos datos con fines propios ni los utiliza para entrenar sus modelos. Para más información, consulte la política de privacidad de Groq en groq.com/privacy.
          </P>

          <Text style={s.subTitle}>5.2 Infraestructura y Almacenamiento</Text>
          <P s={s}>
            Railway (Railway Corp., Estados Unidos): proveedor de infraestructura en la nube donde se alojan los servidores y la base de datos de la Aplicación. Los datos se almacenan en servidores con cifrado en reposo y en tránsito.
          </P>

          <Text style={s.subTitle}>5.3 Distribución de la Aplicación</Text>
          <P s={s}>
            Apple App Store y Google Play Store: plataformas de distribución que pueden recopilar datos analíticos básicos del dispositivo de conformidad con sus propias políticas de privacidad.
          </P>

          <P s={s}>
            No compartimos datos personales con ningún otro tercero, salvo obligación legal expresa o con su consentimiento explícito previo.
          </P>

          <P s={s}>
            Las transferencias internacionales de datos (en particular a Estados Unidos) se realizan bajo las garantías adecuadas previstas por la normativa aplicable, incluyendo cláusulas contractuales tipo o mecanismos equivalentes.
          </P>
        </Section>

        <Section title="6. Conservación de los Datos" s={s}>
          <P s={s}>Conservamos sus datos personales durante los siguientes períodos:</P>
          <Li s={s}>Datos de cuenta y perfil: mientras su cuenta esté activa y durante un período de 12 meses adicionales tras la eliminación de la cuenta, para permitir la recuperación en caso de eliminación accidental.</Li>
          <Li s={s}>Datos de entrenamiento e historial: mientras su cuenta esté activa. Tras la eliminación de la cuenta, se eliminan en un plazo máximo de 30 días.</Li>
          <Li s={s}>Datos de salud sensibles (ciclo menstrual, HRV): se eliminan en un plazo de 30 días desde la eliminación de la cuenta o desde la revocación del consentimiento, lo que ocurra primero.</Li>
          <Li s={s}>Registros técnicos (logs): máximo 90 días, utilizados exclusivamente para diagnóstico técnico y seguridad.</Li>
          <Li s={s}>Datos anonimizados y agregados: pueden conservarse indefinidamente al no ser datos personales.</Li>
        </Section>

        <Section title="7. Seguridad de los Datos" s={s}>
          <P s={s}>
            Implementamos medidas técnicas y organizativas apropiadas para proteger sus datos personales contra el acceso no autorizado, la pérdida, la alteración o la divulgación. Estas medidas incluyen:
          </P>
          <Li s={s}>Cifrado de las contraseñas mediante algoritmos de hash seguros (bcrypt o equivalente).</Li>
          <Li s={s}>Comunicaciones cifradas mediante HTTPS/TLS entre la Aplicación y nuestros servidores.</Li>
          <Li s={s}>Almacenamiento seguro de tokens de autenticación en el dispositivo mediante almacenamiento cifrado del sistema operativo (Keychain en iOS, Keystore en Android).</Li>
          <Li s={s}>Acceso restringido a los datos personales por parte del equipo de la Empresa, bajo principio de mínimo privilegio.</Li>
          <Li s={s}>Monitorización continua de la infraestructura para detectar posibles vulnerabilidades o accesos indebidos.</Li>
          <P s={s}>
            No obstante, ningún sistema de seguridad es completamente infalible. En caso de que se produzca una violación de la seguridad que afecte a sus datos, lo notificaremos conforme a los plazos y procedimientos establecidos por la normativa aplicable.
          </P>
        </Section>

        <Section title="8. Sus Derechos" s={s}>
          <P s={s}>
            De conformidad con la normativa de protección de datos aplicable, usted tiene los siguientes derechos sobre sus datos personales:
          </P>
          <Li s={s}>Derecho de acceso: puede solicitar una copia de todos los datos personales que tenemos sobre usted.</Li>
          <Li s={s}>Derecho de rectificación: puede corregir datos inexactos o incompletos directamente desde la sección de Perfil de la Aplicación o contactándonos.</Li>
          <Li s={s}>Derecho de supresión ("derecho al olvido"): puede solicitar la eliminación de su cuenta y todos sus datos asociados.</Li>
          <Li s={s}>Derecho de oposición: puede oponerse al tratamiento de sus datos para determinadas finalidades.</Li>
          <Li s={s}>Derecho a la limitación del tratamiento: puede solicitar que limitemos el uso de sus datos en determinadas circunstancias.</Li>
          <Li s={s}>Derecho a la portabilidad: puede solicitar sus datos en un formato estructurado y legible por máquina.</Li>
          <Li s={s}>Derecho a retirar el consentimiento: puede retirar en cualquier momento el consentimiento para el tratamiento de datos de salud sensibles.</Li>
          <P s={s}>
            Para ejercer cualquiera de estos derechos, contacte a {CONTACT_EMAIL}. Responderemos a su solicitud en un plazo máximo de 30 días hábiles.
          </P>
        </Section>

        <Section title="9. Datos de Menores de Edad" s={s}>
          <P s={s}>
            {APP_NAME} no está dirigida a personas menores de 18 años. No recopilamos intencionadamente datos personales de menores. Si tiene conocimiento de que un menor nos ha proporcionado datos personales sin consentimiento parental, le rogamos que nos lo comunique a {CONTACT_EMAIL} para proceder a su eliminación inmediata.
          </P>
          <P s={s}>
            Si tiene entre 13 y 17 años, debe contar con el consentimiento de su padre, madre o tutor legal para utilizar la Aplicación.
          </P>
        </Section>

        <Section title="10. Cookies y Tecnologías de Seguimiento" s={s}>
          <P s={s}>
            La Aplicación móvil de {APP_NAME} no utiliza cookies. Para el funcionamiento de la autenticación, utilizamos tokens JWT (JSON Web Tokens) almacenados de forma segura en el dispositivo del Usuario mediante el sistema de almacenamiento seguro del sistema operativo.
          </P>
          <P s={s}>
            No utilizamos tecnologías de seguimiento cross-site, píxeles de seguimiento, ni herramientas de análisis de comportamiento de terceros en la Aplicación móvil.
          </P>
        </Section>

        <Section title="11. Modificaciones de esta Política" s={s}>
          <P s={s}>
            Podemos actualizar esta Política de Privacidad periódicamente para reflejar cambios en nuestras prácticas, en la Aplicación o en la normativa aplicable. Le notificaremos sobre cambios sustanciales mediante un aviso en la Aplicación o por correo electrónico con al menos 15 días de antelación.
          </P>
          <P s={s}>
            La fecha de la última actualización siempre estará visible al inicio de esta Política. Le recomendamos revisarla periódicamente.
          </P>
        </Section>

        <Section title="12. Contacto y Reclamaciones" s={s}>
          <P s={s}>
            Para cualquier consulta, solicitud o reclamación relacionada con el tratamiento de sus datos personales, puede contactar con nosotros en:
          </P>
          <P s={s}>{COMPANY}</P>
          <P s={s}>Correo electrónico: {CONTACT_EMAIL}</P>
          <P s={s}>
            Si considera que el tratamiento de sus datos no se ajusta a la normativa aplicable, tiene derecho a presentar una reclamación ante la autoridad de control competente en materia de protección de datos de su país o región de residencia.
          </P>
        </Section>

        <View style={s.footer}>
          <Text style={s.footerText}>
            Su privacidad es nuestra prioridad. En {APP_NAME} creemos que los datos de salud son profundamente personales y los tratamos con el máximo respeto y cuidado.
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
    subTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13,
      color: c.accent,
      marginTop: 6,
      marginBottom: 2,
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
    tableContainer: {
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 12,
      overflow: 'hidden',
      marginVertical: 8,
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 14,
      paddingVertical: 10,
      backgroundColor: c.cardBg,
      gap: 12,
    },
    tableDivider: {
      height: 1,
      backgroundColor: c.accent + '40',
    },
    tableLabel: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 12,
      color: c.inkSecondary,
      flex: 3,
      lineHeight: 18,
    },
    tableValue: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.accent,
      flex: 2,
      lineHeight: 18,
      textAlign: 'right',
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
