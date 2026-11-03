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
"""
import argparse
import asyncio
import json
import os
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
        Path(palabras).write_text(json.dumps(marcas, ensure_ascii=False, indent=1), encoding="utf-8")


def kokoro(texto, voz, salida, velocidad):
    try:
        import soundfile as sf
        from kokoro_onnx import Kokoro
    except ImportError:
        falla("falta kokoro-onnx. Instala con: pip install kokoro-onnx soundfile")
    modelo = bajar(f"{KOKORO}/kokoro-v1.0.int8.onnx", CACHE / "kokoro-v1.0.int8.onnx")
    voces = bajar(f"{KOKORO}/voices-v1.0.bin", CACHE / "voices-v1.0.bin")
    motor = Kokoro(str(modelo), str(voces))
    muestras, sr = motor.create(texto, voice=voz, speed=velocidad, lang="es")
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
    if a.motor == "edge":
        edge(texto, a.voz, a.salida, a.velocidad, a.tono, a.palabras)
    elif a.motor == "kokoro":
        kokoro(texto, a.voz, a.salida, a.velocidad)
    elif a.motor == "pocket":
        pocket(texto, a.voz, a.salida, a.velocidad)
    else:
        piper(texto, a.voz, a.salida, a.velocidad)
    print(json.dumps({"ok": True, "salida": str(a.salida), "motor": a.motor, "voz": a.voz}, ensure_ascii=False))


if __name__ == "__main__":
    main()
