# Registro de HyperFrames, copia fija

Código listo del registro de HyperFrames (Apache-2.0; los shaders, MIT), copiado del commit `fa1942d` y probado en vertical 1080×1920 en esta PC (i5-11400T, Intel UHD 730, HyperFrames 0.9.9). De dónde sale cada cosa, qué se cambió y qué se dejó fuera: `ORIGEN.md`.

## Qué hay

| Carpeta | Qué trae | Cuándo usarla |
|---|---|---|
| `shaders/` | 36 shaders de WebGPU (fondos de color, materiales, orbes, luz) con su motor y una tabla de lo medido | Fondos vivos y objetos centrales para un título. Piden GPU |
| `transiciones/` | 10 transiciones que no son fundidos, con su montaje | Cortes entre escenas: barrido, rasgado de papel, iris, cuadrícula, garabato, glitch, torbellino, luz |
| `subtitulos/` | 6 estilos de subtítulos con palabra activa | Subtítulos sobre la banda de y 1300–1540 |
| `bloques/split-flap-board/` | El panel de láminas original | Base de la plantilla `S13` |

Las plantillas verticales que salen de aquí están en `library/plantillas/`: `S13` (panel de láminas), `S03` (burbuja iridiscente), `S11` (malla de gradientes) y los estilos nuevos `R-aurora`, `R-metal`, `R-nebulosa`, `R-eclipse`, `R-hilos` (shaders) y `R-codigo` (código que se teclea, sin shader).

## Cómo montarlo

**Una plantilla con shader** (por ejemplo `R-aurora`), dentro de `proyecto/`:

```bash
mkdir -p compositions assets/lib assets/fonts
cp ../.claqueta/library/hyperframes-registro/shaders/lib/shaders.iife.js assets/lib/
cp ../.claqueta/library/plantillas/R-aurora/escena.html compositions/R-aurora.html
# las fuentes que nombra su ficha.json, desde ../.claqueta/assets/fonts/
cp ../.claqueta/assets/fonts/Fraunces-Variable.woff2 ../.claqueta/assets/fonts/Manrope-Variable.woff2 assets/fonts/
```

Y en `index.html` (la escena ya lleva `data-requires-webgpu` en su raíz, no hace falta repetirlo):

```html
<div id="R-aurora" data-composition-id="R-aurora" data-composition-src="compositions/R-aurora.html"
  data-start="0" data-duration="4" data-track-index="1" data-width="1080" data-height="1920"
  data-variable-values='{"titulo":"Cortinas de luz"}'></div>
```

**Una transición o un subtítulo:** cada carpeta trae `index-ejemplo.html` con el montaje que funcionó y sus `compositions/`. Las tablas `TRANSICIONES.md` y `SUBTITULOS.md` explican cómo se monta cada una.

**Un shader suelto:** copia `shaders/bloques/<nombre>.html` a `compositions/` y `shaders/lib/` a `compositions/lib/`; se monta como cualquier bloque. Las propiedades (`data-shader-props`) están en `shaders/propiedades.txt`.

## Qué se probó

- **Los 36 shaders** en `render` con la GPU del equipo y en `check`: los 36 funcionan y dan el mismo cuadro (`shaders/SHADERS.md`). Costo de captura de 0,11 a 0,33 s por cuadro con 2 trabajadores, salvo `nebula`, mucho más caro.
- **Las 16 plantillas** nuevas de `library/plantillas/` (11 de estilos del catálogo y 5 `R-*`), con `check` y `render`, con su texto por defecto y con texto del largo `max`.
- **Las 10 transiciones y los 6 subtítulos**, con `check` y `render`, en escenas de color liso con texto. No se probaron sobre video real.

## Qué no se probó

- **Sin GPU.** Con `data-requires-webgpu`, el render falla con un error claro: no hay WebGPU por software en el Chrome que baja HyperFrames en Windows. Sin ese atributo, como lo monta el kit de escenas, la escena se queda en su degradado de reserva. Si tu equipo no tiene GPU, usa las plantillas que no son de shader.
- **Otros sistemas** (macOS, Linux) y otras GPU.
- Los bloques `html-in-canvas`, las galerías `transitions-*` (salvo las diez elegidas) y los componentes que la tabla de cada carpeta lista como sin probar.
- **Sonido.** Las fichas traen los efectos sugeridos por tiempo; nadie los ha oído.
