# Dirección: cómo se hace un video que no parece generado

Esta guía vale para cualquier motor. Salió de producir piezas reales y de revisar cuadro a cuadro las que no funcionaron.

## Orden de juicio

Una pieza se juzga por sonido, ritmo, cámara y dirección, en ese orden. Un cuadro bonito es solo el punto de partida.

## Antes de escribir código

1. **Una idea.** Una idea, un giro y un final que responde al inicio. Si no cabe en una frase, son dos videos.
2. **Gancho antes de 3 s.** Nada de logo lento. Puntúa varios ganchos por claridad, especificidad, relevancia, novedad, credibilidad, curiosidad y recompensa, y escoge uno.
3. **Fuentes.** Toda cifra lleva URL y cita en un archivo aparte. Sin fuente no entra.
4. **`TREATMENT.md`.** Tres estructuras posibles y la elegida con su razón. Una referencia, con qué aprender y qué no copiar. Un movimiento que solo este medio puede hacer. Planos con cámara y razón. Tabla de sonido por sección.
5. **`SPEC.md`.** El encargo convertido en cifras: colores, tamaños, tiempos, márgenes y qué está prohibido.
6. **Cuadro de estilo real.** A tamaño final, con tu mejor plano y antes de animar lo demás. Compáralo con el encargo y corrige ahí: es el momento más barato.

## Cada plano se describe así

Estilo, sujeto, movimiento, cámara, tiempos, estado final y restricciones. Ejemplo: «Pizarra oscura. La palabra Actúa, a 176 px de alto. Se escribe trazo a trazo en 0,95 s. Cámara: acercamiento lento del 100 % al 106 %. Queda quieta 1,5 s antes del corte. No puede pasar de x = 960».

## Composición

- Un estilo es material, cámara y sonido. La paleta sola no lo define: 19 estilos recoloreados a negro y oro se veían como uno solo.
- El mundo llena el cuadro completo. Solo la información respeta las zonas seguras.
- Un objeto real llena la franja que tapa la app: una bandeja con tizas lleva el mundo hasta el borde sin poner nada clave ahí.
- Fallos frecuentes: sujeto pequeño o pegado al borde, demasiado oscuro, color sobre el mismo color, subtítulos sobre el sujeto, cuadros vacíos en las transiciones, tarjetas sobre negro con el contenido arriba y una franja vacía debajo.

## Cámara

- Varios movimientos con razón y un plano que se recuerde. El 2D también tiene cámara: acercar, alejar, paralaje, cuadro dentro de cuadro.
- Un movimiento por idea. Llegada larga, salida 40–50 % más corta.
- Cámara en `inOut`; títulos quietos cuando aterrizan.
- Paralaje orientativo: fondo 0,1–0,3×, medio 0,5–0,7×, frente 1–1,5× con desenfoque.
- Cortar en el cuadro más rápido del movimiento esconde el corte.

## Montaje

- Transiciones nacidas del medio y con una gramática fija de 3 a 5 tipos. El fundido no es el valor por defecto.
- Varía el ritmo y da un respiro. Un montaje con todos los planos iguales se siente generado.
- Sonido como transición, adelantando o alargando el de otra escena.
- Corte sobre pulso: primer pulso igual o posterior al fin de la voz + 0,2 s; prefiere un inicio de compás si está a 0,75 s o menos.

## Lectura

- Tiempo de lectura: letras ÷ 15 + 1,5 s desde que el texto termina de aparecer.
- Subtítulo: mínimo 1,8 s y al menos la línea hablada + 0,6 s.
- Define las frases de los subtítulos a mano. El agrupador automático deja fragmentos como «a empezar,» o «de 2024,».

## Sonido

- Cada acción importante suena. Un efecto por segundo como máximo, y nunca encima de una palabra clave.
- Dos silencios reales como mínimo. El más importante, justo antes del dato.
- El pico de cada efecto cae un cuadro después de su imagen: primero se ve y luego se oye.
- La música es el reloj cuando hay música. Afina la rejilla sobre lo medido, no sobre lo pedido.

## Lo que delata a un video generado

Todo entra igual. Todo flota sin causa. Tarjetas en fila. Logo flotante. Bordes con esquineras. Resplandor sin razón. Partículas decorativas. Texto que se mueve mientras se lee. El mismo sonido en cada corte. Títulos que siguen derivando después de aterrizar.

## Antes de decir que está listo

1. `check` o su equivalente, y confirma en un cuadro los avisos de solape antes de cambiar nada.
2. Mira cuadros reales: texto dentro de las zonas seguras, tildes correctas, nada cortado, sujeto grande, primer cuadro con imagen.
3. Tiras cada 0,2 s en las acciones clave.
4. Mide el archivo final: formato, duración, −14 LUFS, pico verdadero bajo −1 dBTP.
5. Transcribe la mezcla final y compárala con el guion.
6. Una ronda de correcciones. Di qué mediste y qué no pudiste comprobar. Si no oyes, dilo y pide que alguien escuche.
