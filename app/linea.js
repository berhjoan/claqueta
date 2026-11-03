// Línea de tiempo: planos con duración proporcional, arrastrar para ordenar, borde para cambiar duración, inspector del plano.
import { estado, cambiarPlano, moverPlano, agregarPlano, quitarPlano, rehacerPlanos } from "./estado.js";
import { opcion } from "./catalogo.js";
import { movimientos } from "../data/camara.js";
import { transiciones } from "../data/montaje.js";
import { tiempo, duracionPlanos } from "./planos.js";
import { h } from "./vistas.js";

export class LineaTiempo {
  constructor(raiz, { alBuscar }) {
    this.raiz = raiz;
    this.alBuscar = alBuscar;
    this.sel = null;
    this.regla = h("div", { class: "regla", "aria-hidden": "true" });
    this.pista = h("div", { class: "pista", role: "list", "aria-label": "Planos del video" });
    this.cabezal = h("div", { class: "cabezal", "aria-hidden": "true" });
    this.zona = h("div", { class: "zona-tiempo" }, this.regla, this.pista, this.cabezal);
    this.inspector = h("div", { class: "inspector" });
    this.resumen = h("span", { class: "linea-res" });
    const barra = h("div", { class: "linea-barra" },
      h("b", {}, "Planos"), this.resumen,
      h("button", { type: "button", class: "bt-mini", onclick: () => { const id = agregarPlano(this.sel ?? estado.planos[estado.planos.length - 1].id); this.sel = id; this.pintar(); } }, "Agregar plano"),
      h("button", { type: "button", class: "bt-mini", title: "Vuelve a repartir los planos según estructura, ritmo y duración", onclick: () => { this.sel = null; rehacerPlanos(); } }, "Repartir de nuevo"));
    this.raiz.append(barra, this.zona, this.inspector);
    this.zona.addEventListener("pointerdown", (e) => {
      if (e.target.closest(".plano")) return;
      this.buscarEn(e);
    });
  }

  buscarEn(e) {
    const r = this.zona.getBoundingClientRect();
    this.alBuscar(((e.clientX - r.left) / r.width) * duracionPlanos(estado.planos));
  }

  pintar() {
    const planos = estado.planos, total = duracionPlanos(planos);
    this.resumen.textContent = `${planos.length} planos, ${tiempo(total)}${estado.planosManuales ? ", editados a mano" : ""}`;
    this.regla.replaceChildren();
    const paso = total <= 20 ? 2 : total <= 60 ? 5 : total <= 180 ? 15 : total <= 400 ? 30 : 60;
    for (let s = 0; s < total; s += paso) {
      const m = h("span", {}, `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`);
      m.style.left = `${(s / total) * 100}%`;
      this.regla.append(m);
    }
    this.pista.replaceChildren();
    planos.forEach((p, i) => {
      const cam = opcion("camara", "movs", p.cam);
      const el = h("button", { type: "button", class: "plano", role: "listitem", draggable: false, "aria-current": String(this.sel === p.id), title: `${p.titulo}: ${p.dur} s` , onclick: (e) => { if (this.arrastrado) return; this.sel = this.sel === p.id ? null : p.id; this.pintar(); } },
        h("b", {}, String(i + 1)), h("span", {}, p.titulo), h("small", {}, cam ? cam.n[0] : p.cam));
      el.style.flexGrow = String(p.dur);
      el.style.flexBasis = "0";
      el.addEventListener("pointerdown", (e) => this.iniciarArrastre(e, i, el));
      if (i < planos.length - 1) {
        const borde = h("span", { class: "borde", title: "Arrastra para cambiar la duración" });
        borde.addEventListener("pointerdown", (e) => this.iniciarDuracion(e, i));
        el.append(borde);
      }
      this.pista.append(el);
    });
    this.pintarInspector();
  }

  iniciarDuracion(e, i) {
    e.stopPropagation(); e.preventDefault();
    const planos = estado.planos, ancho = this.pista.getBoundingClientRect().width, total = duracionPlanos(planos);
    const x0 = e.clientX, a0 = planos[i].dur, b0 = planos[i + 1].dur;
    const mover = (ev) => {
      const ds = ((ev.clientX - x0) / ancho) * total;
      const a = Math.max(0.3, Math.min(a0 + b0 - 0.3, a0 + ds));
      planos[i].dur = Math.round(a * 10) / 10;
      planos[i + 1].dur = Math.round((a0 + b0 - planos[i].dur) * 10) / 10;
      const hijos = this.pista.children;
      hijos[i].style.flexGrow = String(planos[i].dur);
      hijos[i + 1].style.flexGrow = String(planos[i + 1].dur);
    };
    const soltar = () => {
      removeEventListener("pointermove", mover); removeEventListener("pointerup", soltar);
      cambiarPlano(planos[i].id, { dur: planos[i].dur });
      this.pintar();
    };
    addEventListener("pointermove", mover); addEventListener("pointerup", soltar);
  }

  iniciarArrastre(e, i, el) {
    if (e.target.classList.contains("borde")) return;
    const x0 = e.clientX;
    this.arrastrado = false;
    const mover = (ev) => {
      if (Math.abs(ev.clientX - x0) < 8) return;
      this.arrastrado = true;
      el.classList.add("moviendo");
      const destino = [...this.pista.children].findIndex((n) => { const r = n.getBoundingClientRect(); return ev.clientX >= r.left && ev.clientX < r.right; });
      for (const n of this.pista.children) n.classList.remove("destino");
      if (destino >= 0 && destino !== i) this.pista.children[destino].classList.add("destino");
      this.destino = destino;
    };
    const soltar = () => {
      removeEventListener("pointermove", mover); removeEventListener("pointerup", soltar);
      if (this.arrastrado && this.destino >= 0 && this.destino !== i) moverPlano(i, this.destino);
      el.classList.remove("moviendo");
      setTimeout(() => { this.arrastrado = false; }, 0);
      this.destino = -1;
    };
    addEventListener("pointermove", mover); addEventListener("pointerup", soltar);
  }

  pintarInspector() {
    const p = estado.planos.find((x) => x.id === this.sel);
    this.inspector.hidden = !p;
    this.raiz.classList.toggle("con-inspector", Boolean(p));
    if (!p) return;
    const campo = (rotulo, control) => h("label", {}, rotulo, control);
    const i = estado.planos.indexOf(p);
    this.inspector.replaceChildren(
      campo("Parte", h("input", { class: "campo", type: "text", value: p.titulo, oninput: (e) => { cambiarPlano(p.id, { titulo: e.target.value }); this.pista.children[i].querySelector("span").textContent = e.target.value; } })),
      campo("Texto en pantalla", h("input", { class: "campo ancho", type: "text", value: p.texto ?? "", placeholder: "Literal, en español. Vacío: según el guion", oninput: (e) => cambiarPlano(p.id, { texto: e.target.value }) })),
      campo("Cámara", h("select", { class: "campo", onchange: (e) => { cambiarPlano(p.id, { cam: e.target.value }); this.pintar(); } }, movimientos.map((m) => h("option", { value: m.id, selected: p.cam === m.id }, m.n[0])))),
      campo("Sale con", h("select", { class: "campo", onchange: (e) => cambiarPlano(p.id, { tr: e.target.value }) }, transiciones.map((m) => h("option", { value: m.id, selected: p.tr === m.id }, m.n[0])))),
      campo("Duración", h("input", { class: "campo corto", type: "number", min: 0.3, step: 0.1, value: p.dur, onchange: (e) => { cambiarPlano(p.id, { dur: Math.max(0.3, Number(e.target.value) || p.dur) }); this.pintar(); } })),
      campo("Nota", h("input", { class: "campo", type: "text", value: p.nota ?? "", placeholder: "Opcional", oninput: (e) => cambiarPlano(p.id, { nota: e.target.value }) })),
      h("button", { type: "button", class: "bt-mini peligro", onclick: () => { quitarPlano(p.id); this.sel = null; this.pintar(); } }, "Quitar"),
    );
  }

  moverCabezal(t) {
    const total = duracionPlanos(estado.planos) || 1;
    this.cabezal.style.left = `${(t / total) * 100}%`;
  }
}
