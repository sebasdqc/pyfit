"""Kit de lecciones de Academy: de la transcripción por palabra de la voz a tiempos y subtítulos.

Para una lección de VIDEO (carpeta con escenas.json):
  - video/assets/cues.js  → tiempos locales de cada escena (window.CUES[escena][clave])
  - video/index.html      → hosts de escena con data-start/data-duration reales
  - subtitulos.vtt        → WebVTT con el TEXTO DEL GUION (narracion.txt), no el de Whisper

Para una lección de AUDIO (sin escenas.json): solo subtitulos.vtt.

Uso:
  python3 _kit/build_timing.py <carpeta-de-la-leccion>

escenas.json:
  {
    "voice_offset": 0.4,           # data-start del <audio id="voz">
    "tail": 2.6,                   # segundos después de la última palabra
    "vtt_replace": {"diecisiete": "17"},
    "scenes": [
      {"id": "intro", "start": null, "keys": [["lineal", ["lineal"]]]},
      {"id": "resultado", "start": ["resultado"], "start_back": 1,
       "keys": [["sin", ["sin"], ["entrenamiento"]]]}     # 3er elemento: saltar hasta pasar esa palabra
    ]
  }
"""
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

KIT = Path(__file__).parent


def norm(w):
    w = unicodedata.normalize("NFD", w.lower())
    w = "".join(c for c in w if unicodedata.category(c) != "Mn")
    return re.sub(r"[^a-z0-9]", "", w)


def load_words(path):
    d = json.loads(Path(path).read_text())
    if isinstance(d, dict):
        d = d.get("words") or d.get("transcript") or d.get("segments")
    out = []
    for w in d:
        t = w.get("text", w.get("word", "")).strip()
        if norm(t):
            out.append({"t": t, "n": norm(t), "s": float(w["start"]), "e": float(w["end"])})
    return out


def find(words, i, alts):
    for j in range(i, len(words)):
        if any(words[j]["n"].startswith(norm(a)) for a in alts):
            return j
    raise SystemExit(f"No encontré {alts} desde la palabra {i}: {[w['t'] for w in words[i:i + 14]]}")


def build_video(lesson, words, cfg):
    off, tail = cfg.get("voice_offset", 0.4), cfg.get("tail", 2.6)
    i = 0
    starts, cues = {}, {}
    for sc in cfg["scenes"]:
        name = sc["id"]
        if sc.get("start") is None:
            si = 0
            starts[name] = 0.0
        else:
            si = max(find(words, i, sc["start"]) - sc.get("start_back", 0), 0)
            starts[name] = round(words[si]["s"] + off - 0.35, 2)
        i = si
        cues[name] = {}
        for k in sc["keys"]:
            key, alts = k[0], k[1]
            if len(k) > 2:
                i = find(words, i, k[2]) + 1
            i = find(words, i, alts)
            cues[name][key] = words[i]["s"] + off
            i += 1
    total = round(words[-1]["e"] + off + tail, 2)
    names = [s["id"] for s in cfg["scenes"]]
    bounds = [starts[n] for n in names] + [total]
    for k, n in enumerate(names):
        st, en = bounds[k], bounds[k + 1]
        cues[n] = {key: round(v - st, 3) for key, v in cues[n].items()}
        cues[n]["end"] = round(en - st, 3)

    video = lesson / "video"
    (video / "assets").mkdir(parents=True, exist_ok=True)
    (video / "assets" / "cues.js").write_text(
        "// Generado por _kit/build_timing.py desde la transcripción de la voz. No editar a mano.\n"
        "window.CUES = " + json.dumps(cues, indent=2) + ";\n", encoding="utf-8")
    hosts = []
    for k, n in enumerate(names):
        st, en = bounds[k], bounds[k + 1]
        hosts.append(
            f'<div id="{n}" class="clip" data-composition-id="{n}" data-composition-src="compositions/{n}.html" '
            f'data-start="{st}" data-duration="{round(en - st, 3)}" data-track-index="1" data-track-kind="graphics" '
            f'data-width="1920" data-height="1080"></div>')
    tpl = lesson / "index.template.html"
    if not tpl.exists():
        tpl = KIT / "index.template.html"
    idx = tpl.read_text(encoding="utf-8")
    idx = idx.replace("__TOTAL__", str(total)).replace("__SCENES__", "\n      ".join(hosts))
    idx = idx.replace("__VOICE_OFFSET__", str(off))
    (video / "index.html").write_text(idx, encoding="utf-8")
    print(json.dumps({"total": total, "starts": starts}, indent=1))
    return off


def write_vtt(lesson, words, offset, replace):
    script = (lesson / "narracion.txt").read_text(encoding="utf-8").strip()
    sw = script.split()
    sn = [norm(w) for w in sw]
    tn = [w["n"] for w in words]
    times = [None] * len(sw)
    sm = difflib.SequenceMatcher(a=sn, b=tn, autojunk=False)
    for a, b, size in sm.get_matching_blocks():
        for k in range(size):
            times[a + k] = (words[b + k]["s"], words[b + k]["e"])
    for k in range(len(sw)):
        if times[k] is None:
            prev = next((times[j] for j in range(k - 1, -1, -1) if times[j]), (0, 0))
            nxt = next((times[j] for j in range(k + 1, len(sw)) if times[j]), (prev[1] + 0.4, prev[1] + 0.4))
            times[k] = (prev[1], max(nxt[0], prev[1] + 0.05))

    cues, cur = [], []
    for k, w in enumerate(sw):
        cur.append(k)
        text = " ".join(sw[j] for j in cur)
        end_sentence = re.search(r"[.?!:;]$", w)
        if len(text) >= 70 or (end_sentence and len(text) >= 18) or k == len(sw) - 1:
            cues.append(cur)
            cur = []

    def ts(x):
        x = max(x, 0)
        h, m = int(x // 3600), int(x % 3600 // 60)
        return f"{h:02d}:{m:02d}:{x % 60:06.3f}"

    out = ["WEBVTT", ""]
    for n, c in enumerate(cues):
        st = times[c[0]][0] + offset
        en = times[c[-1]][1] + offset + 0.25
        if n + 1 < len(cues):
            en = min(en, times[cues[n + 1][0]][0] + offset - 0.02)
        text = " ".join(sw[j] for j in c)
        for a, b in replace.items():
            text = text.replace(a, b)
        if len(text) > 42:
            mid = len(text) // 2
            cut = min((m.start() for m in re.finditer(" ", text)), key=lambda p: abs(p - mid))
            text = text[:cut] + "\n" + text[cut + 1:]
        out += [str(n + 1), f"{ts(st)} --> {ts(en)}", text, ""]
    (lesson / "subtitulos.vtt").write_text("\n".join(out), encoding="utf-8")


def main():
    lesson = Path(sys.argv[1]).resolve()
    tr = next(iter(sorted(lesson.glob("**/transcript.json"))), None)
    if not tr:
        raise SystemExit("Falta transcript.json (correr hf transcribe sobre la voz)")
    words = load_words(tr)
    cfg_path = lesson / "escenas.json"
    cfg = json.loads(cfg_path.read_text()) if cfg_path.exists() else {}
    offset = build_video(lesson, words, cfg) if cfg.get("scenes") else cfg.get("voice_offset", 0.0)
    write_vtt(lesson, words, offset, cfg.get("vtt_replace", {}))
    print("ok:", lesson.name)


if __name__ == "__main__":
    main()
