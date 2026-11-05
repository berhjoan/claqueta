# Estilos de subtítulos del registro de HyperFrames, probados en vertical (1080×1920)

Seis estilos `caption-*` que se adaptaron, se montaron y se renderizaron aquí con una frase en español: «¿Cuánto cuesta? ¡Más de lo que piensas, señor Núñez! Mañana te cuento más, ¿vale?», con una palabra cada 0,35 s y 0,2 s de pausa tras cada signo de puntuación. Salen de `heygen-com/hyperframes`, commit `fa1942d5ac0f0894f2b374c2d0d3a026071e221e` (Apache-2.0, copia en `LICENSE-Apache-2.0-hyperframes.txt`).

**Qué hay en cada carpeta:** `compositions/caption-<estilo>.html` (el estilo, ya adaptado) e `index-ejemplo.html` (el montaje que funcionó; se copia como `index.html`). En `_prueba/` están el fondo de prueba (`compositions/fondo-prueba.html`) y `palabras-prueba.json`. Para probar uno: copia `_prueba/`, la carpeta del estilo, y `index-ejemplo.html` como `index.html` a un proyecto con `assets/lib/gsap.min.js` (el de `tools/lib/`) y las fuentes de abajo en `assets/fonts/`.

**Prueba hecha:** cada carpeta se copió a un proyecto limpio y se pasó por `check` y `render` (HyperFrames 0.9.9, `--fps 30 --crf 18 --workers 2`, GPU por hardware, clip de 7,05 s con 210 cuadros). Los seis renders terminaron con código 0, sin errores de lint ni de layout. Los avisos de layout que quedan (`container_overflow`, `panel_out_of_canvas`) vienen del círculo del fondo de prueba, no de los subtítulos.

## Tabla

Costo: segundos de captura por cuadro en el clip de 7,05 s. El mismo clip con solo el fondo da **0,07 s/cuadro**; las diferencias menores de 0,02 son ruido (otro proceso usaba la PC).

| Carpeta | Qué hace | Cómo se alimenta | Costo (s/cuadro) | Avisos |
|---|---|---|---|---|
| `pill-karaoke` | Grupos de hasta 4 palabras en minúsculas dentro de una píldora gris clara; la palabra que suena pasa de gris a casi negro. | Palabras con `inicio` y `fin`; corta grupo en puntuación o pausa ≥ 0,1 s o a las 4 palabras o a las 2 líneas. | 0,065 | Las palabras que aún no suenan quedan gris sobre gris (contraste de unos 2:1, `check` da 3 avisos). Pasa a minúsculas el texto: «Núñez» sale «núñez». |
| `weight-shift` | Tipografía sola, sin caja: dos líneas en minúsculas; la línea que suena va en negrita y la otra en peso ligero, y el peso pasa de una a otra cuando suena la primera palabra de la segunda línea. | Igual que `pill-karaoke`. | 0,06 | Sin fondo propio: el texto blanco necesita una escena oscura. |
| `highlight` | Palabra por palabra, en mayúsculas blancas; la que suena se enciende con una caja roja que entra de izquierda a derecha. | Grupos de hasta 3 palabras o 20 letras; corta en puntuación o pausa ≥ 0,28 s. | 0,08 | Rojo `#ff1745` fijo en el CSS (`.hl-word-bg`). El lint avisa `negative_z_index` (viene del original). |
| `kinetic-slam` | Una palabra a la vez, enorme, en mayúsculas condensadas; entra de arriba, de un lado, del otro o con zoom, y se va al terminar. Las palabras de 8 letras o más, o que cierran con `!` o `?`, van en amarillo. | Palabra a palabra: usa `inicio` y `fin` de cada una. | 0,075 (una repetición dio 0,10) | Una palabra muy larga se reduce hasta 67 px. La regla del amarillo (`window.__cq.claves`) sustituyó la lista de índices fija del original. |
| `glitch-rgb` | Grupos en mayúsculas; cada palabra entra con las franjas roja y cian separadas, que vuelven a juntarse en menos de 0,24 s. Las palabras largas o con cifras repiten el golpe. | Grupos de hasta 4 palabras o 21 letras (el agrupado del propio componente). | 0,075 | Lleva un oscurecido y líneas de barrido: los dejé solo sobre la banda (y 1240–1600). Mayúsculas. |
| `neon-glow` | Grupos en mayúsculas de neón: todas las palabras en cian apagado y la que suena se enciende con halo; las clave, en rosa. | Grupos de hasta 3 palabras o 18 letras; corta en puntuación o pausa ≥ 0,28 s. | 0,075 | Las palabras que aún no suenan están al 14 % de opacidad: casi no se leen (`check` da 9 avisos de contraste). Pide fondo oscuro. |

Caja real del texto en el render, medida contra el fondo sin subtítulos (la banda permitida es y 1300–1540 y x 72–1008):

| Estilo | y | x |
|---|---|---|
| `pill-karaoke` | 1316–1523 | 124–954 |
| `weight-shift` | 1345–1498 | 320–759 |
| `highlight` | 1368–1481 | 92–985 |
| `kinetic-slam` | 1306–1509 | 116–893 |
| `glitch-rgb` | 1372–1470 | 84–989 |
| `neon-glow` | 1345–1487 | 82–998 |

El tamaño mínimo de letra está forzado a 44 px en `fitFontSize` (`pill-karaoke` ya traía 52 px). Por el ancho de las letras y los límites de grupo de arriba, calculo que el texto no baja de unos 55 px; no lo medí en el DOM.

## Cómo se alimentan los tiempos de palabra

Los componentes del registro traen la frase de demostración fija dentro del script. Aquí cada estilo lee `window.PALABRAS`, que es el `palabras.json` que sale de `tools/subtitulos/alinear.py` (`[{"palabra":"¿Cuánto","inicio":0.3,"fin":0.6}, …]`). También acepta `{text,start,end}` y `{word,start,end}`. Se pega en el `index.html` en un script suelto, antes del cuerpo:

```html
<script>
  window.PALABRAS = [ {"palabra":"¿Cuánto","inicio":0.3,"fin":0.6}, {"palabra":"cuesta?","inicio":0.65,"fin":0.95}, … ];
</script>
…
<div id="subs" data-composition-id="caption-pill-karaoke"
     data-composition-src="compositions/caption-pill-karaoke.html"
     data-start="0" data-duration="7.05" data-track-index="5" data-width="1080" data-height="1920"></div>
```

```css
#subs { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 20; }
```

- **Duración del host:** el `data-duration` del montaje tiene que cubrir el `fin` de la última palabra más 0,7 s (con las palabras de prueba, 6,35 + 0,7 = 7,05 s). `pill-karaoke` y `weight-shift` mantienen en pantalla el último grupo hasta el final de esa duración.
- **Si no hay `window.PALABRAS`,** cada estilo usa la frase de prueba, en español (las palabras de demostración en inglés del original se cambiaron).
- **Los tiempos de `fin`** deben ser los de la voz, no los del archivo (los motores dejan hasta 0,94 s de silencio al final).
- **Sincronía:** cada palabra se enciende en su `inicio` (en `pill-karaoke`, 0,05 s antes). Un grupo aparece al empezar su primera palabra y se retira entre 0,24 y 0,5 s después de la última (antes, si empieza el siguiente); `pill-karaoke` lo retira 0,3 s después y `weight-shift` lo deja hasta que entra el siguiente grupo.

## Fuentes

Copia a `assets/fonts/` del proyecto desde `assets/fonts/` de Claqueta: `Sora-Variable.ttf` (`pill-karaoke`, `weight-shift`, `highlight`), `Archivo-Variable.woff2` (`glitch-rgb`, `neon-glow`) y `Anton-400.woff2` (`kinetic-slam`). Las escenas de prueba usan además `ArchivoBlack-400.woff2`. Sin la fuente, la caja se mide con la de reserva y el texto se sale de la banda.

## Cambios respecto al registro (iguales en los seis)

- 1920×1080 pasa a 1080×1920; la banda de texto pasa a y 1300–1540 (la píldora, 1310–1530) y el ancho útil a 936 px (margen de 72 px).
- Quité `<link>` de Google Fonts y el `<script>` de GSAP por CDN. Las fuentes son locales (`@font-face` en el propio archivo): Poppins, Montserrat y Space Grotesk se sustituyen por Sora o Archivo, y Outfit por Archivo; Anton es la misma.
- El documento completo pasa al formato de subcomposición con `<template>` y raíz `#root` (como las escenas de Claqueta); fuera quedaron las reglas de `html, body`.
- La construcción espera a que carguen las fuentes (`document.fonts.load` + `window.__hf.buildReady`) antes de medir el texto, y el timeline se registra al final.
- El arreglo de palabras fijo se sustituye por `window.__cq.palabras(...)`; los índices fijos de grupos y de palabras clave, por agrupado automático (`window.__cq.pares/grupos`) y una regla de palabras clave (`window.__cq.claves`).
- El mínimo de `fitFontSize` pasa de 45 % del tamaño base a `max(44, 45 %)`.
- En `weight-shift` el ajuste de tamaño se calcula con el ancho de dos líneas (`MAX_LINE_WIDTH * 1.8`) y no el de una: sin eso el texto bajaba a unos 40 px.
- `highlight`: ancho de ajuste 816 px (descuenta el relleno de cada caja). `glitch-rgb`: 860 px. `neon-glow`: 840 px. Son los anchos útiles menos el espacio entre palabras.
- `kinetic-slam`: palabra centrada en y 1425, tamaño base 150 px (el original, 220 px a media pantalla) y entrada desde 40 px arriba en vez de 120.
- `glitch-rgb`: el oscurecido y las líneas de barrido, que cubrían todo el cuadro, quedan en la banda.

## Se probó y no entró

- `caption-clip-wipe` (palabras que aparecen con un barrido, las pronunciadas bajan al 40 % de blanco): se adaptó y renderizó bien, pero se parece a `weight-shift` y `pill-karaoke`; lo dejé fuera. Se adapta con el mismo código (usa `RAW_GROUPS` y `KEYWORDS` como `highlight`).
- `caption-editorial-emphasis`: tiene los bloques y las palabras de énfasis (180 px, serif cursiva) escritos a mano por índice, y el énfasis no cabe en una banda de 240 px. No lo adapté.

**No probé:** `caption-matrix-decode`, `caption-gradient-fill`, `caption-emoji-pop`, `caption-neon-accent`, `caption-particle-burst`, `caption-parallax-layers`, `caption-camera-follow`, `caption-blend-difference` y `caption-texture` (524 KB). Solo vi su estructura (casi todos con grupos de palabras fijos por índice). Tampoco probé estos seis sobre video real, solo sobre un fondo oscuro de color liso: sobre un fondo claro los textos blancos pierden contraste.
