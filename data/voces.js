// Voces gratis con muestra real en assets/voices. `licencia` se muestra en el panel; el prompt incluye el comando exacto.
const edge = (voz, nombre, pais, genero) => ({ id: `edge:${voz}`, motor: "edge", voz, nombre, pais, genero, muestra: `assets/voices/edge-${voz}.mp3` });
const kokoro = (voz, nombre, genero) => ({ id: `kokoro:${voz}`, motor: "kokoro", voz, nombre, pais: "Neutro", genero, licencia: "Apache-2.0", muestra: `assets/voices/kokoro-${voz}.mp3` });
const piper = (voz, nombre, pais, genero, licencia) => ({ id: `piper:${voz}`, motor: "piper", voz, nombre, pais, genero, licencia, muestra: `assets/voices/piper-${voz}.mp3` });
const pocket = (voz, nombre, genero) => ({ id: `pocket:${voz}`, motor: "pocket", voz, nombre, pais: "España", genero, licencia: "Modelo CC BY 4.0, con crédito a Kyutai", muestra: `assets/voices/pocket-${voz}.mp3` });

export const motoresVoz = {
  edge: { nombre: "Edge", d: "Voces neuronales de Microsoft. Las más naturales; piden internet, no piden cuenta. Servicio no oficial: revisa sus condiciones si el video es para un cliente.", instalar: "pip install edge-tts", palabras: true },
  kokoro: { nombre: "Kokoro", d: "Modelo Apache-2.0 que corre en tu CPU, sin internet tras bajar 115 MB una vez.", instalar: "pip install kokoro-onnx soundfile" },
  piper: { nombre: "Piper", d: "Muy rápido en CPU, sin internet tras bajar cada voz. La licencia varía por voz.", instalar: "pip install piper-tts" },
  pocket: { nombre: "Pocket TTS", d: "Modelo de Kyutai que corre en tu CPU, unas 1,8 veces más rápido que el tiempo real en esta prueba. Instalarlo baja cerca de 900 MB, con PyTorch.", instalar: "pip install pocket-tts" },
};

export const voces = [
  edge("es-CO-SalomeNeural", "Salomé", "Colombia", "Femenina"),
  edge("es-CO-GonzaloNeural", "Gonzalo", "Colombia", "Masculina"),
  edge("es-MX-DaliaNeural", "Dalia", "México", "Femenina"),
  edge("es-MX-JorgeNeural", "Jorge", "México", "Masculina"),
  edge("es-US-PalomaNeural", "Paloma", "Latino EE. UU.", "Femenina"),
  edge("es-US-AlonsoNeural", "Alonso", "Latino EE. UU.", "Masculina"),
  edge("es-AR-ElenaNeural", "Elena", "Argentina", "Femenina"),
  edge("es-AR-TomasNeural", "Tomás", "Argentina", "Masculina"),
  edge("es-PA-MargaritaNeural", "Margarita", "Panamá", "Femenina"),
  edge("es-PA-RobertoNeural", "Roberto", "Panamá", "Masculina"),
  edge("es-ES-ElviraNeural", "Elvira", "España", "Femenina"),
  edge("es-ES-AlvaroNeural", "Álvaro", "España", "Masculina"),
  kokoro("ef_dora", "Dora", "Femenina"),
  kokoro("em_alex", "Alex", "Masculina"),
  kokoro("em_santa", "Santa", "Masculina"),
  piper("es_MX-claude-high", "Claude MX", "México", "Masculina", "Apache-2.0"),
  piper("es_MX-ald-medium", "Ald", "México", "Masculina", "Unlicense"),
  piper("es_AR-daniela-high", "Daniela", "Argentina", "Femenina", "CC BY-SA 4.0, con crédito"),
  piper("es_ES-davefx-medium", "Davefx", "España", "Masculina", "CC0"),
  piper("es_ES-sharvard-medium", "Sharvard", "España", "Masculina", "CC BY 3.0, con crédito"),
  pocket("lola", "Lola", "Femenina"),
];

export const vozPorId = (id) => voces.find((v) => v.id === id);
