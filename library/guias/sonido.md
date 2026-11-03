# Sonido sin pagar: voz, música, efectos y mezcla

Todo corre en tu computador. Lo único que pide internet es Edge, y es opcional.

```bash
pip install numpy scipy soundfile numba
```

## Orden

1. Voz: `tools/tts/hablar.py`. Su duración real manda sobre la lista de planos.
2. Tiempos de palabra: `tools/subtitulos/alinear.py`. Con Edge ya salen de `--palabras`.
3. Música: `tools/audio/musica.py`, con la duración real.
4. Efectos: `tools/audio/efecto.py`.
5. Mezcla y máster: `tools/audio/mezcla.py`.
6. Render. Mide el archivo final con `tools/qa/verificar_video.py`.

Claude no oye, y otras IA tampoco. Mide todo y entrega una muestra para que una persona la escuche antes de un render largo.

## Música

```bash
python tools/audio/musica.py --listar
python tools/audio/musica.py --caracter calido --bpm 96 --dur 30 --salida assets/audio/musica.wav --rejilla assets/audio/rejilla.json
```

Compone con síntesis y modelos físicos de cuerda, sin muestras ni modelos. Sale en −18 LUFS. La misma semilla da el mismo archivo, y `--semilla` da otra interpretación.

La rejilla trae `pulsos`, `compases` y `secciones`:

| Sección | Qué hace | Qué puede hacer la imagen |
|---|---|---|
| `entrada` | Escasa, unos 5 dB abajo | Plantear |
| `cuerpo` | Plena | Desarrollar |
| `respiro` | Unos 10 dB abajo, cerca del 62 % | Soltar la cámara, dar el silencio |
| `cierre` | Lo más fuerte | Dato final, llamado |

Si necesitas otras opciones:

| Fuente | Licencia | Cuándo |
|---|---|---|
| `tools/audio/pluck.py` | MIT | Pocas notas ligadas a lo que aparece |
| `library/lemo-opuscar/core/audio/sampler.py` con VSCO 2 CE o VCSL | CC0, con otras librerías a revisar | Tema con instrumentos reales. Baja 70–400 MB |
| Meta Open Sound, `facebookincubator/Meta-open-sound` | CC0 | 1.075 muestras de piano y guitarras |
| alvana-audio, `seyedpouramir/alvana-audio` | CC0 salvo 5 temas CC BY. Revisa cada origen | Temas ya hechos con archivo de pulsos |
| Stable Audio 3 Small | Código MIT; pesos gratis bajo 1 M USD al año | Generar sin GPU. Sin probar aquí |
| ACE-Step 1.5 | MIT | Generar. Lento sin GPU, unos 10 GB. Sin probar aquí |
| MusicGen | **No usar**: pesos CC BY-NC | Prohíbe el uso comercial |

## Efectos

```bash
python tools/audio/efecto.py --listar
python tools/audio/efecto.py barrido --dur 0.4 --salida assets/audio/barrido.wav
python tools/audio/efecto.py golpe --tomas 3 --salida assets/audio/golpe.wav
```

Grabados y gratis: `git clone --depth 1 https://github.com/wyzowl/sfx-kit.git` (CC0, 320 efectos, unos 67 MB). Su `sounds.json` permite elegir por lo que pasa en pantalla sin oír.

Sonido continuo de tiza a partir de los trazos: `tools/audio/tiza.py`, con los eventos de `engines/pizarra/eventos.mjs`.

## Mezcla

```bash
python tools/audio/mezcla.py --voz assets/voz/voz.mp3 --musica assets/audio/musica.wav --efectos efectos.json --dur 30 --salida assets/audio/mezcla.wav --nivel-musica -22 --silencios 12.4-12.8,20-20.4
```

`efectos.json`:

```json
[
  {"t": 1.23, "sonido": "barrido", "ganancia": -8, "dur": 0.4, "pan": 0.2},
  {"t": 4.87, "archivo": "assets/audio/golpe-1.wav", "ganancia": -5},
  {"t": 9.10, "sonido": "impacto", "ganancia": -6, "semilla": 3}
]
```

- La voz se lleva a −16 LUFS antes de mezclar.
- `--nivel-musica` es cuánto queda la música bajo la voz mientras se habla. Sube 6 dB cuando la voz calla, con subida de 120 ms y bajada de 700 ms.
- `--silencios` calla música y efectos en esos tramos. La voz no se toca.
- Sale en −14 LUFS y −3 dBTP. Después de AAC queda cerca de −2,7 dBTP.

## Revisar sin oído

- `npx hyperframes@0.9.9 audio` dice dónde cae cada golpe en tiempo de película.
- `tools/qa/verificar_video.py` mide volumen y pico del archivo final.
- Transcribe la mezcla con Whisper y compárala con el guion: si se entiende, la música no tapa la voz.
- `ffmpeg -i mezcla.wav -lavfi showspectrumpic=s=1600x600 espectro.png` muestra si algo tapa la voz.
