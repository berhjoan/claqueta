# Claqueta

Lee `AGENTS.md`: ahí están las reglas, el orden de lectura y los comandos.

Si haces un video para alguien, copia las skills a tu proyecto para que Claude Code las cargue:

```bash
mkdir -p .claude/skills
cp -r .claqueta/library/hyperframes/skills/* .claude/skills/
```

## Si trabajas en el propio sistema

- Sin paso de construcción: módulos ES y datos en `data/*.js`. Sirve la raíz con cualquier servidor estático: `python -m http.server 4173`.
- `npm test`: comprueba catálogo, prompt, enlaces y herramientas.
- `node scripts/armar-biblioteca.mjs`: regenera `library/manifest.json` y `library/guias/diccionario.md`. Córrelo si cambias opciones o documentos.
- Toda opción lleva `n: [es, en]` y `p: [es, en]`. Lo literal en español nunca se traduce.
- El texto del usuario entra por propiedades del DOM, nunca como HTML.
- Mira `docs/mantener.md` antes de actualizar lo copiado de otros repositorios.
