// Genera el encargo completo en español o inglés. Función pura, sin DOM, para que también corra en Node (tools/prompt.mjs).
// Las instrucciones se traducen; lo que se dice o se lee en el video se queda siempre en español.
import { DEPTOS, control, opcion, medidas } from "./catalogo.js";
import { VERSION_HF } from "../data/motor.js";
import { vozPorId, motoresVoz } from "../data/voces.js";
import { tiempo } from "./planos.js";

export const REPO = "https://github.com/berhjoan/claqueta";
export const SITIO = "https://berhjoan.github.io/claqueta";

const HF = `npx hyperframes@${VERSION_HF}`;

export function construirPrompt(estado, { lang = "es", estilos = [], traducciones = {}, compacto = false } = {}) {
  const I = lang === "en" ? 1 : 0;
  const L = (es, en) => (I ? en : es);
  const v = estado.valores;
  const m = medidas(v);
  const planos = estado.planos ?? [];
  const lineas = [];
  const add = (s = "") => lineas.push(s);
  const sec = (es, en) => { add(); add(`## ${L(es, en)}`); };
  const item = (s) => { if (s) add(`- ${s}`); };

  const nombre = (o) => (o ? o.n[I] : "");
  const instr = (o) => (o?.p ? o.p[I] : "");
  const una = (dep, k) => instr(opcion(dep, k, v[dep][k]));
  const varias = (dep, k) => (v[dep][k] ?? []).map((id) => opcion(dep, k, id)).filter(Boolean);
  const libre = (dep, k) => {
    const t = (v[dep][k] ?? "").trim();
    if (!t) return "";
    if (!I) return t;
    return traducciones[`${dep}.${k}`] || `${t} (written in Spanish)`;
  };
  const rango = (dep, k) => {
    const c = control(dep, k);
    return c?.p ? c.p[I].replaceAll("{v}", String(v[dep][k]).replace(".", I ? "." : ",")) : "";
  };
  const omitirRango = (dep, k) => control(dep, k)?.omitir === v[dep][k];
  const interruptor = (dep, k) => (v[dep][k] ? control(dep, k)?.p?.[I] : "");

  const est = (id) => estilos.find((e) => e.id === id);
  const eligio = v.arte.estilos ?? {};
  const base = est(eligio.base), sec2 = est(eligio.secundario), acento = est(eligio.acento);
  const motorSel = opcion("motor", "motor", v.motor.motor);
  const voz = vozPorId(v.sonido.voz);
  const titulo = (v.guion.titulo ?? "").trim();
  const variante = una("guion", "variante");
  const conVoz = v.sonido.narracion;
  const varLabel = opcion("guion", "variante", v.guion.variante)?.n[I] ?? "";

  // Encabezado
  add(`# ${L("Encargo de video hecho con Claqueta", "Video brief made with Claqueta")}`);
  add();
  add(L(
    "Eres director, diseñador de movimiento y editor de este video. Lo construyes con código, lo renderizas y lo revisas tú. El encargo está completo: no pidas más datos salvo que algo sea imposible.",
    "You are the director, motion designer and editor of this video. You build it with code, render it and check it yourself. This brief is complete: do not ask for more details unless something is impossible."
  ));

  sec("1. Idioma: todo el video va en español", "1. Language: the whole video is in Spanish");
  if (I) {
    add("This brief is written in English for you, but **the final video is entirely in Spanish** for a Spanish-speaking audience.");
    item(`Voiceover, on-screen text, captions, titles, labels, credits and calls to action must all be in Spanish: ${varLabel}.`);
    item("Write and render every word the viewer sees or hears in Spanish. No English words on screen except proper nouns and product names.");
    item("Never translate or anglicize any Spanish text quoted in this brief. Keep it character for character.");
    item("Keep Spanish accents and punctuation (á é í ó ú ü ñ ¿ ¡). Check that every font has those glyphs before rendering.");
    item("Delivery files, titles and captions metadata intended for viewers are also in Spanish.");
  } else {
    item(`Voz, texto en pantalla, subtítulos, títulos, rótulos, créditos y llamados van en español: ${varLabel}.`);
    item("Conserva tildes y signos (á é í ó ú ü ñ ¿ ¡). Comprueba que cada fuente tenga esos caracteres antes de renderizar.");
  }

  sec("2. Prepara el sistema", "2. Set up the system");
  add(L(
    "Claqueta es una biblioteca pública y gratuita de skills, motores, herramientas y guías para hacer video con código.",
    "Claqueta is a free public library of skills, engines, tools and guides for making video with code."
  ));
  const conHF = v.motor.motor === "hyperframes" || v.motor.motor === "canvas";
  const preset = m.h > m.w ? "portrait" : m.w > m.h ? "landscape" : "square";
  add();
  add("```bash");
  add(`git clone --depth 1 ${REPO}.git .claqueta`);
  add("pip install numpy scipy soundfile numba faster-whisper");
  add("python .claqueta/tools/doctor.py");
  add(conHF ? `${HF} init proyecto --resolution ${preset} --non-interactive --skip-skills` : "mkdir proyecto");
  add("cd proyecto");
  add("```");
  add();
  item(L(
    "Desde aquí, todo corre dentro de `proyecto/`. El sistema queda al lado, en `../.claqueta`, y no se edita. Las rutas `library/`, `tools/` y `engines/` de este encargo están ahí; `assets/`, `renders/` y `guion.txt` son de tu proyecto.",
    "From here on, everything runs inside `proyecto/`. The system sits next to it in `../.claqueta` and is not edited. The `library/`, `tools/` and `engines/` paths in this brief live there; `assets/`, `renders/` and `guion.txt` belong to your project."
  ));
  item(L("Si `.claqueta` ya existe, actualízala con `git -C .claqueta pull`. Si tu sistema no deja instalar paquetes de Python, usa un entorno virtual.", "If `.claqueta` already exists, update it with `git -C .claqueta pull`. If your system blocks Python packages, use a virtual environment."));
  item(L(`Sin terminal: lee ${SITIO}/llms.txt y abre los archivos que indica.`, `With no terminal: read ${SITIO}/llms.txt and open the files it lists.`));
  item(una("motor", "destino"));
  item(L(
    "Quién manda: este encargo, luego el `MOTION.md` de la marca, luego las guías de `library/guias` y por último las skills de terceros. Si dos documentos dicen cifras distintas, usa las de más arriba y sigue. `init` escribe un `AGENTS.md` y un `CLAUDE.md` genéricos: este encargo manda sobre ellos.",
    "What wins: this brief, then the brand's `MOTION.md`, then the guides in `library/guias`, and last any third-party skill. If two documents give different numbers, use the higher one and keep going. `init` writes a generic `AGENTS.md` and `CLAUDE.md`: this brief wins over them."
  ));
  add();
  add(L("Lee estos archivos antes de empezar, en este orden:", "Read these files before you start, in this order:"));
  for (const d of documentos(v, { base, sec2, acento, motorSel })) add(`- \`../.claqueta/${d}\``);
  add();
  add(L(
    "De las guías largas lee solo lo que uses: las fichas de tus estilos y los grupos de aprendizajes que vas a tocar.",
    "From the long guides read only what you use: the sheets for your styles and the lessons groups you will touch."
  ));

  sec("3. Sin pagar nada", "3. Pay for nothing");
  add(L(
    "Usa solo herramientas gratuitas y locales. No uses APIs de pago, MCP de pago ni servicios con suscripción, ni pidas una llave. De HyperFrames, no uses `cloud`, `lambda`, `cloudrun`, `templates`, `reverse`, `publish`, `skills update` ni la skill `style-sampling`. Si algo pareciera exigir un pago, usa la alternativa gratuita de `../.claqueta/AGENTS.md` y anótalo en la entrega.",
    "Use free, local tools only. Do not use paid APIs, paid MCP servers or subscription services, and do not ask for a key. From HyperFrames, do not use `cloud`, `lambda`, `cloudrun`, `templates`, `reverse`, `publish`, `skills update` or the `style-sampling` skill. If something seems to need payment, use the free alternative in `../.claqueta/AGENTS.md` and note it in the delivery."
  ));

  sec("4. Proyecto", "4. Project");
  item(titulo ? `${L("Tema", "Topic")} (${L("en español", "in Spanish")}): «${titulo}»` : L("Tema: propón uno claro y útil para la audiencia.", "Topic: propose a clear, useful one for the audience, in Spanish."));
  item(una("guion", "tipo"));
  const objetivo = libre("guion", "objetivo"), audiencia = libre("guion", "audiencia");
  if (objetivo) item(`${L("Objetivo", "Goal")}: ${objetivo}`);
  if (audiencia) item(`${L("Audiencia", "Audience")}: ${audiencia}`);
  item(una("guion", "tono"));
  item(una("guion", "estructura"));
  item(una("guion", "gancho"));
  item(una("guion", "final"));
  item(L("Una sola idea, un giro y un final que responde al inicio. El gancho ocurre antes de 3 s y sin logo lento.", "One idea, one turn and an ending that answers the opening. The hook lands before 3 s, with no slow logo."));
  item(interruptor("guion", "fuentes"));
  const notas = libre("guion", "notas");
  if (notas) item(`${L("Notas", "Notes")}: ${notas}`);

  sec("5. Guion", "5. Script");
  const texto = (v.guion.texto ?? "").trim();
  // Si hay texto y quedó «lo escribe la IA», se toma como borrador. Sin texto, no hay nada que respetar.
  const modoGuion = texto ? (v.guion.modo === "ia" ? "mejorar" : v.guion.modo) : "ia";
  item(opcion("guion", "modo", modoGuion)?.p[I]);
  item(variante);
  if (modoGuion !== "ia") item(L("El gancho y la estructura de la sección 4 guían la imagen y el orden. No añaden frases: si este texto no trae una pregunta, no la inventes.", "The hook and structure in section 4 guide the picture and the order. They do not add lines: if this text has no question, do not invent one."));
  if (conVoz && modoGuion === "exacto") {
    const palabras = texto.split(/\s+/).filter(Boolean).length;
    item(L(`Este texto tiene ${palabras} palabras: se lee en unos ${Math.round(palabras / 2.3)} s. La duración real sale de la voz, no del objetivo de la sección 6.`, `This text has ${palabras} words: it reads in about ${Math.round(palabras / 2.3)} s. The real duration comes from the voice, not from the target in section 6.`));
  } else if (conVoz) item(L(`Debe durar cerca de ${m.seg} s al leerse: unas ${Math.round(m.seg * 2.3)} palabras.`, `It must take about ${m.seg} s to read aloud: about ${Math.round(m.seg * 2.3)} Spanish words.`));
  if (texto) {
    add();
    add(L("Texto en español. No lo traduzcas:", "Spanish text. Do not translate it:"));
    add();
    add("```text");
    add(texto);
    add("```");
  }

  sec("6. Formato", "6. Format");
  item(una("entrega", "plataforma"));
  item(`${m.w} × ${m.h}, ${m.fps} fps. ${L("Duración objetivo", "Target duration")}: ${m.seg} s = ${m.cuadros} ${L("cuadros", "frames")}.`);
  if (conVoz) item(L(
    "En los comandos, `$DUR` es la duración real en segundos: lo que mide la voz más el cierre, hasta 1,5 s. Cámbialo por ese número y ajusta la lista de planos a él. Si escribes tú el guion, apunta a quedar a 10 % del objetivo. Si difiere más, dilo en la entrega.",
    "In the commands, `$DUR` is the real duration in seconds: what the voice measures plus the ending, up to 1.5 s. Replace it with that number and fit the shot list to it. If you write the script, aim to land within 10% of the target. If it differs by more, say so in the delivery."
  ));
  const DUR = conVoz ? "$DUR" : String(m.seg);
  if (m.h > m.w) {
    item(L(
      `Zonas seguras en ${m.w}×${m.h}: márgenes laterales de 72 px; nada clave en los primeros 220 px; todo el texto antes de y 1640; subtítulos en y 1300 a 1540 y contenido hasta y 1280; riel derecho libre entre x 960 y 1080, de y 900 a 1700. El mundo y las texturas sí llenan todo el cuadro.`,
      `Safe areas at ${m.w}×${m.h}: 72 px side margins; nothing key in the first 220 px; all text above y 1640; captions at y 1300 to 1540 and content down to y 1280; keep the right rail clear from x 960 to 1080, y 900 to 1700. The world and its textures do fill the whole frame.`
    ));
  } else {
    item(L("El contenido queda dentro del 90 % del cuadro y el texto dentro del 80 %.", "Content stays inside 90% of the frame and text inside 80%."));
  }
  item(L("El primer cuadro funciona como portada: nunca negro, nunca un logo.", "The first frame works as a thumbnail: never black, never a logo."));

  sec("7. Dirección de arte", "7. Art direction");
  const verEstilo = (e, papel, pct) => {
    if (!e) return;
    const partes = [`**${papel} (${pct} %): ${e.id}, ${e.name[I === 1 ? "en" : "es"]}.**`];
    if (!compacto) {
      partes.push(`${L("Se reconoce por", "Recognize it by")}: ${e.traits[I === 1 ? "en" : "es"]}`);
      if (e.motion) partes.push(`${L("Movimiento", "Motion")}: ${e.motion[I === 1 ? "en" : "es"]}`);
      if (e.camera) partes.push(`${L("Cámara", "Camera")}: ${e.camera[I === 1 ? "en" : "es"]}`);
      if (e.sound) partes.push(`${L("Sonido", "Sound")}: ${e.sound[I === 1 ? "en" : "es"]}`);
      if (e.avoid) partes.push(`${L("Evita", "Avoid")}: ${e.avoid[I === 1 ? "en" : "es"]}`);
    }
    const [docRuta, docSeccion] = String(e.doc ?? "").split("#");
    if (docRuta) partes.push(`${L("Ficha completa", "Full sheet")}: \`../.claqueta/${docRuta}\`${docSeccion ? ` (${L("sección", "section")} ${docSeccion})` : ""}.`);
    item(partes.join(" "));
  };
  // Sin secundario ni acento, el estilo principal es todo el video.
  const [pBase, pSec, pAcento] = sec2 && acento ? [70, 20, 10] : sec2 ? [75, 25, 0] : acento ? [85, 0, 15] : [100, 0, 0];
  verEstilo(base, L("Estilo principal", "Main style"), pBase);
  verEstilo(sec2, L("Estilo secundario", "Secondary style"), pSec);
  verEstilo(acento, L("Acento", "Accent"), pAcento);
  if (base) item(L(
    "Un estilo es material, cámara y sonido, no solo una paleta. Prueba de reconocimiento: si se oculta el nombre, deben verse dos o tres rasgos propios en cada plano. Nunca mezcles más de estos estilos.",
    "A style is material, camera and sound, not just a palette. Recognition test: with its name hidden, two or three of its own traits must show in every shot. Never mix in other styles."
  ));
  item(una("arte", "intensidad"));
  for (const o of varias("arte", "formas")) item(instr(o));
  item(una("arte", "pantalla"));
  const pal = paletaActual(v);
  item(`${L("Paleta exacta", "Exact palette")}: ${L("fondo", "ground")} ${pal.fondo}, ${L("tinta", "ink")} ${pal.tinta}, ${L("acento", "accent")} ${pal.acento}, ${L("secundario", "secondary")} ${pal.segundo}, ${L("superficie", "surface")} ${pal.superficie}. ${L("El acento marca lo importante y lleva significado: un solo elemento sólido por momento.", "The accent marks what matters and carries meaning: one solid element per moment.")}`);
  item(una("arte", "textura"));
  item(una("arte", "tipografia"));
  if (/Sora|JetBrains/.test(una("arte", "tipografia")) || v.subtitulos.activos) item(L(
    "Sora y JetBrains Mono: `mkdir -p assets/fonts && cp ../.claqueta/assets/fonts/*.ttf assets/fonts/`, cárgalas con `@font-face` y confirma en un cuadro que se ven.",
    "Sora and JetBrains Mono: `mkdir -p assets/fonts && cp ../.claqueta/assets/fonts/*.ttf assets/fonts/`, load them with `@font-face` and confirm on a frame that they show."
  ));
  item(rango("arte", "tamano"));
  item(una("arte", "caja"));
  item(una("arte", "marca"));
  const ref = libre("arte", "referencia");
  if (ref) item(`${L("Referencia", "Reference")}: ${ref}. ${control("arte", "referencia").nota[I]}`);

  sec("8. Cámara", "8. Camera");
  for (const o of varias("camara", "movs")) item(compacto ? o.n[I] : o.p[I]);
  if (!omitirRango("camara", "intensidad")) item(rango("camara", "intensidad"));
  item(una("camara", "lente"));
  item(una("camara", "encuadre"));
  item(una("camara", "angulo"));
  item(interruptor("camara", "motivo"));
  item(interruptor("camara", "texto_quieto"));
  item(una("camara", "desenfoque"));
  item(L(`En HyperFrames: anima escala y posición en un contenedor dentro del clip, con el reloj de la línea de tiempo.`, `In HyperFrames: tween scale and position on a wrapper inside the clip, on the timeline clock.`));

  sec("9. Profundidad y luz", "9. Depth and light");
  item(una("profundidad", "modo"));
  if (v.profundidad.modo !== "plano") item(rango("profundidad", "capas"));
  item(una("profundidad", "foco"));
  item(una("profundidad", "atmosfera"));
  item(una("profundidad", "luz"));
  item(L("El sujeto ocupa al menos el 40 % de la altura o el ancho del cuadro. Un objeto pequeño en medio de un cuadro vacío no es un plano.", "The subject fills at least 40% of the frame's height or width. A small object in an empty frame is not a shot."));

  sec("10. Movimiento", "10. Motion");
  item(una("movimiento", "curva"));
  item(rango("movimiento", "velocidad"));
  for (const o of varias("movimiento", "texto")) item(o.p[I]);
  for (const o of varias("movimiento", "elementos")) item(o.p[I]);
  item(una("movimiento", "vida"));
  item(L("Sostén lo que debe leerse: letras ÷ 15 + 1,5 s desde que termina de aparecer. Máximo 3 elementos animándose a la vez.", "Hold what must be read: letters ÷ 15 + 1.5 s after it finishes appearing. At most 3 elements animating at once."));
  if (v.subtitulos.activos) item(L("Al mundo van solo palabras clave. Las frases completas van en los subtítulos: una frase larga dibujada no se alcanza a leer.", "Only key words go in the world. Full sentences go in the captions: a long sentence drawn on screen cannot be read in time."));
  item(L("Todo es función del tiempo: semilla fija, nada de Date.now, Math.random sin semilla, temporizadores ni requestAnimationFrame como reloj.", "Everything is a function of time: fixed seed, no Date.now, unseeded Math.random, timers or requestAnimationFrame as the clock."));

  sec("11. Montaje", "11. Editing");
  item(una("montaje", "ritmo"));
  item(una("montaje", "sincronia"));
  item(una("montaje", "patron"));
  for (const o of varias("montaje", "transiciones")) item(compacto ? o.n[I] : o.p[I]);
  item(rango("montaje", "tr_dur"));
  if ((v.montaje.transiciones ?? []).some((t) => t !== "corte")) item(L("A lo sumo un tercio de las uniones entre ideas son cortes secos.", "At most a third of the seams between ideas are hard cuts."));
  for (const o of varias("montaje", "recursos")) item(o.p[I]);

  sec("12. Voz", "12. Voice");
  if (!conVoz) {
    item(L("El video no lleva voz.", "The video has no voiceover."));
  } else {
    const otra = opcion("sonido", "voz_propia", v.sonido.voz_propia);
    if (otra?.p) item(otra.p[I]);
    if (voz && v.sonido.voz_propia !== "grabada") {
      const mv = motoresVoz[voz.motor];
      const vel = Number(v.sonido.velocidad).toFixed(2);
      const salida = voz.motor === "edge" ? "assets/voz/voz.mp3" : "assets/voz/voz.wav";
      const pal = voz.motor === "edge" ? " --palabras assets/voz/palabras.json" : "";
      item(`${L("Voz gratis", "Free voice")}: ${voz.nombre} (${voz.pais}), ${L("motor", "engine")} ${mv.nombre}. ${L("Instala", "Install")}: \`${mv.instalar}\`.`);
      if (voz.motor === "edge") item(L("Edge pide internet. Si falla, usa `--motor piper --voz es_MX-claude-high` y dilo en la entrega.", "Edge needs internet. If it fails, use `--motor piper --voz es_MX-claude-high` and say so in the delivery."));
      add();
      add("```bash");
      add(`python ../.claqueta/tools/tts/hablar.py --motor ${voz.motor} --voz ${voz.voz} --archivo guion.txt --salida ${salida} --velocidad ${vel}${pal}`);
      if (voz.motor !== "edge") add(`python ../.claqueta/tools/subtitulos/alinear.py --audio ${salida} --guion guion.txt --salida assets/voz/palabras.json`);
      add("```");
      add();
    }
    item(una("sonido", "intencion"));
    add();
    add("```bash");
    add(`ffprobe -v error -show_entries format=duration -of csv=p=0 ${voz?.motor === "edge" ? "assets/voz/voz.mp3" : "assets/voz/voz.wav"}`);
    add(`python ../.claqueta/tools/qa/comparar_voz.py --audio ${voz?.motor === "edge" ? "assets/voz/voz.mp3" : "assets/voz/voz.wav"} --guion guion.txt`);
    add("```");
    add();
    item(L("El primero mide la voz y fija `$DUR`. El segundo comprueba que se dijo lo escrito. `assets/voz/palabras.json` trae los tiempos ya afinados contra el audio; úsalos para que cada elemento caiga en su palabra.", "The first measures the voice and sets `$DUR`. The second checks that what was written was said. `assets/voz/palabras.json` holds timings already refined against the audio; use them so each element lands on its word."));
  }

  sec("13. Música, efectos y mezcla", "13. Music, effects and mix");
  const mus = opcion("sonido", "musica", v.sonido.musica);
  item(mus?.p[I]);
  const conMusica = v.sonido.musica !== "sin";
  const mezcla = ["python ../.claqueta/tools/audio/mezcla.py"];
  if (conVoz && voz && v.sonido.voz_propia !== "grabada") mezcla.push(`--voz ${voz.motor === "edge" ? "assets/voz/voz.mp3" : "assets/voz/voz.wav"}`);
  else if (conVoz) mezcla.push("--voz assets/voz/voz.wav");
  if (conMusica) {
    item(`${L("Carácter", "Character")}: ${una("sonido", "animo")}, ${v.sonido.bpm} BPM.`);
    if (v.sonido.musica === "codigo") {
      add();
      add("```bash");
      add(`python ../.claqueta/tools/audio/musica.py --caracter ${v.sonido.animo} --bpm ${v.sonido.bpm} --dur ${DUR} --salida assets/audio/musica.wav --rejilla assets/audio/rejilla.json`);
      add("```");
      add();
      item(L("Cuando toque cortar, corta sobre un pulso de `assets/audio/rejilla.json`; no todo pulso es un corte. Sus secciones (entrada, cuerpo, cierre y, en piezas largas, respiro) marcan dónde puede subir o aflojar la imagen. Compón con la duración real.", "When a cut is due, land it on a beat from `assets/audio/rejilla.json`; not every beat is a cut. Its sections (entrada, cuerpo, cierre and, in long pieces, respiro) mark where the picture can rise or ease. Compose with the real duration."));
    } else if (v.sonido.musica === "cuerdas") {
      add();
      add("```bash");
      add(`python ../.claqueta/tools/audio/notas.py partitura.json --dur ${DUR} --salida assets/audio/musica.wav`);
      add("```");
      add();
      item(L("`partitura.json` es una lista como `[{\"t\": 0.5, \"nota\": \"A3\", \"dur\": 3, \"vel\": 0.6, \"instrumento\": \"nylon_guitar\"}]`.", "`partitura.json` is a list like `[{\"t\": 0.5, \"nota\": \"A3\", \"dur\": 3, \"vel\": 0.6, \"instrumento\": \"nylon_guitar\"}]`."));
    } else {
      item(`${L("Mide la rejilla real con", "Measure the real grid with")} \`${HF} beats --json assets/audio/musica.wav\`.`);
    }
    if (conVoz) item(L(`La música va ${Math.abs(v.sonido.nivel)} dB bajo la voz mientras se habla y sube 6 dB cuando la voz calla.`, `Music sits ${Math.abs(v.sonido.nivel)} dB under the voice while it speaks and rises 6 dB when the voice stops.`));
    mezcla.push("--musica assets/audio/musica.wav");
    if (conVoz) mezcla.push(`--nivel-musica ${v.sonido.nivel}`);
  }
  item(una("sonido", "sfx"));
  if (v.sonido.sfx !== "cero") {
    item(una("sonido", "fuente_sfx"));
    mezcla.push("--efectos efectos.json");
  }
  item(interruptor("sonido", "silencios"));
  item(interruptor("sonido", "golpes"));
  item(L("Mezcla y máster con este comando. Deja −14 LUFS y −3 dBTP e imprime lo medido. `efectos.json` es una lista como `[{\"pico\": 1.23, \"sonido\": \"barrido\", \"ganancia\": -8}]`: `pico` pone el punto más fuerte en ese segundo, y `t`, el inicio. `--silencios` admite tramos como 12.4-12.8. Mira la guía `library/guias/sonido.md`.", "Mix and master with this command. It leaves −14 LUFS and −3 dBTP and prints what it measured. `efectos.json` is a list like `[{\"pico\": 1.23, \"sonido\": \"barrido\", \"ganancia\": -8}]`: `pico` puts the loudest point at that second, and `t` puts the start. `--silencios` takes ranges like 12.4-12.8. See the guide `library/guias/sonido.md`."));
  add();
  add("```bash");
  add(`${mezcla.join(" ")} --dur ${DUR} --salida assets/audio/mezcla.wav`);
  add("```");
  add();
  item(L("Coloca `assets/audio/mezcla.wav` en la composición como una sola pista. Mide también el archivo ya renderizado.", "Place `assets/audio/mezcla.wav` in the composition as a single track. Measure the rendered file too."));

  sec("14. Subtítulos", "14. Captions");
  if (!v.subtitulos.activos) {
    item(L("Sin subtítulos.", "No captions."));
  } else {
    item(L("Subtítulos en español.", "Captions in Spanish."));
    item(una("subtitulos", "estilo"));
    item(una("subtitulos", "posicion"));
    item(interruptor("subtitulos", "frases"));
    item(interruptor("subtitulos", "exacto"));
  }

  sec("15. Lista de planos", "15. Shot list");
  add(L(
    "Es la dirección de partida. Ajusta las duraciones a la voz real sin perder la intención. Los textos entre comillas son literales en español.",
    "This is the starting direction. Fit durations to the real voice without losing the intent. Quoted text is literal Spanish, and the beat names are in Spanish too."
  ));
  add();
  add(`| # | ${L("Tiempo", "Time")} | ${L("Parte", "Beat")} | ${L("Cámara", "Camera")} | ${L("Pasa con", "Exit")} | ${L("Texto", "Text")} |`);
  add("|---|---|---|---|---|---|");
  let t = 0;
  planos.forEach((p, i) => {
    const cam = opcion("camara", "movs", p.cam);
    const tr = opcion("montaje", "transiciones", p.tr);
    const fin = t + p.dur;
    const texto = (p.texto ?? "").trim();
    const parte = p.titulo;
    add(`| ${i + 1} | ${tiempo(t)} ${L("a", "to")} ${tiempo(fin)} | ${parte} | ${cam ? cam.n[I] : p.cam} | ${i === planos.length - 1 ? L("Final", "End") : tr ? tr.n[I] : p.tr} | ${texto ? `«${texto.replaceAll("|", "/")}»` : L("Según el guion", "From the script")} |`);
    if ((p.nota ?? "").trim()) add(`|   |   | ${L("Nota", "Note")}: ${(traducciones[`plano.${p.id}`] ?? p.nota).replaceAll("|", "/")} |   |   |   |`);
    t = fin;
  });

  sec("16. Cómo construirlo", "16. How to build it");
  item(motorSel?.paso[I]);
  if (conHF) item(L(
    `\`init\` deja \`lang="en"\` y fondo negro: pon \`lang="es"\` y el fondo de tu paleta, y comprueba que \`data-width\` y \`data-height\` den ${m.w}×${m.h} y que \`data-duration\` sea \`${DUR}\`.`,
    `\`init\` leaves \`lang="en"\` and a black ground: set \`lang="es"\` and your palette's ground, and check that \`data-width\` and \`data-height\` give ${m.w}×${m.h} and that \`data-duration\` is \`${DUR}\`.`
  ));
  const pasos = [
    L("Escribe `TREATMENT.md`: tres estructuras posibles y la elegida con su razón, un movimiento que solo este medio puede hacer, y una tabla de sonido por sección.", "Write `TREATMENT.md`: three possible structures and the chosen one with its reason, one move only this medium can do, and a sound table per section."),
    L("Escribe `SPEC.md`: convierte este encargo en cifras (LOOK, MOTION, SHOTS, BANNED, QA).", "Write `SPEC.md`: turn this brief into numbers (LOOK, MOTION, SHOTS, BANNED, QA)."),
    conVoz ? L("Escribe `guion.txt`, genera la voz y obtén los tiempos de cada palabra.", "Write `guion.txt`, generate the voice and get each word's timing.") : L("Fija la pista o el reloj de la pieza.", "Fix the track or the piece's clock."),
    L("Haz un cuadro de estilo real a tamaño final con tu mejor plano, y compáralo con este encargo antes de animar lo demás.", "Make one real full-size style frame of your best shot, and compare it against this brief before animating the rest."),
    L("Construye las escenas, una por archivo, con textos y colores como variables para que sigan siendo editables.", "Build the scenes, one per file, with copy and colors as variables so they stay editable."),
    L("Mezcla: ambiente, efectos por acción, música y voz.", "Mix: ambience, effects per action, music and voice."),
    L("Revisa con la lista de la sección 17, corrige una vez y renderiza.", "Check against section 17, correct once and render."),
  ];
  pasos.forEach((p, i) => add(`${i + 1}. ${p}`));
  add();
  item(una("motor", "modo"));

  sec("17. Revisión", "17. Checks");
  item(una("motor", "qa"));
  add();
  add("```bash");
  if (v.motor.motor === "hyperframes" || v.motor.motor === "canvas") {
    add(`${HF} check --json`);
    add(`${HF} snapshot --review`);
    add(`${HF} render --output renders/final.mp4 --fps ${m.fps}`);
  }
  add(`python ../.claqueta/tools/qa/verificar_video.py verificar renders/final.mp4 --duracion ${DUR} --ancho ${m.w} --alto ${m.h}`);
  add(`python ../.claqueta/tools/qa/hoja_cuadros.py renders/final.mp4 --salida renders/hoja.jpg`);
  add(`python ../.claqueta/tools/qa/saltos.py renders/final.mp4`);
  if (conVoz) add("python ../.claqueta/tools/qa/comparar_voz.py --audio renders/final.mp4 --guion guion.txt");
  add("```");
  add();
  item(L("Mira los cuadros de verdad antes de decir que está listo: texto dentro de zonas seguras, tildes correctas, nada cortado ni encimado, sujeto grande y primer cuadro con imagen.", "Actually look at the frames before saying it is done: text inside safe areas, correct accents, nothing cut or overlapping, a large subject and an image on the first frame."));
  item(L("Los avisos de solape de `check` pueden ser falsos en capas de efecto: confírmalos en un cuadro antes de cambiar nada.", "`check` overlap warnings can be false on effect layers: confirm on a frame before changing anything."));
  item(L("Di en la entrega qué mediste y qué no pudiste comprobar. Si no puedes oír, dilo.", "State in the delivery what you measured and what you could not check. If you cannot hear, say so."));

  sec("18. Prohibido", "18. Banned");
  for (const s of I ? [
    "Small elements floating in the middle of an empty frame. If the ground is black, the brand must ask for it, and the world must still fill the frame.",
    "Glow, neon, bloom and decorative particles unless the chosen style is built on them.",
    "Cards on black with the content at the top and an empty band below.",
    "Everything centered, everything fading in, every element sliding up.",
    "Text that moves while it is being read, or titles that keep drifting after they land.",
    "Breathing, floating or pulsing loops standing in for motion. Corner labels and decorative borders.",
    "The same transition or sound repeated on every cut.",
    "Invented data, logos, screenshots or product UI. Other people's characters or brands.",
  ] : [
    "Elementos pequeños flotando en medio de un cuadro vacío. Si el fondo es negro, debe pedirlo la marca, y aun así el mundo llena el cuadro.",
    "Resplandor, neón y partículas decorativas, salvo que el estilo elegido viva de ellos.",
    "Tarjetas sobre negro con el contenido arriba y una franja vacía debajo.",
    "Todo centrado, todo con desvanecido, cada elemento subiendo.",
    "Texto que se mueve mientras se lee, o títulos que siguen moviéndose al aterrizar.",
    "Respiraciones, flotaciones o pulsos en lugar de movimiento real. Rótulos en esquinas y bordes decorativos.",
    "La misma transición o el mismo sonido en todos los cortes.",
    "Datos, logos, capturas o interfaces inventados. Personajes o marcas de otros.",
  ]) item(s);

  sec("19. Entrega", "19. Delivery");
  for (const o of varias("entrega", "archivos")) item(o.p[I]);
  item(L("Una nota breve: qué se hizo, qué se midió, qué no se pudo comprobar y cómo cambiar lo más probable.", "A short note: what was done, what was measured, what could not be checked and how to change what is most likely to change."));
  item(L("No publiques en ninguna red.", "Do not publish on any network."));

  return lineas.join("\n") + "\n";
}

export function paletaActual(v) {
  const c = v.arte.paleta;
  if (c && typeof c === "object") return c;
  return opcion("arte", "paleta", c)?.c ?? opcion("arte", "paleta", "bg").c;
}

export function documentos(v, { base, sec2, acento, motorSel }) {
  const docs = ["AGENTS.md", "library/guias/direccion.md"];
  for (const d of motorSel?.docs ?? []) docs.push(d);
  if (v.motor.motor === "hyperframes" || v.motor.motor === "canvas") {
    const r = "library/hyperframes/skills/hyperframes/references";
    docs.push(`${r}/spec.md`, `${r}/format.md`, `${r}/motion.md`, `${r}/runtimes.md`);
    const f = v.entrega.formato;
    if (f === "9:16" || f === "4:5") docs.push(`${r}/types/vertical.md`);
    const tipo = { explicador: "explainer", tutorial: "explainer", noticia: "explainer", negocios: "explainer", promo: "launch", lanzamiento: "launch", musical: "music", datos: "data" }[v.guion.tipo];
    if (tipo) docs.push(`${r}/types/${tipo}.md`);
    if (v.profundidad.modo === "real" || v.profundidad.modo === "nubes") docs.push(`${r}/types/3d.md`);
    if (v.subtitulos.activos) docs.push(`${r}/captions.md`);
    if (v.sonido.narracion || v.sonido.musica !== "sin" || v.sonido.sfx !== "cero") docs.push("library/guias/sonido.md");
    docs.push(`${r}/review.md`);
  }
  if (v.sonido.narracion) docs.push("tools/tts/README.md");
  if (v.arte.marca === "bg") docs.push("library/marca/bg-system-ia/MOTION.md");
  for (const e of [base, sec2, acento]) if (e && !docs.includes(e.doc.split("#")[0])) docs.push(e.doc.split("#")[0]);
  if ((v.movimiento.texto ?? []).includes("mano") || v.arte.tipografia === "tiza") if (!docs.includes("engines/pizarra/README.md")) docs.push("engines/pizarra/README.md");
  docs.push("library/guias/aprendizajes.md");
  return docs;
}
