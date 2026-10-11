import Phaser from "phaser";
import { getBalance } from "./Balance";

/**
 * Con Scale.EXPAND la pantalla puede ser más alta o más ancha que 720x960.
 * Movemos la cámara para que el mundo de 720x960 quede siempre al centro.
 */
export function centrarMundo(scene: Phaser.Scene): void {
  const { ancho, alto } = getBalance().mundo;
  const ajustar = () => {
    const { width, height } = scene.scale.gameSize;
    scene.cameras.main.setScroll(-(width - ancho) / 2, -(height - alto) / 2);
  };
  ajustar();
  scene.scale.on(Phaser.Scale.Events.RESIZE, ajustar);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, ajustar));
}
