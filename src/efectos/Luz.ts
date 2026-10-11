import Phaser from "phaser";
import { getBalance } from "../core/Balance";

const TEX_LUZ = "capa_luz";

/**
 * Capa de luz encima del mundo: luz cálida desde la izquierda, fría desde la derecha
 * y viñeta suave en las orillas. Se dibuja una vez con canvas (colores en balance.json → visual.luz).
 */
export function crearCapaLuz(scene: Phaser.Scene, profundidad: number, ancho: number, alto: number): Phaser.GameObjects.Image {
  const l = getBalance().visual.luz;
  const clave = `${TEX_LUZ}@${alto}`;
  if (!scene.textures.exists(clave)) {
    const tex = scene.textures.createCanvas(clave, ancho, alto)!;
    const ctx = tex.getContext();
    const rgba = (hex: string, a: number) => {
      const c = Phaser.Display.Color.HexStringToColor(hex);
      return `rgba(${c.red},${c.green},${c.blue},${a})`;
    };
    // Cálida (izquierda) → nada (centro) → fría (derecha)
    const lados = ctx.createLinearGradient(0, 0, ancho, 0);
    lados.addColorStop(0, rgba(l.calida, l.opacidadLados));
    lados.addColorStop(0.45, rgba(l.calida, 0));
    lados.addColorStop(0.55, rgba(l.fria, 0));
    lados.addColorStop(1, rgba(l.fria, l.opacidadLados));
    ctx.fillStyle = lados;
    ctx.fillRect(0, 0, ancho, alto);
    // Viñeta
    const vineta = ctx.createRadialGradient(ancho / 2, alto / 2, Math.min(ancho, alto) * 0.35, ancho / 2, alto / 2, Math.hypot(ancho, alto) / 2);
    vineta.addColorStop(0, rgba(l.vineta, 0));
    vineta.addColorStop(1, rgba(l.vineta, l.opacidadVineta));
    ctx.fillStyle = vineta;
    ctx.fillRect(0, 0, ancho, alto);
    tex.refresh();
  }
  return scene.add.image(0, 0, clave).setOrigin(0).setDepth(profundidad);
}
