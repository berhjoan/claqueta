# Motor isométrico

Un mundo isométrico con luz, sombras y objetos reconocibles, dentro de una escena de HyperFrames. Editas un solo archivo de datos y sale igual de bien en 9:16, 16:9, 1:1 y 4:5. Canvas 2D, sin WebGL. Probado en 0.9.9 en `check`, `snapshot` y `render`.

## Qué trae

| Archivo | Qué hace |
|---|---|
| `film.js` | **Tu película.** Colores, objetos, caminos, cámara y textos. Para una pieza normal, es lo único que editas |
| `tiempos.mjs` | Convierte `assets/tiempos.json` en `tiempos.js`, para usar `W('palabra')`, y deja duración y formato iguales en los HTML |
| `zonas.mjs` | Sin navegador: textos dentro de sus zonas, sujeto grande, nada cortado, nada vacío |
| `eventos.mjs` | Saca de la película el `efectos.json` de la mezcla: cada caída suena en su cuadro |
| `objetos.js` | La biblioteca. Para un objeto nuevo, una entrada más aquí |
| `motor.js`, `solidos.js`, `pintor.js`, `mundo.js` | Tiempo, geometría y dibujo. Aquí no se toca nada en una pieza normal |
| `ejemplo/` | `index.html`, `isometrico.html`, `guion.txt` y `catalogo.js`, una película quieta con todos los objetos |

## Montarlo

Desde la carpeta que tiene a `.claqueta`. Si el encargo ya corrió `init` y estás dentro de `proyecto/`, salta las dos primeras líneas:

```bash
npx hyperframes@0.9.9 init proyecto --resolution portrait --non-interactive --skip-skills
cd proyecto
mkdir -p assets/isometrico assets/lib assets/audio compositions renders
cp ../.claqueta/engines/isometrico/*.js assets/isometrico/
cp ../.claqueta/tools/lib/gsap.min.js assets/lib/
cp ../.claqueta/engines/isometrico/ejemplo/index.html .
cp ../.claqueta/engines/isometrico/ejemplo/isometrico.html compositions/
cp ../.claqueta/engines/isometrico/ejemplo/guion.txt .
python ../.claqueta/tools/medios/fuentes.py marca
```

Después, en este orden. Con estos comandos sale la película de muestra; para la tuya, cambia `guion.txt` y `assets/isometrico/film.js`:

```bash
python ../.claqueta/tools/pista.py voz --motor edge --voz es-CO-GonzaloNeural --guion guion.txt --por-oraciones --pausa 0.75 --velocidad 0.92 --cierre 4.4 --formato 9:16
node ../.claqueta/engines/isometrico/tiempos.mjs
node ../.claqueta/engines/isometrico/zonas.mjs assets/isometrico/film.js --todos
node ../.claqueta/engines/isometrico/eventos.mjs assets/isometrico/film.js efectos.json
python ../.claqueta/tools/pista.py musica --caracter electronico
python ../.claqueta/tools/pista.py mezcla --silencios 2
npx hyperframes@0.9.9 check --json
npx hyperframes@0.9.9 snapshot --at 0.5,3,5,8,13
npx hyperframes@0.9.9 render --crf 17 --output renders/final.mp4
python ../.claqueta/tools/qa/verificar_video.py verificar renders/final.mp4 --duracion 14.66
```

- Otro formato: cambia `--formato` en `pista.py voz` (ajusta el ancho de los subtítulos) y vuelve a correr `tiempos.mjs` y lo que sigue. No se recompone nada. A `verificar_video.py` dile el tamaño: `--ancho 1920 --alto 1080`.
- `--duracion` es el `dur` que imprime `pista.py voz`.
- Si cambias el guion, `W('mensaje')` falla hasta que uses palabras que la voz sí dice. Es a propósito: el error las lista.
- Sin voz: `node ../.claqueta/engines/isometrico/tiempos.mjs --dur 15`, y en `film.js` escribe segundos en lugar de `W(...)`.
- `index.html` trae `assets/audio/mezcla.wav`. Mientras no exista, quita ese `<audio>` o `check` dará error.

## Escribir tu película

`film.js` va por secciones, de la 1 a la 7. Copia una línea parecida y cámbiala.

`W('palabra')` es el segundo en que la voz dice esa palabra, `W('palabra', 2)` la segunda vez que la dice y `F('palabra')` el segundo en que termina. Sin tildes ni mayúsculas también vale. Ancla todo a la voz: si cambia, la imagen la sigue sin tocar números.

**Objetos.** `id` y `tipo` son obligatorios. `x`, `y` en unidades; `sobre: 'otro'` lo apoya encima de otro, y entonces `x`, `y`, `z` son la distancia a su centro.

```js
{ id: 'caja1', tipo: 'caja', sobre: 'mesa1', x: 1, y: -1, tam: 0.8, entra: W('pedido'), como: 'cae', peso: 2 },
```

| Campo | Qué hace |
|---|---|
| `tam` | Escala. En `plataforma` y `bloque`, `[ancho, fondo, alto]` |
| `entra` | Segundo en que aterriza. Sin `entra`, está desde el principio |
| `como` | `cae`, `arma` (pieza por pieza), `sube` (crece del suelo), `crece` o `ya` |
| `peso` | Cuánto retumba: desde 2 da temblor, esquirlas e impacto |
| `dura`, `altura`, `paso` | Tiempo y altura de la caída; tiempo entre piezas al armar |
| `sale`, `como_sale` | Segundo en que ya no está: `encoge`, `baja` o `vuela` |
| `salta` | Un segundo o lista de segundos: un brinco |
| `mueve` | Lista de viajes: `{ t: [desde, hasta], a: 'id', x, y, arco: 2, tam: 0.8 }`, o `camino: 'id'` para ir por el suelo |
| `encuadre: false` | No cuenta para `mira: 'todo'`: paquetes y cosas de paso |
| `color`, `material` | Color en hexadecimal; `mate`, `papel`, `carton` o `metal` en los básicos |
| `sonido` | `false` lo calla; un nombre de `efecto.py --listar` lo cambia |

**Tipos y sus acciones.** Una acción va como `[desde, hasta]`, una lista de rangos si se repite, un segundo o `true`.

| Tipo | Acciones y opciones |
|---|---|
| `plataforma` | `enciende`, `losas: 1`, `borde` |
| `sobre` | `abre`, `escanea`, `sello` |
| `documento` | `escribe`, `hojas`, `lineas` |
| `globo` | `puntos` |
| `telefono` | `enciende`, `avisa` |
| `pantalla`, `servidor` | `enciende`. El servidor: `bandejas`, `losas` |
| `chip`, `nube`, `esfera`, `bloque`, `columna` | Solo `color` |
| `caja` | `abre` |
| `estante` | `saca`, `destacada: [piso, columna]`, `semilla` |
| `lupa` | Mira siempre de frente |
| `barras` | `crece`, `valores: [0.4, 0.7, 1]` |
| `moneda` | `pila`, `texto` |
| `engranaje` | `gira`, `dientes`, `velocidad` |
| `candado` | `abre` |
| `flecha` | `crece`, `largo`, `angulo` |
| `aprobado` | `traza`, `signo` |
| `persona` | `levanta`, `piel`, `pelo` |
| `letras` | `texto`, `letra`, `grosor`, `plano: 'pared'` o `'suelo'` |

**Caminos.** `{ id, de: 'a', a: 'b', crece: [t0, t1] }` crece por el suelo. `ruta: 'xy'` o `'yx'` elige el lado de la curva; `por: [[x, y]]` lo lleva por donde quieras. `ancho` y `color` cambian su aspecto, y `flujo: false` quita lo que corre por dentro. `aereo: true, altura: 4` es una ruta punteada por el aire.

**Cámara.** Una lista de planos. Dices a quién mira y ella calcula escala y posición para cada formato, dejando libre el título y los subtítulos:

```js
{ desde: W('busca'), mira: 'estante1', llena: 1, llega: 0.6 },   // mira: id, lista de id o 'todo'
```

`llena` es cuánto de la zona libre ocupa el sujeto: de 0.9 a 1. `llega` son los segundos del movimiento y `corte: true` lo hace seco. `sigue: 'id'` acompaña a algo que viaja. Se acerca solo 1 % por segundo, salvo que haya rótulos en pantalla; `deriva: 0` lo apaga. Nunca rota la proyección.

**Un objeto que se vuelve mundo.** Pon cosas muy chicas encima de otro objeto y apunta la cámara a ellas: la tapa crece hasta llenar el cuadro y queda como suelo. En la muestra, `estante1` está sobre `servidor` con `tam: 0.17`. Como todo es vector, no se pixela. Usa `tam` en `mueve` para que algo salga chico de ahí y llegue grande a la mesa siguiente.

**Textos.** Los subtítulos salen solos de la voz; `export const SUBTITULOS = false` los quita.

```js
{ como: 'titulo', t: [0, 2], texto: 'Así de simple', color: 'acento' },
{ como: 'titulo', t: [2, 5], partes: [{ texto: 'Lee', t: W('lee') }, { texto: 'Busca', t: W('busca') }] },   // la última que entró va en acento
{ como: 'rotulo', texto: 'IA', sobre: 'servidor', t: [9, 15] },   // lado: 'arriba', 'abajo', 'derecha' o 'izquierda'; sin lado, busca el que no pisa nada
```

Un título va arriba o en una columna a la izquierda, lo que deje más grande al sujeto. Para letras en el mundo, usa el objeto `letras`. Para que el título no se cruce con el sujeto, déjalo vivo en todo el plano.

**Disposición.** Escribe las mesas para vertical, bajando en zigzag: `(0,0)`, `(6,0)`, `(6,6)`, `(12,6)`. En horizontal el motor las refleja solo y quedan en fila; lo que hay sobre cada mesa no cambia. `export const ESPEJO = false` lo fija. La paleta manda en todo, también con fondo claro.

## Lo que el motor resuelve solo

- Luz de una sola dirección: arriba claro, izquierda medio, derecha oscuro. Sombras de contacto y proyectadas, también sobre otros objetos, y oclusión donde se tocan.
- Orden de profundidad por sólido, no por centro.
- Un objeto cae, aplasta poco y rebota poco; lo de abajo cede y el suelo responde con una onda.
- Desenfoque de movimiento real, solo cuando la cámara corre.
- `Sora` u otra familia de `fuentes.py`: escribe en `FUENTES.titulos` la que imprime el comando. Para letras nuevas, tildes, `ñ`, `¿` y `¡` ya están medidas en `assets/fonts/metricas.json`.

## Sonido

`eventos.mjs` deja un efecto por acción, con el pico un cuadro después de la imagen, máximo uno por segundo (`--separacion`), con paneo según el lugar en pantalla y 5 dB menos si cae sobre una palabra. Si dos acciones caen muy juntas, suena la más pesada. `SONIDOS` en `film.js` agrega los tuyos, y esos siempre suenan. Corre `eventos.mjs` y `pista.py mezcla` cada vez que cambien tiempos. Es sintético y no se ha validado de oído: que alguien escuche.

## Lo que verás en las revisiones

- `zonas.mjs` mide el sujeto por su lado mayor en pantalla, con 40 % de mínimo. El área de su caja da menos, porque un objeto isométrico es un rombo: entre 20 % y 53 % en la muestra.
- En un i5 sin GPU dedicada, `check` tarda de 1 a 1,5 min y `render` unos 2,5 min por 15 s de video. Un cuadro con la cámara quieta tarda 0,2–0,5 s; con la cámara corriendo, hasta 4 s.
- `tools/qa/revisar.py` avisa de los efectos que caen sobre una palabra: la imagen aterriza en la palabra que la nombra, así que es lo esperado. Ya van 5 dB abajo; confirma con `comparar_voz.py --modelo medium`.
- Es una sola escena: mira con `snapshot --at` y tus momentos clave.
- Un máster a `--crf 17` pesa unos 1,3 MB por segundo.

## Licencias

Todo el código de esta carpeta es de este proyecto (MIT). De los estilos isométricos de lemo-opuscar se tomó vocabulario, no código. Las fuentes vienen de `assets/fonts`, con su licencia OFL.
