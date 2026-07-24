import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import Svg, { Path } from 'react-native-svg'
import { Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { useTranslation } from '../../../lib/i18n'

// ─── Data ─────────────────────────────────────────────────────────────────────
// Autores/año/título/journal de cada cita NO se traducen — son referencias
// bibliográficas reales, se citan igual en los 4 idiomas. Solo se traduce el
// nombre de la categoría (categoriaKey).

const REFERENCIAS = [
  {
    categoriaKey: 'bib_cat_carga',
    color: '#4f8cff',
    items: [
      {
        autores: 'Schoenfeld, B.J.',
        año: '2010',
        titulo: 'The mechanisms of muscle hypertrophy and their application to resistance training',
        journal: 'Journal of Strength and Conditioning Research',
      },
      {
        autores: 'Zourdos, M.C., Klemp, A., Dolan, C. et al.',
        año: '2016',
        titulo: 'Novel resistance training-specific RPE scale measuring repetitions in reserve',
        journal: 'Journal of Strength and Conditioning Research',
      },
      {
        autores: 'Haff, G.G. & Triplett, N.T.',
        año: '2016',
        titulo: 'Essentials of Strength Training and Conditioning (4th ed.)',
        journal: 'NSCA / Human Kinetics',
      },
      {
        autores: 'Helms, E.R., Cronin, J., Storey, A. & Zourdos, M.C.',
        año: '2016',
        titulo: 'Application of the repetitions in reserve-based rating of perceived exertion scale for resistance training',
        journal: 'Strength & Conditioning Journal',
      },
    ],
  },
  {
    categoriaKey: 'bib_cat_recuperacion',
    color: '#32c896',
    items: [
      {
        autores: 'Meeusen, R., Duclos, M., Foster, C. et al.',
        año: '2013',
        titulo: 'Prevention, diagnosis, and treatment of the overtraining syndrome',
        journal: 'European Journal of Sport Science',
      },
      {
        autores: 'Dattilo, M., Antunes, H.K., Medeiros, A. et al.',
        año: '2011',
        titulo: 'Sleep and muscle recovery: endocrinological and molecular basis for a new and promising hypothesis',
        journal: 'Medical Hypotheses',
      },
      {
        autores: 'Fullagar, H.H.K., Skorski, S., Duffield, R. et al.',
        año: '2015',
        titulo: 'Sleep and athletic performance: the effects of sleep loss on exercise performance',
        journal: 'Sports Medicine',
      },
    ],
  },
  {
    categoriaKey: 'bib_cat_bienestar',
    color: '#ffaa32',
    items: [
      {
        autores: 'Kraemer, W.J. & Ratamess, N.A.',
        año: '2005',
        titulo: 'Hormonal responses and adaptations to resistance exercise and training',
        journal: 'Sports Medicine',
      },
      {
        autores: 'Borg, G.',
        año: '1982',
        titulo: 'Psychophysical bases of perceived exertion',
        journal: 'Medicine & Science in Sports & Exercise',
      },
    ],
  },
  {
    categoriaKey: 'bib_cat_ciclo',
    color: '#c084fc',
    items: [
      {
        autores: 'Janse de Jonge, X.A.K.',
        año: '2003',
        titulo: 'Effects of the menstrual cycle on exercise performance',
        journal: 'Sports Medicine',
      },
      {
        autores: 'McNulty, K.L., Elliott-Sale, K.J., Dolan, E. et al.',
        año: '2020',
        titulo: 'The effects of menstrual cycle phase on exercise performance in eumenorrheic women',
        journal: 'Sports Medicine',
      },
    ],
  },
] as const

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function BibliografiaScreen() {
  const { colors } = useTheme()
  const { t } = useTranslation()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg }}>
      <LinearGradient colors={[colors.gradientTop, 'transparent']}
        style={StyleSheet.absoluteFill} pointerEvents="none" />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
            <Path d="M15 18l-6-6 6-6" stroke={colors.inkPrimary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          </Svg>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('bib_header')}</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} showsVerticalScrollIndicator={false}>
        {REFERENCIAS.map(cat => (
          <View key={cat.categoriaKey} style={styles.section}>
            <View style={[styles.catBadge, { borderColor: `${cat.color}44`, backgroundColor: `${cat.color}14` }]}>
              <Text style={[styles.catLabel, { color: cat.color }]}>{t(cat.categoriaKey).toUpperCase()}</Text>
            </View>

            {cat.items.map((ref, i) => (
              <View key={i} style={styles.refCard}>
                <Text style={styles.refTitle}>{ref.titulo}</Text>
                <Text style={styles.refAuthors}>{ref.autores} ({ref.año})</Text>
                <Text style={styles.refJournal}>{ref.journal}</Text>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    header: {
      flexDirection: 'row', alignItems: 'center', gap: 14,
      paddingHorizontal: 20, paddingBottom: 16,
      borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderDefault,
    },
    backBtn: {
      width: 36, height: 36, borderRadius: 18,
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      alignItems: 'center', justifyContent: 'center',
    },
    headerTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, letterSpacing: -0.5, flex: 1 },
    section: { marginBottom: 28 },
    catBadge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 8, borderWidth: 1,
      marginBottom: 12,
    },
    catLabel: {
      fontFamily: 'JetBrainsMono-Regular', fontSize: 9,
      letterSpacing: 1.5, textTransform: 'uppercase',
    },
    refCard: {
      backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault,
      borderRadius: 14, padding: 16, marginBottom: 10, gap: 5,
    },
    refTitle: {
      color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 13, lineHeight: 20, letterSpacing: -0.2,
    },
    refAuthors: {
      color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 12,
    },
    refJournal: {
      color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular',
      fontSize: 9, letterSpacing: 0.3, textTransform: 'uppercase',
    },
  })
}
