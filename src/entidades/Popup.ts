import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { COLOR, FUENTE_TITULO } from "../core/estilo";

const PROF_POPUP = 40;

/** Texto que sube y se desvanece (tiros especiales, avisos sobre el hoyo). */
export function mostrarTextoFlotante(scene: Phaser.Scene, x: number, y: number, texto: string, color: string): void {
  const v = getBalance().visual;
  const t = scene.add
    .text(x, y, texto, { fontFamily: FUENTE_TITULO, fontSize: "30px", color, stroke: COLOR.contornoOro, strokeThickness: 5 })
    .setOrigin(0.5)
    .setDepth(PROF_POPUP);
  scene.tweens.add({
    targets: t,
    y: y - v.popupSubida * v.popupSegundos * 1.3,
    alpha: 0,
    duration: v.popupSegundos * 1300,
    onComplete: () => t.destroy(),
  });
}

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
