# MOTION.md — bg_system_ia

Contrato visual de todas las piezas de video de la marca. Se lee completo antes de diseñar, animar o renderizar. Si la marca cambia, este archivo se corrige antes de producir.

## 1. Propósito
Videos cortos verticales que explican inteligencia artificial con claridad y criterio: noticias, negocios, ideas de fondo, arte audiovisual y la historia personal del creador. El movimiento existe para jerarquizar y guiar la atención; nunca es adorno.

## 2. Identidad de marca
- **Personalidad:** lúcida, cálida, precisa, un poco cósmica. Habla como un amigo que sabe del tema.
- **Sensaciones prioritarias:** claridad, confianza, curiosidad, energía contenida.
- **Sensaciones prohibidas:** sensacionalismo, miedo, "hype" vacío, estética genérica de IA (robots azules, circuitos neón, cerebros de stock).
- **Referencias:** avatar actual de @bg_system_ia (cerebro dorado con órbitas atómicas y letras "BG" sobre negro); videos de referencia del usuario sobre audiovisual hecho con código (Wide Silvente, Dot CSV, Jorge SinCodigo, Daniel Carreon, "The Simulation's Ending").
- **Lo que nunca cambia:** fondo negro cálido, oro como único acento, legibilidad absoluta.

## 3. Color
### Primarios
- Oro: `#E9A93B` — acento principal; solo lo importante. Máximo un elemento en oro sólido por momento.
- Oro claro: `#F5C66B` — palabra activa de subtítulos, resaltado momentáneo, titulares de gancho.

### Secundarios
- Cobre: `#B8692E` — líneas, órbitas, conectores, estructura secundaria.
- Crema: `#F7EBD3` — texto principal.

### Superficies
- Fondo: `#0B0806`
- Superficie elevada: `#1A120A` (bandas, cajas, ticker)
- Borde: `#6B4A1E` (hairlines 1–2 px)

### Estados (solo cuando el dato lo exige)
- Éxito: `#8FBF7A`
- Advertencia: `#E9A93B`
- Error: `#D9583B`
- Información: `#F7EBD3`

## 4. Tipografía
- **Display / títulos:** Sora.
- **Cuerpo / subtítulos:** Sora.
- **Mono / datos:** JetBrains Mono.
- **Pesos autorizados:** Sora 500, 600, 700; JetBrains Mono 500.
- **Casing:** oración (solo la primera mayúscula). Mayúsculas sostenidas solo en etiquetas cortas (≤ 2 palabras) como "NUEVO".
- **Tracking:** títulos −1 %; etiquetas en mayúsculas +6 %.
- **Reglas de longitud:** titular ≤ 7 palabras y ≤ 2 líneas; subtítulos ≤ 2 líneas de ≤ 32 caracteres; tamaño mínimo 44 px para lectura y 64 px+ para titulares.

## 5. Grid y composición (1080×1920)
- **Márgenes:** 72 px laterales.
- **Safe areas:** franja superior 0–220 px sin texto clave (barra de estado y nombre de cuenta); subtítulos hasta 1640 px como máximo; nada clave entre 1640 y 1920 px (descripción y botones de la app); riel derecho 960–1080 px entre 900 y 1700 px libre (íconos de me gusta, comentar, compartir).
- **Alineaciones:** izquierda para titulares y listas; centro solo para palabras sueltas de impacto.
- **Densidad:** una idea por pantalla; máximo 3 elementos animándose a la vez.
- **Radios:** 6 px en cajas y etiquetas; sin píldoras.
- **Reglas responsive:** el maestro es 9:16; 1:1 y 16:9 se recomponen por escena, nunca recorte ciego.

## 6. Lenguaje de movimiento
### Principios
- El movimiento tiene causa: cada aparición responde a lo que dice la voz.
- El movimiento dirige la atención hacia la idea que se está diciendo.
- Sin animación ornamental permanente; los loops sutiles solo en fondos.
- Cada transición continúa o resuelve la energía de la anterior.

### Timing base (30 fps)
- Microinteracción: 120–180 ms (4–5 frames).
- Entrada corta: 250–400 ms.
- Transición de escena: 400–600 ms.
- Reveal principal: 600–900 ms.
- Hold mínimo de texto: 1.2 s, o el tiempo de leerlo dos veces en voz baja, lo que sea mayor.

### Easing
Curva base: `cubic-bezier(0.215, 0.61, 0.355, 1)` (power3.out).
- Entrada: `cubic-bezier(0.215, 0.61, 0.355, 1)`
- Salida: `cubic-bezier(0.55, 0.085, 0.68, 0.53)` (power2.in), 180–250 ms
- Énfasis: `cubic-bezier(0.34, 1.36, 0.64, 1)` (overshoot ≤ 6 %)
- Cámara: `cubic-bezier(0.65, 0, 0.35, 1)`

### Prohibiciones
- Rebotes sin intención; elastic/bounce como estilo por defecto.
- Wobble o pulsos permanentes.
- Fades genéricos repetidos como única transición.
- Texto ilegible por velocidad; texto letra por letra en frases largas.
- Glitch como relleno; giros 3D gratuitos.
- Transiciones que no aportan significado.

## 7. Motion por componente
- **Títulos / gancho:** entran por línea con máscara vertical (300 ms, power3.out); la palabra clave en oro claro.
- **Etiqueta "NUEVO":** caja oro con texto `#2A1A05`, wipe horizontal 300 ms.
- **Listas / claves numeradas:** número en JetBrains Mono oro, texto en crema; cada ítem entra cuando la voz lo nombra.
- **Métricas:** conteo ascendente solo con cifras con fuente; unidad en cobre.
- **Diagramas / flujos:** nodos con borde oro claro, conectores cobre que se dibujan en la dirección del flujo.
- **Logos:** sting de cierre 0.6 s — logo original escala 92→100 % con brillo dorado que recorre las órbitas. Sin archivo de logo: texto `bg_system_ia` en Sora 600. Marca de agua 64 px, esquina superior izquierda dentro de la zona segura, opacidad 70 %.
- **Capturas / UI de producto:** solo capturas reales, en marco con borde `#6B4A1E` y radio 6 px; nunca UI inventada.
- **Subtítulos:** 2 líneas máximo, crema sobre caja `#0B0806` al 80 %, palabra activa en `#F5C66B` sincronizada por timestamp de palabra.
- **Ticker inferior (Señal):** banda `#1A120A` con borde superior oro, texto JetBrains Mono, desplazamiento constante, por encima de 1640 px.

## 8. Cámara / profundidad / 3D
- Señal y Sistema: sin 3D; como mucho parallax leve de fondo (≤ 3 % de desplazamiento).
- Órbita y Pulso: 3D ligero permitido (órbitas, partículas, perspectiva suave) si refuerza la idea.
- Nunca 3D sobre texto que se está leyendo.

## 9. Audio
- **Voz:** manda sobre todo. Voz de la marca: **JC - Energetic News Broadcaster** (ElevenLabs `4XUsiqPDK4UACIM2BILe`), moderador profesional, fluido y enérgico.
- **Música:** de fondo a −22 dB por debajo de la voz, con ducking automático; sube en intro, transiciones sin voz y cierre.
- **BPM:** cuando la música tiene grilla fiable, los cortes grandes caen en compás; si no, en frases.
- **Beat/phrase policy:** cortes por idea, alineados a la frase de la voz; nunca un corte por beat mecánico.
- **SFX:** acompañan cambios de escena y aparición de elementos clave (whoosh suave en transiciones, tick o pop en etiquetas y números, impacto sutil en el gancho); máximo 1 SFX por segundo y nunca encima de una palabra clave.
- **Ducking:** música −6 dB adicionales mientras hay voz.
- **Silencios intencionales:** 0.3–0.5 s antes del dato más importante.
- **Master final:** −14 LUFS integrado, true peak ≤ −1 dBTP.

## 10. Cortes
Los cortes responden a acontecimientos narrativos (una idea nueva) o musicales (frase, drop). Nunca más de un corte por segundo. No forzar un corte por beat si el track no tiene una grilla fiable.

## 11. Formatos de salida
- 9:16: 1080×1920, 30 fps (maestro).
- 1:1: 1080×1080, 30 fps (recompuesto).
- 16:9: 1920×1080, 30 fps (recompuesto, para YouTube largo o Facebook).
- Duración objetivo: Señal 30–45 s; Sistema 45–75 s; Órbita 60–90 s; Bitácora 30–60 s; Pulso 30–120 s.

## 12. Quality bar
Nada se entrega si tiene:
- texto desbordado o dentro de una zona no segura;
- contraste insuficiente (WCAG AA en texto de lectura);
- assets faltantes, inventados o redibujados;
- frames negros, vacíos o rotos;
- desincronía voz–texto mayor a 2 frames;
- loudness fuera de −14 ±1.5 LUFS o true peak > −1 dBTP;
- cifras o afirmaciones sin fuente en el `BRIEF.md`.

Antes de renderizar se revisan snapshots de frames críticos; después del render, el archivo final con `ffprobe` y frames extraídos.
