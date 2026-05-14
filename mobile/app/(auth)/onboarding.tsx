import React, { useState, useMemo } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native'
import DateTimePicker from '@react-native-community/datetimepicker'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../lib/colors'
import { useTheme } from '../../lib/theme'
import { apiPut, apiPost } from '../../lib/api'
import { getUser, saveUser } from '../../lib/storage'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Location {
  nombre: string
  tipo: string
  implementos: string[]
}

interface Injury {
  zona: string
  severidad: string
}

interface OnboardingData {
  // Step 1
  nombre: string
  objetivos: string[]
  nivel: string
  experiencia_deportiva: string
  lesiones: Injury[]
  // Step 2
  sexo: string
  peso: string
  unidad_peso: 'kg' | 'lb'
  altura: string
  unidad_altura: 'cm' | 'ft'
  fecha_nacimiento: string
  usa_ciclo_menstrual: boolean
  // Step 3
  dias_semana: number
  horario_preferido: string
  nivel_estres: string
  tipo_trabajo: string
  // Step 4
  estilo_entrenamiento: string
  ejercicios_favoritos: string
  ejercicios_evitar: string
  rm_sentadilla: string
  rm_peso_muerto: string
  rm_press_banca: string
  rm_press_hombro: string
  // Step 5
  locations: Location[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OBJETIVOS = ['Perder grasa', 'Ganar músculo', 'Rendimiento deportivo', 'Resistencia', 'Salud general']
const NIVELES = ['Principiante', 'Intermedio', 'Avanzado']
const SEXOS = ['Masculino', 'Femenino', 'Otro']
const HORARIOS = ['Mañana', 'Tarde', 'Noche']
const ESTRES = ['Bajo', 'Moderado', 'Alto']
const TRABAJOS = ['Sedentario', 'Mixto', 'Activo']
const ESTILOS = ['Fuerza', 'Hipertrofia', 'HIIT', 'Funcional', 'Cardio', 'Mixto']
const TIPOS_LUGAR = ['Gimnasio', 'Casa', 'Exterior']
const IMPLEMENTOS = ['Barras', 'Mancuernas', 'Máquinas', 'TRX', 'Kettlebells', 'Bandas elásticas', 'Cajón pliométrico', 'Anillas']
const DIAS = [1, 2, 3, 4, 5, 6, 7]

const ZONAS_LESION = ['Rodilla', 'Lumbar', 'Hombro', 'Cuello', 'Cadera', 'Tobillo', 'Muñeca', 'Codo']
const SEVERIDADES = ['Leve', 'Moderada', 'Crónica']

const LISTA_EJERCICIOS = [
  'Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla sumo', 'Sentadilla goblet',
  'Sentadilla búlgara', 'Sentadilla hack', 'Peso muerto convencional', 'Peso muerto rumano',
  'Peso muerto sumo', 'Peso muerto con mancuernas', 'Press banca plano', 'Press banca inclinado',
  'Press banca declinado', 'Press banca con mancuernas', 'Aperturas con mancuernas',
  'Fondos en paralelas', 'Press militar con barra', 'Press hombro con mancuernas',
  'Elevaciones laterales', 'Elevaciones frontales', 'Face pull', 'Pájaros',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna',
  'Remo en polea', 'Pull over', 'Curl de bíceps con barra', 'Curl de bíceps con mancuernas',
  'Curl martillo', 'Curl en polea', 'Extensión de tríceps en polea',
  'Press francés', 'Patada de tríceps', 'Fondos en banco', 'Hip thrust',
  'Puente de glúteos', 'Patada de glúteo en polea', 'Abducción de cadera',
  'Zancadas', 'Zancadas caminando', 'Estocadas laterales', 'Prensa de piernas',
  'Extensión de cuádriceps', 'Curl femoral', 'Elevación de gemelos de pie',
  'Elevación de gemelos sentado', 'Plancha', 'Plancha lateral', 'Crunch',
  'Crunch inverso', 'Elevación de piernas', 'Rueda abdominal', 'Russian twist',
  'Dead bug', 'Bird dog', 'Superman', 'Hyperextensión lumbar',
  'Swing con kettlebell', 'Turkish get up', 'Clean con kettlebell',
  'Burpees', 'Mountain climbers', 'Saltos al cajón', 'Step up',
  'Movilidad torácica', 'Movilidad de cadera', 'Estiramiento de isquiotibiales',
  'Estiramiento de cuádriceps', 'Estiramiento de pectoral', 'Foam roller',
]

function capitalizeFirst(s: string) {
  if (!s) return s
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Chip component ───────────────────────────────────────────────────────────

function Chip({
  label,
  selected,
  onPress,
  multi = false,
}: {
  label: string
  selected: boolean
  onPress: () => void
  multi?: boolean
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity
      style={[styles.chip, selected && styles.chipSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </TouchableOpacity>
  )
}

// ─── Section label ────────────────────────────────────────────────────────────

function Label({ text }: { text: string }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return <Text style={styles.label}>{text}</Text>
}

// ─── Text field ───────────────────────────────────────────────────────────────

function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = 'default',
  multiline = false,
}: {
  label: string
  value: string
  onChangeText: (v: string) => void
  placeholder?: string
  keyboardType?: any
  multiline?: boolean
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.fieldGroup}>
      <Label text={label} />
      <TextInput
        style={[styles.input, multiline && styles.inputMulti]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || ''}
        placeholderTextColor={colors.inkMuted}
        keyboardType={keyboardType}
        autoCapitalize="none"
        autoCorrect={false}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  )
}

// ─── Exercise selector ────────────────────────────────────────────────────────

function ExerciseSelector({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)

  const selected = value ? value.split(',').map((s) => s.trim()).filter(Boolean) : []
  const filtered = query.length > 0
    ? LISTA_EJERCICIOS.filter(
        (e) => e.toLowerCase().includes(query.toLowerCase()) && !selected.includes(e)
      ).slice(0, 6)
    : []

  function add(exercise: string) {
    onChange([...selected, exercise].join(', '))
    setQuery('')
    setOpen(false)
  }

  function remove(exercise: string) {
    onChange(selected.filter((e) => e !== exercise).join(', '))
  }

  return (
    <View style={styles.fieldGroup}>
      <Label text={label} />
      {selected.length > 0 && (
        <View style={[styles.chipsRow, { marginBottom: 10 }]}>
          {selected.map((ex) => (
            <TouchableOpacity
              key={ex}
              style={styles.exChip}
              onPress={() => remove(ex)}
              activeOpacity={0.7}
            >
              <Text style={styles.exChipText}>{ex}</Text>
              <Text style={styles.exChipRemove}>×</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
      <View>
        <TextInput
          style={styles.input}
          value={query}
          onChangeText={(v) => { setQuery(v); setOpen(v.length > 0) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder || 'Buscar ejercicio...'}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {open && filtered.length > 0 && (
          <View style={styles.dropdown}>
            {filtered.map((ex) => (
              <TouchableOpacity
                key={ex}
                style={styles.dropdownItem}
                onPress={() => add(ex)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownItemText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Injury selector ─────────────────────────────────────────────────────────

function InjurySelector({
  value,
  onChange,
}: {
  value: Injury[]
  onChange: (v: Injury[]) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [zona, setZona] = useState('')
  const [severidad, setSeveridad] = useState('')

  function add() {
    if (!zona || !severidad) return
    onChange([...value, { zona, severidad }])
    setZona('')
    setSeveridad('')
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <View style={styles.fieldGroup}>
      <Label text="LESIONES O LIMITACIONES (opcional)" />

      {value.length > 0 && (
        <View style={{ marginBottom: 12, gap: 8 }}>
          {value.map((inj, i) => (
            <View key={i} style={styles.injuryTag}>
              <Text style={styles.injuryTagText}>
                {capitalizeFirst(inj.zona)} · {capitalizeFirst(inj.severidad)}
              </Text>
              <TouchableOpacity onPress={() => remove(i)} activeOpacity={0.7}>
                <Text style={styles.injuryRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <Label text="ZONA AFECTADA" />
      <View style={styles.chipsRow}>
        {ZONAS_LESION.map((z) => (
          <Chip key={z} label={z} selected={zona === z} onPress={() => setZona(z === zona ? '' : z)} />
        ))}
      </View>

      {zona !== '' && (
        <>
          <Label text="SEVERIDAD" />
          <View style={styles.chipsRow}>
            {SEVERIDADES.map((sv) => (
              <Chip key={sv} label={sv} selected={severidad === sv} onPress={() => setSeveridad(sv === severidad ? '' : sv)} />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.addInjuryBtn, (!zona || !severidad) && { opacity: 0.4 }]}
            onPress={add}
            disabled={!zona || !severidad}
            activeOpacity={0.7}
          >
            <Text style={styles.addInjuryBtnText}>+ Agregar lesión</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

// ─── Date picker field ────────────────────────────────────────────────────────

function DatePickerField({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  const [show, setShow] = useState(false)

  const parsed = value ? new Date(value + 'T12:00:00') : new Date(2000, 0, 1)
  const dateValue = isNaN(parsed.getTime()) ? new Date(2000, 0, 1) : parsed

  function toISO(d: Date): string {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }

  function formatDisplay(s: string): string {
    if (!s) return 'Seleccionar fecha'
    const [y, m, d] = s.split('-')
    return `${d}/${m}/${y}`
  }

  function calcAge(s: string): string {
    if (!s) return ''
    const [y, m, d] = s.split('-').map(Number)
    const born = new Date(y, m - 1, d)
    if (isNaN(born.getTime())) return ''
    const today = new Date()
    let age = today.getFullYear() - born.getFullYear()
    if (today.getMonth() < born.getMonth() ||
        (today.getMonth() === born.getMonth() && today.getDate() < born.getDate())) age--
    return age > 0 && age < 120 ? `${age} años` : ''
  }

  function handleChange(_: any, selected?: Date) {
    if (Platform.OS === 'android') setShow(false)
    if (selected) onChange(toISO(selected))
  }

  const age = calcAge(value)

  return (
    <View style={styles.fieldGroup}>
      <Label text="FECHA DE NACIMIENTO" />
      <TouchableOpacity
        style={[styles.input, styles.dateTouchable]}
        onPress={() => setShow(true)}
        activeOpacity={0.7}
      >
        <Text style={value ? styles.dateText : styles.datePlaceholder}>
          {formatDisplay(value)}
        </Text>
      </TouchableOpacity>
      {!!age && <Text style={styles.ageHint}>{age}</Text>}

      {/* Android: shows dialog directly */}
      {show && Platform.OS === 'android' && (
        <DateTimePicker
          value={dateValue}
          mode="date"
          display="default"
          onChange={handleChange}
          maximumDate={new Date()}
          minimumDate={new Date(1930, 0, 1)}
        />
      )}

      {/* iOS: modal con spinner */}
      {Platform.OS === 'ios' && (
        <Modal visible={show} transparent animationType="slide">
          <View style={styles.dateOverlay}>
            <View style={styles.dateCard}>
              <View style={styles.dateHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.dateCancel}>Cancelar</Text>
                </TouchableOpacity>
                <Text style={styles.dateTitle}>Fecha de nacimiento</Text>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.dateDone}>Listo</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={dateValue}
                mode="date"
                display="spinner"
                onChange={handleChange}
                maximumDate={new Date()}
                minimumDate={new Date(1930, 0, 1)}
              />
            </View>
          </View>
        </Modal>
      )}
    </View>
  )
}

// ─── Step dot indicator ───────────────────────────────────────────────────────

function StepDots({ current, total }: { current: number; total: number }) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.dotsRow}>
      {Array.from({ length: total }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            i === current && styles.dotActive,
            i < current && styles.dotDone,
          ]}
        />
      ))}
    </View>
  )
}

// ─── Location card ────────────────────────────────────────────────────────────

function LocationCard({
  loc,
  index,
  onChange,
  onRemove,
}: {
  loc: Location
  index: number
  onChange: (updated: Location) => void
  onRemove: () => void
}) {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  function toggleImplemento(imp: string) {
    const current = loc.implementos
    if (current.includes(imp)) {
      onChange({ ...loc, implementos: current.filter((i) => i !== imp) })
    } else {
      onChange({ ...loc, implementos: [...current, imp] })
    }
  }

  return (
    <View style={styles.locationCard}>
      <View style={styles.locationHeader}>
        <Text style={styles.locationTitle}>Ubicación {index + 1}</Text>
        {index > 0 && (
          <TouchableOpacity onPress={onRemove} activeOpacity={0.7}>
            <Text style={styles.removeText}>Eliminar</Text>
          </TouchableOpacity>
        )}
      </View>

      <Field
        label="NOMBRE"
        value={loc.nombre}
        onChangeText={(v) => onChange({ ...loc, nombre: v })}
        placeholder="Ej: Mi gimnasio"
      />

      <Label text="TIPO" />
      <View style={styles.chipsRow}>
        {TIPOS_LUGAR.map((t) => (
          <Chip
            key={t}
            label={t}
            selected={loc.tipo === t}
            onPress={() => onChange({ ...loc, tipo: t })}
          />
        ))}
      </View>

      <Label text="IMPLEMENTOS DISPONIBLES" />
      <View style={styles.chipsRow}>
        {IMPLEMENTOS.map((imp) => (
          <Chip
            key={imp}
            label={imp}
            selected={loc.implementos.includes(imp)}
            onPress={() => toggleImplemento(imp)}
            multi
          />
        ))}
      </View>
    </View>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function OnboardingScreen() {
  const { colors } = useTheme()
  const styles = useMemo(() => makeStyles(colors), [colors])

  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [data, setData] = useState<OnboardingData>({
    nombre: '',
    objetivos: [],
    nivel: '',
    experiencia_deportiva: '',
    lesiones: [],
    sexo: '',
    peso: '',
    unidad_peso: 'kg',
    altura: '',
    unidad_altura: 'cm',
    fecha_nacimiento: '',
    usa_ciclo_menstrual: false,
    dias_semana: 3,
    horario_preferido: '',
    nivel_estres: '',
    tipo_trabajo: '',
    estilo_entrenamiento: '',
    ejercicios_favoritos: '',
    ejercicios_evitar: '',
    rm_sentadilla: '',
    rm_peso_muerto: '',
    rm_press_banca: '',
    rm_press_hombro: '',
    locations: [{ nombre: '', tipo: '', implementos: [] }],
  })

  function set(field: keyof OnboardingData, value: any) {
    setData((prev) => ({ ...prev, [field]: value }))
  }

  // ── Navigation ──────────────────────────────────────────────────────────────

  function goNext() {
    setError('')
    if (step < 4) {
      setStep((s) => s + 1)
    } else {
      handleFinish()
    }
  }

  function goBack() {
    setError('')
    if (step > 0) setStep((s) => s - 1)
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleFinish() {
    setLoading(true)
    setError('')
    try {
      const pesoKg = data.peso
        ? data.unidad_peso === 'lb'
          ? parseFloat(data.peso) * 0.453592
          : parseFloat(data.peso)
        : null
      const alturaCm = data.altura
        ? data.unidad_altura === 'ft'
          ? Math.round(parseFloat(data.altura) * 30.48)
          : parseInt(data.altura)
        : null

      const profilePayload: Record<string, any> = {
        nombre: data.nombre,
        objetivo: data.objetivos[0] || '',
        objetivos_multiples: data.objetivos,
        nivel: data.nivel ? data.nivel.toLowerCase() : '',
        experiencia_deportiva: data.experiencia_deportiva,
        sexo: data.sexo ? data.sexo.toLowerCase() : '',
        peso: pesoKg,
        altura: alturaCm,
        fecha_nacimiento: data.fecha_nacimiento || null,
        usa_ciclo_menstrual: data.usa_ciclo_menstrual,
        dias_semana: data.dias_semana,
        horario_preferido: data.horario_preferido ? data.horario_preferido.toLowerCase() : '',
        nivel_estres: data.nivel_estres ? data.nivel_estres.toLowerCase() : '',
        tipo_trabajo: data.tipo_trabajo ? data.tipo_trabajo.toLowerCase() : '',
        estilo_entrenamiento: data.estilo_entrenamiento ? data.estilo_entrenamiento.toLowerCase() : '',
        ejercicios_favoritos: data.ejercicios_favoritos,
        ejercicios_evitar: data.ejercicios_evitar,
        rm_sentadilla: data.rm_sentadilla ? parseFloat(data.rm_sentadilla) : null,
        rm_peso_muerto: data.rm_peso_muerto ? parseFloat(data.rm_peso_muerto) : null,
        rm_press_banca: data.rm_press_banca ? parseFloat(data.rm_press_banca) : null,
        rm_press_hombro: data.rm_press_hombro ? parseFloat(data.rm_press_hombro) : null,
        onboarding_completo: true,
      }

      await apiPut('/api/profile/', profilePayload)

      for (const loc of data.locations) {
        if (loc.nombre.trim() && loc.tipo) {
          await apiPost('/api/locations/', {
            nombre: loc.nombre.trim(),
            tipo: loc.tipo.toLowerCase(),
            implementos: loc.implementos,
          })
        }
      }

      for (const lesion of data.lesiones) {
        await apiPost('/api/injuries/', {
          zona: lesion.zona.toLowerCase(),
          severidad: lesion.severidad.toLowerCase(),
          descripcion: '',
        })
      }

      // Update stored user so index.tsx doesn't redirect to onboarding again
      const currentUser = await getUser()
      if (currentUser) {
        await saveUser({ ...currentUser, onboarding_completo: true })
      }

      router.replace('/(auth)/bienvenida')
    } catch (e: any) {
      setError(e.message || 'Error al guardar el perfil. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // ── Location handlers ────────────────────────────────────────────────────────

  function updateLocation(index: number, updated: Location) {
    const locs = [...data.locations]
    locs[index] = updated
    set('locations', locs)
  }

  function addLocation() {
    set('locations', [...data.locations, { nombre: '', tipo: '', implementos: [] }])
  }

  function removeLocation(index: number) {
    const locs = data.locations.filter((_, i) => i !== index)
    set('locations', locs)
  }

  // ── Step renderers ───────────────────────────────────────────────────────────

  function renderStep1() {
    return (
      <View>
        <Text style={styles.welcomeText}>Bienvenido a PyFit 👋</Text>
        <Text style={styles.stepSubtitle}>Cuéntanos sobre ti para personalizar tu entrenamiento</Text>

        <Field
          label="NOMBRE"
          value={data.nombre}
          onChangeText={(v) => set('nombre', v)}
          placeholder="¿Cómo te llamas?"
        />

        <Label text="OBJETIVOS (puedes elegir varios)" />
        <View style={styles.chipsRow}>
          {OBJETIVOS.map((obj) => (
            <Chip
              key={obj}
              label={obj}
              selected={data.objetivos.includes(obj)}
              onPress={() => {
                const current = data.objetivos
                set('objetivos', current.includes(obj)
                  ? current.filter((o) => o !== obj)
                  : [...current, obj])
              }}
              multi
            />
          ))}
        </View>

        <Label text="NIVEL DE ENTRENAMIENTO" />
        <View style={styles.chipsRow}>
          {NIVELES.map((n) => (
            <Chip
              key={n}
              label={n}
              selected={data.nivel === n}
              onPress={() => set('nivel', n)}
            />
          ))}
        </View>

        <Field
          label="EXPERIENCIA DEPORTIVA PREVIA"
          value={data.experiencia_deportiva}
          onChangeText={(v) => set('experiencia_deportiva', v)}
          placeholder="Ej: 5 años de fútbol, 2 años de crossfit... (opcional)"
          multiline
        />

        <InjurySelector
          value={data.lesiones}
          onChange={(v) => set('lesiones', v)}
        />
      </View>
    )
  }

  function renderStep2() {
    return (
      <View>
        <Text style={styles.stepTitle}>Datos físicos</Text>
        <Text style={styles.stepSubtitle}>Esta información nos ayuda a calibrar tu entrenamiento</Text>

        <Label text="SEXO" />
        <View style={styles.chipsRow}>
          {SEXOS.map((s) => (
            <Chip
              key={s}
              label={s}
              selected={data.sexo === s}
              onPress={() => {
                set('sexo', s)
                if (s !== 'Femenino') set('usa_ciclo_menstrual', false)
              }}
            />
          ))}
        </View>

        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <View style={styles.labelWithUnit}>
              <Text style={styles.label}>PESO</Text>
              <View style={styles.unitToggleRow}>
                {(['kg', 'lb'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, data.unidad_peso === u && styles.unitBtnActive]}
                    onPress={() => set('unidad_peso', u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitBtnText, data.unidad_peso === u && styles.unitBtnTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={data.peso}
              onChangeText={(v) => set('peso', v)}
              placeholder={data.unidad_peso === 'kg' ? '70' : '155'}
              placeholderTextColor={colors.inkMuted}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          <View style={styles.halfField}>
            <View style={styles.labelWithUnit}>
              <Text style={styles.label}>ALTURA</Text>
              <View style={styles.unitToggleRow}>
                {(['cm', 'ft'] as const).map((u) => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitBtn, data.unidad_altura === u && styles.unitBtnActive]}
                    onPress={() => set('unidad_altura', u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitBtnText, data.unidad_altura === u && styles.unitBtnTextActive]}>{u}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <TextInput
              style={styles.input}
              value={data.altura}
              onChangeText={(v) => set('altura', v)}
              placeholder={data.unidad_altura === 'cm' ? '175' : '5.9'}
              placeholderTextColor={colors.inkMuted}
              keyboardType="decimal-pad"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
        </View>

        <DatePickerField
          value={data.fecha_nacimiento}
          onChange={(v) => set('fecha_nacimiento', v)}
        />

        {data.sexo === 'Femenino' && (
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => set('usa_ciclo_menstrual', !data.usa_ciclo_menstrual)}
            activeOpacity={0.7}
          >
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Seguimiento de ciclo menstrual</Text>
              <Text style={styles.toggleSub}>Adapta el entrenamiento a las fases del ciclo</Text>
            </View>
            <View style={[styles.toggle, data.usa_ciclo_menstrual && styles.toggleOn]}>
              <View style={[styles.toggleThumb, data.usa_ciclo_menstrual && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        )}
      </View>
    )
  }

  function renderStep3() {
    return (
      <View>
        <Text style={styles.stepTitle}>Estilo de vida</Text>
        <Text style={styles.stepSubtitle}>Tu rutina diaria influye en la recuperación y el rendimiento</Text>

        <Label text="DÍAS DE ENTRENAMIENTO POR SEMANA" />
        <View style={styles.daysRow}>
          {DIAS.map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, data.dias_semana === d && styles.dayBtnActive]}
              onPress={() => set('dias_semana', d)}
              activeOpacity={0.7}
            >
              <Text style={[styles.dayBtnText, data.dias_semana === d && styles.dayBtnTextActive]}>
                {d}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Label text="HORARIO PREFERIDO" />
        <View style={styles.chipsRow}>
          {HORARIOS.map((h) => (
            <Chip
              key={h}
              label={h}
              selected={data.horario_preferido === h}
              onPress={() => set('horario_preferido', h)}
            />
          ))}
        </View>

        <Label text="NIVEL DE ESTRÉS HABITUAL" />
        <View style={styles.chipsRow}>
          {ESTRES.map((e) => (
            <Chip
              key={e}
              label={e}
              selected={data.nivel_estres === e}
              onPress={() => set('nivel_estres', e)}
            />
          ))}
        </View>

        <Label text="TIPO DE TRABAJO" />
        <View style={styles.chipsRow}>
          {TRABAJOS.map((t) => (
            <Chip
              key={t}
              label={t}
              selected={data.tipo_trabajo === t}
              onPress={() => set('tipo_trabajo', t)}
            />
          ))}
        </View>
      </View>
    )
  }

  function renderStep4() {
    return (
      <View>
        <Text style={styles.stepTitle}>Preferencias de entrenamiento</Text>
        <Text style={styles.stepSubtitle}>Personaliza la selección de ejercicios a tu gusto</Text>

        <Label text="ESTILO DE ENTRENAMIENTO" />
        <View style={styles.chipsRow}>
          {ESTILOS.map((e) => (
            <Chip
              key={e}
              label={e}
              selected={data.estilo_entrenamiento === e}
              onPress={() => set('estilo_entrenamiento', e)}
            />
          ))}
        </View>

        <ExerciseSelector
          label="EJERCICIOS FAVORITOS"
          value={data.ejercicios_favoritos}
          onChange={(v) => set('ejercicios_favoritos', v)}
          placeholder="Buscar ejercicio favorito..."
        />

        <ExerciseSelector
          label="EJERCICIOS A EVITAR"
          value={data.ejercicios_evitar}
          onChange={(v) => set('ejercicios_evitar', v)}
          placeholder="Buscar ejercicio a evitar..."
        />

        <Text style={styles.rmTitle}>1RM APROXIMADO (kg)</Text>
        <Text style={styles.rmSubtitle}>Opcional — ayuda a calcular cargas exactas. Si no lo sabes, déjalo en blanco.</Text>
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Field
              label="SENTADILLA"
              value={data.rm_sentadilla}
              onChangeText={(v) => set('rm_sentadilla', v)}
              placeholder="100"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Field
              label="PESO MUERTO"
              value={data.rm_peso_muerto}
              onChangeText={(v) => set('rm_peso_muerto', v)}
              placeholder="120"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
        <View style={styles.rowFields}>
          <View style={styles.halfField}>
            <Field
              label="PRESS BANCA"
              value={data.rm_press_banca}
              onChangeText={(v) => set('rm_press_banca', v)}
              placeholder="80"
              keyboardType="decimal-pad"
            />
          </View>
          <View style={styles.halfField}>
            <Field
              label="PRESS HOMBRO"
              value={data.rm_press_hombro}
              onChangeText={(v) => set('rm_press_hombro', v)}
              placeholder="60"
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      </View>
    )
  }

  function renderStep5() {
    return (
      <View>
        <Text style={styles.stepTitle}>¿Dónde entrenas?</Text>
        <Text style={styles.stepSubtitle}>Agrega tus ubicaciones y equipamiento disponible</Text>

        {data.locations.map((loc, idx) => (
          <LocationCard
            key={idx}
            loc={loc}
            index={idx}
            onChange={(updated) => updateLocation(idx, updated)}
            onRemove={() => removeLocation(idx)}
          />
        ))}

        <TouchableOpacity style={styles.addLocBtn} onPress={addLocation} activeOpacity={0.7}>
          <Text style={styles.addLocText}>+ Agregar otra ubicación</Text>
        </TouchableOpacity>
      </View>
    )
  }

  const STEP_RENDERERS = [renderStep1, renderStep2, renderStep3, renderStep4, renderStep5]

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['rgba(37,99,255,0.25)', 'transparent']}
        style={styles.gradient}
      />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerLogo}>Pyfit.</Text>
          <StepDots current={step} total={5} />
          <Text style={styles.stepCounter}>{step + 1} / 5</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {STEP_RENDERERS[step]()}

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            {step > 0 && (
              <TouchableOpacity style={styles.backBtn} onPress={goBack} activeOpacity={0.7}>
                <Text style={styles.backBtnText}>← Atrás</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.nextBtnWrap, step === 0 && styles.nextBtnFull]}
              onPress={goNext}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[colors.accent, colors.accentDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.nextBtn}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.nextBtnText}>
                    {step === 4 ? 'Comenzar →' : 'Siguiente →'}
                  </Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {step === 4 && (
            <TouchableOpacity
              style={styles.skipBtn}
              onPress={() => router.replace('/(auth)/bienvenida')}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>Completar más tarde</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: c.bg,
    },
    flex: {
      flex: 1,
    },
    gradient: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      height: 400,
    },

    // Header
    header: {
      paddingTop: 60,
      paddingHorizontal: 24,
      paddingBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    headerLogo: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 20,
      color: c.white,
      letterSpacing: -0.5,
    },
    dotsRow: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: c.borderBright,
    },
    dotActive: {
      width: 24,
      backgroundColor: c.accent,
    },
    dotDone: {
      backgroundColor: c.accentDark,
    },
    stepCounter: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 12,
      color: c.inkMuted,
      letterSpacing: 0.5,
    },

    // Scroll
    scroll: {
      flexGrow: 1,
      paddingHorizontal: 24,
      paddingBottom: 48,
    },

    // Step titles
    welcomeText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 26,
      color: c.white,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    stepTitle: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 24,
      color: c.white,
      letterSpacing: -0.5,
      marginBottom: 6,
    },
    stepSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkMuted,
      marginBottom: 28,
      lineHeight: 20,
    },

    // Field
    fieldGroup: {
      marginBottom: 20,
    },
    label: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 1.2,
      marginBottom: 10,
      textTransform: 'uppercase',
    },
    input: {
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 14,
      color: c.white,
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
    },
    inputMulti: {
      minHeight: 80,
      textAlignVertical: 'top',
      paddingTop: 14,
    },

    // Age hint
    ageHint: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.accentLight,
      marginTop: 6,
      marginLeft: 4,
    },

    // Row fields
    rowFields: {
      flexDirection: 'row',
      gap: 12,
    },
    halfField: {
      flex: 1,
    },

    // Toggle
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 14,
      padding: 16,
      marginBottom: 20,
    },
    toggleInfo: {
      flex: 1,
      marginRight: 12,
    },
    toggleLabel: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.inkPrimary,
      marginBottom: 2,
    },
    toggleSub: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
    },
    toggle: {
      width: 44,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'rgba(255,255,255,0.1)',
      justifyContent: 'center',
      paddingHorizontal: 3,
    },
    toggleOn: {
      backgroundColor: c.accent,
    },
    toggleThumb: {
      width: 20,
      height: 20,
      borderRadius: 10,
      backgroundColor: c.inkMuted,
    },
    toggleThumbOn: {
      backgroundColor: c.white,
      alignSelf: 'flex-end',
    },

    // Days
    daysRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 24,
      flexWrap: 'wrap',
    },
    dayBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dayBtnActive: {
      backgroundColor: c.accent,
      borderColor: c.accent,
    },
    dayBtnText: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: c.inkMuted,
    },
    dayBtnTextActive: {
      color: c.white,
    },

    // Chips
    chipsRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 24,
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 20,
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
    },
    chipSelected: {
      backgroundColor: 'rgba(79,140,255,0.2)',
      borderColor: c.accent,
    },
    chipText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: c.inkSecondary,
    },
    chipTextSelected: {
      color: c.accent,
    },

    // Location card
    locationCard: {
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      borderRadius: 20,
      padding: 16,
      marginBottom: 16,
    },
    locationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    locationTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 16,
      color: c.inkPrimary,
    },
    removeText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.red,
    },

    // Add location
    addLocBtn: {
      borderWidth: 1,
      borderColor: c.accent,
      borderStyle: 'dashed',
      borderRadius: 14,
      paddingVertical: 14,
      alignItems: 'center',
      marginBottom: 24,
      backgroundColor: 'rgba(79,140,255,0.05)',
    },
    addLocText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 14,
      color: c.accent,
    },

    // Error
    errorBox: {
      backgroundColor: 'rgba(255,68,68,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,68,68,0.25)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
      marginBottom: 16,
    },
    errorText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.red,
    },

    // Navigation buttons
    btnRow: {
      flexDirection: 'row',
      gap: 12,
      marginTop: 8,
      marginBottom: 16,
    },
    backBtn: {
      flex: 1,
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: c.glassBg,
      borderWidth: 1,
      borderColor: c.borderBright,
      borderRadius: 14,
    },
    backBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.inkSecondary,
    },
    nextBtnWrap: {
      flex: 1,
      borderRadius: 14,
      overflow: 'hidden',
    },
    nextBtnFull: {
      flex: 1,
    },
    nextBtn: {
      paddingVertical: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBtnText: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.white,
      letterSpacing: 0.2,
    },

    // Skip
    skipBtn: {
      alignItems: 'center',
      paddingVertical: 12,
    },
    skipText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 13,
      color: c.inkMuted,
    },

    // Exercise selector
    exChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: 'rgba(79,140,255,0.15)',
      borderWidth: 1,
      borderColor: c.accent,
    },
    exChipText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: c.accent,
    },
    exChipRemove: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 14,
      color: c.accent,
      lineHeight: 16,
    },
    dropdown: {
      position: 'absolute',
      top: '100%',
      left: 0,
      right: 0,
      zIndex: 100,
      backgroundColor: c.sheetBg,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.15)',
      borderRadius: 14,
      marginTop: 4,
      overflow: 'hidden',
    },
    dropdownItem: {
      paddingHorizontal: 16,
      paddingVertical: 13,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.06)',
    },
    dropdownItemText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 14,
      color: c.inkPrimary,
    },

    // Date picker
    dateTouchable: {
      justifyContent: 'center',
    },
    dateText: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
      color: c.white,
    },
    datePlaceholder: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
      color: c.inkMuted,
    },
    dateOverlay: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.6)',
    },
    dateCard: {
      backgroundColor: c.sheetBg,
      borderTopLeftRadius: 24,
      borderTopRightRadius: 24,
      borderWidth: 1,
      borderColor: 'rgba(255,255,255,0.1)',
      paddingBottom: 34,
    },
    dateHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: 20,
      paddingVertical: 16,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.08)',
    },
    dateTitle: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.inkPrimary,
    },
    dateCancel: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 15,
      color: c.inkMuted,
    },
    dateDone: {
      fontFamily: 'SpaceGrotesk-SemiBold',
      fontSize: 15,
      color: c.accent,
    },

    // Unit toggle (kg/lb, cm/ft)
    labelWithUnit: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: 10,
    },
    unitToggleRow: {
      flexDirection: 'row',
      backgroundColor: 'rgba(255,255,255,0.06)',
      borderRadius: 8,
      padding: 2,
    },
    unitBtn: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 6,
    },
    unitBtnActive: {
      backgroundColor: c.accent,
    },
    unitBtnText: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 0.5,
    },
    unitBtnTextActive: {
      color: c.white,
    },

    injuryTag: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: 'rgba(255,100,100,0.1)',
      borderWidth: 1,
      borderColor: 'rgba(255,100,100,0.25)',
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 9,
    },
    injuryTagText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: 'rgba(255,150,150,0.9)',
    },
    injuryRemove: {
      fontFamily: 'SpaceGrotesk-Bold',
      fontSize: 16,
      color: 'rgba(255,100,100,0.7)',
      paddingLeft: 8,
    },
    addInjuryBtn: {
      borderWidth: 1,
      borderColor: c.borderBright,
      borderStyle: 'dashed',
      borderRadius: 10,
      paddingVertical: 10,
      alignItems: 'center',
      marginTop: 4,
      marginBottom: 8,
    },
    addInjuryBtnText: {
      fontFamily: 'SpaceGrotesk-Medium',
      fontSize: 13,
      color: c.inkSecondary,
    },

    // 1RM section
    rmTitle: {
      fontFamily: 'JetBrainsMono-Regular',
      fontSize: 10,
      color: c.inkMuted,
      letterSpacing: 1.2,
      marginBottom: 6,
      marginTop: 8,
      textTransform: 'uppercase',
    },
    rmSubtitle: {
      fontFamily: 'SpaceGrotesk-Regular',
      fontSize: 12,
      color: c.inkMuted,
      marginBottom: 16,
      lineHeight: 18,
    },
  })
}
