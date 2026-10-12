import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { debug } from "../core/Debug";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TEXTO, FUENTE_TITULO, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import type { IdEspecial, IdMejora } from "../logica/balance";
import { metaHambre } from "../logica/hambre";
import type { JuegoScene } from "./JuegoScene";

const ESQUINA = 90; // px de la esquina superior izquierda donde cuentan los 3 toques
const TOQUES = 3;
const VENTANA_TOQUES_MS = 1000;
const ANCHO_PANEL = 560;

interface Fila {
  texto: Phaser.GameObjects.Text;
  actualizar: () => void;
}

/**
 * Panel de debug (solo en desarrollo). Se abre con F1 o con 3 toques rápidos
 * en la esquina superior izquierda de la pantalla (sobre el título, que deja pasar los toques).
 */
export class DebugScene extends Phaser.Scene {
  private panel: Phaser.GameObjects.Container | null = null;
  private filas: Fila[] = [];
  private toques: number[] = [];

  constructor() {
    super("Debug");
  }

  create(): void {
    this.input.keyboard?.on("keydown-F1", (e: KeyboardEvent) => {
      e.preventDefault();
      this.alternar();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (p.x > ESQUINA || p.y > ESQUINA) return;
      const ahora = performance.now();
      this.toques = [...this.toques.filter((t) => ahora - t < VENTANA_TOQUES_MS), ahora];
      if (this.toques.length >= TOQUES) {
        this.toques = [];
        this.alternar();
      }
    });
    const dejar = progreso.alCambiar(() => this.actualizar());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, dejar);
  }

  private alternar(): void {
    if (this.panel) {
      this.panel.destroy();
      this.panel = null;
      this.filas = [];
    } else {
      this.crearPanel();
    }
  }

  private crearPanel(): void {
    const b = getBalance();
    const { width, height } = this.scale.gameSize;
    const items: Phaser.GameObjects.GameObject[] = [];
    let y = 20;
    const izq = 20;

    const titulo = this.add.text(izq, y, "DEBUG", { fontFamily: FUENTE_TITULO, fontSize: "30px", color: COLOR.acento });
    items.push(titulo);
    y += 50;

    const boton = (x: number, yy: number, ancho: number, etiqueta: string, accion: () => void) => {
      const fondo = this.add
        .rectangle(x, yy, ancho, 44, hex(COLOR.boton))
        .setOrigin(0)
        .setStrokeStyle(1.5, hex(COLOR.linea))
        .setInteractive({ useHandCursor: true })
        .on(Phaser.Input.Events.POINTER_UP, () => {
          accion();
          this.actualizar();
        });
      const texto = this.add
        .text(x + ancho / 2, yy + 22, etiqueta, { fontFamily: FUENTE_TEXTO, fontSize: "19px", fontStyle: "800", color: COLOR.texto })
        .setOrigin(0.5);
      items.push(fondo, texto);
      return texto;
    };
    const anchoUtil = ANCHO_PANEL - 2 * izq;

    boton(izq, y, anchoUtil / 2 - 4, "+1000 chips", () => progreso.agregarMonedas(1000));
    boton(izq + anchoUtil / 2 + 4, y, anchoUtil / 2 - 4, "+100 000", () => progreso.agregarMonedas(100000));
    y += 56;

    // Mejoras en 2 columnas: nombre nivel [−][+]
    const anchoCol = (anchoUtil - 12) / 2;
    b.mejoras.forEach((m, i) => {
      const x = izq + (i % 2) * (anchoCol + 12);
      const yy = y + Math.floor(i / 2) * 50;
      const etiqueta = this.add
        .text(x, yy + 22, "", { fontFamily: FUENTE_TEXTO, fontSize: "17px", fontStyle: "600", color: COLOR.texto })
        .setOrigin(0, 0.5);
      items.push(etiqueta);
      const id: IdMejora = m.id;
      this.filas.push({ texto: etiqueta, actualizar: () => etiqueta.setText(`${m.nombre} ${progreso.niveles[id]}/${m.max}`) });
      boton(x + anchoCol - 92, yy, 44, "−", () => progreso.cambiarNivel(b, id, -1));
      boton(x + anchoCol - 44, yy, 44, "+", () => progreso.cambiarNivel(b, id, +1));
    });
    y += Math.ceil(b.mejoras.length / 2) * 50 + 8;

    // Cosas nuevas: especiales, hambre, zonas, materia oscura
    const juego = () => this.scene.get("Juego") as JuegoScene;
    const especial = (id: IdEspecial) => () => juego().aparecerObjeto(true, id);
    const pares: [string, () => void][] = [
      ["Sacar dorado", especial("dorado")],
      ["Sacar pesado", especial("pesado")],
      ["Sacar bomba", especial("bomba")],
      ["Hambre llena", () => progreso.ponerHambre(metaHambre(b.hambre, progreso.jefes))],
      ["+10 materia oscura", () => progreso.agregarMateria(10)],
      [
        "Zona siguiente",
        () => {
          progreso.irAZona(b, (progreso.zona + 1) % b.zonas.length);
          this.game.events.emit(EVENTOS_GLOBALES.REINICIO);
        },
      ],
    ];
    pares.forEach(([texto, accion], i) => {
      boton(izq + (i % 2) * (anchoCol + 12), y + Math.floor(i / 2) * 52, anchoCol, texto, accion);
    });
    y += Math.ceil(pares.length / 2) * 52 + 6;

    const circulos = boton(izq, y, anchoUtil, "", () => (debug.mostrarCirculos = !debug.mostrarCirculos));
    this.filas.push({ texto: circulos, actualizar: () => circulos.setText(`Círculos de choque: ${debug.mostrarCirculos ? "sí" : "no"}`) });
    y += 52;
    const velocidad = boton(izq, y, anchoUtil, "", () => (debug.velocidad = debug.velocidad === 1 ? 2 : 1));
    this.filas.push({ texto: velocidad, actualizar: () => velocidad.setText(`Velocidad: x${debug.velocidad}`) });
    y += 52;
    boton(izq, y, anchoUtil, "Reiniciar progreso", () => {
      progreso.reiniciar();
      this.game.events.emit(EVENTOS_GLOBALES.REINICIO);
    });
    y += 52;
    boton(izq, y, anchoUtil, "Cerrar (F1)", () => this.alternar());
    y += 64;

    const fondo = this.add
      .rectangle(0, 0, ANCHO_PANEL, y, hex(COLOR.panel), 0.94)
      .setOrigin(0)
      .setStrokeStyle(2, hex(COLOR.acento))
      .setInteractive(); // atrapa los toques: no se arrastran objetos a través del panel
    this.panel = this.add.container((width - ANCHO_PANEL) / 2, Math.max(10, (height - y) / 2), [fondo, ...items]);
    this.actualizar();
  }

  private actualizar(): void {
    for (const f of this.filas) f.actualizar();
  }
}
