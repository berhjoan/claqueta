// Une film.js, motor.js y pintor.js. Una escena pasa su lienzo y recibe render(t). Aquí no hay nada que editar.
import * as film from './film.js';
import { crearPelicula } from './motor.js';
import { crearPintor } from './pintor.js';

export function montar(canvas, opciones = {}) {
  const peli = crearPelicula(film, opciones);
  const pintar = crearPintor(canvas, peli);
  let ultimo = 0;
  const render = (t) => { ultimo = t; pintar(t); };
  // Sin esto, el primer cuadro podría dibujar la letra con otra fuente: al cargar, se vuelve a pintar el mismo instante.
  if (typeof document !== 'undefined' && document.fonts) {
    const familia = `"${peli.FAM.titulos}"`, muestra = document.getElementById('iso-letra');
    if (muestra) muestra.style.fontFamily = `${familia}, sans-serif`;
    Promise.all([500, 600, 700, 800].map((p) => document.fonts.load(`${p} 64px ${familia}`, 'áéíóúñ¿¡ÁÉÍÓÚÑ'))).then(() => render(ultimo));
  }
  return render;
}
