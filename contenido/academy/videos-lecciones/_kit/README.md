# Kit de medios de lecciones de Academy

Produce el video o el audio de una lección de tipo `video`/`audio` a partir de su guion en
`backend/academy/content/<escuela>/<curso>.md`. El estilo de referencia, aprobado el
2026-11-19, es el piloto `fundamentos-de-periodizacion-m2-l2`.

## Estructura de una lección

```
<curso>-m<N>-l<N>/
  narracion.txt        guion final que lee la voz (español neutro, tuteo)
  escenas.json         escenas + palabras ancla (video) o solo vtt_replace (audio)
  subtitulos.vtt       generado: texto del guion, tiempos de la voz
  video/               proyecto HyperFrames (solo video)
    compositions/*.html   una escena por archivo
    assets/voz/           toma.mp3 (ElevenLabs), voz-master.wav (−16 LUFS), transcript.json
    assets/cues.js        generado
    index.html            generado desde _kit/index.template.html
    renders/<slug>.mp4 + .vtt
  audio/               solo audio: toma.mp3 + transcript.json
  renders/<slug>.mp3 + .vtt   (audio)
```

## Pasos

1. **Guion** → `narracion.txt`. Tiene que respetar las cifras y las atribuciones del `.md` del curso.
   Números en palabras ("doce semanas") para que la voz los lea bien. `vtt_replace` los vuelve
   cifras en los subtítulos.
2. **Voz**: ElevenLabs, voz «Arturo Tutorias» (`jUzQhbFtXaz1IwDyMfJr`), modelo
   `eleven_multilingual_v2`, **1 toma**. Cuesta unos 0,018 USD por carácter
   (un video de ~1.200 caracteres ≈ 0,22 USD; un audio de ~2.500 ≈ 0,45 USD).
3. **Descarga**: las URLs de ElevenLabs a veces cortan la transferencia. Usa
   `curl --http1.1` y valida la duración con `ffprobe` antes de seguir.
4. **Master**: `ffmpeg -i toma.mp3 -af loudnorm=I=-16:TP=-1.5:LRA=7 -ar 48000 voz-master.wav`
   (audio: `-ac 1 -c:a libmp3lame -b:a 96k` → `renders/<slug>.mp3`).
5. **Transcripción por palabra**: `hf transcribe toma.mp3 -l es -m small` (fuera del sandbox).
   El modelo `small` multilingüe pesa 487 MB. Si la descarga se corta, bájalo con curl reanudable a
   `~/.cache/hyperframes/whisper/models/ggml-small.bin`.
6. **Escenas** (video): `escenas.json` + `compositions/<id>.html`. Cada escena usa `window.CUES.<id>.<clave>`.
7. **Tiempos y subtítulos**: `python3 _kit/build_timing.py <carpeta-de-la-lección>`.
8. **Check, cuadros y render** (video, fuera del sandbox): `hf check --json`, `hf snapshot --at …`
   (mirar las hojas de cuadros), `hf render --crf 20 -o renders/<slug>.mp4`.

## Reglas visuales (del piloto)

- Fondo `#0e1016`, tinta `#f4f2ee`, rojo Academy `#cc1f36`, hueso `#e8dcc2`, grises. Nunca azul ni teal
  (son de Performance y de la landing).
- Inter 900 en titulares; JetBrains Mono en kickers y etiquetas; **mínimo 28 px** de lectura.
- Cada escena va envuelta en `<prefijo>-wrap`. Nunca animar `#root`, porque `index.html` también tiene uno.
- Solo `fromTo`, sin template literals en `querySelector`, fundido de salida de 0,2 s.
- Una imagen por frase clave, revelada cuando la voz la nombra. Lo esquemático lleva el rótulo
  «esquema ilustrativo».
- «No significativo» se muestra como `n.s.`, nunca como `=`.

## Trampas conocidas

- Whisper puede oír «dos» donde la voz dijo «doce». Re-transcribe el tramo con ventanas distintas
  y verifícalo de oído antes de publicar.
- Las palabras pegadas («ondulada.¿Cuál») rompen la búsqueda de anclas: agrega una alternativa
  con la palabra siguiente.
