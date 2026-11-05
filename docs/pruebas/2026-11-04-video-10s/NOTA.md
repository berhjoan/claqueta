# Nota de entrega

## Qué se hizo
Video vertical de 9,9 s sobre «Tu cerebro vive en el pasado», hecho con el encargo que generó Claqueta (neón 70 %, tipografía cinética 20 % y partículas 10 %; 10 s, 9:16, 30 fps). Se siguió el encargo tal cual. Lo que no se pudo cumplir se dice abajo.

Guion (22 palabras): «Nunca has visto el presente. Tu cerebro tarda al menos 80 milisegundos en armar lo que ves. Cuando lo ves, ya pasó.»

Planos: los 6 de la tabla se juntaron en 3 (el mínimo permitido): gancho (0–2,65 s), mecanismo (2,1–6,875 s) y giro con cierre de marca (6,875–9,9 s).

## Qué se midió
- `check`: 0 errores. Queda un aviso: el lema está 1,4 s en pantalla y HyperFrames pide 2 s.
- Archivo: 9,9 s, 1080×1920, 30 fps, H.264 yuv420p, AAC, 11,7 MB.
- Audio del archivo final: −14,23 LUFS y −4,78 dBTP.
- Silencios reales: 3,80–4,10 s (antes del dato) y 6,56–6,94 s, a −115 y −128 dB de media.
- 0 cuadros negros. Dos saltos detectados en 3,90 y 4,13 s: la entrada de «80», que es intencional. Los dos cortes no aparecen como salto: quedaron escondidos en el movimiento.
- Revisé unos 40 cuadros: zonas seguras, tildes, cortes y primer cuadro con imagen.

## Qué no se pudo comprobar
- **No oí la voz.** Edge (Gonzalo) no conecta desde este entorno y Piper también baja sus voces de Hugging Face, que está bloqueado. Usé Kokoro `em_alex`, que se baja de GitHub. Su ficha avisa que el español es flojo: alguien debe escucharlo.
- **Whisper no se pudo bajar**, así que no corrió `comparar_voz.py`. Los tiempos de palabra salieron de las pausas reales y de la energía del audio, repartidos por sílabas (`scripts/tiempos_sin_whisper.py`). El desfase puede pasar de 2 cuadros en alguna palabra.
- El render no encontró `chrome-headless-shell`, porque intenta bajarlo. Se usó el Chrome del sistema con `HYPERFRAMES_BROWSER_PATH`.

## Decisiones
- El neón cian y magenta de S04 se pasó a la paleta de la marca: tubos crema y oro con halo ámbar. La paleta del encargo es exacta.
- La sección 9 dice «aire limpio, sin partículas» y el acento es Partículas. Las partículas quedaron solo como recurso del giro, nunca como ambiente.
- Silencio antes del dato: se abrió una pausa de 0,25 s dentro de la toma, en un valle de energía.
- `srt.py` dejó «ves.» solo en un subtítulo. El SRT se escribió a mano con las mismas frases de pantalla.
- No hubo paradas de aprobación (guion, cuadro de estilo y borrador) porque se pidió hacerlo de corrido.

## Cómo cambiar lo más probable
- Textos y color oro: variables en `index.html` (`titulo`, `cifra`, `unidad`, `cierre`, `oro`).
- Voz: regenerar con `hablar.py`, correr `scripts/tiempos_sin_whisper.py` y rehacer la mezcla con el comando de `SPEC.md`.
- Renderizar: `HYPERFRAMES_BROWSER_PATH=/ruta/a/chrome npx hyperframes@0.9.9 render --output renders/final.mp4 --fps 30 --crf 17`.
