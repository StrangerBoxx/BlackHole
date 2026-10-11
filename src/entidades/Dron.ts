import Phaser from "phaser";
import { getBalance } from "../core/Balance";

const PROF_DRON = 35;

/**
 * El dron: da vueltas alrededor del hoyo y, cuando le toca, vuela hasta un objeto,
 * lo empuja (eso lo decide la escena en `alLlegar`) y vuelve a su órbita.
 */
export class Dron {
  ocupado = false;
  private readonly imagen: Phaser.GameObjects.Image;
  private angulo = 0;
  private tiempo = 0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly centro: { x: number; y: number; inclinacion: number },
  ) {
    const d = getBalance().dron;
    this.imagen = scene.add.image(centro.x + d.orbita, centro.y, "dron").setDepth(PROF_DRON).setVisible(false);
    this.imagen.setScale(d.tamano / this.imagen.width);
  }

  private posicionOrbita(): { x: number; y: number } {
    const d = getBalance().dron;
    return {
      x: this.centro.x + Math.cos(this.angulo) * d.orbita,
      y: this.centro.y + Math.sin(this.angulo) * d.orbita * this.centro.inclinacion,
    };
  }

  /** Cada cuadro: gira en órbita (si no está volando) y se mece un poco. */
  actualizar(dt: number, activo: boolean): void {
    this.imagen.setVisible(activo);
    if (!activo) return;
    const d = getBalance().dron;
    this.tiempo += dt;
    this.imagen.setRotation(Math.sin(this.tiempo * 3) * 0.12);
    if (this.ocupado) return;
    this.angulo += dt * d.giroOrbita;
    const p = this.posicionOrbita();
    this.imagen.setPosition(p.x, p.y);
  }

  /** Vuela hasta (x, y), llama a `alLlegar` y vuelve a la órbita. */
  volarA(x: number, y: number, alLlegar: () => void): void {
    if (this.ocupado) return;
    this.ocupado = true;
    const ms = getBalance().dron.vueloSegundos * 1000;
    this.scene.tweens.add({
      targets: this.imagen,
      x,
      y,
      duration: ms,
      ease: "Sine.easeInOut",
      onComplete: () => {
        alLlegar();
        const vuelta = this.posicionOrbita();
        this.scene.tweens.add({
          targets: this.imagen,
          x: vuelta.x,
          y: vuelta.y,
          duration: ms,
          ease: "Sine.easeInOut",
          onComplete: () => (this.ocupado = false),
        });
      },
    });
  }
}
