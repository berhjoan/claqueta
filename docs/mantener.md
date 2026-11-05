# Mantener lo copiado

Todo lo que viene de otros repositorios está fijado. Actualizar es una decisión, no un efecto colateral.

## HyperFrames

1. Mira el cambio de versión y prueba `check`, `render` y `verificar_video.py` en una escena con Canvas.
2. Copia las skills de la etiqueta nueva, sin `style-sampling` ni `*.test.mjs`:

```bash
git clone --depth 1 --filter=blob:none --sparse --branch vX.Y.Z https://github.com/heygen-com/hyperframes hf
git -C hf sparse-checkout set --no-cone '/skills/**' /LICENSE
```

3. Cambia `VERSION_HF` en `data/motor.js`, y las rutas de `documentos()` en `app/prompt.js` si cambiaron.
4. Corre `node scripts/armar-biblioteca.mjs` y `npm test`.

`library/hyperframes-clasico` se queda en 0.8.150 mientras los flujos `faceless-explainer` y `general-video` hagan falta.

No corras `npx hyperframes skills update` sobre esta copia: puede borrar documentos que estos flujos todavía citan.

## lemo-opuscar

Actualiza el commit en `library/lemo-opuscar/ORIGEN.md`, `NOTICE.md` y en la opción `sampler` de `data/sonido.js`. Copia `DIRECTOR.md`, `TECHNIQUE.md`, `MY-STYLES.md`, `LICENSE`, lo versionado de `core/` y, por estilo, `STYLE.md`, `DEMO.md` y `style.json`. Las miniaturas `L-*` salen de sus carteles, a 300 px de alto.

## FFmpeg Skill

Copia fijada en `library/ffmpeg-skill/ORIGEN.md`. Actualiza el commit ahí y en `NOTICE.md`, y vuelve a probar en Windows lo que dice esa guía: 17 de las 42 herramientas se probaron de verdad.

## Registro de HyperFrames

Copia fijada en `library/hyperframes-registro/ORIGEN.md`. Lo que imita una marca o una interfaz real no entra: `docs/registro-hyperframes.md`, lista D.

## Fuentes e iconos

`assets/fonts/fuentes.json` lista las familias y las tipografías del panel. Si agregas una, mídela: `CHROME=<ruta> node scripts/medir-fuentes.mjs`, que también avisa si le faltan letras del español. La ruta sale de `npx hyperframes@0.9.9 browser path`. `assets/iconos/` es Lucide (ISC).

## Estilos

`data/styles.json` es la fuente: paleta, `piel` del kit, `plantilla`, estado y miniatura. `node scripts/unir-estilos.mjs` marca qué estilos tienen plantilla, usa la miniatura en sus colores si existe y agrega los de `data/estilos-registro.json`.

Un estilo pasa a «probado» solo con ficha completa, paleta, plantilla y muestra: `library/plantillas/FORMATO.md`.

## Radar

`data/radar.json` y `docs/radar.md` son una foto del 2026-11-03. Antes de confiar en una licencia o un precio, vuelve a mirarlo en la fuente.

## Antes de publicar

- `npm test`.
- Ninguna llave, correo privado, ruta de tu computador ni dato de clientes.
- Publicar es solo empujar `main`: GitHub Pages sirve la raíz.
