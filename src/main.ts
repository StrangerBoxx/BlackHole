import Phaser from "phaser";
import { CargaScene } from "./escenas/CargaScene";
import { JuegoScene } from "./escenas/JuegoScene";

// El tamaño base es 720x960. Phaser lo escala para llenar la pantalla
// (Scale.EXPAND = como stretch "canvas_items" + aspect "expand" de Godot).
new Phaser.Game({
  type: Phaser.AUTO, // WebGL y, si no hay, Canvas
  parent: "juego",
  backgroundColor: "#1d1712",
  width: 720,
  height: 960,
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [CargaScene, JuegoScene],
});
