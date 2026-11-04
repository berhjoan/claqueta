# Voces gratis en español

`hablar.py` usa un solo comando para cuatro motores gratis. Oye las muestras en el panel, en la sección Sonido y voz.

```bash
python tools/tts/hablar.py --listar
python tools/tts/hablar.py --motor edge --voz es-CO-GonzaloNeural --archivo guion.txt --salida assets/voz/voz.mp3 --palabras assets/voz/palabras.json
python tools/tts/hablar.py --motor kokoro --voz em_alex --archivo guion.txt --salida assets/voz/voz.wav
python tools/tts/hablar.py --motor piper --voz es_MX-claude-high --archivo guion.txt --salida assets/voz/voz.wav
python tools/tts/hablar.py --motor pocket --voz lola --archivo guion.txt --salida assets/voz/voz.wav
```

Opciones: `--velocidad 1.05`, `--tono -2` (solo Edge), `--palabras` (tiempos de palabra, solo Edge) y `--por-oraciones --pausa 0.4` (cada oración aparte, unidas con un silencio real). Con otros motores, los tiempos salen de `tools/subtitulos/alinear.py`. Las dos rutas afinan cada palabra contra la energía del audio: medido sobre una frase real, Edge quedó con 20 ms de error medio y 63 ms de máximo, y Whisper con 39 ms y 110 ms.

Los modelos se guardan en `~/.cache/claqueta/tts`, o en la carpeta de la variable `CLAQUETA_CACHE`.

| Motor | Instalar | Internet | Licencia | Cuándo |
|---|---|---|---|---|
| Edge | `pip install edge-tts` | Sí, en cada uso | Biblioteca LGPL. El servicio es de Microsoft y no ofrece un acuerdo para este uso: revisa sus condiciones si el video es para un cliente | Las voces más naturales |
| Kokoro | `pip install kokoro-onnx soundfile` | Solo para bajar 115 MB la primera vez | Apache-2.0 | Sin internet ni servicio ajeno. Su ficha avisa de soporte flojo fuera del inglés |
| Piper | `pip install piper-tts` | Solo para bajar cada voz | Programa GPL-3.0, usado como programa aparte. La licencia de cada voz abajo | Muy rápido en CPU |
| Pocket TTS | `pip install pocket-tts` | Solo para bajar el modelo, cerca de 900 MB con PyTorch | Código MIT; modelo CC BY 4.0, con crédito a Kyutai | Voz local en español, sin servicio ajeno. En un i5 sin GPU generó 7,3 s de audio en 4 s con `spanish`. El modelo `spanish_24l` iba más lento que el tiempo real |

## Licencia de cada voz de Piper

Tomada del `MODEL_CARD` de cada voz:

| Voz | Licencia |
|---|---|
| `es_MX-claude-high` | Apache-2.0 |
| `es_MX-ald-medium` | Unlicense |
| `es_AR-daniela-high` | CC BY-SA 4.0: exige crédito y compartir igual |
| `es_ES-davefx-medium` | CC0 |
| `es_ES-sharvard-medium` | CC BY 3.0: exige crédito |

## Comprueba lo que se dijo

Una voz sintética puede saltarse palabras o decir mal un número. Antes de usarla, compárala con el guion:

```bash
python tools/qa/comparar_voz.py --audio assets/voz/voz.mp3 --guion guion.txt
```

Si algo suena mal, no toques `guion.txt`. Haz una copia `guion_voz.txt` solo para el motor, con una coma o con la palabra escrita como suena («dos mil veintiséis»), y genera con esa copia. `guion.txt` sigue literal para los subtítulos y para comparar.

Trampas medidas con Edge: «IA» suena como la sílaba «ya» en cualquier grafía, y solo `i, a,` da los dos nombres de letra, con pausas que luego hay que recortar. Una frase puede deformarse dentro de una toma larga y salir bien sola: genera por oraciones y une en la pausa. Guarda las tomas que uses: es un servicio en línea.

## Otras voces gratis, sin probar en este sistema

| Voz | Por qué mirarla | Ojo |
|---|---|---|
| Chatterbox `es-mx-latam` | Afinado oficial para Latinoamérica, MIT | Todo audio lleva marca de agua. Sin cifras en CPU |
| VoxCPM2 | Español y voz por descripción, Apache-2.0 | Pide unos 8 GB de VRAM |

El detalle está en `docs/radar.md`.
