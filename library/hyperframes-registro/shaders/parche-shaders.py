#!/usr/bin/env python3
"""Parche mínimo del bundle de shaders del registro (commit fa1942d). Cuatro sustituciones de texto, sin tocar nada más.

Uso: python parche-shaders.py ORIGINAL.js DESTINO.js

El original dibuja siempre el primer canvas[data-shader] de la página, así que solo cabe un shader por video.
Con el parche:
  1. El cuerpo que arranca un shader pasa a ser una función, window.__hfShaderMount(canvas), que cada escena llama con su canvas.
  2. Al final, si nadie pidió el modo manual (window.__hfShaderManual), se monta el primer canvas como antes: un bloque suelto se comporta igual que el original.
  3. La promesa de arranque se registra con una clave propia por instancia (shaders1, shaders2...), para que dos escenas no se pisen.
  4. El tiempo que recibe el shader pasa por canvas.__mapTime(t) si la escena la define (tiempo local de la escena y quietud al final).
"""
import hashlib, sys
origen, destino = sys.argv[1], sys.argv[2]
s = open(origen, encoding="utf-8").read()
ORIG_MD5 = "61b46a2b795b406683f30aa515e03843"
md5 = hashlib.md5(open(origen, "rb").read()).hexdigest()
if md5 != ORIG_MD5:
    sys.exit(f"El archivo no es el original del commit fa1942d (md5 {md5}, esperado {ORIG_MD5})")
cambios = [
    ('var o1=document.querySelector("canvas[data-shader]"),Du=WE[o1.dataset.shader],Ji=YE(),T0=Promise.resolve();',
     'window.__hfShaderMount=function(o1){var Du=WE[o1.dataset.shader],Ji=YE(),T0=Promise.resolve();'),
    ('waitUntil(t)});})();',
     'waitUntil(t)});};if(!window.__hfShaderManual){var c0=document.querySelector("canvas[data-shader]");if(c0)window.__hfShaderMount(c0)}})();'),
    ('window.__hf.buildReady.shaders=S0',
     'window.__hfShaderN=(window.__hfShaderN||0)+1;window.__hf.buildReady["shaders"+window.__hfShaderN]=S0'),
    ('let t=S0.then(()=>OE(e.detail.time))',
     'let t=S0.then(()=>OE(o1.__mapTime?o1.__mapTime(e.detail.time):e.detail.time))'),
]
for a, b in cambios:
    n = s.count(a)
    if n != 1:
        sys.exit(f"Se esperaba 1 coincidencia de {a!r} y hay {n}")
    s = s.replace(a, b)
open(destino, "w", encoding="utf-8", newline="").write(s)
print("listo", destino, hashlib.md5(s.encode("utf-8")).hexdigest())
