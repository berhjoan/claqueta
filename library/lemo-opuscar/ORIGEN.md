# Origen de esta copia

- **Fuente:** https://github.com/lemomo-ai/lemo-opuscar
- **Commit:** `bebbbe1aa92a3cb4bb6f83500e61b23a17d1aa00`
- **Licencia del código:** MIT (`LICENSE`).
- **Licencia de demos y carteles:** CC BY 4.0, con crédito a lemo-opuscar. Las miniaturas `L-*` del panel salen de esos carteles.

## Qué se copió

`DIRECTOR.md`, `TECHNIQUE.md`, `MY-STYLES.md`, `LICENSE`, los archivos versionados de `core/` y, por cada estilo, `STYLE.md`, `DEMO.md` y `style.json`.

## Qué no se copió

- Las películas de demostración, porque pesan demasiado.
- Las librerías de instrumentos y los HDRI, porque el propio repositorio las baja aparte:

```bash
git clone https://github.com/lemomo-ai/lemo-opuscar .lemo
cd .lemo
git checkout bebbbe1
sh tools/fetch.sh instruments vsco2ce
```

- El plugin. Esta copia se usa como biblioteca: nada se instala en tu asistente.

## Cómo usarlo bien

1. Lee `DIRECTOR.md` para dirigir y `TECHNIQUE.md` para los comandos.
2. Abre `styles/<estilo>/STYLE.md` y copia del estilo su vocabulario de material, cámara y sonido.
3. Si necesitas el motor completo con sus comandos, clona el repositorio en el commit de arriba.

## Avisos

- **El autor afina el sistema para Claude Opus 5.5.** Otras IA pueden no reproducir la misma calidad.
- **Su mascota no se usa.** Nada de personajes ni marcas ajenas en tus videos, tampoco los que aparecen en estos demos.
- **`setup.sh deps` no sirve en Windows, y sus documentos sugieren WSL:** no hace falta. `video.mjs` funciona con `PLAYWRIGHT_CHROME`, `mux.sh` funciona en Git Bash, y para tiza `engines/pizarra` ya trae lo necesario.
- **El vertical no sale solo.** Con `--size 1080x1920`, terminal e isométrico quedan con media pantalla vacía. Hay que recomponer.
- Tres estilos parecen homenajes a marcas conocidas (`scifi-toon`, `brick-toy`, `paper-popup`): su miniatura no se publica en el panel. Si los usas, no copies personajes ni diseños reconocibles.
