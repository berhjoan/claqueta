// Tu película, como datos. Para una pieza normal, es el único archivo que editas.
// W('palabra') es el segundo en que la voz dice esa palabra; F('palabra'), en que termina. Si cambia la voz, la imagen la sigue.
import { W, F, TIEMPOS } from './tiempos.js';
export { TIEMPOS };

// ── 1. Formato y duración. Salen de assets/tiempos.json: 9:16, 16:9, 1:1 o 4:5. No hay que recomponer nada al cambiar.
export const FORMATO = TIEMPOS.formato;
export const DUR = TIEMPOS.dur;

// ── 2. Colores en hexadecimal, y la letra (de tools/medios/fuentes.py).
export const PALETA = { fondo: '#0B0806', tinta: '#F7EBD3', acento: '#E9A93B', secundario: '#B8692E', superficie: '#1A120A' };
export const FUENTES = { titulos: 'Sora' };
export const SUELO = { celda: 1, relieve: 1 }; // relieve: 0 deja el suelo plano; 1, bloques que crecen lejos de los objetos.

// ── 3. Los objetos. x e y en unidades; `sobre` lo apoya encima de otro. `entra` es el segundo en que aterriza.
// `como`: cae, arma (pieza por pieza), sube, crece o ya. `tam`: escala, o [ancho, fondo, alto] en plataforma y bloque. Tipos en objetos.js.
export const OBJETOS = [
  // Mesa del cliente
  { id: 'mesa1', tipo: 'plataforma', x: 0, y: 0, tam: [4.8, 4.8, 0.45] },
  { id: 'telefono', tipo: 'telefono', sobre: 'mesa1', x: 0.55, y: 0.35, tam: 1.08, enciende: [W('mensaje'), W('mensaje') + 0.3], avisa: [[W('mensaje'), W('mensaje') + 0.8], [F('IA', 2) + 1.8, F('IA', 2) + 2.6]] },
  { id: 'cliente', tipo: 'persona', sobre: 'mesa1', x: -1.25, y: -1.2, tam: 1.28, entra: W('cliente'), color: PALETA.secundario, levanta: [F('IA', 2) + 1.6, F('IA', 2) + 2] },
  { id: 'mensaje', tipo: 'sobre', sobre: 'telefono', tam: 0.66, entra: W('mensaje'), dura: 0.44, altura: 5, peso: 2, encuadre: false,
    mueve: [{ t: [W('La') - 0.42, W('lo')], a: 'servidor', x: -0.42, y: -0.42, arco: 2.6, tam: 0.56 }], abre: [W('lo') - 0.02, W('lee') + 0.1], escanea: [W('lee') + 0.08, W('busca') + 0.02], sale: W('busca') + 0.1 },

  // La IA: un servidor que se arma. Encima, muy chica, una bodega: la cámara entra en ella.
  { id: 'mesa2', tipo: 'plataforma', x: 6, y: 0, tam: [4.4, 4.4, 0.45], entra: W('La') - 0.9, como: 'sube' },
  { id: 'servidor', tipo: 'servidor', sobre: 'mesa2', tam: 1, entra: W('IA'), como: 'arma', paso: 0.11, enciende: [W('IA'), W('IA') + 0.2], losas: 0.36 },
  { id: 'estante1', tipo: 'estante', sobre: 'servidor', x: 0.42, y: 0.32, tam: 0.17, destacada: [1, 1], saca: [W('pedido') - 0.06, F('pedido') - 0.03] },
  { id: 'estante2', tipo: 'estante', sobre: 'servidor', x: 0.42, y: -0.42, tam: 0.17, semilla: 21 },
  { id: 'lupa', tipo: 'lupa', sobre: 'servidor', x: 0.5, y: 0.5, z: 0.2, tam: 0.12, entra: W('busca') + 0.02, como: 'crece', encuadre: false, sale: W('prepara') + 0.1 },
  { id: 'pedido', tipo: 'caja', sobre: 'servidor', x: 0.42, y: 0.52, z: 0.234, tam: 0.075, color: PALETA.acento, encuadre: false, entra: F('pedido') - 0.03, como: 'ya',
    mueve: [{ t: [F('pedido') - 0.03, W('prepara') + 0.42], a: 'mesa3', x: 1.1, y: -1.1, tam: 0.82, arco: 1.6, curva: 'sube' }] },

  // Prepara la respuesta
  { id: 'mesa3', tipo: 'plataforma', x: 6, y: 6, tam: [4.4, 4.4, 0.45], entra: W('busca'), como: 'sube' },
  { id: 'engranaje', tipo: 'engranaje', sobre: 'mesa3', x: -1, y: -1, tam: 1.02, entra: W('pedido'), como: 'crece', gira: [W('prepara') - 0.2, DUR] },
  { id: 'papeles', tipo: 'documento', sobre: 'mesa3', x: 0.2, y: 0.7, tam: 1, hojas: 2, lineas: 0, entra: W('la', 2) - 0.1, como: 'arma', paso: 0.1, sonido: false },
  { id: 'respuesta', tipo: 'documento', sobre: 'papeles', tam: 1, hojas: 2, semilla: 8, entra: W('la', 2) + 0.14, como: 'arma', paso: 0.1, escribe: [W('la', 2) + 0.14, F('respuesta')],
    mueve: [{ t: [F('respuesta') + 0.28, W('Tú') - 0.08], a: 'mesa4', x: 0.6, y: 0.5, arco: 1.6 }] },

  // Tú revisas y apruebas
  { id: 'mesa4', tipo: 'plataforma', x: 12, y: 6, tam: [4.4, 4.4, 0.45], entra: F('respuesta') - 0.1, como: 'sube' },
  { id: 'tu', tipo: 'persona', sobre: 'mesa4', x: -1.1, y: -1.05, tam: 1.3, entra: W('Tú'), color: PALETA.acento, levanta: [W('apruebas') - 0.1, W('apruebas') + 0.16] },
  { id: 'sello', tipo: 'aprobado', sobre: 'respuesta', tam: 0.68, entra: W('apruebas'), dura: 0.3, altura: 5.2, peso: 3, traza: [W('apruebas') + 0.05, W('apruebas') + 0.32] },

  // La respuesta vuela de regreso: el final contesta al principio
  { id: 'regreso', tipo: 'sobre', sobre: 'mesa4', x: 0.6, y: 0.5, z: 1.15, tam: 0.62, color: PALETA.acento, sello: PALETA.tinta, entra: F('IA', 2) + 0.1, como: 'crece', encuadre: false,
    mueve: [{ t: [F('IA', 2) + 0.4, F('IA', 2) + 1.8], a: 'telefono', arco: 4.6, curva: 'camara' }] },
];

// ── 4. Caminos que crecen por el suelo. `aereo: true` es una ruta punteada por el aire.
export const CAMINOS = [
  { id: 'c1', de: 'mesa1', a: 'mesa2', crece: [W('La') - 0.8, W('La') - 0.1] },
  { id: 'c2', de: 'mesa2', a: 'mesa3', crece: [W('busca'), W('prepara')] },
  { id: 'c3', de: 'mesa3', a: 'mesa4', crece: [F('respuesta') - 0.05, W('Tú') - 0.1] },
  { id: 'vuelta', de: 'regreso', a: 'telefono', aereo: true, altura: 4.6, crece: [F('IA', 2) + 0.4, F('IA', 2) + 1.8] },
];

// ── 5. La cámara. Cada plano: desde qué segundo, a quién mira, cuánto de la zona llena y en cuánto llega. Se ajusta sola al formato. Nunca rota.
export const CAMARA = [
  { desde: 0, mira: 'telefono', llena: 1 },
  { desde: W('cliente') - 0.32, mira: ['mesa1', 'cliente'], llena: 1, llega: 0.55 },
  { desde: W('La') - 0.5, mira: ['mesa2', 'servidor'], llena: 0.98, llega: 0.72 },
  { desde: W('lo') - 0.1, mira: 'mensaje', llena: 0.86, llega: 0.42 },
  { desde: W('busca') - 0.08, mira: 'estante1', llena: 1, llega: 0.56 },
  { desde: F('pedido') - 0.12, mira: ['mesa3', 'engranaje'], llena: 1, llega: 0.82 },
  { desde: F('respuesta') + 0.1, mira: ['mesa4', 'tu'], llena: 1, llega: 0.62 },
  { desde: W('apruebas') + 0.42, mira: 'sello', llena: 1, llega: 0.62 },
  { desde: W('Así') - 0.1, mira: 'todo', llena: 1, llega: 1.05 },
];

// ── 6. Textos. Títulos arriba o al lado, según el formato; rótulos clavados a un objeto. Los subtítulos salen solos de la voz.
export const TEXTOS = [
  { como: 'titulo', t: [0, W('La') - 0.45], partes: [{ texto: 'Mensaje', t: W('mensaje') }] },
  { como: 'titulo', t: [W('La') - 0.45, F('respuesta') + 0.1], partes: [{ texto: 'Lee', t: W('lee') }, { texto: 'Busca', t: W('busca') }, { texto: 'Prepara', t: W('prepara') }] },
  { como: 'titulo', t: [F('respuesta') + 0.1, W('Así') - 0.1], partes: [{ texto: 'Tú', t: W('Tú') }, { texto: 'apruebas', t: W('apruebas') }] },
  { como: 'titulo', t: [W('Así') - 0.1, DUR + 1], texto: 'Así de simple', color: 'acento' },
  { como: 'rotulo', texto: 'Mensaje', sobre: 'telefono', t: [W('proceso'), DUR + 1] },
  { como: 'rotulo', texto: 'IA', sobre: 'servidor', t: [W('proceso') + 0.18, DUR + 1], color: 'acento' },
  { como: 'rotulo', texto: 'Respuesta', sobre: 'engranaje', t: [W('proceso') + 0.36, DUR + 1] },
  { como: 'rotulo', texto: 'Tú', sobre: 'tu', t: [W('proceso') + 0.54, DUR + 1] },
];

// ── 7. Sonidos extra, además de los que salen solos de la película con eventos.mjs.
export const SONIDOS = [{ pico: F('IA', 2) + 1.84, sonido: 'campana', ganancia: -12 }];
