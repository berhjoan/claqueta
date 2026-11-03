# Radar de Claqueta

Herramientas para hacer video con código, gratis y en local, en una PC sin GPU dedicada (i5-11400T, 16 GB, Intel UHD 730, Windows 11, Node 24, Python 3.11, ffmpeg 8) y con narración en español de Latinoamérica.

Revisado el 2026-11-03 con `gh api`, `gh search repos` y fuentes web. No se clonó ni se instaló nada. Los datos están en [`data/radar.json`](../data/radar.json): 50 entradas, 9 para adoptar, 20 para probar, 18 para vigilar y 3 para descartar.

Cómo leer los campos:

- **Licencia:** lo que devuelve la API de GitHub, sin deducir. `NOASSERTION` significa que GitHub no la clasifica y `null` que no detecta ninguna; cuando leí el archivo de licencia del repo, lo dice la columna "Por qué".
- **`free`:** se puede usar sin pagar y con fines comerciales en el caso de este proyecto (una persona o un equipo de hasta 3). Si depende de una clave de pago o de pesos no comerciales, es `false`.
- **`needsGpu`:** es `true` solo si no hay ruta documentada en CPU. Que sea `false` no promete velocidad.

## Qué adoptar primero y por qué

1. **Imagen: HyperFrames, three.js, GSAP y gl-transitions.** HyperFrames 0.9.9 ya pasó `check` y render en esta PC con un motor Canvas dentro de una escena (dato del coordinador; no lo repetí aquí). gl-transitions le da al panel un catálogo de transiciones con código listo.
2. **Tiempos: faster-whisper.** MIT, sin clave y con marcas por palabra en CPU. Si los subtítulos salen desfasados, se prueba alinear el guion con Echogarden o WhisperX.
3. **Efectos y muestras: sfx-kit y Meta Open Sound.** Son CC0 y no tienen riesgo de licencia. Con `sounds.json`, un agente que no oye puede elegir y mezclar efectos por datos.
4. **Voz: Piper como respaldo y una prueba a ciegas para la principal.** Misma frase en Pocket TTS (`spanish` y `spanish_24l`), Chatterbox `es-mx-latam`, Kokoro y Piper `es_MX-claude-high`, midiendo tiempo y RAM. Claude no oye: el usuario escucha las muestras y decide.
5. **Música: bibliotecas antes que generación.** Primero alvana-audio, porque sus archivos de pulsos dan el mapa de cortes. Después Stable Audio 3 Small y Tone.js, según lo que suene mejor en la prueba.
6. **Control de calidad: leer explainroo y showtime antes de escribir el propio.** Según sus README, ya revisan texto dibujado en Canvas y palabras mal pronunciadas.

## Voz en español: qué evidencia hay

Ninguna de estas voces tiene una prueba de oído independiente en español que yo haya encontrado. Lo siguiente es lo verificable.

| Voz | Español | Evidencia | Requisitos | Licencia del modelo |
|---|---|---|---|---|
| [Pocket TTS](https://github.com/kyutai-labs/pocket-tts) | `spanish`, `spanish_24l`; `lola` es la única voz nativa | [tehablo](https://github.com/LCubero/tehablo) midió en Windows con un Ryzen 5 5600X: 3,7 veces tiempo real con `spanish` y 1,2 con `spanish_24l` | Pico de 1 GB o 2,3 GB de RAM; unos 2 GB en disco | [CC BY 4.0, con condiciones de acceso](https://huggingface.co/kyutai/pocket-tts) |
| [Chatterbox](https://github.com/resemble-ai/chatterbox) | [Afinado oficial `es-419` y `es-MX`](https://huggingface.co/ResembleAI/Chatterbox-Multilingual-es-mx-latam) | Sin cifras de este modelo en CPU. Un [benchmark de Picovoice](https://picovoice.ai/blog/on-device-tts/), que vende un producto rival, midió 7,5 GB y 13,4 horas de núcleo por hora de audio en Turbo, un modelo más pequeño | Python 3.11 probado; marca de agua PerTh en todo audio | MIT según su ficha |
| [Piper](https://github.com/OHF-Voice/piper1-gpl) | `es_MX-ald-medium`, `es_MX-claude-high`, `es_AR-daniela-high` | El mismo benchmark la da como de las más eficientes: 0,35 horas de núcleo por hora de audio | Modelo de 61 MB; la memoria varía según la fuente (2,6 GB en ese benchmark, 185 MB en el de [piper-plus](https://github.com/ayutaz/piper-plus)) | Por voz: [`claude` declara Apache-2.0](https://huggingface.co/rhasspy/piper-voices/raw/main/es/es_MX/claude/high/MODEL_CARD), [`ald` parte de un corpus Unlicense](https://huggingface.co/rhasspy/piper-voices/raw/main/es/es_MX/ald/medium/MODEL_CARD) |
| [Kokoro](https://github.com/hexgrad/kokoro) | `ef_dora`, `em_alex`, `em_santa`, [sin calificación y con aviso de soporte flojo fuera del inglés](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md) | [Un usuario las oye latinoamericanas](https://github.com/hexgrad/kokoro/issues/246). [Bug abierto de audio vacío en Windows 11](https://github.com/hexgrad/kokoro/issues/301). Usa espeak en `es`, [el código de España; `es-419` es el latinoamericano](https://github.com/espeak-ng/espeak-ng/blob/master/docs/languages.md): vale probar el cambio | Necesita espeak-ng; 1,28 horas de núcleo y 2 GB en ese benchmark | Apache-2.0 |
| [edge-tts](https://github.com/rany2/edge-tts) | [Voces `es-CO` y `es-MX`](https://github.com/yaph/tts-samples) | Son voces neuronales de Microsoft, pero en línea | Internet; rompe la regla local | Servicio de terceros |
| [VoxCPM2](https://github.com/OpenBMB/VoxCPM) | Español entre 30 idiomas y voz diseñada por descripción | RTF 1,76 en M4 Pro con Metal usando GGUF | Unos 8 GB de VRAM en PyTorch | Apache-2.0 |

## Hosting

| Servicio | Plan gratis | Costo de publicar | Límites | Fuente |
|---|---|---|---|---|
| **GitHub Pages** | Repo público en GitHub Free | No usa créditos | Sitio de hasta 1 GB, repo recomendado de hasta 1 GB, 100 GB al mes de ancho de banda y 10 builds por hora (ambos límites blandos; el de builds no aplica con un workflow propio de Actions), deploy de hasta 10 min. No es para operar un negocio en línea. No permite encabezados COOP/COEP: el [pedido sigue abierto desde 2022](https://github.com/orgs/community/discussions/13309) | [Límites](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits), [disponibilidad](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site) |
| **Cloudflare Pages** | 500 builds al mes, uno a la vez | Sin créditos por deploy | Build de hasta 20 min, 20.000 archivos, 25 MiB por archivo, 100 proyectos, 100 dominios por proyecto. Peticiones a estáticos gratis e ilimitadas. Encabezados propios con `_headers`, hasta 100 reglas. Cloudflare aconseja empezar proyectos nuevos en Workers, donde los estáticos también son gratis e ilimitados | [Límites](https://developers.cloudflare.com/pages/platform/limits/), [precios](https://developers.cloudflare.com/pages/functions/pricing/), [encabezados](https://developers.cloudflare.com/pages/configuration/headers/), [aviso de Workers](https://developers.cloudflare.com/pages/), [Workers](https://developers.cloudflare.com/workers/static-assets/billing-and-limitations/) |
| **Netlify** | 300 créditos al mes con límite duro, en cuentas nuevas | 15 créditos por deploy de producción; previews, ramas, fallidos y rollbacks no consumen | 20 créditos por GB, 2 por cada 10.000 peticiones, 10 por GB-hora de cómputo. Al agotarse, pausa todos los sitios. Como máximo, 20 deploys al mes sin nada de tráfico. Hay [reportes de julio de 2026](https://answers.netlify.com/t/free-plan-production-deploys-still-blocked-since-jul-24-monthly-300-credits-never-granted/165874) de equipos Free con deploys bloqueados, sin respuesta visible en el hilo | [Créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/how-credits-work/), [precios](https://www.netlify.com/pricing/), [cambio de planes](https://www.netlify.com/changelog/netlify-pricing-update-introducing-credit-based-plans.md) |

**Recomendación:** GitHub Pages. El panel es estático, el repo es público y ya tiene `.nojekyll`, y publicar no gasta nada. Cloudflare es la salida si el panel llega a necesitar COOP/COEP (por ejemplo, ffmpeg.wasm con hilos) o pasa de 1 GB. Netlify no conviene: cada deploy consume el 5 % del mes y, al agotarse, el sitio se apaga.

## Licencia de Remotion

- **Gratis para:** personas, empresas con fines de lucro de hasta 3 empleados, entidades sin ánimo de lucro y quien lo esté evaluando sin uso comercial ([LICENSE.md](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)). Incluye uso comercial, hasta lanzar un SaaS, pero no permite vender Remotion ni ayudar a otros a evitar una licencia ([FAQ](https://www.remotion.dev/docs/license/faq)).
- **De pago:** empresas de 4 personas o más. Cuesta US$25 al mes por puesto, o US$0,01 por render con mínimo de US$100 al mes para herramientas automatizadas ([precios](https://www.remotion.pro/license)).
- **Quién cuenta:** los freelancers y estudios que operan el proyecto suman al total de 4 ([FAQ](https://www.remotion.dev/docs/license/faq)). El [PR de la versión 5.0](https://github.com/remotion-dev/remotion/pull/3750), abierto desde abril de 2024 y sin fusionar, también hace contar a los contratistas y ata la licencia de empresa a sus términos.
- **No es código abierto:** es código disponible bajo licencia propia, y la API de GitHub devuelve `NOASSERTION`. La versión actual es v4.0.540, del 2026-11-02.
- **Para Claqueta:** el usuario de hoy entra gratis, pero una empresa de 4 o más que use Claqueta con Remotion tendría que pagar, lo que choca con la regla central. Remotion puede ser una opción, nunca el motor por defecto. `remotion-dev/skills` no declara licencia, así que tampoco se copia.

## GSAP: una cláusula por revisar

La [licencia de GSAP](https://gsap.com/standard-license/) permite uso comercial y código generado por IA, pero prohíbe usarlo en herramientas visuales de animación sin código que compitan con Webflow. Claqueta genera prompts y no anima desde una interfaz, así que por ahora debería quedar fuera. Si el panel añade un editor visual de animación, hay que consultar a Webflow o usar Anime.js. Esta es mi lectura, no una opinión legal.

## Radar por categoría

Un dato de terceros para leer la primera tabla: la [lista de zhuyansen](https://github.com/zhuyansen/awesome-claude-video-skills) hizo la misma promo de 15 s con 16 skills el 2026-10-11. explainroo tardó 2,0 min, Claude Code sin skill 4,4 min e HyperFrames 23,5 min. Es tiempo de agente en su máquina, no de render en esta PC.

### Agentes y skills

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [lemomo-ai/lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar) | `MIT` | 11.708 | 2026-10-31 | adoptar | MIT y ya probado en esta PC: fijarlo a un commit y sin plugin, con dos avisos: el autor lo afina para Opus 5.5, así que otras IA pueden no reproducirlo, y su mascota no se usa. |
| [remotion-dev/skills](https://github.com/remotion-dev/skills) | `null` | 6.253 | 2026-11-02 | vigilar | GitHub no declara licencia, así que no se puede copiar a Claqueta, y además llevan a Remotion, que no debe ser el motor por defecto. |
| [browser-use/video-use](https://github.com/browser-use/video-use) | `MIT` | 30.481 | 2026-10-08 | vigilar | Método muy útil, pero su README exige una clave de ElevenLabs para transcribir: rompe la regla central salvo que esa etapa se cambie por faster-whisper. |
| [calesthio/OpenMontage](https://github.com/calesthio/OpenMontage) | `AGPL-3.0` | 75.949 | 2026-11-03 | vigilar | Referencia de arquitectura muy activa, pero su AGPL-3.0 alcanzaría a la biblioteca de Claqueta si se copia código, y para explicativos elige Remotion por defecto. |
| [digitalsamba/claude-code-video-toolkit](https://github.com/digitalsamba/claude-code-video-toolkit) | `MIT` | 2.427 | 2026-11-03 | vigilar | Sus herramientas de IA corren a costo en GPU de Modal o RunPod, así que no cumple la regla local; sirve para leer su estructura de comandos y plantillas. |
| [kajisho5/ffmpeg-skill](https://github.com/kajisho5/ffmpeg-skill) | `MIT` | 4.453 | 2026-10-31 | probar | Encaja con la regla central: sin nube, sin claves y con MCP opcional; falta medirlo en Windows con ffmpeg 8 antes de apoyarse en él para cortes y mezcla. |
| [veedstudio/open-edit](https://github.com/veedstudio/open-edit) | `Apache-2.0` | 1.773 | 2026-11-03 | probar | Apache-2.0 y cubre los tres agentes principales; es local solo si se elige WhisperX en lugar del servicio de VEED, y ese modelo baja unos 2 GB. |
| [vincentsch/explainroo](https://github.com/vincentsch/explainroo) | `MIT` | 803 | 2026-10-20 | probar | Lo más parecido a Claqueta: gratis, local, con español, sin Python para ese idioma y con pruebas en Windows; estudiar sus chequeos de texto y voz, y notar que fija espeak en `es`, no en `es-419`. |
| [FavioVazquez/showtime](https://github.com/FavioVazquez/showtime) | `MIT` | 316 | 2026-10-17 | probar | Cumple la regla central y su `check` lee el texto dibujado en Canvas, útil para la revisión; ocupa unos 1,4 GB en Windows y su FAQ aún deja pendiente la prueba en Windows de escritorio. |
| [Moessif/code-video-showcase](https://github.com/Moessif/code-video-showcase) | `MIT` | 298 | 2026-10-28 | probar | Sin modelos generativos y con partitura a 120 BPM hecha en Python, es una receta directa para música procedural sincronizada en una PC sin GPU. |
| [zhuyansen/awesome-claude-video-skills](https://github.com/zhuyansen/awesome-claude-video-skills) | `NOASSERTION` | 1.518 | 2026-11-03 | vigilar | La mejor fuente para renovar este radar; GitHub no clasifica la licencia, pero su LICENSE dedica la lista a CC0 y cada repo listado conserva la suya. |

### Motores de video con código

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) | `Apache-2.0` | 78.321 | 2026-11-03 | adoptar | Apache-2.0, motor actual del estudio, y la 0.9.9 ya pasó `check` y render en esta PC con un motor Canvas dentro de una escena; fijar la versión por proyecto. |
| [remotion-dev/remotion](https://github.com/remotion-dev/remotion) | `NOASSERTION` | 70.430 | 2026-11-03 | vigilar | No es código abierto: gratis para personas, empresas de hasta 3 y entidades sin ánimo de lucro, pero una empresa de 4 o más que use Claqueta pagaría, así que no debe ser el motor por defecto. |
| [motion-canvas/motion-canvas](https://github.com/motion-canvas/motion-canvas) | `MIT` | 19.670 | 2026-07-02 | vigilar | MIT, pero su último push es de julio y no se justifica abrir un segundo motor mientras HyperFrames con Canvas cubra estos casos. |
| [midrender/revideo](https://github.com/midrender/revideo) | `MIT` | 4.173 | 2026-07-15 | vigilar | MIT y útil como plan B de render sin interfaz, pero pasó de redotvideo a midrender, es el motor de un producto comercial y su último push es de julio. |
| [ManimCommunity/manim](https://github.com/ManimCommunity/manim) | `MIT` | 42.210 | 2026-11-02 | vigilar | Muy activo, pero solo compensa en piezas de fórmulas o gráficas matemáticas; en Windows puede pedir Build Tools de C++, y MiKTeX si se usa LaTeX. |

### Voz

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [kyutai-labs/pocket-tts](https://github.com/kyutai-labs/pocket-tts) | `MIT` | 10.184 | 2026-11-03 | probar | Primera voz a probar: tehablo midió 3,7 veces tiempo real en Windows con un Ryzen 5 5600X, pero solo `lola` es nativa en español y los pesos son CC BY 4.0 con condiciones de acceso. |
| [resemble-ai/chatterbox](https://github.com/resemble-ai/chatterbox) | `MIT` | 27.537 | 2026-07-21 | probar | La única de este radar con afinado oficial para Latinoamérica y etiqueta MIT, pero sin cifras de ese modelo en CPU: medir una frase antes de decidir; todo audio lleva marca de agua PerTh. |
| [OHF-Voice/piper1-gpl](https://github.com/OHF-Voice/piper1-gpl) | `GPL-3.0` | 6.151 | 2026-11-02 | adoptar | Respaldo seguro sin GPU: usarlo como programa externo por su GPL-3.0 y revisar cada voz (`claude` declara Apache-2.0, `ald` parte de un corpus Unlicense); la calidad de oído falta confirmarla. |
| [hexgrad/kokoro](https://github.com/hexgrad/kokoro) | `Apache-2.0` | 9.896 | 2025-08-06 | probar | Licencia limpia y muy usada, pero su ficha avisa de soporte flojo fuera del inglés, no califica las voces en español y hay un bug abierto de audio vacío con `em_alex` en Windows 11. |
| [k2-fsa/sherpa-onnx](https://github.com/k2-fsa/sherpa-onnx) | `Apache-2.0` | 15.712 | 2026-11-03 | probar | Ruta para hacer voz y subtítulos desde Node 24 con voces Piper `es_MX` ya empaquetadas; su documentación de Kokoro solo cubre inglés y chino, y sus ejemplos de Pocket son en inglés. |
| [rany2/edge-tts](https://github.com/rany2/edge-tts) | `NOASSERTION` | 12.448 | 2026-10-14 | vigilar | Gratis, pero depende del servicio en línea de Microsoft, así que rompe la regla local y puede dejar de funcionar; GitHub no clasifica la licencia y su LICENSE indica LGPLv3 con un archivo MIT. |
| [SWivid/F5-TTS](https://github.com/SWivid/F5-TTS) | `MIT` | 15.506 | 2026-11-03 | descartar | El código es MIT, pero sus pesos preentrenados son CC-BY-NC: no sirven para canales con fines comerciales ni para una biblioteca pública sin esa restricción. |
| [OpenBMB/VoxCPM](https://github.com/OpenBMB/VoxCPM) | `Apache-2.0` | 41.003 | 2026-10-08 | vigilar | Español, pesos libres y voz sin audio de referencia, pero pide unos 8 GB de VRAM en PyTorch y su ruta GGUF marca RTF 1,76 en un M4 Pro con Metal: en esta CPU iría bastante más lento. |

### Música

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [ace-step/ACE-Step-1.5](https://github.com/ace-step/ACE-Step-1.5) | `MIT` | 14.348 | 2026-10-11 | vigilar | La licencia más limpia para generar música, pero su guía avisa que en CPU va mucho más lento, pide unos 10 GB de disco y no hallé cifras en CPU; su puerto acestep.cpp (MIT) evita Python. |
| [Stability-AI/stable-audio-3](https://github.com/Stability-AI/stable-audio-3) | `MIT` | 847 | 2026-11-02 | probar | Lo más prometedor para música y efectos en esta PC, pero solo el código es MIT: los pesos piden condiciones en Hugging Face, licencia comunitaria (gratis bajo 1 M USD anuales) y términos de Gemma. |
| [facebookincubator/Meta-open-sound](https://github.com/facebookincubator/Meta-open-sound) | `CC0-1.0` | 19 | 2026-10-20 | adoptar | Instrumentos reales y sin atribución para componer música con código desde un muestreador; los efectos del paquete Oculus solo se usan acreditándolos. |
| [seyedpouramir/alvana-audio](https://github.com/seyedpouramir/alvana-audio) | `NOASSERTION` | 4 | 2026-10-15 | probar | Sus archivos de pulsos dan el mapa de cortes sin analizar la pista; su LICENSE.md da CC0 salvo 5 temas CC BY 4.0, pero reúne fuentes de OpenGameArt: revisar cada origen antes de publicar. |
| [Tonejs/Tone.js](https://github.com/Tonejs/Tone.js) | `MIT` | 14.877 | 2026-11-01 | probar | Música procedural sin modelos ni licencias dudosas, en el mismo tipo de navegador que renderiza las escenas; comprobar que exporte igual en dos corridas y mandar muestra, porque Claude no oye. |
| [facebookresearch/audiocraft](https://github.com/facebookresearch/audiocraft) | `MIT` | 23.816 | 2026-03-03 | descartar | El código es MIT, pero los pesos son CC-BY-NC 4.0, y pide Python 3.9 con PyTorch 2.1, lejos del Python 3.11 de esta PC. |

### Efectos de sonido

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [wyzowl/sfx-kit](https://github.com/wyzowl/sfx-kit) | `CC0-1.0` | 24 | 2026-10-20 | adoptar | CC0 sin atribución, 67 MB en WAV de 48 kHz y hecho para agentes: se puede elegir el efecto por lo que pasa en pantalla y mezclarlo con datos, sin oír. |
| [chr15m/jsfxr](https://github.com/chr15m/jsfxr) | `Unlicense` | 462 | 2026-05-05 | vigilar | Síntesis procedural mínima y de dominio público, útil para estilos retro o de terminal; no reemplaza a una biblioteca general como sfx-kit. |

### Subtítulos y alineación

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [SYSTRAN/faster-whisper](https://github.com/SYSTRAN/faster-whisper) | `MIT` | 26.455 | 2026-11-02 | adoptar | La mejor base para esta PC: su prueba transcribió 13 minutos en 1 min 42 s con modelo small, int8 y 8 hilos de un i7-12700K; esta CPU irá más lenta, pero no pide clave ni GPU. |
| [ggml-org/whisper.cpp](https://github.com/ggml-org/whisper.cpp) | `MIT` | 54.893 | 2026-11-03 | probar | Alternativa sin Python ni torch; el binario de Windows está en prelanzamientos como b5454 (`whisper-bin-x64.zip`), no en v1.9.5, y `whisper-cli` solo acepta WAV de 16 bits. |
| [m-bain/whisperX](https://github.com/m-bain/whisperX) | `BSD-2-Clause` | 25.072 | 2026-10-22 | probar | Trae modelo de alineación para español y corre con `--device cpu --compute_type int8`; es más pesado que faster-whisper, así que solo compensa si los subtítulos salen desfasados. |
| [echogarden-project/echogarden](https://github.com/echogarden-project/echogarden) | `null` | 455 | 2026-09-08 | probar | Alinear el guion aprobado evita errores del ASR con nombres propios; GitHub no declara licencia y su package.json dice MIT AND GPL-3.0 por eSpeak-NG: usarlo como programa externo. |

### Edición

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [WyattBlue/auto-editor](https://github.com/WyattBlue/auto-editor) | `Unlicense` | 5.752 | 2026-11-02 | probar | Primer corte útil para material filmado; es de dominio público, pero ya no se publica en pip y en Windows se usa el binario de Releases. |
| [Breakthrough/PySceneDetect](https://github.com/Breakthrough/PySceneDetect) | `BSD-3-Clause` | 5.342 | 2026-11-02 | probar | Sirve para analizar referencias y material propio sin GPU, y para comprobar el ritmo de cortes de una pieza ya renderizada. |
| [AcademySoftwareFoundation/OpenTimelineIO](https://github.com/AcademySoftwareFoundation/OpenTimelineIO) | `Apache-2.0` | 2.054 | 2026-10-31 | vigilar | No hace falta para renderizar; solo compensa si Claqueta debe entregar su montaje a un editor profesional, y ahí ayudaría a conservar la editabilidad. |
| [DanielSWolf/rhubarb-lip-sync](https://github.com/DanielSWolf/rhubarb-lip-sync) | `NOASSERTION` | 2.725 | 2026-06-16 | vigilar | Solo si una pieza exige personaje; para español hay que usar el reconocedor `phonetic`, y GitHub no clasifica la licencia, pero su LICENSE.md declara MIT. |
| [adefossez/demucs](https://github.com/adefossez/demucs) | `MIT` | 3.496 | 2026-10-26 | vigilar | En CPU tarda cerca de 1,5 veces la duración de la pista, suficiente para limpiar material ajeno; Claqueta no la necesita mientras genere voz y música por separado. |

### Editores en navegador (referencia)

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [OpenCut-app/OpenCut](https://github.com/OpenCut-app/OpenCut) | `MIT` | 97.243 | 2026-09-24 | vigilar | Referencia de interfaz y de su futura API, MCP y modo sin interfaz, pero la reescritura no está lista y la versión clásica que recomiendan ya está archivada. |
| [Augani/openreel-video](https://github.com/Augani/openreel-video) | `MIT` | 5.571 | 2026-10-17 | vigilar | La mejor referencia práctica de interfaz local en navegador: MIT, activo y con WebCodecs y WebGPU; Claqueta solo necesita un panel de configuración, no un editor. |

### Animación, 3D y transiciones

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [greensock/GSAP](https://github.com/greensock/GSAP) | `null` | 30.125 | 2026-04-13 | adoptar | GitHub no declara licencia; la propia permite uso comercial, pero prohíbe herramientas visuales sin código que compitan con Webflow: el panel solo debe generar prompts, y Anime.js (MIT) queda de salida. |
| [mrdoob/three.js](https://github.com/mrdoob/three.js) | `MIT` | 117.504 | 2026-11-03 | adoptar | Ya probado en render real en este estudio y WebGL funciona en la Intel UHD 730 por D3D11; hay que medir cada escena 3D porque esa GPU es limitada. |
| [gl-transitions/gl-transitions](https://github.com/gl-transitions/gl-transitions) | `NOASSERTION` | 2.225 | 2026-11-03 | adoptar | Da al panel un catálogo de transiciones con su código listo; GitHub no clasifica la licencia, pero su LICENSE es MIT y el README indica que solo dos transiciones van bajo BSD. |
| [acamposuribe/p5.brush](https://github.com/acamposuribe/p5.brush) | `MIT` | 1.213 | 2026-10-28 | probar | Aporta material dibujado real para pizarra e ilustración; falta medir su costo de render en esta GPU integrada y comprobar que dé la misma imagen al saltar entre cuadros. |
| [theatre-js/theatre](https://github.com/theatre-js/theatre) | `Apache-2.0` | 12.851 | 2024-08-14 | descartar | Sin push público desde agosto de 2024 porque el desarrollo pasó a un repo privado, y su estudio va bajo AGPL-3.0; no conviene atar la biblioteca a él. |

### Vocabularios y catálogos

| Repo | Licencia (API) | Estrellas | Último push | Veredicto | Por qué |
|---|---|---:|---|---|---|
| [Vincentwei1021/video-shotcraft](https://github.com/Vincentwei1021/video-shotcraft) | `Apache-2.0` | 16.515 | 2026-10-29 | probar | Buen vocabulario de planos (código y documentos Apache-2.0), pero está en chino, parte se estudió de promos ajenas según su ATTRIBUTION.md y usa Remotion: tomar ideas, no copiar. |
| [sy77777en/CameraBench](https://github.com/sy77777en/CameraBench) | `NOASSERTION` | 318 | 2026-03-05 | probar | Seis tipos de movimiento y tres marcos de referencia sirven de base al selector de cámara; GitHub no clasifica la licencia, su LICENSE es CC BY 4.0, y la taxonomía está en el artículo, no en un archivo. |

## Verificados y fuera del JSON

Existen y los comprobé con `gh api`, pero no entran en las 50 entradas: son alternativas, fuentes o avisos.

| Repo | Licencia (API) | Estrellas | Último push | Nota |
|---|---|---:|---|---|
| [ayutaz/piper-plus](https://github.com/ayutaz/piper-plus) | `MIT` | 239 | 2026-11-02 | A vigilar: fork MIT de Piper con español y tiempos por fonema (JSON, TSV, SRT). `pip install piper-plus`. |
| [LCubero/tehablo](https://github.com/LCubero/tehablo) | `MIT` | 5 | 2026-11-03 | Pocket TTS en español; fuente de las mediciones en Windows. Documenta 18 voces de Argentina, Chile y Colombia en CC BY-SA 4.0 para clonar: revisar el consentimiento. |
| [ServeurpersoCom/acestep.cpp](https://github.com/ServeurpersoCom/acestep.cpp) | `MIT` | 455 | 2026-10-16 | ACE-Step en C++ con CPU y Vulkan. El juego por defecto pesa unos 7,7 GB, y hay un reporte de palabras perdidas en la letra con un iGPU Intel. |
| [kmilo93sd/agent-video-editor](https://github.com/kmilo93sd/agent-video-editor) | `MIT` | 7 | 2026-10-04 | Criterios de edición para agentes más 128 sonidos y pistas CC0, revisados por fuente. Código MIT. |
| [nomadkaraoke/python-audio-separator](https://github.com/nomadkaraoke/python-audio-separator) | `MIT` | 1.469 | 2026-10-29 | Alternativa a Demucs. `pip install "audio-separator[cpu]"`, con DirectML experimental para GPU Intel. |
| [vercel-labs/skills](https://github.com/vercel-labs/skills) | `MIT` | 37.955 | 2026-11-03 | CLI de `npx skills add`, instalador común de varios repos de este radar. Vía posible para distribuir la biblioteca de Claqueta. |
| [juliangarnier/anime](https://github.com/juliangarnier/anime) | `MIT` | 74.254 | 2026-11-02 | Alternativa MIT a GSAP; el README de HyperFrames la lista como compatible. |
| [rough-stuff/rough](https://github.com/rough-stuff/rough) | `MIT` | 21.344 | 2024-07-28 | Trazo a mano, usado por explainroo. No es urgente: la pizarra del estudio ya tiene motor propio. |
| [KittenML/KittenTTS](https://github.com/KittenML/KittenTTS) | `Apache-2.0` | 16.785 | 2026-10-27 | Español en KittenTTS 2, unos 6 GB de RAM en CPU. Código Apache-2.0, pero los pesos piden registro, aviso de marca y tope de 1 M USD en ingresos y financiación. |
| [microsoft/VibeVoice](https://github.com/microsoft/VibeVoice) | `MIT` | 55.116 | 2026-10-08 | Voces experimentales en español, pero Microsoft no lo recomienda para uso comercial sin más pruebas. |
| [supertone-oss-archive/supertonic](https://github.com/supertone-oss-archive/supertonic) | `MIT` | 13.755 | 2026-09-09 (archivado) | Archivado y sin soporte. Tiene español y corre en CPU, pero el modelo va bajo OpenRAIL-M, con restricciones de uso. |
| [rhasspy/piper](https://github.com/rhasspy/piper) | `MIT` | 11.316 | 2025-08-26 (archivado) | Archivado. Su continuación es `OHF-Voice/piper1-gpl`, que busca mantenedores. |
| [jianfch/stable-ts](https://github.com/jianfch/stable-ts) | `MIT` | 2.280 | 2026-05-30 (archivado) | Archivado: no partir de él. |
| [facebookresearch/demucs](https://github.com/facebookresearch/demucs) | `MIT` | 10.402 | 2024-04-24 (archivado) | Archivado. La copia mantenida es `adefossez/demucs`. |
| [fluent-ffmpeg/node-fluent-ffmpeg](https://github.com/fluent-ffmpeg/node-fluent-ffmpeg) | `MIT` | 8.225 | 2025-05-22 (archivado) | Archivado. Llamar a ffmpeg directamente desde Node. |
| [mifi/editly](https://github.com/mifi/editly) | `MIT` | 5.579 | 2025-05-12 | Sin push desde mayo de 2025; HyperFrames ya cubre este caso. |
| [tnfe/FFCreator](https://github.com/tnfe/FFCreator) | `MIT` | 3.165 | 2024-12-19 | Sin push desde diciembre de 2024. |
| [feitangyuan/onetake](https://github.com/feitangyuan/onetake) | `NOASSERTION` | 3.686 | 2026-10-21 | Licencia PolyForm Noncommercial: no sirve para uso comercial. |
| [patriciogonzalezvivo/lygia](https://github.com/patriciogonzalezvivo/lygia) | `NOASSERTION` | 3.480 | 2026-10-24 | Prosperity Public License: uso comercial solo con 30 días de prueba. |
| [hypit-ai/hypit](https://github.com/hypit-ai/hypit) | `NOASSERTION` | 27.745 | 2026-11-03 | Apache-2.0 modificada con condiciones adicionales, y orientada a clonar videos ajenos. |

## Lo que no pude verificar

- **Calidad de oído en español:** no encontré pruebas independientes, y Claude no oye. Lo de que las voces de Kokoro suenan latinoamericanas viene de un solo usuario.
- **Velocidad en esta PC:** no se instaló nada. No hallé cifras en CPU x86 con Windows para Chatterbox `es-mx-latam`, ACE-Step 1.5 ni Stable Audio 3 Small (las de este último son de Mac, con CoreML y TFLite).
- **Herramientas en Windows:** ffmpeg-skill, open-edit, explainroo y showtime dicen funcionar o tener pruebas en Windows, pero no las corrí. El paquete `sherpa-onnx-win-x64` lo confirmé solo por el código del addon, no en npm.
- **Música CC0:** no revisé cada origen de alvana-audio en OpenGameArt ni si algún tema está registrado en Content ID.
- **Lectura legal:** lo dicho sobre GSAP, AGPL y GPL es lectura mía, no asesoría.
- **Foro de Netlify:** el hilo citado es un reporte de usuario y no vi respuesta del personal.
- **Repos que no existen:** `Vchitect/ShotVL` da 404 y quedó fuera.
- **Cifras:** las estrellas y fechas son del 2026-11-03 y cambian a diario.
