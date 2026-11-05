# SPEC

## LOOK
- 1080×1920, 30 fps, 9,8 s (294 cuadros). `$DUR` = voz 8,405 s + cierre 1,395 s.
- Fondo #0B0806, superficie #1A120A, tinta #F7EBD3, oro #E9A93B, oro claro #F5C66B, cobre #B8692E, borde #6B4A1E.
- Neón (S04) en la paleta de la marca: tubos crema y oro con halo ámbar; núcleo nítido de 3–4 px bajo un halo de 18–36 px. Un solo elemento oro sólido por momento.
- Tipografía cinética (S07): «presente», «80 ms», «ya pasó». Una palabra clave por golpe.
- Partículas (S01): 1200 puntos con semilla 11, 2–6 px, solo en el plano 3.
- Sora 600/700 para títulos, JetBrains Mono 500 para la cifra. Títulos ≥ 115 px (6 % de 1920). Nada legible bajo 44 px.
- Luz suave desde arriba a la izquierda; sombras del texto al 20 %. Grano 2,5 % sobre el fondo, debajo del texto.
- 4 capas: fondo (marcos lejanos, 0,2×, desenfoque 3 px), medio (marcos, 0,6×), sujeto (1×), frente (marcos cercanos, 1,3×, desenfoque 4 px).

## MOTION
- Cámara: alejamiento 1,6→1,0 de 0,00 a 1,30 s, cubic-bezier(.65,0,.35,1). Quieta después.
- Títulos: máscara vertical 300 ms power3.out que muestra el contorno de neón; relleno en 0,5 s.
- Texto secundario («cerebro», lema): por palabra, desenfoque 6→0 px y opacidad 0→1 en 0,13 s, separadas 0,067 s.
- «80 ms»: entra en 8 cuadros (0,27 s), cuenta 0→80 durante la entrada y aterriza en «ochenta» (4,12 s).
- Unión 1→2: el núcleo crece más allá del cuadro en 0,65 s (power2.inOut), radio a 0; lo demás se desenfoca 15 px y se apaga en 0,3 s.
- Unión 2→3: salida a la izquierda, 800 px con power3.in (6,60–6,875), y entrada desde la derecha, 800 px con power3.out (6,875–7,15): misma dirección y velocidad.
- Partículas: llegan con la entrada del plano 3, sostienen hasta 7,775 y se dispersan hacia la izquierda en 1 s.
- Emblema: 92→100 % en 0,6 s desde 8,75 s con brillo que lo recorre.

## SHOTS (voz como reloj)
| Palabra | Seg | Qué aterriza |
|---|---|---|
| presente | 1,285 | contorno de «presente» encendido |
| cerebro | 2,487 | nodo «cerebro» |
| tarda al menos | 2,93–3,80 | conector se dibuja de izquierda a derecha |
| 80 | 4,12 | «80» |
| milisegundos | 4,631 | «ms» |
| ves | 6,353 | nodo «cerebro» se llena de oro |
| ya | 7,775 | «ya pasó» y empieza la dispersión |

## BANNED
Cian, magenta, violeta y rosado (la paleta de la marca manda). Parpadeo de neón. Pulsos o respiraciones en títulos. Texto que se mueve mientras se lee. Partículas sobre letras que se están leyendo. Rótulos en esquinas fuera del emblema. Datos sin fuente.

## QA
Texto entre x 72 y 1008 y entre y 220 y 1280; subtítulos en y 1300–1540; riel derecho (x 960–1080, y 900–1700) libre. Primer cuadro con imagen. −14 LUFS ±1,5 y pico verdadero ≤ −1 dBTP en el archivo final. Desfase voz–imagen ≤ 2 cuadros.
