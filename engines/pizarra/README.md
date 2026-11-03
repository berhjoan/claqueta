# Motor de pizarra

Escritura a mano en tiza, con letra propia del español, dentro de una escena de HyperFrames. Probado en 0.8.150 y 0.9.9, en `check`, Studio y render: ir atrás y adelante da la misma imagen.

## Qué trae

| Archivo | Qué hace |
|---|---|
| `film.js` | **Lo único que editas.** Toda la película como datos: líneas, tiempos, borrador y cámara |
| `board.js` | Dibuja un instante `t`. `montar(canvas)` devuelve `render(t)` |
| `chalk.js`, `r2d.js`, `lib.js` | El trazo, el depósito de tiza y el grano (lemo-opuscar, MIT) |
| `latin.js`, `glifos.js`, `ems-delight.js` | Escritura en español con EMS Delight (OFL). Falla si falta una letra |
| `eventos.mjs` | Saca los eventos de sonido de la película, en Node y sin navegador |
| `ejemplo/` | Proyecto mínimo: `index.html` y tres composiciones |

## Montarlo en un proyecto de HyperFrames

```bash
npx hyperframes@0.9.9 init proyecto --resolution portrait --non-interactive --skip-skills
cd proyecto
mkdir -p assets/pizarra compositions
cp ../.claqueta/engines/pizarra/*.js assets/pizarra/
cp ../.claqueta/engines/pizarra/ejemplo/index.html .
cp ../.claqueta/engines/pizarra/ejemplo/pizarra-a.html ../.claqueta/engines/pizarra/ejemplo/pizarra-b.html ../.claqueta/engines/pizarra/ejemplo/capa.html compositions/
```

`.claqueta` queda al lado de `proyecto`. Las escenas importan `./assets/pizarra/board.js`, relativo a `index.html`.

El ejemplo trae dos detalles que debes cambiar: la pista de audio `assets/audio/mezcla.wav` de `index.html`, y el emblema y la frase de `capa.html`. Si no tienes emblema, borra esa imagen.

## Escribir tu película

Edita `build()` en `assets/pizarra/film.js`:

```js
export const W = 1080, H = 1920, DUR = 15, CORTE = 7.6;

L.push(linea(S, '¿Qué hace un', 430, 76, -.45, 1.6, { color: CREMA, seed: 1, bloque: 'pregunta', press: 1.1 }));
//              texto           y   cap  empieza dura
```

- `y` es la línea base, `cap` la altura de letra. `cap` 76 da mayúsculas de 103 px y unos 13 caracteres en 888 px.
- Lo pequeño pide más peso: con `cap` 60 la tiza ya se ve calada, y con 40 queda débil.
- Mano creíble: 0,08–0,13 s por trazo. La función `linea` reparte los trazos en `dur`.
- `{ wiped: true }` marca lo que el borrador se lleva. Define `wipe = { t0, t1, w, path }`.
- `C` es la cámara: tramos `[t, cx, cy, s]`, siempre de frente.
- Un `DUR` distinto debe coincidir con `data-duration` en `index.html` y en las escenas. `CORTE` es el segundo donde `pizarra-a` da paso a `pizarra-b`.

## Por qué dos escenas

Las dos dibujan la misma película y se cortan con la cámara en movimiento sin salto medible. Partir así acorta el horneado por página y sirve para piezas largas. Para una pieza corta basta con una sola.

## Reloj

- `hf-seek` entrega el tiempo global: filtra lo que quede fuera de la escena. Lo usa `pizarra-a`.
- Un tween proxy de GSAP entrega tiempo local y solo dibuja con la escena activa. Lo usa `pizarra-b`, y es el preferido.
- Nunca `requestAnimationFrame` ni `Date`.

## Sonido

La película también corre en Node, así que cada trazo suena en su tiempo exacto:

```bash
node ../.claqueta/engines/pizarra/eventos.mjs assets/pizarra/film.js assets/audio/eventos.json
python ../.claqueta/tools/audio/tiza.py assets/audio/eventos.json --salida assets/audio/tiza.wav
```

Luego añade la tiza a `efectos.json` para `tools/audio/mezcla.py`: `{"t": 0, "archivo": "assets/audio/tiza.wav", "ganancia": 0}`. El sonido es sintético y no se ha validado de oído: pide que alguien lo escuche.

## Lo que verás en `check`

`did not become render-ready within 3000ms` y `canvas_content_at_edge` no son errores: vienen del horneado y del grano de la pizarra. Hornear 74 trazos tarda unos 5 s por página. En un i5 sin GPU, 450 cuadros toman unos 1,5 min con 4 procesos.

## Licencias

`chalk.js`, `r2d.js`, `lib.js` y `board.js` parten de lemo-opuscar (MIT, `LICENSE-lemo-opuscar.txt`). EMS Delight es OFL (`OFL-EMS.txt`). `latin.js`, `glifos.js` y `film.js` son de este proyecto.
