# GUÍA MAESTRA — CLAUDE MOTION SYSTEM
## Estándar reutilizable para dejar todos los proyectos preparados para motion design, demos, lanzamientos y contenido visual

> Objetivo: convertir a Claude Code en un agente capaz de **entender la identidad visual de cada proyecto, documentarla, planificar motion design, producir animación determinista, sincronizar con audio, inspeccionar sus propios frames y —cuando corresponda— controlar After Effects mediante MCP**.

---

# 0. ORDEN MAESTRA PARA CLAUDE

Usa este documento como política operativa.

**Regla principal:**

> Antes de diseñar, generar, animar, editar o renderizar cualquier elemento visual de un proyecto, lee `MOTION.md` completo. Si no existe, está vacío o ya no representa el diseño real del proyecto, primero audita el proyecto y créalo/actualízalo. No comiences la producción visual hasta comprender la identidad, jerarquía, tipografía, color, ritmo, composición y lenguaje de movimiento del producto.

No trates el motion como decoración. Debe reforzar información, jerarquía, narrativa, percepción de calidad y personalidad de marca.

No generes una demo genérica de IA. El resultado debe parecer creado **para ese producto y esa marca**.

---

# 1. QUÉ ENSEÑA EL VIDEO Y CÓMO LO CONVERTIMOS EN SISTEMA

El video propone cuatro piezas:

1. **Claude Code + HyperFrames** para escribir y animar cada cuadro mediante código.
2. **`MOTION.md`** como constitución visual del proyecto: colores, tipografía, timing y reglas.
3. **Música como reloj editorial:** analizar el track y hacer que cortes/impactos respondan al ritmo.
4. **After Effects conectado por MCP** para proyectos que necesiten composición, edición o acabado dentro de AE.

Esta guía amplía esa idea para convertirla en un pipeline repetible y auditable.

---

# 2. ARQUITECTURA: GLOBAL + POR PROYECTO

## Capa A — Global de Claude

La política general debe vivir en la memoria/instrucciones de usuario de Claude Code para aplicarse en todos los repositorios.

Archivo recomendado:

```text
~/.claude/CLAUDE.md
```

Añadir como mínimo:

```md
## Motion / Visual Production Protocol

- Antes de diseñar, generar, animar o renderizar, busca `MOTION.md` en la raíz del proyecto y léelo completo.
- Si `MOTION.md` no existe o está desactualizado, audita primero la identidad visual real del proyecto y créalo/actualízalo.
- Para motion programático prioriza HyperFrames y sus skills oficiales.
- No inventes una estética genérica si el proyecto ya tiene marca, UI, design system o referencias.
- La música y el audio forman parte del timing. Sincroniza eventos visuales con beats, frases, golpes o pausas cuando exista audio.
- Inspecciona frames reales y la salida renderizada; no declares calidad basándote solamente en el código.
- Usa After Effects por MCP solamente cuando el proyecto o el usuario lo requieran.
- Conserva editabilidad: fuentes, assets, capas, timings, composiciones y proyecto fuente deben permanecer modificables.
- Nunca sacrifiques legibilidad por movimiento.
- No des por terminado un trabajo visual mientras existan errores de layout, overflow, contraste, assets faltantes, frames rotos o timing incoherente.
```

## Capa B — Específica de cada proyecto

Cada proyecto visual debe tener en su raíz:

```text
MOTION.md
```

`MOTION.md` NO debe ser una copia idéntica entre repositorios. Claude debe construirlo a partir de la identidad real de cada proyecto.

Cuando exista un design system, `MOTION.md` lo complementa; no lo reemplaza.

---

# 3. BOOTSTRAP AUTOMÁTICO QUE CLAUDE DEBE HACER EN CADA PROYECTO

Cuando se abra un repositorio nuevo o se solicite preparar un proyecto:

## Fase 1 — Descubrimiento

Claude debe inspeccionar, según exista:

- `README.md`
- `CLAUDE.md`
- `package.json`
- configuración Tailwind / CSS / tokens
- componentes UI compartidos
- layouts principales
- logos e iconos
- fuentes locales
- assets gráficos
- screenshots o diseños de referencia
- Figma u otros documentos de diseño disponibles
- páginas principales del producto
- videos y audio ya existentes
- convenciones del repositorio y comandos de test/build

Debe responder internamente estas preguntas antes de tocar el motion:

- ¿Cuál es la personalidad de la marca?
- ¿Cuál es el color dominante y cuáles son los colores funcionales?
- ¿Qué tipografías son realmente las usadas?
- ¿Cómo funciona la jerarquía visual?
- ¿Qué tipo de movimiento sería coherente con esta interfaz?
- ¿El producto pide movimiento sobrio, editorial, técnico, cinemático, lúdico, premium, agresivo, etc.?
- ¿Qué elementos nunca deben cambiarse?

## Fase 2 — Clasificación

Clasificar el proyecto:

### A. Proyecto sin necesidad visual/motion inmediata

No instalar dependencias pesadas ni crear un video inútil.

Solo mantener la regla global preparada.

### B. Producto web/app con capacidad de promoción o demos

Crear/actualizar `MOTION.md` y dejar definido el lenguaje de movimiento. No crear todavía un proyecto de video si nadie lo pidió.

### C. Proyecto con motion/video activo

Preparar HyperFrames, estructura de assets y pipeline de QA.

### D. Proyecto con After Effects

Además, verificar el MCP de After Effects.

---

# 4. INSTALAR / VERIFICAR HYPERFRAMES

El video usa:

```bash
npx skills add heygen-com/hyperframes
```

Para un agente o una instalación ya existente, también puede verificarse/refrescarse el conjunto oficial de skills:

```bash
npx hyperframes skills check
npx hyperframes skills update
```

Antes de producción:

```bash
npx hyperframes doctor
```

Dependencias esperadas para trabajo local:

- Node.js 22+
- FFmpeg
- navegador/headless runtime compatible

No asumir que el entorno funciona. Verificarlo.

---

# 5. `MOTION.md` — CONTRATO VISUAL OBLIGATORIO

Claude debe crear algo de este estilo, pero adaptado al proyecto real:

```md
# MOTION.md — <NOMBRE DEL PROYECTO>

## 1. Propósito
Qué debe transmitir visualmente el producto y qué papel cumple el movimiento.

## 2. Identidad de marca
- Personalidad:
- Sensaciones prioritarias:
- Sensaciones prohibidas:
- Referencias:

## 3. Color
### Primarios
- <nombre>: #HEX — uso

### Secundarios
- ...

### Superficies
- fondo:
- superficie elevada:
- borde:

### Estados
- éxito:
- advertencia:
- error:
- información:

## 4. Tipografía
- Display / títulos:
- UI / cuerpo:
- Mono / datos:
- pesos autorizados:
- casing:
- tracking:
- reglas de longitud:

## 5. Grid y composición
- márgenes:
- safe areas:
- alineaciones:
- densidad:
- radios:
- reglas responsive:

## 6. Lenguaje de movimiento
### Principios
- El movimiento debe tener causa.
- El movimiento debe dirigir la atención.
- Evitar animación ornamental permanente.
- Una transición debe continuar o resolver la energía de la anterior.

### Timing base
- microinteracción:
- entrada corta:
- transición de escena:
- reveal principal:
- hold mínimo de texto:

### Easing
Curva base recomendada del proyecto:
`cubic-bezier(...)`

Definir:
- entrada
- salida
- énfasis
- cámara

### Prohibiciones
- rebotes sin intención
- elastic/bounce como estilo por defecto
- wobble permanente
- fades genéricos repetidos
- texto ilegible por velocidad
- transiciones que no aportan significado

## 7. Motion por componente
- títulos
- botones
- cards
- métricas
- charts
- modal/drawer
- navegación
- logos
- screenshots/product UI

## 8. Cámara / profundidad / 3D
Cuándo usar Z, perspectiva, parallax o Three.js y cuándo NO hacerlo.

## 9. Audio
- música:
- BPM si aplica:
- beat/phrase policy:
- SFX:
- ducking:
- silencios intencionales:

## 10. Cortes
Los cortes deben responder a acontecimientos musicales o narrativos.
No forzar un corte por beat si el track no tiene una grilla fiable.

## 11. Formatos de salida
- 16:9
- 9:16
- 1:1
- resolución
- FPS
- duración objetivo

## 12. Quality bar
Lista de criterios que debe superar el trabajo antes de considerarse terminado.
```

### Regla de actualización

Si Claude descubre que el producto real ya cambió de tipografía, paleta, UI o estilo, debe corregir `MOTION.md` antes de producir nuevas piezas.

---

# 6. BRIEF ANTES DE ANIMAR

Para una pieza nueva, Claude debe generar o completar `BRIEF.md` con:

```md
# BRIEF

## Objetivo
Qué debe lograr la pieza.

## Audiencia
Quién la verá.

## Mensaje central
Una sola idea principal.

## CTA
Qué debe hacer o entender el espectador al terminar.

## Duración
...

## Formato
16:9 / 9:16 / 1:1

## Assets disponibles
...

## Audio
...

## Escenas obligatorias
...

## Restricciones
...
```

No empezar una producción compleja con requisitos ambiguos si puede resolverlos leyendo el proyecto.

---

# 7. STORYBOARD PRIMERO, IMPLEMENTACIÓN DESPUÉS

Antes del código final:

1. definir hook inicial;
2. dividir la historia en escenas;
3. asignar objetivo a cada escena;
4. definir qué entra y qué sale;
5. describir transición entre escenas;
6. indicar elementos que persisten entre cortes;
7. marcar puntos de audio relevantes;
8. fijar cierre/CTA.

Archivo recomendado:

```text
STORYBOARD.md
```

Una escena no debe existir solo porque “se ve bonita”. Debe cumplir función narrativa, informativa o de marca.

---

# 8. AUDIO: USAR LA MÚSICA COMO RELOJ EDITORIAL

El video enfatiza que los cortes deben caer sobre el ritmo.

La versión profesional es:

- detectar duración;
- identificar BPM cuando sea confiable;
- identificar beats fuertes;
- detectar hard stops;
- identificar frases musicales;
- localizar subidas, drops y pausas;
- asignar cortes, reveals, scale hits y transiciones a esos eventos;
- mantener lectura suficiente para títulos y mensajes.

HyperFrames puede trabajar con audio y dispone de un workflow `music-to-video`.

Para material hablado también puede transcribirse:

```bash
npx hyperframes transcribe <archivo>
```

## Regla

**No significa “cortar en cada beat”.**

Significa que ningún evento editorial importante debe sentirse fuera de ritmo. En música suave o sin beat fiable, usar frases y cambios de energía en lugar de imponer una cuadrícula artificial.

---

# 9. IMPLEMENTACIÓN CON HYPERFRAMES

Claude debe usar `/hyperframes` como punto de entrada cuando esté disponible.

El sistema es HTML/CSS/JS con animación seekable y determinista; GSAP es una de las herramientas principales.

Ejemplo conceptual:

```js
const tl = gsap.timeline();

tl.fromTo(
  '.hero',
  { y: 80, opacity: 0 },
  { y: 0, opacity: 1, duration: 0.7, ease: 'power3.out' }
);
```

No copiar este ejemplo mecánicamente. El easing, timing y composición deben salir de `MOTION.md`.

## Reglas de calidad

- Evitar “texto centrado + gradiente + fade” como respuesta automática.
- Una pieza debe exhibir variedad de composición, pero no caos.
- Priorizar continuidad entre escenas.
- El movimiento que sale de una escena debe informar cómo entra la siguiente.
- Evitar bounce/elastic salvo intención explícita de la marca.
- Introducir pausas y quietud cuando aumenten el impacto.
- Mantener el contenido editable.

---

# 10. AFTER EFFECTS POR MCP — CUÁNDO Y CÓMO

Usar esta capa cuando:

- existe un `.aep` que hay que inspeccionar o editar;
- el cliente necesita proyecto AE editable;
- se requieren capas, máscaras, efectos, keyframes o composición propios de AE;
- hay que integrar una pieza generada por código dentro de una postproducción existente.

Registro para Claude Code:

```bash
claude mcp add aftereffects -- npx -y @kumoproductions/mcp-aftereffects
```

Requisitos del MCP:

- Windows o macOS
- After Effects 2024–2026
- Node.js 24+

En After Effects activar:

```text
Preferences
→ Scripting & Expressions
→ Allow Scripts to Write Files and Access Network
```

## Política de seguridad

Antes de tocar un `.aep` importante:

1. confirmar proyecto correcto;
2. guardar backup/versionado;
3. inspeccionar composición y capas;
4. aplicar cambios pequeños y verificables;
5. renderizar frames de prueba;
6. guardar solo después de verificar.

Para material confidencial, tener presente que los nombres de comps/capas, expresiones, keyframes o rutas que el MCP lea pueden formar parte del contexto enviado al proveedor de IA.

---

# 11. PIPELINE DE QA OBLIGATORIO

Claude NO puede decir “listo” únicamente porque el HTML/JS compila.

## Paso A — Diagnóstico

```bash
npx hyperframes doctor
```

## Paso B — Lint rápido durante el trabajo

```bash
npx hyperframes lint
```

## Paso C — Gate final

```bash
npx hyperframes check
```

Cuando la pieza sea crítica o CI lo requiera:

```bash
npx hyperframes check --strict
```

## Paso D — Frames de inspección

Capturar el comienzo, transiciones, momentos importantes y final:

```bash
npx hyperframes snapshot --at 0,2,5,8
```

Los timestamps deben elegirse según la pieza real.

Claude debe **mirar esos frames**, no solo generarlos.

Comprobar:

- clipping
- overflow
- texto cortado
- colisiones
- contraste
- assets ausentes
- fondos negros inesperados
- composición desequilibrada
- incoherencias de marca
- glitches de transformación

## Paso E — Preview

```bash
npx hyperframes preview
```

Revisar la secuencia completa y el timing real.

## Paso F — Render

Solo después de superar los gates:

```bash
npx hyperframes render --output final.mp4
```

Para un master de mayor calidad:

```bash
npx hyperframes render --quality high --output master.mp4
```

Si el destino exige 60 fps:

```bash
npx hyperframes render --fps 60 --output final-60fps.mp4
```

## Paso G — Verificar el archivo producido

```bash
ffprobe -v error -show_format -show_streams final.mp4
```

Y **reproducir/inspeccionar el MP4 final**. Preview correcto no garantiza entrega correcta.

---

# 12. CRITERIO “NO SE VE BARATO”

Antes de aceptar un resultado, Claude debe preguntar internamente:

### Diseño
- ¿parece diseñado específicamente para esta marca?
- ¿hay jerarquía o todos los objetos compiten?
- ¿hay suficiente espacio negativo?
- ¿la tipografía es consistente?

### Motion
- ¿las entradas tienen propósito?
- ¿las salidas preparan la siguiente escena?
- ¿se abusa de bounce, zoom o glow?
- ¿las transiciones parecen presets genéricos?
- ¿hay momentos de quietud?

### Ritmo
- ¿el ojo sabe dónde mirar?
- ¿el texto permanece el tiempo necesario?
- ¿los cortes y golpes visuales están musicalmente justificados?

### Producción
- ¿todos los assets son nítidos?
- ¿hay pixelación o interpolaciones deficientes?
- ¿el render conserva FPS, resolución y audio correctos?

### Producto
- ¿la pieza explica algo real?
- ¿se muestran las funciones correctas?
- ¿hay inventos que el producto no hace?

Si alguna respuesta crítica es “no”, el trabajo sigue abierto.

---

# 13. NO DEUDA TÉCNICA

Claude debe evitar:

- duplicar engines de motion sin necesidad;
- instalar librerías incompatibles solo para una escena;
- dejar assets remotos frágiles si el proyecto necesita render reproducible;
- hardcodear colores que contradicen los tokens del producto;
- copiar fuentes sin licencia;
- crear scripts temporales sin ubicación y nombre claros;
- dejar renders finales mezclados con código fuente;
- sobrescribir archivos maestros sin backup;
- generar `.aep` o composiciones con nombres tipo `Layer 1`, `Comp 1`, etc.;
- declarar “done” con warnings críticos.

---

# 14. ORGANIZACIÓN RECOMENDADA

No forzar esta estructura si el proyecto ya tiene una convención mejor.

```text
PROJECT/
├─ CLAUDE.md
├─ MOTION.md
├─ BRIEF.md                 # cuando exista una producción activa
├─ STORYBOARD.md            # cuando exista una producción activa
├─ assets/
│  ├─ brand/
│  ├─ images/
│  ├─ video/
│  ├─ audio/
│  └─ fonts/
├─ motion/                  # solo si el proyecto produce video/motion
│  ├─ compositions/
│  └─ scripts/
├─ renders/
│  ├─ previews/
│  └─ final/
└─ qa/
   └─ frames/
```

Si HyperFrames genera una estructura propia, respetarla en vez de pelear contra ella.

---

# 15. POLÍTICA DE ASSETS

Claude debe preferir assets reales de la marca.

Orden de prioridad:

1. assets del repositorio;
2. design system / Figma autorizado;
3. screenshots reales del producto;
4. librería corporativa;
5. generación de nuevos assets cuando sea necesaria y esté permitida.

Nunca inventar logos, datos, capturas de producto o claims.

Para cada asset importante registrar:

- origen;
- licencia/permiso si aplica;
- tamaño/resolución;
- variante usada;
- tratamiento realizado.

---

# 16. RESPONSIVE / MULTIFORMATO

Cuando una pieza deba salir en varias relaciones de aspecto, no hacer crop ciego.

Claude debe recomponer:

### 16:9
Presentación, YouTube, pantallas de escritorio.

### 9:16
Reels, TikTok, Shorts.

### 1:1
Feed/social.

Para cada formato validar safe areas, tamaños mínimos de tipografía y jerarquía.

---

# 17. DEFINICIÓN DE “LISTO”

Un proyecto queda **MOTION-READY** cuando:

- [ ] Claude conoce las reglas globales.
- [ ] `MOTION.md` existe y corresponde al diseño real.
- [ ] HyperFrames está disponible si el proyecto requiere video.
- [ ] `npx hyperframes doctor` no reporta bloqueos relevantes.
- [ ] existe una política clara de audio/timing.
- [ ] los assets de marca están identificados.
- [ ] las restricciones de diseño están documentadas.
- [ ] el flujo de QA está definido.
- [ ] After Effects MCP está configurado solo si hace falta.
- [ ] no se introdujeron dependencias innecesarias en proyectos que no producen motion.

Una pieza queda **DELIVERY-READY** cuando además:

- [ ] `BRIEF.md` está resuelto.
- [ ] `STORYBOARD.md` refleja la producción.
- [ ] lint pasa.
- [ ] check pasa.
- [ ] frames críticos fueron inspeccionados visualmente.
- [ ] preview completo fue revisado.
- [ ] render final fue inspeccionado.
- [ ] resolución/FPS/audio son correctos.
- [ ] fuentes y assets no están rotos.
- [ ] no existen claims falsos ni contenido inventado del producto.
- [ ] los archivos fuente permanecen editables.

---

# 18. PROMPT ÚNICO PARA ENTREGARLE A CLAUDE

Copia este bloque en Claude Code cuando quieras preparar un repositorio:

```text
Quiero que dejes este proyecto completamente MOTION-READY siguiendo el estándar de producción visual del repositorio.

1. Audita primero el proyecto completo y entiende su identidad real: marca, UI, colores, tipografías, spacing, componentes, assets, design system y estilo visual. No inventes una identidad nueva si ya existe una.

2. Lee CLAUDE.md y cualquier guía visual existente. Si existe MOTION.md, léelo completo y valida que siga siendo correcto. Si no existe o está desactualizado, crea/actualiza MOTION.md con: identidad, paleta, tipografía, composición, lenguaje de movimiento, timing, easing, transiciones, prohibiciones, audio, formatos y quality bar.

3. No instales dependencias de video si este repositorio no las necesita. Si tiene o tendrá motion/video, verifica HyperFrames y sus skills oficiales. Usa /hyperframes como router cuando esté disponible y ejecuta npx hyperframes doctor antes de producir.

4. Si se va a crear una pieza, define primero BRIEF.md y STORYBOARD.md. Cada escena debe tener una función narrativa o informativa. Evita motion genérico de IA.

5. Cuando haya música, analiza su estructura. Sincroniza cortes, reveals y énfasis con beats, frases, drops, silencios o hard stops. No fuerces una grilla de beat si la música no la soporta. Mantén la legibilidad por encima de la cantidad de cortes.

6. Implementa el motion de forma determinista y editable. Prioriza continuidad, dirección de atención y causalidad. Evita bounce/elastic, zooms, glow, partículas o transiciones de preset si no están justificadas por MOTION.md.

7. Si existe un proyecto After Effects o la entrega requiere AE editable, verifica el MCP aftereffects y trabaja con backups. No abras ni modifiques proyectos críticos sin identificar primero el archivo correcto.

8. Ejecuta el ciclo obligatorio de QA: lint -> check -> snapshots de frames críticos -> preview completo -> render -> inspección del archivo final. No declares terminado el trabajo basándote solo en que el código compila.

9. Corrige cualquier clipping, overflow, colisión, contraste deficiente, asset faltante, glitch, timing malo o inconsistencia de marca antes de cerrar.

10. Al terminar, dame un informe breve con:
- estado MOTION-READY;
- archivos creados/modificados;
- herramientas instaladas/verificadas;
- pruebas ejecutadas y resultado;
- deuda o limitaciones pendientes;
- ubicación de previews/renders si existen.

Trabaja sobre la arquitectura existente y evita deuda técnica. No sustituyas sistemas correctos solo por preferencia personal. Conserva la editabilidad y la trazabilidad de los assets.
```

---

# 19. COMANDOS DE REFERENCIA RÁPIDA

## HyperFrames

```bash
npx skills add heygen-com/hyperframes
npx hyperframes skills check
npx hyperframes skills update
npx hyperframes doctor
npx hyperframes lint
npx hyperframes check
npx hyperframes snapshot --at 0,2,5
npx hyperframes preview
npx hyperframes render --output final.mp4
```

## After Effects MCP para Claude Code

```bash
claude mcp add aftereffects -- npx -y @kumoproductions/mcp-aftereffects
```

---

# 20. PRINCIPIO FINAL

El sistema correcto no es:

> “Claude, hazme un video bonito”.

Es:

> **Claude conoce primero la marca, documenta su lenguaje visual, construye una narrativa, usa el audio como tiempo, genera motion editable, se observa a sí mismo mediante frames y preview, corrige lo que ve y solo entonces renderiza.**

Esa es la diferencia entre una demo llamativa y un pipeline de producción reutilizable.
