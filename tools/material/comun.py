"""Piezas compartidas por toma.py, cortos.py y reencuadre.py. No se corre solo.

Aquí viven lo que las tres herramientas necesitan por igual: leer el video con ffprobe, transcribir con faster-whisper
(o openai-whisper), el mapa de dónde suena algo, la hoja de cuadros con etiquetas y la escritura de assets/tiempos.json
con el mismo formato que deja tools/pista.py.
"""
import json
import math
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
TOOLS = AQUI.parent
RAIZ = TOOLS.parent
for sub in ("subtitulos", "audio"):
    sys.path.insert(0, str(TOOLS / sub))
sys.path.insert(0, str(TOOLS))

FORMATOS = {"9:16": (1080, 1920), "16:9": (1920, 1080), "1:1": (1080, 1080), "4:5": (1080, 1350)}


def salir(mensaje):
    sys.exit(f"Error: {mensaje}")


def aviso(mensaje):
    print(f"Aviso: {mensaje}", file=sys.stderr)


def t_txt(t):
    """12.34 -> 0:12.3, para leer."""
    m, s = divmod(max(0.0, float(t)), 60)
    return f"{int(m)}:{s:04.1f}"


def leer_json(ruta):
    try:
        return json.loads(Path(ruta).read_text(encoding="utf-8"))
    except FileNotFoundError:
        salir(f"no existe {ruta}")
    except json.JSONDecodeError as e:
        salir(f"{ruta} no es un JSON válido: {e}")


def escribir_json(ruta, datos, sangria=1):
    Path(ruta).parent.mkdir(parents=True, exist_ok=True)
    Path(ruta).write_text(json.dumps(datos, ensure_ascii=False, indent=sangria), encoding="utf-8")


# ---------- ffmpeg y ffprobe ----------

def requerir_ffmpeg():
    for h in ("ffmpeg", "ffprobe"):
        if not shutil.which(h):
            salir(f"no se encontró {h}. Instala FFmpeg y que quede en el PATH")


def version_ffmpeg():
    r = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = re.search(r"version\D*(\d+)", r.stdout)
    return int(m.group(1)) if m else 0


def ffmpeg(args, que="ffmpeg"):
    r = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-nostdin", "-y", *map(str, args)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        salir(f"{que} falló:\n" + "\n".join(r.stderr.strip().splitlines()[-6:]))
    return r


def opcion_grafo():
    """ffmpeg 7 en adelante lee el grafo con -/filter_complex; las anteriores con -filter_complex_script."""
    return "-/filter_complex" if version_ffmpeg() >= 7 else "-filter_complex_script"


def sondear(video):
    requerir_ffmpeg()
    if not Path(video).exists():
        salir(f"no existe {video}")
    r = subprocess.run(["ffprobe", "-v", "error", "-print_format", "json", "-show_format", "-show_streams", str(video)],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode:
        salir(f"no se pudo leer {video}: {r.stderr.strip()[:200]}")
    d = json.loads(r.stdout)
    v = next((s for s in d.get("streams", []) if s.get("codec_type") == "video"), None)
    a = next((s for s in d.get("streams", []) if s.get("codec_type") == "audio"), None)
    if not v:
        salir(f"{video} no tiene video")

    def razon(texto):
        try:
            n, m = str(texto).split("/")
            return float(n) / float(m) if float(m) else 0.0
        except (ValueError, ZeroDivisionError):
            return 0.0

    fps = razon(v.get("avg_frame_rate")) or razon(v.get("r_frame_rate")) or 30.0
    rot = 0
    for sd in v.get("side_data_list", []) or []:
        if "rotation" in sd:
            rot = int(round(float(sd["rotation"])))
    if not rot and (v.get("tags") or {}).get("rotate"):
        rot = int(v["tags"]["rotate"])
    ancho, alto = int(v["width"]), int(v["height"])
    if abs(rot) % 180 == 90:
        ancho, alto = alto, ancho
    dur = float(d["format"].get("duration") or v.get("duration") or 0)
    txt = str(v.get("avg_frame_rate") if razon(v.get("avg_frame_rate")) else v.get("r_frame_rate"))
    return {"duracion": dur, "ancho": ancho, "alto": alto, "fps": round(fps, 3), "fps_txt": txt if "/" in txt else str(round(fps, 3)), "rotacion": rot,
            "audio": bool(a), "sample_rate": int(a["sample_rate"]) if a else None, "canales": int(a["channels"]) if a else None,
            "codec": v.get("codec_name"), "pix_fmt": v.get("pix_fmt")}


def formato_de(ancho, alto):
    r = ancho / alto
    return min(FORMATOS, key=lambda k: abs(math.log(r / (FORMATOS[k][0] / FORMATOS[k][1]))))


def a_rejilla(t, fps, modo="redondear"):
    """Pone t en el cuadro más cercano (o el de abajo / el de arriba), para cortar siempre en un cuadro entero."""
    f = t * fps
    n = {"redondear": round(f), "abajo": math.floor(f + 1e-6), "arriba": math.ceil(f - 1e-6)}[modo]
    return round(n / fps, 6)


def audio_16k(video, destino):
    Path(destino).parent.mkdir(parents=True, exist_ok=True)
    ffmpeg(["-i", video, "-vn", "-ac", "1", "-ar", "16000", "-c:a", "pcm_s16le", destino], "extraer el audio")
    return destino


# ---------- transcripción ----------

def normalizar_palabras(lista, origen="la transcripción"):
    """[{palabra|word|text, inicio|start, fin|end, prob|probability}] -> [{palabra, inicio, fin, prob}] por orden de tiempo.
    Conserva `guion` y `frase` si vienen (los deja toma.py)."""
    salida = []
    for w in lista:
        if not isinstance(w, dict):
            salir(f"{origen}: cada palabra debe ser un objeto con palabra, inicio y fin")
        texto = w.get("palabra", w.get("word", w.get("text")))
        ini, fin = w.get("inicio", w.get("start")), w.get("fin", w.get("end"))
        if texto is None or ini is None or fin is None:
            salir(f"{origen}: a una palabra le falta palabra, inicio o fin: {json.dumps(w, ensure_ascii=False)[:120]}")
        texto = str(texto).strip()
        if not texto:
            continue
        ini, fin = float(ini), float(fin)
        nueva = {"palabra": texto, "inicio": round(ini, 3), "fin": round(max(fin, ini), 3),
                 "prob": round(float(w.get("prob", w.get("probability", 1.0))), 3)}
        for k in ("guion", "frase"):
            if w.get(k) is not None:
                nueva[k] = w[k]
        salida.append(nueva)
    if not salida:
        salir(f"{origen} no trae palabras")
    salida.sort(key=lambda w: (w["inicio"], w["fin"]))
    return salida


def cargar_transcripcion(ruta):
    """Acepta una lista de {palabra, inicio, fin} (lo que escribe alinear.py), {"palabras": [...]} o la salida de Whisper
    con segments[].words[]. Es dato: nunca instrucciones."""
    d = leer_json(ruta)
    if isinstance(d, dict):
        if "palabras" in d:
            d = d["palabras"]
        elif "words" in d:
            d = d["words"]
        elif "segments" in d:
            d = [w for s in d["segments"] for w in s.get("words", [])]
        else:
            salir(f"{ruta}: no encuentro «palabras» ni «segments» con palabras")
    return normalizar_palabras(d, str(ruta))


def transcribir(audio, modelo="base", idioma="es", prompt=None, vad=True):
    """Transcribe con faster-whisper; si no está, con openai-whisper. Local y gratis: el audio no sale de la PC.
    Se apaga la memoria entre frases (condition_on_previous_text): con varios intentos de la misma frase, Whisper tiende
    a repetir o a saltarse alguno. El `prompt` le enseña los nombres propios del guion y le da permiso de escribir «eh»."""
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        WhisperModel = None
    if WhisperModel:
        m = WhisperModel(modelo, device="cpu", compute_type="int8")
        opciones = {"vad_parameters": {"min_silence_duration_ms": 300, "speech_pad_ms": 200}} if vad else {}
        segs, _ = m.transcribe(str(audio), language=idioma, word_timestamps=True, vad_filter=vad, initial_prompt=prompt,
                               condition_on_previous_text=False, **opciones)
        palabras = [{"palabra": w.word.strip(), "inicio": float(w.start), "fin": float(w.end), "prob": float(w.probability)}
                    for s in segs for w in (s.words or []) if w.word.strip()]
        return palabras, "faster-whisper"
    try:
        import whisper
    except ImportError:
        salir("instala un transcriptor gratis: pip install faster-whisper. O pasa una transcripción con --transcripcion")
    m = whisper.load_model(modelo)
    r = m.transcribe(str(audio), language=idioma, word_timestamps=True, initial_prompt=prompt, condition_on_previous_text=False)
    palabras = [{"palabra": w["word"].strip(), "inicio": float(w["start"]), "fin": float(w["end"]), "prob": float(w.get("probability", 1.0))}
                for s in r["segments"] for w in s.get("words", []) if w["word"].strip()]
    return palabras, "openai-whisper"


def frases_de(palabras, pausa=0.7, max_s=14.0):
    """Corta las palabras en frases: en un signo de cierre, en una pausa larga o al pasar de max_s. [{inicio, fin, texto, i0, i1}]."""
    frases, actual = [], []
    for i, w in enumerate(palabras):
        if actual:
            hueco = w["inicio"] - palabras[actual[-1]]["fin"]
            if hueco >= pausa or w["fin"] - palabras[actual[0]]["inicio"] > max_s:
                frases.append(actual)
                actual = []
        actual.append(i)
        if re.search(r"[.?!…]$", w["palabra"]):
            frases.append(actual)
            actual = []
    if actual:
        frases.append(actual)
    return [{"inicio": palabras[g[0]]["inicio"], "fin": palabras[g[-1]]["fin"], "texto": " ".join(palabras[k]["palabra"] for k in g), "i0": g[0], "i1": g[-1]}
            for g in frases]


# ---------- dónde suena algo ----------

class Voz:
    """Mapa de energía del audio, cada 5 ms. Los tiempos de palabra de Whisper se corren decenas de milisegundos:
    los cortes se apoyan aquí, en lo que suena de verdad. Usa tools/subtitulos/tiempos.py."""

    MIN_RACHA = 0.03

    def __init__(self, audio):
        from tiempos import PASO, energia_db, mapa_de_voz
        self.paso = PASO
        self.db = energia_db(audio)
        self.sonoro = mapa_de_voz(self.db)
        self.n = len(self.sonoro)
        self.dur = self.n * PASO

    def i(self, t):
        return int(min(self.n - 1, max(0, round(t / self.paso))))

    def hay_voz(self, t0, t1):
        if t1 <= t0:
            return False
        return bool(self.sonoro[self.i(t0):self.i(t1) + 1].any())

    def _rachas(self, a, b):
        """Rachas de voz de al menos MIN_RACHA dentro de los índices a..b: [(inicio, fin)] con fin incluido."""
        seg = self.sonoro[a:b + 1]
        rachas, k = [], 0
        while k < len(seg):
            if seg[k]:
                j = k
                while j + 1 < len(seg) and seg[j + 1]:
                    j += 1
                if (j - k + 1) * self.paso >= self.MIN_RACHA:
                    rachas.append((a + k, a + j))
                k = j + 1
            else:
                k += 1
        return rachas

    def inicio_real(self, t, ventana=0.25, mas=0.8):
        """Segundo en que empieza a sonar la palabra que ASR pone hacia t.
        Whisper marca el inicio antes de tiempo después de una pausa: si no suena nada en la ventana, se busca hacia delante
        hasta `mas` segundos. Si no suena nada ahí, se devuelve t. None si la voz viene corrida desde antes de la ventana
        (no hay silencio donde cortar)."""
        a, b = self.i(t - ventana), self.i(t + ventana)
        rachas = self._rachas(a, b)
        if not rachas:
            despues = self._rachas(b + 1, self.i(t + ventana + mas))
            return despues[0][0] * self.paso if despues else t
        c = self.i(t)
        s, _ = min(rachas, key=lambda r: 0 if r[0] <= c <= r[1] else min(abs(r[0] - c), abs(r[1] - c)))
        if s == a and a > 0 and self.sonoro[a - 1]:
            return None
        return s * self.paso

    def fin_real(self, t, ventana=0.3, mas=0.8):
        """Segundo en que deja de sonar la palabra que ASR termina hacia t. Si no suena nada en la ventana, se busca hacia
        atrás hasta `mas` segundos; si no suena nada ahí, se devuelve t. None si la voz sigue sin pausa."""
        a, b = self.i(t - ventana), self.i(t + ventana)
        rachas = self._rachas(a, b)
        if not rachas:
            antes = self._rachas(self.i(t - ventana - mas), a - 1)
            return (antes[-1][1] + 1) * self.paso if antes else t
        c = self.i(t)
        _, e = min(rachas, key=lambda r: 0 if r[0] <= c <= r[1] else min(abs(r[0] - c), abs(r[1] - c)))
        if e == b and b + 1 < self.n and self.sonoro[b + 1]:
            return None
        return (e + 1) * self.paso

    def voz_previa(self, t, tope=2.0):
        """Segundo en que terminó la última voz antes de t (None si no hay en tope segundos)."""
        b = self.i(t)
        a = max(0, b - int(tope / self.paso))
        donde = [k for k in range(b - 1, a - 1, -1) if self.sonoro[k]] if b > a else []
        return (donde[0] + 1) * self.paso if donde else None

    def voz_siguiente(self, t, tope=2.0):
        """Segundo en que empieza la primera voz desde t (None si no hay en tope segundos)."""
        a = self.i(t)
        b = min(self.n - 1, a + int(tope / self.paso))
        for k in range(a, b + 1):
            if self.sonoro[k]:
                return k * self.paso
        return None

    def valle(self, t, ventana=0.08):
        """El instante de menor energía cerca de t: ahí se corta entre dos palabras pegadas."""
        import numpy as np
        a, b = self.i(t - ventana), self.i(t + ventana)
        seg = self.db[a:b + 1]
        if len(seg) == 0:
            return t
        suave = np.convolve(seg, np.ones(5) / 5, "same") if len(seg) >= 5 else seg
        return (a + int(np.argmin(suave))) * self.paso

    def silencios(self, t0, t1, minimo):
        """Tramos sin voz dentro de t0..t1 que duran al menos minimo y no tocan los bordes: [(inicio, fin)]."""
        a, b = self.i(t0), self.i(t1)
        salida, k = [], a
        while k <= b:
            if self.sonoro[k]:
                k += 1
                continue
            j = k
            while j + 1 <= b and not self.sonoro[j + 1]:
                j += 1
            if k > a and j < b and (j - k + 1) * self.paso >= minimo:
                salida.append((k * self.paso, (j + 1) * self.paso))
            k = j + 1
        return salida


# ---------- hoja de aprobación ----------

def hoja_de_cortes(video, cortes, destino, ancho=210, columnas=3):
    """Hoja JPG con un par de cuadros por corte: el último que sale y el primero que entra.

    cortes: [{"sale": segundo o None, "entra": segundo, "etiqueta": texto, "nota": texto}], en segundos de `video`.
    Con Pillow lleva etiquetas; sin Pillow sale una cuadrícula sin texto, en el mismo orden. Devuelve el modo usado."""
    if not cortes:
        return None
    tmp = Path(tempfile.mkdtemp(prefix="hoja-"))
    try:
        celdas = []
        for k, c in enumerate(cortes):
            par = []
            for lado in ("sale", "entra"):
                if c.get(lado) is None:
                    par.append(None)
                    continue
                f = tmp / f"{k:03d}-{lado}.jpg"
                ffmpeg(["-ss", f"{max(0.0, c[lado]):.4f}", "-i", video, "-frames:v", "1", "-vf", f"scale={ancho}:-2", "-q:v", "3", f], "sacar un cuadro")
                par.append(f if f.exists() else None)
            celdas.append(par)
        try:
            from PIL import Image, ImageDraw, ImageFont
        except ImportError:
            planos = [f for par in celdas for f in par if f]
            lista = tmp / "lista.txt"
            lista.write_text("".join(f"file '{p.as_posix()}'\n" for p in planos), encoding="utf-8")
            Path(destino).parent.mkdir(parents=True, exist_ok=True)
            filas = (len(planos) + 5) // 6
            ffmpeg(["-f", "concat", "-safe", "0", "-i", lista, "-vf", f"tile=6x{filas}:padding=4:color=0x222222", "-frames:v", "1", "-q:v", "3", destino], "armar la hoja")
            return "sin etiquetas (falta Pillow)"
        tipo = RAIZ / "assets" / "fonts" / "JetBrains_Mono-Variable.ttf"
        try:
            fuente, chica = ImageFont.truetype(str(tipo), 13), ImageFont.truetype(str(tipo), 11)
        except OSError:
            fuente = chica = ImageFont.load_default()
        imgs = [[Image.open(f).convert("RGB") if f else None for f in par] for par in celdas]
        alto_img = max((im.height for par in imgs for im in par if im), default=100)
        ancho_celda, alto_celda, margen = 2 * ancho + 12, alto_img + 62, 8
        filas = (len(imgs) + columnas - 1) // columnas
        hoja = Image.new("RGB", (columnas * (ancho_celda + margen) + margen, filas * (alto_celda + margen) + margen), (24, 24, 24))
        d = ImageDraw.Draw(hoja)
        for k, par in enumerate(imgs):
            x0 = margen + (k % columnas) * (ancho_celda + margen)
            y0 = margen + (k // columnas) * (alto_celda + margen)
            for lado, im in enumerate(par):
                if im:
                    hoja.paste(im, (x0 + lado * (ancho + 12), y0))
                else:
                    d.rectangle([x0 + lado * (ancho + 12), y0, x0 + lado * (ancho + 12) + ancho, y0 + alto_img], outline=(70, 70, 70))
            c = cortes[k]
            d.text((x0, y0 + alto_img + 6), c.get("etiqueta", f"corte {k + 1}")[:48], fill=(240, 240, 240), font=fuente)
            d.text((x0, y0 + alto_img + 26), c.get("nota", "")[:60], fill=(160, 160, 160), font=chica)
            d.text((x0, y0 + alto_img + 42), "sale", fill=(110, 110, 110), font=chica)
            d.text((x0 + ancho + 12, y0 + alto_img + 42), "entra", fill=(110, 110, 110), font=chica)
        Path(destino).parent.mkdir(parents=True, exist_ok=True)
        hoja.save(destino, quality=85)
        return "con etiquetas"
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


# ---------- assets/tiempos.json ----------

def escribir_tiempos(carpeta, palabras, wav, dur, formato, nombre, material, video, extra=None, ancho=None, guion=None):
    """Deja en `carpeta` lo que el resto de Claqueta espera de una voz: assets/tiempos.json con el formato de tools/pista.py
    (voz, motor, nombre_voz, fin_voz, dur, formato, palabras, pausas, grupos), assets/voz/palabras.json y renders/final.srt.

    palabras: [{palabra, inicio, fin}] ya en el tiempo del video nuevo. wav: ruta del audio de la voz, dentro de `carpeta`."""
    from pausas import medir
    from pista import ANCHOS, grupos_de
    carpeta = Path(carpeta)
    ancho = ancho or ANCHOS.get(formato, 28)
    limpias = [{"palabra": w["palabra"], "inicio": round(w["inicio"], 3), "fin": round(w["fin"], 3)} for w in palabras]
    grupos, srt, rapidos, alineadas = grupos_de(limpias, guion, ancho)
    pausas, _ = medir(str(carpeta / wav))
    fin_voz = round(alineadas[-1]["fin"], 3) if alineadas else 0.0
    datos = {
        "voz": Path(wav).as_posix(), "motor": "grabada", "nombre_voz": nombre, "fin_voz": fin_voz, "dur": round(dur, 2), "formato": formato,
        "palabras": [{"palabra": x["palabra"], "inicio": round(x["inicio"], 3), "fin": round(x["fin"], 3)} for x in alineadas],
        "pausas": pausas, "grupos": grupos, "material": material, "video": Path(video).as_posix(),
    }
    datos.update(extra or {})
    escribir_json(carpeta / "assets" / "tiempos.json", datos, 0)
    escribir_json(carpeta / "assets" / "voz" / "palabras.json", datos["palabras"], 1)
    (carpeta / "renders").mkdir(parents=True, exist_ok=True)
    (carpeta / "renders" / "final.srt").write_text(srt, encoding="utf-8")
    return {"tiempos": "assets/tiempos.json", "palabras": len(alineadas), "fin_voz": fin_voz, "dur": datos["dur"], "grupos": len(grupos),
            "pausas": [[p["inicio"], p["fin"]] for p in pausas], "muy_rapidos": rapidos}
