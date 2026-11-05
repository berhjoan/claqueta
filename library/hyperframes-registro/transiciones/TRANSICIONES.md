# Transiciones del registro de HyperFrames, probadas en vertical (1080×1920)

Diez transiciones que se montaron y se renderizaron aquí, con cuadros mirados. Ninguna es un fundido. Salen de `heygen-com/hyperframes` en el commit `fa1942d5ac0f0894f2b374c2d0d3a026071e221e` (Apache-2.0, copia en `LICENSE-Apache-2.0-hyperframes.txt`).

**Qué hay en cada carpeta:** `index-ejemplo.html` (el montaje que funcionó, se copia como `index.html`) y `compositions/…` (el componente o bloque, ya sin URL externas). Las dos escenas de prueba («Antes» y «Después») están en `_escenas-prueba/`: `compositions/escA.html`, `escB.html` y dos PNG de 1080×1920 en `assets/`. Para probar una transición se copian a un proyecto, en este orden: `_escenas-prueba/`, la carpeta de la transición, y `index-ejemplo.html` como `index.html`.

**Prueba hecha:** cada carpeta se copió a un proyecto limpio y se pasó por `check` y `render` (HyperFrames 0.9.9, `--fps 30 --crf 18 --workers 2`, GPU por hardware). Los diez renders terminaron con código 0. El lint no dio errores en ninguno. GSAP va local (`assets/lib/gsap.min.js`, el de `tools/lib/`) y las fuentes salen de `assets/fonts/` (Archivo Black y Sora para las escenas de prueba, Archivo Black para el muro de texto).

## Tabla

Costo: segundos de captura por cuadro en el clip de prueba de 4,4 s (132 cuadros; el muro, 4,8 s y 144 cuadros). Sin transición, el mismo clip da **0,065 s/cuadro** (0,058–0,069 en tres corridas). Cada valor es el rango de dos corridas. Las diferencias menores de 0,02 son ruido: otro proceso usaba la PC.

| Carpeta | Qué hace | Duración probada | Costo (s/cuadro) | Cómo se monta | Avisos |
|---|---|---|---|---|---|
| `whip-pan-cut` | Barrido lateral rápido: A sale y B entra a la misma velocidad, con desenfoque de movimiento y una línea de color en la unión. | 1,2 s (el barrido dura 0,55 s) | 0,09–0,10 | B. Componente con dos imágenes fijas, sobre el corte. | Contenido congelado durante la ventana. |
| `torn-paper-rip` | Un rasgado de papel con fibras cruza el cuadro de lado a lado; la hoja de A se levanta con sombra y deja ver B. | 1,2 s (el rasgado dura 1,0 s) | 0,105–0,11 (una corrida con la PC cargada dio 0,22) | B. Componente con dos plantillas de imagen. | El más caro: borde de 180 vértices y grano SVG en cada cuadro. Contenido congelado. |
| `empuje-vertical` | A sube y sale; B entra desde abajo, empujándola. | 0,55 s | 0,09 | A. Dos `tl.to/fromTo` sobre los hosts. | Sin rebote: con rebote final el fondo negro asoma por el borde. |
| `iris-circular` | B se abre como un círculo desde un punto del cuadro. | 0,6 s | 0,075–0,085 | A. Un `clipPath` animado sobre B. | Variante diamante en el comentario del ejemplo. Borde duro, sin aro. |
| `grid-pixelate-wipe` | Una cuadrícula de 9×16 cuadros negros crece desde el centro, tapa A, y se deshace desde los bordes dejando B. | 1,6 s | 0,08 | C. Fragmento pegado en la raíz y un `fromTo` con `stagger`. | 144 elementos. El cambio de escena cae con la cuadrícula a medio cubrir. |
| `hw-scribble-transition` | Doce bandas de garabato amarillo cubren el cuadro, se rellena de color sólido, y se deshacen al revés. | 2,2 s (corte oculto entre 0,9 y 1,4 s del bloque) | 0,09–0,12 | C. Bloque montado sobre el corte; A termina y B empieza dentro del sólido. | El amarillo es `--hw-accent` (`#ffb020`). |
| `mk-clone-wall-transition` | La escena A se encoge a una tarjeta sobre un muro de la palabra repetida; el muro se invierte de blanco a negro y se desvanece sobre B. | 2,4 s (el muro cubre de 0,6 a 1,9 s del bloque) | 0,09–0,10 | C. Bloque sobre el corte, con una imagen fija de A para la tarjeta. | Cambié la palabra del bloque («HyperFrames») por «AHORA». `check` da 24 errores `text_occluded` del propio muro bajo la tarjeta; el render sale bien. |
| `glitch` | Glitch digital: líneas desplazadas, bloques que se barajan, canales RGB separados, parpadeo y posterizado. | 1,0 s | 0,10–0,11 | B. Subcomposición de shader con dos imágenes fijas. | WebGL. Contenido congelado. |
| `swirl-vortex` | Las dos escenas se retuercen en espiral en sentidos opuestos, con una torsión que sigue un ruido orgánico. | 1,0 s | 0,105–0,11 | B. Igual que `glitch`. | WebGL. El torbellino se estira en vertical porque el shader no corrige la proporción. |
| `light-leak` | Lavado de luz cálida que cruza el cuadro: A se sobreexpone y se aclara hasta B. | 1,0 s | 0,09 | B. Igual que `glitch`. | WebGL. Mezcla A y B a la vez, así que se parece más a un fundido con luz que a un corte. |

**Familias de montaje** (las tres se probaron):

- **A. Receta sobre los hosts.** Las dos escenas son subcomposiciones vivas montadas con `data-composition-src` en `#hostA` y `#hostB`; el `index.html` anima esos `div` con GSAP. B tiene que empezar (`data-start`) en el instante del corte y A terminar unos cuadros después. Funciona con escenas animadas y sin congelar nada.
- **B. Componente o shader con imágenes fijas.** La transición es una subcomposición montada sobre el corte; A y B llegan como dos PNG. A vive hasta el inicio de la ventana y B arranca al terminar. Durante la ventana el contenido está congelado: sirve para escenas que ya están quietas en ese momento. Las imágenes salen de `hyperframes snapshot` (ver abajo).
- **C. Overlay.** Un bloque o fragmento que tapa el cuadro mientras las escenas cambian debajo. No congela nada.

## Cómo se monta, uno por uno

CSS que necesitan los hosts y el montaje (en el `<style>` del `index.html`):

```css
#hostA, #hostB, #montaje { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; }
#montaje { z-index: 9; container-type: size; overflow: hidden; }
```

Los hosts llevan `data-layout-allow-occlusion data-layout-allow-overlap`: sin eso `check` marca como error el texto de una escena tapado por la otra durante la transición.

### `whip-pan-cut` (B)

El componente se copió del registro fijado y se rellenaron sus dos ranuras con `<img src="assets/escA.png">` y `<img src="assets/escB.png">` (dentro de `[data-slot="before"]` y `[data-slot="after"]`).

```html
<div id="hostA" … data-composition-src="compositions/escA.html" data-start="0" data-duration="1.5"></div>
<div id="montaje" class="clip" data-composition-id="whip-pan-cut"
     data-composition-src="compositions/components/whip-pan-cut.html"
     data-variable-values='{"direction":"left","whip_at":0.25,"accent":"blue"}'
     data-start="1.5" data-duration="1.2" data-track-index="3" data-width="1080" data-height="1920"></div>
<div id="hostB" … data-composition-src="compositions/escB.html" data-start="2.7" data-duration="1.7"></div>
```

La ventana tiene que medir lo mismo que el `data-duration` de la raíz del componente (1,2 s). Con una ventana más larga el componente se apaga a los 1,2 s y queda el fondo oscuro del componente: lo comprobé con 3,6 s. Para otra duración (el README del registro dice de 0,6 a 3 s), cambia ese valor y el del `.clip` interno.

### `torn-paper-rip` (B)

Mismo montaje, con `data-composition-id="torn-paper-rip"`, ventana de 1,2 s y variables `{"direction":"left-to-right","tone":"cream","roughness":55}`. Las dos caras van en plantillas inertes a nivel del documento, fuera de la raíz:

```html
<template data-slot="torn-paper-rip-from"><img src="assets/escA.png" alt="" /></template>
<template data-slot="torn-paper-rip-to"><img src="assets/escB.png" alt="" /></template>
```

### `empuje-vertical` (A)

`hostA` dura hasta 2,15 s y `hostB` empieza en 1,6 s.

```js
var T = 1.6;
tl.to('#hostA', { y: -1920, duration: 0.55, ease: 'power3.inOut' }, T);
tl.fromTo('#hostB', { y: 1920 }, { y: 0, duration: 0.55, ease: 'power3.inOut' }, T);
```

### `iris-circular` (A)

`hostA` hasta 2,22 s, `hostB` desde 1,6 s.

```js
tl.fromTo('#hostB', { clipPath: 'circle(0% at 50% 55%)' }, { clipPath: 'circle(80% at 50% 55%)', duration: 0.6, ease: 'power2.out' }, T);
tl.set('#hostB', { clipPath: 'none' }, T + 0.62);
```

### `grid-pixelate-wipe` (C)

El fragmento del registro se pega dentro de `#root`, después de los hosts (con `COLS = 9` y `ROWS = 16`). `hostA` hasta 2,2 s y `hostB` desde 2,2 s.

```js
tl.fromTo('#grid-pixelate-overlay .grid-cell', { scale: 0 }, { scale: 1.06, duration: 0.5, stagger: { amount: 0.5, from: 'center' }, ease: 'power2.inOut' }, T);
tl.to('#grid-pixelate-overlay .grid-cell', { scale: 0, duration: 0.5, stagger: { amount: 0.5, from: 'edges' }, ease: 'power2.inOut' }, T + 0.6);
```

`scale: 1.06` evita las costuras claras entre cuadros; con 1,02 se veían hilos.

### `hw-scribble-transition` (C)

```html
<div id="hostA" … data-start="0" data-duration="1.9"></div>
<div id="hostB" … data-start="1.9" data-duration="2.5"></div>
<div id="montaje" data-composition-id="hw-scribble-transition"
     data-composition-src="compositions/hw-scribble-transition.html"
     data-start="0.8" data-duration="2.2" data-track-index="3" data-width="1080" data-height="1920"></div>
```

El cambio de escena cae en el instante 1,1 s del bloque (1,9 s absolutos), dentro del tramo en que el sólido lo tapa todo.

### `mk-clone-wall-transition` (C)

Igual, con `data-composition-id="mk-clone-wall-transition"`, ventana de 2,4 s desde 0,8 s; `hostA` hasta 2,0 s y `hostB` desde 2,0 s. La tarjeta que se encoge usa `assets/escA.png` (`CONFIG.card.src` del bloque): sustitúyela por una imagen fija de tu escena A. La palabra se cambia en `CONFIG.word`.

### `glitch`, `swirl-vortex`, `light-leak` (B)

```html
<div id="hostA" … data-start="0" data-duration="1.4"></div>
<div id="montaje" class="clip" data-composition-id="sh-glitch"
     data-composition-src="compositions/sh-glitch.html"
     data-variable-values='{"desde":"assets/escA.png","hasta":"assets/escB.png","duracion":1.0}'
     data-start="1.4" data-duration="1.0" data-track-index="3" data-width="1080" data-height="1920"></div>
<div id="hostB" … data-start="2.4" data-duration="2.0"></div>
```

`duracion` (0,3 a 3 s) y el `data-duration` del montaje tienen que valer lo mismo. La curva es `power2.inOut`.

## Imágenes fijas para la familia B

Con el proyecto armado, sácalas del propio video en el instante en que A deja de moverse y en el que B ya está asentada:

```bash
node HF snapshot --at 1.35,2.5 --no-end --keep -o assets/stills
# deja assets/stills/at-1.35s.png y at-2.5s.png, de 1080×1920
```

(`HF` es la ruta a `hyperframes.mjs` de la 0.9.9; con `npx hyperframes` tarda 20–40 s por llamada.) Si la escena B sigue animándose cuando termina la ventana, se nota el salto de la imagen fija a B viva: toma la imagen de B en el instante exacto en que acabará la transición.

`_herramientas/generar-shader.py` convierte cualquier otro bloque de shader del registro en una subcomposición como las tres de aquí.

## Cambios respecto al registro

| Elemento | Cambios |
|---|---|
| `whip-pan-cut`, `torn-paper-rip` | Quité la línea `<script src="https://cdn.jsdelivr.net/…/gsap.min.js">` (GSAP lo trae el `index.html`). En `whip-pan-cut` rellené las dos ranuras con `<img>`; el resto es el archivo del registro. |
| `grid-pixelate-wipe` | `COLS`/`ROWS` de 16×9 a 9×16. Quité `transform: scale(0)` del CSS de `.grid-cell` (el lint lo marcaba como `gsap_css_transform_conflict`): el `scale: 0` inicial lo pone el `fromTo`. |
| `hw-scribble-transition` | Sin la línea de GSAP por CDN; 1920×1080 pasa a 1080×1920 (raíz, `viewBox`, `W`/`H`); `bands` de 7 a 12 y `zigs` de 7 a 5 para que las bandas llenen el alto. |
| `mk-clone-wall-transition` | Sin la línea de GSAP por CDN; 1080×1920 como arriba; `word` de «HyperFrames» a «AHORA»; `fontSize` de 240 a 230; `card.src` apunta a `assets/escA.png` y la tarjeta se encoge a 540×520 en el centro; la fuente `--mk-font` pasa de Inter a Archivo Black con su `@font-face` local. |
| `glitch`, `swirl-vortex`, `light-leak` | Los bloques del registro son demostraciones de 1920×1080 con un panel azul, un lienzo de 1200×1080 y una captura del DOM que solo pinta colores de fondo y texto de una línea. Tomé tal cual el tramo con los shaders (`var vertSrc … programas`) y lo envolví con texturas de dos imágenes fijas, un lienzo de 1080×1920 y una curva `power2.inOut`. |
| `empuje-vertical`, `iris-circular` | Recetas sacadas de las galerías `transitions-push` («Vertical Push») y `transitions-radial` («Circle Iris» y «Diamond Iris»), con 1920 de alto en vez de 1080 y sin la barra de información de la galería. |

## Se probó y no entró

- `iris-reveal` (componente): al montarse hace un fundido de entrada desde oscuro de 0,32 s (`STAGE_IN`), así que sobre un corte parpadea a negro. Con `register: color` además apaga A. Lo cambié por el iris de la galería.
- `transitions-scale`, «Zoom Through»: funciona, pero B llega como una tarjeta más chica con los bordes a la vista y se ve de aficionado.
- `transitions-mechanical`, «Clock Wipe»: el polígono en cuatro pasos deja una arista quebrada y avanza a ritmo desigual en un cuadro vertical.
- `transitions-mechanical`, «Shutter»: funciona y se ve limpio (dos persianas con filo ámbar, 0,6 s), pero es la receta más sencilla y la dejé fuera por el tope de diez.
- `transitions-light`, «Light Leak» (superposiciones de degradado): muy tenue y con el corte brusco; lo sustituye el shader `light-leak`.
- Elastic Push de `transitions-push`: el rebote destapa el fondo negro de la raíz por un lado.
- Shaders `cinematic-zoom`, `thermal-distortion`, `chromatic-radial-split` y `ripple-waves`: en los instantes que miré se ven como un fundido cruzado con un poco de franja de color u ondas; no aportan sobre `light-leak`. `gravitational-lens` funciona y es espectacular (anillos de color alrededor de un pozo oscuro), pero al principio deja una mancha negra sobre A; no lo incluí, el generador lo produce si lo quieres.

**No probé:** los shaders `cross-warp-morph`, `domain-warp-dissolve`, `flash-through-white`, `ridged-burn`, `sdf-iris` y `whip-pan` (el shader); las galerías `transitions-3d`, `-blur`, `-cover`, `-destruction`, `-dissolve`, `-distortion`, `-grid` y `-other`, de las que solo leí el código; los componentes `directional-wipe` (una tarjeta fija de 760×428, no una transición entre escenas), `zoom-through-transition` y `match-cut` (con rótulos y sin ranuras), `paper-collage-reveal` (empieza con el papel ya cubriendo el cuadro), `ink-bleed-reveal`, `slit-scan-reveal` (revelan una marca) y `shutter-slam` (un efecto de texto): solo leí su código, no los rendericé. Tampoco probé el render por software (`--no-browser-gpu`) ni ninguna transición sobre video real: solo sobre las escenas de prueba, de color liso y texto.

## Avisos generales

- **WebGL, no WebGPU.** Los tres shaders piden un contexto `webgl`; en esta PC corrieron con la GPU por hardware.
- **`check` y las transiciones.** Mientras dos escenas con texto se cruzan, `check` marca `text_occluded` y `content_overlap`. Con `data-layout-allow-occlusion data-layout-allow-overlap` en los hosts desaparecen los errores (quedan como avisos). El muro de texto sigue dando sus 24 errores propios.
- **Sin salto en la familia B.** La imagen fija de A tiene que ser igual al último cuadro de A antes de la ventana. Con escenas de color liso y texto quieto lo es; con escenas animadas, toma la imagen justo en el instante del corte.
- **Fuentes.** Las escenas de prueba usan Archivo Black y Sora; copia `ArchivoBlack-400.woff2` y `Sora-Variable.ttf` desde `assets/fonts/` de Claqueta a `assets/fonts/` del proyecto.
- **Ids sin dígito inicial** y únicos en la página (por ejemplo `sh-glitch`); todos los de aquí ya lo cumplen.
