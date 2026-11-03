// Traduce solo las notas libres: las instrucciones ya vienen en dos idiomas y el guion nunca se traduce.
// Primero intenta el traductor local del navegador (Chrome 138+); si no está listo, usa MyMemory, gratis y sin llave.
// Nada de esto puede dejar el botón esperando: cada intento tiene un límite y lo que no alcance queda en español, y el prompt lo avisa.
const memoria = new Map();
let traductorLocal = null;
const LIMITE_MS = 5000;

const conLimite = (promesa, ms = LIMITE_MS) => Promise.race([promesa, new Promise((res) => setTimeout(() => res(null), ms))]);

function prepararLocal() {
  const opciones = { sourceLanguage: "es", targetLanguage: "en" };
  return Translator.availability(opciones).then((dispo) => {
    if (dispo === "unavailable") return null;
    // Crear el traductor puede bajar un modelo. Se deja corriendo y se usa la próxima vez, sin hacer esperar a nadie.
    const creando = Translator.create(opciones).then((t) => { traductorLocal = t; return t; }).catch(() => null);
    return dispo === "available" ? creando : null;
  }).catch(() => null);
}

async function conNavegador(texto) {
  if (!("Translator" in globalThis)) return null;
  try {
    if (!traductorLocal) await conLimite(prepararLocal(), 1500);
    if (!traductorLocal) return null;
    return await conLimite(traductorLocal.translate(texto));
  } catch { return null; }
}

async function conMyMemory(texto) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), LIMITE_MS);
  try {
    const url = `https://api.mymemory.translated.net/get?langpair=es|en&q=${encodeURIComponent(texto.slice(0, 480))}`;
    const r = await fetch(url, { signal: control.signal });
    if (!r.ok) return null;
    const d = await r.json();
    return d?.responseStatus === 200 ? d.responseData?.translatedText ?? null : null;
  } catch { return null; } finally { clearTimeout(reloj); }
}

export async function traducirTexto(texto) {
  const t = texto.trim();
  if (!t) return "";
  if (memoria.has(t)) return memoria.get(t);
  const r = (await conNavegador(t)) ?? (await conMyMemory(t));
  if (r) memoria.set(t, r);
  return r;
}

// Devuelve las traducciones de los campos libres del proyecto. Lo que no se pueda traducir queda fuera y el prompt avisa que está en español.
export async function traducirNotas(estado) {
  const v = estado.valores, salida = {};
  const campos = { "guion.objetivo": v.guion.objetivo, "guion.audiencia": v.guion.audiencia, "guion.notas": v.guion.notas, "arte.referencia": v.arte.referencia };
  for (const p of estado.planos) if ((p.nota ?? "").trim()) campos[`plano.${p.id}`] = p.nota;
  await Promise.all(Object.entries(campos).map(async ([k, t]) => {
    if (!(t ?? "").trim()) return;
    const r = await traducirTexto(t);
    if (r) salida[k] = r;
  }));
  return salida;
}
