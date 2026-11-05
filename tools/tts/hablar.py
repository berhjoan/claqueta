#!/usr/bin/env python3
"""Narración gratis en español, sin llaves ni APIs de pago.

Motores:
  edge    Voces neuronales de Microsoft Edge. Sin cuenta ni llave; necesita internet. pip install edge-tts
  kokoro  Modelo local Apache-2.0, corre en CPU. Baja ~115 MB la primera vez. pip install kokoro-onnx soundfile
  piper   Modelo local, muy rápido en CPU. Baja ~60-110 MB por voz. pip install piper-tts
  pocket  Modelo local de Kyutai, buena voz en español. Baja cerca de 900 MB con PyTorch. pip install pocket-tts

Uso:
  python tools/tts/hablar.py --listar
  python tools/tts/hablar.py --motor edge --voz es-CO-SalomeNeural --texto "Hola" --salida voz.mp3
  python tools/tts/hablar.py --motor kokoro --voz ef_dora --archivo guion.txt --salida voz.wav --velocidad 1.05
  python tools/tts/hablar.py --motor edge --voz es-MX-JorgeNeural --texto "Hola" --salida voz.mp3 --palabras palabras.json

--palabras escribe los tiempos de cada palabra (solo edge). Para los demás motores usa tools/subtitulos/alinear.py.
--idioma elige el acento de kokoro: es-419, de Latinoamérica, por defecto, o es, de España, con zeta y elle.
--por-oraciones genera cada oración aparte y las une con --pausa segundos de silencio real. Sirve cuando una frase se deforma
dentro de una toma larga, o cuando hace falta un silencio de verdad antes de un dato. Necesita numpy y ffmpeg.
"""
import argparse
import asyncio
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.request
import wave
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

CACHE = Path(os.environ.get("CLAQUETA_CACHE", Path.home() / ".cache" / "claqueta")) / "tts"
KOKORO = "https://github.com/thewh1teagle/kokoro-onnx/releases/download/model-files-v1.0"
PIPER = "https://huggingface.co/rhasspy/piper-voices/resolve/main/es"

VOCES = {
    "edge": ["es-CO-SalomeNeural", "es-CO-GonzaloNeural", "es-MX-DaliaNeural", "es-MX-JorgeNeural",
             "es-US-PalomaNeural", "es-US-AlonsoNeural", "es-AR-ElenaNeural", "es-AR-TomasNeural",
             "es-ES-ElviraNeural", "es-ES-AlvaroNeural", "es-PA-MargaritaNeural", "es-PA-RobertoNeural"],
    "kokoro": ["ef_dora", "em_alex", "em_santa"],
    "piper": ["es_MX-claude-high", "es_MX-ald-medium", "es_AR-daniela-high", "es_ES-davefx-medium", "es_ES-sharvard-medium"],
    "pocket": ["lola"],
}


def falla(msg, codigo=2):
    print(f"Error: {msg}", file=sys.stderr)
    sys.exit(codigo)


def bajar(url, destino):
    destino = Path(destino)
    if destino.exists() and destino.stat().st_size > 0:
        return destino
    destino.parent.mkdir(parents=True, exist_ok=True)
    print(f"Bajando {url}", file=sys.stderr)
    temporal = destino.with_suffix(destino.suffix + ".parcial")
    with urllib.request.urlopen(url) as r, open(temporal, "wb") as f:
        shutil.copyfileobj(r, f)
    temporal.replace(destino)
    return destino


def a_salida(origen, salida):
    """Convierte con ffmpeg si la extensión de salida difiere de la del archivo de origen."""
    origen, salida = Path(origen), Path(salida)
    salida.parent.mkdir(parents=True, exist_ok=True)
    if origen.suffix.lower() == salida.suffix.lower():
        shutil.move(str(origen), str(salida))
        return
    if not shutil.which("ffmpeg"):
        falla("hace falta ffmpeg para convertir a " + salida.suffix)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(origen), str(salida)], check=True)
    origen.unlink(missing_ok=True)


def edge(texto, voz, salida, velocidad, tono, palabras):
    try:
        import edge_tts
    except ImportError:
        falla("falta edge-tts. Instala con: pip install edge-tts")
    rate = f"{round((velocidad - 1) * 100):+d}%"
    pitch = f"{round(tono):+d}Hz"

    async def correr(destino):
        com = edge_tts.Communicate(texto, voz, rate=rate, pitch=pitch, boundary="WordBoundary")
        marcas = []
        with open(destino, "wb") as f:
            async for bloque in com.stream():
                if bloque["type"] == "audio":
                    f.write(bloque["data"])
                elif bloque["type"] == "WordBoundary":
                    marcas.append({"palabra": bloque["text"], "inicio": round(bloque["offset"] / 1e7, 3),
                                   "fin": round((bloque["offset"] + bloque["duration"]) / 1e7, 3)})
        return marcas

    temporal = Path(tempfile.mkdtemp()) / "voz.mp3"
    marcas = asyncio.run(correr(temporal))
    a_salida(temporal, salida)
    if palabras:
        try:
            sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "subtitulos"))
            from tiempos import refinar
            marcas = refinar(marcas, salida, desfase_global=True)  # Edge marca parejo antes de lo que suena en el archivo.
        except (ImportError, OSError, ValueError, subprocess.CalledProcessError) as e:
            print(f"Aviso: tiempos sin afinar contra el audio: {e}", file=sys.stderr)
        Path(palabras).parent.mkdir(parents=True, exist_ok=True)
        Path(palabras).write_text(json.dumps(marcas, ensure_ascii=False, indent=1), encoding="utf-8")


def ruta_ascii(ruta):
    """espeak-ng no abre rutas con tildes o eñes y cierra el proceso sin avisar. En Windows, la ruta corta 8.3 es ASCII."""
    ruta = str(ruta)
    if ruta.isascii() or os.name != "nt":
        return ruta
    import ctypes
    corta = ctypes.create_unicode_buffer(1024)
    if ctypes.windll.kernel32.GetShortPathNameW(ruta, corta, 1024) and corta.value.isascii():
        return corta.value
    falla(f"espeak-ng no puede abrir {ruta}, que tiene tildes o eñes, y este disco no da rutas cortas. Crea el entorno virtual en una carpeta sin esas letras.")


def espeak_con_ruta_ascii(datos):
    """phonemizer resuelve la ruta y deshace cualquier ruta corta que reciba: se convierte justo antes de entregársela a espeak."""
    if str(datos).isascii() or os.name != "nt":
        return
    from phonemizer.backend.espeak import api
    original = getattr(api.EspeakAPI, "_data_path_argument", None)
    if original is None:
        falla(f"espeak-ng no puede abrir {datos}, que tiene tildes o eñes. Crea el entorno virtual en una carpeta sin esas letras.")

    def corta(data_path, version, tempdir=None):
        return ruta_ascii(original(data_path, version, tempdir).decode("utf-8")).encode("ascii")

    api.EspeakAPI._data_path_argument = staticmethod(corta)


def kokoro(texto, voz, salida, velocidad, idioma="es-419"):
    try:
        import espeakng_loader
        import soundfile as sf
        from kokoro_onnx import Kokoro
    except ImportError:
        falla("falta kokoro-onnx. Instala con: pip install kokoro-onnx soundfile")
    modelo = bajar(f"{KOKORO}/kokoro-v1.0.int8.onnx", CACHE / "kokoro-v1.0.int8.onnx")
    voces = bajar(f"{KOKORO}/voices-v1.0.bin", CACHE / "voices-v1.0.bin")
    espeak_con_ruta_ascii(espeakng_loader.get_data_path())
    motor = Kokoro(str(modelo), str(voces))
    muestras, sr = motor.create(texto, voice=voz, speed=velocidad, lang=idioma)
    temporal = Path(tempfile.mkdtemp()) / "voz.wav"
    sf.write(temporal, muestras, sr)
    a_salida(temporal, salida)


def piper(texto, voz, salida, velocidad):
    try:
        from piper import PiperVoice
    except ImportError:
        falla("falta piper-tts. Instala con: pip install piper-tts")
    region, nombre, calidad = voz.split("-")
    base = f"{PIPER}/{region}/{nombre}/{calidad}/{voz}.onnx"
    modelo = bajar(base, CACHE / "piper" / f"{voz}.onnx")
    bajar(base + ".json", CACHE / "piper" / f"{voz}.onnx.json")
    motor = PiperVoice.load(str(modelo))
    temporal = Path(tempfile.mkdtemp()) / "voz.wav"
    with wave.open(str(temporal), "wb") as w:
        if hasattr(motor, "synthesize_wav"):
            from piper import SynthesisConfig
            motor.synthesize_wav(texto, w, syn_config=SynthesisConfig(length_scale=1 / velocidad))
        else:
            motor.synthesize(texto, w, length_scale=1 / velocidad)
    a_salida(temporal, salida)


def pocket(texto, voz, salida, velocidad):
    programa = shutil.which("pocket-tts")
    if not programa:
        falla("falta pocket-tts. Instala con: pip install pocket-tts")
    temporal = Path(tempfile.mkdtemp()) / "voz.wav"
    entorno = {**os.environ, "PYTHONIOENCODING": "utf-8", "PYTHONUTF8": "1"}
    r = subprocess.run([programa, "generate", "--text", texto, "--language", "spanish", "--voice", voz, "--output-path", str(temporal), "--quiet"], capture_output=True, text=True, encoding="utf-8", errors="replace", env=entorno)
    if r.returncode or not temporal.exists():
        falla(f"pocket-tts no generó el audio: {(r.stderr or r.stdout)[-400:]}")
    if abs(velocidad - 1) > 1e-3:
        lento = temporal.with_name("voz-tempo.wav")
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(temporal), "-af", f"atempo={velocidad}", str(lento)], check=True)
        temporal = lento
    a_salida(temporal, salida)


def partir_oraciones(texto):
    return [f.strip() for f in re.split(r"(?<=[.?!…])\s+", texto.strip()) if f.strip()]


def recortar(x, sr=48000, umbral_db=-45, margen=0.03):
    """Quita el silencio de los extremos. Devuelve el audio y las muestras quitadas al inicio."""
    import numpy as np
    v = max(1, int(0.005 * sr))
    n = len(x) // v
    if not n:
        return x, 0
    rms = np.sqrt(np.mean(x[: n * v].reshape(n, v) ** 2, axis=1))
    voz = np.nonzero(20 * np.log10(rms + 1e-9) > umbral_db)[0]
    if not len(voz):
        return x, 0
    ini = max(0, voz[0] * v - int(margen * sr))
    fin = min(len(x), (voz[-1] + 1) * v + int(margen * sr))
    return x[ini:fin], ini


def por_oraciones(generar, texto, salida, pausa, palabras):
    """generar(texto, ruta, ruta_palabras) produce cada toma. Aquí se recortan, se unen y se corren las marcas."""
    import numpy as np
    sr = 48000
    with tempfile.TemporaryDirectory() as d:
        piezas, marcas, t = [], [], 0.0
        for i, frase in enumerate(partir_oraciones(texto)):
            toma, tiempos = Path(d) / f"{i}.wav", Path(d) / f"{i}.json"
            generar(frase, toma, tiempos if palabras else None)
            crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(toma), "-ac", "1", "-ar", str(sr), "-f", "f32le", "-"], capture_output=True, check=True).stdout
            x, quitado = recortar(np.frombuffer(crudo, np.float32))
            if palabras and tiempos.exists():
                for m in json.loads(tiempos.read_text(encoding="utf-8")):
                    corrido = t - quitado / sr
                    marcas.append({"palabra": m["palabra"], "inicio": round(max(t, m["inicio"] + corrido), 3), "fin": round(max(t, m["fin"] + corrido), 3)})
            piezas += [x, np.zeros(int(pausa * sr), np.float32)]
            t += len(x) / sr + pausa
        total = np.concatenate(piezas[:-1]) if piezas else np.zeros(0, np.float32)
    Path(salida).parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-f", "f32le", "-ar", str(sr), "-ac", "1", "-i", "-", str(salida)], input=total.astype(np.float32).tobytes(), check=True)
    if palabras:
        Path(palabras).parent.mkdir(parents=True, exist_ok=True)
        Path(palabras).write_text(json.dumps(marcas, ensure_ascii=False, indent=1), encoding="utf-8")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--motor", choices=VOCES)
    p.add_argument("--voz")
    p.add_argument("--texto")
    p.add_argument("--archivo", help="Archivo de texto UTF-8 con el guion")
    p.add_argument("--salida")
    p.add_argument("--velocidad", type=float, default=1.0, help="1.0 es normal; 0.8 a 1.3 suena natural")
    p.add_argument("--tono", type=float, default=0, help="Solo edge: Hz arriba o abajo")
    p.add_argument("--palabras", help="Solo edge: JSON con el tiempo de cada palabra")
    p.add_argument("--por-oraciones", action="store_true", help="Genera cada oración aparte y las une")
    p.add_argument("--pausa", type=float, default=0.35, help="Con --por-oraciones: segundos de silencio entre oraciones")
    p.add_argument("--idioma", default="es-419", help="Solo kokoro: es-419 para Latinoamérica, es para España")
    p.add_argument("--listar", action="store_true")
    a = p.parse_args()
    if a.listar:
        print(json.dumps(VOCES, ensure_ascii=False, indent=1))
        return
    if not (a.motor and a.voz and a.salida and (a.texto or a.archivo)):
        p.error("indica --motor, --voz, --salida y --texto o --archivo")
    texto = a.texto or Path(a.archivo).read_text(encoding="utf-8")
    if not texto.strip():
        falla("el texto está vacío")
    def generar(t, salida, palabras):
        if a.motor == "edge":
            edge(t, a.voz, salida, a.velocidad, a.tono, palabras)
        elif a.motor == "kokoro":
            kokoro(t, a.voz, salida, a.velocidad, a.idioma)
        elif a.motor == "pocket":
            pocket(t, a.voz, salida, a.velocidad)
        else:
            piper(t, a.voz, salida, a.velocidad)

    if a.por_oraciones:
        por_oraciones(generar, texto, a.salida, a.pausa, a.palabras)
    else:
        generar(texto, a.salida, a.palabras)
    informe = {"ok": True, "salida": str(a.salida), "motor": a.motor, "voz": a.voz}
    if a.palabras and Path(a.palabras).exists():  # El segundo en que termina la última palabra: los motores dejan una cola en silencio.
        marcas = json.loads(Path(a.palabras).read_text(encoding="utf-8"))
        if marcas:
            informe["fin_voz"] = round(marcas[-1]["fin"], 3)
    print(json.dumps(informe, ensure_ascii=False))


if __name__ == "__main__":
    main()
