import Phaser from "phaser";
import { getBalance } from "./Balance";

// Reparto de la pantalla (de arriba a abajo): barra del HUD, el pasto (mundo) y la tienda.
export const ALTO_BARRA_HUD = 84;
export const ALTO_BOTON_TIENDA = 112;
export const ESPACIO_TIENDA = 8;
export const ALTO_AYUDA_TIENDA = 34;
export const ALTO_TIENDA = ESPACIO_TIENDA * 2 + ALTO_BOTON_TIENDA + ALTO_AYUDA_TIENDA;

/** Tamaño base del juego: el mundo de 720x960 más la barra y la tienda. */
export const ANCHO_BASE = 720;
export const ALTO_BASE = ALTO_BARRA_HUD + 960 + ALTO_TIENDA;

/**
 * Con Scale.EXPAND la pantalla puede ser más alta o más ancha que el tamaño base.
 * Movemos la cámara para que el mundo quede centrado en el espacio libre entre la barra y la tienda.
 */
export function centrarMundo(scene: Phaser.Scene): void {
  const { ancho, alto } = getBalance().mundo;
  const ajustar = () => {
    const { width, height } = scene.scale.gameSize;
    const libre = height - ALTO_BARRA_HUD - ALTO_TIENDA;
    scene.cameras.main.setScroll(-(width - ancho) / 2, -(ALTO_BARRA_HUD + (libre - alto) / 2));
  };
  ajustar();
  scene.scale.on(Phaser.Scale.Events.RESIZE, ajustar);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => scene.scale.off(Phaser.Scale.Events.RESIZE, ajustar));
}
