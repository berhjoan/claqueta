// Sonido. Todo funciona sin pagar; lo que pide una llave propia se marca y está apagado por defecto.
export const musicas = [
  { id: "sin", n: ["Sin música", "No music"], d: "Solo voz y efectos.", p: ["Sin música.", "No music."] },
  { id: "codigo", n: ["Compuesta aquí con código", "Composed here with code"], d: "Original y gratis, sin modelos. Trae el tiempo exacto de cada pulso.", p: ["Compón la música con tools/audio/musica.py: es original, no usa modelos ni llaves, y su rejilla es exacta porque las notas se calculan.", "Compose the music with tools/audio/musica.py: it is original, uses no models or keys, and its grid is exact because the notes are calculated."] },
  { id: "modelo", n: ["Modelo local de música", "Local music model"], d: "Stable Audio 3 Small o ACE-Step. Instalación pesada, sin probar en este sistema. Revisa su licencia.", p: ["Genera la música con un modelo local: Stable Audio 3 Small (pesos gratis bajo 1 M USD al año, acepta sus condiciones en Hugging Face) o ACE-Step 1.5 (MIT, lento sin GPU, unos 10 GB). Mide los pulsos con la herramienta de rejilla. Si no se puede instalar, usa tools/audio/musica.py y dilo.", "Generate the music with a local model: Stable Audio 3 Small (weights free under 1 M USD a year, accept its terms on Hugging Face) or ACE-Step 1.5 (MIT, slow without GPU, about 10 GB). Measure the beats with the grid tool. If it cannot be installed, use tools/audio/musica.py and say so."] },
  { id: "sampler", n: ["Tema con instrumentos reales", "Theme with real instruments"], d: "Partitura propia con muestras libres. Baja de 70 a 400 MB por biblioteca.", p: ["Compón un tema original con library/lemo-opuscar/core/audio/sampler.py e instrumentos libres, al tempo exacto de la rejilla. Baja las muestras con: git clone https://github.com/lemomo-ai/lemo-opuscar .lemo, luego dentro de .lemo: git checkout bebbbe1 y sh tools/fetch.sh instruments vsco2ce. Usa solo los instrumentos necesarios.", "Compose an original theme with library/lemo-opuscar/core/audio/sampler.py and free instruments, at the grid's exact tempo. Get the samples with: git clone https://github.com/lemomo-ai/lemo-opuscar .lemo, then inside .lemo: git checkout bebbbe1 and sh tools/fetch.sh instruments vsco2ce. Use only the instruments you need."] },
  { id: "cuerdas", n: ["Cuerdas escasas, nota por nota", "Sparse strings, note by note"], d: "Guitarra, arpa o kalimba ligadas a lo que se dibuja.", p: ["Música escasa de cuerdas con tools/audio/notas.py: escribe partitura.json con pocas notas (nylon_guitar, harp, kalimba) ligadas a lo que aparece en pantalla.", "Sparse string music with tools/audio/notas.py: write partitura.json with few notes (nylon_guitar, harp, kalimba) tied to what appears on screen."] },
  { id: "libre", n: ["Pista de una biblioteca libre", "Free library track"], d: "Con licencia verificada y anotada.", p: ["Usa una pista de una biblioteca libre (dominio público o CC0, o CC BY con crédito). alvana-audio trae archivos de pulsos; revisa el origen de cada tema. Anota URL y licencia en CREDITOS.md.", "Use a track from a free library (public domain or CC0, or CC BY with credit). alvana-audio ships beat files; check the origin of each track. Log URL and license in CREDITOS.md."] },
  { id: "propia", n: ["Mi propia pista", "My own track"], d: "Indica la ruta en las notas.", p: ["Usa la pista indicada en las notas. Entra en su compás más fuerte y termina en una línea de compás.", "Use the track named in the notes. Enter at its strongest bar and end on a bar line."] },
];

export const animos = [
  { id: "minimal", muestra: "assets/music/minimal.mp3", n: ["Pulso mínimo", "Minimal pulse"], p: ["pulso mínimo y tenso", "tense minimal pulse"] },
  { id: "calido", muestra: "assets/music/calido.mp3", n: ["Cálido y acústico", "Warm acoustic"], p: ["cálido y acústico", "warm and acoustic"] },
  { id: "electronico", muestra: "assets/music/electronico.mp3", n: ["Electrónico limpio", "Clean electronic"], p: ["electrónico limpio", "clean electronic"] },
  { id: "cine", muestra: "assets/music/cine.mp3", n: ["Cinematográfico", "Cinematic"], p: ["cinematográfico con crescendo", "cinematic with a crescendo"] },
  { id: "lofi", muestra: "assets/music/lofi.mp3", n: ["Lofi tranquilo", "Calm lofi"], p: ["lofi tranquilo", "calm lofi"] },
  { id: "energia", muestra: "assets/music/energia.mp3", n: ["Alta energía", "High energy"], p: ["alta energía con bombo marcado", "high energy with a strong kick"] },
  { id: "misterio", muestra: "assets/music/misterio.mp3", n: ["Misterio", "Mystery"], p: ["misterioso y contenido", "mysterious and restrained"] },
  { id: "latino", muestra: "assets/music/latino.mp3", n: ["Toque latino", "Latin touch"], p: ["con toque latino sutil", "with a subtle Latin touch"] },
];

export const densidadSfx = [
  { id: "cero", n: ["Sin efectos", "No effects"], p: ["Sin efectos de sonido.", "No sound effects."] },
  { id: "minimo", n: ["Solo en los cambios", "Scene changes only"], p: ["Efectos solo en cambios de escena y en el remate.", "Effects only on scene changes and the payoff."] },
  { id: "accion", n: ["Por cada acción", "Every visible action"], p: ["Cada acción visible importante suena, con un máximo de 1 efecto por segundo y sin tapar una palabra clave: si un golpe cae junto a ella, adelántalo o bájalo. Cada efecto tiene su causa en pantalla.", "Every important visible action sounds, at most 1 effect per second and without covering a key word: if a hit falls next to one, move it earlier or lower it. Each effect has a cause on screen."] },
  { id: "foley", n: ["El material suena siempre", "The material always sounds"], p: ["El material suena de forma continua, como tiza, papel o teclas, sincronizado con cada trazo o elemento. No cuenta como efecto suelto.", "The material sounds continuously, like chalk, paper or keys, synced to each stroke or element. It does not count as a separate effect."] },
];

export const fuentesSfx = [
  { id: "sintetico", n: ["Sintetizados aquí", "Synthesized here"], p: ["Efectos sintetizados con tools/audio/efecto.py (sin derechos de terceros). Pide la lista con --listar y usa al menos 2 tomas de cada sonido repetido.", "Effects synthesized with tools/audio/efecto.py (no third-party rights). Get the list with --listar and use at least 2 takes of each repeated sound."] },
  { id: "cc0", n: ["Grabados CC0", "CC0 recordings"], p: ["Efectos grabados de sfx-kit (CC0, 320 efectos, unos 67 MB): git clone --depth 1 https://github.com/wyzowl/sfx-kit.git, y elige por sounds.json según lo que pasa en pantalla. Anota lo usado en CREDITOS.md.", "Recorded effects from sfx-kit (CC0, 320 effects, about 67 MB): git clone --depth 1 https://github.com/wyzowl/sfx-kit.git, and choose from sounds.json by what happens on screen. Log what you used in CREDITOS.md."] },
];

export const intenciones = [
  { id: "amigo", n: ["Como un amigo", "Like a friend"], p: ["Interpretación cercana, como explicándole a un amigo.", "Warm delivery, like explaining to a friend."] },
  { id: "noticiero", n: ["Noticiero", "Newscast"], p: ["Interpretación de noticiero: clara y con energía.", "Newscast delivery: clear and energetic."] },
  { id: "narrador", n: ["Narrador", "Narrator"], p: ["Interpretación de narrador documental, pausada.", "Documentary narrator delivery, unhurried."] },
  { id: "publicidad", n: ["Publicidad", "Commercial"], p: ["Interpretación publicitaria con sonrisa en la voz.", "Commercial delivery with a smile in the voice."] },
];

export const sonido = {
  id: "sonido", nombre: "Sonido y voz", titulo: ["Sonido y voz", "Sound and voice"],
  grupos: [
    { id: "voz", titulo: "Voz", ayuda: "Escucha cada voz antes de elegir. Todas son gratis.", controles: [
        { k: "narracion", t: "interruptor", titulo: "El video lleva voz", def: true, label: ["Narración", "Narration"], p: null },
        { k: "voz", t: "voces", def: "edge:es-CO-GonzaloNeural", label: ["Voz", "Voice"] },
        { k: "velocidad", t: "rango", titulo: "Velocidad", min: 0.8, max: 1.3, paso: 0.05, def: 1, unidad: "×", label: ["Velocidad", "Speed"] },
        { k: "intencion", t: "opciones", vista: "chips", titulo: "Interpretación", def: "amigo", label: ["Interpretación", "Delivery"], opciones: intenciones },
        { k: "voz_propia", t: "opciones", vista: "chips", titulo: "Otra fuente de voz", def: "no", label: ["Otra voz", "Other voice"], opciones: [
          { id: "no", n: ["Usar la elegida arriba", "Use the one above"], p: null },
          { id: "grabada", n: ["Mi grabación", "My recording"], p: ["Usa la voz grabada indicada en las notas y conserva su ritmo. No la regeneres.", "Use the recording named in the notes and keep its pacing. Do not regenerate it."] },
          { id: "llave", n: ["Mi llave de ElevenLabs", "My ElevenLabs key"], d: "De pago, solo si ya la tienes.", p: ["Usa ElevenLabs solo con la llave ELEVENLABS_API_KEY del entorno y la voz indicada en las notas. Nunca escribas la llave en un archivo. Si falta, usa la voz gratis de arriba.", "Use ElevenLabs only with the ELEVENLABS_API_KEY from the environment and the voice named in the notes. Never write the key to a file. If it is missing, use the free voice above."] },
        ] },
      ] },
    { id: "musica", titulo: "Música", controles: [
        { k: "musica", t: "opciones", vista: "tarjetas", def: "codigo", label: ["Música", "Music"], opciones: musicas },
        { k: "animo", t: "opciones", vista: "chips", titulo: "Carácter", ayuda: "Toca el botón para oír cómo suena cada uno. Se compuso con la herramienta gratis de este sistema.", def: "calido", label: ["Carácter musical", "Music character"], opciones: animos },
        { k: "bpm", t: "rango", titulo: "Tempo", min: 60, max: 170, paso: 1, def: 96, unidad: "BPM", label: ["Tempo", "Tempo"] },
        { k: "nivel", t: "rango", titulo: "Música bajo la voz", min: -30, max: -10, paso: 1, def: -22, unidad: "dB", label: ["Música bajo la voz", "Music under voice"] },
      ] },
    { id: "efectos", titulo: "Efectos y silencios", controles: [
        { k: "sfx", t: "opciones", vista: "chips", titulo: "Cuánto suena", def: "accion", label: ["Efectos", "Effects"], opciones: densidadSfx },
        { k: "fuente_sfx", t: "opciones", vista: "chips", titulo: "De dónde salen", def: "sintetico", label: ["Fuente de efectos", "Effects source"], opciones: fuentesSfx },
        { k: "silencios", t: "interruptor", titulo: "Dos silencios reales", ayuda: "Uno antes del dato más importante.", def: true, p: ["Al menos dos silencios reales, uno de 0,3 a 0,5 s antes del dato más importante.", "At least two real silences, one of 0.3 to 0.5 s before the most important fact."] },
        { k: "golpes", t: "interruptor", titulo: "El sonido llega un cuadro después", ayuda: "Primero se ve, luego se oye.", def: true, p: ["El pico de cada efecto cae un cuadro después de su imagen. `mezcla.py` imprime el `pico_s` de cada uno; el comando audio de HyperFrames confirma los golpes secos, pero no ve los barridos.", "Each effect's peak lands one frame after its picture. `mezcla.py` prints each one's `pico_s`; HyperFrames' audio command confirms sharp hits but does not see sweeps."] },
      ] },
  ],
};
