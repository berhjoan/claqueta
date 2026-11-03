# Aprendizajes de producción

Lo que costó descubrir produciendo videos reales con estas herramientas, en Windows con Git Bash. Cada línea evitó o habría evitado un problema. Revísala solo en los grupos que vas a tocar.

## Entorno y Windows

- En Git Bash, ffmpeg y Node necesitan rutas Windows (`cygpath -m`). Node importa rutas absolutas como `file:///C:/…`.
- `python -I` ignora `PYTHONUTF8`. Para imprimir tildes fija `PYTHONIOENCODING=utf-8`.
- `hyperframes snapshot` en 0.8.x describe los cuadros con Gemini si existe `GEMINI_API_KEY` y envía imágenes del video: usa `--describe false`. En 0.9.9 está apagado por defecto.
- WebGL funciona en una Intel UHD 730 por D3D11 (ANGLE).
- Las pruebas de `faceless-explainer` fallan en Windows porque arman la ruta con `.pathname`. El flujo en sí sirve.

## Voz y pronunciación

- Las palabras en otro idioma (una marca en inglés) se generan aparte, en su idioma, y se empalman.
- Un llamado corto en español se genera dentro de su frase, con varias semillas, y se recorta. Aislado es inestable.
- El reconocimiento de voz perdona acentos. Mide con Whisper con idioma forzado y log-prob del texto objetivo, energía sobre 4 kHz de la «s» y f0 por sílaba.
- Empalma en silencios con las mismas posiciones y duración, para no mover animaciones ni música.
- En `audio_meta.json`, `frame` va como entero: con texto, el ensamblador cuenta 0 voces.
- Si el motor de voz entrega MP3 con extensión `.wav`, ffmpeg lo lee bien.

## Música y mezcla

- Los modelos de música no respetan el tempo pedido (120 → 161). Analiza y corta sobre lo medido. `tools/audio/musica.py` evita el problema porque calcula las notas.
- Un bajo con casi toda la energía bajo 120 Hz no suena en un teléfono: dale armónicos y mide. Apunta a menos del 30 % bajo 120 Hz.
- Una música aunque sea 0,1 s más corta que el video se repite en bucle y su arranque suena al final: rellena con `apad=whole_dur=<total>`.
- Mezcla publicitaria con ffmpeg: pista de voz por `adelay` + `amix`, `sidechaincompress=threshold=0.06:ratio=2.5:attack=30:release=450` sobre la música.
- Extender música: repite una frase empalmando en dos inicios de compás con cruce de 30 ms y desplaza los pulsos posteriores.
- Rejilla: afina período y fase sobre `onset_strength`; cada corte con un ataque a ±25 ms.
- Una mezcla limitada a −3 dBTP y −14 LUFS pasa por el render de HyperFrames y sale en −14,2 LUFS y −2,66 dBTP tras AAC.
- Con música de bombo fuerte, limitar unos 6 dB e iterar midiendo el archivo ya codificado.

## Subtítulos

- El reconocimiento escribe mal los nombres: el texto sale del guion y solo los tiempos del audio (`tools/subtitulos/alinear.py`).
- La banda por defecto (1600–1920) queda bajo la interfaz de las apps: en vertical, subtítulos en y 1300–1540 y contenido hasta 1280.
- Recorta por tiempo con `start < fin − 0.10`; si no, entra por redondeo un subtítulo de la escena siguiente.
- Las fuentes van en `assets/fonts/` del proyecto, o los subtítulos caen a otra fuente.

## Composiciones de HyperFrames

- Ids y clases no empiezan por dígito: rompen `animation-map` y los selectores. Usa `f04-…`.
- `<video>` con `data-start` necesita `class="clip"`. Fija su CSS dentro de la tarjeta y pon debajo el último cuadro (`-sseof -0.05`).
- No declares `const gsap = window.gsap` dentro de un frame: choca con el runtime.
- `fromTo` aplica el estado inicial en t=0: para destellos usa dos `tl.to` seguidos.
- Los bloques del registro vienen en 1920×1080: recompón para 9:16, nunca recorte ciego.
- `check` da falsos errores con capas superpuestas (glitch, neón, ASCII) y tableros en giro: verifica en un cuadro antes de arreglar.
- Sora no tiene `≈` ni `≠`, y ninguna fuente de marca tiene `✓` ni `✗`: `≠` en JetBrains Mono o SVG, `✓ ✗` siempre en SVG.
- three.js en render real: `three@0.181.2/+esm`, `preserveDrawingBuffer:true`, `setPixelRatio(1)`, un renderer por frame y dibujo solo desde un tween proxy de GSAP.
- Canvas 2D funciona en `check`, Studio y `render`. Dos relojes probados: proxy de GSAP (tiempo local, solo dibuja con la escena activa, es el preferido) y `hf-seek` (tiempo global, filtra lo que quede fuera de la escena). Ir atrás y adelante da la misma imagen.
- Un `<script type="module">` dentro del `<template>` importa con `./assets/…`, relativo a `index.html`. El módulo se evalúa una vez por página: hornea ahí y comparte entre escenas.
- Dos escenas que dibujan la misma película se cortan con la cámara en movimiento sin salto medible: sirve para partir piezas largas.
- Con horneado largo, `check` avisa «did not become render-ready within 3000ms» y marca `canvas_content_at_edge`. Ninguno es un error.
- Un `index.html` de revisión dentro del proyecto entra al lint del Studio: esas páginas van fuera.

## Material dibujado

- EMS Delight trae las letras del español y se lee bien en tiza. Hizo falta fallar si falta una letra, leer `1e+03`, acortar las barras de `A H E F`, bajar las tildes minúsculas y suavizar las polilíneas conservando esquinas. `engines/pizarra` ya lo trae.
- La fuente dice `cap-height` 500 pero sus mayúsculas miden unas 680 unidades. `cap` 76 da mayúsculas de 103 px y una línea de unos 13 caracteres en 888 px.
- Con `cap` 60 la tiza ya se ve calada y con 40 queda débil: lo pequeño pide más peso.
- Mano creíble: 0,08–0,13 s por trazo y 40 ms de aire entre letras.
- En un i5 sin GPU, hornear 74 trazos tarda 4,9 s por página y cada cuadro 1–6 ms en el navegador. El cuello es la captura: 450 cuadros en 1 min 23 s a 1 min 37 s con 4 procesos.
- La película corre también en Node, y de ahí salen los eventos de audio: un sonido por trazo en su tiempo exacto.

## Color

- En el MP4 el negro cálido pierde 2–3 niveles de verde y, realzado ×7, bandea. A brillo normal no se nota en cuadros: revísalo en un teléfono.
- En negro y oro conservan identidad pizarra, collage, cósmico 3D, infografía, isométrico y tipografía. Bauhaus, neobrutalismo, cristal, glitch y siluetas se vuelven tarjetas finas sobre negro.

## Material filmado

- Los videos de TikTok vienen en HEVC, a veces 576×1024 o con franjas: pasa a H.264 30 fps y usa `cropdetect`.
- Para mover una imagen con gráficos pegados, borra las capas y ponlas quietas encima. Mide antes: una píldora semitransparente viaja con la toma.
- Máscaras geométricas, no por umbral. Rellena con convolución normalizada en varias escalas; `cv2.inpaint` deja rayas.
- Barridos tipo «push», sin bordes espejo. Para estirar, repite cuadros dentro de la transición; mezclarlos duplica el texto.

## Publicación

- Una sola red no decide: en una cuenta nueva, Instagram premió el educativo largo y TikTok las piezas cortas. Prueba versión corta contra larga.
- Facebook: más de 90 s va como publicación, no como Reel.
- Una canción de TikTok se reemplaza antes de subir a otras redes.
- Declara el uso de IA (voz y música generadas) donde la red lo pida.
