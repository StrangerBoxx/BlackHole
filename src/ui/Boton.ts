import Phaser from "phaser";
import { COLOR, FUENTE_TEXTO, hex } from "../core/estilo";

export interface OpcionesBoton {
  ancho: number;
  alto: number;
  texto: string;
  tamano?: number;
  fondo?: string;
  borde?: string;
  colorTexto?: string;
  fuente?: string;
}

/** Botón redondeado con texto. Se aprieta (se achica) y llama a `alTocar` al soltar. */
export class Boton extends Phaser.GameObjects.Container {
  private readonly fondo: Phaser.GameObjects.Graphics;
  readonly etiqueta: Phaser.GameObjects.Text;
  private op: Required<OpcionesBoton>;
  private activo = true;

  constructor(scene: Phaser.Scene, x: number, y: number, opciones: OpcionesBoton, alTocar: () => void) {
    super(scene, x, y);
    this.op = {
      tamano: 20,
      fondo: COLOR.tierra2,
      borde: COLOR.linea,
      colorTexto: COLOR.texto,
      fuente: FUENTE_TEXTO,
      ...opciones,
    };
    this.fondo = scene.add.graphics();
    this.etiqueta = scene.add
      .text(0, 0, this.op.texto, { fontFamily: this.op.fuente, fontSize: `${this.op.tamano}px`, fontStyle: "800", color: this.op.colorTexto, align: "center" })
      .setOrigin(0.5);
    this.add([this.fondo, this.etiqueta]);
    scene.add.existing(this);
    this.setInteractive(new Phaser.Geom.Rectangle(-this.op.ancho / 2, -this.op.alto / 2, this.op.ancho, this.op.alto), Phaser.Geom.Rectangle.Contains);
    this.on(Phaser.Input.Events.POINTER_DOWN, () => this.activo && this.setScale(0.96));
    this.on(Phaser.Input.Events.POINTER_OUT, () => this.setScale(1));
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      this.setScale(1);
      if (this.activo) alTocar();
    });
    this.dibujar();
  }

  private dibujar(): void {
    const { ancho, alto, fondo, borde } = this.op;
    const g = this.fondo;
    g.clear();
    g.fillStyle(hex(fondo), 1).fillRoundedRect(-ancho / 2, -alto / 2, ancho, alto, Math.min(14, alto / 2));
    g.lineStyle(2, hex(borde), 1).strokeRoundedRect(-ancho / 2, -alto / 2, ancho, alto, Math.min(14, alto / 2));
    this.etiqueta.setScale(Math.min(1, (ancho - 16) / Math.max(1, this.etiqueta.width)));
  }

  setTexto(texto: string): this {
    this.etiqueta.setText(texto);
    this.dibujar();
    return this;
  }

  /** Cambia colores (por ejemplo, borde dorado cuando hay algo para cobrar). */
  setColores(c: { fondo?: string; borde?: string; colorTexto?: string }): this {
    this.op = { ...this.op, ...c };
    if (c.colorTexto) this.etiqueta.setColor(c.colorTexto);
    this.dibujar();
    return this;
  }

  setActivo(activo: boolean): this {
    this.activo = activo;
    this.setAlpha(activo ? 1 : 0.45);
    return this;
  }

  setTamano(ancho: number, alto: number): this {
    this.op = { ...this.op, ancho, alto };
    (this.input!.hitArea as Phaser.Geom.Rectangle).setTo(-ancho / 2, -alto / 2, ancho, alto);
    this.dibujar();
    return this;
  }
}
