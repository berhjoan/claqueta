# Origen de esta copia

- **Fuente:** https://github.com/heygen-com/hyperframes
- **Commit:** `fa1942d5ac0f0894f2b374c2d0d3a026071e221e`, del 2026-11-05 («fix(cli): timeline apply checks the overlap of a plan's end state, not each step», #7214).
- **Licencia del código del registro:** Apache-2.0. Copia del original en `LICENSE`. Ninguno de los elementos copiados declara `license` propia en su `registry-item.json` salvo los 36 shaders (`Apache-2.0 AND MIT`), así que van bajo Apache-2.0.
- **Licencia de los 36 shaders y su motor:** MIT. Es la librería `shaders` 4.0.0 de Shader Effects Inc. (shaders.com) con `typegpu` 0.12.3 (Software Mansion), `tinyest` 0.3.4, `typed-binary` 4.3.3 y `tsover-runtime` 0.0.7, todas MIT. Los avisos completos están en `shaders/lib/shaders.THIRD-PARTY-LICENSES.txt`.

Esta carpeta es una copia fija: ningún video depende de la rama `main`. No uses `hyperframes add` contra el registro vivo para estos elementos.

## Qué se copió

| Ruta | Qué es | Se probó |
|---|---|---|
| `shaders/lib/shaders.iife.js` | Motor de los 36 shaders, con un parche de tres sustituciones de texto (ver abajo). 1,4 MB | Sí |
| `shaders/lib/shaders.THIRD-PARTY-LICENSES.txt` | Licencias del motor y sus dependencias | |
| `shaders/bloques/<nombre>.html` | Los 36 bloques de shader, con las medidas cambiadas de 1920×1080 a 1080×1920 y nada más | Sí, los 36, en `render` y en `check` |
| `shaders/SHADERS.md`, `propiedades.txt` | Resultados medidos y las propiedades de cada shader | |
| `shaders/parche-shaders.py` | Reproduce el motor parcheado desde el original | |
| `bloques/split-flap-board/` | Bloque tal cual, con su `registry-item.json`. De él sale la plantilla `S13` | Sí |
| `transiciones/` | Diez transiciones que no son fundidos, con su montaje y una tabla (`TRANSICIONES.md`) | Sí, en `render` |
| `subtitulos/` | Seis estilos de subtítulos `caption-*` pasados a escena, con su tabla (`SUBTITULOS.md`) | Sí, en `render` |

Las plantillas verticales que usan estos bloques están en `library/plantillas/` (`S13`, `S03`, `S11` y los estilos `R-*` de shader). Cada `ficha.json` dice su `origen` y su `licencia`.

## Qué se cambió respecto al original

- **Motor de shaders (`shaders.iife.js`):** cuatro sustituciones de texto, sin tocar nada más. Reproducible con `shaders/parche-shaders.py`, que comprueba antes el md5 del original (`61b46a2b795b406683f30aa515e03843`).
  1. El arranque de un shader es una función, `window.__hfShaderMount(canvas)`, que cada escena llama con su canvas.
  2. Si nadie pide el modo manual, se monta el primer canvas como antes: un bloque suelto da el mismo cuadro que el original.
  3. La promesa de arranque se registra con una clave propia por instancia.
  4. El tiempo pasa por `canvas.__mapTime(t)` si la escena la define.
- **Bloques de shader:** solo las medidas, de 1920×1080 a 1080×1920.
- **Transiciones y subtítulos:** el agente que los adaptó anotó cada cambio por elemento en `TRANSICIONES.md` y `SUBTITULOS.md`. En resumen: se quitaron las líneas de GSAP y de fuentes por URL (el proyecto trae GSAP y fuentes locales), los `caption-*` pasaron de documento de 1920×1080 a escena `<template>`, y los bloques de shader de transición se regeneraron con `transiciones/_herramientas/generar-shader.py` a partir de su GLSL original.

## Qué se dejó fuera a propósito

- **Todo lo que imita una marca, una interfaz real o a una persona:** `apple-money-count`, `blue-sweater-intro-video`, `chatgpt-exchange`, `claude-exchange`, `code-snippet-apple-terminal-pro`, `code-snippet-dark-2026`, `code-snippet-dark-modern`, `heygen-avatar-promo-card`, `instagram-follow`, `ios26-liquid-glass`, `lower-third-bild`, `macos-notification`, `macos-tahoe-liquid-glass`, `north-korea-locked-down`, `nyc-paris-flight`, `reddit-post`, `slack-notification-ad`, `spotify-card`, `tiktok-follow`, `vfx-iphone-device`, `vpn-youtube-spot`, `x-post`, `yt-lower-third` y los componentes `x-follow-card` y `store-badge-lockup`. Tampoco se copió `yt-prism-title`, que además es solo un título con franja cromática.
- **Las skills de pago de HyperFrames:** `style-sampling` y `reverse-any-video`.
- **Lo que carga three.js, fuentes o GSAP por URL y no se reescribió:** `code-particle-assemble`, `spiral-galaxy`, `code-3d-extrude`, `glass-hero`, `product-turntable`, `extruded-logo`, `wireframe-portal-title`, `exploded-stack` y otros. Una escena de Claqueta no puede llevar URL externas. Donde hacía falta el efecto (partículas, malla 3D) se escribió una versión propia en Canvas 2D (`S01`, `S05`).
- **Los bloques `html-in-canvas` (`vfx-*`, `liquid-glass-*`, `ui-3d-reveal`):** piden un Chrome con una bandera experimental y no se probaron.
- **Lo que necesita datos reales y su fuente para tener sentido:** los mapas (`world-map`, `us-map*`, `spain-map`) y los gráficos `bar-chart-race`, `week-in-merges`.
- **Lo demás** (tarjetas de chat y notificaciones simuladas, carruseles, rótulos `lt-*`, familia `hw-*` salvo `hw-scribble-transition`, `mk-*` salvo `mk-clone-wall-transition`): no se necesitó. Siguen en el registro del commit fijo.

## Lo que salió pero no se copió

Las transiciones y subtítulos que se probaron y se descartaron (con el motivo) están al final de `transiciones/TRANSICIONES.md` y `subtitulos/SUBTITULOS.md`.

## Cómo reproducirlo

```bash
git clone https://github.com/heygen-com/hyperframes .hf-registro
cd .hf-registro
git checkout fa1942d5ac0f0894f2b374c2d0d3a026071e221e
md5sum registry/blocks/aurora/lib/shaders.iife.js    # 61b46a2b795b406683f30aa515e03843
python ../.claqueta/library/hyperframes-registro/shaders/parche-shaders.py registry/blocks/aurora/lib/shaders.iife.js /tmp/shaders.iife.js
cmp /tmp/shaders.iife.js ../.claqueta/library/hyperframes-registro/shaders/lib/shaders.iife.js
```

## Avisos

- **Los shaders necesitan GPU.** Con `--no-browser-gpu` el render falla con un error claro; no hay modo por software que funcione en Windows (ver `shaders/SHADERS.md`).
- **Pocos shaders por video.** Con el parche caben varios (probado con tres), pero cada escena crea su propio dispositivo WebGPU y repinta en cada cuadro aunque no esté a la vista.
- **El registro cambia.** Si quieres otra versión, vuelve a copiar con el commit nuevo, prueba cada plantilla y actualiza este archivo. No mezcles dos commits.
