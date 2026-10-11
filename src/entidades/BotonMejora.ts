import Phaser from "phaser";
import { COLOR, FUENTE_TEXTO, FUENTE_TITULO, hex } from "../core/estilo";
import type { Mejora } from "../logica/balance";
import { costoMejora, estaAlMaximo } from "../logica/mejoras";
import { formatearNumero } from "../logica/monedas";

/** Un botón de la tienda: nombre, nivel y costo. */
export class BotonMejora extends Phaser.GameObjects.Container {
  readonly mejora: Mejora;
  private readonly fondo: Phaser.GameObjects.Graphics;
  private readonly nombre: Phaser.GameObjects.Text;
  private readonly nivel: Phaser.GameObjects.Text;
  private readonly costo: Phaser.GameObjects.Text;
  private readonly moneda: Phaser.GameObjects.Image;
  private ancho = 100;
  private alto = 100;
  private sePuede = false;

  constructor(scene: Phaser.Scene, mejora: Mejora, alPresionar: () => void, alComprar: () => void) {
    super(scene);
    this.mejora = mejora;
    this.fondo = scene.add.graphics();
    this.nombre = scene.add
      .text(0, 0, mejora.nombre, { fontFamily: FUENTE_TEXTO, fontSize: "18px", fontStyle: "800", color: COLOR.texto })
      .setOrigin(0.5);
    this.nivel = scene.add
      .text(0, 0, "", { fontFamily: FUENTE_TEXTO, fontSize: "14px", fontStyle: "600", color: COLOR.apagado })
      .setOrigin(0.5);
    this.costo = scene.add
      .text(0, 0, "", { fontFamily: FUENTE_TITULO, fontSize: "23px", fontStyle: "700", color: COLOR.chip })
      .setOrigin(0, 0.5);
    this.moneda = scene.add.image(0, 0, "moneda").setDisplaySize(20, 20);
    this.add([this.fondo, this.nombre, this.nivel, this.moneda, this.costo]);
    scene.add.existing(this);

    this.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1, 1), Phaser.Geom.Rectangle.Contains);
    this.on(Phaser.Input.Events.POINTER_DOWN, () => {
      alPresionar();
      if (this.sePuede) this.setScale(0.95);
    });
    this.on(Phaser.Input.Events.POINTER_UP, () => {
      this.setScale(1);
      alComprar();
    });
    this.on(Phaser.Input.Events.POINTER_OUT, () => this.setScale(1));
  }

  /** Cambia el tamaño del botón (se llama al acomodar la pantalla). */
  medir(ancho: number, alto: number): void {
    this.ancho = ancho;
    this.alto = alto;
    // El área táctil va centrada en (0,0), como el dibujo
    const zona = this.input!.hitArea as Phaser.Geom.Rectangle;
    zona.setTo(-ancho / 2, -alto / 2, ancho, alto);
    this.nombre.setY(-alto / 2 + 17);
    this.nivel.setY(-alto / 2 + 37);
    this.costo.setY(alto / 2 - 18);
    this.moneda.setY(alto / 2 - 18);
    // Que el nombre quepa en botones angostos
    this.nombre.setScale(Math.min(1, (ancho - 10) / this.nombre.width));
  }

  /** Redibuja según el nivel y las monedas actuales. */
  actualizar(nivel: number, monedas: number): void {
    const max = estaAlMaximo(this.mejora, nivel);
    const c = costoMejora(this.mejora, nivel);
    this.sePuede = !max && monedas >= c;

    this.nivel.setText(max ? "Máximo" : `Nivel ${nivel}`);
    this.costo.setText(max ? "—" : formatearNumero(c));
    this.moneda.setVisible(!max);
    const anchoCosto = (max ? 0 : 20 + 5) + this.costo.width;
    this.moneda.setX(-anchoCosto / 2 + 10);
    this.costo.setX(-anchoCosto / 2 + (max ? 0 : 25));

    const g = this.fondo;
    g.clear();
    g.fillStyle(hex(COLOR.boton), 1);
    g.fillRoundedRect(-this.ancho / 2, -this.alto / 2, this.ancho, this.alto, 14);
    g.lineStyle(this.sePuede ? 2.5 : 1.5, hex(this.sePuede ? COLOR.chip : COLOR.linea), 1);
    g.strokeRoundedRect(-this.ancho / 2, -this.alto / 2, this.ancho, this.alto, 14);
    this.setAlpha(this.sePuede ? 1 : 0.55);
  }
}
