# Plantillas de estilo

Una plantilla es la prueba de que un estilo funciona: una escena vertical de código (1080×1920, 4 s), ya renderizada y mirada, que cualquier IA monta con sus textos y sus colores. El contrato exacto está en [`FORMATO.md`](FORMATO.md); aquí va qué hay y cómo se usa.

Cada carpeta trae tres archivos: `escena.html` (la escena), `ficha.json` (variables, paleta, fuentes, rasgos, sonidos y estado «probado») y `muestra.jpg` (un cuadro real del render, 540×960). La miniatura en los colores propios del estilo está en `assets/thumbs/propias/<id>.webp`, con el tamaño de la del catálogo.

## Qué hay

Entre paréntesis, el largo máximo de cada texto: con ese largo se probó que nada se corta. `probar.mjs` y la prueba `tests/plantillas.test.mjs` vigilan que siga así.

| Plantilla | Estilo | Textos (máx.) | Fuentes | Qué trae |
|---|---|---|---|---|
| `S04` | Resplandor neón | `linea1` (12), `linea2` (12), `rotulo` (14), `lema` (30) | Sora | Túnel de marcos de neón en canvas que avanza y frena; título por máscara con resplandor que no se recorta; cartel que se enciende con dos parpadeos |
| `S06` | Cristal esmerilado | `etiqueta` (14), `titulo` (22), `subtitulo` (30), `ficha1` (11), `ficha2` (11) | Sora | Tarjeta de vidrio con `backdrop-filter`, entrada con desfase de 0,12 s, 24 px y escala 0,96→1, manchas lentas, tres volúmenes de cristal y un brillo que cruza una vez |
| `S10` | Arte ASCII | `barra` (18), `linea1`–`linea3` (28), `titulo` (8) | JetBrains Mono | Ventana de terminal con líneas a pasos, título en arte ASCII hecho con una tipografía de 5×7 puntos propia, lluvia de caracteres al fondo, barra de carga en texto |
| `S12` | Cómic | `onomatopeya` (6), `globo` (22), `caja` (20) | Archivo Black, Archivo | Explosión con golpe 0,9→1,05→1 y temblor de cuatro cuadros, líneas de acción, trama de puntos, globo y cartela |
| `S14` | Retro VHS | `osd` (12), `canal` (8), `titulo` (12), `subtitulo` (16) | Archivo Black, VT323 | Texto de pantalla a pasos, título con RGB que se recompone en cinco cuadros y se ajusta a su palabra más larga, banda de tracking, barras de color |
| `S16` | Bauhaus geométrico | `titulo` (15), `palabra1`–`palabra4` (9) | Archivo Black | Retícula, piezas grandes que llenan el mundo, módulos que giran 90° y palabras que suben por máscara |
| `S17` | Pixel art | `titulo` (7), `subtitulo` (16), `etiqueta` (8) | ninguna | Lienzo de 108×192 escalado ×10 sin suavizado, tipografía de píxeles propia con contorno, héroe, moneda, arbustos y marcador |
| `S18` | Plano técnico | `ancho` (10), `alto` (10), `etiqueta1` (18), `etiqueta2` (18), `rotulo` (12) | JetBrains Mono | Contornos que se trazan en 1,2 s, cotas, regla con cabezal y reloj, cajetín, dos engranajes de 20 y 12 dientes que engranan de verdad |
| `S20` | Neobrutalismo | `boton` (12), `titulo` (24), `chip1`–`chip3` (8), `archivo` (22) | Archivo Black, JetBrains Mono | Bloques con borde y sombra dura, entrada con giro de 2°, botón que se hunde hasta su sombra, barra de progreso hasta 100 % |
| `S21` | Editorial minimalista | `etiqueta` (14), `titulo` (22), `linea1`–`linea3` (26), `dato` (30) | Fraunces, JetBrains Mono, Source Sans 3 | Retícula clara, título por máscara en 0,6 s, líneas a máquina, un solo acento |
| `S27` | HUD de ciencia ficción | `rotulo` (16), `dato1`–`dato3` (12), `nivel` (16) | JetBrains Mono | Anillos que giran con `svgOrigin` y frenan, barrido, tres datos con verificación, medidor, celdas y señal de fondo |
| `S28` | Glitch digital | `titulo` (12), `subtitulo` (20), `tachado` (12) | Sora | RGB separado que se recupera en cinco cuadros, bandas de inversión con semilla fija, palabra tachada con trazo dibujado |
| `S29` | Synthwave | `titulo` (10), `subtitulo` (26) | Archivo Black, Sora | Sol segmentado con máscara, montañas, rejilla en perspectiva en canvas, ecualizador sintético, título cromado |
| `S30` | Película analógica | `titulo` (18), `subtitulo` (24) | Fraunces, Source Sans 3, JetBrains Mono | Tira con perforaciones que avanza cuadro a cuadro, grano propio, rayones, fuga de luz y vaivén de ventanilla, tarjeta de título |
| `S40` | Pizarra | `titulo` (18), `nota1`–`nota3` (16), `conclusion` (16) | Fraunces, Josefin Sans | Texto de tiza con grano (filtro SVG), escritura con borde suave, subrayado y marco que se dibujan, bandeja con tizas. **La pizarra completa, con letra a mano trazo a trazo, está en `engines/pizarra/`**; esta plantilla es la versión corta con tipografía del sistema |
| `rafaga` | Plano de ráfaga | `lista`, `paradas`, `cadencia`, `pausa`, `mosaico`, `etiqueta`, `carpeta` | Sora, JetBrains Mono | Mosaico de miniaturas reales con contador y volteo a la cadencia pedida, con una barra de avance y paradas que nombran el estilo. Ver más abajo |
| `transicion-glitch` | Transición | `semilla`, `cuadros` | ninguna | Seis cuadros de bandas con `mix-blend-mode: difference`, con semilla fija. Ver más abajo |

Todas son propias, con licencia MIT. Las fuentes son las de `assets/fonts/fuentes.json` (OFL).

## Cómo montar una plantilla en una pieza

1. **Fuentes.** La escena nombra las familias y no las trae. Copia a tu proyecto las que dice su `ficha.json` y escribe su CSS. `python ../.claqueta/tools/medios/fuentes.py <par>` sirve si todas las familias son de un mismo par; si no (S14 mezcla Archivo Black y VT323), usa este fragmento con las de tu lista:

   ```bash
   python - <<'PY'
   import json, shutil
   from pathlib import Path
   origen = Path("../.claqueta/assets/fonts")
   cat = json.loads((origen / "fuentes.json").read_text(encoding="utf-8"))["familias"]
   usar = ["Archivo Black", "VT323"]
   destino = Path("assets/fonts"); destino.mkdir(parents=True, exist_ok=True)
   css = []
   for f in usar:
       for a in cat[f]["archivos"]:
           shutil.copy2(origen / a["archivo"], destino / a["archivo"])
           formato = "woff2" if a["archivo"].endswith(".woff2") else "truetype"
           css.append(f'@font-face {{ font-family: "{f}"; src: url("{a["archivo"]}") format("{formato}"); font-weight: {a["pesos"]}; font-style: normal; font-display: block; }}')
       shutil.copy2(origen / cat[f]["licencia"], destino / cat[f]["licencia"])
   (destino / "fuentes.css").write_text("\n".join(css) + "\n", encoding="utf-8")
   PY
   ```

   En `index.html`: `<link rel="stylesheet" href="assets/fonts/fuentes.css">`. GSAP también va local (`assets/lib/gsap.min.js`, copia de `../.claqueta/tools/lib/gsap.min.js`).
2. **La escena.** Copia `escena.html` a `compositions/<id>.html`.
3. **El anfitrión**, en `index.html`. Su `data-composition-id` es el de la plantilla:

   ```html
   <div id="el-S16" data-composition-id="S16" data-composition-src="compositions/S16.html"
        data-variable-values='{"titulo":"Mi título","palabra1":"uno","palabra2":"dos"}'
        style="--fondo:#101820; --tinta:#F5F5F5; --acento:#FEE715; --display:'Anton'"
        data-start="12" data-duration="4" data-track-index="3" data-track-kind="graphics"
        data-width="1080" data-height="1920"></div>
   ```

   - **Textos:** `data-variable-values` es un objeto por id; lo que no pongas queda con su valor por defecto. Respeta el máximo de la ficha.
   - **Colores:** `--fondo`, `--tinta`, `--acento`, `--segundo` y `--superficie` en el `style` del anfitrión. Sin ellos se ve con la paleta del estilo. El amarillo de Bauhaus, los tres colores de los chips de neobrutalismo, el naranja de una mancha de S06 y los colores del héroe de S17 son material y quedan fijos.
   - **Fuentes:** `--display`, `--cuerpo` y `--datos` con el nombre de una familia del sistema entre comillas simples (probado con `--display:'Anton'`).
4. **Duración.** Todo lo que se mueve termina antes de 3,2 s y la escena se sostiene en su estado final. Móntala 4 s o más; si la dejas más larga, queda quieta como un póster.
5. **Transiciones.** La plantilla no trae barridos: los pone quien la monta. Un barrido entre dos plantillas se hace desde la línea de tiempo principal, moviendo los anfitriones con la misma curva (probado):

   ```js
   tl.fromTo("#el-S16", { x: 0 }, { x: -1080, duration: 0.25, ease: "power3.inOut" }, 3.75);
   tl.fromTo("#el-S06", { x: 1080 }, { x: 0, duration: 0.25, ease: "power3.inOut" }, 3.75);
   ```

   Los dos anfitriones se solapan 0,25 s (el segundo empieza en 3,75). Una sub-composición no alcanza a sus anfitriones: el movimiento va en el `index.html`.
6. **Una vez por video.** Los ids llevan el prefijo de la plantilla (`pl-s16-…`): varias plantillas distintas conviven, pero dos copias de la misma en un mismo video chocarían. Para repetir una, copia el archivo y cambia el prefijo.

Además de probar cada una sola, se montaron las 17 una tras otra en un mismo proyecto de 68 s: `check` sin ningún hallazgo en lint, ejecución ni composición. Esa prueba conjunta destapó cosas que la individual no ve (ver «Lo aprendido»).

## Ráfaga

`rafaga` voltea miniaturas reales del catálogo. **Con el kit de escenas no hay que hacer nada de esto:** `{"tipo": "plantilla", "estilo": "rafaga", "paradas": ["S40", "S04"], "cadencia": 2}` calcula cuántas caben en el plano, prefiere las miniaturas en sus colores y las copia. Acepta también `"lista"`, `"pausa"`, `"etiqueta"` y `"mosaico"` (`true`, `false` o una lista de ids).

A mano se monta como cualquier plantilla, pero necesita las miniaturas y se alarga con su lista.

1. **Miniaturas:** copia a tu proyecto `assets/thumbs/` del sistema (103 archivos, unos 1,4 MB): `cp -r ../.claqueta/assets/thumbs assets/thumbs`. Si solo usas unas pocas, copia esas y pon `mosaico` en `no` o en una lista. Con la variable `carpeta` cambias dónde las busca.
2. **Variables** (todas son texto):

   | Variable | Qué es | Por defecto |
   |---|---|---|
   | `lista` | Ids del catálogo en orden, separados por coma (`S40,L-whiteboard,S04`). Un id que no existe se ignora | 12 estilos |
   | `paradas` | Ids de la lista donde se detiene y muestra su nombre y su familia | `S40,S04` |
   | `cadencia` | Cuadros que dura cada miniatura, a 30 por segundo | `2` |
   | `pausa` | Segundos que dura una parada | `0.5` |
   | `mosaico` | `todo` (las 103), `no`, o una lista de ids | `todo` |
   | `etiqueta` | Palabra bajo el contador del mosaico | `estilos` |
   | `carpeta` | Carpeta de las miniaturas | `assets/thumbs` |

3. **Duración.** Lo calcula la lista y la fijas tú en el anfitrión:

   ```
   total = 1,3 s de mosaico (0 si mosaico = no)
         + miniaturas sin parada × cadencia / 30
         + paradas × pausa
   ```

   El valor por defecto da 2,97 s. Con 35 miniaturas, `cadencia` 3 y 3 paradas de 0,6 s dan 6,3 s: monta el anfitrión con `data-duration="6.5"`. Si lo dejas más corto, la baraja se corta; si más largo, se queda en la última miniatura.
4. Los nombres y familias salen de un catálogo embebido (`#pl-rafaga-catalogo`, 103 ids). Si el catálogo crece, regenéralo desde `data/styles.json`.
5. Cada miniatura entra con `object-fit: contain`: las verticales (300×366) y las apaisadas (534×300) se ven completas dentro de la misma tarjeta.

## Transición glitch

`transicion-glitch` es la receta S28 hecha transición: seis cuadros (0,2 s) de bandas que invierten lo que hay debajo. No tiene fondo propio y no mueve nada.

```html
<div id="el-glitch" data-composition-id="transicion-glitch" data-composition-src="compositions/transicion-glitch.html"
     data-variable-values='{"semilla":"21","cuadros":"6"}'
     data-start="3.72" data-duration="0.3" data-track-index="9" data-track-kind="graphics"
     data-width="1080" data-height="1920"></div>
```

- Ponla en una pista **encima** de las escenas, centrada en el corte (aquí el corte está en 3,75 s).
- **Los anfitriones no llevan `z-index`.** Cada `z-index` crea un contexto de apilamiento propio y la mezcla `difference` deja de ver lo de abajo. El orden lo dan el DOM y `data-track-index`.
- La `semilla` es cualquier texto: la misma da siempre el mismo glitch, en preview y en render. Cambia la semilla en cada corte para que no se repita.
- Sobre fondo negro no se ve nada: invierte lo que hay debajo.

## Cómo se probó cada una

`probar.mjs` monta una plantilla sola en un proyecto de HyperFrames fuera del repositorio, corre `check`, renderiza y saca los cuadros de 0,1 s, 1 s, 2 s y 3,8 s:

```bash
node library/plantillas/probar.mjs --trabajo RUTA S21 ambos        # texto corto y texto de largo máximo
node library/plantillas/probar.mjs --trabajo RUTA S21 max --rapido  # cuadros con snapshot, sin render, para iterar el diseño
node library/plantillas/probar.mjs --trabajo RUTA transicion-glitch corto --con S21
node library/plantillas/probar.mjs --trabajo RUTA S21 corto --paleta '{"fondo":"#101820"}'
```

`tests/plantillas.test.mjs` (en `npm test`, sin navegador) comprueba el contrato leyendo archivos. Una carpeta cuya ficha aún no trae `probado` está en trabajo y solo debe tener `escena.html` y `ficha.json`; con `probado` se le exige todo el formato. `PLANTILLAS_SOLO=S04,S16 node --test tests/plantillas.test.mjs` limita la prueba a esas carpetas.

El texto «max» se arma con palabras anchas, con tildes y eñes, hasta el largo exacto de cada variable. Las variables que mandan sobre la estructura (listas, rutas, cifras) conservan su valor.

Lo medido con HyperFrames 0.9.9 en este equipo (i5, sin GPU dedicada): `check` unos 28 s y un render de 4 s a 1080×1920 y 30 fps, entre 22 y 41 s con `--workers 2`. Si lanzas el bucle de varias plantillas en segundo plano, el shell debe seguir vivo hasta el final.

## Lo aprendido

Viene de las escenas del video de 57 s y de normalizarlas. Lo marcado «medido» se comprobó al hacer estas plantillas.

- **Las variables llegan antes del script (medido).** Cuando corre el `<script>` de una sub-composición, el texto de `data-var-text` ya es el del anfitrión y `window.__hyperframes.getVariables()` ya devuelve sus valores. Por eso la ráfaga y el glitch arman su línea de tiempo desde las variables. Ningún texto cambia a mitad del render.
- **Colores y fuentes por `style` del anfitrión (medido).** Las variables CSS se heredan del anfitrión a la escena clonada: no hace falta declararlas. `var(--fondo, #EFE6D2)` deja el color propio como respaldo.
- **`data-var-text` cambia solo el texto del elemento.** Los hijos se conservan: el tachado de S28 y los iconos de S27 viven al lado, no dentro.
- **Tamaño por palabra más larga.** Un título corto se ve pequeño y uno largo se rompe a media palabra. S14, S28, S29, S30 y S40 calculan el cuerpo desde su palabra más larga con una constante por fuente (el ancho exacto de cada carácter está en `assets/fonts/metricas.json`, para quien necesite más precisión), sin medir el DOM en cada cuadro; lo que no se puede, se acota con `max`.
- **El `check` conjunto ve más que el individual.** Al montar las 17 juntas apareció un `text_box_overflow` como **error** en un texto que sube por máscara (en el cuadro inicial, por estar fuera de la máscara a propósito) y un `overlapping_gsap_tweens` en dos tweens de S06. El primero se evita con `data-layout-allow-overflow` en la máscara y en el texto; el segundo, acortando el primer tween.
- **Medir el DOM desde un tween avisa.** `check` lanza `gsap_callback_dom_measurement` si un callback llama a `offsetWidth` o `getBoundingClientRect`. El marco de S40 se dimensiona con CSS (`width: calc(100% - 8px)` sobre el `<rect>`).
- **Máscaras que no recortan el resplandor.** Un `overflow: hidden` corta el `text-shadow` y deja una banda visible. S04 y S29 usan `clip-path: inset(-300px -300px 0 -300px)` y lo abren al terminar de subir. Los textos que suben por máscara llevan `data-layout-allow-overflow`: sin eso, `check` los marca como error en un cuadro intermedio cuando se montan junto a otras escenas.
- **Dibujar trazos.** `pathLength="1"` con `stroke-dasharray="1"` y `stroke-dashoffset` de 1 a 0 no necesita medir el trazo. Con `stroke-linecap: round`, un trazo oculto deja un punto: usa `stroke-dasharray="1 2"` o `butt`. `vector-effect: non-scaling-stroke` rompe `pathLength`.
- **Escribir con borde suave.** `mask-image: linear-gradient(90deg, #000 var(--p), transparent calc(var(--p) + 14%))` y animar `--p` con GSAP da la tiza de S40 sin recortes duros.
- **Todo sale del tiempo.** Los canvas dibujan desde un tween proxy de GSAP; el ruido (grano de S30, lluvia de S10, estrellas de S29, bloques de S28) sale de un generador con semilla. No hay `Math.random`, `Date.now`, temporizadores ni `requestAnimationFrame`: lo comprueba `tests/plantillas.test.mjs`.
- **Lo que se mueve frena antes de 3,2 s.** Túneles, rejillas, manchas y anillos usan una curva `power2.out` hasta quedar quietos: la escena montada más larga se ve como un póster, sin saltos.
- **Rotar un `<g>` de SVG** usa `svgOrigin: "x y"` en el tween (S12, S18, S27). `transform-origin` en CSS no sirve.
- **Glitch con `mix-blend-mode`** funciona si los anfitriones no llevan `z-index` (del video original; aquí se comprobó el caso sin `z-index`, no el contrario).
- **Ráfagas de estilos.** `check` avisa `line_unread` si un texto de lectura dura 2 cuadros, y tiene razón: nadie lo lee. Por eso la ráfaga solo pone nombre y número en las paradas, y lleva el avance en una barra.
- **Pixel art de verdad.** Un canvas de 108×192 con `image-rendering: pixelated` y todo dibujado con `fillRect`, también el texto: un tipo de letra del sistema se ve suavizado y rompe el estilo.
- **Los cuadros de `snapshot` bastan para iterar el diseño**, pero `check` y el render son los que valen: el render de verdad es el que se mira antes de dar una plantilla por buena.
- **El render en segundo plano sí terminó** al lanzarlo como un bucle de shell que sigue vivo mientras corre; el `render_cancelled_parent_exited` ocurre cuando el proceso padre termina antes.
