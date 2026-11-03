// Motor de video y entrega. `paso` es el procedimiento que recibe la IA.
export const VERSION_HF = "0.9.9";

export const motores = [
  { id: "hyperframes", n: ["HyperFrames", "HyperFrames"], d: "HTML a video. El recomendado: probado en esta casa, Apache-2.0.", gratis: "Gratis y local", docs: ["library/hyperframes/skills/hyperframes/SKILL.md"],
    paso: [`Motor: HyperFrames ${VERSION_HF}. Crea el proyecto con npx hyperframes@${VERSION_HF} init. Usa siempre esa versión exacta y cumple el contrato de library/hyperframes/skills/hyperframes/SKILL.md.`, `Engine: HyperFrames ${VERSION_HF}. Create the project with npx hyperframes@${VERSION_HF} init. Always use that exact version and follow the contract in library/hyperframes/skills/hyperframes/SKILL.md.`] },
  { id: "remotion", n: ["Remotion", "Remotion"], d: "React a video. Gratis para personas y equipos de hasta 3; mira su licencia.", gratis: "Gratis con límites", docs: ["library/guias/motores.md"],
    paso: ["Motor: Remotion. Crea el proyecto con npx create-video@latest --blank. Todo deriva de useCurrentFrame() e interpolate con clamp; nada de CSS animation, Math.random, Date ni temporizadores. Si existe la skill oficial, instálala con npx skills add remotion-dev/skills. Confirma que el uso cumple su licencia.", "Engine: Remotion. Create the project with npx create-video@latest --blank. Everything derives from useCurrentFrame() and clamped interpolate; no CSS animation, Math.random, Date or timers. If available, install the official skill with npx skills add remotion-dev/skills. Confirm the use complies with its license."] },
  { id: "canvas", n: ["Motores de estilo en Canvas", "Canvas style engines"], d: "Tiza, terminal, isométrico: material que el DOM no da, dentro de HyperFrames.", gratis: "Gratis y local", docs: ["engines/pizarra/README.md", "library/lemo-opuscar/TECHNIQUE.md"],
    paso: [`Motor: Canvas 2D con render(t) dentro de una escena de HyperFrames ${VERSION_HF}, guiado por un reloj proxy de GSAP. Para tiza usa engines/pizarra. Para otros estilos, clona lemo-opuscar en el commit de library/lemo-opuscar/ORIGEN.md y copia a tu proyecto el motor del estilo.`, `Engine: Canvas 2D with render(t) inside a HyperFrames ${VERSION_HF} scene, driven by a GSAP proxy clock. For chalk use engines/pizarra. For other styles, clone lemo-opuscar at the commit in library/lemo-opuscar/ORIGEN.md and copy the style's engine into your project.`] },
  { id: "motioncanvas", n: ["Motion Canvas", "Motion Canvas"], d: "Animación por código, fuerte en diagramas. MIT.", gratis: "Gratis y local", docs: ["library/guias/motores.md"],
    paso: ["Motor: Motion Canvas (MIT). Crea el proyecto con npm init @motion-canvas@latest y exporta la secuencia para armarla con ffmpeg.", "Engine: Motion Canvas (MIT). Create the project with npm init @motion-canvas@latest and export the sequence to assemble with ffmpeg."] },
  { id: "manim", n: ["Manim", "Manim"], d: "Matemática y diagramas precisos, en Python. MIT.", gratis: "Gratis y local", docs: ["library/guias/motores.md"],
    paso: ["Motor: Manim Community (MIT), con pip install manim. Renderiza por escenas y arma con ffmpeg.", "Engine: Manim Community (MIT), with pip install manim. Render by scene and assemble with ffmpeg."] },
  { id: "ffmpeg", n: ["Solo ffmpeg", "ffmpeg only"], d: "Para cortar y mejorar material ya grabado.", gratis: "Gratis y local", docs: ["library/guias/motores.md"],
    paso: ["Motor: ffmpeg para corte, títulos simples, mezcla y filtros. No lo uses para gráficos complejos.", "Engine: ffmpeg for cutting, simple titles, mixing and filters. Do not use it for complex graphics."] },
];

export const destinos = [
  { id: "cualquiera", n: ["Cualquier IA con terminal", "Any AI with a terminal"], p: ["Destino: cualquier IA con terminal. Si tu entorno carga skills, copia las de .claqueta/library/hyperframes/skills a su carpeta de skills. Si no, ábrelas como archivos cuando las necesites.", "Target: any AI with a terminal. If your environment loads skills, copy those from .claqueta/library/hyperframes/skills into its skills folder. If not, open them as files when you need them."] },
  { id: "claude", n: ["Claude Code", "Claude Code"], p: ["Destino: Claude Code. Copia las skills de .claqueta/library/hyperframes/skills a .claude/skills de este proyecto antes de empezar.", "Target: Claude Code. Copy the skills from .claqueta/library/hyperframes/skills to this project's .claude/skills before you start."] },
  { id: "codex", n: ["Codex", "Codex"], p: ["Destino: Codex. Copia las skills de .claqueta/library/hyperframes/skills a .agents/skills de este proyecto antes de empezar.", "Target: Codex. Copy the skills from .claqueta/library/hyperframes/skills to this project's .agents/skills before you start."] },
  { id: "gemini", n: ["Gemini CLI", "Gemini CLI"], p: ["Destino: Gemini CLI. Lee .claqueta/GEMINI.md y carga las skills como archivos de contexto cuando las necesites.", "Target: Gemini CLI. Read .claqueta/GEMINI.md and load the skills as context files when you need them."] },
  { id: "editor", n: ["Cursor, Windsurf u otro editor", "Cursor, Windsurf or another editor"], p: ["Destino: un editor con agente. Lee .claqueta/AGENTS.md y abre las skills como archivos cuando las necesites.", "Target: an editor agent. Read .claqueta/AGENTS.md and open the skills as files when you need them."] },
  { id: "sin", n: ["IA sin terminal", "AI with no terminal"], p: ["Destino: una IA sin terminal. Lee https://berhjoan.github.io/claqueta/llms.txt. Escribe todos los archivos completos y las instrucciones para que una persona ejecute el render en su computador. Nunca digas que el video ya existe.", "Target: an AI with no terminal. Read https://berhjoan.github.io/claqueta/llms.txt. Write every file in full plus instructions for a person to run the render on their computer. Never claim the video already exists."] },
];

export const modos = [
  { id: "paradas", n: ["Con paradas para aprobar", "With approval stops"], d: "Se detiene en el guion, el cuadro de estilo y el borrador.", p: ["Detente y pide aprobación en tres momentos: guion, cuadro de estilo a tamaño real antes de gastar voz, y borrador.", "Stop and ask for approval at three moments: script, a full-size style frame before generating voice, and the draft."] },
  { id: "autonomo", n: ["De corrido", "No stops"], d: "Hace todo y entrega al final.", p: ["Trabaja de corrido sin pedir aprobaciones intermedias y entrega al final.", "Work straight through with no intermediate approvals and deliver at the end."] },
];

export const niveles = [
  { id: "rapido", n: ["Rápido", "Quick"], p: ["Control rápido: check, 5 cuadros mirados y medición del archivo final.", "Quick QA: check, 5 viewed frames and a measurement of the final file."] },
  { id: "pro", n: ["Profesional", "Professional"], p: ["Control profesional completo, según la lista de abajo.", "Full professional QA, per the list below."] },
  { id: "extremo", n: ["Obsesivo", "Obsessive"], p: ["Control obsesivo: además, tiras cada 0,2 s en toda acción clave, revisión de cortes cuadro a cuadro y una segunda ronda de correcciones.", "Obsessive QA: also strips every 0.2 s on every key action, frame-by-frame cut review and a second correction round."] },
];

export const plataformas = [
  { id: "reels", n: ["Instagram Reels", "Instagram Reels"], formato: "9:16", p: ["Plataforma: Instagram Reels.", "Platform: Instagram Reels."] },
  { id: "tiktok", n: ["TikTok", "TikTok"], formato: "9:16", p: ["Plataforma: TikTok.", "Platform: TikTok."] },
  { id: "shorts", n: ["YouTube Shorts", "YouTube Shorts"], formato: "9:16", p: ["Plataforma: YouTube Shorts.", "Platform: YouTube Shorts."] },
  { id: "vertical", n: ["Todas las verticales", "All vertical platforms"], formato: "9:16", p: ["Plataformas: Instagram, TikTok, YouTube Shorts y Facebook; un solo máster vertical.", "Platforms: Instagram, TikTok, YouTube Shorts and Facebook; one vertical master."] },
  { id: "youtube", n: ["YouTube", "YouTube"], formato: "16:9", p: ["Plataforma: YouTube horizontal, con capítulos si dura más de 3 min.", "Platform: horizontal YouTube, with chapters if it runs over 3 min."] },
  { id: "linkedin", n: ["LinkedIn", "LinkedIn"], formato: "1:1", p: ["Plataforma: LinkedIn; texto legible sin sonido.", "Platform: LinkedIn; text readable without sound."] },
];

export const formatos = [
  { id: "9:16", n: ["Vertical 9:16", "Vertical 9:16"], w: 1080, h: 1920 },
  { id: "4:5", n: ["Retrato 4:5", "Portrait 4:5"], w: 1080, h: 1350 },
  { id: "1:1", n: ["Cuadrado 1:1", "Square 1:1"], w: 1080, h: 1080 },
  { id: "16:9", n: ["Horizontal 16:9", "Horizontal 16:9"], w: 1920, h: 1080 },
  { id: "21:9", n: ["Panorámico 21:9", "Ultrawide 21:9"], w: 2520, h: 1080 },
];

export const entregables = [
  { id: "master", n: ["Máster MP4", "MP4 master"], p: ["Máster MP4 H.264, yuv420p, CRF 16 a 18, AAC 192 kbps.", "MP4 master, H.264, yuv420p, CRF 16 to 18, AAC 192 kbps."] },
  { id: "liviano", n: ["Copia liviana", "Light copy"], p: ["Copia liviana de menos de 30 MB para revisar en el teléfono.", "Light copy under 30 MB for phone review."] },
  { id: "portada", n: ["Portada", "Cover"], p: ["Portada PNG tomada de un cuadro real y legible.", "PNG cover taken from a real, readable frame."] },
  { id: "srt", n: ["Subtítulos SRT", "SRT captions"], p: ["Archivo SRT con el guion exacto.", "SRT file with the exact script."] },
  { id: "editable", n: ["Proyecto editable", "Editable project"], p: ["Proyecto editable completo con sus fuentes, audio y assets.", "Complete editable project with its fonts, audio and assets."] },
  { id: "textos", n: ["Textos para cada red", "Copy for each network"], p: ["Título, descripción y etiquetas por red, en español.", "Title, description and tags per network, in Spanish."] },
  { id: "fuentes", n: ["Fuentes y créditos", "Sources and credits"], p: ["FUENTES.md con URL y cita de cada dato, y CREDITOS.md con cada licencia.", "FUENTES.md with URL and quote for each fact, and CREDITOS.md with each license."] },
  { id: "cuadrado", n: ["Versión cuadrada y horizontal", "Square and horizontal versions"], p: ["Versiones 1:1 y 16:9 recompuestas por escena, nunca con recorte ciego.", "1:1 and 16:9 versions recomposed per scene, never blind-cropped."] },
];

export const motor = {
  id: "motor", nombre: "Motor e IA", titulo: ["Motor y trabajo", "Engine and workflow"],
  grupos: [
    { id: "motor", titulo: "Motor de video", ayuda: "Todos gratis. HyperFrames es el que está probado de punta a punta.", controles: [
        { k: "motor", t: "opciones", vista: "tarjetas", def: "hyperframes", label: ["Motor", "Engine"], opciones: motores },
      ] },
    { id: "ia", titulo: "Quién lo hace", controles: [
        { k: "destino", t: "opciones", vista: "chips", titulo: "IA de destino", def: "cualquiera", label: ["IA de destino", "Target AI"], opciones: destinos },
        { k: "modo", t: "opciones", vista: "tarjetas", titulo: "Cómo trabaja", def: "paradas", label: ["Modo de trabajo", "Work mode"], opciones: modos },
        { k: "qa", t: "opciones", vista: "chips", titulo: "Exigencia de revisión", def: "pro", label: ["Revisión", "QA"], opciones: niveles },
      ] },
  ],
};

export const entrega = {
  id: "entrega", nombre: "Formato y entrega", titulo: ["Formato y entrega", "Format and delivery"],
  grupos: [
    { id: "formato", titulo: "Formato", controles: [
        { k: "plataforma", t: "opciones", vista: "chips", titulo: "Dónde se publica", def: "vertical", label: ["Plataforma", "Platform"], opciones: plataformas },
        { k: "formato", t: "opciones", vista: "chips", titulo: "Relación de aspecto", def: "9:16", label: ["Formato", "Format"], opciones: formatos },
        { k: "fps", t: "opciones", vista: "chips", titulo: "Cuadros por segundo", def: "30", label: ["FPS", "FPS"], opciones: ["24", "25", "30", "50", "60"].map((id) => ({ id, n: [id, id] })) },
        { k: "duracion", t: "rango", titulo: "Duración", min: 5, max: 600, paso: 5, def: 60, unidad: "s", label: ["Duración", "Duration"] },
      ] },
    { id: "archivos", titulo: "Qué entrega", controles: [
        { k: "archivos", t: "opciones", vista: "chips", multi: 8, def: ["master", "liviano", "portada", "srt", "editable", "fuentes"], label: ["Entregables", "Deliverables"], opciones: entregables },
      ] },
  ],
};
