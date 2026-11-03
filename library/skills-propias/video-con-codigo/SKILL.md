---
name: "video-con-codigo"
description: "Producir un corto animado completo (historia, personajes, cámara, partículas, voz en español, lip-sync, música, mezcla) 100 % con código usando Remotion y herramientas locales, sin APIs de pago."
---

# Video 100 % con código (Remotion + audio local)

## Orden de trabajo (no cambiar el orden)
1. **Historia primero** (método HyperFrames `story.md`): la única cosa, 3 storylines, hook en los 2 primeros segundos, beats con porcentajes, "tells" de video generado prohibidos (todo entra igual, flotar sin causa, tarjetas en fila, logo flotante). Escribir `SCRIPT.md` con timecodes.
2. **Voces** → duraciones reales → `timeline.json` (escenas, inicio de cada línea, eventos, secciones musicales). Audio y video leen el mismo JSON.
3. **Audio maestro** (música + SFX + voces con ducking, −15.5 LUFS, pico ≤ −1 dBTP).
4. **Escenas** en Remotion, una composición `Film` con `<Sequence>` por escena; revisar fotogramas de control (contact sheet) antes de renderizar.
5. **Render por escena** (`--frames=a-b --muted`) → concat → mux con ffmpeg → QC con fotogramas extraídos.

## Motor
- `npx create-video@latest --yes --blank --no-tailwind <dir>`; `npx remotion add @remotion/transitions @remotion/media @remotion/effects @remotion/noise @remotion/paths @remotion/shapes @remotion/motion-blur @remotion/fonts`.
- Sandbox sin GPU: en `remotion.config.ts` → `Config.setBrowserExecutable(<chrome-headless-shell>)`, `Config.setChromiumOpenGlRenderer("swangle")`, `setConcurrency(2)`, `setCrf(18)`, `setPixelFormat("yuv420p")`.
- Fuentes: paquetes `@fontsource[-variable]/*` (npm sí llega; Google Fonts no). Esperar `document.fonts.load()` con `delayRender` antes de capturar (glifos áéíóúñ¿¡).
- Reglas Remotion: todo deriva de `useCurrentFrame()`; `interpolate` con clamp; `random(seed)` de Remotion; nada de CSS `transition/animation`, `Math.random`, `Date`, timers, `useFrame`.
- Coste medido (2 CPU, 1080p): escena vacía ≈0.1 s/f; 2000 sprites canvas ≈0.7 s/f; `filter: blur()` a pantalla completa ≈2.5 s/f. Partículas: closed-form (posición = f(semilla, i, t)), sprites radiales pre-difuminados, `globalCompositeOperation: "lighter"`.
- Un corto de 3 min (5400 fotogramas, 1080×1920) tardó ~1 h 30 en 2 CPU. Guardar el bundle (`npx remotion bundle`) y renderizar desde él.

## Kit reutilizable (no viene en este repositorio; sirve como lista de piezas a construir)
`anim.ts` (easings por rol, spring cerrado, keyedState, blink, drift), `Camera2D.tsx` (capas con paralaje/dolly), `Particles.tsx` (lluvia, luciérnagas, polvo, estrellas, grano), `City.tsx` (ciudad neón procedural + reflejos), `Text.tsx` (kinetic, neón, subtítulos por palabra, título variable), `Post.tsx` (viñeta, flash, letterbox, rayos), `character/Mia.tsx` (rig: pose + expresión + visemas A–H/X + parpadeo + respiración + rim light + prop), `character/Lucero.tsx`, `Flat.tsx` (mundo plano a lápiz con boil), `ChatScreen.tsx`, `lipsync.ts`. Scripts en `tools/`: `voice.py`, `make_voices.py`, `asr.py`, `make_timeline.py`, `make_audio.py`, `render_all.sh`, `assemble.sh`, `sheet.py`.

## Personajes
- Rig = parámetros numéricos (pose, expresión, visema) mezclables por frame; presets de expresión; transiciones con `keyedState` (anticipación → acción → settle). Cabeza guía, cuerpo sigue; parpadeo cada 2–5 s sembrado; nunca mover todo a la vez con la misma curva.
- Lip-sync: Rhubarb `-r phonetic -f json` sobre WAV 22 kHz mono 16 bit → cues A–H/X → mezclar parámetros de boca entre cues (blend 50 ms). Intensidad de apertura ×0.7 para susurros.
- Hoja de personaje (expresiones, visemas, poses) como still ANTES de animar.

## Voz (español, local)
- Kokoro-82M ONNX (`kokoro-onnx`, voces `ef_dora`, `em_alex`, `em_santa`, lang `es-419`) y Piper (`piper-tts`, `es_MX-claude-high`, `es_AR-daniela-high`). Modelos en GitHub releases (thewh1teagle/kokoro-onnx, k2-fsa/sherpa-onnx).
- Niños: +4…+6 semitonos con `rubberband -p N -F` (formantes). Graves: −4. "Voz hecha de muchas": capa −2 st (26 %) + capa +0.3 st retrasada 12 ms (18 %) + reverb grande.
- **Verificar siempre con ASR** (Parakeet-TDT 0.6B v3 via sherpa-onnx ≥ 2.0): WER contra el texto; regenerar o reescribir la frase si > 5 %. Verificar ANTES de aplicar efectos (la reverb confunde al detector de idioma del ASR). Los timestamps por palabra del ASR alimentan los subtítulos.
- Si el usuario tiene su propia voz (p. ej. ElevenLabs), se sustituye el WAV de cada línea y se regeneran cues/timeline sin tocar las escenas.

## Música y SFX
- Componer MIDI con `pretty_midi` por secciones (bpm, progresión, instrumentos GM) → `fluidsynth -ni -g 0.6 -r 48000 -F out.wav MuseScore_General_Full.sf3 in.mid` → pedalboard (HPF, compresor, reverb) → pyloudnorm.
- Sincronía visual = misma aritmética de beats (frames por beat = fps·60/bpm, calcular cada beat desde su índice).
- SFX con causa en pantalla; colocar el pico 1 frame después de la imagen; rotar tomas; sintetizar con numpy lo que no exista (zumbidos, lluvia, lápiz, shimmer, impacto sub).
- Mezcla: voz −20 dBFS RMS, música −8 dB bajo la voz (ducking 120 ms / 700 ms), SFX −4 dB, máster −15.5 LUFS, pico 0.6. Revisar con un espectrograma (`ffmpeg showspectrumpic`) que ningún bed (lluvia) tape la voz.

## Dirección (de las skills leídas: Remotion, HyperFrames, iart-ai motion/kinetic/webgl, nolanx, anatomy, isometric-ops, taste-skill)
- Un movimiento por beat; llegadas con cola larga (`bezier(0.16,1,0.3,1)`), salidas 40–50 % más cortas; cámara `inOut`; títulos quietos una vez aterrizan; 3–5 tipos de transición con causa; cortar en el frame más rápido.
- Paralaje: fondo 0.1–0.3×, medio 0.5–0.7×, frente 1–1.5× con blur. Plano dron = pila de planos anidados con escala logarítmica (ventana → fachada → manzana → mapa → nubes → planeta).
- Isométrico: una sola proyección; sombras planas 15–30 %; top más claro.
- Tipografía: 2 familias máx; títulos 4–9 % de la altura; stagger letras 20–40 ms, palabras 40–70 ms; variable fonts para peso/anchura.
- Vertical: contenido clave en el 80 % central; subtítulos sobre la zona segura inferior (≥ 110 px); texto ≥ 44 px; subtítulos por palabra para que se entienda sin sonido.