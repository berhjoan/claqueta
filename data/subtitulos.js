// Subtítulos. `sub` indica al monitor cómo dibujarlos.
export const estilosSub = [
  { id: "activa", n: ["Palabra activa en caja", "Active word box"], d: "Dos líneas; la palabra que suena, en color.", sub: "activa", p: ["Subtítulos en 2 líneas como máximo, sobre caja del color del fondo al 80 %, con la palabra activa en el color de acento, sincronizada por tiempos de palabra.", "Captions in up to 2 lines on a ground-colored box at 80%, with the active word in the accent color, synced to word timings."] },
  { id: "grande", n: ["Grandes al centro", "Big and centered"], d: "Pocas palabras, muy grandes, en el centro.", sub: "grande", p: ["Subtítulos grandes, de 1 a 3 palabras a la vez y de 70 a 110 px, en el centro del cuadro, con palabra activa en acento.", "Big captions, 1 to 3 words at a time and 70 to 110 px, at frame center, with the active word in the accent color."] },
  { id: "karaoke", n: ["Karaoke", "Karaoke"], d: "La frase entera se va llenando de color.", sub: "karaoke", p: ["Subtítulos tipo karaoke: la frase completa visible y el color avanza palabra por palabra.", "Karaoke captions: the full line visible while color advances word by word."] },
  { id: "editorial", n: ["Editorial sobrio", "Quiet editorial"], d: "Texto limpio, sin caja, bien integrado.", sub: "editorial", p: ["Subtítulos sobrios sin caja, con contraste asegurado por el fondo, de 44 a 52 px.", "Quiet captions with no box, contrast ensured by the ground, 44 to 52 px."] },
  { id: "mundo", n: ["Dentro del mundo", "Inside the world"], d: "El texto se escribe en el propio escenario.", sub: "editorial", p: ["No hay banda de subtítulos: el texto nace dentro del mundo, en pizarras, pantallas o carteles, y lo que dice la voz siempre se lee.", "No caption band: text is born inside the world, on boards, screens or signs, and what the voice says can always be read."] },
];

export const subtitulos = {
  id: "subtitulos", nombre: "Subtítulos", titulo: ["Subtítulos", "Captions"],
  grupos: [
    { id: "sub", titulo: "Subtítulos", ayuda: "La mayoría ve el video sin sonido.", controles: [
        { k: "activos", t: "interruptor", titulo: "Agregar subtítulos", def: true, label: ["Subtítulos", "Captions"], p: null },
        { k: "estilo", t: "opciones", vista: "tarjetas", def: "activa", label: ["Estilo", "Style"], opciones: estilosSub },
        { k: "posicion", t: "opciones", vista: "chips", titulo: "Posición", def: "seguro", label: ["Posición", "Position"], opciones: [
          { id: "seguro", n: ["Sobre la zona segura", "Above the safe area"], p: ["Banda de subtítulos entre y {y1} y {y2} en {dim}; el contenido llega hasta y {y0}.", "Caption band between y {y1} and {y2} at {dim}; content reaches down to y {y0}."] },
          { id: "centro", n: ["Centro", "Center"], p: ["Subtítulos en el centro del cuadro.", "Captions at frame center."] },
          { id: "arriba", n: ["Arriba", "Top"], p: ["Subtítulos en el tercio superior, debajo de y {ya}.", "Captions in the top third, below y {ya}."] },
        ] },
        { k: "frases", t: "interruptor", titulo: "Agrupar por frase con sentido", ayuda: "Evita fragmentos sueltos en pantalla.", def: true, p: ["Agrupa por frases con sentido, nunca fragmentos sueltos como «a empezar,». Máximo {c} caracteres por línea, y sin tapar al sujeto.", "Group by meaningful phrases, never loose fragments. At most {c} characters per line, and never covering the subject."] },
        { k: "exacto", t: "interruptor", titulo: "Texto exacto del guion", ayuda: "La transcripción automática escribe mal los nombres.", def: true, p: ["Los subtítulos muestran el guion exacto, con tildes y nombres correctos. Los tiempos salen de `palabras.json`, no del texto transcrito.", "Captions show the exact script, with correct accents and names. Timing comes from `palabras.json`, not from transcribed text."] },
      ] },
  ],
};
