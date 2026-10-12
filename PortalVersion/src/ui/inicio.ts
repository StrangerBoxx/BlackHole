// Pantalla de inicio (HTML encima de InicioScene): título, Jugar, Logros y Configuración.
import { getBalance } from "../core/Balance";
import { progreso } from "../core/Progreso";
import { avanceLogro } from "../logica/logros";
import { formatearNumero } from "../logica/monedas";
import { crearConfiguracion, type Interfaz } from "./interfaz";

const TROFEO = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4"/><path d="M12 13v4M8.5 20h7M10 17h4"/></svg>`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/** Arma la pantalla de inicio. `alJugar` pasa al juego. */
export function crearInicio(ui: Interfaz, alJugar: () => void): void {
  const inicio = el("div", "inicio");
  const logo = el("h1", "logo", "BLACK<span>HOLE</span>");
  const lema = el("p", "lema", "Lánzalo todo al agujero");
  const botones = el("div", "botones-inicio");
  const bJugar = el("button", "boton-inicio principal", `<img src="assets/ui/jugar.svg" alt=""><span>Jugar</span>`);
  const bLogros = el("button", "boton-inicio vidrio", `<img src="assets/ui/logros.svg" alt=""><span>Logros</span><span class="meta"></span>`);
  const bConfig = el("button", "boton-inicio vidrio", `<img src="assets/ui/configuracion.svg" alt=""><span>Configuración</span>`);
  botones.append(bJugar, bLogros, bConfig);
  inicio.append(logo, lema, botones);

  // ---------- Hoja (ventana) para Logros y Configuración
  const fondoHoja = el("div", "fondo-hoja");
  fondoHoja.hidden = true;
  const hoja = el("div", "hoja");
  const tituloHoja = el("div", "titulo-panel");
  const cuerpo = el("div", "cuerpo-hoja");
  const volver = el("button", "boton-inicio vidrio volver", "<span>Volver</span>");
  hoja.append(tituloHoja, cuerpo, volver);
  fondoHoja.append(hoja);
  inicio.append(fondoHoja);
  const cerrarHoja = () => (fondoHoja.hidden = true);
  volver.addEventListener("click", cerrarHoja);
  fondoHoja.addEventListener("click", (e) => {
    if (e.target === fondoHoja) cerrarHoja();
  });

  const mostrarLogros = () => {
    const b = getBalance();
    const e = progreso.exportar();
    tituloHoja.textContent = `Logros · ${e.logros.length}/${b.logros.length}`;
    cuerpo.innerHTML = "";
    for (const d of b.logros) {
      const hecho = e.logros.includes(d.id);
      const { valor, meta } = avanceLogro(b, d, e);
      const fila = el("div", `logro${hecho ? " hecho" : ""}`);
      fila.innerHTML = `
        <span class="trofeo">${TROFEO}</span>
        <span class="texto-logro"><b>${d.nombre}</b><span>${d.descripcion}</span>
          <span class="barra"><span style="width:${(100 * valor) / meta}%"></span></span></span>
        <span class="cuenta">${hecho ? "✓" : `${formatearNumero(valor)}/${formatearNumero(meta)}`}</span>`;
      cuerpo.append(fila);
    }
    fondoHoja.hidden = false;
    cuerpo.scrollTop = 0;
  };

  const mostrarConfig = () => {
    tituloHoja.textContent = "Configuración";
    cuerpo.innerHTML = "";
    cuerpo.append(crearConfiguracion(ui, { alReiniciar: cerrarHoja }));
    fondoHoja.hidden = false;
  };

  bJugar.addEventListener("click", alJugar);
  bLogros.addEventListener("click", mostrarLogros);
  bConfig.addEventListener("click", mostrarConfig);

  const actualizar = () => {
    const b = getBalance();
    (bLogros.querySelector(".meta") as HTMLElement).textContent = `${progreso.logros.length}/${b.logros.length}`;
    (bJugar.querySelector("span") as HTMLElement).textContent = progreso.total > 0 ? "Continuar" : "Jugar";
  };
  progreso.alCambiar(actualizar);
  actualizar();

  ui.raiz.append(inicio);
  ui.raiz.addEventListener("modo", () => cerrarHoja());
}
