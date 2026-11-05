# Sonido sin pagar: voz, música, efectos y mezcla

Todo corre en tu computador. Pide internet Edge, en cada uso, y una vez lo que se baja: modelos de voz y de Whisper. Las rutas parten de la raíz del sistema: desde tu proyecto, antepón `../.claqueta/`.

```bash
pip install numpy scipy soundfile numba faster-whisper
```

Las skills de HyperFrames dicen que no se escriba música con código porque nadie puede oírla. Aquí se resuelve de otra forma: la herramienta está probada, se mide y una persona la escucha antes de publicar.

## Orden

`tools/pista.py` hace casi todo en tres comandos, dentro de tu proyecto:

```bash
python ../.claqueta/tools/pista.py voz --motor edge --voz es-CO-GonzaloNeural --guion guion.txt --por-oraciones --pausa 0.4
python ../.claqueta/tools/pista.py musica --caracter calido
python ../.claqueta/tools/pista.py mezcla --nivel-musica -22 --silencios 2
```

`voz` deja `assets/tiempos.json` (cada palabra con su tiempo afinado, las pausas medidas, los grupos de subtítulos y `dur`) y `renders/final.srt`. `musica` y `mezcla` leen de ahí la duración. `--silencios 2` calla música y efectos en las dos pausas más largas de la voz.

Por debajo:

1. Voz: `tools/tts/hablar.py`. Su duración real manda sobre la lista de planos.
2. Subtítulos: si el reparto automático no te sirve, escribe `frases.txt` con un subtítulo por línea y añade `--frases frases.txt` a `pista.py voz` o `pista.py subtitulos`.
3. Tiempos de palabra: `tools/subtitulos/alinear.py`. Con Edge ya salen de `--palabras`. Sin acceso a Hugging Face: `tools/subtitulos/tiempos_por_tramos.py`.
3. Música: `tools/audio/musica.py`, con la duración real. Una pista con licencia: `tools/medios/medios.py audio`.
4. Efectos: `tools/audio/efecto.py`. El kit de escenas los coloca solo, en `efectos.json`.
5. Mezcla y máster: `tools/audio/mezcla.py`.
6. Render. Mide el archivo final con `tools/qa/revisar.py`.

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
| `respiro` | Unos 10 dB abajo, cerca del 62 %. Solo si la pieza tiene 10 compases o más | Soltar la cámara, dar el silencio |
| `cierre` | Lo más fuerte | Dato final, llamado |

Pocas notas ligadas a la imagen, en vez de una cama continua:

```bash
python tools/audio/notas.py --listar
python tools/audio/notas.py partitura.json --dur 10 --salida assets/audio/musica.wav
```

`partitura.json` es una lista como `[{"t": 0.5, "nota": "A3", "dur": 3, "vel": 0.6, "pan": -0.2, "instrumento": "nylon_guitar"}]`.

Si necesitas otras opciones:

| Fuente | Licencia | Cuándo |
|---|---|---|
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

Grabados y gratis: `git clone --depth 1 https://github.com/wyzowl/sfx-kit.git` (CC0, 320 efectos, unos 67 MB). Su `sounds.json` permite elegir por lo que pasa en pantalla sin oír. O busca uno concreto: `python tools/medios/medios.py audio "paper tear" --licencia libre --max-seg 5`.

Sonido continuo de tiza a partir de los trazos: `tools/audio/tiza.py`, con los eventos de `engines/pizarra/eventos.mjs`.

## Mezcla

```bash
python tools/audio/mezcla.py --voz assets/voz/voz.mp3 --musica assets/audio/musica.wav --efectos efectos.json --dur 30 --salida assets/audio/mezcla.wav --nivel-musica -22 --silencios 12.4-12.8,20-20.4
```

`efectos.json`:

```json
[
  {"pico": 1.23, "sonido": "barrido", "ganancia": -8, "dur": 0.4, "pan": 0.2},
  {"pico": 4.87, "archivo": "assets/audio/golpe-1.wav", "ganancia": -5},
  {"pico": 9.13, "sonido": "impacto", "ganancia": -6, "semilla": 3},
  {"t": 0, "archivo": "assets/audio/tiza.wav", "ganancia": 0}
]
```

`pico` pone el punto más fuerte del sonido en ese segundo: úsalo en golpes, con un cuadro más que su imagen. `t` pone su inicio: úsalo en capas largas. `semilla` da otra toma del mismo sonido. Con `"bajo_voz": -24`, una capa continua cede mientras se habla: la tiza tapa las palabras sin eso. La salida del comando dice en qué segundo cayó cada efecto.

- La voz se lleva a −16 LUFS antes de mezclar.
- `--nivel-musica` es cuánto queda la música bajo la voz mientras se habla. Sube 6 dB cuando la voz calla, con subida de 120 ms y bajada de 700 ms.
- `--silencios` calla música y efectos en esos tramos. La voz no se toca: un silencio real va en una pausa de la voz. Para crearla: `hablar.py --por-oraciones --pausa 0.4`.
- Con música escasa de `notas.py`, `--nivel-musica` mide el promedio y cada ataque sube mucho sobre él: usa `vel` de 0,3 a 0,6 y revisa que ninguna nota quede sobre la voz.
- Sale en −14 LUFS con −3 dBTP como máximo, y puede quedar más abajo: una voz con pocos picos dio −5,3. Después de AAC sube unas décimas, dentro del máximo de −1.

## Revisar sin oído

- `mezcla.py` imprime el `pico_s` de cada efecto. `npx hyperframes@0.9.9 audio` confirma los golpes secos en tiempo de película, pero no ve los barridos.
- `tools/qa/revisar.py` mide volumen, pico, energía bajo 120 Hz (un teléfono no la suena), voz contra música, densidad de efectos y silencios reales, en el archivo final.
- `python tools/qa/comparar_voz.py --audio renders/final.mp4 --guion guion.txt` transcribe y compara con el guion. Si coincide, la música no tapa la voz.
- `ffmpeg -i mezcla.wav -lavfi showspectrumpic=s=1600x600 espectro.png` muestra si algo tapa la voz.
