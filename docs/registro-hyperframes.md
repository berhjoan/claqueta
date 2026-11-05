# Registro de HyperFrames: estilos y efectos con código listo

Revisado en `heygen-com/hyperframes`, commit `fa1942d` del 2026-11-05. Trae 210 bloques, 239 componentes y 8 ejemplos. La licencia del repositorio es Apache-2.0. Los 36 bloques de shaders suman MIT (librería shaders.com) y traen su `THIRD-PARTY-LICENSES`. `weight-wave` es OFL-1.1.

Cada bloque cumple el contrato de HyperFrames: es determinista y se puede buscar cualquier instante. En la práctica es una «skill completa» con código listo, no solo una descripción.

## Avisos antes de sumar nada

1. **Formato:** casi todos vienen en 1920×1080. Hay que recomponerlos para 9:16, nunca recortarlos a ciegas.
2. **WebGPU:** los 36 bloques de shaders (aurora, blob, chrome-orb, nebula, plasma, water…) usan WebGPU. Hay que probarlos en la PC del estudio (Intel UHD 730) y en `render` con GPU por software. Si no salen, quedan como «por adaptar».
3. **Versión fija:** `hyperframes.json` apunta el registro a `main`. Para que un encargo dé siempre lo mismo, conviene copiar los bloques elegidos a `library/hyperframes-registro/` con un `ORIGEN.md`, como se hizo con lemo-opuscar, en vez de usar `hyperframes add` contra `main`.
4. **Marcas ajenas:** fuera todo lo que imita una marca, una interfaz real o a una persona (lista al final).

## A. Estilos del catálogo que ya tienen implementación en el registro

Con esto, varios de los 83 estilos «por adaptar» pueden pasar a «probado» más rápido. La correspondencia es una propuesta y hay que verificarla viendo cada bloque.

| Estilo de Claqueta | Bloques y componentes del registro |
|---|---|
| S01 Partículas | `code-particle-assemble`; componentes `particle-text-dissolve`, `particle-image-reveal` |
| S03 Holográfico | `holographic`, `thin-film`, `hologram` |
| S05 Malla 3D | `wireframe-portal-title` |
| S06 Cristal esmerilado | `glass-hero`, `glass-shard-title`, `vfx-liquid-glass` |
| S07 Tipografía cinética | ejemplo `kinetic-type`; `weight-wave`; componentes `kinetic-center-build`, `kinetic-type-swap`, `headline-slam`, `char-slam-explode`, `variable-font-flex` |
| S08 Isométrico | `exploded-stack` |
| S10 Arte ASCII / L-ascii-crt | componentes `ascii-render-pass`, `ascii-trail-reveal`, `matrix-decode`; `oscilloscope-trace` |
| S11 Malla de gradientes | `mesh-gradient`, `flowing-gradient`, `swirl`, `mk-background`; componente `mesh-gradient-bg` |
| S13 Panel de láminas | `split-flap-board` |
| S14 Retro VHS | `yt-lcd-background` (líneas de barrido); componentes `chromatic-aberration-wipe`, `caption-glitch-rgb` |
| S15 Semitono | `halftone-field`; componente `halftone-dissolve` |
| S17 Pixel art | componentes `grid-pixelate-wipe`, `ordered-dither-pass` |
| S21 Editorial minimalista | ejemplos `swiss-grid`, `vignelli`; `editorial-flash-overlay` |
| S22 Collage de papel | componentes `paper-collage-reveal`, `torn-paper-rip`; `freeze-frame-dressing` |
| S24 Doodle / L-whiteboard | familia `hw-*`: `hw-frame`, `hw-path-text`, `hw-pipeline`, `hw-text-cloud`, `hw-title`, `hw-write-title`; componentes `hw-arrow`, `hw-boil`, `hw-underline`, `whiteboard-ink` |
| S26 Infografía / L-dataviz | `data-chart`, `bar-chart-race`, `mk-line-graph`, `mk-progress-stat`; componentes `count-up`, `animated-bar-chart` |
| S27 HUD / L-hologram-hud | `camcorder-hud`, `hologram`; componentes `telemetry-hud`, `camera-scan-gate`, `scan-band` |
| S28 Glitch digital | transición `glitch`; componentes `rgb-glitch-text`, `caption-glitch-rgb`, `chromatic-aberration-wipe` |
| S30 Película analógica | ejemplo `warm-grain`; `organic-light-leak-overlay`, `light-leak`; componentes `grain-field`, `grain-overlay` |
| S31 Stop motion | componente `stop-motion-cadence` |
| S36 Producto de estudio / L-glass-product | `product-turntable`, `glass-hero` |
| L-satellite-briefing | `world-map` |
| L-living-screencast | `code-typing`, `code-scroll`, `code-highlight`; componentes `terminal-simulator`, `typed-prompt`, `code-terminal-run` |
| L-dark-keynote | familia `mk-*` |
| L-tilt-shift | `rack-focus`; componente `focus-rack` |
| L-desktop-flythrough | `ui-3d-reveal` |

## B. Estilos nuevos que no están en los 106

Propuesta de familias nuevas. Cada una entra como «por adaptar» hasta tener ficha, paleta, miniatura propia y una plantilla vertical probada.

| Familia nueva | Bloques | Nota |
|---|---|---|
| Materiales de shader | `chrome-orb`, `liquid-metal`, `plastic`, `obsidian`, `frost`, `goo`, `water`, `marble`, `thin-film`, `light-edge` | Objetos centrales sobre negro. Necesitan WebGPU |
| Campos de color | `aurora`, `plasma`, `swirl`, `flowing-gradient`, `color-wheel`, `strands`, `voronoi`, `worley-noise`, `fractal-noise`, `gabor-noise`, `stripes`, `spiral`, `sun-burst`, `ripples`, `sine-wave`, `falling-lines`, `godrays`, `heatmap`, `prism`, `lens-flare` | Fondos vivos. Necesitan WebGPU |
| Cosmos | `cosmic-orb`, `spiral-galaxy`, `starfield`, `nebula` | `starfield` es una capa segura para buscar instantes |
| Código vivo | `code-3d-extrude`, `code-diff`, `code-highlight`, `code-morph`, `code-particle-assemble`, `code-scroll`, `code-shader-dissolve`, `code-slice-hero`, `code-typing` | Encaja con lo que es Claqueta: video hecho con código |
| Títulos de impacto | `canopy-part-title`, `glass-shard-title`, `wireframe-portal-title`, `extruded-logo`, `yt-prism-title` (renombrar «Título con franja cromática»), `split-flap-board` | Para ganchos y cierres |
| VFX | `vfx-anamorphic-flare`, `vfx-liquid-background`, `vfx-magnetic`, `vfx-portal`, `vfx-shatter`, `vfx-text-cursor` | Medir el costo de render en la Intel UHD 730 |
| Cámara | `camera-dolly-zoom`, `rack-focus`, `cinemagraph`, `gallery-tunnel` | Pueden ir al departamento Cámara además de Estilo |
| Diagramas y mapas | `flowchart`, `flowchart-vertical`, `exploded-stack`, `world-map`, `us-map`, `us-map-bubble`, `us-map-flow`, `us-map-hex`, `spain-map` | Solo con datos reales y su fuente |
| Clima y partículas | `snow`, `starfield` | Capas finitas y seguras para buscar instantes |

## C. Para otros departamentos del panel

- **Montaje / transiciones:**
  - 13 bloques `transitions-*` (3d, blur, cover, destruction, dissolve, distortion, grid, light, mechanical, other, push, radial, scale).
  - Transiciones de shader: `chromatic-radial-split`, `cinematic-zoom`, `cross-warp-morph`, `domain-warp-dissolve`, `flash-through-white`, `glitch`, `gravitational-lens`, `light-leak`, `ridged-burn`, `ripple-waves`, `sdf-iris`, `swirl-vortex`, `thermal-distortion`, `whip-pan`.
  - Superposiciones: `hw-scribble-transition`, `mk-clone-wall-transition`.
  - Componentes: `whip-pan-cut`, `iris-reveal`, `match-cut`, `directional-wipe`, `torn-paper-rip`, `ink-bleed-reveal`, `grid-pixelate-wipe`, `zoom-through-transition`, `shutter-slam`, `slit-scan-reveal`.
  - Además, gl-transitions (MIT), que el radar ya marca como «adoptar».
- **Subtítulos:** `caption-neon-glow`, `caption-glitch-rgb`, `caption-matrix-decode`, `caption-kinetic-slam`, `caption-pill-karaoke`, `caption-highlight`, `caption-gradient-fill`, `caption-weight-shift`, `caption-editorial-emphasis`, `caption-texture`, `caption-particle-burst`, `caption-parallax-layers`, `caption-camera-follow`, `caption-clip-wipe`, `caption-blend-difference`.
- **Rótulos:** familia `lt-*` (accent-underline, bold-block, clean-bar, color-block, dark-card, kicker-name, mask-reveal, neon-border, side-rule, soft-pill, stack-bars).
- **Texto:** `scramble-reveal`, `typewriter`, `per-word-rise`, `per-word-crossfade`, `text-stagger`, `tracking-in`, `stitched-text-draw`, `texture-mask-text`, `strikethrough-replace`.
- **Textura:** `grain-field`, `grain-overlay`, `ordered-dither-pass`, `ascii-render-pass`, `vignette`, `light-sweep-pass`.
- **Cámara:** `camera-shake`, `camera-rig-depth-stack`, `parallax-zoom`, `parallax-unzoom`, `pull-back-reveal`, `push-in`, `focus-rack`, `motion-blur`.

## D. Fuera: imitan marcas, interfaces reales o personas

`apple-money-count`, `blue-sweater-intro-video`, `chatgpt-exchange`, `claude-exchange`, `code-snippet-apple-terminal-pro`, `code-snippet-dark-2026`, `code-snippet-dark-modern`, `heygen-avatar-promo-card`, `instagram-follow`, `ios26-liquid-glass`, `lower-third-bild`, `macos-notification`, `macos-tahoe-liquid-glass`, `north-korea-locked-down`, `nyc-paris-flight`, `reddit-post`, `slack-notification-ad`, `spotify-card`, `tiktok-follow`, `vfx-iphone-device`, `vpn-youtube-spot`, `x-post`, `yt-lower-third`, y los componentes `x-follow-card` y `store-badge-lockup`.

También quedan fuera las skills de pago de HyperFrames (`style-sampling`, `reverse-any-video`), como ya dice el encargo.
