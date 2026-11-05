# Pruebas a ciegas del 2026-11-05

Dos IA nuevas, de modelos más modestos que el que construyó esto, recibieron solo el encargo que sale del panel y un archivo para anotar lo que les falló. No conocían el sistema.

| | Recorrido vertical | Mezcla cuadrada |
|---|---|---|
| Encargo | En español, 6 estilos con sus colores, voz Edge | En inglés, video en español, 2 estilos, voz Piper |
| Modelo | Sonnet | Haiku |
| Tiempo y tokens | 90 min, 614 mil | 32 min, 259 mil |
| Video final | 20,07 s, 1080×1920 | 23,17 s, 1080×1080 |
| Defectos anotados | 26 | 22 |

Cada carpeta trae su encargo, su configuración (`proyecto.json`), sus defectos y una hoja de cuadros del MP4 real. Nadie oyó esas mezclas.

## Qué dejaron ver

La mezcla cuadrada, con el modelo más modesto, salió entera y legible, pero el estilo principal quedó en la piel más cercana y el secundario no apareció.

El recorrido salió con dirección real, y su costo vino de una cosa: las plantillas no seguían a la voz, y reescribió seis escenas a mano para lograrlo.

## Qué se corrigió con eso

- Una plantilla aterriza con la voz sin tocarla: cada texto llega cuando se dice.
- El texto de collage cabe, porque el ajuste cuenta el relleno de cada recorte.
- Una palabra corta se alinea con su frase, no con la primera vez que la voz la dijo.
- Lo que ya está en pantalla no se repite en subtítulos mientras se dice.
- La transición de cada plano del `pieza.json` es la que la lista pone en el plano anterior; iban corridas una junta.
- El corte busca un pulso en toda la pausa que hay antes de la palabra.
- Un fragmento suelto como «Luz:» se junta con lo que sigue, una línea no acaba en un artículo, y los subtítulos se pueden repartir a mano con `--frases`.
- La cuenta de palabras del guion incluye pausas y cierre.
- Los créditos llevan la licencia de la voz, y no reclaman `creditos.json` si no hay material de fuera.
- En una mezcla, el secundario y el acento ya tienen planos en el `pieza.json` de partida, y el encargo dice cuándo un estilo queda aproximado.

## Qué falta

Medir cuánto bajan tiempo y tokens con estos arreglos: hace falta otra corrida, en otro formato o con otra voz.
