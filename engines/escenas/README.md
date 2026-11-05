# Kit de escenas

Escribes un `pieza.json` con los planos y sale un proyecto completo de HyperFrames: escenas editables, subtítulos, transiciones, efectos de sonido, fuentes y GSAP, sin bajar nada. Cada plano se ancla a una palabra de la voz: si cambia la voz, corres otra vez el comando y la imagen la sigue.

Probado en 9:16, 16:9, 1:1 y 4:5, con `check` y render de HyperFrames 0.9.9. Que el kit arme un proyecto no significa que esté bien dirigido: mira los cuadros.

## Del guion al video

Dentro de tu proyecto, con `.claqueta` al lado:

```bash
python ../.claqueta/tools/pista.py voz --motor edge --voz es-CO-GonzaloNeural --guion guion.txt --por-oraciones --pausa 0.4
python ../.claqueta/tools/pista.py musica --caracter calido
node ../.claqueta/engines/escenas/armar.mjs pieza.json
python ../.claqueta/tools/pista.py mezcla
npx hyperframes@0.9.9 check --json
npx hyperframes@0.9.9 render --output renders/final.mp4 --fps 30 --crf 17
```

`--ayuda` lista bloques, pieles, paletas y tipografías, con sus campos:

```bash
node ../.claqueta/engines/escenas/armar.mjs --ayuda
```

## `pieza.json`

```json
{
  "formato": "9:16",
  "piel": "infografia",
  "paleta": "bg",
  "planos": [
    { "tipo": "titulo", "texto": "Hacer un video con código|ya no cuesta dinero", "acento": "dinero" },
    { "tipo": "cifras", "desde": "@Claqueta", "items": [
      { "valor": 106, "rotulo": "estilos", "en": "@ciento" },
      { "valor": 21, "rotulo": "voces", "en": "@veintiún" }
    ] },
    { "tipo": "pasos", "desde": "@Eliges", "items": [
      { "texto": "Eliges", "icono": "sliders-horizontal" },
      { "texto": "Copias", "icono": "copy", "en": "@copias" }
    ] },
    { "tipo": "frase", "desde": "@Un", "texto": "Un encargo claro hace un video claro.", "acento": "claro." }
  ]
}
```

- **`desde`** dice cuándo empieza el plano: `@palabra`, `@palabra#2` si se repite, segundos, `pulso:8` o `compas:3`. Una palabra se busca después del plano anterior. El primer plano empieza en 0.
- **`en`** ancla un elemento dentro del plano. Sin él, el elemento cae cuando la voz dice su texto, o se reparte en el plano.
- **`|`** fuerza un salto de línea en `titulo`.
- **`acento`** marca palabras: van sobre un bloque, o en color si la piel no usa bloque.
- Sin voz, escribe `"dur": 20` y ancla con segundos o pulsos.

## Bloques

| Tipo | Para qué | Notas |
|---|---|---|
| `titulo` | Gancho y frases cortas | En el primer plano ya está completo: el primer cuadro es la portada, y se enciende con la voz |
| `cifra` | Un número que llena el cuadro | Cuenta hasta su valor. `barra` entre 0 y 1. `contar_desde` si no parte de 0. Formato español: 1.384,5 |
| `cifras` | Varias, cada una en su palabra | En columnas si el formato es horizontal |
| `barras` | Comparar valores | Salen del borde del cuadro, con la misma escala para todas |
| `linea` | Una serie en el tiempo | Se dibuja y termina en `final` |
| `pasos` | Un proceso | Un camino que crece; admite icono y `detalle` |
| `diagrama` | Nodos conectados | `ciclo` o `flujo`; `centro` opcional |
| `comparar` | Antes y después, mito y verdad | El segundo campo entra sobre el primero |
| `frase` | Una frase que llena el cuadro | Se enciende palabra a palabra y reemplaza a los subtítulos |
| `imagen` | Foto real a toda pantalla | Con `tratamiento: "duotono"` toma la paleta. Consíguela con `tools/medios/medios.py` |
| `video` | Una toma real a toda pantalla | Sin sonido propio: la voz va en la mezcla. Va al compás de la pieza, así que al cortar a un gráfico la toma sigue por debajo |
| `captura` | Una pantalla real en su marco | `foco` acerca la cámara a una zona; `cursor` la señala |
| `codigo` | Líneas que se escriben | `salida: true` quita el `>` |
| `cierre` | La frase final y la marca real | `emblema`, `marca`, `llamado` |
| `plantilla` | Un estilo probado de `library/plantillas` | `estilo` y `textos`. Una vez cada una |

Los números llevan `fuente` cuando salen de algo verificable. Nunca inventes un dato para llenar un bloque.

## Pieles

Una piel es un material con sus reglas: de qué está hecho el mundo, cómo entra lo que aparece, cómo se pasa de un plano a otro y cómo suena. La misma `pieza.json` en dos pieles no se parece.

| Piel | Material | Entra con | Pasa con | Suena a |
|---|---|---|---|---|
| `infografia` | Retícula, líneas de construcción, regla de progreso | Máscara y cotas | Barrido, persiana, inundación | Clics, destellos |
| `cartel` | Planos de color y letras que chocan con el borde | Golpe de escala | Persiana, barrido | Golpes, impactos |
| `collage` | Papel rasgado con su alma blanca, recortes, semitono | Pegado a saltos, en stop motion | Hoja rasgada | Papel |
| `terminal` | Fósforo, líneas de barrido | Se escribe a pasos | Falla, corte | Teclas |
| `noticia` | Bloques duros y banda inferior | Bloque que se abre | Corte seco | Clics, golpes |
| `archivo` | Mesa de luz, fibra de papel, viñeta | Aparece lento | Hoja rasgada, corte | Pasos, papel |

## Con tu propia grabación

Limpia la toma con `tools/material/toma.py` y alterna: la toma, un gráfico, la toma. Los subtítulos y la mezcla salen igual, porque `toma.py` deja `assets/tiempos.json` y `assets/voz/voz.wav`.

```json
{ "tipo": "video", "src": "toma-limpia.mp4" }
{ "tipo": "cifra", "desde": "@setenta", "valor": 74, "sufijo": " %", "rotulo": "de los equipos", "fuente": "Quién lo midió" }
{ "tipo": "video", "desde": "@entonces", "src": "toma-limpia.mp4" }
```

## Un estilo por plano

Cada plano puede traer `piel`, `paleta`, `tipografia` y `estilo`. `"paleta": "propia"` usa los colores de su `estilo`. Los subtítulos no cambian: se leen igual en toda la pieza.

```json
{ "tipo": "frase", "desde": "@Un", "texto": "Otra idea", "piel": "collage", "estilo": "S22", "paleta": "propia" }
{ "tipo": "plantilla", "desde": "@cinco", "estilo": "S16", "textos": { "titulo": "Forma y función" } }
```

## Cámara y transiciones

Cada plano acepta `camara` y `transicion`. Sin ellas, la piel elige y varía la dirección.

- `camara`: `push`, `pull`, `deriva`, `golpe`, `saltos`, `fija`. El mundo se mueve más que la información: da profundidad y el texto sigue quieto para leerse.
- `transicion`: `corte`, `barrido`, `persiana`, `papel`, `inundar`, `falla`. Cubren el corte y sus colores salen del plano que entra.

## Lo que escribe

| Archivo | Se puede editar a mano |
|---|---|
| `index.html`, `compositions/p*.html`, `transiciones.html`, `subtitulos.html` | Sí, pero el siguiente armado lo sobrescribe: retoca al final |
| `efectos.json` | Sí, antes de `pista.py mezcla` |
| `assets/escenas/piel.css`, `assets/fonts/`, `assets/lib/gsap.min.js` | Sí |
| `assets/audio/mezcla.wav` | Si no existe, deja una pista muda para poder mirar cuadros. `pista.py mezcla` la reemplaza |

Cada `compositions/p*.html` es HTML y GSAP normales. Si un plano necesita algo que el kit no trae, edítalo o reemplázalo: es un proyecto de HyperFrames como cualquier otro.

## Lo que verás en las revisiones

- `contrast_aa_failure` en palabras de `frase` o del título inicial: son las palabras aún apagadas, que se encienden con la voz. Compruébalo en un cuadro.
- `contrast_aa_failure` en una palabra con `acento`: el bloque de color está detrás, en otro elemento. También se confirma en un cuadro.
- `line_unread` en un título de un plano muy corto: alarga el plano o acorta el texto.
- En collage, la primera línea no está completa en el primer cuadro: las palabras se pegan con la voz.

## Lo que no hace

- No escribe el guion ni decide qué bloque cuenta mejor cada idea: eso es dirección.
- No inventa datos, fotos ni capturas.
- Sus pieles no reemplazan a los 106 estilos: cubren los que están marcados con `piel` en `data/styles.json`. Para los demás hay plantillas en `library/plantillas` o se construye a mano.

Licencia: MIT. Los iconos son Lucide (ISC). Las fuentes son SIL OFL 1.1; sus licencias se copian con ellas.

## Plantillas y escenas propias

Una plantilla que abre la pieza arranca 0,7 s adelantada, para que el primer cuadro ya muestre algo: es la portada en el feed. `"adelanto": 0` lo apaga, y otro número lo cambia; también sirve en cualquier otro plano montado.

La ráfaga es una plantilla que no lleva textos: `{"tipo": "plantilla", "estilo": "rafaga", "paradas": ["S40", "S04"], "cadencia": 2, "mosaico": true}`. Calcula cuántas miniaturas caben en la duración del plano, las revuelve siempre igual, copia las que usa y solo nombra las paradas. Con `"lista": [ids]` eliges cuáles.

Un plano puede montar algo que el kit no dibuja. Sigue anclado a la voz, con sus transiciones y subtítulos.

```json
{ "tipo": "plantilla", "desde": "@bauhaus", "estilo": "S16", "textos": { "titulo": "Forma y función" }, "paleta": "propia" }
{ "tipo": "propia", "desde": "@luego", "archivo": "escenas/mi-escena.html", "fuentes": ["Sora"], "textos": { "titulo": "Mi título" } }
```

- `plantilla` toma una escena probada de `library/plantillas`. Son verticales: en otro formato el comando se detiene y te dice qué hacer.
- Las dos conservan sus propios colores y fuentes si piden `"paleta": "propia"`, y llevan una cámara muy suave para que un plano largo no quede quieto. `"camara": "fija"` la quita y `"pull"` la invierte.
- `propia` toma una escena que escribiste con `library/plantillas/FORMATO.md`, a la medida de la pieza. `armar.mjs` la copia a `compositions/` cada vez, así que edítala en `escenas/`, no en `compositions/`.
