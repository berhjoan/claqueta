#!/usr/bin/env python3
"""Convierte un bloque «shader transition» del registro de HyperFrames en una subcomposición vertical (1080x1920)
que mezcla DOS IMÁGENES FIJAS (escena A y escena B) con el GLSL original del bloque.

Por qué: esos bloques se publican como demostraciones de 1920x1080 con un panel azul y un lienzo de 1200x1080, y
toman el contenido de las escenas pintando solo colores de fondo y texto de una línea. Aquí se conserva tal cual el
tramo de código con los shaders y se cambian las texturas por dos PNG (por ejemplo, de `hyperframes snapshot`).

Uso:
  python generar-shader.py --bloque ruta/al/registro/blocks/swirl-vortex/swirl-vortex.html --salida compositions/sh-swirl-vortex.html
  python generar-shader.py --bloque .../glitch/glitch.html --salida compositions/sh-glitch.html --id sh-glitch --duracion 1.0

Valen los 14 bloques de shader (chromatic-radial-split, cinematic-zoom, cross-warp-morph, domain-warp-dissolve,
flash-through-white, glitch, gravitational-lens, light-leak, ridged-burn, ripple-waves, sdf-iris, swirl-vortex,
thermal-distortion, whip-pan), pero solo se probaron glitch, swirl-vortex, light-leak, ripple-waves, cinematic-zoom,
thermal-distortion, chromatic-radial-split y gravitational-lens.

El bloque original es de HeyGen (Apache-2.0); mira LICENSE-Apache-2.0-hyperframes.txt.
"""
import argparse
import re
import sys
from pathlib import Path

W, H = 1080, 1920


def generar(bloque_html: str, cid: str, dur: float) -> str:
    a = bloque_html.index("var vertSrc")
    b = bloque_html.index("function renderShader")
    cuerpo = bloque_html[a:b]
    return f"""<template>
  <style>
    #root {{ position: absolute; inset: 0; overflow: hidden; background: transparent; }}
    #{cid}-cv {{ position: absolute; left: 0; top: 0; width: 100%; height: 100%; display: block; }}
  </style>
  <div id="root" data-composition-id="{cid}" data-width="{W}" data-height="{H}"
    data-composition-variables='[
      {{"id":"desde","type":"string","label":"Imagen fija de la escena A","default":"assets/escA.png"}},
      {{"id":"hasta","type":"string","label":"Imagen fija de la escena B","default":"assets/escB.png"}},
      {{"id":"duracion","type":"number","label":"Duracion de la transicion (s)","default":{dur},"min":0.3,"max":3,"step":0.05,"unit":"s"}}
    ]'>
    <canvas id="{cid}-cv" width="{W}" height="{H}"></canvas>
  </div>
  <script>
    (function () {{
      var vars = (window.__hyperframes && window.__hyperframes.getVariables) ? window.__hyperframes.getVariables() : {{}};
      var SRC_A = vars.desde || "assets/escA.png";
      var SRC_B = vars.hasta || "assets/escB.png";
      var D = Number(vars.duracion) > 0 ? Number(vars.duracion) : {dur};
      var glCanvas = document.getElementById("{cid}-cv");
      var gl = glCanvas.getContext("webgl", {{ preserveDrawingBuffer: true }});
      window.__timelines = window.__timelines || {{}};
      window.__hf = window.__hf || {{}};
      window.__hf.buildReady = window.__hf.buildReady || {{}};
      if (!gl) {{ console.warn("WebGL no disponible"); window.__timelines["{cid}"] = gsap.timeline({{ paused: true }}); return; }}
      gl.viewport(0, 0, {W}, {H});
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
      // ---- tramo tomado tal cual del bloque (GLSL y programas) ----
{cuerpo}
      // ---- fin del tramo del bloque ----
      function loadTex(src) {{
        return new Promise(function (ok, fail) {{
          var img = new Image();
          img.onload = function () {{
            var tex = gl.createTexture();
            gl.bindTexture(gl.TEXTURE_2D, tex);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
            ok(tex);
          }};
          img.onerror = function () {{ fail(new Error("no carga " + src)); }};
          img.src = src;
        }});
      }}
      function draw(prog, texFrom, texTo, progress) {{
        gl.useProgram(prog);
        gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFrom);
        gl.uniform1i(gl.getUniformLocation(prog, "u_from"), 0);
        gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texTo);
        gl.uniform1i(gl.getUniformLocation(prog, "u_to"), 1);
        gl.uniform1f(gl.getUniformLocation(prog, "u_progress"), progress);
        gl.uniform2f(gl.getUniformLocation(prog, "u_resolution"), {W}, {H});
        var pos = gl.getAttribLocation(prog, "a_pos");
        gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
        gl.enableVertexAttribArray(pos);
        gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      }}
      window.__hf.buildReady["{cid}"] = Promise.all([loadTex(SRC_A), loadTex(SRC_B)]).then(function (t) {{
        var A = t[0], B = t[1];
        var st = {{ p: 0 }};
        function paint() {{
          var p = st.p;
          if (p <= 0.0005) draw(progPass, A, A, 0);
          else if (p >= 0.9995) draw(progPass, B, B, 0);
          else draw(progTrans, A, B, p);
        }}
        var tl = gsap.timeline({{ paused: true, onUpdate: paint }});
        tl.fromTo(st, {{ p: 0 }}, {{ p: 1, duration: D, ease: "power2.inOut", onUpdate: paint }}, 0);
        paint();
        window.__timelines["{cid}"] = tl;
      }});
    }})();
  </script>
</template>
"""


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--bloque", required=True, help="HTML del bloque shader del registro")
    p.add_argument("--salida", required=True, help="subcomposición que se escribe")
    p.add_argument("--id", default=None, help="data-composition-id (por defecto sh-<nombre del bloque>)")
    p.add_argument("--duracion", type=float, default=1.0)
    a = p.parse_args()
    src = Path(a.bloque).read_text(encoding="utf-8")
    if "var vertSrc" not in src or "function renderShader" not in src:
        sys.exit("Ese archivo no tiene la forma de un bloque shader del registro (falta `var vertSrc` o `function renderShader`).")
    cid = a.id or "sh-" + Path(a.bloque).stem
    if not re.fullmatch(r"[a-z][a-z0-9-]*", cid):
        sys.exit("El id debe ir en minúsculas, con guiones y sin empezar por dígito.")
    Path(a.salida).parent.mkdir(parents=True, exist_ok=True)
    Path(a.salida).write_text(generar(src, cid, a.duracion), encoding="utf-8", newline="\n")
    print(f"escrito {a.salida} ({cid}, {a.duracion} s)")


if __name__ == "__main__":
    main()
