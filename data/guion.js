// Proyecto, historia y guion. El texto del guion nunca se traduce: siempre se conserva en español.
export const tipos = [
  { id: "explicador", n: ["Explicador", "Explainer"], d: "Enseña una idea con claridad.", p: ["Explicador educativo: una sola idea, entendida al final.", "Educational explainer: one idea, understood by the end."] },
  { id: "noticia", n: ["Noticia", "News brief"], d: "Qué pasó y por qué importa.", p: ["Noticia breve: qué pasó, por qué importa y qué hacer con eso. Cada dato con fuente.", "News brief: what happened, why it matters and what to do about it. Every fact sourced."] },
  { id: "negocios", n: ["Caso de negocio", "Business case"], d: "Un problema real y cómo se resuelve.", p: ["Caso de negocio: un problema real, la decisión y el resultado medible, sin inventar cifras.", "Business case: a real problem, the decision and the measurable result, with no invented figures."] },
  { id: "tutorial", n: ["Tutorial", "Tutorial"], d: "Paso a paso para hacer algo.", p: ["Tutorial: pasos concretos, cada uno comprobable, con capturas reales de pantalla.", "Tutorial: concrete steps, each verifiable, with real screen captures."] },
  { id: "promo", n: ["Promo de producto", "Product promo"], d: "Muestra qué hace y por qué quererlo.", p: ["Promo de producto: el producto real en acción, un beneficio por escena y un llamado claro.", "Product promo: the real product in action, one benefit per scene and a clear call to action."] },
  { id: "lanzamiento", n: ["Lanzamiento", "Launch film"], d: "Anuncio con energía de película.", p: ["Lanzamiento: anuncio con arco de tensión y remate de marca al final.", "Launch film: an announcement with a tension arc and a brand payoff at the end."] },
  { id: "historia", n: ["Historia o minidocumental", "Story or mini-doc"], d: "Personajes, tensión y giro.", p: ["Historia: inicio, tensión, giro, resolución y lección. Cada plano causa el siguiente.", "Story: setup, tension, turn, resolution and lesson. Each shot causes the next."] },
  { id: "datos", n: ["Historia con datos", "Data story"], d: "Las cifras cuentan algo.", p: ["Historia con datos: escalas primero, luego valores y al final la conclusión; solo cifras con fuente.", "Data story: scales first, then values, then the conclusion; sourced figures only."] },
  { id: "musical", n: ["Video musical o arte", "Music or art film"], d: "La música manda la imagen.", p: ["Pieza musical: la pista es el reloj y la imagen responde a su energía.", "Music piece: the track is the clock and the picture answers its energy."] },
  { id: "tipografico", n: ["Anuncio tipográfico", "Type-only spot"], d: "Solo palabras en movimiento.", p: ["Anuncio solo con tipografía en movimiento; la palabra es la imagen.", "Type-only spot; the word is the image."] },
  { id: "recorte", n: ["Reedición de un video", "Re-edit of footage"], d: "Mejorar una toma propia con gráficos.", p: ["Reedición de material existente: conserva voz, identidad y hechos; solo agrega lo pedido y nunca tapes el rostro.", "Re-edit of existing footage: keep voice, identity and facts; add only what was asked and never cover the face."] },
  { id: "cita", n: ["Reel de opinión", "Opinion reel"], d: "Una frase fuerte y su argumento.", p: ["Reel de opinión: una afirmación fuerte, su argumento y una pregunta al final.", "Opinion reel: a strong claim, its argument and a closing question."] },
];

export const estructuras = [
  { id: "concepto", n: ["Concepto por capas", "Concept in layers"], d: "Qué es, cómo funciona, por qué importa.", planos: ["Gancho", "Qué es", "Cómo funciona", "Cómo funciona por dentro", "Por qué importa", "Cierre"], p: ["Estructura de concepto: nombra la idea, revela el mecanismo capa por capa y aterriza la implicación.", "Concept structure: name the idea, reveal the mechanism layer by layer, and land the implication."] },
  { id: "pasos", n: ["Paso a paso", "Step by step"], d: "De 3 a 6 pasos sobre un mismo escenario.", planos: ["Gancho", "Paso 1", "Paso 2", "Paso 3", "Resultado", "Cierre"], p: ["Estructura de proceso: de 3 a 6 pasos sobre un mismo escenario visual, un movimiento por paso.", "Process structure: 3 to 6 steps on one visual stage, one move each."] },
  { id: "lista", n: ["Lista de 3", "List of 3"], d: "Tres puntos parejos y un remate.", planos: ["Gancho", "Punto 1", "Punto 2", "Punto 3", "Remate"], p: ["Estructura de lista: gancho, tres puntos parejos y remate.", "List structure: hook, three parallel items and a wrap."] },
  { id: "historia", n: ["Historia con giro", "Story with a turn"], d: "Inicio, tensión, giro y lección.", planos: ["Situación", "Tensión", "Giro", "Resolución", "Lección"], p: ["Estructura narrativa: inicio, tensión, giro, resolución y lección que generaliza.", "Narrative structure: setup, tension, turn, resolution and a lesson that generalizes."] },
  { id: "mito", n: ["Mito y verdad", "Myth and truth"], d: "Se escribe lo que se cree, se borra, se corrige.", mismaCamara: ["Lo que se cree", "Se borra", "La verdad"], planos: ["Pregunta", "Lo que se cree", "Se borra", "La verdad", "Por qué", "Cierre"], p: ["Estructura mito y verdad: escribe lo que la gente cree, bórralo en una sola pasada y escribe la verdad en el mismo lugar con la misma cámara.", "Myth and truth structure: write what people believe, wipe it in one pass and write the truth in the same place from the same camera."] },
  { id: "antes", n: ["Antes y después", "Before and after"], d: "Dos estados y el cambio que los une.", mismaCamara: ["Antes", "El cambio", "Después"], planos: ["Gancho", "Antes", "El cambio", "Después", "Cierre"], p: ["Estructura de antes y después: muestra los dos estados con el mismo encuadre para que se comparen.", "Before and after structure: show both states in the same framing so they compare."] },
  { id: "problema", n: ["Problema y solución", "Problem and solution"], d: "El dolor, la causa y la salida.", planos: ["El dolor", "La causa", "La salida", "Cómo aplicarla", "Cierre"], p: ["Estructura de problema y solución: valida el dolor, muestra la causa y da la salida concreta.", "Problem and solution structure: validate the pain, show the cause and give the concrete way out."] },
  { id: "noticia", n: ["Noticia en 3 datos", "News in 3 facts"], d: "Titular, tres claves e implicación.", planos: ["Titular", "Clave 1", "Clave 2", "Clave 3", "Qué significa"], p: ["Estructura de noticia: titular en los primeros 3 s, tres claves numeradas e implicación práctica.", "News structure: headline in the first 3 s, three numbered keys and a practical implication."] },
  { id: "versus", n: ["Comparación A contra B", "A versus B"], d: "Dos opciones lado a lado y una decisión.", planos: ["La duda", "Opción A", "Opción B", "Diferencia clave", "Decisión"], p: ["Estructura comparativa: dos opciones con los mismos criterios y una decisión clara al final.", "Comparison structure: two options on the same criteria and a clear decision at the end."] },
  { id: "tiempo", n: ["Línea de tiempo", "Timeline"], d: "Cómo llegamos hasta aquí.", planos: ["Hoy", "Origen", "Punto de quiebre", "Ahora", "Qué sigue"], p: ["Estructura de línea de tiempo: la cámara recorre fechas y el presente responde al inicio.", "Timeline structure: the camera travels through dates and the present answers the opening."] },
  { id: "demo", n: ["Demostración", "Live demo"], d: "Se ve funcionar, sin explicar de más.", planos: ["La promesa", "Se hace", "Resultado", "Cómo repetirlo"], p: ["Estructura de demostración: se hace frente al espectador, con la interfaz real y el resultado visible.", "Demo structure: it happens in front of the viewer, with the real interface and a visible result."] },
];

export const ganchos = [
  { id: "pregunta", n: ["Pregunta", "Question"], d: "Abre un vacío que pide respuesta.", p: ["Gancho: una pregunta que abre un vacío.", "Hook: a question that opens a gap."] },
  { id: "contraintuitivo", n: ["Contra lo que se cree", "Counterintuitive claim"], d: "La verdad contradice la creencia común.", p: ["Gancho: una afirmación que contradice lo que se cree.", "Hook: a claim that contradicts common belief."] },
  { id: "dolor", n: ["Dolor reconocible", "Pain validation"], d: "El espectador se ve reflejado.", p: ["Gancho: un dolor que el espectador reconoce como suyo.", "Hook: a pain the viewer recognizes as their own."] },
  { id: "dato", n: ["Dato impactante", "Striking fact"], d: "Una cifra con fuente mide lo que está en juego.", p: ["Gancho: una cifra creíble con fuente que mide lo que está en juego.", "Hook: a credible sourced number that measures the stakes."] },
  { id: "metafora", n: ["Metáfora visual", "Visual metaphor"], d: "Vuelve concreta una idea abstracta.", p: ["Gancho: una metáfora visual que vuelve concreta la idea.", "Hook: a visual metaphor that makes the idea concrete."] },
  { id: "escenario", n: ["Imagina que…", "Imagine a scenario"], d: "Un experimento mental enmarca todo.", p: ["Gancho: un escenario imaginario que enmarca toda la pieza.", "Hook: an imagined scenario that frames the whole piece."] },
  { id: "directo", n: ["Hablarle a alguien", "Direct address"], d: "Nombra exactamente a quién le sirve.", p: ["Gancho: se dirige a una audiencia concreta.", "Hook: speaks to a specific audience."] },
  { id: "resultado", n: ["Mostrar el resultado", "Show the result"], d: "Primero el final y luego cómo se llegó.", p: ["Gancho: abre mostrando el resultado y luego cuenta cómo se llegó.", "Hook: open on the result, then tell how it got there."] },
  { id: "consecuencia", n: ["Lo que está en juego", "Stakes"], d: "Qué cuesta no saber esto.", p: ["Gancho: lo que cuesta no saber esto.", "Hook: what it costs not to know this."] },
];

export const tonos = [
  { id: "cercano", n: ["Claro y cercano", "Clear and warm"], p: ["Tono claro y cercano, como un amigo que sabe del tema.", "Clear, warm tone, like a friend who knows the subject."] },
  { id: "energico", n: ["Enérgico", "Energetic"], p: ["Tono enérgico, frases cortas.", "Energetic tone, short sentences."] },
  { id: "sobrio", n: ["Sobrio periodístico", "Sober journalistic"], p: ["Tono sobrio y periodístico, sin adjetivos de más.", "Sober journalistic tone, no needless adjectives."] },
  { id: "inspirador", n: ["Inspirador", "Inspiring"], p: ["Tono inspirador sin promesas vacías.", "Inspiring tone with no empty promises."] },
  { id: "humor", n: ["Humor seco", "Dry humor"], p: ["Humor seco y preciso, sin caricatura.", "Dry, precise humor, no caricature."] },
  { id: "misterio", n: ["Intriga", "Intrigue"], p: ["Tono de intriga que retiene la respuesta hasta el final.", "Intriguing tone that holds back the answer until the end."] },
  { id: "provocador", n: ["Provocador", "Provocative"], p: ["Tono provocador, sin sensacionalismo ni miedo.", "Provocative tone, with no sensationalism or fear."] },
];

export const variantes = [
  { id: "es-419", n: ["Español neutro latinoamericano", "Neutral Latin American Spanish"], p: ["Español neutro de Latinoamérica (es-419).", "Neutral Latin American Spanish (es-419)."] },
  { id: "es-CO", n: ["Español de Colombia", "Colombian Spanish"], p: ["Español de Colombia (es-CO), con tuteo.", "Colombian Spanish (es-CO), using tú."] },
  { id: "es-MX", n: ["Español de México", "Mexican Spanish"], p: ["Español de México (es-MX).", "Mexican Spanish (es-MX)."] },
  { id: "es-AR", n: ["Español de Argentina", "Argentinian Spanish"], p: ["Español de Argentina (es-AR), con voseo.", "Argentinian Spanish (es-AR), using vos."] },
  { id: "es-ES", n: ["Español de España", "Spanish from Spain"], p: ["Español de España (es-ES).", "Spanish from Spain (es-ES)."] },
  { id: "es-PA", n: ["Español de Panamá", "Panamanian Spanish"], p: ["Español de Panamá (es-PA).", "Panamanian Spanish (es-PA)."] },
];

export const finales = [
  { id: "responde", n: ["El final responde al inicio", "Ending answers the opening"], p: ["El final responde al inicio; sin llamado explícito.", "The ending answers the opening; no explicit call to action."] },
  { id: "seguir", n: ["Invita a seguir", "Invite to follow"], p: ["Cierre: invita a seguir la cuenta con una razón concreta.", "Close: invite viewers to follow, with a concrete reason."] },
  { id: "guardar", n: ["Invita a guardar", "Invite to save"], p: ["Cierre: invita a guardar el video para usarlo después.", "Close: invite viewers to save the video for later."] },
  { id: "comentar", n: ["Pide un comentario", "Ask for a comment"], p: ["Cierre: pide comentar una palabra o una opinión concreta.", "Close: ask viewers to comment one word or a specific opinion."] },
  { id: "enlace", n: ["Lleva a un enlace", "Send to a link"], p: ["Cierre: lleva al enlace indicado en las notas.", "Close: send viewers to the link given in the notes."] },
  { id: "bucle", n: ["Vuelve al inicio", "Loops back"], p: ["Cierre en bucle: la última frase empalma con la primera.", "Looping close: the last line leads back into the first."] },
];

export const guion = {
  id: "guion", nombre: "Guion", titulo: ["Proyecto y guion", "Project and script"],
  grupos: [
    { id: "idea", titulo: "La idea", ayuda: "Solo el tema es necesario; el resto mejora el resultado.", controles: [
        { k: "titulo", t: "texto", titulo: "Título o tema", holder: "Qué es un agente de IA", def: "", label: ["Tema", "Topic"], literal: true, escribeMonitor: true },
        { k: "objetivo", t: "texto", titulo: "Qué debe sentir o hacer quien lo ve", holder: "Entender la diferencia y guardar el video", def: "", label: ["Objetivo", "Goal"], traducible: true },
        { k: "audiencia", t: "texto", titulo: "Para quién es", holder: "Dueños de pequeños negocios sin experiencia técnica", def: "", label: ["Audiencia", "Audience"], traducible: true },
        { k: "tipo", t: "opciones", vista: "chips", titulo: "Tipo de video", def: "explicador", label: ["Tipo", "Type"], opciones: tipos },
      ] },
    { id: "historia", titulo: "Cómo se cuenta", controles: [
        { k: "estructura", t: "opciones", vista: "tarjetas", titulo: "Estructura", def: "concepto", label: ["Estructura", "Structure"], opciones: estructuras },
        { k: "gancho", t: "opciones", vista: "chips", titulo: "Gancho en los primeros 3 s", def: "contraintuitivo", label: ["Gancho", "Hook"], opciones: ganchos },
        { k: "tono", t: "opciones", vista: "chips", titulo: "Tono", def: "cercano", label: ["Tono", "Tone"], opciones: tonos },
        { k: "final", t: "opciones", vista: "chips", titulo: "Final", def: "responde", label: ["Final", "Ending"], opciones: finales },
      ] },
    { id: "texto", titulo: "Guion", controles: [
        { k: "modo", t: "opciones", vista: "chips", titulo: "Quién escribe", def: "ia", label: ["Guion", "Script"], opciones: [
          { id: "ia", n: ["Lo escribe la IA", "The AI writes it"], p: ["Escribe el guion completo. Tres propuestas de gancho y elige la mejor. Frases cortas y naturales para decirse en voz alta.", "Write the full script. Draft three hook options and pick the best. Short, natural sentences meant to be spoken aloud."] },
          { id: "exacto", n: ["Uso mi texto exacto", "Use my exact text"], p: ["Usa el guion de abajo palabra por palabra. No cambies ni una palabra.", "Use the script below word for word. Do not change a single word."] },
          { id: "mejorar", n: ["Mejora mi borrador", "Improve my draft"], p: ["Parte del borrador de abajo y mejóralo sin cambiar los hechos ni el sentido.", "Start from the draft below and improve it without changing the facts or the meaning."] },
        ] },
        { k: "texto", t: "area", titulo: "Texto del guion, en español", holder: "Pega aquí tu guion o tus ideas. Nunca se traduce.", def: "", label: ["Guion en español (no traducir)", "Spanish script (do not translate)"], literal: true, filas: 6 },
        { k: "variante", t: "opciones", vista: "lista", titulo: "Variante de español", def: "es-419", label: ["Español", "Spanish variant"], opciones: variantes },
        { k: "fuentes", t: "interruptor", titulo: "Solo datos con fuente", ayuda: "La IA no inventa cifras ni afirmaciones.", def: true, p: ["Toda cifra o afirmación lleva fuente (URL y cita) en FUENTES.md. Si no hay fuente, no entra en el video.", "Every figure or claim has a source (URL and quote) in FUENTES.md. With no source, it stays out of the video."] },
        { k: "notas", t: "area", titulo: "Notas para la IA", holder: "Cualquier indicación extra. Esta sí se traduce.", def: "", label: ["Notas", "Notes"], traducible: true, filas: 3 },
      ] },
  ],
};
