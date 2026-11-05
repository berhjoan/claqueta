# Motores: qué usar para cada video

Regla: un solo motor ensambla. Se abre otro solo cuando el material lo exige, y siempre dentro del que ensambla.

| Necesidad | Motor | Costo | Estado en este sistema |
|---|---|---|---|
| Explicar con voz: títulos, cifras, gráficos, pasos, fotos, en 6 materiales | Kit de escenas, `engines/escenas` | Gratis, MIT | Probado en 4 formatos: `check`, render y cuadros mirados. **Empieza aquí** |
| Un estilo concreto del catálogo | Plantillas de `library/plantillas` | Gratis | Las de esa carpeta están probadas una a una |
| Texto, diagramas, subtítulos, ensamblado final | HyperFrames 0.9.9 | Gratis, Apache-2.0 | Probado: `check`, render y medición |
| Maqueta isométrica con objetos | `engines/isometrico` | Gratis, MIT | Probado |
| Editar una grabación: cortar, limpiar, reencuadrar | `tools/material`, `library/ffmpeg-skill` | Gratis, MIT | Probado en Windows; mira `library/guias/material.md` |
| Tiza, material dibujado | Canvas 2D dentro de HyperFrames, `engines/pizarra` | Gratis | Probado |
| Terminal, tinta, recorte de cine | Motores de `library/lemo-opuscar` | Gratis, MIT | Motor probado en 1080p; en vertical hay que recomponer |
| 3D ligero: maquetas, órbitas, anillos | three.js dentro de una escena | Gratis, MIT | Probado |
| React y plantillas de datos | Remotion | Gratis hasta 3 personas | Sin probar aquí. Mira la licencia abajo |
| Personajes con rig y labios sincronizados | Remotion con `library/skills-propias/video-con-codigo` | Igual que Remotion | Sin probar en este repositorio |
| Diagramas animados con código | Motion Canvas | Gratis, MIT | Sin probar |
| Matemática | Manim Community | Gratis, MIT | Sin probar |
| Corte, filtros, mezcla, medición | ffmpeg | Gratis | Probado |

## Bloques del registro

HyperFrames trae unos 450 bloques editables, gratis, con licencia Apache-2.0: títulos, gráficos, transiciones, subtítulos. Lo probado y copiado aquí está en `library/hyperframes-registro/`; lo demás se busca con `npx hyperframes@0.9.9 catalog --query "..." --json` y se instala con `add`. Casi todos vienen en 1920×1080: recomponlos para vertical, nunca recortes a ciegas. Lo que imita una marca o una interfaz real queda fuera: `docs/registro-hyperframes.md`.

## HyperFrames

- Fija la versión: `npx hyperframes@0.9.9`. Sin `@`, el resultado cambia con cada publicación.
- Skills en `library/hyperframes/skills/`. Empieza por `hyperframes/SKILL.md`, que dirige al resto.
- `library/hyperframes-clasico/skills/` es la versión 0.8.150. Trae `faceless-explainer` y `general-video`, dos flujos que ya no existen en 0.9.x. Se usa con `npx hyperframes@0.8.150`, nunca mezclando versiones en un mismo proyecto.
- Comandos útiles de 0.9.9: `init`, `check`, `snapshot --review`, `render`, `beats`, `audio`, `measure`, `diff`, `compare`, `timeline`, `transcribe`, `tts`.
- **No uses, porque piden cuenta o pago:** `cloud`, `lambda`, `cloudrun`, `templates`, `billing`, `reverse`, `publish`. La skill `style-sampling` también es de pago y por eso no viene incluida.

```bash
npx hyperframes@0.9.9 init mi-video --resolution portrait --non-interactive --skip-skills
cd mi-video
npx hyperframes@0.9.9 check --json
npx hyperframes@0.9.9 render --output renders/final.mp4
```

Las skills ya están en esta biblioteca, y por eso `--skip-skills`: instalarlas de nuevo traería otra versión.

## Canvas 2D dentro de una escena

Para lo que el DOM no da: tiza, trazo que crece, terminal. El patrón completo está en `engines/pizarra/README.md`.

1. Toda la película son datos sin DOM, y se pueden leer también desde Node para sacar los eventos de sonido.
2. `render(t)` dibuja cualquier instante, en cualquier orden. Nada acumula estado entre cuadros.
3. El reloj es un tween proxy de GSAP o `hf-seek`, nunca `requestAnimationFrame`.

## Remotion: revisa la licencia

No es código abierto. Es gratis para personas, empresas de hasta 3 empleados y entidades sin ánimo de lucro. Desde 4 personas pide licencia de pago: US$25 al mes por puesto, o US$0,01 por render con mínimo de US$100 al mes (leído el 2026-11-03 en https://www.remotion.pro/license y https://github.com/remotion-dev/remotion/blob/main/LICENSE.md). Por eso no es el motor por defecto.

- `npx create-video@latest --blank`.
- Todo deriva de `useCurrentFrame()`. `interpolate` con `clamp`. `random(seed)` de Remotion.
- Nada de CSS `transition` o `animation`, `Math.random`, `Date` ni temporizadores.
- Las skills oficiales están en `remotion-dev/skills`, que no declara licencia y por eso no vienen aquí. Instálalas con `npx skills add remotion-dev/skills` si el proyecto usa Remotion.
- Para pasar de Remotion a HyperFrames: `library/hyperframes/skills/remotion-to-hyperframes/`.

## GSAP

HyperFrames anima con GSAP. Su licencia permite el uso comercial y el código generado por IA, pero prohíbe usarlo en herramientas visuales de animación sin código que compitan con Webflow (https://gsap.com/standard-license/). Claqueta genera prompts y no anima, así que hacer un video con estas herramientas no entra en esa cláusula, según mi lectura. No es asesoría legal: si conviertes esto en un editor visual, revísala. La salida es Anime.js (MIT).

## Transiciones por shader

`gl-transitions` (https://github.com/gl-transitions/gl-transitions) trae más de 100 transiciones GLSL listas; su archivo LICENSE es MIT y dos transiciones van bajo BSD. HyperFrames 0.9.9 también trae transiciones por shader: mira `library/hyperframes/skills/hyperframes/references/format.md`.

## Sin motor: IA generativa de video

Solo como toma de apoyo imposible de dibujar, y solo si alguien decide pagar. Este sistema no lo necesita. Logo, texto, voz y música siempre van en código.
