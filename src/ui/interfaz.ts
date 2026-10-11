// Interfaz en HTML encima del juego (el vidrio con desenfoque solo se puede hacer así):
// marcador arriba, menú desplegable (Misiones · Álbum · Colapso), tuerca de Configuración y avisos.
// El dock de mejoras vive en dock.ts. Todo se alinea con el canvas y escala con su ancho.
import Phaser from "phaser";
import "./interfaz.css";
import { getBalance } from "../core/Balance";
import { EVENTOS_GLOBALES } from "../core/estilo";
import { ANCHO_BASE } from "../core/pantalla";
import { progreso } from "../core/Progreso";
import { getSonido } from "../core/Sonido";
import { fichasDeZona } from "../logica/album";
import { puedeColapsar } from "../logica/colapso";
import { misionCumplida } from "../logica/misiones";
import { formatearNumero } from "../logica/monedas";
import { formatearDuracion } from "../logica/offline";
import { zonaDe } from "../logica/objetos";
import { crearDock } from "./dock";

/** Altura (en px del juego) donde van los avisos: debajo del marcador, lejos del dock. */
const Y_AVISOS = 160;

const icono = (nombre: string) => `assets/ui/${nombre}.svg`;

function el<K extends keyof HTMLElementTagNameMap>(tag: K, clase?: string, html?: string): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (clase) e.className = clase;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

/** La raíz de la interfaz (para que el dock y la burbuja se agreguen ahí). */
export interface Interfaz {
  raiz: HTMLElement;
  game: Phaser.Game;
  /** Muestra un aviso arriba durante `segundos`. */
  aviso(texto: string, segundos: number): void;
}

let unica: Interfaz | null = null;

export function iniciarInterfaz(game: Phaser.Game): Interfaz {
  if (unica) return unica;
  const raiz = document.getElementById("ui") ?? document.body.appendChild(el("div"));
  raiz.id = "ui";

  // ---------- Marcador
  const marcador = el("header", "marcador");
  marcador.append(el("div", "titulo", "BLACK <span>HOLE</span>"));
  const derecha = el("div", "derecha");
  const pastilla = el("div", "pastilla vidrio");
  pastilla.append(Object.assign(el("img"), { src: "assets/img/moneda.png", alt: "" }));
  const chips = el("span", "chips", "0");
  pastilla.append(chips);
  const botonMenu = el("button", "redondo vidrio", `<img src="${icono("menu")}" alt=""><span class="punto"></span>`);
  botonMenu.setAttribute("aria-label", "Menú");
  botonMenu.title = "Menú";
  const botonAjustes = el("button", "redondo vidrio", `<img src="${icono("configuracion")}" alt="">`);
  botonAjustes.setAttribute("aria-label", "Configuración");
  botonAjustes.title = "Configuración";
  derecha.append(pastilla, botonMenu, botonAjustes);
  marcador.append(derecha);

  // ---------- Menú desplegable: Misiones · Álbum · Colapso
  const desplegable = el("div", "desplegable");
  desplegable.hidden = true;
  const abrirPanel = (pestana: string) => {
    cerrarTodo();
    if (!game.scene.isActive("Panel")) game.scene.start("Panel", { pestana });
  };
  const itemMenu = (pestana: string, titulo: string) => {
    const b = el("button", "item", `<img src="${icono(pestana)}" alt=""><span class="etiqueta">${titulo}</span><span class="meta"></span>`);
    b.addEventListener("click", () => abrirPanel(pestana));
    desplegable.append(b);
    return b.querySelector(".meta") as HTMLElement;
  };
  const metaMisiones = itemMenu("misiones", "Misiones");
  const metaAlbum = itemMenu("album", "Álbum");
  const metaColapso = itemMenu("colapso", "Colapso");
  botonMenu.addEventListener("click", () => {
    const abrir = desplegable.hidden;
    cerrarTodo();
    desplegable.hidden = !abrir;
  });

  // ---------- Configuración (tuerca)
  const opciones = el("div", "opciones");
  opciones.hidden = true;
  const tituloConfig = el("div", "titulo-panel", "Configuración");
  const dato = el("div", "dato");
  const bSonido = el("button");
  const bReiniciar = el("button", "peligro");
  opciones.append(tituloConfig, dato, bSonido, bReiniciar);
  const textoSonido = () => `Sonido: ${getSonido()?.activo === false ? "no" : "sí"}`;
  bSonido.addEventListener("click", () => {
    getSonido()?.alternar();
    bSonido.textContent = textoSonido();
  });
  let armado = 0;
  const desarmar = () => {
    clearTimeout(armado);
    armado = 0;
    bReiniciar.textContent = "Reiniciar progreso";
  };
  bReiniciar.addEventListener("click", () => {
    if (!armado) {
      bReiniciar.textContent = "¿Borrar todo? Toca otra vez";
      armado = window.setTimeout(desarmar, 3000);
      return;
    }
    desarmar();
    cerrarTodo();
    progreso.reiniciar();
    game.events.emit(EVENTOS_GLOBALES.REINICIO);
    aviso("Progreso reiniciado", 2);
  });
  function cerrarOpciones() {
    opciones.hidden = true;
    desarmar();
  }
  /** Cierra el menú desplegable y la configuración (solo uno puede estar abierto). */
  function cerrarTodo() {
    cerrarOpciones();
    desplegable.hidden = true;
  }
  botonAjustes.addEventListener("click", () => {
    if (!opciones.hidden) return cerrarOpciones();
    cerrarTodo();
    bSonido.textContent = textoSonido();
    opciones.hidden = false;
  });
  // Se cierran al tocar el campo de juego (o cualquier cosa fuera de ellos)
  document.addEventListener("pointerdown", (e) => {
    const t = e.target as Node;
    if (!opciones.hidden && !opciones.contains(t) && !botonAjustes.contains(t)) cerrarOpciones();
    if (!desplegable.hidden && !desplegable.contains(t) && !botonMenu.contains(t)) desplegable.hidden = true;
  });

  // ---------- Avisos
  const avisos = el("div", "avisos");
  function aviso(texto: string, segundos: number) {
    const a = el("div", "aviso");
    a.textContent = texto;
    avisos.prepend(a);
    while (avisos.children.length > 2) avisos.lastElementChild!.remove();
    setTimeout(() => {
      a.classList.add("saliendo");
      setTimeout(() => a.remove(), 400);
    }, segundos * 1000);
  }
  game.events.on(EVENTOS_GLOBALES.AVISO, aviso);

  raiz.append(marcador, desplegable, opciones, avisos);
  unica = { raiz, game, aviso };

  // ---------- Dock de mejoras (abajo)
  crearDock(unica);

  // ---------- Datos que cambian
  const actualizar = () => {
    const b = getBalance();
    const e = progreso.exportar();
    chips.textContent = formatearNumero(progreso.monedas);
    const zona = zonaDe(b, progreso.zona);
    const tragados = progreso.total === 1 ? "1 objeto tragado" : `${formatearNumero(progreso.total)} objetos tragados`;
    dato.innerHTML = `<b>${tragados}</b><br>${zona.nombre}${progreso.materiaOscura > 0 ? ` · ${formatearNumero(progreso.materiaOscura)} materia oscura` : ""}`;
    const porCobrar = progreso.misiones.filter(misionCumplida).length;
    const colapsoListo = puedeColapsar(b, e);
    metaMisiones.textContent = porCobrar ? `${porCobrar} por cobrar` : "";
    metaAlbum.textContent = `${progreso.fichasAlbum(zona.id).length}/${fichasDeZona(zona).length}`;
    metaColapso.textContent = colapsoListo ? "¡Listo!" : "";
    // Puntito naranja en el botón del menú si hay algo esperando
    botonMenu.classList.toggle("pendiente", porCobrar > 0 || colapsoListo);
  };
  progreso.alCambiar(actualizar);
  actualizar();

  // ---------- Mensajes al empezar (zona nueva, ganancia offline, primera vez)
  game.events.on(EVENTOS_GLOBALES.JUEGO_LISTO, () => {
    const reg = game.registry;
    const inicial = reg.get("avisoInicial") as string | undefined;
    const offline = reg.get("offline") as { segundos: number; monedas: number } | undefined;
    if (inicial) {
      reg.remove("avisoInicial");
      aviso(inicial, 4);
    } else if (offline && offline.monedas > 0) {
      reg.remove("offline");
      aviso(`Mientras no estabas (${formatearDuracion(offline.segundos)}), tu dron juntó +${formatearNumero(offline.monedas)} chips`, 5);
    } else if (progreso.total === 0) aviso("Arrastra un objeto y lánzalo al agujero", 4);
  });

  // Mientras el panel (Misiones/Álbum/Colapso) está abierto, la interfaz se esconde
  game.events.on(EVENTOS_GLOBALES.PANEL, (abierto: boolean) => {
    raiz.classList.toggle("oculto", abierto);
    if (abierto) cerrarTodo();
  });

  // ---------- Alinear con el canvas y escalar
  const acomodar = () => {
    const r = game.canvas.getBoundingClientRect();
    Object.assign(raiz.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const escala = r.width / ANCHO_BASE;
    raiz.style.setProperty("--e", String(escala));
    const bajoMarcador = marcador.getBoundingClientRect().bottom - r.top + 8;
    desplegable.style.top = `${bajoMarcador}px`;
    opciones.style.top = `${bajoMarcador}px`;
    avisos.style.top = `${Math.max(bajoMarcador, Y_AVISOS * escala)}px`;
    raiz.dispatchEvent(new Event("acomodar"));
  };
  game.scale.on(Phaser.Scale.Events.RESIZE, () => requestAnimationFrame(acomodar));
  window.addEventListener("resize", () => requestAnimationFrame(acomodar));
  document.fonts?.ready.then(() => acomodar());
  acomodar();
  return unica;
}
