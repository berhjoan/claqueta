// Profundidad, espacio y luz. `esc` indica al monitor cómo armar la escena: capas, separación en Z y si es plano.
export const modos = [
  { id: "plano", n: ["Plano 2D", "Flat 2D"], d: "Sin espacio: gráfico puro, cartel, tipografía.", esc: { capas: 1, sep: 0 },
    p: ["Composición plana 2D, sin perspectiva. Toda la jerarquía sale de la escala, el color y el orden.", "Flat 2D composition with no perspective. Hierarchy comes from scale, color and order alone."] },
  { id: "parallax", n: ["2.5D con parallax", "2.5D parallax"], d: "Capas planas a distintas distancias.", esc: { capas: 4, sep: 90 },
    p: ["Profundidad 2.5D con capas planas: fondo a 0,1 a 0,3×, medio a 0,5 a 0,7× y frente a 1 a 1,5× del movimiento de cámara, con desenfoque ligero en el frente.", "2.5D depth with flat layers: background at 0.1 to 0.3×, midground at 0.5 to 0.7× and foreground at 1 to 1.5× of the camera move, with slight blur on the foreground."] },
  { id: "css3d", n: ["Espacio CSS 3D", "CSS 3D space"], d: "Planos con perspectiva real en el navegador.", esc: { capas: 5, sep: 130 },
    p: ["Espacio CSS 3D: planos con perspective y preserve-3d, y una sola cámara que los recorre. Nada de 3D gratuito sobre texto que se lee.", "CSS 3D space: planes with perspective and preserve-3d, and a single camera traveling through them. No gratuitous 3D over text being read."] },
  { id: "real", n: ["3D real", "Real 3D"], d: "Geometría, luces y materiales con three.js.", esc: { capas: 6, sep: 170 },
    p: ["3D real con three.js dentro de la composición: geometría, luces, materiales y una cámara con lente definida. Dibuja solo desde el reloj de la línea de tiempo, nunca con requestAnimationFrame.", "Real 3D with three.js inside the composition: geometry, lights, materials and a camera with a defined lens. Draw only from the timeline clock, never with requestAnimationFrame."] },
  { id: "isometrico", n: ["Isométrico", "Isometric"], d: "Una proyección fija y limpia.", esc: { capas: 4, sep: 60, iso: true },
    p: ["Proyección isométrica única en toda la pieza (30 grados): cara superior más clara y sombras planas del 15 % al 30 %.", "One isometric projection for the whole piece (30 degrees): lighter top face and flat shadows at 15% to 30%."] },
  { id: "diorama", n: ["Diorama", "Diorama"], d: "Maqueta de papel o cartón en capas con sombra.", esc: { capas: 6, sep: 70, sombra: true },
    p: ["Diorama: capas recortadas en el espacio, separadas por sombras de contacto reales, como una maqueta iluminada.", "Diorama: cut-out layers in space, separated by real contact shadows, like a lit model."] },
  { id: "zespacio", n: ["Tipografía en el espacio", "Type in Z-space"], d: "Las palabras flotan a distintas distancias.", esc: { capas: 5, sep: 200, tipo: true },
    p: ["Tipografía en el espacio: palabras colocadas en Z y atravesadas por la cámara; cada una se lee cuando llega al plano de foco.", "Type in Z-space: words placed along Z and crossed by the camera; each one reads when it reaches the focal plane."] },
  { id: "nubes", n: ["Nube de puntos", "Point cloud"], d: "Volumen hecho de miles de puntos.", esc: { capas: 5, sep: 150, puntos: true },
    p: ["Volumen como nube de puntos (WebGL o Canvas), con semilla fija y posición calculada en función del tiempo.", "Volume as a point cloud (WebGL or Canvas), with a fixed seed and position computed from time."] },
];

export const foco = [
  { id: "no", n: ["Todo enfocado", "Deep focus"], blur: 0, p: ["Todo enfocado.", "Deep focus, everything sharp."] },
  { id: "suave", n: ["Suave", "Subtle"], blur: 2, p: ["Profundidad de campo suave: capas lejanas con 2 a 4 px de desenfoque.", "Subtle depth of field: far layers with 2 to 4 px of blur."] },
  { id: "media", n: ["Media", "Medium"], blur: 5, p: ["Profundidad de campo media: 5 a 8 px fuera del plano de foco.", "Medium depth of field: 5 to 8 px outside the focal plane."] },
  { id: "bokeh", n: ["Fondo muy desenfocado", "Strong bokeh"], blur: 10, p: ["Profundidad de campo corta: 10 a 18 px fuera de foco, sujeto nítido. Hornea el desenfoque cuando sea caro.", "Shallow depth of field: 10 to 18 px out of focus, subject sharp. Bake the blur when it gets expensive."] },
];

export const atmosfera = [
  { id: "limpia", n: ["Limpia", "Clean"], d: "Nada entre la cámara y el sujeto.", p: ["Aire limpio, sin partículas.", "Clean air, no particles."] },
  { id: "niebla", n: ["Niebla de profundidad", "Depth fog"], d: "Lo lejano se funde con el fondo.", p: ["Niebla de profundidad: lo lejano se funde con el color del fondo hasta un 40 %.", "Depth fog: distant layers fade into the ground color up to 40%."] },
  { id: "polvo", n: ["Polvo en la luz", "Dust in light"], d: "Motas lentas solo donde hay luz.", p: ["Polvo en la luz: de 20 a 60 motas con semilla fija, solo dentro de los haces de luz y muy lentas.", "Dust in light: 20 to 60 seeded motes, only inside the light beams and very slow."] },
  { id: "haces", n: ["Haces de luz", "Light shafts"], d: "Rayos que dan volumen.", p: ["Haces de luz suaves con 15 % a 25 % de opacidad; nunca como decoración sin fuente de luz.", "Soft light shafts at 15% to 25% opacity; never as decoration without a light source."] },
  { id: "humo", n: ["Humo o neblina", "Smoke or haze"], d: "Textura que se mueve despacio.", p: ["Humo tenue con ruido continuo de movimiento lento, sin tapar el texto.", "Faint smoke with slow continuous noise, never covering the text."] },
];

export const luz = [
  { id: "plana", n: ["Plana gráfica", "Flat graphic"], d: "Sin luz simulada: color puro.", p: ["Luz plana: color puro sin sombras simuladas.", "Flat light: pure color with no simulated shadows."] },
  { id: "suave", n: ["Clave suave lateral", "Soft side key"], d: "Una sola luz suave desde un lado.", p: ["Una sola luz suave desde arriba a la izquierda; sombras de 15 % a 30 %.", "One soft key from the upper left; shadows at 15% to 30%."] },
  { id: "contra", n: ["Contraluz con borde", "Rim backlight"], d: "Recorta la silueta con un filo de luz.", p: ["Contraluz: un borde de luz recorta la silueta sobre un fondo oscuro.", "Backlight: a rim of light cuts the silhouette against a dark ground."] },
  { id: "baja", n: ["Clave baja dramática", "Dramatic low key"], d: "Mucha sombra y un punto de luz.", p: ["Clave baja: 70 % del cuadro en sombra y un punto de luz sobre lo importante, sin perder legibilidad.", "Low key: 70% of the frame in shadow and one pool of light on what matters, without losing legibility."] },
  { id: "ventana", n: ["Luz de ventana", "Window light"], d: "Luz cálida y sesgada que entra de lado.", p: ["Luz de ventana cálida y sesgada, con caída suave; nunca dibuja formas sobre el texto.", "Warm slanted window light with a soft falloff; it never draws shapes over text."] },
  { id: "practica", n: ["Luces en escena", "Practical lights"], d: "La luz sale de objetos: pantallas, lámparas.", p: ["La luz sale de objetos en escena, como pantallas o lámparas, con un resplandor local del 15 % al 25 %.", "Light comes from objects in the scene, such as screens or lamps, with a local glow of 15% to 25%."] },
  { id: "tres", n: ["Estudio de tres puntos", "Three-point studio"], d: "Principal, relleno y contra, como un producto.", p: ["Estudio de tres puntos: principal, relleno y contra, con fondo continuo y sombra de contacto de 0,55.", "Three-point studio: key, fill and back, on a seamless sweep with a 0.55 contact shadow."] },
  { id: "dorada", n: ["Hora dorada", "Golden hour"], d: "Sol bajo y cálido.", p: ["Hora dorada: sol bajo, sombras largas y luces cálidas.", "Golden hour: low sun, long shadows and warm highlights."] },
];

export const profundidad = {
  id: "profundidad", nombre: "Profundidad y luz", titulo: ["Profundidad y luz", "Depth and light"],
  grupos: [
    { id: "espacio", titulo: "Espacio", ayuda: "Cuánta profundidad tiene el mundo. Se ve en el monitor.", controles: [
        { k: "modo", t: "opciones", vista: "tarjetas", def: "parallax", label: ["Espacio", "Space"], opciones: modos },
        { k: "capas", t: "rango", titulo: "Capas", min: 2, max: 8, paso: 1, def: 4, label: ["Capas", "Layers"], p: ["Usa {v} capas de profundidad.", "Use {v} depth layers."] },
        { k: "foco", t: "opciones", vista: "chips", def: "suave", titulo: "Profundidad de campo", label: ["Profundidad de campo", "Depth of field"], opciones: foco },
      ] },
    { id: "aire", titulo: "Aire y luz", controles: [
        { k: "atmosfera", t: "opciones", vista: "lista", def: "limpia", titulo: "Atmósfera", label: ["Atmósfera", "Atmosphere"], opciones: atmosfera },
        { k: "luz", t: "opciones", vista: "lista", def: "suave", titulo: "Luz", label: ["Luz", "Light"], opciones: luz },
      ] },
  ],
};
