// «Traducir y copiar» nunca debe dejar el botón esperando. Se simula cada forma de fallar del traductor del navegador y del servicio externo.
import test from "node:test";
import assert from "node:assert/strict";

const nuevo = async () => import(`../app/traducir.js?v=${Math.random()}`);
const respuesta = (texto) => ({ ok: true, json: async () => ({ responseStatus: 200, responseData: { translatedText: texto } }) });
const LIMITE = 8000;

test.afterEach(() => { delete globalThis.Translator; delete globalThis.fetch; });

async function medir(promesa) {
  const ini = Date.now();
  const r = await promesa;
  return { r, ms: Date.now() - ini };
}

test("usa el traductor del navegador si ya está listo", async () => {
  globalThis.Translator = { availability: async () => "available", create: async () => ({ translate: async (t) => `EN:${t}` }) };
  globalThis.fetch = () => { throw new Error("no debería usar la red"); };
  const { traducirTexto } = await nuevo();
  assert.equal(await traducirTexto("hola"), "EN:hola");
});

test("sin traductor en el navegador usa el servicio externo", async () => {
  globalThis.fetch = async () => respuesta("hello");
  const { traducirTexto } = await nuevo();
  assert.equal(await traducirTexto("hola"), "hello");
});

test("si el traductor del navegador se cuelga, sigue con el servicio externo", async () => {
  globalThis.Translator = { availability: () => new Promise(() => {}), create: () => new Promise(() => {}) };
  globalThis.fetch = async () => respuesta("hello");
  const { traducirTexto } = await nuevo();
  const { r, ms } = await medir(traducirTexto("hola"));
  assert.equal(r, "hello");
  assert.ok(ms < LIMITE, `tardó ${ms} ms`);
});

test("si hay que bajar el modelo, no espera la descarga", async () => {
  let creado = 0;
  globalThis.Translator = { availability: async () => "downloadable", create: () => { creado++; return new Promise(() => {}); } };
  globalThis.fetch = async () => respuesta("hello");
  const { traducirTexto } = await nuevo();
  const { r, ms } = await medir(traducirTexto("hola"));
  assert.equal(r, "hello");
  assert.ok(ms < LIMITE, `tardó ${ms} ms`);
  assert.equal(creado, 1, "la descarga queda corriendo para la próxima vez");
});

test("si el traductor falla al traducir, no rompe", async () => {
  globalThis.Translator = { availability: async () => "available", create: async () => ({ translate: async () => { throw new Error("falla"); } }) };
  globalThis.fetch = async () => respuesta("hello");
  const { traducirTexto } = await nuevo();
  assert.equal(await traducirTexto("hola"), "hello");
});

test("si el servicio externo se cuelga, se rinde a tiempo y deja la nota en español", async () => {
  globalThis.fetch = (url, { signal }) => new Promise((_, rechazar) => { signal.addEventListener("abort", () => rechazar(new Error("abortado"))); });
  const { traducirNotas } = await nuevo();
  const estado = { valores: { guion: { objetivo: "Entender", audiencia: "", notas: "" }, arte: { referencia: "" } }, planos: [] };
  const { r, ms } = await medir(traducirNotas(estado));
  assert.deepEqual(r, {});
  assert.ok(ms < LIMITE, `tardó ${ms} ms`);
});

test("un error del servicio externo cuenta como sin traducción", async () => {
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ responseStatus: 429, responseData: { translatedText: "MYMEMORY WARNING" } }) });
  const { traducirTexto } = await nuevo();
  assert.equal(await traducirTexto("hola"), null);
});

test("solo traduce las notas libres, nunca el guion", async () => {
  const pedidos = [];
  globalThis.fetch = async (url) => { pedidos.push(decodeURIComponent(url)); return respuesta("x"); };
  const { traducirNotas } = await nuevo();
  await traducirNotas({ valores: { guion: { objetivo: "Objetivo", audiencia: "", notas: "Nota", titulo: "TITULO SECRETO", texto: "GUION SECRETO" }, arte: { referencia: "" } }, planos: [{ id: "a", nota: "Nota de plano", texto: "TEXTO DE PLANO" }] });
  assert.equal(pedidos.length, 3);
  const todo = pedidos.join(" ");
  for (const secreto of ["TITULO SECRETO", "GUION SECRETO", "TEXTO DE PLANO"]) assert.ok(!todo.includes(secreto), secreto);
});
