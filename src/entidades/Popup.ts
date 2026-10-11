import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { COLOR, FUENTE_TITULO } from "../core/estilo";

const PROF_POPUP = 40;

/** El "+N" con una moneda que sube y se desvanece sobre el hoyo. */
export function mostrarPopupMonedas(scene: Phaser.Scene, x: number, y: number, texto: string): void {
  const v = getBalance().visual;
  const t = scene.add
    .text(0, 0, texto, {
      fontFamily: FUENTE_TITULO,
      fontSize: "36px",
      color: COLOR.oro,
      stroke: COLOR.contornoOro,
      strokeThickness: 5,
    })
    .setOrigin(0, 0.5);
  const moneda = scene.add.image(0, 0, "moneda").setDisplaySize(v.monedaPopup, v.monedaPopup);
  // Moneda a la izquierda del texto, todo centrado en x
  const espacio = 6;
  const ancho = v.monedaPopup + espacio + t.width;
  moneda.setPosition(-ancho / 2 + v.monedaPopup / 2, 0);
  t.setPosition(-ancho / 2 + v.monedaPopup + espacio, 0);

  const grupo = scene.add.container(x, y, [moneda, t]).setDepth(PROF_POPUP);
  scene.tweens.add({
    targets: grupo,
    y: y - v.popupSubida * v.popupSegundos,
    alpha: 0,
    duration: v.popupSegundos * 1000,
    onComplete: () => grupo.destroy(),
  });
}
