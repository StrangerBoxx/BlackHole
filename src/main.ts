import "@fontsource/ibm-plex-sans/latin-500.css";
import "@fontsource/ibm-plex-sans/latin-600.css";
import "@fontsource/ibm-plex-sans/latin-700.css";
import "@fontsource/rajdhani/latin-600.css";
import "@fontsource/rajdhani/latin-700.css";
import Phaser from "phaser";
import { altoInicial, ANCHO_BASE, seguirTamanoVentana } from "./core/pantalla";
import { progreso } from "./core/Progreso";
import { CargaScene } from "./escenas/CargaScene";
import { HudScene } from "./escenas/HudScene";
import { JuegoScene } from "./escenas/JuegoScene";
import { PanelScene } from "./escenas/PanelScene";
import "./escenas/PestanaColapso";

// Pantalla completa: 720 de ancho y el alto según la forma de la pantalla (960 a 1600).
// Scale.FIT lo agranda o achica sin deformarlo; la interfaz va encima.
const juego = new Phaser.Game({
  type: Phaser.AUTO, // WebGL y, si no hay, Canvas
  parent: "juego",
  backgroundColor: "#e3e8eb",
  width: ANCHO_BASE,
  height: altoInicial(),
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  input: { activePointers: 2 },
  scene: [CargaScene, JuegoScene, HudScene, PanelScene],
});

seguirTamanoVentana(juego);

// Solo en desarrollo: acceso desde la consola del navegador para revisar el estado
if (import.meta.env.DEV) {
  Object.assign(window, { juego, progreso });
  // Panel de debug: solo en desarrollo (no entra en la versión final)
  import("./escenas/DebugScene").then(({ DebugScene }) => juego.scene.add("Debug", DebugScene, true));
}
