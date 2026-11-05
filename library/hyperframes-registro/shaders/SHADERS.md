# Los 36 shaders WebGPU del registro, probados aquí

Probados en esta PC: i5-11400T, Intel UHD 730, Windows 11, HyperFrames 0.9.9, Chrome headless de HyperFrames (152). Todos en vertical 1080×1920, 60 cuadros (2 s) a 30 fps, `--crf 18`, 2 trabajadores.

## Resultado

- **Los 36 renderizan** con la GPU por hardware (`screenshot capture · hardware gpu`): código de salida 0, MP4 válido y sin cuadros negros. El único mensaje de consola es el aviso de Chrome `powerPreference ... ignored ... on Windows`, que no afecta.
- **Costo de captura:** de 0,11 a 0,85 s por cuadro, mediana 0,15. Un minuto de video a 30 fps son 1.800 cuadros: unos 4,5 min de captura con la mediana. Sin shader, una escena de texto da 0,06–0,09 s/cuadro. `nebula` es con diferencia el más caro (0,85 s/cuadro a pantalla completa y con un solo trabajador: el calibrador de HyperFrames lo clasifica como carga alta y baja a un trabajador; forzar `--workers 2` no mejora: 0,32 s/cuadro dentro de la plantilla; dentro de la plantilla `R-nebulosa` y con `scale` 0,44 baja a unos 0,36); le siguen `plasma` (0,33), `mesh-gradient` y `holographic`.
- **`check` y render dan lo mismo:** `check` pasa en los 36 (`ok: true`, 0 errores de lint, de ejecución y de capas). Además se capturó el cuadro de 1,0 s con `snapshot` (el mismo camino de búsqueda de tiempo que usa `check`) y se comparó con el cuadro 30 del MP4: la diferencia media por pixel es de 0 a 4 niveles sobre 255 (columna «dif.»), es decir, ruido del códec. Los cuadros son los mismos.
- **Sin GPU no funcionan.** Con `--no-browser-gpu` el render **falla de inmediato** con un error claro (`This composition declares data-requires-webgpu, but a usable WebGPU device could not be created...`), no deja video negro. Con `PRODUCER_ALLOW_SOFTWARE_WEBGPU=1` y modo software el navegador sigue sin adaptador (`No available adapters`), así que SwiftShader no sirve aquí. Lo que sale de un shader solo se renderiza en una máquina con GPU (la UHD 730 integrada basta). Lo mismo pasa con las plantillas `R-*` de shader, `S03` y `S11`: probado con `R-eclipse`.
- **Varios shaders en un video:** el motor original dibuja siempre el primer `canvas[data-shader]` del documento, así que solo cabe un shader por video. Esta copia lleva un parche de cuatro sustituciones (abajo): el motor se carga una vez y cada escena lo monta sobre su propio canvas. Probado con tres escenas de shader seguidas (`R-eclipse`, `R-aurora`, `R-hilos`, 12 s, 0,125 s/cuadro): las tres se ven. Aun así, cada escena crea su propio dispositivo WebGPU y repinta en cada cuadro aunque no esté a la vista: no montes más de tres o cuatro por video.

## Qué hay aquí

| Ruta | Qué es |
|---|---|
| `lib/shaders.iife.js` | El motor de los 36 (`shaders` 4.0.0, MIT), con el parche. 1,4 MB. |
| `lib/shaders.THIRD-PARTY-LICENSES.txt` | Licencias de `shaders`, `typegpu`, `tinyest`, `typed-binary` y `tsover-runtime`, todas MIT. |
| `bloques/<nombre>.html` | Un bloque por shader, del registro, con las medidas cambiadas a 1080×1920. Montar con `data-composition-src` y `<script src="lib/shaders.iife.js">` junto a ellos. |
| `parche-shaders.py` | Reproduce `lib/shaders.iife.js` desde el original del commit `fa1942d` (md5 `61b46a2b795b406683f30aa515e03843`). |

## El parche (cuatro sustituciones de texto, nada más)

1. El cuerpo que arranca un shader pasa a ser una función, `window.__hfShaderMount(canvas)`, que cada escena llama con su canvas.
2. Al final, si nadie activó `window.__hfShaderManual`, se monta el primer `canvas[data-shader]` como hacía el original: un bloque suelto se comporta igual (comprobado: `aurora` y `holographic` dan el mismo cuadro, diferencia 0,0, con el motor original y con el parcheado).
3. La promesa de arranque se registra con clave propia por instancia (`shaders1`, `shaders2`...), para que dos escenas no se pisen.
4. El tiempo que recibe el shader pasa por `canvas.__mapTime(t)` si existe: así la escena usa su tiempo local, elige un buen primer cuadro y se queda quieta pasados unos segundos.

## Propiedades

Cada shader acepta `data-shader-props='{...}'` en el canvas (JSON). Los colores van en `#rrggbb`. Los objetos (`shapeEffect`) llevan `center` y `scale`; los fondos (`generator`) no. Las propiedades de cada uno y su valor por defecto están en `propiedades.txt`.

## Tabla

`s/cuadro` es el tiempo de captura por cuadro; `dif.` es la diferencia media entre el render y el cuadro de `snapshot` (0–255); `check` dice si pasó sin errores.

| Bloque | `data-shader` | Tipo | s/cuadro | dif. | check | Cómo se ve en vertical |
|---|---|---|---|---|---|---|
| `aurora` | `Aurora` | fondo | 0,13 | 1,1 | sí | Cortinas verdes y violetas arriba; el resto queda negro. Sirve de fondo con título debajo. |
| `blob` | `Blob` | fondo | 0,12 | 1,3 | sí | Mancha coral y rosa que llena el cuadro. Muy saturado. |
| `chrome-orb` | `Chrome` | objeto | 0,19 | 0,8 | sí | Esfera de cromo con reflejo de ventana. Con escala 1 se corta por los lados: usar `scale` 0,6–0,7. |
| `color-wheel` | `ColorWheel` | fondo | 0,17 | 1,3 | sí | Degradado liso amarillo-naranja con el modo por defecto; el modo `rainbow` da todo el arcoíris. |
| `falling-lines` | `FallingLines` | fondo | 0,11 | 0,0 | sí | Estelas blancas que caen sobre negro. Sobrio, buen fondo para texto. |
| `flowing-gradient` | `FlowingGradient` | fondo | 0,16 | 1,3 | sí | Ríos de rosa, naranja y violeta. Muy vistoso, quita peso al texto. |
| `fractal-noise` | `FractalNoise` | fondo | 0,21 | 0,6 | sí | Nubes grises claras. Textura neutra. |
| `frost` | `Frost` | objeto | 0,15 | 0,9 | sí | Esfera de hielo azul con brillo. Necesita `scale` menor en vertical. |
| `gabor-noise` | `GaborNoise` | fondo | 0,12 | 0,7 | sí | Manchas diagonales blancas y negras, de alto contraste. Textura gráfica. |
| `godrays` | `Godrays` | fondo | 0,17 | 1,4 | sí | Rayos azules desde una esquina. Se lee bien con texto claro. |
| `goo` | `Goo` | objeto | 0,17 | 0,9 | sí | Esfera verde translúcida y viscosa. Necesita `scale` menor en vertical. |
| `heatmap` | `Heatmap` | objeto | 0,13 | 0,9 | sí | Esfera con bandas violetas y fondo de brillo. Necesita `scale` menor. |
| `hologram` | `Hologram` | objeto | 0,18 | 3,9 | sí | Esfera de líneas cian tipo HUD. Es el que más cambia entre cuadros (grano y barrido). |
| `holographic` | `Holographic` | objeto | 0,21 | 1,4 | sí | Esfera de lámina iridiscente arcoíris. Necesita `scale` menor. |
| `lens-flare` | `LensFlare` | fondo | 0,14 | 0,7 | sí | Destello con halo sutil sobre casi negro. Poco contraste: sirve de acento. |
| `light-edge` | `LightEdge` | objeto | 0,13 | 0,3 | sí | Disco negro con borde de luz violeta y cian. Usado en R-eclipse. |
| `liquid-metal` | `LiquidMetal` | objeto | 0,15 | 0,8 | sí | Esfera de metal líquido, gris y blanca. Usado en R-metal. |
| `marble` | `Marble` | fondo | 0,15 | 0,9 | sí | Vetas blancas sobre morado oscuro, de alto contraste. |
| `mesh-gradient` | `MeshGradient` | fondo | 0,23 | 1,5 | sí | Malla de color suave, la más fotogénica como fondo. Usado en S11. |
| `nebula` | `Nebula` | objeto | 0,85 | 1,1 | sí | Orbe de gas rosa y azul con estrellas. Usado en R-nebulosa. |
| `obsidian` | `Obsidian` | objeto | 0,25 | 0,9 | sí | Esfera oscura con borde iridiscente. Necesita `scale` menor. |
| `plasma` | `Plasma` | fondo | 0,33 | 1,3 | sí | Pliegues violetas oscuros, lentos. Buen fondo tranquilo. |
| `plastic` | `Plastic` | objeto | 0,28 | 0,6 | sí | Esfera blanca de plástico arrugado. Necesita `scale` menor y fondo oscuro. |
| `prism` | `Prism` | fondo | 0,17 | 0,5 | sí | Un haz blanco que se abre en arcoíris. Diagonal, atrevido. |
| `ripples` | `Ripples` | fondo | 0,12 | 0,0 | sí | Anillos concéntricos blanco y negro, muy duros. |
| `sine-wave` | `SineWave` | fondo | 0,14 | 0,3 | sí | Una onda luminosa que cruza el cuadro. |
| `spiral` | `Spiral` | fondo | 0,15 | 0,0 | sí | Espiral blanca y negra de alto contraste. |
| `strands` | `Strands` | fondo | 0,17 | 0,3 | sí | Cintas de luz cian y violeta que se cruzan. Usado en R-hilos. |
| `stripes` | `Stripes` | fondo | 0,15 | 0,1 | sí | Rayas diagonales blancas y negras. |
| `sun-burst` | `SunBurst` | fondo | 0,23 | 1,6 | sí | Rayos radiales dorados sobre crema. |
| `swirl` | `Swirl` | fondo | 0,14 | 1,3 | sí | Remolino suave azul y naranja. |
| `thin-film` | `ThinFilm` | objeto | 0,14 | 0,7 | sí | Burbuja de jabón: anillo de bandas arcoíris. Usado en S03. |
| `voronoi` | `Voronoi` | fondo | 0,11 | 1,7 | sí | Celdas rosas con núcleo azul y borde negro. |
| `water` | `Water` | objeto | 0,16 | 0,9 | sí | Esfera de agua con olas y espuma. Necesita `scale` menor. |
| `waveform` | `Waveform` | fondo | 0,13 | 0,5 | sí | Barras de ecualizador violetas; animan solas, sin audio. |
| `worley-noise` | `WorleyNoise` | fondo | 0,14 | 0,6 | sí | Esferas grises sobre negro, como burbujas. |

## Notas de uso

- **Objetos** (`chrome-orb`, `frost`, `goo`, `heatmap`, `hologram`, `holographic`, `liquid-metal`, `nebula`, `obsidian`, `plastic`, `thin-film`, `water`, `light-edge`): el lienzo vertical los agranda hasta cortarlos por los lados. Se bajan con `"scale": 0.6` a `0.7` y se suben o bajan con `"center": {"x": 0.5, "y": 0.35}`. Fuera de la figura el lienzo es opaco: el fondo del shader es negro.
- **Reloj:** el motor dibuja a partir del tiempo de HyperFrames, no tiene reloj propio: buscar cualquier instante da el mismo cuadro.
- **Costo:** los fondos con muchas capas (`plasma`, `holographic`, `mesh-gradient`) cuestan el doble que los lisos (`falling-lines`, `blob`).
