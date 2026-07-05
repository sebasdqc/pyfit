import React, { useCallback, useEffect, useRef, useState } from 'react'
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { P } from '../../lib/coachTheme'
import {
  fetchAtletaRutina,
  saveAtletaRutina,
  deleteAtletaRutina,
  fetchExerciseCatalog,
  searchExercises,
  createCustomExercise,
  type RutinaEjercicio,
  type CoachRutina,
  type EjercicioCatalog,
  type EjercicioCatalogItem,
} from '../../lib/coachApi'

// ─── Fases canónicas (mismas que el resto de la app) ─────────────────────────────

type FaseKey = 'calentamiento' | 'principal' | 'enfriamiento'
const FASES: { key: FaseKey; nombre: string; color: string }[] = [
  { key: 'calentamiento', nombre: 'Calentamiento',     color: P.orange },
  { key: 'principal',     nombre: 'Bloque principal',  color: P.purpleMid },
  { key: 'enfriamiento',  nombre: 'Vuelta a la calma', color: P.green },
]

function clasifFase(nombre: string): FaseKey {
  const n = (nombre || '').toLowerCase()
  if (/calent/.test(n)) return 'calentamiento'
  if (/enfri|vuelta|calma|estir|movil/.test(n)) return 'enfriamiento'
  return 'principal'
}

// ─── Fechas (hoy + 6) ────────────────────────────────────────────────────────────

const DIAS_ABBR = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function buildDias(): { iso: string; label: string }[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i)
    const label = i === 0 ? 'Hoy' : i === 1 ? 'Mañana' : `${DIAS_ABBR[d.getDay()]} ${d.getDate()}`
    return { iso: isoLocal(d), label }
  })
}

// ─── Tipos del formulario de ejercicio personalizado ────────────────────────

interface CustomForm {
  nombre: string
  patron: string
  dificultad: string
  esCompuesto: boolean
  musculosPrim: string[]
  musculosSec: string[]
  equipamiento: string[]
  contraindicaciones: string[]
  errorRisk: number | null
  spaceRequired: string | null
}

const customFormVacio = (nombre = ''): CustomForm => ({
  nombre,
  patron: '',
  dificultad: 'intermedio',
  esCompuesto: true,
  musculosPrim: [],
  musculosSec: [],
  equipamiento: [],
  contraindicaciones: [],
  errorRisk: null,
  spaceRequired: null,
})

// Ejercicio vacío para el editor.
const ejVacio = (): RutinaEjercicio => ({
  nombre: '', series: 3, repeticiones: '8-10', descanso_segundos: 90, rpe_sugerido: null, notas: '',
})

type FaseState = { key: FaseKey; ejercicios: RutinaEjercicio[] }
const fasesVacias = (): FaseState[] => FASES.map((f) => ({ key: f.key, ejercicios: [] }))

// ─── Pantalla ─────────────────────────────────────────────────────────────────

export default function RutinaBuilder() {
  const insets = useSafeAreaInsets()
  const params = useLocalSearchParams<{ id?: string; nombre?: string }>()
  const nombre = params.nombre || 'Atleta'

  const dias = React.useMemo(buildDias, [])
  const [fecha, setFecha] = useState(dias[0].iso)

  const [titulo, setTitulo] = useState('')
  const [objetivo, setObjetivo] = useState('')
  const [duracion, setDuracion] = useState('45')
  const [rpe, setRpe] = useState('7')
  const [nota, setNota] = useState('')
  const [fases, setFases] = useState<FaseState[]>(fasesVacias())

  const [estado, setEstado] = useState<CoachRutina['estado'] | null>(null)
  const [bloqueada, setBloqueada] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<'borrador' | 'publicar' | 'quitar' | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [msgIsError, setMsgIsError] = useState(false)
  const msgTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Editor de ejercicio (modal)
  const [editor, setEditor] = useState<{ fase: number; idx: number | null; draft: RutinaEjercicio } | null>(null)

  // Catálogo de ejercicios (para búsqueda + formulario personalizado)
  const [catalog, setCatalog] = useState<EjercicioCatalog | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<EjercicioCatalogItem[]>([])
  const [searchLoading, setSearchLoading] = useState(false)
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Paso del modal: 'search' | 'params' | 'custom'
  // search = buscar en catálogo; custom = form de ejercicio personalizado
  const [editorStep, setEditorStep] = useState<'search' | 'custom'>('search')
  const [customForm, setCustomForm] = useState<CustomForm>(customFormVacio())
  const [customSaving, setCustomSaving] = useState(false)
  // Dropdown abierto dentro del form personalizado
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)

  const total = fases.reduce((s, f) => s + f.ejercicios.length, 0)

  // Muestra un mensaje de éxito (se auto-limpia a los 4 s) o error (persiste).
  const showMsg = useCallback((text: string | null, isError = false) => {
    if (msgTimer.current) clearTimeout(msgTimer.current)
    setMsg(text)
    setMsgIsError(isError)
    if (text && !isError) {
      msgTimer.current = setTimeout(() => setMsg(null), 4000)
    }
  }, [])

  // Limpiar timer al desmontar
  useEffect(() => () => { if (msgTimer.current) clearTimeout(msgTimer.current) }, [])

  // Carga la rutina de una fecha → puebla el formulario (o lo deja vacío).
  const cargar = useCallback(async (iso: string) => {
    if (!params.id) return
    setLoading(true); showMsg(null)
    try {
      const { rutina } = await fetchAtletaRutina(params.id, iso)
      if (rutina) {
        const c = rutina.contenido || {}
        setTitulo(c.titulo || rutina.titulo || '')
        setObjetivo(c.objetivo_sesion || '')
        setDuracion(String(c.duracion_total ?? 45))
        setRpe(String(c.rpe_target ?? 7))
        setNota(c.nota_del_entrenador || '')
        const fs = fasesVacias()
        for (const fase of (c.fases || [])) {
          const k = clasifFase(fase.nombre)
          const slot = fs.find((x) => x.key === k)!
          slot.ejercicios.push(...(fase.ejercicios || []))
        }
        setFases(fs)
        setEstado(rutina.estado)
        setBloqueada(rutina.bloqueada)
      } else {
        setTitulo(''); setObjetivo(''); setDuracion('45'); setRpe('7'); setNota('')
        setFases(fasesVacias()); setEstado(null); setBloqueada(false)
      }
      setIsDirty(false)
    } catch (e: any) {
      showMsg(e?.message || 'No se pudo cargar la rutina.', true)
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

  // Carga el catálogo de dropdowns al montar
  useEffect(() => {
    fetchExerciseCatalog().then(setCatalog).catch(() => {})
  }, [])

  // Búsqueda con debounce de 350ms
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current)
    if (searchQuery.length < 2) { setSearchResults([]); return }
    setSearchLoading(true)
    searchTimer.current = setTimeout(async () => {
      try {
        const { results } = await searchExercises(searchQuery)
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearchLoading(false)
      }
    }, 350)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [searchQuery])

  function buildPayload(publicar: boolean) {
    return {
      fecha,
      titulo: titulo.trim(),
      objetivo: objetivo.trim(),
      duracion_total: parseInt(duracion, 10) || 45,
      rpe_target: parseFloat(rpe) || 7,
      nota: nota.trim(),
      fases: fases
        .map((f) => ({ nombre: FASES.find((x) => x.key === f.key)!.nombre, ejercicios: f.ejercicios }))
        .filter((f) => f.ejercicios.length > 0),
      publicar,
    }
  }

  async function guardar(publicar: boolean) {
    if (!params.id || saving) return
    if (publicar && !titulo.trim()) { showMsg('Ponle un título a la sesión para publicarla.', true); return }
    if (publicar && total === 0) { showMsg('Agrega al menos un ejercicio para publicar.', true); return }
    setSaving(publicar ? 'publicar' : 'borrador'); showMsg(null)
    try {
      const { rutina } = await saveAtletaRutina(params.id, buildPayload(publicar))
      setEstado(rutina.estado); setBloqueada(rutina.bloqueada)
      setIsDirty(false)
      showMsg(publicar ? '✅ Publicada · el atleta la verá en su sesión de ese día.' : '✅ Borrador guardado.')
    } catch (e: any) {
      showMsg(e?.message || 'No se pudo guardar.', true)
    } finally {
      setSaving(null)
    }
  }

  function confirmarQuitar() {
    Alert.alert('Quitar rutina', 'Se eliminará la sesión de ese día. Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: quitar },
    ])
  }
  async function quitar() {
    if (!params.id) return
    setSaving('quitar')
    try {
      await deleteAtletaRutina(params.id, fecha)
      setTitulo(''); setObjetivo(''); setDuracion('45'); setRpe('7'); setNota('')
      setFases(fasesVacias()); setEstado(null); setBloqueada(false)
      showMsg('✅ Rutina eliminada.')
    } catch (e: any) {
      Alert.alert('No se pudo quitar', e?.message || 'Intenta de nuevo.')
    } finally {
      setSaving(null)
    }
  }

  // ── Operaciones sobre ejercicios ──────────────────────────────────────────────
  function abrirEditor(faseIdx: number, idx: number | null) {
    if (bloqueada) return
    const draft = idx === null ? ejVacio() : { ...fases[faseIdx].ejercicios[idx] }
    setEditor({ fase: faseIdx, idx, draft })
    // Al editar uno existente: ir directo al step de params con el nombre pre-llenado.
    // Al agregar nuevo: empezar en búsqueda.
    if (idx !== null) {
      setEditorStep('search')
      setSearchQuery(draft.nombre)
    } else {
      setEditorStep('search')
      setSearchQuery('')
      setSearchResults([])
    }
    setCustomForm(customFormVacio(idx !== null ? draft.nombre : ''))
    setOpenDropdown(null)
  }

  // Seleccionar un ejercicio del catálogo: pre-llenar el nombre y cerrar búsqueda
  function seleccionarDelCatalogo(item: EjercicioCatalogItem) {
    if (!editor) return
    setEditor((p) => p && ({ ...p, draft: { ...p.draft, nombre: item.nombre } }))
    setEditorStep('search')
    setSearchQuery(item.nombre)
    setSearchResults([])
  }

  async function guardarEjercicioPersonalizado() {
    if (!editor || !customForm.nombre.trim() || !customForm.patron || customSaving) return
    setCustomSaving(true)
    try {
      const { ejercicio, warning } = await createCustomExercise({
        nombre: customForm.nombre.trim(),
        patron_movimiento: customForm.patron,
        dificultad: customForm.dificultad,
        es_compuesto: customForm.esCompuesto,
        musculos_primarios: customForm.musculosPrim,
        musculos_secundarios: customForm.musculosSec,
        equipamiento: customForm.equipamiento,
        contraindicaciones: customForm.contraindicaciones,
        error_risk: customForm.errorRisk,
        space_required: customForm.spaceRequired,
        analizar_con_ia: true,
      })
      if (warning) {
        Alert.alert('Ejercicio existente', warning)
      }
      // Usar el nombre canónico del ejercicio creado/encontrado
      setEditor((p) => p && ({ ...p, draft: { ...p.draft, nombre: ejercicio.nombre } }))
      setEditorStep('search')
      setSearchQuery(ejercicio.nombre)
    } catch (e: any) {
      Alert.alert('No se pudo crear', e?.message || 'Intenta de nuevo.')
    } finally {
      setCustomSaving(false)
    }
  }
  function guardarEjercicio() {
    if (!editor) return
    if (!editor.draft.nombre.trim()) { return }
    setFases((prev) => {
      const next = prev.map((f) => ({ ...f, ejercicios: [...f.ejercicios] }))
      const list = next[editor.fase].ejercicios
      const ej = { ...editor.draft, nombre: editor.draft.nombre.trim() }
      if (editor.idx === null) list.push(ej)
      else list[editor.idx] = ej
      return next
    })
    setIsDirty(true)
    setEditor(null)
  }
  function borrarEjercicio(faseIdx: number, idx: number) {
    setIsDirty(true)
    setFases((prev) => {
      const next = prev.map((f) => ({ ...f, ejercicios: [...f.ejercicios] }))
      next[faseIdx].ejercicios.splice(idx, 1)
      return next
    })
  }
  function mover(faseIdx: number, idx: number, dir: -1 | 1) {
    setFases((prev) => {
      const next = prev.map((f) => ({ ...f, ejercicios: [...f.ejercicios] }))
      const list = next[faseIdx].ejercicios
      const j = idx + dir
      if (j < 0 || j >= list.length) return prev
      ;[list[idx], list[j]] = [list[j], list[idx]]
      return next
    })
  }

  const readOnly = bloqueada
  const e = editor?.draft

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} activeOpacity={0.6} onPress={() => router.back()}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.topTitle} numberOfLines={1}>Rutina manual</Text>
          <Text style={styles.topSub} numberOfLines={1}>{nombre}</Text>
        </View>
        {estado === 'publicada' && (
          <View style={styles.pubBadge}><Text style={styles.pubBadgeText}>Publicada</Text></View>
        )}
      </View>

      {/* Selector de día */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.diasScroll} contentContainerStyle={styles.diasRow}>
        {dias.map((d) => {
          const active = d.iso === fecha
          return (
            <TouchableOpacity key={d.iso} style={[styles.diaChip, active && styles.diaChipActive]} activeOpacity={0.8} onPress={() => {
                if (isDirty && !readOnly && d.iso !== fecha) {
                  Alert.alert(
                    'Cambios sin guardar',
                    '¿Descartar los cambios de este día y cambiar de fecha?',
                    [
                      { text: 'Cancelar', style: 'cancel' },
                      { text: 'Descartar', style: 'destructive', onPress: () => { setIsDirty(false); setFecha(d.iso) } },
                    ]
                  )
                  return
                }
                setFecha(d.iso)
              }}>
              <Text style={[styles.diaChipText, { color: active ? P.white : P.purpleSoft }]}>{d.label}</Text>
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {loading ? (
        <View style={styles.loadingWrap}><ActivityIndicator color={P.purpleMid} /></View>
      ) : (
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={insets.top + 60}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {readOnly && (
              <View style={styles.lockedBanner}>
                <Text style={styles.lockedText}>El atleta ya empezó esta sesión. Quedó de solo lectura.</Text>
              </View>
            )}

            {/* Meta */}
            <Text style={styles.fieldLabel}>TÍTULO</Text>
            <TextInput style={styles.input} value={titulo} onChangeText={v => { setTitulo(v); setIsDirty(true) }} editable={!readOnly}
              placeholder="Ej: Empuje pesado" placeholderTextColor={P.purpleFaint} maxLength={200} />

            <Text style={styles.fieldLabel}>OBJETIVO</Text>
            <TextInput style={styles.input} value={objetivo} onChangeText={v => { setObjetivo(v); setIsDirty(true) }} editable={!readOnly}
              placeholder="Ej: Fuerza de tren superior" placeholderTextColor={P.purpleFaint} maxLength={200} />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DURACIÓN (MIN)</Text>
                <TextInput style={styles.input} value={duracion} onChangeText={v => { setDuracion(v); setIsDirty(true) }} editable={!readOnly}
                  keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>RPE OBJETIVO</Text>
                <TextInput style={styles.input} value={rpe} onChangeText={v => { setRpe(v); setIsDirty(true) }} editable={!readOnly}
                  keyboardType="decimal-pad" maxLength={4} />
              </View>
            </View>

            {/* Fases */}
            {fases.map((f, fi) => {
              const meta = FASES.find((x) => x.key === f.key)!
              return (
                <View key={f.key} style={styles.faseBlock}>
                  <View style={styles.faseHeader}>
                    <View style={[styles.faseDot, { backgroundColor: meta.color }]} />
                    <Text style={styles.faseNombre}>{meta.nombre}</Text>
                    <Text style={styles.faseCount}>{f.ejercicios.length}</Text>
                  </View>

                  {f.ejercicios.map((ej, ei) => (
                    <View key={ei} style={styles.ejCard}>
                      <TouchableOpacity style={{ flex: 1 }} activeOpacity={0.7} disabled={readOnly} onPress={() => abrirEditor(fi, ei)}>
                        <Text style={styles.ejNombre} numberOfLines={1}>{ej.nombre}</Text>
                        <Text style={styles.ejMeta} numberOfLines={1}>
                          {ej.series} × {ej.repeticiones} · {ej.descanso_segundos}s{ej.rpe_sugerido ? ` · RPE ${ej.rpe_sugerido}` : ''}
                        </Text>
                      </TouchableOpacity>
                      {!readOnly && (
                        <View style={styles.ejActions}>
                          <TouchableOpacity onPress={() => mover(fi, ei, -1)} hitSlop={6} disabled={ei === 0}>
                            <Text style={[styles.ejArrow, ei === 0 && { opacity: 0.25 }]}>↑</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => mover(fi, ei, 1)} hitSlop={6} disabled={ei === f.ejercicios.length - 1}>
                            <Text style={[styles.ejArrow, ei === f.ejercicios.length - 1 && { opacity: 0.25 }]}>↓</Text>
                          </TouchableOpacity>
                          <TouchableOpacity onPress={() => borrarEjercicio(fi, ei)} hitSlop={6}>
                            <Text style={styles.ejDel}>×</Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  ))}

                  {!readOnly && (
                    <TouchableOpacity style={styles.addEj} activeOpacity={0.7} onPress={() => abrirEditor(fi, null)}>
                      <Text style={styles.addEjText}>+ Agregar ejercicio</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            })}

            {/* Nota */}
            <Text style={styles.fieldLabel}>NOTA DEL ENTRENADOR</Text>
            <TextInput style={[styles.input, styles.inputMulti]} value={nota} onChangeText={v => { setNota(v); setIsDirty(true) }} editable={!readOnly}
              placeholder="Ej: Sube la carga ~5% si el RPE queda bajo." placeholderTextColor={P.purpleFaint} multiline maxLength={600} />

            {!!msg && (
              <Text style={[styles.msg, msgIsError ? styles.msgError : styles.msgSuccess]}>
                {msg}
              </Text>
            )}

            {/* Acciones */}
            {!readOnly && (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btnSecond, (saving === 'borrador' || saving === 'quitar') && { opacity: 0.6 }]} activeOpacity={0.85}
                  disabled={!!saving} onPress={() => guardar(false)}>
                  {saving === 'borrador' ? <ActivityIndicator color={P.purpleMid} /> : <Text style={styles.btnSecondText}>Guardar borrador</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btnPrimary, saving === 'publicar' && { opacity: 0.6 }]} activeOpacity={0.85}
                  disabled={!!saving} onPress={() => guardar(true)}>
                  {saving === 'publicar' ? <ActivityIndicator color={P.white} /> : <Text style={styles.btnPrimaryText}>{estado === 'publicada' ? 'Actualizar' : 'Publicar'}</Text>}
                </TouchableOpacity>
              </View>
            )}
            {!readOnly && estado === 'publicada' && (
              <TouchableOpacity style={[styles.btnDelete, saving === 'quitar' && { opacity: 0.6 }]} activeOpacity={0.7} onPress={confirmarQuitar} disabled={!!saving}>
                {saving === 'quitar'
                  ? <ActivityIndicator color={P.orange} />
                  : <Text style={styles.btnDeleteText}>Quitar rutina</Text>}
              </TouchableOpacity>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* ─── Modal de ejercicio: búsqueda + params + ejercicio personalizado ── */}
      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditor(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ width: '100%' }}>
            <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
              <View style={styles.sheetHandle} />

              {/* ── STEP: búsqueda + parámetros del ejercicio ── */}
              {editorStep === 'search' && e && (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  <Text style={styles.sheetTitle}>{editor?.idx === null ? 'Nuevo ejercicio' : 'Editar ejercicio'}</Text>

                  {/* Nombre / búsqueda */}
                  <Text style={styles.fieldLabel}>BUSCAR O ESCRIBIR NOMBRE</Text>
                  <TextInput
                    style={styles.input} value={searchQuery} autoFocus
                    onChangeText={(v) => {
                      setSearchQuery(v)
                      setEditor((p) => p && ({ ...p, draft: { ...p.draft, nombre: v } }))
                    }}
                    placeholder="Ej: Press banca" placeholderTextColor={P.purpleFaint} maxLength={200}
                  />

                  {/* Resultados de búsqueda */}
                  {searchLoading && <ActivityIndicator color={P.purpleMid} style={{ marginBottom: 8 }} />}
                  {!searchLoading && searchQuery.length >= 2 && searchResults.map((item) => (
                    <TouchableOpacity key={item.id} style={styles.searchResult} activeOpacity={0.75}
                      onPress={() => seleccionarDelCatalogo(item)}>
                      <Text style={styles.searchResultNombre} numberOfLines={1}>{item.nombre}</Text>
                      <Text style={styles.searchResultMeta} numberOfLines={1}>
                        {item.patron_label} · {item.dificultad}
                        {item.musculos_primarios.length > 0 ? ` · ${item.musculos_primarios.slice(0, 2).join(', ')}` : ''}
                      </Text>
                    </TouchableOpacity>
                  ))}
                  {/* Sin resultados → invitar a crear */}
                  {!searchLoading && searchQuery.length >= 2 && searchResults.length === 0 && (
                    <View style={styles.noResultsBox}>
                      <Text style={styles.noResultsText}>
                        "{searchQuery.length > 30 ? searchQuery.slice(0, 30) + '…' : searchQuery}" no está en el catálogo.
                      </Text>
                      <TouchableOpacity style={styles.createCustomBtn} activeOpacity={0.85}
                        onPress={() => {
                          setCustomForm(customFormVacio(searchQuery.trim()))
                          setEditorStep('custom')
                        }}>
                        <Text style={styles.createCustomBtnText}>+ Crear ejercicio personalizado</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Separador */}
                  <View style={styles.divider} />

                  {/* Parámetros del ejercicio en la rutina */}
                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>SERIES</Text>
                      <TextInput style={styles.input} value={String(e.series)} keyboardType="number-pad" maxLength={2}
                        onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, series: parseInt(v, 10) || 0 } }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>REPS</Text>
                      <TextInput style={styles.input} value={e.repeticiones} maxLength={50}
                        onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, repeticiones: v } }))}
                        placeholder="8-10" placeholderTextColor={P.purpleFaint} />
                    </View>
                  </View>

                  <View style={styles.row2}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>DESCANSO (S)</Text>
                      <TextInput style={styles.input} value={String(e.descanso_segundos)} keyboardType="number-pad" maxLength={4}
                        onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, descanso_segundos: parseInt(v, 10) || 0 } }))} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.fieldLabel}>RPE (OPC.)</Text>
                      <TextInput style={styles.input} value={e.rpe_sugerido != null ? String(e.rpe_sugerido) : ''}
                        keyboardType="decimal-pad" maxLength={4} placeholder="—" placeholderTextColor={P.purpleFaint}
                        onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, rpe_sugerido: v.trim() ? parseFloat(v) : null } }))} />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>NOTAS (OPC.)</Text>
                  <TextInput style={styles.input} value={e.notas} maxLength={500}
                    onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, notas: v } }))}
                    placeholder="Ej: Controla la fase excéntrica" placeholderTextColor={P.purpleFaint} />

                  <TouchableOpacity
                    style={[styles.btnPrimary, { marginTop: 10 }, !e.nombre.trim() && { opacity: 0.5 }]}
                    activeOpacity={0.85} disabled={!e.nombre.trim()} onPress={guardarEjercicio}>
                    <Text style={styles.btnPrimaryText}>{editor?.idx === null ? 'Agregar' : 'Guardar'}</Text>
                  </TouchableOpacity>
                  <View style={{ height: 8 }} />
                </ScrollView>
              )}

              {/* ── STEP: formulario de ejercicio personalizado ── */}
              {editorStep === 'custom' && catalog && (
                <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                  {/* Header con botón de volver */}
                  <View style={styles.customHeader}>
                    <TouchableOpacity onPress={() => setEditorStep('search')} hitSlop={8}>
                      <Text style={styles.customBack}>← Volver</Text>
                    </TouchableOpacity>
                    <Text style={styles.sheetTitle} numberOfLines={1}>Ejercicio personalizado</Text>
                  </View>

                  {/* Nombre */}
                  <Text style={styles.fieldLabel}>NOMBRE DEL EJERCICIO *</Text>
                  <TextInput style={styles.input} value={customForm.nombre} maxLength={200}
                    onChangeText={(v) => setCustomForm((p) => ({ ...p, nombre: v }))}
                    placeholder="Ej: Sentadilla búlgara con mancuernas" placeholderTextColor={P.purpleFaint} />

                  {/* Patrón de movimiento */}
                  <Text style={styles.fieldLabel}>PATRÓN DE MOVIMIENTO *</Text>
                  <TouchableOpacity style={[styles.dropdownBtn, !customForm.patron && styles.dropdownBtnEmpty]}
                    activeOpacity={0.8} onPress={() => setOpenDropdown(openDropdown === 'patron' ? null : 'patron')}>
                    <Text style={[styles.dropdownBtnText, !customForm.patron && { color: P.purpleFaint }]}>
                      {customForm.patron
                        ? (catalog.patron_movimiento.find((p) => p.value === customForm.patron)?.label ?? customForm.patron)
                        : 'Seleccionar patrón...'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{openDropdown === 'patron' ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {openDropdown === 'patron' && (
                    <View style={styles.dropdownList}>
                      {catalog.patron_movimiento.map((opt) => (
                        <TouchableOpacity key={opt.value} style={[styles.dropdownItem, customForm.patron === opt.value && styles.dropdownItemSelected]}
                          activeOpacity={0.75} onPress={() => { setCustomForm((p) => ({ ...p, patron: opt.value })); setOpenDropdown(null) }}>
                          <Text style={[styles.dropdownItemText, customForm.patron === opt.value && styles.dropdownItemTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Dificultad */}
                  <Text style={styles.fieldLabel}>DIFICULTAD</Text>
                  <View style={styles.chipRow}>
                    {catalog.dificultad.map((opt) => {
                      const sel = customForm.dificultad === opt.value
                      return (
                        <TouchableOpacity key={opt.value} style={[styles.chip, sel && styles.chipSelected]}
                          activeOpacity={0.75} onPress={() => setCustomForm((p) => ({ ...p, dificultad: opt.value }))}>
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Tipo */}
                  <Text style={styles.fieldLabel}>TIPO DE EJERCICIO</Text>
                  <View style={styles.chipRow}>
                    {[{ value: true, label: 'Compuesto' }, { value: false, label: 'Aislamiento' }].map((opt) => {
                      const sel = customForm.esCompuesto === opt.value
                      return (
                        <TouchableOpacity key={String(opt.value)} style={[styles.chip, sel && styles.chipSelected]}
                          activeOpacity={0.75} onPress={() => setCustomForm((p) => ({ ...p, esCompuesto: opt.value }))}>
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Músculos primarios */}
                  <Text style={styles.fieldLabel}>MÚSCULOS PRIMARIOS</Text>
                  {catalog.musculos.map((grupo) => (
                    <View key={grupo.grupo}>
                      <Text style={styles.grupoLabel}>{grupo.grupo}</Text>
                      <View style={styles.chipWrap}>
                        {grupo.items.map((m) => {
                          const sel = customForm.musculosPrim.includes(m)
                          return (
                            <TouchableOpacity key={m} style={[styles.chip, sel && styles.chipSelected]}
                              activeOpacity={0.75}
                              onPress={() => setCustomForm((p) => ({
                                ...p,
                                musculosPrim: sel ? p.musculosPrim.filter((x) => x !== m) : [...p.musculosPrim, m],
                              }))}>
                              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  ))}

                  {/* Músculos secundarios */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>MÚSCULOS SECUNDARIOS</Text>
                  {catalog.musculos.map((grupo) => (
                    <View key={grupo.grupo + '_sec'}>
                      <Text style={styles.grupoLabel}>{grupo.grupo}</Text>
                      <View style={styles.chipWrap}>
                        {grupo.items.map((m) => {
                          const sel = customForm.musculosSec.includes(m)
                          return (
                            <TouchableOpacity key={m} style={[styles.chip, sel && styles.chipSelected]}
                              activeOpacity={0.75}
                              onPress={() => setCustomForm((p) => ({
                                ...p,
                                musculosSec: sel ? p.musculosSec.filter((x) => x !== m) : [...p.musculosSec, m],
                              }))}>
                              <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{m}</Text>
                            </TouchableOpacity>
                          )
                        })}
                      </View>
                    </View>
                  ))}

                  {/* Equipamiento */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>EQUIPAMIENTO</Text>
                  <View style={styles.chipWrap}>
                    {catalog.equipamiento.map((eq) => {
                      const sel = customForm.equipamiento.includes(eq)
                      return (
                        <TouchableOpacity key={eq} style={[styles.chip, sel && styles.chipSelected]}
                          activeOpacity={0.75}
                          onPress={() => setCustomForm((p) => ({
                            ...p,
                            equipamiento: sel ? p.equipamiento.filter((x) => x !== eq) : [...p.equipamiento, eq],
                          }))}>
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{eq}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Contraindicaciones */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>CONTRAINDICACIONES (ZONAS DE LESIÓN)</Text>
                  <Text style={styles.fieldHint}>Zonas del cuerpo donde este ejercicio puede ser problemático.</Text>
                  <View style={styles.chipWrap}>
                    {catalog.contraindicaciones.map((c) => {
                      const sel = customForm.contraindicaciones.includes(c)
                      return (
                        <TouchableOpacity key={c} style={[styles.chip, sel && styles.chipDanger]}
                          activeOpacity={0.75}
                          onPress={() => setCustomForm((p) => ({
                            ...p,
                            contraindicaciones: sel ? p.contraindicaciones.filter((x) => x !== c) : [...p.contraindicaciones, c],
                          }))}>
                          <Text style={[styles.chipText, sel && styles.chipTextDanger]}>{c}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Riesgo de error técnico */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>RIESGO DE ERROR TÉCNICO</Text>
                  <Text style={styles.fieldHint}>¿Qué tan fácil es ejecutarlo mal? (1 = muy simple, 5 = técnica compleja)</Text>
                  <TouchableOpacity style={[styles.dropdownBtn, customForm.errorRisk == null && styles.dropdownBtnEmpty]}
                    activeOpacity={0.8} onPress={() => setOpenDropdown(openDropdown === 'errorRisk' ? null : 'errorRisk')}>
                    <Text style={[styles.dropdownBtnText, customForm.errorRisk == null && { color: P.purpleFaint }]}>
                      {customForm.errorRisk != null
                        ? (catalog.error_risk.find((r) => r.value === customForm.errorRisk)?.label ?? String(customForm.errorRisk))
                        : 'Seleccionar nivel...'}
                    </Text>
                    <Text style={styles.dropdownArrow}>{openDropdown === 'errorRisk' ? '▲' : '▼'}</Text>
                  </TouchableOpacity>
                  {openDropdown === 'errorRisk' && (
                    <View style={styles.dropdownList}>
                      {catalog.error_risk.map((opt) => (
                        <TouchableOpacity key={opt.value} style={[styles.dropdownItem, customForm.errorRisk === opt.value && styles.dropdownItemSelected]}
                          activeOpacity={0.75} onPress={() => { setCustomForm((p) => ({ ...p, errorRisk: opt.value })); setOpenDropdown(null) }}>
                          <Text style={[styles.dropdownItemText, customForm.errorRisk === opt.value && styles.dropdownItemTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {/* Espacio requerido */}
                  <Text style={[styles.fieldLabel, { marginTop: 10 }]}>ESPACIO REQUERIDO</Text>
                  <View style={styles.chipRow}>
                    {catalog.space_required.map((opt) => {
                      const sel = customForm.spaceRequired === opt.value
                      return (
                        <TouchableOpacity key={opt.value} style={[styles.chip, sel && styles.chipSelected]}
                          activeOpacity={0.75} onPress={() => setCustomForm((p) => ({ ...p, spaceRequired: sel ? null : opt.value }))}>
                          <Text style={[styles.chipText, sel && styles.chipTextSelected]}>{opt.label}</Text>
                        </TouchableOpacity>
                      )
                    })}
                  </View>

                  {/* Botón guardar */}
                  <View style={[styles.actions, { marginTop: 18 }]}>
                    <TouchableOpacity style={[styles.btnSecond, { flex: 0.45 }]} activeOpacity={0.85}
                      onPress={() => setEditorStep('search')}>
                      <Text style={styles.btnSecondText}>Cancelar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.btnPrimary, { flex: 1 }, (!customForm.nombre.trim() || !customForm.patron || customSaving) && { opacity: 0.5 }]}
                      activeOpacity={0.85}
                      disabled={!customForm.nombre.trim() || !customForm.patron || customSaving}
                      onPress={guardarEjercicioPersonalizado}>
                      {customSaving
                        ? <ActivityIndicator color={P.white} />
                        : <Text style={styles.btnPrimaryText}>Analizar con IA y guardar</Text>
                      }
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.iaHint}>Groq analizará el ejercicio y completará los campos técnicos automáticamente.</Text>
                  <View style={{ height: 12 }} />
                </ScrollView>
              )}
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </View>
  )
}

// ─── Estilos ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: P.bg },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 12, gap: 10 },
  backBtn: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  backArrow: { fontSize: 24, color: P.purpleSoft, lineHeight: 26 },
  topTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 17, color: P.ink },
  topSub: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleFaint, marginTop: 1 },
  pubBadge: { backgroundColor: P.greenSoft, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  pubBadgeText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 10, color: P.green, letterSpacing: 0.3 },

  diasScroll: { flexGrow: 0, marginBottom: 8 },
  diasRow: { paddingHorizontal: 16, gap: 8 },
  diaChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: P.border, backgroundColor: P.inputBg },
  diaChipActive: { backgroundColor: P.purple, borderColor: P.purple },
  diaChipText: { fontFamily: 'JetBrainsMono-Medium', fontSize: 11, letterSpacing: 0.3 },

  loadingWrap: { paddingTop: 60, alignItems: 'center' },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 20 },

  lockedBanner: { backgroundColor: P.amberSoft, borderRadius: 12, padding: 12, marginBottom: 14 },
  lockedText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.amber },

  fieldLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, color: P.purpleFaint, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 8, marginTop: 6 },
  input: {
    backgroundColor: P.inputBg, borderWidth: 1, borderColor: P.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12,
    fontFamily: 'SpaceGrotesk-Regular', fontSize: 15, color: P.ink,
  },
  inputMulti: { minHeight: 72, textAlignVertical: 'top' },
  row2: { flexDirection: 'row', gap: 12 },

  // Fases
  faseBlock: { marginTop: 14, marginBottom: 6 },
  faseHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  faseDot: { width: 8, height: 8, borderRadius: 4 },
  faseNombre: { flex: 1, fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.ink },
  faseCount: { fontFamily: 'JetBrainsMono-Regular', fontSize: 12, color: P.purpleFaint },
  ejCard: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: P.cardBg, borderWidth: 1, borderColor: P.border, borderRadius: 12, padding: 12, marginBottom: 8,
  },
  ejNombre: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: P.ink },
  ejMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 11, color: P.purpleFaint, marginTop: 3 },
  ejActions: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ejArrow: { fontSize: 16, color: P.purpleSoft },
  ejDel: { fontSize: 20, color: P.orange, lineHeight: 22 },
  addEj: {
    borderWidth: 1, borderColor: P.border, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 12, alignItems: 'center', marginBottom: 4,
  },
  addEjText: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: P.purpleMid },

  msg: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, textAlign: 'center', marginTop: 14 },
  msgSuccess: { color: P.green },
  msgError: { color: P.red },

  // Acciones
  actions: { flexDirection: 'row', gap: 12, marginTop: 18 },
  btnSecond: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50, borderWidth: 1, borderColor: P.border, backgroundColor: 'rgba(150,128,255,0.10)' },
  btnSecondText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.purpleMid },
  btnPrimary: { flex: 1, borderRadius: 14, paddingVertical: 15, alignItems: 'center', justifyContent: 'center', minHeight: 50, backgroundColor: P.purple },
  btnPrimaryText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 15, color: P.white },
  btnDelete: { marginTop: 12, paddingVertical: 14, alignItems: 'center', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,138,61,0.3)' },
  btnDeleteText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 14, color: P.orange },

  // Modal editor
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: P.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: P.border, paddingHorizontal: 20, paddingTop: 12, maxHeight: '90%' },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.borderBright, marginBottom: 14 },
  sheetTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: P.ink, marginBottom: 8 },

  // Búsqueda de ejercicios
  searchResult: {
    backgroundColor: P.inputBg, borderWidth: 1, borderColor: P.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 10, marginBottom: 6,
  },
  searchResultNombre: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 14, color: P.ink },
  searchResultMeta: { fontFamily: 'JetBrainsMono-Regular', fontSize: 10, color: P.purpleFaint, marginTop: 2 },
  noResultsBox: { marginBottom: 10 },
  noResultsText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleFaint, marginBottom: 8 },
  createCustomBtn: {
    borderWidth: 1, borderColor: P.purple, borderRadius: 10,
    paddingVertical: 10, paddingHorizontal: 16, alignItems: 'center',
  },
  createCustomBtnText: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 13, color: P.purpleMid },
  divider: { height: 1, backgroundColor: P.border, marginVertical: 12 },

  // Formulario personalizado
  customHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  customBack: { fontFamily: 'SpaceGrotesk-Medium', fontSize: 13, color: P.purpleMid },
  grupoLabel: { fontFamily: 'JetBrainsMono-Medium', fontSize: 9, color: P.purpleMid, letterSpacing: 1, textTransform: 'uppercase', marginTop: 6, marginBottom: 4 },
  chipRow: { flexDirection: 'row', flexWrap: 'nowrap', gap: 8, marginBottom: 12 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, borderColor: P.border, backgroundColor: P.inputBg,
  },
  chipSelected: { backgroundColor: P.purple, borderColor: P.purple },
  chipDanger: { backgroundColor: 'rgba(255,68,68,0.18)', borderColor: 'rgba(255,68,68,0.5)' },
  chipText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 12, color: P.purpleSoft },
  chipTextSelected: { color: P.white, fontFamily: 'SpaceGrotesk-Medium' },
  chipTextDanger: { color: '#ff6666', fontFamily: 'SpaceGrotesk-Medium' },
  fieldHint: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: P.purpleFaint, marginBottom: 8, marginTop: -4 },

  // Dropdown single-select
  dropdownBtn: {
    backgroundColor: P.inputBg, borderWidth: 1, borderColor: P.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dropdownBtnEmpty: { borderColor: P.border },
  dropdownBtnText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.ink, flex: 1 },
  dropdownArrow: { fontSize: 10, color: P.purpleFaint, marginLeft: 8 },
  dropdownList: {
    backgroundColor: P.cardBg, borderWidth: 1, borderColor: P.border, borderRadius: 12,
    marginBottom: 12, overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: P.border },
  dropdownItemSelected: { backgroundColor: 'rgba(150,128,255,0.15)' },
  dropdownItemText: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 14, color: P.ink },
  dropdownItemTextSelected: { color: P.purpleMid, fontFamily: 'SpaceGrotesk-Medium' },

  iaHint: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 11, color: P.purpleFaint, textAlign: 'center', marginTop: 8 },
})
