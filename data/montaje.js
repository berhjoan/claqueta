// Montaje: ritmo, sincronía y transiciones. `tr` indica al monitor cómo previsualizar cada paso.
export const ritmos = [
  { id: "contemplativo", n: ["Contemplativo", "Contemplative"], d: "6 a 10 s por plano. Documental, arte.", seg: 8, p: ["Ritmo contemplativo: planos de 6 a 10 s con movimiento interno.", "Contemplative pace: 6 to 10 s shots with motion inside them."] },
  { id: "pausado", n: ["Pausado", "Measured"], d: "4 a 6 s por idea. Explicar con calma.", seg: 5, p: ["Ritmo pausado: de 4 a 6 s por idea; algo nuevo cada 2 a 4 s dentro del plano.", "Measured pace: 4 to 6 s per idea; something new every 2 to 4 s inside the shot."] },
  { id: "medio", n: ["Medio", "Steady"], d: "3 a 4 s por plano. El estándar educativo.", seg: 3.5, p: ["Ritmo medio: planos de 3 a 4 s con un compás nuevo cada 2 a 4 s.", "Steady pace: 3 to 4 s shots with a new beat every 2 to 4 s."] },
  { id: "vivo", n: ["Vivo", "Lively"], d: "2 a 3 s por plano. Redes verticales.", seg: 2.4, p: ["Ritmo vivo: planos de 1,8 a 3 s con movimiento dentro; el remate antes de que el espectador deslice.", "Lively pace: 1.8 to 3 s shots with motion inside; the payoff before the viewer swipes."] },
  { id: "frenetico", n: ["Frenético", "Frantic"], d: "Menos de 1 s por plano, en ráfagas.", seg: 0.9, p: ["Ritmo frenético en ráfagas: montajes de 0,13 a 0,8 s por corte, siempre contrastados con una pausa.", "Frantic bursts: montages at 0.13 to 0.8 s per cut, always contrasted with a hold."] },
  { id: "secuencia", n: ["Plano secuencia", "One take"], d: "Sin cortes: la cámara viaja por un solo mundo.", seg: 30, p: ["Plano secuencia: sin cortes visibles; la cámara viaja por un solo mundo y los cambios de idea son lugares de ese mundo.", "One take: no visible cuts; the camera travels through a single world and each new idea is a place in it."] },
];

export const sincronia = [
  { id: "voz", n: ["A la voz", "To the voice"], d: "Cada idea entra cuando la voz la dice.", p: ["La voz es el reloj: cada elemento aterriza en la palabra que lo nombra, con desfase máximo de 2 cuadros.", "The voice is the clock: each element lands on the word that names it, within 2 frames."] },
  { id: "frase", n: ["A la frase musical", "To the musical phrase"], d: "Los cortes grandes caen en frases.", p: ["Los cortes grandes caen en frases musicales; dentro de la frase mandan las ideas.", "Major cuts fall on musical phrases; inside a phrase, ideas lead."] },
  { id: "pulso", n: ["Al pulso", "On the beat"], d: "Cortes y golpes exactos en el compás.", p: ["Cortes y golpes en el pulso medido con hyperframes beats. Cuadros por pulso = fps × 60 / BPM, calculados desde el índice, nunca sumando un valor redondeado. La maquetación cambia en el compás.", "Cuts and hits on the beat measured with hyperframes beats. Frames per beat = fps × 60 / BPM, computed from the index, never by adding a rounded value. Layout changes on the bar."] },
  { id: "palabra", n: ["A la palabra clave", "On key words"], d: "Solo las palabras importantes mueven la imagen.", p: ["Solo las palabras clave mueven la imagen; entre ellas la imagen descansa.", "Only key words move the picture; between them the picture rests."] },
];

export const patrones = [
  { id: "constante", n: ["Parejo", "Even"], p: ["Ritmo parejo durante toda la pieza.", "Even pace across the piece."] },
  { id: "acelera", n: ["Acelera hacia el final", "Builds to the end"], p: ["El ritmo acelera hacia el final: los últimos planos duran la mitad que los primeros.", "The pace builds: the last shots last half as long as the first."] },
  { id: "golpes", n: ["Golpes y respiros", "Hits and breaths"], p: ["Alterna ráfagas con pausas: un momento de contraste al menos cada 15 s.", "Alternate bursts with holds: a contrast moment at least every 15 s."] },
  { id: "silencio", n: ["Silencio antes del dato", "Silence before the fact"], p: ["Antes del dato más importante, sostén 0,3 a 0,75 s en silencio; el remate va a velocidad normal.", "Before the most important fact, hold 0.3 to 0.75 s in silence; the payoff plays at normal speed."] },
];

export const transiciones = [
  { id: "corte", n: ["Corte seco", "Hard cut"], d: "Directo. Dentro de una escena o con ritmo.", tr: "corte", p: ["Corte seco: cae en un pulso o sobre una acción. Si un movimiento cruza el corte, córtalo en su cuadro más rápido, con dirección y velocidad iguales a ambos lados.", "Hard cut: it lands on a beat or on an action. If a move crosses the cut, cut at its fastest frame, with matching direction and speed on both sides."] },
  { id: "coincidencia", n: ["Corte por coincidencia", "Match cut"], d: "Una forma se vuelve otra de la siguiente escena.", tr: "morph", p: ["Corte por coincidencia: una forma, posición o movimiento continúa en la escena siguiente.", "Match cut: a shape, position or movement continues into the next scene."] },
  { id: "objeto", n: ["El objeto se vuelve el mundo", "Object becomes the world"], d: "Una tarjeta o forma crece hasta llenar el cuadro.", tr: "objeto", p: ["El objeto se vuelve el mundo: crece más allá del cuadro en 0,65 s con power2.inOut, su radio se reduce, lo de alrededor se desenfoca 15 px y se apaga en 0,3 s.", "Object becomes the world: it grows past the frame in 0.65 s on power2.inOut, its radius shrinks, its surroundings blur 15 px and fade in 0.3 s."] },
  { id: "zoom", n: ["Zoom a través", "Zoom through"], d: "La cámara pasa de largo hacia la siguiente idea.", tr: "zoom", p: ["Zoom a través: la cámara avanza en Z en tres fases, con desenfoque máximo de 10 px en texto y 20 px a cuadro completo, y opacidad de 0,15 en el corte.", "Zoom through: the camera pushes along Z in three phases, peak blur 10 px on text and 20 px full frame, opacity 0.15 at the cut."] },
  { id: "zoom_inv", n: ["Zoom inverso", "Inverse zoom"], d: "La siguiente idea llega desde lejos.", tr: "zoominv", p: ["Zoom inverso para llegadas y remates: la escena nueva llega desde lejos y se asienta.", "Inverse zoom for arrivals and payoffs: the new scene arrives from afar and settles."] },
  { id: "curva", n: ["Cortar en la curva", "Cut the curve"], d: "Un mismo impulso lateral lleva de una escena a otra.", tr: "empuje", p: ["Cortar en la curva: salida con power3.in y entrada con power3.out en la misma dirección y velocidad, de modo que el corte queda oculto en el punto más rápido.", "Cut the curve: exit on power3.in and entry on power3.out in the same direction and speed, hiding the cut at the fastest point."] },
  { id: "cascada", n: ["Cascada de palabras", "Word waterfall"], d: "Las palabras salen y entran como una ola.", tr: "cascada", p: ["Cascada de palabras: cada palabra sale y la siguiente entra como una ola horizontal; la última muere en el corte.", "Word waterfall: each word exits and the next enters as a horizontal wave; the last dies at the cut."] },
  { id: "latigo", n: ["Barrido rápido", "Whip"], d: "Un latigazo con desenfoque.", tr: "latigo", p: ["Barrido rápido de 0,13 a 0,3 s; lo que llega aterriza desenfocado y se aclara en 0,13 s.", "Whip smear of 0.13 to 0.3 s; what arrives lands blurred and sharpens in 0.13 s."] },
  { id: "cortinilla", n: ["Cortinilla direccional", "Directional wipe"], d: "Una línea barre el cuadro.", tr: "cortinilla", p: ["Cortinilla direccional con clip-path en 0,4 a 0,6 s, en la dirección de la narración.", "Directional wipe with clip-path in 0.4 to 0.6 s, in the direction of the story."] },
  { id: "iris", n: ["Iris desde un punto", "Iris from a point"], d: "Un círculo se abre desde lo que se tocó.", tr: "iris", p: ["Iris: clip-path circle() se abre desde el punto activado hacia el mundo siguiente en 0,15 a 0,4 s.", "Iris: clip-path circle() opens from the activated point onto the next world in 0.15 to 0.4 s."] },
  { id: "inundar", n: ["Inundación de color", "Color flood"], d: "El objeto se queda y cambia todo el fondo.", tr: "inundar", p: ["Inundación de color: el objeto principal se queda y todo el fondo cambia de color en 0,4 s con power2.inOut.", "Color flood: the hero object stays and the whole ground changes color in 0.4 s on power2.inOut."] },
  { id: "desenfoque", n: ["Cambio con desenfoque", "Blur swap"], d: "En el mismo escenario, el contenido se relevo.", tr: "blur", p: ["Cambio con desenfoque en un mismo escenario: salida con 8 px y opacidad a 0 en 0,13 a 0,2 s, entrada de 8 a 0 en 0,13 s. El fondo no corta.", "Blur swap on one stage: out with 8 px and opacity to 0 in 0.13 to 0.2 s, in from 8 to 0 in 0.13 s. The ground never cuts."] },
  { id: "morph", n: ["Transformación", "Morph"], d: "Un contenedor se ensancha en el siguiente.", tr: "morph", p: ["Transformación: un contenedor se ensancha hasta el siguiente en 0,2 s con power3.out y desenfoque horizontal de 12 a 0.", "Morph: one container widens into the next in 0.2 s on power3.out with horizontal blur from 12 to 0."] },
  { id: "mascara", n: ["A través del texto", "Through the type"], d: "La escena siguiente se ve por dentro de las letras.", tr: "objeto", p: ["Máscara de texto: las letras crecen hasta llenar el cuadro y por dentro de ellas aparece la escena siguiente.", "Text mask: the letters grow until they fill the frame, revealing the next scene inside them."] },
  { id: "material", n: ["Del propio material", "From the medium itself"], d: "Borrar la pizarra, pasar página, rasgar papel.", tr: "cortinilla", p: ["Transición nacida del material del estilo: borrador sobre la pizarra, panel que se desliza, papel que se rasga, tinta que se extiende. Una sola gramática en toda la pieza.", "Transition born from the style's material: an eraser pass over the board, a sliding panel, torn paper, spreading ink. One grammar across the piece."] },
  { id: "oscuro", n: ["Corte con caída", "Dip cut"], d: "Oscurece 3 cuadros para que el corte se sienta buscado.", tr: "oscuro", p: ["Corte con caída: el cuadro saliente oscurece cerca de 40 % durante 3 cuadros antes de un corte seco.", "Dip cut: the outgoing frame darkens about 40% for 3 frames before a hard cut."] },
  { id: "disolver", n: ["Disolvencia", "Dissolve"], d: "Solo si el paso del tiempo lo pide.", tr: "disolver", p: ["Disolvencia de 0,5 s solo cuando cuenta el paso del tiempo; los mundos distintos no se disuelven entre sí.", "0.5 s dissolve only when it tells the passage of time; different worlds never crossfade."] },
  { id: "shader", n: ["Efecto de shader", "Shader transition"], d: "Distorsión, ondas o pixelado; bloques listos.", tr: "shader", p: ["Transición de shader del registro: busca con npx hyperframes catalog --tag transition --json y usa una sola familia. Máximo 2 en la pieza y siempre con motivo.", "Shader transition from the registry: search with npx hyperframes catalog --tag transition --json and use one family. At most 2 in the piece, always with a reason."] },
  { id: "glitch", n: ["Glitch", "Glitch"], d: "Ruptura digital breve; solo en lo que falla.", tr: "glitch", p: ["Glitch de hasta 0,2 s por ráfaga, con desplazamiento de bandas y canales separados, solo en lo que falla o amenaza.", "Glitch up to 0.2 s per burst, with band displacement and channel split, only on what fails or threatens."] },
];

export const recursos = [
  { id: "cierres", n: ["Acercamientos de énfasis", "Punch-ins"], p: ["Acercamientos de énfasis por corte a 1,15 a 1,3 en palabras clave.", "Punch-ins by cut to 1.15 to 1.3 on key words."] },
  { id: "jl", n: ["Cortes J y L", "J and L cuts"], p: ["El sonido se adelanta o se alarga 0,2 a 0,6 s sobre el cambio de imagen.", "Sound leads or trails the picture change by 0.2 to 0.6 s."] },
  { id: "rampa", n: ["Rampas de velocidad", "Speed ramps"], p: ["Rampas de velocidad en el material: rápido entre momentos y normal en el remate.", "Speed ramps on footage: fast between moments and normal on the payoff."] },
  { id: "congelar", n: ["Cuadro congelado", "Freeze frame"], p: ["Cuadro congelado con una anotación encima en el momento clave.", "Freeze frame with an annotation on top at the key moment."] },
  { id: "dividida", n: ["Pantalla dividida", "Split screen"], p: ["Pantalla dividida para comparar, reconstruida para el formato y no recortada.", "Split screen to compare, rebuilt for the format rather than cropped."] },
  { id: "cuadro", n: ["Cuadro dentro de cuadro", "Picture in picture"], p: ["Cuadro dentro de cuadro para mantener el contexto mientras se explica.", "Picture in picture to keep context while explaining."] },
  { id: "saltos", n: ["Cortes de salto", "Jump cuts"], p: ["Cortes de salto en la toma hablada: elimina silencios mayores a 0,3 s. Herramienta sugerida: auto-editor.", "Jump cuts on the talking take: remove silences over 0.3 s. Suggested tool: auto-editor."] },
  { id: "bucle", n: ["Bucle perfecto", "Perfect loop"], p: ["El último cuadro empalma con el primero sin que se note.", "The last frame seamlessly matches the first."] },
];

export const montaje = {
  id: "montaje", nombre: "Montaje", titulo: ["Montaje", "Editing"],
  grupos: [
    { id: "ritmo", titulo: "Ritmo", ayuda: "Marca cuántos planos propone la línea de tiempo.", controles: [
        { k: "ritmo", t: "opciones", vista: "tarjetas", def: "medio", label: ["Ritmo", "Pace"], opciones: ritmos },
        { k: "sincronia", t: "opciones", vista: "chips", def: "voz", titulo: "Qué manda los cortes", label: ["Sincronía", "Sync"], opciones: sincronia },
        { k: "patron", t: "opciones", vista: "chips", def: "golpes", titulo: "Forma del ritmo", label: ["Forma del ritmo", "Pace shape"], opciones: patrones },
      ] },
    { id: "trans", titulo: "Transiciones", ayuda: "Elige de 3 a 5, cada una causada por algo en pantalla. Pasa el cursor para verlas en el monitor.", controles: [
        { k: "transiciones", t: "opciones", vista: "transicion", multi: 5, def: ["objeto", "curva", "corte"], label: ["Transiciones permitidas", "Allowed transitions"], opciones: transiciones },
        { k: "tr_dur", t: "rango", titulo: "Duración base de transición", min: 0.1, max: 1.2, paso: 0.05, def: 0.5, unidad: "s", label: ["Duración de transición", "Transition length"], p: ["Las transiciones duran cerca de {v} s, salvo que su receta diga otra cosa. Cada transición con su causa en pantalla.", "Transitions last about {v} s unless their recipe says otherwise. Each one has a cause on screen."] },
      ] },
    { id: "rec", titulo: "Recursos de edición", controles: [
        { k: "recursos", t: "opciones", vista: "chips", multi: 8, def: [], label: ["Recursos de edición", "Editing devices"], opciones: recursos },
      ] },
  ],
};
