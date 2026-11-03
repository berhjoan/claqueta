// Animación de elementos y texto. `curva` y `anim` alimentan el monitor.
export const curvas = [
  { id: "firme", n: ["Firme", "Firm"], d: "Llega con cola larga. La base recomendada.", curva: "cubic-bezier(.16,1,.3,1)", p: ["Curvas por función: llegadas con cola larga (expo.out o power4.out), cámara con power2.inOut y salidas o zooms de paso con power3.in.", "Eases by role: arrivals on a long tail (expo.out or power4.out), camera on power2.inOut, exits and zooms through on power3.in."] },
  { id: "suave", n: ["Suave", "Smooth"], d: "Tranquilo y parejo, sin golpes.", curva: "cubic-bezier(.215,.61,.355,1)", p: ["Curva base power3.out, cubic-bezier(.215,.61,.355,1). Sin rebotes.", "Base ease power3.out, cubic-bezier(.215,.61,.355,1). No bounce."] },
  { id: "premium", n: ["Resorte contenido", "Restrained spring"], d: "Se asienta con un rebote mínimo.", curva: "cubic-bezier(.34,1.36,.64,1)", p: ["Resortes con razón de amortiguación de 0,7 a 0,85 en posición y tamaño, nunca en opacidad ni color. Sobrepaso máximo del 6 %.", "Springs at a 0.7 to 0.85 damping ratio on position and size, never on opacity or color. Maximum 6% overshoot."] },
  { id: "jugueton", n: ["Juguetón", "Playful"], d: "Rebota con personalidad.", curva: "cubic-bezier(.34,1.8,.64,1)", p: ["Resortes con amortiguación de 0,4 a 0,6 y poses exageradas del 10 % al 30 %. Nunca en texto que se lee.", "Springs at 0.4 to 0.6 damping and 10% to 30% exaggerated poses. Never on text being read."] },
  { id: "mecanico", n: ["Mecánico", "Mechanical"], d: "Velocidad constante, precisión de máquina.", curva: "linear", p: ["Movimiento mecánico: velocidad constante y paradas secas, como una máquina.", "Mechanical motion: constant speed and hard stops, like a machine."] },
  { id: "stop", n: ["Stop motion", "Stop motion"], d: "A saltos, como animación cuadro a cuadro.", curva: "steps(6)", p: ["Stop motion: la imagen se actualiza a 8 o 12 cuadros por segundo, en poses, con leves imperfecciones de semilla fija.", "Stop motion: the picture updates at 8 or 12 fps, in poses, with slight seeded imperfections."] },
];

export const entradasTexto = [
  { id: "mascara", n: ["Máscara por línea", "Line mask"], d: "Cada línea sube desde una ranura.", anim: "mascara", p: ["Texto: cada línea entra con máscara vertical en 300 ms con power3.out.", "Text: each line enters through a vertical mask in 300 ms on power3.out."] },
  { id: "desenfoque", n: ["Palabra con desenfoque", "Word blur-in"], d: "Cada palabra se aclara, sin moverse.", anim: "blur", p: ["Texto: por palabra, desenfoque de 6 px a 0 y opacidad de 0 a 1 en 0,13 s, separadas 0,067 s, sin desplazamiento.", "Text: per word, blur 6 px to 0 and opacity 0 to 1 in 0.13 s, 0.067 s apart, no translate."] },
  { id: "palabra", n: ["Palabra por palabra", "Word by word"], d: "Las palabras caen al ritmo de la voz.", anim: "palabra", p: ["Texto: palabra por palabra, cada una entra cuando la voz la dice, con separación de 60 a 120 ms cuando no hay voz.", "Text: word by word, each one enters when the voice says it, 60 to 120 ms apart when there is no voice."] },
  { id: "letra", n: ["Letra a letra", "Letter by letter"], d: "Solo para nombres o frases muy cortas.", anim: "letra", p: ["Texto: letra a letra con separación de un cuadro, solo en nombres o frases de hasta 3 palabras.", "Text: letter by letter one frame apart, only on names or phrases up to 3 words."] },
  { id: "mano", n: ["Se escribe a mano", "Handwritten"], d: "El trazo se dibuja en orden, como tiza o tinta.", anim: "trazo", p: ["Texto: se escribe trazo a trazo con fuente de una línea, en el orden real de la mano, de 0,08 a 0,13 s por trazo y 40 ms de aire entre letras. Motor: engines/pizarra.", "Text: written stroke by stroke with a single-line font, in real hand order, 0.08 to 0.13 s per stroke and 40 ms of air between letters. Engine: engines/pizarra."] },
  { id: "maquina", n: ["Máquina de escribir", "Typewriter"], d: "Aparece letra a letra con un cursor.", anim: "maquina", p: ["Texto: máquina de escribir con cursor, de 30 a 50 ms por carácter, corrigiendo como una persona si la escena lo pide.", "Text: typewriter with a caret, 30 to 50 ms per character, correcting like a person if the scene calls for it."] },
  { id: "laminas", n: ["Tablero de láminas", "Split-flap"], d: "Letras que giran hasta quedar fijas.", anim: "laminas", p: ["Texto: tablero de láminas con bisagra visible, celdas de ancho fijo, cada letra gira de 3 a 6 caracteres en 40 a 80 ms y llega con un ligero rebote.", "Text: split-flap board with a visible hinge, fixed-width cells, each letter flips 3 to 6 characters in 40 to 80 ms and lands with a slight rebound."] },
  { id: "impacto", n: ["Impacto de escala", "Scale slam"], d: "La palabra llega grande y se asienta de golpe.", anim: "impacto", p: ["Texto: la palabra entra de escala 1,4 a 1 en 0,3 s con expo.out, con golpe de sonido. Solo en palabras clave.", "Text: the word slams from scale 1.4 to 1 in 0.3 s on expo.out, with a sound hit. Key words only."] },
  { id: "descifrar", n: ["Se descifra", "Scramble decode"], d: "Caracteres al azar se ordenan en la palabra.", anim: "descifrar", p: ["Texto: caracteres de semilla fija se resuelven hasta la palabra en 0,4 a 0,8 s, de izquierda a derecha.", "Text: seeded characters resolve into the word in 0.4 to 0.8 s, left to right."] },
  { id: "cambio", n: ["Palabra que cambia", "Word swap"], d: "Una frase fija y una palabra que rota.", anim: "cambio", p: ["Texto: la frase queda fija y una palabra cambia en el mismo lugar con corte seco en el pulso, unos 0,1 s por opción.", "Text: the line holds and one word swaps in place on a hard cut on the beat, about 0.1 s per option."] },
  { id: "variable", n: ["Fuente variable", "Variable font"], d: "El peso o el ancho cambian para enfatizar.", anim: "variable", p: ["Texto: la fuente variable cambia peso o ancho para enfatizar, sin cambiar de posición.", "Text: the variable font changes weight or width for emphasis, without changing position."] },
];

export const entradasElementos = [
  { id: "trazar", n: ["Se dibuja el trazo", "Line draw-on"], p: ["Formas y conectores se dibujan en la dirección del flujo.", "Shapes and connectors draw on in the direction of flow."] },
  { id: "crecer", n: ["Crece desde su origen", "Grow from origin"], p: ["Los elementos crecen desde su punto de origen real, como la base de una barra o el centro de un nodo.", "Elements grow from their real origin, such as a bar's base or a node's center."] },
  { id: "cascada", n: ["Cascada", "Staggered cascade"], p: ["Los elementos entran en cascada: 40 a 80 ms entre piezas de una lista, y cada uno empieza cuando el anterior va entre 30 % y 50 %.", "Elements enter in a cascade: 40 to 80 ms between list items, each starting when the previous is 30% to 50% done."] },
  { id: "inercia", n: ["Llega con inercia", "Arrive with inertia"], p: ["Los elementos llegan desde fuera con inercia y se asientan con cola larga.", "Elements fly in with inertia and settle on a long tail."] },
  { id: "plegar", n: ["Se despliega", "Unfold"], p: ["Los elementos se despliegan como papel, con bisagra y sombra.", "Elements unfold like paper, with a hinge and a shadow."] },
  { id: "armar", n: ["Se arma por partes", "Assemble"], p: ["El objeto se arma por partes que llegan de distintas direcciones.", "The object assembles from parts arriving from different directions."] },
  { id: "morph", n: ["Se transforma", "Morph"], p: ["Un elemento se transforma en el siguiente sin cortar: 0,2 s con power3.out y desenfoque de 12 a 0.", "One element morphs into the next without a cut: 0.2 s on power3.out with blur from 12 to 0."] },
  { id: "particulas", n: ["Lo forman partículas", "Particles form it"], p: ["Una nube de puntos de semilla fija forma la figura en 2 s y la sostiene.", "A seeded point cloud forms the figure in 2 s and holds it."] },
];

export const movimiento = {
  id: "movimiento", nombre: "Movimiento", titulo: ["Movimiento", "Motion"],
  grupos: [
    { id: "carac", titulo: "Carácter", ayuda: "Cómo se mueve todo lo que no es cámara.", controles: [
        { k: "curva", t: "opciones", vista: "tarjetas", def: "firme", label: ["Carácter del movimiento", "Motion character"], opciones: curvas },
        { k: "velocidad", t: "rango", titulo: "Duración de las entradas", min: 150, max: 1200, paso: 50, def: 450, unidad: "ms", label: ["Entradas", "Entrances"], p: ["Las entradas duran unos {v} ms; las salidas, entre 40 % y 50 % menos. Las salidas nunca se detienen a medio camino.", "Entrances last about {v} ms; exits are 40% to 50% shorter. Exits never stop halfway."] },
      ] },
    { id: "texto", titulo: "Texto", controles: [
        { k: "texto", t: "opciones", vista: "tarjetas", multi: 3, def: ["mascara", "desenfoque"], label: ["Entrada de texto", "Text entrance"], opciones: entradasTexto, ayuda: "Hasta 3. Varía la entrada durante la pieza; nunca el mismo aparecer con desplazamiento en todo." },
      ] },
    { id: "elem", titulo: "Elementos", controles: [
        { k: "elementos", t: "opciones", vista: "chips", multi: 3, def: ["trazar", "crecer"], label: ["Entrada de elementos", "Element entrance"], opciones: entradasElementos },
        { k: "vida", t: "opciones", vista: "chips", def: "fondo", titulo: "Mientras se sostiene un plano", label: ["Durante una pausa", "During a hold"], opciones: [
          { id: "nada", n: ["Quieto", "Still"], p: ["Durante las pausas todo queda quieto.", "Everything stays still during holds."] },
          { id: "fondo", n: ["Solo el fondo", "Background only"], p: ["Durante las pausas solo el fondo se mueve muy poco; nada de respiraciones ni pulsos en títulos o tarjetas.", "During holds only the background moves slightly; no breathing or pulsing on titles or cards."] },
          { id: "accion", n: ["Algo sigue ocurriendo", "Action continues"], p: ["Durante las pausas algo sigue ocurriendo con sentido: una interfaz trabajando, un mundo 3D girando de 3 a 5 grados por segundo o un personaje actuando.", "During holds something meaningful keeps happening: a UI working, a 3D world turning 3 to 5 degrees per second, or a character acting."] },
        ] },
      ] },
  ],
};
