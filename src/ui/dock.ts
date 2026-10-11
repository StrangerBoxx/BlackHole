// Dock de mejoras: barra de vidrio abajo con 5 mejoras + "Más" (Combo, Gravedad, Dron en una bandeja).
// Comprar es un toque. El estado de cada botón se actualiza cuando cambia el progreso (no en cada cuadro).
import { getBalance } from "../core/Balance";
import { EVENTOS_GLOBALES } from "../core/estilo";
import { progreso } from "../core/Progreso";
import type { IdMejora, Mejora } from "../logica/balance";
import { costoMejora, describirMejora, estadisticas, estaAlMaximo } from "../logica/mejoras";
import { formatearNumero } from "../logica/monedas";
import { mostrarBurbuja } from "./burbuja";
import type { Interfaz } from "./interfaz";

/** Mantener presionado este tiempo muestra la ayuda (y ese toque ya no compra). */
const MS_MANTENER = 450;

/** Las del dock, en orden. El resto va en la bandeja "Más". */
const EN_DOCK: IdMejora[] = ["pull", "force", "size", "spawn", "value"];

/** Ícono de cada mejora (public/assets/ui/<nombre>.svg). */
const ICONOS: Record<IdMejora, string> = {
  pull: "atraccion",
  force: "fuerza",
  size: "tamano",
  spawn: "aparicion",
  value: "valor",
  combo: "combo",
  gravity: "gravedad",
  drone: "dron",
};

export interface BotonDock {
  mejora: Mejora;
  el: HTMLButtonElement;
  actualizar(): void;
}

/** Compra un nivel y avisa (o devuelve false si no alcanza). */
export function comprarMejora(ui: Interfaz, m: Mejora): boolean {
  const r = progreso.comprar(getBalance(), m.id);
  if (!r.comprado) return false;
  const ev = ui.game.events;
  if (r.nuevosObjetos.length > 0) {
    const nuevo = r.nuevosObjetos[r.nuevosObjetos.length - 1];
    ev.emit(EVENTOS_GLOBALES.AVISO, `¡Nuevo objeto: ${nuevo.nombre}!`, 3);
    ev.emit(EVENTOS_GLOBALES.DESBLOQUEO, r.nuevosObjetos);
  } else {
    ev.emit(EVENTOS_GLOBALES.AVISO, `${m.nombre} nivel ${r.nivel}`, 1.6);
    ev.emit(EVENTOS_GLOBALES.COMPRA, m.id, r.nivel);
  }
  return true;
}

function crearBoton(ui: Interfaz, m: Mejora): BotonDock {
  const el = document.createElement("button");
  el.className = "mejora";
  el.innerHTML = `
    <span class="nivel"></span>
    <img class="icono" src="assets/ui/${ICONOS[m.id]}.svg" alt="">
    <span class="nombre">${m.nombre}</span>
    <span class="costo"><img src="assets/img/moneda.png" alt=""><span class="valor"></span></span>`;
  const nivel = el.querySelector(".nivel") as HTMLElement;
  const valor = el.querySelector(".valor") as HTMLElement;
  const chip = el.querySelector(".costo img") as HTMLElement;

  const actualizar = () => {
    const n = progreso.niveles[m.id];
    const max = estaAlMaximo(m, n);
    const costo = costoMejora(m, n);
    nivel.textContent = max ? "Máx" : `Nv ${n}`;
    valor.textContent = max ? "—" : formatearNumero(costo);
    chip.style.display = max ? "none" : "";
    el.classList.toggle("alcanza", !max && progreso.monedas >= costo);
    el.classList.toggle("falta", !max && progreso.monedas < costo);
    el.classList.toggle("maximo", max);
  };

  /** "Atracción → Radio de atracción: 111 px" (lo que da el siguiente nivel). */
  const ayuda = () => {
    const n = progreso.niveles[m.id];
    const max = estaAlMaximo(m, n);
    const s = estadisticas(getBalance(), { ...progreso.niveles, [m.id]: max ? n : n + 1 });
    mostrarBurbuja(ui, el, `<b>${m.nombre}</b> → ${describirMejora(m.id, s)}${max ? " (máximo)" : ""}`);
  };

  // Mantener presionado (dedo) → ayuda, y ese toque no compra
  let espera = 0;
  let fueAyuda = false;
  el.addEventListener("pointerdown", (e) => {
    fueAyuda = false;
    if (e.pointerType === "mouse") return;
    espera = window.setTimeout(() => {
      fueAyuda = true;
      ayuda();
    }, MS_MANTENER);
  });
  const cancelar = () => clearTimeout(espera);
  el.addEventListener("pointerup", cancelar);
  el.addEventListener("pointerleave", cancelar);
  el.addEventListener("pointercancel", cancelar);
  el.addEventListener("contextmenu", (e) => e.preventDefault()); // sin menú del navegador al mantener
  // Pasar el mouse (PC) → ayuda
  el.addEventListener("pointerenter", (e) => {
    if (e.pointerType === "mouse") ayuda();
  });

  el.addEventListener("click", () => {
    if (fueAyuda) {
      fueAyuda = false;
      return;
    }
    el.classList.add("apretado");
    setTimeout(() => el.classList.remove("apretado"), 120);
    const n = progreso.niveles[m.id];
    if (estaAlMaximo(m, n)) {
      mostrarBurbuja(ui, el, `<b>${m.nombre}</b> ya está al máximo`);
      return;
    }
    if (!comprarMejora(ui, m)) {
      const falta = costoMejora(m, n) - progreso.monedas;
      mostrarBurbuja(ui, el, `Te faltan <b>${formatearNumero(falta)}</b> chips`, true);
    }
  });
  return { mejora: m, el, actualizar };
}

/** Arma el dock y la bandeja "Más". Devuelve los botones (los usa la burbuja de ayuda). */
export function crearDock(ui: Interfaz): BotonDock[] {
  const b = getBalance();
  const dock = document.createElement("nav");
  dock.className = "dock vidrio";
  dock.setAttribute("aria-label", "Mejoras");
  const bandeja = document.createElement("div");
  bandeja.className = "bandeja vidrio";
  bandeja.hidden = true;

  const botones = b.mejoras.map((m) => crearBoton(ui, m));
  for (const bt of botones) (EN_DOCK.includes(bt.mejora.id) ? dock : bandeja).append(bt.el);

  // "Más": abre/cierra la bandeja con las mejoras que no caben
  const mas = document.createElement("button");
  mas.className = "mejora mas";
  mas.innerHTML = `<img class="icono" src="assets/ui/mas.svg" alt=""><span class="nombre">Más</span><span class="costo"></span>`;
  dock.append(mas);
  const enBandeja = botones.filter((bt) => !EN_DOCK.includes(bt.mejora.id));
  mas.addEventListener("click", () => {
    bandeja.hidden = !bandeja.hidden;
    mas.classList.toggle("abierto", !bandeja.hidden);
    ubicarBandeja();
  });
  // Cerrar la bandeja al tocar fuera
  document.addEventListener("pointerdown", (e) => {
    const t = e.target as Node;
    if (!bandeja.hidden && !bandeja.contains(t) && !mas.contains(t)) {
      bandeja.hidden = true;
      mas.classList.remove("abierto");
    }
  });

  const actualizar = () => {
    for (const bt of botones) bt.actualizar();
    // "Más" se marca si algo de la bandeja se puede comprar
    mas.classList.toggle("alcanza", enBandeja.some((bt) => bt.el.classList.contains("alcanza")));
  };
  progreso.alCambiar(actualizar);
  actualizar();

  ui.raiz.append(bandeja, dock);
  // La bandeja va justo encima del dock. Se calcula al abrirla (y al cambiar el tamaño):
  // si se calculara con el dock escondido (pantalla de inicio) quedaría fuera de la pantalla.
  function ubicarBandeja() {
    const caja = dock.getBoundingClientRect();
    if (caja.height === 0) return; // el dock no se ve: se ubica cuando se abra
    const raiz = ui.raiz.getBoundingClientRect();
    bandeja.style.bottom = `${raiz.bottom - caja.top + 8}px`;
  }
  ui.raiz.addEventListener("acomodar", ubicarBandeja);
  return botones;
}
