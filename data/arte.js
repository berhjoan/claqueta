// Dirección de arte: galería de estilos, formas, color y tipografía.
// «propios» no trae colores: cada estilo usa los suyos, de data/styles.json.
export const paletas = [
  { id: "propios", n: ["Colores de cada estilo", "Each style's own colors"], d: "Cada estilo con su paleta propia. Sin imponer un color.", propia: true, c: { fondo: "#F5F2EB", tinta: "#111111", acento: "#D62828", segundo: "#6B6B6B", superficie: "#FFFFFF" } },
  { id: "bg", n: ["Negro y oro", "Warm black and gold"], d: "La marca BG System IA.", c: { fondo: "#0B0806", tinta: "#F7EBD3", acento: "#E9A93B", segundo: "#B8692E", superficie: "#1A120A" } },
  { id: "papel", n: ["Tinta y papel", "Ink on paper"], d: "Editorial, cálido, impreso.", c: { fondo: "#F2ECDF", tinta: "#16130F", acento: "#C8341E", segundo: "#6B5B45", superficie: "#E5DCC8" } },
  { id: "pizarra", n: ["Pizarra verde", "Green slate"], d: "Aula clásica.", c: { fondo: "#0F1C15", tinta: "#F2F0E6", acento: "#FF8F42", segundo: "#FAD86F", superficie: "#17281F" } },
  { id: "cobalto", n: ["Cobalto y crema", "Cobalt and cream"], d: "Risografía, dos tintas.", c: { fondo: "#F3EEE0", tinta: "#1B2FA8", acento: "#1B2FA8", segundo: "#E2502F", superficie: "#E6E0CE" } },
  { id: "plano", n: ["Plano técnico", "Blueprint"], d: "Blanco sobre azul de ingeniería.", c: { fondo: "#0D2A52", tinta: "#EAF3FF", acento: "#FFD24D", segundo: "#7FB2E8", superficie: "#133663" } },
  { id: "bosque", n: ["Bosque", "Forest"], d: "Verde profundo y rosa viejo.", c: { fondo: "#12332A", tinta: "#F5E9E0", acento: "#F1A6B5", segundo: "#8FBF9F", superficie: "#1A4438" } },
  { id: "cartel", n: ["Cartel coral", "Coral poster"], d: "Planos duros de color.", c: { fondo: "#F2553F", tinta: "#14110F", acento: "#FFF3D9", segundo: "#14110F", superficie: "#D9412C" } },
  { id: "noche", n: ["Medianoche ámbar", "Amber midnight"], d: "Terminal y fósforo.", c: { fondo: "#050A08", tinta: "#FFB347", acento: "#FFD27A", segundo: "#7A5A1E", superficie: "#101713" } },
  { id: "synth", n: ["Neón nocturno", "Neon night"], d: "Retrofuturo, usar con medida.", c: { fondo: "#120B26", tinta: "#F6EFFF", acento: "#FF3E9E", segundo: "#35E0F0", superficie: "#1F1440" } },
  { id: "mono", n: ["Monocromo", "Monochrome"], d: "Solo grises y un corte de blanco.", c: { fondo: "#111111", tinta: "#F4F4F4", acento: "#FFFFFF", segundo: "#8A8A8A", superficie: "#222222" } },
];

export const tipografias = [
  { id: "auto", n: ["Según el estilo", "By style"], d: "La que pida el estilo, de las que trae el sistema.", display: "Sora", cuerpo: "Sora", css: "Sora", p: ["Tipografía según el estilo, de las que trae el sistema: `python ../.claqueta/tools/medios/fuentes.py --listar`. Las copias con su CSS con `python ../.claqueta/tools/medios/fuentes.py <nombre>`.", "Typography by style, from those the system includes: `python ../.claqueta/tools/medios/fuentes.py --listar`. Copy them with their CSS using `python ../.claqueta/tools/medios/fuentes.py <name>`."] },
  { id: "marca", n: ["Sora", "Sora"], d: "La de tu marca. Geométrica y clara.", display: "Sora", cuerpo: "Sora", css: "Sora", p: ["Títulos y texto en Sora 600 y 700; datos en JetBrains Mono 500. Ambas con licencia OFL, en assets/fonts del sistema.", "Titles and body in Sora 600 and 700; data in JetBrains Mono 500. Both OFL, in the system's assets/fonts."] },
  { id: "impacto", n: ["Archivo Black", "Archivo Black"], d: "Peso máximo para frases cortas.", display: "Archivo Black", cuerpo: "Archivo", css: "Sora", peso: 800, p: ["Títulos en Archivo Black y texto en Archivo. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Archivo Black, body in Archivo. Both OFL from Google Fonts: download to assets/fonts with @font-face."] },
  { id: "cartel", n: ["Bebas Neue y Barlow", "Bebas Neue and Barlow"], d: "Condensada de cartel, muy grande.", display: "Bebas Neue", cuerpo: "Barlow", css: "Sora", peso: 700, cond: true, p: ["Títulos en Bebas Neue, muy grandes, y texto en Barlow. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Bebas Neue, very large, body in Barlow. OFL, included: tools/medios/fuentes.py."] },
  { id: "editorial", n: ["Fraunces y Source Sans 3", "Fraunces and Source Sans 3"], d: "Serifa cálida con carácter.", display: "Fraunces", cuerpo: "Source Sans 3", css: "Georgia, serif", peso: 600, p: ["Títulos en Fraunces y texto en Source Sans 3. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Fraunces, body in Source Sans 3. OFL, included: tools/medios/fuentes.py."] },
  { id: "dm", n: ["DM Serif Display y DM Sans", "DM Serif Display and DM Sans"], d: "Elegante y contrastada.", display: "DM Serif Display", cuerpo: "DM Sans", css: "Georgia, serif", peso: 500, p: ["Títulos en DM Serif Display y texto en DM Sans. OFL, incluidas: tools/medios/fuentes.py.", "Titles in DM Serif Display, body in DM Sans. OFL, included: tools/medios/fuentes.py."] },
  { id: "syne", n: ["Syne y Manrope", "Syne and Manrope"], d: "Contemporánea, de galería.", display: "Syne", cuerpo: "Manrope", css: "Sora", peso: 800, p: ["Títulos en Syne 800 y texto en Manrope. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Syne 800, body in Manrope. OFL, included: tools/medios/fuentes.py."] },
  { id: "unbounded", n: ["Unbounded y Onest", "Unbounded and Onest"], d: "Redonda y ancha, muy gráfica.", display: "Unbounded", cuerpo: "Onest", css: "Sora", peso: 700, p: ["Títulos en Unbounded y texto en Onest. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Unbounded, body in Onest. OFL, included: tools/medios/fuentes.py."] },
  { id: "deco", n: ["Poiret One y Josefin Sans", "Poiret One and Josefin Sans"], d: "Art déco.", display: "Poiret One", cuerpo: "Josefin Sans", css: "Sora", peso: 400, p: ["Títulos en Poiret One y texto en Josefin Sans. OFL, incluidas: tools/medios/fuentes.py.", "Titles in Poiret One, body in Josefin Sans. OFL, included: tools/medios/fuentes.py."] },
  { id: "terminal", n: ["VT323 y JetBrains Mono", "VT323 and JetBrains Mono"], d: "Terminal y código.", display: "VT323", cuerpo: "JetBrains Mono", css: "'JetBrains Mono', monospace", peso: 500, p: ["Títulos en VT323 y texto en JetBrains Mono. OFL.", "Titles in VT323, body in JetBrains Mono. OFL."] },
  { id: "tiza", n: ["Letra de tiza", "Chalk handwriting"], d: "Trazo a mano real con EMS Delight.", display: "EMS Delight", cuerpo: "Sora", css: "Sora", tiza: true, p: ["Texto del mundo escrito con EMS Delight, fuente de una sola línea en engines/pizarra, trazo a trazo; subtítulos en Sora.", "World text written with EMS Delight, the single-line font in engines/pizarra, stroke by stroke; captions in Sora."] },
];

export const formas = [
  { id: "trazos", n: ["Trazos a mano", "Hand-drawn strokes"], d: "Líneas vivas que crecen.", esc: "trazos", p: ["Lenguaje de formas: trazos a mano con grosor que varía y crecen en su orden real.", "Shape language: hand-drawn strokes with varying width that grow in their real order."] },
  { id: "geometria", n: ["Geometría pura", "Pure geometry"], d: "Círculos, triángulos y cuadrados.", esc: "geometria", p: ["Lenguaje de formas: círculos, triángulos y cuadrados sobre una retícula visible.", "Shape language: circles, triangles and squares on a visible grid."] },
  { id: "objetos", n: ["Objetos de un mundo", "Objects in a world"], d: "Cosas reconocibles sin rótulo.", esc: "objetos", p: ["Lenguaje de formas: objetos reconocibles con material y detalle, no barras ni iconos genéricos.", "Shape language: recognizable objects with material and detail, not generic bars or icons."] },
  { id: "tarjetas", n: ["Tarjetas y paneles", "Cards and panels"], d: "Información ordenada en cuadros.", esc: "tarjetas", p: ["Lenguaje de formas: tarjetas y paneles grandes; relleno mínimo de 40 % del cuadro, sin tarjetas pequeñas en fila.", "Shape language: large cards and panels; at least 40% of the frame filled, no small cards in a row."] },
  { id: "tipo", n: ["La tipografía es la imagen", "Type as image"], d: "Las palabras llenan el cuadro.", esc: "tipo", p: ["Lenguaje de formas: la tipografía es la imagen; una palabra ocupa del 60 % al 90 % del ancho.", "Shape language: type is the image; one word fills 60% to 90% of the width."] },
  { id: "diagrama", n: ["Diagramas que crecen", "Growing diagrams"], d: "Nodos y conexiones en orden.", esc: "diagrama", p: ["Lenguaje de formas: diagramas que crecen: nodos con borde, conectores dibujados en la dirección del flujo.", "Shape language: growing diagrams: outlined nodes, connectors drawn in the direction of flow."] },
  { id: "tecnicas", n: ["Líneas técnicas", "Technical lines"], d: "Plano, cotas y retícula.", esc: "tecnicas", p: ["Lenguaje de formas: líneas técnicas, cotas con flechas y retícula de construcción.", "Shape language: technical lines, dimension arrows and a construction grid."] },
  { id: "recortes", n: ["Recortes y papel", "Cut-outs and paper"], d: "Papel rasgado, cinta, textura real.", esc: "recortes", p: ["Lenguaje de formas: recortes de papel con borde rasgado, cinta y sombra corta.", "Shape language: paper cut-outs with torn edges, tape and a short shadow."] },
  { id: "campos", n: ["Campos y partículas", "Fields and particles"], d: "Nubes de puntos que forman figuras.", esc: "campos", p: ["Lenguaje de formas: nubes de puntos y campos que forman figuras y se sostienen.", "Shape language: point clouds and fields that form figures and hold."] },
  { id: "bloques", n: ["Bloques isométricos", "Isometric blocks"], d: "Volúmenes apilados.", esc: "bloques", p: ["Lenguaje de formas: bloques isométricos apilados con cara superior más clara.", "Shape language: stacked isometric blocks with a lighter top face."] },
];

export const pantallas = [
  { id: "mundo", n: ["Un solo mundo", "One world"], d: "Un lugar llena todo el cuadro; la cámara lo recorre.", p: ["La pantalla es un solo mundo que llena todo el cuadro, también lo que tape la interfaz de la app; solo la información respeta las zonas seguras.", "The screen is one world filling the whole frame, including whatever the app's interface covers; only information respects the safe areas."] },
  { id: "capitulos", n: ["Capítulos", "Chapters"], d: "Cada idea es un cuadro distinto.", p: ["Cada idea es un cuadro distinto con su propia composición; nunca el mismo diseño dos veces seguidas.", "Each idea is its own frame with its own composition; never the same layout twice in a row."] },
  { id: "crece", n: ["El diagrama crece", "The diagram grows"], d: "Un mismo cuadro se va completando.", p: ["Un solo cuadro se va completando: nada se borra y al final se lee el conjunto como un póster.", "One frame keeps filling in: nothing is removed, and the end reads as a poster."] },
  { id: "gigante", n: ["Texto gigante", "Giant type"], d: "Una idea, una palabra enorme.", p: ["Una idea por pantalla con texto enorme: del 9 % al 15 % de la altura del cuadro.", "One idea per screen with huge type: 9% to 15% of the frame height."] },
  { id: "dividida", n: ["Dos mitades", "Two halves"], d: "Arriba y abajo se responden.", p: ["La pantalla se parte en dos mitades que se responden; en vertical, arriba y abajo.", "The screen splits in two halves answering each other; in vertical, top and bottom."] },
  { id: "cuadro", n: ["Cuadro dentro de cuadro", "Frame in frame"], d: "Pantallas, ventanas, láminas.", p: ["Cuadro dentro de cuadro: la imagen vive dentro de una pantalla, ventana o lámina del mundo.", "Frame in frame: the picture lives inside a screen, window or plate in the world."] },
];

export const texturas = [
  { id: "limpio", n: ["Limpio", "Clean"], p: ["Acabado limpio, con un grano mínimo del 1 % solo para evitar bandas: tools/imagen/grano.py --alfa 1.", "Clean finish with a minimal 1% grain only to prevent banding: tools/imagen/grano.py --alfa 1."] },
  { id: "grano", n: ["Grano fino", "Fine grain"], p: ["Grano fino de 2 % a 3 % con semilla fija, en una capa quieta sobre el fondo y bajo el texto: `python ../.claqueta/tools/imagen/grano.py --salida assets/grano.png --alfa 2.5`. Su cabecera trae el CSS.", "Fine grain of 2% to 3% with a fixed seed, in a still layer over the ground and under the text: `python ../.claqueta/tools/imagen/grano.py --salida assets/grano.png --alfa 2.5`. Its header has the CSS."] },
  { id: "papel", n: ["Papel", "Paper"], p: ["Textura de papel con fibra visible al 4 %.", "Paper texture with visible fiber at 4%."] },
  { id: "semitono", n: ["Semitono", "Halftone"], p: ["Trama de semitono ordenada en sombras e imágenes.", "Ordered halftone screen in shadows and images."] },
  { id: "pelicula", n: ["Película analógica", "Analog film"], p: ["Acabado de película: grano 3 % (tools/imagen/grano.py --alfa 3), viñeta 6 % y leve halación en las luces.", "Film finish: 3% grain (tools/imagen/grano.py --alfa 3), 6% vignette and slight halation on highlights."] },
  { id: "crt", n: ["Pantalla CRT", "CRT screen"], p: ["Pantalla CRT: líneas de barrido, curvatura leve y persistencia de fósforo.", "CRT screen: scanlines, slight curvature and phosphor persistence."] },
  { id: "vhs", n: ["VHS", "VHS"], p: ["Tratamiento VHS con corrimiento de color y ruido de cinta, sin tapar el texto.", "VHS treatment with color bleed and tape noise, never covering the text."] },
  { id: "tiza", n: ["Tiza sobre pizarra", "Chalk on slate"], p: ["Superficie de pizarra con grano; la tiza deja polvo fino al final de cada trazo.", "Slate surface with grain; chalk leaves fine powder at the end of each stroke."] },
];

export const arte = {
  id: "arte", nombre: "Estilo y arte", titulo: ["Dirección de arte", "Art direction"],
  grupos: [
    { id: "estilo", titulo: "Estilo", ayuda: "Mezcla: elige hasta tres estilos para toda la pieza. Recorrido: un estilo por plano, tantos como quieras.", controles: [
        { k: "modo", t: "opciones", vista: "chips", titulo: "Cómo se usan los estilos", def: "mezcla", label: ["Uso de estilos", "Style use"], opciones: [
          { id: "mezcla", n: ["Mezcla", "Blend"], d: "Hasta tres estilos para toda la pieza: 70, 20 y 10 %." },
          { id: "recorrido", n: ["Recorrido", "Style tour"], d: "Un estilo por plano, de uno en uno, con un plano de ráfaga si quieres." },
        ] },
        { k: "estilos", t: "galeria", def: { base: "S26", secundario: null, acento: null }, label: ["Estilo", "Style"] },
        { k: "recorrido", t: "lista-estilos", def: [], label: ["Recorrido", "Style tour"] },
        { k: "intensidad", t: "opciones", vista: "chips", titulo: "Intensidad del estilo", def: "media", label: ["Intensidad", "Intensity"], opciones: [
          { id: "baja", n: ["Baja", "Low"], d: "Para contenido hablado.", p: ["Intensidad baja: el estilo acompaña y no compite con la voz.", "Low intensity: the style supports and does not compete with the voice."] },
          { id: "media", n: ["Media", "Medium"], d: "Para explicar con gráficos.", p: ["Intensidad media: el estilo se reconoce en al menos dos rasgos propios en cada plano.", "Medium intensity: the style reads through at least two of its own traits in each shot."] },
          { id: "alta", n: ["Alta", "High"], d: "Para aperturas y piezas de arte.", p: ["Intensidad alta: el estilo es el protagonista.", "High intensity: the style is the star."] },
        ] },
      ] },
    { id: "formas", titulo: "Formas", ayuda: "De qué está hecho lo que se ve y cómo ocupa la pantalla.", controles: [
        { k: "formas", t: "opciones", vista: "formas", multi: 2, def: [], titulo: "Lenguaje de formas (opcional: si no eliges, manda el estilo)", label: ["Formas", "Shapes"], opciones: formas },
        { k: "pantalla", t: "opciones", vista: "tarjetas", def: "capitulos", titulo: "Uso de la pantalla", label: ["Pantalla", "Screen use"], opciones: pantallas },
      ] },
    { id: "color", titulo: "Color", controles: [
        { k: "paleta", t: "paleta", def: "propios", label: ["Paleta", "Palette"], opciones: paletas },
        { k: "textura", t: "opciones", vista: "chips", titulo: "Acabado", def: "grano", label: ["Acabado", "Finish"], opciones: texturas },
      ] },
    { id: "tipo", titulo: "Tipografía", controles: [
        { k: "tipografia", t: "opciones", vista: "tipo", def: "auto", label: ["Tipografía", "Typography"], opciones: tipografias },
        { k: "tamano", t: "rango", titulo: "Tamaño de los títulos", min: 3, max: 15, paso: 0.5, def: 6, unidad: "% de la altura", label: ["Tamaño de títulos", "Title size"], p: ["Títulos de cerca de {v} % de la altura del cuadro. Nada que deba leerse por debajo de {min} px.", "Titles around {v}% of the frame height. Nothing meant to be read under {min} px."] },
        { k: "caja", t: "opciones", vista: "chips", titulo: "Mayúsculas y minúsculas", def: "oracion", label: ["Caja", "Case"], opciones: [
          { id: "oracion", n: ["Oración", "Sentence case"], p: ["Caja de oración: solo la primera en mayúscula.", "Sentence case: only the first letter capitalized."] },
          { id: "minusculas", n: ["Minúsculas", "Lowercase"], p: ["Todo en minúsculas, como elemento gráfico; conserva las tildes.", "All lowercase, as a graphic element; keep the accents."] },
          { id: "mayusculas", n: ["Mayúsculas", "All caps"], p: ["Títulos en mayúsculas, de 1 a 3 palabras, conservando las tildes.", "Titles in all caps, 1 to 3 words, keeping the accents."] },
        ] },
      ] },
    { id: "marca", titulo: "Marca y referencia", controles: [
        { k: "marca", t: "opciones", vista: "chips", titulo: "Marca (aparte de la paleta)", def: "ninguna", label: ["Marca", "Brand"], opciones: [
          { id: "ninguna", n: ["Sin marca", "No brand"], p: ["Sin marca ni logos.", "No brand or logos."] },
          { id: "bg", n: ["BG System IA", "BG System IA"], p: ["Marca BG System IA: su emblema real, library/marca/bg-system-ia/emblema.png, es un cuadrado con fondo propio: recórtalo en círculo con border-radius y no lo redibujes. Su frase de cierre es «La IA, explicada con claridad»: cierra con ella solo si el tema es de IA.", "BG System IA brand: its real emblem, library/marca/bg-system-ia/emblema.png, is a square with its own ground: crop it to a circle with border-radius and do not redraw it. Its closing line is «La IA, explicada con claridad»: close with it only if the topic is AI."] },
          { id: "propia", n: ["Otra marca", "Another brand"], p: ["Usa la marca descrita en las notas. Solo logos, colores y fuentes reales, nunca inventados. Si tiene sitio web, extrae sus datos con npx hyperframes capture.", "Use the brand described in the notes. Real logos, colors and fonts only, never invented. If it has a website, extract its data with npx hyperframes capture."] },
        ] },
        { k: "referencia", t: "texto", titulo: "Referencia visual (enlace o descripción)", holder: "Un video o imagen que te guste", def: "", label: ["Referencia", "Reference"], traducible: true, nota: ["Toma de la referencia su gramática: duración de planos, entradas, transiciones y escala. Nunca su contenido.", "Take the reference's grammar: shot lengths, entrances, transitions and scale. Never its content."] },
      ] },
  ],
};
