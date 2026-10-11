import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { debug } from "../core/Debug";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TEXTO, FUENTE_TITULO, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import type { IdMejora } from "../logica/balance";

const ESQUINA = 90; // px de la esquina superior derecha donde cuentan los 3 toques
const TOQUES = 3;
const VENTANA_TOQUES_MS = 1000;
const ANCHO_PANEL = 440;

interface Fila {
  texto: Phaser.GameObjects.Text;
  actualizar: () => void;
}

/**
 * Panel de debug (solo en desarrollo). Se abre con F1 o con 3 toques rápidos
 * en la esquina superior derecha de la pantalla.
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
      if (p.x < this.scale.gameSize.width - ESQUINA || p.y > ESQUINA) return;
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
        .rectangle(x, yy, ancho, 44, hex(COLOR.tierra2))
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

    boton(izq, y, anchoUtil / 2 - 4, "+1000 monedas", () => progreso.agregarMonedas(1000));
    boton(izq + anchoUtil / 2 + 4, y, anchoUtil / 2 - 4, "+100 000", () => progreso.agregarMonedas(100000));
    y += 56;

    for (const m of b.mejoras) {
      const etiqueta = this.add
        .text(izq, y + 22, "", { fontFamily: FUENTE_TEXTO, fontSize: "19px", fontStyle: "600", color: COLOR.texto })
        .setOrigin(0, 0.5);
      items.push(etiqueta);
      const id: IdMejora = m.id;
      this.filas.push({ texto: etiqueta, actualizar: () => etiqueta.setText(`${m.nombre}: ${progreso.niveles[id]} / ${m.max}`) });
      boton(izq + anchoUtil - 108, y, 50, "−", () => progreso.cambiarNivel(b, id, -1));
      boton(izq + anchoUtil - 50, y, 50, "+", () => progreso.cambiarNivel(b, id, +1));
      y += 52;
    }
    y += 6;

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
      .rectangle(0, 0, ANCHO_PANEL, y, hex(COLOR.tierra), 0.94)
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
