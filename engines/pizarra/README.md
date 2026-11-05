# Motor de pizarra

Escritura a mano en tiza, con letra propia del español, dentro de una escena de HyperFrames. Probado en 0.8.150 y 0.9.9, en `check`, Studio y render: ir atrás y adelante da la misma imagen.

## Qué trae

| Archivo | Qué hace |
|---|---|
| `film.js` | **Tu película.** Duración, colores, líneas, trazos, borrador y cámara. Para una pieza normal, es lo único que editas |
| `board.js` | Dibuja un instante `t`. `montar(canvas)` devuelve `render(t)` |
| `chalk.js`, `r2d.js`, `lib.js` | El trazo, el depósito de tiza y el grano (lemo-opuscar, MIT) |
| `latin.js`, `glifos.js`, `ems-delight.js` | Escritura en español con EMS Delight (OFL), guardada como datos. Falla si falta una letra |
| `eventos.mjs` | Saca los eventos de sonido de la película, en Node y sin navegador |
| `ejemplo/` | Proyecto mínimo: `index.html`, `pizarra.html` y `capa.html` |

## Montarlo

Desde la carpeta que tiene a `.claqueta`. Si el encargo ya corrió `init` y estás dentro de `proyecto/`, salta las dos primeras líneas:

```bash
npx hyperframes@0.9.9 init proyecto --resolution portrait --non-interactive --skip-skills
cd proyecto
mkdir -p assets/pizarra assets/audio assets/fonts assets/lib compositions
cp ../.claqueta/engines/pizarra/*.js assets/pizarra/
cp ../.claqueta/tools/lib/gsap.min.js assets/lib/
cp ../.claqueta/engines/pizarra/ejemplo/index.html .
cp ../.claqueta/engines/pizarra/ejemplo/pizarra.html ../.claqueta/engines/pizarra/ejemplo/capa.html compositions/
cp ../.claqueta/assets/fonts/*.ttf assets/fonts/
cp ../.claqueta/library/marca/bg-system-ia/emblema.png assets/emblema.png
```

Las escenas importan `./assets/pizarra/board.js`, relativo a `index.html`. Con esto ya hay una película de muestra de 15 s: mírala con `snapshot --at` antes de cambiarla.

Cambia estas cuatro cosas:

1. `assets/pizarra/film.js`, tu película.
2. La duración, con `node ../.claqueta/engines/pizarra/fijar-duracion.mjs 9.9 --lema 7.85`. Cambia `DUR` en `film.js`, los `data-duration` de `index.html`, `pizarra.html` y `capa.html`, la constante `D` y el segundo en que entra la frase de cierre. Córrelo cada vez que cambie la duración.
3. `index.html` trae `assets/audio/mezcla.wav`. Mientras no exista, quita ese `<audio>` o `check` dará error.
4. `capa.html` trae el emblema y una frase de cierre en y 1352. Cámbialos, o quita esa escena de `index.html` si no van. Con subtítulos, la frase debe ir fuera de su banda o después del último. `check` avisa `line_unread` si queda menos de 2 s en pantalla: con un cierre corto, súbela de la banda y hazla entrar antes.

## Escribir tu película

`film.js` está por secciones, de la 1 a la 6:

```js
export const PALETA = { tinta: '#F7EBD3', acento: '#E9A93B', secundario: '#B8692E', pizarra: '#0B0806', pared: '#1A120A' };

linea(S, L, '¿Qué hace un', 430, 76, -.45, 1.6, { color: TINTA, seed: 1, press: 1.1 });
//           texto          y   cap  empieza dura
```

- Pon en `PALETA` los colores del encargo. La pared, la pizarra y las tizas de la bandeja salen de ahí.
- `y` es la línea base y `cap` la altura de letra. `cap` 76 da mayúsculas de 103 px y unos 13 caracteres en 888 px. Mide con `latinWidth(texto, cap)`.
- Lo pequeño pide más peso: con `cap` 60 la tiza ya se ve calada, y con 40 queda débil.
- Mano creíble: 0,08–0,13 s por trazo. `linea` reparte los trazos en `dur`; con `null` como duración usa la velocidad natural de la mano, y `.t1` de lo que devuelve dice cuándo termina. Por eso una frase larga no cabe: al mundo van palabras clave, y las frases van en los subtítulos.
- Un segundo de inicio negativo deja la línea escrita al abrir.
- `trazo(S, puntos, t0, t1, opciones)` dibuja subrayados, flechas, marcas o globos.
- El borrador es una lista: `wipes = [{ t0, t1, w, path }, ...]`. Una línea o un trazo con `borrador: 0` se va en la primera pasada, con `borrador: 1` en la segunda.
- `C` es la cámara: claves `[segundo, centro x, centro y, escala]`, siempre de frente. `curvaCamara` es la curva entre claves: cámbiala si el encargo pide otra. No escales el lienzo con CSS: se vería borroso.
- Varía el borrador de una pasada a otra: otra dirección, otro recorrido. Es la transición natural de este material.

## Comprobar antes de renderizar

```bash
node ../.claqueta/engines/pizarra/zonas.mjs assets/pizarra/film.js
```

Mide dónde queda la tinta en pantalla, con el grosor del trazo y la cámara aplicada, y avisa si sale de x 72–960 y de y 220–1280 o si la mano va muy apurada. Un acercamiento final también empuja el contenido: con escala 1,08 sobre el centro de la pantalla, una línea en y 1250 baja a y 1276. Solo cuenta lo ya escrito, con la cámara casi quieta y sin primer plano, es decir, con escala hasta 1,25. No sustituye a mirar los cuadros.

## Piezas largas

Una escena basta para piezas cortas. Para más de 30 s conviene partir: copia `pizarra.html` con otro `ID`, otro `INICIO` y otra duración, y añádela a `index.html` con su `data-start`. Dos escenas que dibujan la misma película se cortan con la cámara en movimiento sin salto medible, y comparten el horneado porque el módulo se evalúa una vez por página.

## Reloj y selectores

- El reloj es un tween proxy de GSAP: tiempo local, solo dibuja con la escena activa. Nunca `requestAnimationFrame` ni `Date`.
- Dentro de una escena no busques `#root` ni `[data-composition-id="tu-escena"]`: el primero da el `#root` de la página y el segundo, el host de `index.html`, que está fuera del `#root` de tu escena. Lo que crees ahí pierde las variables y la fuente de tu `#root`: sale en Times de 16 px y casi negro, y `check` puede no avisar. Pon en la plantilla un contenedor con id único, como `<div id="subs-caja"></div>`, y agrega con `document.getElementById("subs-caja")`. O escribe el HTML fijo en la plantilla y anima por id. Probado en 0.9.9.

## Sonido

La película también corre en Node, así que cada trazo suena en su tiempo exacto y cada pasada del borrador también:

```bash
node ../.claqueta/engines/pizarra/eventos.mjs assets/pizarra/film.js assets/audio/eventos.json
python ../.claqueta/tools/audio/tiza.py assets/audio/eventos.json --salida assets/audio/tiza.wav
```

Añade la tiza a `efectos.json` de `tools/audio/mezcla.py`:

```json
{"t": 0, "archivo": "assets/audio/tiza.wav", "ganancia": -2, "bajo_voz": -24}
```

`bajo_voz` hace falta: la tiza es ruido de banda ancha y tapa las palabras. En una prueba real, Whisper leía «cacha que» donde se dijo «cada chat» aun con la tiza 16 dB abajo, y leía bien con 24 dB. Así, mientras se habla, la tiza casi no se oye; el oído de una persona debe juzgar ese equilibrio. El sonido es sintético y no se ha validado de oído.

## Lo que verás en las revisiones

- `did not become render-ready within 3000ms` y `canvas_content_at_edge` no son errores: vienen del horneado y del grano de la pizarra. Hornear 74 trazos tarda unos 5 s por página. En un i5 sin GPU, 450 cuadros toman unos 1,5 min con 4 procesos.
- Con una sola escena, `snapshot --review` da cinco cuadros parejos y sin tiras de cortes. Usa `snapshot --at` con tus momentos clave.
- Con fondo `#0B0806` y poca tiza en pantalla, `blackdetect` marca cuadros negros que no lo son.

## Licencias

`chalk.js`, `r2d.js`, `lib.js` y `board.js` parten de lemo-opuscar (MIT, `LICENSE-lemo-opuscar.txt`). EMS Delight es OFL (`OFL-EMS.txt`). `latin.js`, `glifos.js` y `film.js` son de este proyecto.
