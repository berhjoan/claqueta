// Una película quieta con todos los objetos de la biblioteca, para mirar qué hay. No es para publicar.
// Cópiala sobre assets/isometrico/film.js, corre tiempos.mjs --dur 3 y mira un cuadro con: npx hyperframes@0.9.9 snapshot --at 1
export const TIEMPOS = { dur: 3, formato: '9:16', palabras: [], pausas: [], grupos: [] };
export const FORMATO = '9:16';
export const DUR = 3;
export const PALETA = { fondo: '#0B0806', tinta: '#F7EBD3', acento: '#E9A93B', secundario: '#B8692E', superficie: '#1A120A' };
export const FUENTES = { titulos: 'Sora' };
export const SUELO = { relieve: 0.4 };
export const SUBTITULOS = false;

const FILAS = [
  ['sobre', 'documento', 'globo', 'telefono'],
  ['pantalla', 'servidor', 'chip', 'caja'],
  ['estante', 'lupa', 'barras', 'moneda'],
  ['engranaje', 'nube', 'candado', 'flecha'],
  ['aprobado', 'persona', 'esfera', 'columna'],
  ['bloque', 'letras', 'plataforma'],
];
const EXTRA = {
  moneda: { pila: 3 }, letras: { texto: 'Año', letra: 1.5 }, barras: { crece: true }, flecha: { largo: 3.4 }, plataforma: { tam: [3.4, 3.4, 0.5] },
  bloque: { tam: [2.4, 2.4, 1.2], color: '#B8692E' }, documento: { hojas: 3 }, servidor: { tam: 0.8 }, estante: { tam: 0.82 }, pantalla: { tam: 0.9 }, telefono: { tam: 0.86 }, caja: { tam: 1.2 }, persona: { levanta: true, tam: 1.1 },
  sobre: { abre: true },
};
export const OBJETOS = [];
FILAS.forEach((fila, j) => fila.forEach((tipo, i) => {
  // Filas que corren de izquierda a derecha en pantalla: x sube e y baja a la vez.
  const a = (i - 1.5) * 3.3, b = (j - 2.5) * 8;
  OBJETOS.push({ id: tipo, tipo, x: b / 2 + a, y: b / 2 - a, ...EXTRA[tipo] });
}));
export const CAMINOS = [];
export const CAMARA = [{ desde: 0, mira: 'todo', llena: 1, deriva: 0 }];
export const TEXTOS = [];
export const SONIDOS = [];
