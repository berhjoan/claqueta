#!/usr/bin/env python3
"""La carpeta final de una pieza, con un comando: máster, copia liviana, portada, subtítulos, créditos e informe. No sube nada.

Uso (dentro de tu proyecto):
  python ../.claqueta/tools/entrega.py renders/final.mp4 --titulo "Qué hace bueno a un prompt"
  python ../.claqueta/tools/entrega.py renders/final.mp4 --titulo "..." --portada 6.5
  python ../.claqueta/tools/entrega.py renders/final.mp4 --titulo "..." --revisar --duracion 30 --ignorar 1300-1540

Crea entrega/ con:
  master.mp4        el video tal cual
  liviano.mp4       solo si el máster pasa de 30 MB (--max-mb): H.264, 8 Mbps o lo que quepa
  portada.jpg       el segundo de --portada o, si falta, el cuadro más nítido y con más contraste: ni negro ni en transición
  final.srt         renders/final.srt, un .srt con el nombre del video, o los grupos de assets/tiempos.json
  CREDITOS.md       de creditos.json (lo escribe tools/medios/medios.py), assets/tiempos.json (voz y motor) y las licencias de las fuentes
  INFORME.md        lo medido, tomado de renders/revision/revision.json, y una sección fija de lo que no se pudo comprobar
Imprime un JSON con lo que escribió. Termina con error si no hay revisión o si la revisión trae fallos: la carpeta se crea igual,
pero no la entregues hasta resolverlos. --revisar corre tools/qa/revisar.py antes (acepta --duracion, --ignorar y --fondo-oscuro).

Marca como generadas la voz y la música si assets/tiempos.json dice que la voz no es grabada o si hay assets/audio/rejilla.json:
las redes piden declararlo. Señala lo que exige atribución (CC BY, CC BY-SA) con la línea lista para pegar en la descripción.
Necesita numpy y ffmpeg.
"""
import argparse
import json
import shutil
import subprocess
import sys
import time
from datetime import datetime
from pathlib import Path

import numpy as np

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

AQUI = Path(__file__).resolve().parent
CATALOGO_FUENTES = AQUI.parent / "assets" / "fonts" / "fuentes.json"
MOTORES_GENERADOS = {"edge", "kokoro", "piper", "pocket"}


def correr(args):
    return subprocess.run(args, capture_output=True, text=True, encoding="utf-8", errors="replace")


def leer_json(ruta, defecto):
    try:
        return json.loads(Path(ruta).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return defecto


def mb(p):
    return round(Path(p).stat().st_size / 1048576, 1)


def coma(x, d=1):
    return f"{x:.{d}f}".replace(".", ",")


def duracion_de(ruta):
    r = correr(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(ruta)])
    try:
        return float(r.stdout.strip())
    except ValueError:
        sys.exit(f"Error: no se pudo leer {ruta}")


def srt_de_tiempos(tiempos, salida):
    """Los subtítulos de la pieza ya están en assets/tiempos.json (pista.py): si no hay otro .srt, salen de ahí."""
    if not tiempos.is_file():
        return False
    try:
        grupos = json.loads(tiempos.read_text(encoding="utf-8")).get("grupos") or []
    except (ValueError, OSError):
        return False

    def marca(t):
        ms = round(float(t) * 1000)
        return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"

    bloques = []
    for g in grupos:
        lineas = [str(x) for x in (g.get("lineas") or []) if str(x).strip()]
        if lineas and g.get("fin", 0) > g.get("inicio", 0):
            bloques.append(f"{len(bloques) + 1}\n{marca(g['inicio'])} --> {marca(g['fin'])}\n" + "\n".join(lineas) + "\n")
    if not bloques:
        return False
    salida.write_text("\n".join(bloques), encoding="utf-8")
    return True


# ----------------------------------------------------------------------------------------------------------- copia liviana


def liviano(master, destino, max_mb, dur):
    """H.264 yuv420p a 8 Mbps o menos, lo que quepa en max_mb. Mide el resultado y baja la tasa si se pasó."""
    presupuesto = max_mb * 1048576 * 8 * 0.92
    audio = 128_000
    vb = min(8_000_000, int(presupuesto / max(dur, 1.0) - audio))
    escalar = vb < 1_500_000
    for intento in range(4):
        vf = ["-vf", "scale='min(720,iw)':-2"] if escalar else []
        r = correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-i", str(master), *vf, "-c:v", "libx264", "-preset", "medium", "-b:v", str(vb), "-maxrate", str(int(vb * 1.15)),
                    "-bufsize", str(vb * 2), "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart", str(destino)])
        if r.returncode != 0:
            sys.exit(f"Error: ffmpeg no pudo hacer la copia liviana: {r.stderr.strip()[-300:]}")
        if Path(destino).stat().st_size <= max_mb * 1048576:
            return {"video_kbps": vb // 1000, "reescalado_a_720": escalar, "intentos": intento + 1}
        vb = int(vb * max_mb * 1048576 * 0.94 / Path(destino).stat().st_size)
        escalar = escalar or vb < 1_500_000
    return {"video_kbps": vb // 1000, "reescalado_a_720": escalar, "intentos": 4, "pasa_del_limite": True}


# ------------------------------------------------------------------------------------------------------------------ portada


def candidatas(video, dur, fronteras):
    """Cuadros de muestra (4 por segundo) puntuados por nitidez y contraste; sin negros ni transiciones."""
    r = correr(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "csv=p=0:s=x", str(video)])
    w, h = (int(z) for z in r.stdout.strip().split("x")[:2])
    ancho = 270
    alto = max(2, int(round(ancho * h / w / 2)) * 2)
    fps = 4
    crudo = subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-i", str(video), "-an", "-vf", f"fps={fps},scale={ancho}:{alto}:flags=area,format=gray", "-f", "rawvideo", "-"], capture_output=True).stdout
    n = len(crudo) // (ancho * alto)
    if n < 3:
        return []
    f = np.frombuffer(crudo[: n * ancho * alto], np.uint8).reshape(n, alto, ancho).astype(np.float32)
    nitidez = np.array([float((np.diff(x, axis=0) ** 2).mean() + (np.diff(x, axis=1) ** 2).mean()) for x in f])
    contraste = f.std((1, 2))
    media = f.mean((1, 2))
    cambio = np.zeros(n)
    cambio[1:-1] = np.maximum(np.abs(f[1:-1] - f[:-2]).mean((1, 2)), np.abs(f[1:-1] - f[2:]).mean((1, 2)))
    t = np.arange(n) / fps
    valido = (t >= min(0.5, dur * 0.1)) & (t <= dur - 0.3)
    valido &= ~((media < 12) & (contraste < 12))  # negro o liso
    valido &= contraste >= 8
    if (valido & (cambio > 0)).any():
        valido &= cambio <= np.percentile(cambio[valido], 75)  # lejos del movimiento fuerte y de los cortes
    for tf in fronteras:
        valido &= np.abs(t - tf) >= 0.5
    if not valido.any():
        valido = (t >= 0.3) & (contraste >= 4)
    if not valido.any():
        return []
    rank = lambda v: (np.argsort(np.argsort(v)) / max(1, len(v) - 1))  # noqa: E731
    idx = np.flatnonzero(valido)
    puntaje = rank(nitidez[idx]) + rank(contraste[idx])
    orden = idx[np.argsort(-puntaje)]
    return [{"segundo": round(float(t[i]), 2), "nitidez": round(float(nitidez[i]), 1), "contraste": round(float(contraste[i]), 1)} for i in orden[:5]]


def sacar_cuadro(video, t, destino):
    r = correr(["ffmpeg", "-y", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", str(video), "-frames:v", "1", "-q:v", "2", str(destino)])
    return r.returncode == 0 and Path(destino).exists()


# ------------------------------------------------------------------------------------------------------------------ créditos


def familias_usadas(proyecto):
    """Familias del catálogo cuyos archivos están en assets/fonts/ del proyecto."""
    cat = None
    for c in (proyecto / "assets" / "fonts" / "fuentes.json", CATALOGO_FUENTES):
        if c.is_file():
            cat = leer_json(c, None)
            if cat:
                break
    carpeta = proyecto / "assets" / "fonts"
    if not cat or not carpeta.is_dir():
        return [], bool(cat)
    presentes = {p.name for p in carpeta.iterdir()}
    res = []
    for fam, d in cat.get("familias", {}).items():
        if any(a["archivo"] in presentes for a in d["archivos"]):
            res.append({"familia": fam, "licencia_archivo": d.get("licencia"), "licencia_en_proyecto": d.get("licencia") in presentes})
    return res, True


def licencia_ofl(archivo):
    return "SIL Open Font License 1.1" if archivo and archivo.startswith("OFL") else (archivo or "licencia sin identificar")


def escribir_creditos(proyecto, titulo, destino):
    creditos = leer_json(proyecto / "creditos.json", None)
    tiempos = leer_json(proyecto / "assets" / "tiempos.json", {})
    L = [f"# Créditos: {titulo}\n"]
    avisos = []
    # 1. Atribución obligatoria
    L.append("## Atribución obligatoria\n")
    exigen = [c for c in (creditos or []) if c.get("credito_necesario")]
    if exigen:
        L.append("Estas licencias piden crédito. Pega estas líneas en la descripción de cada publicación:\n")
        for c in exigen:
            L.append(f"- {c['credito']}")
        L.append("")
    elif creditos is None:
        L.append("No hay `creditos.json` en el proyecto. Si usaste imágenes o sonidos de terceros, falta anotar su origen y su licencia antes de publicar.\n")
        avisos.append("no hay creditos.json")
    else:
        L.append("Ningún material de `creditos.json` exige atribución.\n")
    # 2. Material con licencia
    if creditos:
        L.append("## Material de terceros\n")
        L.append("| Archivo | Licencia | Pide crédito | En el proyecto | Fuente |")
        L.append("|---|---|---|---|---|")
        for c in creditos:
            esta = (proyecto / c.get("archivo", "")).exists()
            if not esta:
                avisos.append(f"{c.get('archivo')} está en creditos.json pero no existe en el proyecto")
            L.append(f"| `{c.get('archivo', '?')}` | {str(c.get('licencia', '?')).upper()} | {'sí' if c.get('credito_necesario') else 'no'} | {'sí' if esta else '**no se encontró**'} | {c.get('fuente') or 'n/d'} |")
        L.append("")
        L.append("Línea completa de cada crédito:\n")
        for c in creditos:
            L.append(f"- {c.get('credito', c.get('archivo'))}")
        L.append("")
    # 3. Contenido generado
    L.append("## Contenido generado con IA o con código\n")
    generada = []
    voz_gen = bool(tiempos) and tiempos.get("motor") not in (None, "grabada") and (tiempos.get("motor") in MOTORES_GENERADOS or tiempos.get("motor"))
    if voz_gen:
        generada.append("voz")
        L.append(f"- **Voz generada** con el motor `{tiempos.get('motor')}`, voz `{tiempos.get('nombre_voz', 'n/d')}`. No es una persona hablando: Instagram, YouTube y TikTok piden declarar el contenido sintético.")
    elif tiempos:
        L.append(f"- Voz grabada (`{tiempos.get('nombre_voz', 'n/d')}`).")
    else:
        L.append("- No hay `assets/tiempos.json`: no se pudo saber de dónde viene la voz. Dilo en la entrega.")
        avisos.append("no hay assets/tiempos.json")
    musica_en_creditos = any("music" in str(c.get("archivo", "")).lower() or "audio" in str(c.get("archivo", "")).lower() for c in (creditos or []))
    if (proyecto / "assets" / "audio" / "rejilla.json").exists() and not musica_en_creditos:
        generada.append("música")
        L.append("- **Música compuesta con código** (`tools/audio/musica.py`): original, sin modelos ni muestras de terceros; también va como contenido generado.")
    fx = leer_json(proyecto / "efectos.json", [])
    if isinstance(fx, list) and any(isinstance(e, dict) and e.get("sonido") for e in fx):
        L.append("- Efectos sintetizados con código (`tools/audio/efecto.py`).")
    L.append("")
    if generada:
        L.append(f"Texto sugerido para la descripción: «Voz{' y música' if 'música' in generada else ''} generada{'s' if len(generada) > 1 else ''} con IA.»\n" if "voz" in generada else "Texto sugerido para la descripción: «Música generada con código.»\n")
    # 4. Fuentes
    L.append("## Tipografías\n")
    fam, hay_catalogo = familias_usadas(proyecto)
    if fam:
        L.append("| Familia | Licencia | Licencia incluida en el proyecto |")
        L.append("|---|---|---|")
        for f in fam:
            L.append(f"| {f['familia']} | {licencia_ofl(f['licencia_archivo'])} | {'sí' if f['licencia_en_proyecto'] else '**no**: copia el archivo de licencia junto a las fuentes'} |")
            if not f["licencia_en_proyecto"]:
                avisos.append(f"falta la licencia de {f['familia']} en assets/fonts/")
        L.append("")
        L.append("La SIL OFL 1.1 no pide crédito por el texto que se ve en un video. Pide que la licencia viaje con los archivos de fuente si los repartes.\n")
    elif hay_catalogo:
        L.append("No hay fuentes del catálogo en `assets/fonts/`. Si usaste otras, anota su licencia aquí.\n")
    else:
        L.append("No se encontró el catálogo de fuentes (`assets/fonts/fuentes.json`): anota a mano la licencia de cada tipografía.\n")
        avisos.append("sin catálogo de fuentes")
    L.append(f"_Generado por `tools/entrega.py` el {datetime.now().strftime('%Y-%m-%d')}. Revísalo antes de publicar: solo sabe lo que está en los archivos del proyecto._")
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")
    return {"exigen_atribucion": len(exigen), "generada": generada, "avisos": avisos}


# ------------------------------------------------------------------------------------------------------------------- informe


def fila(k, v):
    return f"| {k} | {v} |"


def escribir_informe(titulo, revision, rev_ruta, entrega, destino, creditos_info, vieja):
    L = [f"# Informe de entrega: {titulo}\n", f"Fecha: {datetime.now().strftime('%Y-%m-%d %H:%M')}. Nada se subió a ninguna parte.\n"]
    if revision is None:
        L.append("> **SIN REVISIÓN.** No existe `renders/revision/revision.json`. Corre `python ../.claqueta/tools/qa/revisar.py renders/final.mp4 --duracion SEGUNDOS` y vuelve a correr entrega.py. Sin eso, nada de lo de abajo está medido.\n")
    else:
        L.append(f"**Veredicto de la revisión: {'sin fallos' if revision.get('ok') else 'CON FALLOS: no entregar'}.** {len(revision.get('fallos', []))} fallo(s), {len(revision.get('avisos', []))} aviso(s). Fuente: `{rev_ruta}`.\n")
        if vieja:
            L.append("> La revisión es más vieja que el video: puede que el video cambiara después. Vuelve a correr revisar.py.\n")
    L.append("## Archivos\n")
    L.append("| Archivo | Tamaño |")
    L.append("|---|---|")
    for v in entrega["archivos"].values():
        f = Path(v)
        if f.name == "INFORME.md":
            L.append(f"| `{f.name}` | este archivo |")
        elif f.exists():
            L.append(f"| `{f.name}` | {mb(f)} MB |" if f.suffix in (".mp4", ".jpg") else f"| `{f.name}` | |")
    if not entrega["archivos"].get("liviano"):
        L.append("\nNo hay copia liviana: el máster pesa menos del límite.")
    L.append("")
    if revision:
        m = revision.get("medido", {})
        t = m.get("tecnica", {})
        im = m.get("imagen", {})
        so = m.get("sonido", {})
        L.append("## Lo medido\n")
        L.append("| Medida | Valor |")
        L.append("|---|---|")
        if t:
            L.append(fila("Formato", f"{t.get('ancho')}x{t.get('alto')} a {t.get('fps')} fps, {t.get('codec_video', t.get('video'))} {t.get('pix_fmt', t.get('pixeles'))}"))
            L.append(fila("Duración", f"{coma(t.get('duracion_s', 0), 2)} s"))
            L.append(fila("Volumen", f"{coma(t.get('lufs', 0), 1)} LUFS (objetivo -14), pico verdadero {coma(t.get('true_peak', 0), 1)} dBTP (máximo -1)"))
        if im:
            pc = im.get("primer_cuadro", {})
            L.append(fila("Primer cuadro", f"desviación {pc.get('desviacion')}, con imagen desde {pc.get('con_imagen_desde_s')} s"))
            pl = im.get("planos", {})
            L.append(fila("Planos", f"{pl.get('cantidad')} (entre {pl.get('mas_corto_s')} y {pl.get('mas_largo_s')} s, media {pl.get('duracion_media_s')} s)"))
            L.append(fila("Cambio en el primer segundo", im.get("cambio_primer_segundo")))
            L.append(fila("Cuadros negros / tramos vacíos / congelados", f"{im.get('cuadros_negros')} / {len(im.get('tramos_vacios', []))} / {len(im.get('tramos_congelados', []))}"))
            L.append(fila("Franjas casi vacías", len(im.get("franjas_casi_vacias", []))))
            if im.get("curva_texto"):
                L.append(fila("Curva de movimiento por segundo", f"`{im['curva_texto']}`"))
        if so:
            L.append(fila("Energía bajo 120 Hz", f"{so.get('energia_bajo_120hz_pct')} %"))
            L.append(fila("Silencios reales", f"{len(so.get('silencios_reales', []))} (se pedían {so.get('silencios_minimos', 0)})"))
            L.append(fila("Cola de silencio al final", f"{so.get('cola_de_silencio_s')} s"))
            L.append(fila("Clipping", f"{so.get('clipping', {}).get('tramos', 0)} tramo(s)"))
            v = so.get("voz_contra_musica")
            if v:
                L.append(fila("Voz sobre el fondo (estimado)", f"contraste {v.get('contraste_mediano_db')} dB, peor {v.get('peor_contraste_db')} dB en {v.get('peor_en_s')} s"))
            e = so.get("efectos")
            if e:
                L.append(fila("Efectos", f"{e.get('golpes')} golpes, máximo {e.get('maximo_en_1_s')} en 1 s, {len(e.get('sobre_una_palabra', []))} sobre una palabra"))
        vg = m.get("voz_contra_guion")
        if vg:
            L.append(fila("Voz contra el guion", f"{round(vg['coincidencia'] * 100)} % de coincidencia (Whisper {vg['modelo']})"))
        L.append("")
        for titulo_s, clave in (("Fallos", "fallos"), ("Avisos", "avisos")):
            if revision.get(clave):
                L.append(f"## {titulo_s}\n")
                for x in revision[clave]:
                    L.append(f"- {x}")
                L.append("")
        if revision.get("mirar"):
            L.append("## Momentos que se miraron\n")
            L.append("| Segundo | Razón | Imagen |")
            L.append("|---|---|---|")
            for x in revision["mirar"]:
                L.append(f"| {coma(x['segundo'], 1)} s | {x['razon']} | `{x.get('imagen') or 'n/d'}` |")
            L.append("")
        if revision.get("preguntas"):
            L.append("## Preguntas que solo un ojo responde\n")
            L.append("Una máquina no las puede juzgar. Responde cada una mirando las imágenes y escribe sí o no, con el segundo si es no:\n")
            for q in revision["preguntas"]:
                L.append(f"- [ ] {q}")
            L.append("")
    if creditos_info["generada"]:
        L.append("## Declaración de contenido generado\n")
        L.append(f"Este video lleva {' y '.join(creditos_info['generada'])} generada(s). Declara el contenido sintético al publicar en Instagram, YouTube y TikTok. Detalle en `CREDITOS.md`.\n")
    if creditos_info["exigen_atribucion"]:
        L.append(f"## Atribución\n\n{creditos_info['exigen_atribucion']} material(es) piden crédito: pega las líneas de `CREDITOS.md` en la descripción.\n")
    if creditos_info["avisos"]:
        L.append("## Avisos de créditos\n")
        for a in creditos_info["avisos"]:
            L.append(f"- {a}")
        L.append("")
    L.append("## Lo que no se pudo comprobar\n")
    fijos = ["Nadie oyó la mezcla: el sonido está medido (volumen, graves, silencios, voz contra el fondo), no escuchado. Que una persona la escuche antes de publicar.",
             "No se vio en un teléfono: el brillo, el negro cálido y el tamaño real de los textos solo se juzgan en uno."]
    for x in fijos:
        L.append(f"- {x}")
    extra = [x for x in (revision or {}).get("no_comprobado", []) if not x.lower().startswith(("nadie oyó", "no se vio en un teléfono"))]
    for x in extra:
        L.append(f"- {x[0].upper() + x[1:]}")
    L.append("")
    L.append("## Decisiones y excepciones\n")
    L.append("_Escribe aquí qué reglas del encargo no se pudieron cumplir y qué decidiste en su lugar, y por qué._\n")
    destino.write_text("\n".join(L) + "\n", encoding="utf-8")


# ------------------------------------------------------------------------------------------------------------------- main


def main():
    t0 = time.time()
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("video")
    p.add_argument("--titulo", required=True, help="Título de la pieza, para los documentos")
    p.add_argument("--portada", type=float, help="Segundo del cuadro de portada. Sin él se elige el mejor")
    p.add_argument("--salida", default="entrega")
    p.add_argument("--proyecto", default=".", help="Carpeta del proyecto (donde están assets/, creditos.json y renders/)")
    p.add_argument("--max-mb", type=float, default=30, help="Tamaño sobre el cual se hace la copia liviana")
    p.add_argument("--revision", default="renders/revision/revision.json")
    p.add_argument("--srt", help="Subtítulos. Por defecto renders/final.srt o un .srt junto al video")
    p.add_argument("--revisar", action="store_true", help="Correr tools/qa/revisar.py antes de armar la entrega")
    p.add_argument("--duracion", type=float, help="Con --revisar: duración esperada")
    p.add_argument("--ignorar", help="Con --revisar: banda de subtítulos, como 1300-1540")
    p.add_argument("--fondo-oscuro", action="store_true", help="Con --revisar: el fondo casi negro es parte del diseño")
    a = p.parse_args()

    video = Path(a.video)
    if not video.is_file() or video.stat().st_size == 0:
        sys.exit(f"Error: no existe o está vacío: {video}")
    proyecto = Path(a.proyecto)
    dur = duracion_de(video)
    carpeta = Path(a.salida)
    carpeta.mkdir(parents=True, exist_ok=True)
    rev_ruta = Path(a.revision)
    if not rev_ruta.is_absolute() and not rev_ruta.exists() and (proyecto / a.revision).exists():
        rev_ruta = proyecto / a.revision
    if a.revisar:
        cmd = [sys.executable, str(AQUI / "qa" / "revisar.py"), str(video), "--salida", str(rev_ruta.parent), "--proyecto", str(proyecto)]
        if a.duracion:
            cmd += ["--duracion", str(a.duracion)]
        if a.ignorar:
            cmd += ["--ignorar", a.ignorar]
        if a.fondo_oscuro:
            cmd += ["--fondo-oscuro"]
        r = correr(cmd)
        if not rev_ruta.exists():
            sys.exit(f"Error: revisar.py no dejó {rev_ruta}: {(r.stderr or r.stdout).strip()[-300:]}")
    revision = leer_json(rev_ruta, None) if rev_ruta.exists() else None
    vieja = bool(revision) and rev_ruta.stat().st_mtime < video.stat().st_mtime - 1

    archivos = {}
    master = carpeta / "master.mp4"
    shutil.copy2(video, master)
    archivos["master"] = master.as_posix()
    tamano = mb(master)
    lite = None
    if master.stat().st_size > a.max_mb * 1048576:
        destino = carpeta / "liviano.mp4"
        lite = liviano(master, destino, a.max_mb, dur)
        lite["megabytes"] = mb(destino)
        archivos["liviano"] = destino.as_posix()
    # Portada
    fronteras = []
    if revision:
        fronteras = [pl["inicio"] for pl in revision.get("medido", {}).get("imagen", {}).get("planos", {}).get("planos", [])[1:]]
    cand = [] if a.portada is not None else candidatas(video, dur, fronteras)
    t_portada = a.portada if a.portada is not None else (cand[0]["segundo"] if cand else min(1.0, dur / 2))
    if not 0 <= t_portada < dur:
        sys.exit(f"Error: --portada {t_portada} está fuera de la duración ({dur:.1f} s)")
    portada = carpeta / "portada.jpg"
    if not sacar_cuadro(video, t_portada, portada):
        sys.exit("Error: no se pudo sacar la portada")
    archivos["portada"] = portada.as_posix()
    # Subtítulos
    srt = Path(a.srt) if a.srt else next((c for c in (proyecto / "renders" / "final.srt", video.with_suffix(".srt"), Path("renders/final.srt")) if c.is_file()), None)
    if srt and srt.is_file():
        shutil.copy2(srt, carpeta / "final.srt")
        archivos["srt"] = (carpeta / "final.srt").as_posix()
    elif srt_de_tiempos(proyecto / "assets" / "tiempos.json", carpeta / "final.srt"):
        archivos["srt"] = (carpeta / "final.srt").as_posix()
    # Créditos e informe
    info = escribir_creditos(proyecto, a.titulo, carpeta / "CREDITOS.md")
    archivos["creditos"] = (carpeta / "CREDITOS.md").as_posix()
    entrega = {"carpeta": carpeta.as_posix(), "archivos": {**archivos, "informe": (carpeta / "INFORME.md").as_posix()}}
    escribir_informe(a.titulo, revision, rev_ruta.as_posix(), entrega, carpeta / "INFORME.md", info, vieja)
    archivos["informe"] = (carpeta / "INFORME.md").as_posix()
    fallos = (revision or {}).get("fallos", [])
    ok = revision is not None and revision.get("ok", False) and not vieja
    salida = {
        "ok": ok, "carpeta": carpeta.as_posix(), "archivos": archivos, "master_mb": tamano, "liviano": lite,
        "portada": {"segundo": round(float(t_portada), 2), "elegida_por": "indicada" if a.portada is not None else "nitidez y contraste", "otras_candidatas": cand[1:4]},
        "revision": {"hay": revision is not None, "ok": (revision or {}).get("ok"), "fallos": fallos, "avisos": len((revision or {}).get("avisos", [])), "mas_vieja_que_el_video": vieja},
        "creditos": info, "nada_se_subio": True, "tiempo_s": round(time.time() - t0, 1),
    }
    if not ok:
        salida["aviso"] = "No entregues todavía: " + ("no hay revisión; corre tools/qa/revisar.py" if revision is None else "la revisión es más vieja que el video" if vieja else f"la revisión tiene {len(fallos)} fallo(s)")
    print(json.dumps(salida, ensure_ascii=False, indent=1))
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
