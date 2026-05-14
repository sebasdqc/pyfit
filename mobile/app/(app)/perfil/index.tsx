import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, ScrollView, TouchableOpacity, Modal, TextInput,
  Alert, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { router } from 'expo-router'
import { COLORS, Colors } from '../../../lib/colors'
import { useTheme } from '../../../lib/theme'
import { apiGet, apiPut, apiPost, apiDelete } from '../../../lib/api'
import { logout, getUser } from '../../../lib/auth'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Injury {
  id?: number
  zona: string
  severidad: string
  activa: boolean
}

interface Location {
  id?: number
  nombre: string
  tipo: string
  implementos: string[]
}

interface Profile {
  id?: number
  nombre: string
  email?: string
  objetivo: string
  objetivos_multiples: string[]
  nivel: string
  experiencia_deportiva: string
  lesiones: string
  dias_semana: number
  horario_preferido: string
  estilo_entrenamiento: string
  ejercicios_favoritos: string
  ejercicios_evitar: string
  rm_sentadilla: string
  rm_peso_muerto: string
  rm_press_banca: string
  rm_press_hombro: string
  fecha_nacimiento: string
  peso: string
  altura: string
  sexo: string
  nivel_estres: string
  tipo_trabajo: string
  usa_ciclo_menstrual: boolean
  racha_actual: number
  puntos_totales: number
  logros: any[]
  locations: Location[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const LISTA_EJERCICIOS = [
  'Sentadilla con barra', 'Sentadilla frontal', 'Sentadilla sumo', 'Sentadilla goblet',
  'Sentadilla búlgara', 'Peso muerto convencional', 'Peso muerto rumano', 'Peso muerto sumo',
  'Press banca plano', 'Press banca inclinado', 'Press banca con mancuernas',
  'Aperturas con mancuernas', 'Fondos en paralelas', 'Press militar con barra',
  'Press hombro con mancuernas', 'Elevaciones laterales', 'Elevaciones frontales', 'Face pull',
  'Dominadas', 'Jalón al pecho', 'Remo con barra', 'Remo con mancuerna', 'Remo en polea',
  'Curl de bíceps con barra', 'Curl de bíceps con mancuernas', 'Curl martillo',
  'Extensión de tríceps en polea', 'Press francés', 'Patada de tríceps', 'Hip thrust',
  'Puente de glúteos', 'Zancadas', 'Prensa de piernas', 'Extensión de cuádriceps',
  'Curl femoral', 'Elevación de gemelos', 'Plancha', 'Crunch', 'Rueda abdominal',
  'Swing con kettlebell', 'Burpees', 'Mountain climbers', 'Saltos al cajón',
]

const IMPLEMENTOS = ['Barras', 'Mancuernas', 'Máquinas', 'TRX', 'Kettlebells', 'Bandas elásticas', 'Cajón pliométrico', 'Anillas']
const TIPOS_LUGAR = ['Gimnasio', 'Casa', 'Exterior']
const OBJETIVOS_LIST = ['Perder grasa', 'Ganar músculo', 'Rendimiento deportivo', 'Resistencia', 'Salud general']
const NIVELES = [{ k: 'principiante', l: 'Principiante' }, { k: 'intermedio', l: 'Intermedio' }, { k: 'avanzado', l: 'Avanzado' }]
const HORARIOS = [{ k: 'mañana', l: 'Mañana' }, { k: 'tarde', l: 'Tarde' }, { k: 'noche', l: 'Noche' }]
const ESTRES = [{ k: 'bajo', l: 'Bajo' }, { k: 'moderado', l: 'Moderado' }, { k: 'alto', l: 'Alto' }]
const TRABAJOS = [{ k: 'sedentario', l: 'Sedentario' }, { k: 'mixto', l: 'Mixto' }, { k: 'activo', l: 'Activo' }]
const ESTILOS = [{ k: 'fuerza', l: 'Fuerza' }, { k: 'hipertrofia', l: 'Hipertrofia' }, { k: 'hiit', l: 'HIIT' }, { k: 'funcional', l: 'Funcional' }, { k: 'cardio', l: 'Cardio' }, { k: 'mixto', l: 'Mixto' }]
const DIAS = [1, 2, 3, 4, 5, 6, 7]
const ZONAS_LESION = ['Rodilla', 'Lumbar', 'Hombro', 'Cuello', 'Cadera', 'Tobillo', 'Muñeca', 'Codo']
const SEVERIDADES = ['Leve', 'Moderada', 'Crónica']

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(nombre: string) {
  return nombre.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase() ?? '').join('')
}

function nivelLabel(nivel: string) {
  return ({ rookie: 'Rookie', atleta: 'Atleta', elite: 'Élite', leyenda: 'Leyenda' } as any)[nivel?.toLowerCase()] ?? nivel ?? 'Rookie'
}

function formatDate(iso: string) {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function capitalizeFirst(s: string) {
  if (!s) return '—'
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// ─── Shared mini-components ───────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return <Text style={styles.sectionLabel}>{text}</Text>
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={[styles.chip, active && styles.chipActive]} onPress={onPress} activeOpacity={0.7}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  )
}

function GlassInput({
  label, value, onChangeText, placeholder, keyboardType = 'default', multiline = false,
}: {
  label: string; value: string; onChangeText: (v: string) => void
  placeholder?: string; keyboardType?: any; multiline?: boolean
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder ?? ''}
        placeholderTextColor={colors.inkMuted}
        keyboardType={keyboardType}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
        style={[styles.input, multiline && styles.inputMulti]}
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  )
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} />
      <View style={styles.readOnlyBox}>
        <Text style={styles.readOnlyText}>{value || '—'}</Text>
        <Text style={styles.readOnlyLock}>🔒</Text>
      </View>
    </View>
  )
}

// ─── Exercise Selector ────────────────────────────────────────────────────────

function ExerciseSelector({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const selected = value ? value.split(',').map(x => x.trim()).filter(Boolean) : []
  const filtered = query.length > 0
    ? LISTA_EJERCICIOS.filter(e => e.toLowerCase().includes(query.toLowerCase()) && !selected.includes(e)).slice(0, 6)
    : []

  return (
    <View style={styles.fieldGroup}>
      <SectionLabel text={label} />
      {selected.length > 0 && (
        <View style={[styles.chipsRow, { marginBottom: 8 }]}>
          {selected.map(ex => (
            <TouchableOpacity key={ex} style={styles.exChip}
              onPress={() => onChange(selected.filter(e => e !== ex).join(', '))} activeOpacity={0.7}>
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
          onChangeText={v => { setQuery(v); setOpen(v.length > 0) }}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder ?? 'Buscar ejercicio...'}
          placeholderTextColor={colors.inkMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {open && filtered.length > 0 && (
          <View style={styles.dropdown}>
            {filtered.map(ex => (
              <TouchableOpacity key={ex} style={styles.dropdownItem}
                onPress={() => { onChange([...selected, ex].join(', ')); setQuery(''); setOpen(false) }}
                activeOpacity={0.7}>
                <Text style={styles.dropdownText}>{ex}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </View>
  )
}

// ─── Modal Base ───────────────────────────────────────────────────────────────

function ModalBase({ visible, onClose, title, children }: {
  visible: boolean; onClose: () => void; title: string; children: React.ReactNode
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={styles.overlay}>
          <View style={styles.sheet}>
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{title}</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn} activeOpacity={0.7}>
                <Text style={styles.closeX}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}
              contentContainerStyle={{ padding: 20, paddingBottom: 48 }}
              keyboardShouldPersistTaps="handled">
              {children}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}

function SaveBtn({ onPress, saving }: { onPress: () => void; saving: boolean }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={[styles.saveBtn, saving && { opacity: 0.5 }]}
      onPress={onPress} disabled={saving} activeOpacity={0.85}>
      <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar cambios'}</Text>
    </TouchableOpacity>
  )
}

// ─── Injury Manager ───────────────────────────────────────────────────────────

function InjuryManager({ visible }: { visible: boolean }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [injuries, setInjuries] = useState<Injury[]>([])
  const [zona, setZona] = useState('')
  const [severidad, setSeveridad] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      apiGet('/api/injuries/').then(setInjuries).catch(() => {})
    }
  }, [visible])

  async function add() {
    if (!zona || !severidad) return
    setSaving(true)
    try {
      const created = await apiPost('/api/injuries/', {
        zona: zona.toLowerCase(),
        severidad: severidad.toLowerCase(),
        descripcion: '',
      })
      setInjuries(prev => [...prev, created])
      setZona('')
      setSeveridad('')
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  async function toggleActiva(inj: Injury) {
    try {
      const updated = await apiPut(`/api/injuries/${inj.id}/`, { activa: !inj.activa })
      setInjuries(prev => prev.map(i => i.id === inj.id ? updated : i))
    } catch {}
  }

  async function remove(inj: Injury) {
    Alert.alert('Eliminar lesión', `¿Eliminar ${inj.zona}?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/injuries/${inj.id}/`)
            setInjuries(prev => prev.filter(i => i.id !== inj.id))
          } catch {}
        },
      },
    ])
  }

  return (
    <View style={{ marginBottom: 16 }}>
      <SectionLabel text="LESIONES ACTIVAS" />

      {injuries.length === 0 && (
        <Text style={[styles.emptyText, { textAlign: 'left', marginBottom: 12 }]}>
          Sin lesiones registradas.
        </Text>
      )}

      {injuries.map(inj => (
        <View key={inj.id} style={styles.injuryRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.injuryZona}>{capitalizeFirst(inj.zona)}</Text>
            <Text style={styles.injurySev}>{capitalizeFirst(inj.severidad)}</Text>
          </View>
          <TouchableOpacity onPress={() => toggleActiva(inj)} activeOpacity={0.7}
            style={[styles.injuryToggle, inj.activa && styles.injuryToggleActive]}>
            <Text style={[styles.injuryToggleText, inj.activa && { color: colors.accent }]}>
              {inj.activa ? 'Activa' : 'Inactiva'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => remove(inj)} activeOpacity={0.7} style={{ marginLeft: 8 }}>
            <Text style={{ color: colors.red, fontSize: 18, lineHeight: 20 }}>×</Text>
          </TouchableOpacity>
        </View>
      ))}

      <SectionLabel text="AGREGAR LESIÓN" />
      <View style={[styles.chipsRow, { marginBottom: 10 }]}>
        {ZONAS_LESION.map(z => (
          <Chip key={z} label={z} active={zona === z}
            onPress={() => setZona(zona === z ? '' : z)} />
        ))}
      </View>

      {zona !== '' && (
        <>
          <SectionLabel text="SEVERIDAD" />
          <View style={[styles.chipsRow, { marginBottom: 10 }]}>
            {SEVERIDADES.map(sv => (
              <Chip key={sv} label={sv} active={severidad === sv}
                onPress={() => setSeveridad(severidad === sv ? '' : sv)} />
            ))}
          </View>
          <TouchableOpacity
            style={[styles.saveBtn, { marginTop: 4, opacity: (!zona || !severidad || saving) ? 0.4 : 1 }]}
            onPress={add}
            disabled={!zona || !severidad || saving}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : '+ Agregar lesión'}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  )
}

// ─── Datos Personales Modal ───────────────────────────────────────────────────

function DatosPersonalesModal({ visible, profile, onClose, onSave }: {
  visible: boolean; profile: Profile; onClose: () => void
  onSave: (u: Partial<Profile>) => Promise<void>
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [nombre, setNombre] = useState('')
  const [peso, setPeso] = useState('')
  const [altura, setAltura] = useState('')
  const [nivelEstres, setNivelEstres] = useState('')
  const [tipoTrabajo, setTipoTrabajo] = useState('')
  const [experiencia, setExperiencia] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setNombre(profile.nombre ?? '')
      setPeso(profile.peso ? String(profile.peso) : '')
      setAltura(profile.altura ? String(profile.altura) : '')
      setNivelEstres(profile.nivel_estres ?? '')
      setTipoTrabajo(profile.tipo_trabajo ?? '')
      setExperiencia(profile.experiencia_deportiva ?? '')
    }
  }, [visible, profile])

  async function save() {
    try {
      setSaving(true)
      await onSave({
        nombre, peso, altura,
        nivel_estres: nivelEstres,
        tipo_trabajo: tipoTrabajo,
        experiencia_deportiva: experiencia,
      })
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <ModalBase visible={visible} onClose={onClose} title="Datos personales">
      {/* Read-only: fecha y sexo */}
      <View style={styles.readOnlyRow}>
        <ReadOnlyField label="FECHA DE NACIMIENTO" value={formatDate(profile.fecha_nacimiento)} />
        <View style={{ width: 12 }} />
        <ReadOnlyField label="SEXO" value={capitalizeFirst(profile.sexo)} />
      </View>

      <GlassInput label="NOMBRE" value={nombre} onChangeText={setNombre} placeholder="Tu nombre" />

      <View style={styles.rowFields}>
        <View style={{ flex: 1 }}>
          <GlassInput label="PESO (kg)" value={peso} onChangeText={setPeso} placeholder="70" keyboardType="decimal-pad" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <GlassInput label="ALTURA (cm)" value={altura} onChangeText={setAltura} placeholder="175" keyboardType="numeric" />
        </View>
      </View>

      <SectionLabel text="NIVEL DE ESTRÉS" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {ESTRES.map(({ k, l }) => (
          <Chip key={k} label={l} active={nivelEstres === k} onPress={() => setNivelEstres(k)} />
        ))}
      </View>

      <SectionLabel text="TIPO DE TRABAJO" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {TRABAJOS.map(({ k, l }) => (
          <Chip key={k} label={l} active={tipoTrabajo === k} onPress={() => setTipoTrabajo(k)} />
        ))}
      </View>

      <InjuryManager visible={visible} />
      <GlassInput label="EXPERIENCIA DEPORTIVA" value={experiencia} onChangeText={setExperiencia}
        placeholder="Ej: 5 años de fútbol, crossfit... (opcional)" multiline />

      <SaveBtn onPress={save} saving={saving} />
    </ModalBase>
  )
}

// ─── Entrenamiento Modal ──────────────────────────────────────────────────────

function EntrenamientoModal({ visible, profile, onClose, onSave }: {
  visible: boolean; profile: Profile; onClose: () => void
  onSave: (u: Partial<Profile>) => Promise<void>
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const [objetivos, setObjetivos] = useState<string[]>([])
  const [nivel, setNivel] = useState('')
  const [diasSemana, setDiasSemana] = useState(3)
  const [horario, setHorario] = useState('')
  const [estilo, setEstilo] = useState('')
  const [favoritos, setFavoritos] = useState('')
  const [evitar, setEvitar] = useState('')
  const [rmSentadilla, setRmSentadilla] = useState('')
  const [rmMuerto, setRmMuerto] = useState('')
  const [rmBanca, setRmBanca] = useState('')
  const [rmHombro, setRmHombro] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (visible) {
      setObjetivos(Array.isArray(profile.objetivos_multiples) ? profile.objetivos_multiples : [])
      setNivel(profile.nivel ?? 'principiante')
      setDiasSemana(profile.dias_semana ?? 3)
      setHorario(profile.horario_preferido ?? '')
      setEstilo(profile.estilo_entrenamiento ?? '')
      setFavoritos(profile.ejercicios_favoritos ?? '')
      setEvitar(profile.ejercicios_evitar ?? '')
      setRmSentadilla(profile.rm_sentadilla ? String(profile.rm_sentadilla) : '')
      setRmMuerto(profile.rm_peso_muerto ? String(profile.rm_peso_muerto) : '')
      setRmBanca(profile.rm_press_banca ? String(profile.rm_press_banca) : '')
      setRmHombro(profile.rm_press_hombro ? String(profile.rm_press_hombro) : '')
    }
  }, [visible, profile])

  function toggleObjetivo(obj: string) {
    setObjetivos(prev => prev.includes(obj) ? prev.filter(o => o !== obj) : [...prev, obj])
  }

  async function save() {
    try {
      setSaving(true)
      await onSave({
        objetivo: objetivos[0] ?? '',
        objetivos_multiples: objetivos,
        nivel,
        dias_semana: diasSemana,
        horario_preferido: horario,
        estilo_entrenamiento: estilo,
        ejercicios_favoritos: favoritos,
        ejercicios_evitar: evitar,
        rm_sentadilla: rmSentadilla,
        rm_peso_muerto: rmMuerto,
        rm_press_banca: rmBanca,
        rm_press_hombro: rmHombro,
      })
      onClose()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  return (
    <ModalBase visible={visible} onClose={onClose} title="Entrenamiento">
      <SectionLabel text="OBJETIVOS (varios)" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {OBJETIVOS_LIST.map(obj => (
          <Chip key={obj} label={obj} active={objetivos.includes(obj)} onPress={() => toggleObjetivo(obj)} />
        ))}
      </View>

      <SectionLabel text="NIVEL" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {NIVELES.map(({ k, l }) => (
          <Chip key={k} label={l} active={nivel === k} onPress={() => setNivel(k)} />
        ))}
      </View>

      <SectionLabel text="DÍAS POR SEMANA" />
      <View style={[styles.daysRow, { marginBottom: 20 }]}>
        {DIAS.map(d => (
          <TouchableOpacity key={d} style={[styles.dayBtn, diasSemana === d && styles.dayBtnActive]}
            onPress={() => setDiasSemana(d)} activeOpacity={0.7}>
            <Text style={[styles.dayBtnText, diasSemana === d && styles.dayBtnTextActive]}>{d}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <SectionLabel text="HORARIO PREFERIDO" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {HORARIOS.map(({ k, l }) => (
          <Chip key={k} label={l} active={horario === k} onPress={() => setHorario(k)} />
        ))}
      </View>

      <SectionLabel text="ESTILO DE ENTRENAMIENTO" />
      <View style={[styles.chipsRow, { marginBottom: 20 }]}>
        {ESTILOS.map(({ k, l }) => (
          <Chip key={k} label={l} active={estilo === k} onPress={() => setEstilo(k)} />
        ))}
      </View>

      <ExerciseSelector label="EJERCICIOS FAVORITOS" value={favoritos} onChange={setFavoritos}
        placeholder="Buscar ejercicio favorito..." />
      <ExerciseSelector label="EJERCICIOS A EVITAR" value={evitar} onChange={setEvitar}
        placeholder="Buscar ejercicio a evitar..." />

      <Text style={styles.rmTitle}>1RM APROXIMADO (kg)</Text>
      <Text style={styles.rmSub}>Opcional — para calcular cargas exactas</Text>
      <View style={styles.rowFields}>
        <View style={{ flex: 1 }}>
          <GlassInput label="SENTADILLA" value={rmSentadilla} onChangeText={setRmSentadilla} placeholder="100" keyboardType="decimal-pad" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <GlassInput label="PESO MUERTO" value={rmMuerto} onChangeText={setRmMuerto} placeholder="120" keyboardType="decimal-pad" />
        </View>
      </View>
      <View style={styles.rowFields}>
        <View style={{ flex: 1 }}>
          <GlassInput label="PRESS BANCA" value={rmBanca} onChangeText={setRmBanca} placeholder="80" keyboardType="decimal-pad" />
        </View>
        <View style={{ width: 12 }} />
        <View style={{ flex: 1 }}>
          <GlassInput label="PRESS HOMBRO" value={rmHombro} onChangeText={setRmHombro} placeholder="60" keyboardType="decimal-pad" />
        </View>
      </View>

      <SaveBtn onPress={save} saving={saving} />
    </ModalBase>
  )
}

// ─── Ubicaciones Modal ────────────────────────────────────────────────────────

function UbicacionesModal({ visible, locations, onClose, onRefresh }: {
  visible: boolean; locations: Location[]; onClose: () => void; onRefresh: () => void
}) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  const EMPTY_LOC: Location = { nombre: '', tipo: '', implementos: [] }
  const [adding, setAdding] = useState(false)
  const [newLoc, setNewLoc] = useState<Location>(EMPTY_LOC)
  const [saving, setSaving] = useState(false)

  function toggleImplemento(imp: string) {
    setNewLoc(prev => ({
      ...prev,
      implementos: prev.implementos.includes(imp)
        ? prev.implementos.filter(i => i !== imp)
        : [...prev.implementos, imp],
    }))
  }

  async function saveNew() {
    if (!newLoc.nombre.trim() || !newLoc.tipo) {
      Alert.alert('Campos requeridos', 'Debes completar el nombre y el tipo de ubicación.')
      return
    }
    try {
      setSaving(true)
      await apiPost('/api/locations/', {
        nombre: newLoc.nombre.trim(),
        tipo: newLoc.tipo.toLowerCase(),
        implementos: newLoc.implementos,
      })
      setNewLoc(EMPTY_LOC)
      setAdding(false)
      onRefresh()
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'No se pudo guardar')
    } finally { setSaving(false) }
  }

  async function deleteLocation(id: number, nombre: string) {
    Alert.alert('Eliminar ubicación', `¿Eliminar "${nombre}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await apiDelete(`/api/locations/${id}/`)
            onRefresh()
          } catch (e: any) {
            Alert.alert('Error', e.message ?? 'No se pudo eliminar')
          }
        },
      },
    ])
  }

  return (
    <ModalBase visible={visible} onClose={onClose} title="Lugares de entrenamiento">
      {/* Existing locations */}
      {locations.length === 0 && !adding && (
        <Text style={styles.emptyText}>No tienes ubicaciones guardadas.</Text>
      )}
      {locations.map(loc => (
        <View key={loc.id} style={styles.locCard}>
          <View style={styles.locCardHeader}>
            <View>
              <Text style={styles.locNombre}>{loc.nombre}</Text>
              <Text style={styles.locTipo}>{capitalizeFirst(loc.tipo)}</Text>
            </View>
            <TouchableOpacity onPress={() => deleteLocation(loc.id!, loc.nombre)} activeOpacity={0.7}>
              <Text style={styles.locDelete}>Eliminar</Text>
            </TouchableOpacity>
          </View>
          {loc.implementos?.length > 0 && (
            <View style={styles.chipsRow}>
              {loc.implementos.map(imp => (
                <View key={imp} style={styles.impTag}>
                  <Text style={styles.impTagText}>{imp}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}

      {/* Add new location form */}
      {adding ? (
        <View style={styles.addLocForm}>
          <GlassInput label="NOMBRE" value={newLoc.nombre}
            onChangeText={v => setNewLoc(prev => ({ ...prev, nombre: v }))}
            placeholder="Ej: Mi gimnasio" />

          <SectionLabel text="TIPO" />
          <View style={[styles.chipsRow, { marginBottom: 16 }]}>
            {TIPOS_LUGAR.map(t => (
              <Chip key={t} label={t} active={newLoc.tipo === t}
                onPress={() => setNewLoc(prev => ({ ...prev, tipo: t }))} />
            ))}
          </View>

          <SectionLabel text="IMPLEMENTOS DISPONIBLES" />
          <View style={[styles.chipsRow, { marginBottom: 20 }]}>
            {IMPLEMENTOS.map(imp => (
              <Chip key={imp} label={imp} active={newLoc.implementos.includes(imp)}
                onPress={() => toggleImplemento(imp)} />
            ))}
          </View>

          <View style={styles.rowFields}>
            <TouchableOpacity
              style={[styles.saveBtn, { flex: 1, backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderDefault }]}
              onPress={() => { setAdding(false); setNewLoc(EMPTY_LOC) }} activeOpacity={0.7}>
              <Text style={[styles.saveBtnText, { color: colors.inkSecondary }]}>Cancelar</Text>
            </TouchableOpacity>
            <View style={{ width: 12 }} />
            <TouchableOpacity style={[styles.saveBtn, { flex: 1 }, saving && { opacity: 0.5 }]}
              onPress={saveNew} disabled={saving} activeOpacity={0.85}>
              <Text style={styles.saveBtnText}>{saving ? 'Guardando...' : 'Guardar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={styles.addLocBtn} onPress={() => setAdding(true)} activeOpacity={0.7}>
          <Text style={styles.addLocBtnText}>+ Agregar ubicación</Text>
        </TouchableOpacity>
      )}
    </ModalBase>
  )
}

// ─── Profile Item ─────────────────────────────────────────────────────────────

function ProfileItem({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }) {
  const { colors } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])
  return (
    <TouchableOpacity style={styles.item} onPress={onPress} activeOpacity={0.7}>
      <Text style={styles.itemIcon}>{icon}</Text>
      <Text style={styles.itemLabel}>{label}</Text>
      <Text style={styles.itemArrow}>›</Text>
    </TouchableOpacity>
  )
}

// ─── Default profile ──────────────────────────────────────────────────────────

const DEFAULT: Profile = {
  nombre: '', email: '', objetivo: '', objetivos_multiples: [], nivel: 'rookie',
  experiencia_deportiva: '', lesiones: '', dias_semana: 3, horario_preferido: '',
  estilo_entrenamiento: '', ejercicios_favoritos: '', ejercicios_evitar: '',
  rm_sentadilla: '', rm_peso_muerto: '', rm_press_banca: '', rm_press_hombro: '',
  fecha_nacimiento: '', peso: '', altura: '', sexo: '', nivel_estres: '',
  tipo_trabajo: '', usa_ciclo_menstrual: false, racha_actual: 0, puntos_totales: 0,
  logros: [], locations: [],
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

type ModalType = 'datos_personales' | 'entrenamiento' | 'ubicaciones' | null

export default function PerfilScreen() {
  const { colors, isDark, toggleTheme } = useTheme()
  const styles = React.useMemo(() => makeStyles(colors), [colors])

  const [profile, setProfile] = useState<Profile>(DEFAULT)
  const [loading, setLoading] = useState(true)
  const [activeModal, setActiveModal] = useState<ModalType>(null)

  const fetchProfile = useCallback(async () => {
    try {
      const data = await apiGet('/api/profile/')
      setProfile({ ...DEFAULT, ...data, locations: data.locations ?? [] })
    } catch {
      try {
        const user = await getUser()
        if (user) setProfile(prev => ({ ...prev, ...user }))
      } catch {}
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function handleSave(updates: Partial<Profile>) {
    const merged = { ...profile, ...updates }
    await apiPut('/api/profile/', merged)
    setProfile(merged)
  }

  async function handleLogout() {
    Alert.alert('Cerrar sesión', '¿Estás seguro?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Cerrar sesión', style: 'destructive',
        onPress: async () => { await logout(); router.replace('/(auth)/login') },
      },
    ])
  }

  const initials = getInitials(profile.nombre || 'U')
  const nivel = nivelLabel(profile.nivel)
  const objetivosDisplay = Array.isArray(profile.objetivos_multiples) && profile.objetivos_multiples.length > 0
    ? profile.objetivos_multiples.join(' · ')
    : (profile.objetivo ?? '')

  return (
    <View style={styles.root}>
      <LinearGradient colors={['rgba(37,99,255,0.25)', 'transparent']} style={styles.gradient} />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={{ position: 'relative' }}>
          <View style={styles.header}>
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <Text style={styles.nombre}>{loading ? '...' : (profile.nombre || 'Usuario')}</Text>
            <View style={styles.nivelBadge}>
              <Text style={styles.nivelText}>{nivel}</Text>
            </View>
            {!!objetivosDisplay && <Text style={styles.objetivo}>{objetivosDisplay}</Text>}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{profile.racha_actual}</Text>
                <Text style={styles.statLabel}>días racha</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{profile.puntos_totales}</Text>
                <Text style={styles.statLabel}>puntos</Text>
              </View>
            </View>
          </View>
          {/* Theme toggle */}
          <TouchableOpacity
            onPress={toggleTheme}
            activeOpacity={0.7}
            style={styles.themeToggle}
          >
            <Text style={{ fontSize: 18 }}>{isDark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
        </View>

        {/* Items */}
        <View style={styles.card}>
          <ProfileItem icon="👤" label="Datos personales" onPress={() => setActiveModal('datos_personales')} />
          <View style={styles.divider} />
          <ProfileItem icon="🏋️" label="Entrenamiento" onPress={() => setActiveModal('entrenamiento')} />
          <View style={styles.divider} />
          <ProfileItem icon="📍" label="Lugares de entrenamiento" onPress={() => setActiveModal('ubicaciones')} />
          <View style={styles.divider} />
          <ProfileItem icon="📱" label="Dispositivos conectados"
            onPress={() => Alert.alert('Próximamente', 'Apple Health, Garmin y Whoop estarán disponibles pronto.')} />
          <View style={styles.divider} />
          <ProfileItem icon="⭐" label="Suscripción"
            onPress={() => Alert.alert('Próximamente', 'PyFit Pro estará disponible muy pronto.')} />
          <View style={styles.divider} />
          <ProfileItem icon="🎁" label="Refiere un amigo"
            onPress={() => Alert.alert('Próximamente', 'El programa de referidos estará disponible pronto.')} />
          <View style={styles.divider} />
          <ProfileItem icon="💬" label="Dar feedback"
            onPress={() => Alert.alert('Gracias', 'Muchas gracias por usar PyFit ❤️')} />
          <View style={styles.divider} />
          <ProfileItem icon="❓" label="Centro de ayuda"
            onPress={() => Alert.alert('Centro de ayuda', 'Contacta a hola@pyfit.app — respondemos en menos de 24h.')} />
          <View style={styles.divider} />
          <ProfileItem icon="📄" label="Términos de servicio"
            onPress={() => router.push('/(auth)/terminos' as any)} />
          <View style={styles.divider} />
          <ProfileItem icon="🔒" label="Política de privacidad"
            onPress={() => router.push('/(auth)/privacidad' as any)} />
        </View>

        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
        <Text style={styles.version}>PyFit v1.0.0 · © 2026</Text>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Modals */}
      <DatosPersonalesModal visible={activeModal === 'datos_personales'} profile={profile}
        onClose={() => setActiveModal(null)} onSave={handleSave} />
      <EntrenamientoModal visible={activeModal === 'entrenamiento'} profile={profile}
        onClose={() => setActiveModal(null)} onSave={handleSave} />
      <UbicacionesModal visible={activeModal === 'ubicaciones'} locations={profile.locations ?? []}
        onClose={() => setActiveModal(null)} onRefresh={fetchProfile} />
    </View>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

function makeStyles(c: Colors) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: c.bg },
    gradient: { position: 'absolute', top: 0, left: 0, right: 0, height: 400 },
    scroll: { flex: 1 },
    scrollContent: { paddingTop: 60, paddingHorizontal: 20 },

    header: { alignItems: 'center', marginBottom: 28, gap: 8 },
    avatarCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: c.accentDark, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
    avatarText: { color: c.white, fontFamily: 'SpaceGrotesk-Bold', fontSize: 24, letterSpacing: -0.5 },
    nombre: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 22, letterSpacing: -0.6 },
    nivelBadge: { backgroundColor: 'rgba(79,140,255,0.12)', borderWidth: 1, borderColor: 'rgba(79,140,255,0.25)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5 },
    nivelText: { color: c.accent, fontFamily: 'JetBrainsMono-Regular', fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase' },
    objetivo: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, textAlign: 'center' },
    statsRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginTop: 4 },
    statBox: { alignItems: 'center', gap: 2 },
    statValue: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 20, letterSpacing: -0.5 },
    statLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 0.4, textTransform: 'uppercase' },
    statDivider: { width: 1, height: 30, backgroundColor: c.borderDefault },

    // Theme toggle button
    themeToggle: {
      position: 'absolute',
      top: 0,
      right: 0,
      width: 38,
      height: 38,
      borderRadius: 19,
      backgroundColor: c.cardBg,
      borderWidth: 1,
      borderColor: c.borderDefault,
      alignItems: 'center',
      justifyContent: 'center',
    },

    card: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 20, marginBottom: 16, overflow: 'hidden' },
    item: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 16, gap: 14 },
    itemIcon: { fontSize: 18, width: 24, textAlign: 'center' },
    itemLabel: { flex: 1, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 15 },
    itemArrow: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 20 },
    divider: { height: 1, backgroundColor: c.borderDefault, marginHorizontal: 18 },

    logoutBtn: { paddingVertical: 16, alignItems: 'center', marginBottom: 12 },
    logoutText: { color: c.red, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    version: { color: c.inkFaint, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.4, textAlign: 'center', marginBottom: 8 },

    // Modal shared
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
    sheet: { backgroundColor: c.sheetBg, borderTopLeftRadius: 28, borderTopRightRadius: 28, borderWidth: 1, borderBottomWidth: 0, borderColor: c.borderDefault, maxHeight: '92%' },
    sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    sheetTitle: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Bold', fontSize: 18, letterSpacing: -0.5 },
    closeBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    closeX: { color: c.inkSecondary, fontSize: 13 },

    // Inputs
    fieldGroup: { marginBottom: 16 },
    sectionLabel: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 9, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 8 },
    input: { backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    inputMulti: { minHeight: 80, textAlignVertical: 'top', paddingTop: 12 },
    rowFields: { flexDirection: 'row' },

    // Read-only
    readOnlyRow: { flexDirection: 'row', marginBottom: 4 },
    readOnlyBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
    readOnlyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },
    readOnlyLock: { fontSize: 12 },

    // Chips
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.cardBg },
    chipActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.12)' },
    chipText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    chipTextActive: { color: c.accent, fontFamily: 'SpaceGrotesk-SemiBold' },

    // Days picker
    daysRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    dayBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: c.glassBg, borderWidth: 1, borderColor: c.borderDefault, alignItems: 'center', justifyContent: 'center' },
    dayBtnActive: { backgroundColor: c.accent, borderColor: c.accent },
    dayBtnText: { fontFamily: 'SpaceGrotesk-Bold', fontSize: 15, color: c.inkMuted },
    dayBtnTextActive: { color: c.white },

    // Exercise selector
    exChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: 'rgba(79,140,255,0.15)', borderWidth: 1, borderColor: c.accent },
    exChipText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 13 },
    exChipRemove: { color: c.accent, fontFamily: 'SpaceGrotesk-Bold', fontSize: 14 },
    dropdown: { position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100, backgroundColor: c.sheetBg, borderWidth: 1, borderColor: c.borderBright, borderRadius: 12, marginTop: 4, overflow: 'hidden' },
    dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: c.borderDefault },
    dropdownText: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14 },

    // 1RM
    rmTitle: { fontFamily: 'JetBrainsMono-Regular', fontSize: 9, color: c.inkMuted, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4, marginTop: 8 },
    rmSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: c.inkMuted, marginBottom: 14 },

    // Save button
    saveBtn: { backgroundColor: c.accent, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginTop: 8 },
    saveBtnText: { color: c.white, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },

    // Locations modal
    locCard: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14, marginBottom: 12 },
    locCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
    locNombre: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15 },
    locTipo: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 },
    locDelete: { color: c.red, fontFamily: 'SpaceGrotesk-Regular', fontSize: 13 },
    impTag: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault },
    impTagText: { color: c.inkSecondary, fontFamily: 'SpaceGrotesk-Regular', fontSize: 11 },
    addLocBtn: { borderWidth: 1, borderColor: c.accent, borderStyle: 'dashed', borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 8, backgroundColor: 'rgba(79,140,255,0.05)' },
    addLocBtnText: { color: c.accent, fontFamily: 'SpaceGrotesk-Medium', fontSize: 14 },
    addLocForm: { backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 16, padding: 14, marginTop: 8 },
    emptyText: { color: c.inkMuted, fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, textAlign: 'center', marginVertical: 16 },
    injuryRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: c.cardBg, borderWidth: 1, borderColor: c.borderDefault, borderRadius: 12, padding: 12, marginBottom: 8 },
    injuryZona: { color: c.inkPrimary, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14 },
    injurySev: { color: c.inkMuted, fontFamily: 'JetBrainsMono-Regular', fontSize: 10, letterSpacing: 0.4, textTransform: 'uppercase', marginTop: 2 },
    injuryToggle: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: c.borderDefault, backgroundColor: c.glassBg },
    injuryToggleActive: { borderColor: c.accent, backgroundColor: 'rgba(79,140,255,0.1)' },
    injuryToggleText: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: c.inkMuted, letterSpacing: 0.4 },
  })
}
