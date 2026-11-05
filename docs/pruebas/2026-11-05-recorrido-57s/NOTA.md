# Nota de entrega

## Qué se hizo
Video vertical de 57,1 s que explica Claqueta cambiando de estilo en cada idea. Son 15 planos con 15 estilos hechos a mano con código, con sus colores propios: pizarra, cómic, neón, Bauhaus, VHS, pixel, glitch, terminal ASCII, cristal esmerilado, editorial, neobrutalismo, plano técnico, película analógica, synthwave y HUD. Hay además una ráfaga con las miniaturas reales del catálogo: mosaico de 103, volteo de 23 y mezcla 70/20/10. Cierra con la marca en negro y oro.

El encargo base salió de `tools/prompt.mjs` (`../encargo.md`). Por pedido de la persona se cambiaron dos cosas: muchos estilos en vez de tres (70/20/10) y colores propios de cada estilo en vez de la paleta exacta.

## Qué se midió
- `check`: 0 errores. Los avisos que quedan son esperados: nombres del volteo visibles menos de 1 s (es una ráfaga) y lema de cierre 1,4 s.
- Archivo: 57,1 s (5 % bajo los 60), 1080×1920, 30 fps, H.264 yuv420p, AAC, 20,5 MB.
- Audio del archivo final: −14,63 LUFS y −7,03 dBTP.
- 1713 cuadros, 0 negros. Los saltos detectados coinciden con cortes y efectos planeados.
- Revisé unos 50 cuadros reales: zonas seguras, tildes, barridos sin huecos y cortes por coincidencia.
- 40 efectos de sonido, ninguno a menos de 1 s de otro. Silencios reales en 33,10–33,62 y 53,30–53,82.

## Qué no se pudo comprobar
- **No oí la voz.** Es Kokoro `em_alex`, generada aquí con `lang="es-419"`. Una persona debe escucharla antes de publicar.
- Whisper no se pudo bajar: los tiempos de palabra salen de cortes reales entre tramos, repartidos por sílabas y afinados con la energía del audio.

## Hallazgos sobre Claqueta
1. `tools/tts/hablar.py` llama a Kokoro con `lang="es"`, que pronuncia con «z» castellana: «boθes», «θerebro». Con `lang="es-419"` sale «boses», «serebro». El primer video («Tu cerebro vive en el pasado») tiene ese problema.
2. La lista de planos del encargo rotula los pasos como «Paso 1 1», «Paso 1 2»…
3. No hay modo «recorrido de estilos»: el panel limita a 3 estilos y la paleta exacta se impone aunque se quieran los colores de cada estilo.
4. En montajes rápidos chocan «cada acción visible suena» y «máximo 1 efecto por segundo»: hubo que quitar 3 efectos.
5. HyperFrames cancela el render si se lanza en segundo plano y el proceso padre termina (`render_cancelled_parent_exited`). En primer plano y con `--workers 2` tardó 4,5 min.

## Cómo cambiar lo más probable
- Voz: editar `tramos_voz.json` y correr `python scripts/voz.py tramos_voz.json --salida assets/voz/voz.wav --palabras assets/voz/palabras.json --velocidad 0.92`. Después correr `python scripts/capas.py` y rehacer la mezcla.
- Mezcla: `python ../../.claqueta/tools/audio/mezcla.py --voz assets/voz/voz.wav --musica assets/audio/musica.wav --nivel-musica -22 --efectos efectos.json --dur 57.1 --silencios 33.10-33.62,53.30-53.82 --salida assets/audio/mezcla.wav`
- Render: `HYPERFRAMES_BROWSER_PATH=/ruta/a/chrome npx hyperframes@0.9.9 render --output renders/final.mp4 --fps 30 --crf 17`
