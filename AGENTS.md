# Claqueta: instrucciones para cualquier IA

> These docs are in Spanish; read them in any language. The videos made with this system are always in Spanish unless the brief says otherwise. Spanish script, on-screen text and captions are literal: never translate them, and never drop accents, «ñ» or «¿ ¡».

Claqueta es un sistema gratuito para hacer videos con código. Alguien configuró un encargo en el panel y te lo pegó. Este repositorio trae lo que necesitas para cumplirlo sin pagar nada.

## Reglas

1. **El encargo manda.** Cumple cada cifra. Si algo no se puede hacer, dilo y propone lo más cercano; no lo cambies en silencio.
2. **Nada de pago.** Sin APIs de pago, MCP de pago, suscripciones ni llaves. No pidas ninguna. Si algo parece exigirla, usa la alternativa gratuita de la tabla de abajo y anótalo en la entrega.
3. **Solo material real.** No inventes datos, logos, capturas ni interfaces. Sin personajes ni marcas ajenas. Toda cifra lleva fuente.
4. **Determinista.** Todo es función del tiempo: semilla fija, nada de `Date.now`, `Math.random` sin semilla, temporizadores ni `requestAnimationFrame` como reloj.
5. **Editable.** Textos, colores y tiempos como variables.
6. **Listo significa medido.** Cuadros mirados y archivo final medido. Si no oyes, dilo: entrega una muestra para que una persona escuche.

## Qué leer, en orden

1. El encargo completo.
2. `library/guias/direccion.md`.
3. Los documentos que nombra la sección «Carga el sistema» del encargo. No leas toda la biblioteca.
4. `library/guias/aprendizajes.md`, solo los grupos que vas a tocar.

Si existe `MOTION.md` en la raíz del proyecto del usuario, léelo entero: sus reglas mandan sobre las generales.

## Dónde está cada cosa

| Ruta | Qué hay |
|---|---|
| `library/guias/` | Dirección, motores, sonido, aprendizajes y diccionario de opciones |
| `library/hyperframes/skills/` | Skills de HyperFrames 0.9.9. Empieza por `hyperframes/SKILL.md` |
| `library/hyperframes-clasico/skills/` | Flujos de 0.8.150: `faceless-explainer`, `general-video` |
| `library/lemo-opuscar/` | 66 estilos de película, núcleo y técnica. Lee antes `ORIGEN.md` |
| `library/estilos-40/` | Atlas de 40 estilos con recetas |
| `library/skills-propias/` | Método `motion-system` y `video-con-codigo` |
| `library/marca/` | Ejemplo de `MOTION.md` |
| `engines/pizarra/` | Motor de tiza listo para copiar |
| `tools/` | Voz, tiempos, música, efectos, mezcla, revisión |
| `data/` | Todo el catálogo como datos: estilos, cámara, voces, radar |
| `docs/radar.md` | 50 repositorios revisados, con licencia y veredicto |

## Empezar

```bash
python .claqueta/tools/doctor.py
```

Dice qué falta en este computador. Necesitas Node 22 o más, ffmpeg, git y Python 3.10 o más.

```bash
pip install numpy scipy soundfile numba
```

## Comandos

```bash
npx hyperframes@0.9.9 init mi-video --resolution portrait --non-interactive --skip-skills
npx hyperframes@0.9.9 check --json
npx hyperframes@0.9.9 snapshot --review
npx hyperframes@0.9.9 render --output renders/final.mp4

python .claqueta/tools/tts/hablar.py --listar
python .claqueta/tools/tts/hablar.py --motor edge --voz es-CO-GonzaloNeural --archivo guion.txt --salida assets/voz/voz.mp3 --palabras assets/voz/palabras.json
python .claqueta/tools/subtitulos/alinear.py --audio assets/voz/voz.wav --guion guion.txt --salida assets/voz/palabras.json

python .claqueta/tools/audio/musica.py --caracter calido --bpm 96 --dur 30 --salida assets/audio/musica.wav --rejilla assets/audio/rejilla.json
python .claqueta/tools/audio/efecto.py --listar
python .claqueta/tools/audio/mezcla.py --voz assets/voz/voz.mp3 --musica assets/audio/musica.wav --efectos efectos.json --dur 30 --salida assets/audio/mezcla.wav

python .claqueta/tools/qa/verificar_video.py verificar renders/final.mp4 --duracion 30
python .claqueta/tools/qa/hoja_cuadros.py renders/final.mp4 --salida renders/hoja.jpg
python .claqueta/tools/qa/saltos.py renders/final.mp4
```

## Si algo pide dinero

| Si ves | Usa |
|---|---|
| ElevenLabs u otra voz de pago | `tools/tts/hablar.py` |
| `media-use` con llaves, Lyria, Suno | `tools/audio/musica.py` |
| Whisper o transcripción por API | `tools/subtitulos/alinear.py`, con `faster-whisper` local |
| Sora, Veo, Runway o cualquier clip generado | Constrúyelo con código: Canvas o three.js |
| `hyperframes cloud`, `lambda`, `cloudrun`, `templates`, `billing`, `reverse`, `publish` | `hyperframes render` en local |
| `style-sampling` | Las fichas de `library/estilos-40` y `library/lemo-opuscar/styles` |
| Hospedaje del proyecto | Entrega los archivos. No subas nada sin que te lo pidan |

## Publicar

No publiques en redes ni subas el video a ningún servicio sin aprobación explícita de la persona, pieza por pieza.

## Si tu entorno no tiene terminal

Lee `llms.txt`. Escribe todos los archivos completos y las instrucciones exactas para que la persona los ejecute. No digas que renderizaste si no pudiste.

## Entrega

Máster, copia liviana, portada, créditos con licencias, y un informe corto: qué mediste (duración, LUFS, pico, cuadros mirados), qué no pudiste comprobar y qué decisiones tomaste.
