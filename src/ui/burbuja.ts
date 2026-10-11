// Burbuja de ayuda encima de un botón del dock. Desaparece sola.
import type { Interfaz } from "./interfaz";

const SEGUNDOS = 2;

let burbuja: HTMLDivElement | null = null;
let temporizador = 0;

/** Muestra `html` en una burbuja sobre `boton`. `falta` la pinta en naranja (no alcanzan los chips). */
export function mostrarBurbuja(ui: Interfaz, boton: HTMLElement, html: string, falta = false): void {
  if (!burbuja) {
    burbuja = document.createElement("div");
    burbuja.className = "burbuja";
    ui.raiz.append(burbuja);
  }
  burbuja.innerHTML = html;
  burbuja.classList.toggle("falta", falta);
  burbuja.hidden = false;
  const raiz = ui.raiz.getBoundingClientRect();
  const r = boton.getBoundingClientRect();
  // Centrada sobre el botón, sin salirse por los lados (se mide estando al medio, con todo el ancho disponible)
  burbuja.style.left = `${raiz.width / 2}px`;
  const ancho = burbuja.getBoundingClientRect().width;
  const x = Math.max(ancho / 2 + 8, Math.min(raiz.width - ancho / 2 - 8, r.left - raiz.left + r.width / 2));
  burbuja.style.left = `${x}px`;
  burbuja.style.top = `${r.top - raiz.top - 10}px`;
  clearTimeout(temporizador);
  temporizador = window.setTimeout(ocultarBurbuja, SEGUNDOS * 1000);
}

export function ocultarBurbuja(): void {
  if (burbuja) burbuja.hidden = true;
}
