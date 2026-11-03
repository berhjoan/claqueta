---
name: motion-system
description: Guía maestra del usuario para producción visual y motion design en CUALQUIER proyecto — MOTION.md como constitución visual por proyecto, brief y storyboard antes de animar, la música como reloj editorial, motion determinista y editable (HyperFrames para piezas de video, After Effects por MCP solo si hay .aep), y el ciclo de QA de frames y render. Usar antes de diseñar, animar, generar, editar o renderizar cualquier pieza visual o de movimiento (videos de producto, demos, lanzamientos, reels, animaciones de interfaz, videos de ayuda), al preparar un repositorio como "MOTION-READY", o cuando el usuario mencione MOTION.md, HyperFrames, motion design o After Effects.
---

# Claude Motion System — guía maestra del usuario

La guía completa está en `GUIA-MAESTRA.md` (misma carpeta, 20 secciones). **No la cargues entera**: lee la sección que la tarea necesita (busca el encabezado `# N.` con Grep y lee ese tramo).

## Regla principal (§0)

Antes de diseñar, generar, animar, editar o renderizar cualquier elemento visual de un proyecto, **lee `MOTION.md` completo** (raíz del repositorio). Si no existe, está vacío o ya no representa el diseño real, primero audita el proyecto y créalo o actualízalo. El motion refuerza información, jerarquía, narrativa y marca; nunca es decoración ni una demo genérica de IA.

## Rutina

1. **Descubrir (§3):** README, CLAUDE.md, package.json, tokens CSS/Tailwind, componentes y layouts, logos, fuentes, assets, capturas, Figma, videos y audio existentes. Responder: personalidad, colores dominantes y funcionales, tipografías reales, jerarquía, qué movimiento es coherente y qué nunca debe cambiar.
2. **Clasificar (§3):** A sin necesidad de motion (no instalar nada) · B app con potencial de demos (crear `MOTION.md`, sin proyecto de video) · C motion/video activo (preparar HyperFrames y QA) · D con After Effects (además, MCP de AE).
3. **`MOTION.md` (§5):** propósito, identidad, color, tipografía, grid, lenguaje de movimiento (principios, timing, easing, prohibiciones), motion por componente, cámara/3D, audio, cortes, formatos y quality bar. Se construye desde la identidad REAL; complementa al design system, no lo reemplaza. Si el producto cambió, se corrige antes de producir.
4. **Pieza nueva:** `BRIEF.md` (§6) → `STORYBOARD.md` (§7). Cada escena cumple una función narrativa, informativa o de marca.
5. **Audio (§8):** la música es el reloj editorial — beats fiables, frases, drops, silencios; no forzar una grilla de beat.
6. **Implementar (§9):** HyperFrames (`/hyperframes` como entrada) o el motor que el proyecto ya tenga. **No duplicar engines** (§13): si el repositorio ya tiene un motor de motion propio, se usa ese.
7. **QA (§11):** doctor → lint → check → snapshots de frames críticos (mirarlos) → preview completo → render → `ffprobe` y revisión del archivo final. Nunca "listo" solo porque compila.
8. **Criterio "no se ve barato" (§12)** y **definición de listo (§17):** MOTION-READY y DELIVERY-READY.

## Reglas de seguridad y deuda

- No instalar dependencias de video en proyectos que no producen video (§3, §13).
- `npx` de terceros (HyperFrames, MCP de After Effects) solo cuando se va a producir y con el visto bueno de la usuaria.
- After Effects por MCP solo si existe un `.aep` o la entrega lo exige; backup antes de tocarlo (§10).
- Assets reales de la marca; nunca inventar logos, datos, capturas ni claims (§15). Datos de clientes, nunca en piezas visuales sin aprobación.
- Recomponer por formato (16:9, 9:16, 1:1), nunca recorte ciego (§16).

## Índice de la guía

| § | Tema |
|---|---|
| 0 | Orden maestra |
| 1 | Qué enseña el video (HyperFrames, MOTION.md, música, After Effects) |
| 2 | Arquitectura global + por proyecto |
| 3 | Bootstrap: descubrimiento y clasificación |
| 4 | Instalar/verificar HyperFrames |
| 5 | Plantilla de `MOTION.md` |
| 6 | `BRIEF.md` |
| 7 | `STORYBOARD.md` |
| 8 | Audio como reloj editorial |
| 9 | Implementación con HyperFrames |
| 10 | After Effects por MCP |
| 11 | Pipeline de QA obligatorio |
| 12 | Criterio "no se ve barato" |
| 13 | No deuda técnica |
| 14 | Organización recomendada |
| 15 | Política de assets |
| 16 | Multiformato |
| 17 | Definición de "listo" |
| 18 | Prompt único para preparar un repositorio |
| 19 | Comandos de referencia |
| 20 | Principio final |
