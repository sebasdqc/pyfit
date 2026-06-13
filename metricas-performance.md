# Métricas y Mediciones para Fútbol y Futsal: Especificación Técnica para Zyfit Performance

## TL;DR
- La **prioridad de implementación debe ser la carga interna sin hardware** (sRPE, monotonía, strain, ACWR, wellness/Hooper, HRV con app + Polar H10) más una batería de tests de campo (Yo-Yo IR1/IR2, 30-15 IFT, CMJ, sprints 10/30 m, 505, RAST): cubre la mayor parte del valor de un sistema de alto rendimiento a costo casi nulo y es viable para el cliente semi-pro de Venezuela/LATAM.
- El **GPS/wearable (PlayerLoad, HSR, aceleraciones/desaceleraciones, metabolic power)** es un segundo tier: aporta carga externa de precisión pero solo debe activarse como módulo opcional para clientes élite, ya que duplica métricas que el sistema interno ya estima.
- **Futsal exige umbrales propios**: no es "fútbol en pequeño". Sus demandas (83% del tiempo sobre 85% FCmáx, 7–9 aceleraciones y desaceleraciones por minuto, esfuerzos de 1–4 s, sustituciones ilimitadas) obligan a benchmarks, zonas de velocidad y tests específicos distintos a los del fútbol 11.

## Key Findings

1. **El sRPE (RPE × duración) es la columna vertebral del monitoreo interno** y deriva en monotonía, strain y ACWR sin ningún hardware. El método de Foster ha sido validado ampliamente: según la revisión de Haddad et al. (2017, *Frontiers in Neuroscience*, PMC5673663), 36 estudios confirmaron "la validez y buena fiabilidad y consistencia interna del método session-RPE en varios deportes… con hombres y mujeres de diferentes categorías de edad… entre varios niveles de experiencia".
2. **El ACWR tiene dos modelos (RA y EWMA)** con resultados distintos; el EWMA es más sensible al riesgo de lesión. El "sweet spot" se sitúa en 0.8–1.3 y la "danger zone" sobre 1.5.
3. **Las escalas de wellness (Hooper Index 1–7) y la HRV (Ln rMSSD) capturan fatiga y recuperación** con un cuestionario diario y un cinturón Polar H10 económico, respectivamente.
4. **Tests de campo bien establecidos** (Yo-Yo IR1/IR2, 30-15 IFT con fórmula de VO2máx de Buchheit, CMJ, sprints, 505/COD deficit, RAST) tienen protocolos y normas publicadas por posición, sexo y nivel.
5. **El futsal es el deporte de equipo con mayor proporción de tiempo a alta intensidad**: requiere capturar densidad de aceleraciones/desaceleraciones y perfil intermitente más que distancia total.
6. **Prevención: ACWR + Nordic (break-point angle) + LSI ≥90% + wellness** forman el núcleo de return-to-play sin equipamiento de laboratorio.
7. **Psicología: BRUMS (24 ítems, 6 subescalas, TMD)** es la herramienta de estado de ánimo más práctica; complementada con RESTQ-Sport para recuperación-estrés.

---

## Details

### CATEGORÍA 1 — CARGA INTERNA (mayormente SIN HARDWARE)

#### 1.1 RPE (Rating of Perceived Exertion) — SIN HARDWARE
- **Qué mide / por qué importa:** percepción subjetiva de intensidad del esfuerzo; refleja el estrés fisiológico global (incluye estrés de vida diaria, no solo el entrenamiento). Validado contra FC y lactato.
- **Captura:** escala CR-10 de Borg modificada por Foster (0–10). Se pregunta "¿Cómo fue de dura tu sesión?" idealmente **~30 min después** de terminar para que la valoración sea global y no del último esfuerzo.
- **Frecuencia:** por sesión (cada sesión, cada jugador).
- **Aplicabilidad fútbol vs futsal:** idéntica metodología; en futsal los valores tienden a ser altos por la densidad del juego.

#### 1.2 sRPE (session-RPE) — SIN HARDWARE
- **Fórmula:** `sRPE (UA) = RPE (0–10) × duración de la sesión (min)`. Unidad = "unidades arbitrarias" (UA/AU).
- **Carga diaria** = suma de todos los sRPE del día (si hay gimnasio + campo, se suman).
- **Carga semanal acumulada** = suma de las cargas diarias de los 7 días.
- **Frecuencia:** por sesión → agregada diaria y semanalmente.

#### 1.3 Monotonía (Training Monotony) — SIN HARDWARE
- **Qué mide:** variabilidad día a día de la carga; alta monotonía + alta carga se asocia a sobreentrenamiento, enfermedad y bajo rendimiento (Foster 1998).
- **Fórmula:** `Monotonía = media de la carga diaria de la semana ÷ desviación estándar (SD) de la carga diaria de la semana`.
- **Alerta:** valores >2.0 se consideran de riesgo. Cuidado matemático: si la SD = 0 (cargas idénticas todos los días) la fórmula da división por cero → conviene un cap o cálculo alternativo.

#### 1.4 Strain (Training Strain) — SIN HARDWARE
- **Fórmula:** `Strain = carga semanal total × monotonía`.
- **Qué mide:** estrés acumulado total ponderado por la falta de variación. Strain alto se asocia a incidencia de enfermedad y mal rendimiento.

#### 1.5 ACWR (Acute:Chronic Workload Ratio) — SIN HARDWARE (con sRPE) o CON GPS
- **Qué mide:** relación entre "fatiga" (carga aguda, ventana de 7 días) y "fitness" (carga crónica, ventana de 28 días). Es el motor del módulo de prevención de Zyfit.
- **Modelo Rolling Average (RA) acoplado:**
  - `ACWR = carga aguda (media 7 días) ÷ carga crónica (media 28 días)`.
  - Pondera por igual todas las cargas dentro de la ventana; no considera la naturaleza decreciente del fitness.
- **Modelo EWMA (Exponentially Weighted Moving Average):**
  - `EWMA_hoy = Carga_hoy × λa + ((1 − λa) × EWMA_ayer)`
  - donde `λa = 2 ÷ (N + 1)`, siendo N la ventana (7 para aguda, 28 para crónica). λa es un factor de decaimiento entre 0 y 1.
  - `ACWR_EWMA = EWMA_agudo ÷ EWMA_crónico`.
  - Da más peso a las cargas recientes y modela la disminución gradual del fitness → **más sensible para detectar riesgo de lesión** que el RA (Williams et al. 2017; Murray et al. 2016).
- **Zonas (benchmarks):**
  - **Sweet spot: 0.8–1.3** (riesgo de lesión más bajo).
  - **Danger zone: >1.5** (riesgo aumenta rápidamente).
  - **>2.0:** riesgo relativo muy elevado. Según Murray et al. (2017), recogido en la revisión sistemática de Maupin et al. (*Open Access J Sports Med*, PMC7047972), un ACWR de distancia total >2.00 frente al rango 1.00–1.49 aumentó el riesgo de lesión tanto en pretemporada (RR = 8.41) como en temporada (RR = 6.52); con el método EWMA los riesgos relativos del mismo ratio subieron a 8.74 y 21.28 respectivamente.
  - **<0.8:** infracarga (detraining / falta de preparación).
- **Frecuencia:** diaria (cálculo continuo).
- **Variantes de ventana:** además de 7:28, se han usado 3:21 días con buena asociación a lesión.
- **Aplicabilidad futsal:** mismo cálculo; la carga base puede ser sRPE o (con hardware) PlayerLoad/distancia.

#### 1.6 TRIMP (Training Impulse) — REQUIERE MONITOR DE FC
- **Banister TRIMP:** `TRIMP = duración (min) × ΔHR × Y`, donde `ΔHR = (FC media − FC reposo) ÷ (FC máx − FC reposo)` (fracción de la reserva de FC) y `Y` = factor de ponderación exponencial que evita sobrevalorar el ejercicio largo de baja intensidad. Para hombres `Y = 0.64 × e^(1.92 × ΔHR)`; para mujeres `Y = 0.86 × e^(1.67 × ΔHR)`.
- **Edwards TRIMP (por zonas):** suma del tiempo en 5 zonas de FC × factor de zona (Z1×1, Z2×2, Z3×3, Z4×4, Z5×5). Zonas definidas por %FCmáx.
- **Lucia TRIMP:** 3 zonas ancladas a umbrales ventilatorios (VT1, VT2): Z1×1, Z2×2, Z3×3.
- **iTRIMP (individualizado):** ponderación basada en la curva lactato-FC individual; el más preciso pero requiere test de lactato (laboratorio).
- **Aplicabilidad:** en deportes intermitentes (fútbol/futsal) la FC media subestima la intensidad real; conviene usar datos latido a latido o zonas (Edwards).

#### 1.7 Zonas de frecuencia cardíaca — REQUIERE MONITOR DE FC
- 5 zonas estándar por %FCmáx (50-60, 60-70, 70-80, 80-90, 90-100%).
- **Métrica clave en intermitentes:** tiempo (o %) por encima del 90% FCmáx (Castagna mostró relación dosis-respuesta).
- **Futsal:** capturar % de tiempo >85% y >90% FCmáx es prioritario (ver Categoría 7).

#### 1.8 HRV — Variabilidad de la Frecuencia Cardíaca — HARDWARE MÍNIMO (app + cinturón)
- **Métrica:** **rMSSD** (raíz cuadrada media de las diferencias sucesivas entre intervalos R-R) y su transformación logarítmica **Ln rMSSD**. Refleja la **actividad parasimpática (vagal)**; cae con estrés, enfermedad y entrenamiento intenso.
- **Por qué Ln rMSSD:** es la medida más fiable y práctica para el seguimiento día a día (Plews et al. 2013, *Sports Medicine* 43:773–781), y es relativamente insensible al patrón respiratorio.
- **Protocolo de captura:** por la mañana al despertar, tras orinar y antes de cafeína/comida; posición consistente (supino o sentado); **1 min de estabilización + 1 min de registro**; respiración espontánea; idealmente diario o mínimo 3–4 lecturas/semana.
- **Herramientas económicas validadas:** apps Elite HRV o HRV4Training con cinturón **Polar H10**. Según un estudio observacional en *Frontiers in Physiology* (2025) con 37 atletas frente a ECG, "el cinturón pectoral Polar tuvo la mayor consistencia y el menor error comparado con ECG (RMSSD MAPE: 2.16%). La app PPG también demostró validez fuerte (RMSSD MAPE: 17.49%) pero con límites de acuerdo más amplios." Kubios se usa como software de referencia para corrección de artefactos.
- **Toma de decisiones:** usar la **media móvil de 7 días de Ln rMSSD** (no valores aislados); definir el **Smallest Worthwhile Change (SWC) = media ± 0.5 × SD** de la línea base individual. Caída por debajo del límite inferior → reducir carga. Monitorear también el **coeficiente de variación (CV)** del Ln rMSSD: su aplanamiento señala sobrecarga no funcional.
- **Aplicabilidad fútbol/futsal:** igual protocolo; útil en microciclos congestionados de futsal.

---

### CATEGORÍA 2 — CARGA EXTERNA (REQUIERE GPS/WEARABLE)

> Nota de implementación: este tier debe ser un módulo opcional "GPS" en Zyfit. En interiores (futsal) el GPS no funciona; se requiere LPS (Local Positioning System, UWB) o acelerometría inercial.

#### 2.1 Distancia total y distancia por zonas de velocidad
- **Fútbol élite:** 10–13 km por partido (media 10–12 km). ~10% del total a alta intensidad. En la MLS la media de distancia total fue 9.950 ± 990 m (Second Spectrum, 1.243 partidos).
- **Zonas de velocidad típicas (absolutas):** Z1 0.1–6, Z2 6–12, Z3 12–18, Z4 18–21, Z5 21–24, Z6 >24 km/h (varían por proveedor).
- **Futsal:** 3.000–4.000 m por partido (hasta ~4.313 m); 108–232 m/min; densidad mucho mayor por minuto. 10.3–13.7% del total a alta intensidad; sprint 8.9–10.1%.

#### 2.2 High-Speed Running (HSR) y sprint
- **Umbral absoluto HSR:** >19.8 km/h (5.5 m/s). **Sprint:** >25.2 km/h (7 m/s). En la MLS estas son las definiciones operativas (HSR 19.8–25.2 km/h; SpD >25.2 km/h).
- **Umbral relativo (recomendado):** % de la velocidad máxima individual (p. ej. HSR >55% Vmáx; sprint >90% Vmáx). El umbral absoluto de 19.8 km/h representa 55% para un jugador de 36 km/h pero 66% para uno de 30 km/h → la normalización individual es más justa.
- **Pico de velocidad en partido (fútbol élite):** ~32.9 km/h (1ª división portuguesa, GNSS, 34 partidos).
- **Futsal:** las áreas reducidas (~80 m²/jugador) subestimulan el HSR; por eso en futsal pesan más las aceleraciones/desaceleraciones que el HSR.

#### 2.3 Aceleraciones / desaceleraciones por umbrales
- **Umbrales:** alta intensidad >3 m/s² (acel.) y <−3 m/s² (decel.); umbral medio >2 m/s².
- **Fútbol:** aceleraciones 7–10% de la carga, desaceleraciones 5–7%.
- **Futsal:** según Illa et al. (2020), "Local Positioning System Analysis of Physical Demands during Official Matches in the Spanish Futsal League" (PMC7506966), con 14 jugadores élite y 10 partidos de la temporada 2019-20 medidos con LPS-UWB: "hubo un número alto de aceleraciones (7,42–9,41 n·min⁻¹) y desaceleraciones (7,37–9,12 n·min⁻¹) por minuto en todas las posiciones", con magnitudes mayoritariamente <3 m/s² y distancias <10 m. Esta es la métrica más discriminante en futsal (pivots y alas).

#### 2.4 PlayerLoad (acelerometría) — métrica propietaria Catapult
- **Qué mide:** carga mecánica acumulada por acelerometría triaxial; volumen de trabajo independiente de la velocidad (acumula en saltos, contactos, cambios de dirección).
- **Fórmula (Boyd et al., vector magnitude modificado):** PlayerLoad acumulado = suma de la raíz cuadrada de la suma de los cuadrados de las tasas instantáneas de cambio de aceleración en los 3 ejes (anteroposterior, mediolateral, vertical), multiplicada por un factor de escala (×0.01).
  - `PL = Σ √[(ax_t − ax_{t-1})² + (ay_t − ay_{t-1})² + (az_t − az_{t-1})²] × escala`
- **Uso:** comparación de volumen; un PL de 300 = 50% más trabajo que uno de 200. Base alternativa para ACWR.
- **Aplicabilidad futsal:** muy relevante porque captura la carga de los frecuentes cambios de dirección que el GPS de distancia no refleja.

#### 2.5 Metabolic Power y High Metabolic Load Distance — GPS exterior
- **Qué mide:** coste energético estimado de acelerar/desacelerar (modelo de Osgnach et al. 2010, di Prampero); útil porque el jugador puede operar por encima de su VO2máx.
- **Fórmula (Catapult):** `Coste energético (J/kg/m) = f(ES) × EM × KT`, donde ES = pendiente equivalente, EM = masa equivalente, KT = término fijo. Acel/decel se derivan de la velocidad GPS filtrada (filtro gaussiano 1 s; se excluyen aceleraciones >1g por error GPS).
- **High Metabolic Load Distance:** distancia recorrida por encima de un umbral de potencia metabólica (típ. 25.5 W/kg).

---

### CATEGORÍA 3 — WELLNESS / RECUPERACIÓN / FATIGA (SIN HARDWARE)

#### 3.1 Cuestionario de Wellness / Hooper Index
- **Qué mide:** 4 ítems subjetivos: **fatiga, calidad de sueño, dolor muscular (DOMS) y estrés**.
- **Escala (Hooper & Mackinnon 1995):** cada ítem 1–7 (1 = muy muy bajo/bueno; 7 = muy muy alto/malo). **Hooper Index = suma de los 4 ítems** (rango 4–28).
- Existen variantes con escala 1–5 y 1–10; mantener consistencia interna.
- **Captura:** ~30 min antes de cada sesión, en tablet/móvil.
- **Frecuencia:** diaria (idealmente al despertar o pre-sesión).
- **Uso:** seguimiento de tendencia individual; caída brusca → bandera de fatiga/recuperación insuficiente. Se combina con sRPE y ACWR.

#### 3.2 TQR (Total Quality Recovery) — Kenttä & Hassmén 1998 (*Sports Medicine* 26(1):1–16)
- **TQRperc (percibido):** escala **6–20** (espejo del RPE de Borg), de "ninguna recuperación" (6) a "máxima recuperación" (20).
- **TQRact (acción):** puntúa conductas de recuperación en 24 h hasta **20 puntos** (nutrición/hidratación máx 10, sueño/descanso máx 4, relajación/apoyo emocional máx 3, estiramiento/vuelta a la calma máx 3).
- **Interpretación práctica:** ≥13 = recuperación adecuada; <13 = incompleta (guía práctica, no corte validado estricto).
- **Uso:** se empareja con sRPE — sRPE mide la "ruptura/carga"; TQR mide la "recuperación". En fútbol, TQR correlaciona inversamente con creatina-quinasa (CK) post-partido (r ≈ −0.75; Osiecki et al. 2015).

#### 3.3 RESTQ-Sport — Kellmann & Kallus (User Manual, Human Kinetics 2001)
- **Versiones:** 76 ítems (19 escalas), 52 ítems (19 escalas), 36 ítems (12 factores).
- **Escala:** Likert **0 (nunca) – 6 (siempre)**, marco "en los últimos 3 días/noches".
- **Estructura:** 12 escalas generales (7 estrés + 5 recuperación) + 7 específicas de deporte (3 estrés + 4 recuperación).
- **Uso:** balance estrés-recuperación, detección de sobreentrenamiento y burnout. Sensible a cambios de carga. Crítica: estudios psicométricos (Davis et al. 2007) no confirmaron la estructura completa de 19 subescalas.

#### 3.4 Peso corporal / hidratación — SIN HARDWARE (báscula)
- Cambio de masa corporal pre/post sesión como proxy de pérdida de fluidos; `% deshidratación = (peso pre − peso post) ÷ peso pre × 100`.

---

### CATEGORÍA 4 — TESTS FÍSICOS DE CAMPO

#### 4.1 Tests aeróbicos / intermitentes (SIN HARDWARE)

**Yo-Yo Intermittent Recovery Test Level 1 (Yo-Yo IR1)**
- **Protocolo:** carreras de ida y vuelta de 2 × 20 m a velocidad creciente dictada por señales sonoras, con 10 s de recuperación activa (2 × 5 m) entre cada tramo. Comienza a 10 km/h.
- **Resultado:** distancia total recorrida (m) / nivel alcanzado.
- **Normas (hombres):** internacional ~2.420 m (nivel ~20.3); élite ~2.190 m (nivel 18.7); moderadamente entrenado ~1.810 m. **Mujeres:** internacional ~1.600 m; élite ~1.360 m; sub-élite ~1.160 m (Bangsbo et al. 2008; tablas Topend Sports como guía).
- **Yo-Yo IR2:** comienza más rápido, mayor componente anaeróbico; usado en élite (Krustrup et al. 2006).
- **Aplicabilidad futsal:** validado; futsalistas masculinos cubren ~1.160–1.507 m en IR1.

**30-15 Intermittent Fitness Test (30-15 IFT)**
- **Protocolo:** carreras de ida/vuelta de 40 m con 30 s de carrera y 15 s de descanso; velocidad incremental. Se registra **VIFT** = velocidad de la última etapa completada.
- **Fórmula VO2máx (Buchheit 2008):** `VO2máx (ml/kg/min) = 28.3 − (2.15 × G) − (0.741 × A) − (0.0357 × W) + (0.0586 × A × VIFT) + (1.03 × VIFT)`, donde G = sexo (hombre=1, mujer=2), A = edad (años), W = peso (kg), VIFT = velocidad final (km/h).
- **Normas VIFT (hombres):** élite/profesional 19.5–21.0 km/h; avanzado/universitario 17.5–19.4; intermedio/club 15.5–17.4; juvenil 14.0–15.4. Mujeres ~2–2.5 km/h menos.
- **Uso clave:** individualizar la velocidad de entrenamiento interválico de alta intensidad. Nota: tiende a sobreestimar el VO2máx comparado con test incremental directo.

**Course Navette / beep test (20 m MSFT) y Cooper:** alternativas más simples y económicas para nivel formativo; menos específicas que los Yo-Yo para intermitentes.

#### 4.2 Tests de velocidad (HARDWARE MÍNIMO: fotocélulas o app)
- **Protocolo:** sprint lineal de 30–40 m con splits a 5, 10, 20, 30 m; salida desde parado 0.3–0.5 m antes de la primera célula; 2 intentos, se toma el mejor.
- **Normas fútbol élite (hombres):** 10 m ~1.7–1.85 s; 30 m ~4.0–4.3 s; Vmáx 9–10 m/s. Por posición (U21 eslovacos): delanteros 10 m 2.17 s / 30 m 4.53 s; mediocampistas 2.19 / 4.56 s; defensas 2.25 / 4.67 s; porteros 2.31 / 4.72 s.
- **Flying sprint (20–30 m lanzado):** estima velocidad máxima.
- **Captura económica:** apps de visión por computadora (móvil + conos) o cronometraje manual con 3 cronómetros; fotocélulas (€1.200+) para precisión profesional.

#### 4.3 Tests de agilidad / cambio de dirección (HARDWARE MÍNIMO)
- **505 Test:** sprint 15 m, giro de 180° en la marca de 10 m, regreso 5 m; se cronometran los últimos 5 m + giro. Se mide cada pierna. **Élite fútbol/básquet:** <2.20 s (hombres), <2.50 s (mujeres) (Draper & Lancaster 1985).
- **COD Deficit:** `COD deficit = tiempo 505 − tiempo del split 10 m de sprint lineal` (en segundos) o `(tiempo 505 ÷ tiempo 10 m × 100) − 100` (%). Aísla la capacidad de girar de la velocidad lineal. Nota: fiabilidad limitada en jóvenes (CV >10%, ICC <0.50; no recomendado para fútbol juvenil de élite como medida fina).
- **T-test, Illinois, Arrowhead:** otros tests de COD validados; útiles para variar estímulos.
- **Asimetría:** comparar pierna izquierda vs derecha (dominancia direccional).

#### 4.4 Tests de potencia / salto (HARDWARE MÍNIMO: app o alfombra)
- **CMJ (Countermovement Jump):**
  - **Protocolo:** manos en cadera, contramovimiento rápido, 3 saltos máximos con ~1 min de recuperación.
  - **Cálculo por tiempo de vuelo:** `altura (m) = (g × t²) ÷ 8 = 1.226 × t²`, donde t = tiempo de vuelo (s), g = 9.81 m/s².
  - **Cálculo por impulso-momento** (plataforma de fuerza): velocidad de despegue = impulso neto/masa. Nota: la alfombra de contacto y la plataforma de fuerza NO son intercambiables (la alfombra sobreestima ~3.2 cm vs ForceDecks).
  - **Normas fútbol:** profesionales hombres ~39 cm (Serie A 39.2 ± 4.9 cm); futsal masculino 36.6–50.4 cm.
  - **Uso de monitoreo:** caída del CMJ post-partido como marcador de fatiga neuromuscular (se recupera ~48 h).
- **Squat Jump (SJ):** sin contramovimiento; diferencia CMJ−SJ = índice de uso elástico.
- **Drop Jump y RSI (Reactive Strength Index):** `RSI = altura del salto ÷ tiempo de contacto`. Mide capacidad reactiva/pliométrica.
- **Broad jump (salto horizontal):** test simple sin equipo (cinta métrica).

#### 4.5 Tests anaeróbicos (SIN HARDWARE caro)
- **RAST (Running Anaerobic Sprint Test) — Draper & Whyte 1997:**
  - **Protocolo:** 6 sprints máximos de 35 m con 10 s de recuperación entre cada uno.
  - **Potencia de cada sprint:** `Potencia (W) = masa (kg) × distancia² (m²) ÷ tiempo³ (s³)`.
  - **Potencia pico** = mayor de los 6; **potencia media** = suma/6; **Índice de Fatiga (FI)** = `(potencia máx − potencia mín) ÷ tiempo total de los 6 sprints`.
  - **Potencia pico relativa** = potencia pico ÷ masa corporal.
- **RSA (Repeated Sprint Ability):** series de sprints (p.ej. 6–7 × 30 m o 20+20 m con cambio de dirección); se mide tiempo total, mejor tiempo y % de decremento. Según Spyrou et al. (2020, *Frontiers in Psychology*, PMC7775300), los futsalistas élite superan a los amateurs en todos los tramos del RSA y en el sprint de 30 m (tiempo total de RSA −2.95 s; ES: 1.59; p<0.001).

#### 4.6 Tests de fuerza con equipamiento mínimo
- **Nordic Hamstring Test:** ver sección 5.2.
- **Sentadilla, peso muerto, 1RM estimado:** con barra; para clubes con gimnasio.

---

### CATEGORÍA 5 — PREVENCIÓN DE LESIONES Y RETURN-TO-PLAY

#### 5.1 ACWR — núcleo del módulo de prevención (ver 1.5).

#### 5.2 Nordic Hamstring — break-point angle (HARDWARE MÍNIMO: vídeo/app)
- **Qué mide:** fuerza excéntrica de isquiotibiales (principal factor de riesgo modificable de lesión de isquios).
- **Protocolo:** posición arrodillada, tobillos fijados; el jugador inclina el tronco hacia delante resistiendo la caída. El **break-point angle** = ángulo de flexión de rodilla en el que ya no puede resistir la caída.
- **Validación:** el break-point angle correlaciona con el pico de torque excéntrico isocinético (r ≈ −0.81 en Lee et al.; r 0.48–0.58 en otros). BPA ~50° incluso en futbolistas entrenados. Apps de smartphone (Nordic Angle) calculan el ángulo automáticamente.
- **Dispositivos económicos:** NordBord y similares miden fuerza excéntrica (N) y asimetría entre piernas.

#### 5.3 Limb Symmetry Index (LSI) — SIN HARDWARE (hop tests)
- **Fórmula:** `LSI = (rendimiento pierna lesionada/operada ÷ rendimiento pierna sana) × 100`.
- **Criterio RTP:** **LSI ≥90%** en batería de single-leg hop tests (single hop, triple hop, crossover hop, timed hop) Y en fuerza.
- **Crítica importante:** el LSI puede sobreestimar la recuperación porque la pierna sana se debilita durante la rehabilitación; algunos expertos exigen 95–100% y comparación con valores pre-lesión. Solo el 45% de jóvenes atletas sanos alcanza ≥90% en TODA la batería simultáneamente.
- **Frecuencia:** en hitos de RTP.

#### 5.4 FMS (Functional Movement Screen) — SIN HARDWARE
- **7 tests:** deep squat, hurdle step, in-line lunge, shoulder mobility, active straight-leg raise, trunk stability push-up, rotary stability.
- **Puntuación:** 0–3 cada uno (0 = dolor, 3 = perfecto); composite máx **21**. En tests bilaterales se registra el lado peor.
- **Cutoff clásico:** ≤14/21 asociado a mayor riesgo (Kiesel et al. 2007: lesionados 14.3 ± 2.3 vs no lesionados 17.4 ± 3.1; OR ~11.7).
- **Crítica:** la revisión sistemática de Moran et al. (2017, *Br J Sports Med* 51(23):1661–1669) halló evidencia "moderada" para **recomendar EN CONTRA** del uso del composite como predictor de lesión en fútbol; la **asimetría entre lados** es más predictiva que el score total. Usar con cautela como cribado de movilidad, no de predicción.

#### 5.5 Criterios de progresión en return-to-play
- Combinar: ACWR controlado durante rehab (carga progresiva), LSI ≥90% (idealmente con comparación pre-lesión), ausencia de dolor, wellness/HRV normalizados, y tests funcionales sin déficit. Baterías criterio-basadas (p.ej. LESS <5, ACL-RSI >56 para confianza psicológica post-ACL).

---

### CATEGORÍA 6 — MÉTRICAS PSICOLÓGICAS (SIN HARDWARE)

#### 6.1 BRUMS (Brunel Mood Scale) — herramienta principal de estado de ánimo (Terry et al. 1999, 2003)
- **Estructura:** 24 ítems, 6 subescalas (tensión, depresión, ira, vigor, fatiga, confusión), 4 ítems cada una.
- **Escala:** Likert 0–4 (0 = nada, 4 = extremadamente); subescala 0–16.
- **TMD (Total Mood Disturbance):** `TMD = (tensión + depresión + ira + fatiga + confusión) − vigor`.
- **Tiempo:** 2–3 min (vs 7–10 min del POMS de 65 ítems). Fiabilidad α: tensión 0.74, depresión 0.85, ira 0.82, vigor 0.85, fatiga 0.90, confusión 0.83.
- **Uso:** detección de sobreentrenamiento (perfil "iceberg" invertido), monitoreo de fatiga de viaje, rehabilitación. Validado en español/portugués (versiones brasileñas).

#### 6.2 POMS (Profile of Mood States)
- Versión original 65 ítems, 6 factores. BRUMS es su versión abreviada validada en atletas; recomendable BRUMS por brevedad.

#### 6.3 Otras herramientas
- **RESTQ-Sport** (ver 3.3) para estrés-recuperación.
- **Cuestionarios de readiness diario** (combinan wellness + estado de ánimo + sueño en 1 ítem cada uno).
- **Ansiedad competitiva** (CSAI-2), motivación, burnout deportivo (ABQ de Raedeke & Smith) — para módulos avanzados.

---

### CATEGORÍA 7 — MÉTRICAS ESPECÍFICAS DE FUTSAL

**Perfil de demanda de partido (futsal élite):**
- **Distancia total:** 3.000–4.000 m (hasta ~4.313 m); 108–232 m/min (mucho mayor densidad que fútbol).
- **Intensidad cardiovascular:** según Barbero-Álvarez et al. ("Match analysis and heart rate of futsal players during competition"), los jugadores pasaron el 83%, 16% y 0.3% del tiempo en las zonas >85%, 85–65% y <65% FCmáx respectivamente; la FC media fue de "173 ± 7 bpm (164–181 bpm), que representó el 90 ± 2% (86–93%) de la FCmáx". Otros estudios reportan 86.4% FCmáx y 79.2% VO2máx de media (Castagna).
- **Lactato:** 5.3–8.5 mmol/L → alta contribución anaeróbica.
- **Gasto energético:** 16.3–18.0 kcal/min; ~313 kcal/partido.
- **Esfuerzos:** sprints de 1–4 s; secuencia de repetición más común 2–3 sprints con recuperación ≤15 s.
- **Aceleraciones/desaceleraciones:** 7.42–9.41 acel/min y 7.37–9.12 decel/min (la métrica más discriminante; Illa et al. 2020).
- **Sustituciones ilimitadas:** permiten mantener intensidad altísima → la distancia total no refleja bien la carga; usar métricas relativas (por minuto) y densidad de acel/decel.

**Determinantes de rendimiento (futsal):**
- VO2máx: 49–63 ml/kg/min; élite > sub-élite (62.9 vs 55.2).
- CMJ: 36.6–50.4 cm; RSI, broad jump, velocidad de golpeo discriminan nivel.
- Tests específicos validados: tests de COD y agilidad reactiva con/sin balón (FSRAG), velocidad de golpeo pierna dominante/no dominante (jugadores top superan a high-level en RSI, broad jump, velocidad de golpeo y FSRAG con regate).

**Implicaciones para Zyfit:**
- Zonas de velocidad y umbrales HSR **deben recalibrarse** (más bajos) para futsal por las áreas reducidas.
- Priorizar densidad de acel/decel por minuto, % tiempo >85–90% FCmáx, RSA y CMJ sobre distancia total y HSR.
- En interiores el GPS no sirve → acelerometría (PlayerLoad) o LPS/UWB.

---

## Recommendations

**Fase 1 (MVP, todos los clientes, sin hardware):** Implementar el núcleo de carga interna y wellness:
- sRPE → carga diaria/semanal → monotonía → strain → ACWR (ofrecer ambos modelos RA y EWMA, con EWMA por defecto y visualización del sweet spot 0.8–1.3 / danger zone >1.5).
- Hooper Index diario (1–7) + alertas de tendencia individual.
- BRUMS semanal/quincenal.
- Batería de tests de campo con calculadoras integradas: Yo-Yo IR1, 30-15 IFT (con fórmula Buchheit), CMJ (tiempo de vuelo), sprint 10/30 m, 505 + COD deficit, RAST. Almacenar normas por posición/sexo/nivel.
- **Benchmark de cambio:** si un cliente pide repetibilidad de tests <1 semana o predicción de lesión "exacta", educar sobre la variabilidad (CV de CMJ, COD deficit) en vez de prometer precisión falsa.

**Fase 2 (módulo recuperación avanzada, hardware mínimo):**
- HRV (Ln rMSSD) con integración Elite HRV/HRV4Training + Polar H10; media móvil 7 días + SWC individual (±0.5 SD).
- Nordic break-point angle (app de vídeo) + LSI para el módulo de lesiones/RTP.
- TQR y RESTQ-Sport para clientes con foco en recuperación/burnout.

**Fase 3 (módulo GPS/wearable, solo élite):**
- Integrar carga externa (distancia, zonas de velocidad, HSR absoluto y relativo, acel/decel por umbrales, PlayerLoad, metabolic power).
- Para futsal: priorizar PlayerLoad/acelerometría o LPS; recalibrar umbrales.
- Alimentar el ACWR con carga externa además de sRPE.

**Umbrales que cambian la decisión:**
- Si el cliente es semi-pro/formativo con presupuesto bajo → quedarse en Fase 1 + HRV opcional.
- Si el cliente es federación/primera división con GPS ya instalado → activar Fase 3 desde el inicio.
- Si el deporte primario es futsal → ajustar todos los umbrales de velocidad y priorizar métricas relativas/por minuto desde Fase 1.

---

## Caveats
- **El ACWR es controvertido:** parte de la literatura reciente cuestiona su validez predictiva de lesiones por problemas metodológicos. Debe presentarse como indicador contextual de gestión de carga, NO como predictor causal de lesión.
- **Monotonía/strain no son predictores aislados** de lesión; son indicadores de apoyo a la decisión.
- **El FMS composite tiene baja validez predictiva en futbolistas** (Moran et al. 2017); usarlo como cribado de movilidad/asimetría, no de riesgo.
- **El LSI ≥90% sobreestima la recuperación** post-ACL; complementar con comparación pre-lesión.
- **Las normas de tests varían** según protocolo, dispositivo y población; las cifras citadas son guías, no cortes absolutos. Las normas de Yo-Yo de Topend Sports no provienen de un estudio único.
- **GPS: umbrales absolutos vs relativos** dan resultados distintos; documentar cuál se usa.
- **HRV con cámara de móvil es menos preciso** (MAPE ~17.5%) que con cinturón Polar H10 (MAPE ~2.16%); recomendar el cinturón.
- **Diferencias por sexo:** la mayoría de normas provienen de muestras masculinas; las femeninas son más escasas y los valores difieren (~2–2.5 km/h menos en VIFT; ~30–35% menos distancia en Yo-Yo).
- **TQR ≥13 "adecuado" y la estructura de 19 subescalas del RESTQ** provienen de guías prácticas/secundarias o tienen apoyo psicométrico parcial; tratarlos como orientación, no cortes validados estrictos.