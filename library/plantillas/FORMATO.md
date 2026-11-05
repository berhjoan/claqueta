# Formato de una plantilla de estilo

Una plantilla es la prueba de que un estilo funciona: una escena vertical de código, ya renderizada y mirada. Un estilo pasa a «probado» solo si tiene ficha completa, paleta propia, plantilla y muestra.

## Archivos

```text
library/plantillas/<id>/
  escena.html    La escena
  ficha.json     Sus datos
  muestra.jpg    Un cuadro real del render, 540×960, menos de 120 KB
```

`<id>` es el id del catálogo: `S16`, `L-whiteboard`. Un estilo nuevo usa un id que empieza por `R-`, como `R-aurora`.

## `escena.html`

- Es una composición de HyperFrames 0.9.9, en `<template>`, con su raíz `data-composition-id="<id>"`, `data-start="0"`, `data-duration="4"`, `data-width="1080"` y `data-height="1920"`.
- La raíz lleva `data-composition-variables` con cada texto: id, tipo `string`, etiqueta y un valor por defecto en español, neutro y sin datos inventados. Cada texto se enlaza con `data-var-text="<variable>"`.
- **Colores por variable, con el color propio del estilo como respaldo:** `var(--fondo, #EFE6D2)`, `var(--tinta, …)`, `var(--acento, …)`, `var(--segundo, …)`, `var(--superficie, …)`. Así se ve con su paleta y acepta otra. Los colores que dependen del material, como tres primarios de Bauhaus, pueden quedar fijos si la ficha lo dice.
- **Fuentes por variable y solo las que trae el sistema:** `var(--display, "Archivo Black")`, `var(--cuerpo, "Archivo")`, `var(--datos, "JetBrains Mono")`. Las familias están en `assets/fonts/fuentes.json`. No se baja ninguna ni se usa un CDN.
- **Ids y clases con prefijo único:** `pl-s16-…`. Varias plantillas conviven en un mismo video. Los ids no empiezan por un dígito.
- **Tiempo:** dura 4 s, todos los tiempos son locales y no depende de la escena vecina. Lo que se anima termina antes de 3,2 s y luego se sostiene: si se monta más larga, queda quieta en su estado final y sigue siendo un póster. Sin barridos de entrada ni salida: las transiciones las pone quien la monta.
- **Determinista:** función del tiempo. Nada de `Date.now`, `Math.random` sin semilla, temporizadores ni `requestAnimationFrame` como reloj. El reloj de un lienzo es un tween proxy de GSAP. Registra `window.__timelines["<id>"]` con la misma clave de la raíz.
- **Zonas:** 72 px de margen lateral, nada clave antes de y 240, contenido hasta y 1280, sin texto en y 1300–1540 porque ahí van los subtítulos, y riel derecho libre. El mundo y sus texturas sí llenan los 1920 px. El sujeto ocupa al menos el 40 % del cuadro. Nada que deba leerse por debajo de 44 px.
- **Sin nada ajeno:** sin marcas, logos, interfaces reales, personas ni personajes. Sin URL externas. Un archivo solo: los recursos van incrustados o se dibujan con código.

Una escena con shader declara `"requiere": ["webgpu", "assets/lib/shaders.iife.js"]` en su ficha, lleva `data-requires-webgpu` en la raíz y un degradado de reserva: así el kit copia el motor, y sin él la escena sigue viéndose.

## `ficha.json`

```json
{
  "id": "S16",
  "nombre": "Bauhaus geométrico",
  "duracion": 4,
  "variables": [{ "id": "titulo", "etiqueta": "Título", "defecto": "Forma y función", "max": 14 }],
  "paleta": { "fondo": "#EFE6D2", "tinta": "#111111", "acento": "#D62828", "segundo": "#1D4E89", "superficie": "#E3D8C0" },
  "fuentes": ["Archivo Black", "Archivo"],
  "rasgos": ["Retícula visible", "Módulos que giran 90°"],
  "sonidos": [{ "t": 0.3, "sonido": "clic", "ganancia": -14 }],
  "origen": "propia",
  "licencia": "MIT",
  "probado": { "motor": "hyperframes@0.9.9", "check": "0 errores", "render": true, "fecha": "2026-11-05" }
}
```

- `max` es el largo de texto con el que la composición sigue funcionando. Prueba la plantilla con un texto de ese largo, no solo con el corto.
- `sonidos` usa los nombres de `python tools/audio/efecto.py --listar`, en segundos locales.
- `origen`: `propia`, o `registro:<bloque>` si parte del registro de HyperFrames. En ese caso `licencia` dice la suya.
- `probado` se escribe solo si corriste de verdad `check` y `render`, y miraste los cuadros.

## Cómo se comprueba

En una carpeta de prueba fuera del repositorio, con `.claqueta` al lado:

```bash
npx hyperframes@0.9.9 init proyecto --resolution portrait --non-interactive --skip-skills
```

1. Monta la escena desde `index.html` con `data-composition-src`, una vez con sus textos por defecto y otra con textos del largo `max`.
2. `npx hyperframes@0.9.9 check --json`: 0 errores. Un aviso solo se deja si un cuadro demuestra que es falso.
3. `npx hyperframes@0.9.9 render --output renders/final.mp4 --fps 30 --crf 18`, en primer plano: en segundo plano se cancela.
4. Mira cuadros reales, al menos en 0,1 s, 1 s, 2 s y 3,8 s: primer cuadro con imagen, nada cortado, tildes, contraste, sujeto grande.
5. Con el texto de largo `max` también.
6. Saca `muestra.jpg` del cuadro más representativo.
