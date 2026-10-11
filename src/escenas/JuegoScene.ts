import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { centrarMundo } from "../core/pantalla";

/** El campo de juego: pasto, hoyo y objetos. */
export class JuegoScene extends Phaser.Scene {
  constructor() {
    super("Juego");
  }

  create(): void {
    const { ancho, alto } = getBalance().mundo;
    centrarMundo(this);
    this.add.image(0, 0, "suelo").setOrigin(0).setDisplaySize(ancho, alto);
  }
}
