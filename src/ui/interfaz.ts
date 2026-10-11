// Interfaz en HTML encima del juego (el vidrio con desenfoque solo se puede hacer así):
// marcador arriba, ⚙ con opciones, botones de Misiones · Álbum · Colapso y avisos.
// El dock de mejoras vive en dock.ts. Todo se alinea con el canvas y escala con su ancho.
import Phaser from "phaser";
import "./interfaz.css";
import { getBalance } from "../core/Balance";
import { EVENTOS_GLOBALES } from "../core/estilo";
import { ANCHO_BASE } from "../core/pantalla";
import { progreso } from "../core/Progreso";
import { getSonido } from "../core/Sonido";
import { puedeColapsar } from "../logica/colapso";
import { misionCumplida } from "../logica/misiones";
import { formatearNumero } from "../logica/monedas";
import { formatearDuracion } from "../logica/offline";
import { zonaDe } from "../logica/objetos";

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
  const botonAjustes = el("button", "redondo vidrio", `<img src="${icono("ajustes")}" alt="">`);
  botonAjustes.setAttribute("aria-label", "Opciones");
  derecha.append(pastilla, botonAjustes);
  marcador.append(derecha);

  // ---------- Misiones · Álbum · Colapso (debajo del ⚙)
  const menuLado = el("div", "menu-lado");
  const abrirPanel = (pestana: string) => {
    cerrarOpciones();
    if (!game.scene.isActive("Panel")) game.scene.start("Panel", { pestana });
  };
  const botonMenu = (pestana: string, titulo: string) => {
    const b = el("button", "redondo vidrio", `<img src="${icono(pestana)}" alt=""><span class="punto"></span>`);
    b.setAttribute("aria-label", titulo);
    b.title = titulo;
    b.addEventListener("click", () => abrirPanel(pestana));
    menuLado.append(b);
    return b;
  };
  const bMisiones = botonMenu("misiones", "Misiones");
  const bAlbum = botonMenu("album", "Álbum");
  const bColapso = botonMenu("colapso", "Colapso");

  // ---------- Opciones (⚙)
  const opciones = el("div", "opciones");
  opciones.hidden = true;
  const dato = el("div", "dato");
  const bSonido = el("button");
  const bReiniciar = el("button", "peligro");
  opciones.append(dato, bSonido, bReiniciar);
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
    cerrarOpciones();
    progreso.reiniciar();
    game.events.emit(EVENTOS_GLOBALES.REINICIO);
    aviso("Progreso reiniciado", 2);
  });
  function cerrarOpciones() {
    opciones.hidden = true;
    desarmar();
  }
  botonAjustes.addEventListener("click", () => {
    if (!opciones.hidden) return cerrarOpciones();
    bSonido.textContent = textoSonido();
    desarmar();
    opciones.hidden = false;
  });
  // Se cierra al tocar el campo de juego (o cualquier cosa fuera del panelcito)
  document.addEventListener("pointerdown", (e) => {
    if (opciones.hidden) return;
    const t = e.target as Node;
    if (!opciones.contains(t) && !botonAjustes.contains(t)) cerrarOpciones();
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

  raiz.append(marcador, menuLado, opciones, avisos);
  unica = { raiz, game, aviso };

  // ---------- Datos que cambian
  const actualizar = () => {
    const b = getBalance();
    const e = progreso.exportar();
    chips.textContent = formatearNumero(progreso.monedas);
    const zona = zonaDe(b, progreso.zona);
    const tragados = progreso.total === 1 ? "1 objeto tragado" : `${formatearNumero(progreso.total)} objetos tragados`;
    dato.innerHTML = `<b>${tragados}</b><br>${zona.nombre}${progreso.materiaOscura > 0 ? ` · ${formatearNumero(progreso.materiaOscura)} materia oscura` : ""}`;
    bMisiones.classList.toggle("aviso", progreso.misiones.some(misionCumplida));
    bColapso.classList.toggle("aviso", puedeColapsar(b, e));
    bAlbum.classList.remove("aviso");
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
    if (abierto) cerrarOpciones();
  });

  // ---------- Alinear con el canvas y escalar
  const acomodar = () => {
    const r = game.canvas.getBoundingClientRect();
    Object.assign(raiz.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    const escala = r.width / ANCHO_BASE;
    raiz.style.setProperty("--e", String(escala));
    const bajoMarcador = marcador.getBoundingClientRect().bottom - r.top + 8;
    menuLado.style.top = `${bajoMarcador}px`;
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
