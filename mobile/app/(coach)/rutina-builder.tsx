import React, { useCallback, useEffect, useState } from 'react'
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
  type RutinaEjercicio,
  type CoachRutina,
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
  const [saving, setSaving] = useState<'borrador' | 'publicar' | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  // Editor de ejercicio (modal)
  const [editor, setEditor] = useState<{ fase: number; idx: number | null; draft: RutinaEjercicio } | null>(null)

  const total = fases.reduce((s, f) => s + f.ejercicios.length, 0)

  // Carga la rutina de una fecha → puebla el formulario (o lo deja vacío).
  const cargar = useCallback(async (iso: string) => {
    if (!params.id) return
    setLoading(true); setMsg(null)
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
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo cargar la rutina.')
    } finally {
      setLoading(false)
    }
  }, [params.id])

  useEffect(() => { cargar(fecha) }, [fecha, cargar])

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
    if (publicar && !titulo.trim()) { setMsg('Ponle un título a la sesión para publicarla.'); return }
    if (publicar && total === 0) { setMsg('Agrega al menos un ejercicio para publicar.'); return }
    setSaving(publicar ? 'publicar' : 'borrador'); setMsg(null)
    try {
      const { rutina } = await saveAtletaRutina(params.id, buildPayload(publicar))
      setEstado(rutina.estado); setBloqueada(rutina.bloqueada)
      setMsg(publicar ? '✅ Publicada · el atleta la verá en su sesión de ese día.' : 'Borrador guardado.')
    } catch (e: any) {
      setMsg(e?.message || 'No se pudo guardar.')
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
    setSaving('borrador')
    try {
      await deleteAtletaRutina(params.id, fecha)
      setTitulo(''); setObjetivo(''); setDuracion('45'); setRpe('7'); setNota('')
      setFases(fasesVacias()); setEstado(null); setBloqueada(false)
      setMsg('Rutina eliminada.')
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
    setEditor(null)
  }
  function borrarEjercicio(faseIdx: number, idx: number) {
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
            <TouchableOpacity key={d.iso} style={[styles.diaChip, active && styles.diaChipActive]} activeOpacity={0.8} onPress={() => setFecha(d.iso)}>
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
            <TextInput style={styles.input} value={titulo} onChangeText={setTitulo} editable={!readOnly}
              placeholder="Ej: Empuje pesado" placeholderTextColor={P.purpleFaint} maxLength={200} />

            <Text style={styles.fieldLabel}>OBJETIVO</Text>
            <TextInput style={styles.input} value={objetivo} onChangeText={setObjetivo} editable={!readOnly}
              placeholder="Ej: Fuerza de tren superior" placeholderTextColor={P.purpleFaint} maxLength={200} />

            <View style={styles.row2}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>DURACIÓN (MIN)</Text>
                <TextInput style={styles.input} value={duracion} onChangeText={setDuracion} editable={!readOnly}
                  keyboardType="number-pad" maxLength={3} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>RPE OBJETIVO</Text>
                <TextInput style={styles.input} value={rpe} onChangeText={setRpe} editable={!readOnly}
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
            <TextInput style={[styles.input, styles.inputMulti]} value={nota} onChangeText={setNota} editable={!readOnly}
              placeholder="Ej: Sube la carga ~5% si el RPE queda bajo." placeholderTextColor={P.purpleFaint} multiline maxLength={600} />

            {!!msg && <Text style={styles.msg}>{msg}</Text>}

            {/* Acciones */}
            {!readOnly && (
              <View style={styles.actions}>
                <TouchableOpacity style={[styles.btnSecond, saving === 'borrador' && { opacity: 0.6 }]} activeOpacity={0.85}
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
              <TouchableOpacity style={styles.btnDelete} activeOpacity={0.7} onPress={confirmarQuitar} disabled={!!saving}>
                <Text style={styles.btnDeleteText}>Quitar rutina</Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      )}

      {/* Editor de ejercicio */}
      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setEditor(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
            <Pressable style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]} onPress={() => {}}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{editor?.idx === null ? 'Nuevo ejercicio' : 'Editar ejercicio'}</Text>

              {e && (
                <>
                  <Text style={styles.fieldLabel}>EJERCICIO</Text>
                  <TextInput style={styles.input} value={e.nombre} autoFocus
                    onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, nombre: v } }))}
                    placeholder="Ej: Press banca" placeholderTextColor={P.purpleFaint} maxLength={200} />

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
                      <TextInput style={styles.input} value={e.rpe_sugerido != null ? String(e.rpe_sugerido) : ''} keyboardType="decimal-pad" maxLength={4}
                        placeholder="—" placeholderTextColor={P.purpleFaint}
                        onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, rpe_sugerido: v.trim() ? parseFloat(v) : null } }))} />
                    </View>
                  </View>

                  <Text style={styles.fieldLabel}>NOTAS (OPC.)</Text>
                  <TextInput style={styles.input} value={e.notas} maxLength={500}
                    onChangeText={(v) => setEditor((p) => p && ({ ...p, draft: { ...p.draft, notas: v } }))}
                    placeholder="Ej: Controla la fase excéntrica" placeholderTextColor={P.purpleFaint} />

                  <TouchableOpacity style={[styles.btnPrimary, { marginTop: 10 }, !e.nombre.trim() && { opacity: 0.5 }]}
                    activeOpacity={0.85} disabled={!e.nombre.trim()} onPress={guardarEjercicio}>
                    <Text style={styles.btnPrimaryText}>{editor?.idx === null ? 'Agregar' : 'Guardar'}</Text>
                  </TouchableOpacity>
                </>
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

  msg: { fontFamily: 'SpaceGrotesk-Regular', fontSize: 13, color: P.purpleSoft, textAlign: 'center', marginTop: 14 },

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
  sheet: { backgroundColor: P.cardBg, borderTopLeftRadius: 24, borderTopRightRadius: 24, borderTopWidth: 1, borderColor: P.border, paddingHorizontal: 20, paddingTop: 12 },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: P.borderBright, marginBottom: 14 },
  sheetTitle: { fontFamily: 'SpaceGrotesk-SemiBold', fontSize: 16, color: P.ink, marginBottom: 8 },
})
