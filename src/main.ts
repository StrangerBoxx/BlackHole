import "@fontsource/lilita-one/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-800.css";
import Phaser from "phaser";
import { ALTO_BASE, ANCHO_BASE } from "./core/pantalla";
import { progreso } from "./core/Progreso";
import { CargaScene } from "./escenas/CargaScene";
import { HudScene } from "./escenas/HudScene";
import { JuegoScene } from "./escenas/JuegoScene";
import { PanelScene } from "./escenas/PanelScene";
import "./escenas/PestanaColapso";

// Tamaño base: 720 de ancho; alto = barra + mundo 960 + tienda. Phaser lo escala para llenar la pantalla
// (Scale.EXPAND = como stretch "canvas_items" + aspect "expand" de Godot).
const juego = new Phaser.Game({
  type: Phaser.AUTO, // WebGL y, si no hay, Canvas
  parent: "juego",
  backgroundColor: "#1d1712",
  width: ANCHO_BASE,
  height: ALTO_BASE,
  scale: {
    mode: Phaser.Scale.EXPAND,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [CargaScene, JuegoScene, HudScene, PanelScene],
});

// Solo en desarrollo: acceso desde la consola del navegador para revisar el estado
if (import.meta.env.DEV) {
  Object.assign(window, { juego, progreso });
  // Panel de debug: solo en desarrollo (no entra en la versión final)
  import("./escenas/DebugScene").then(({ DebugScene }) => juego.scene.add("Debug", DebugScene, true));
}
