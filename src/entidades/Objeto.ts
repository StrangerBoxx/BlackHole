import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { texturaObjeto } from "../core/assets";
import type { TipoObjeto } from "../logica/balance";
import { crearCuerpo, type Cuerpo } from "../logica/fisica";

const PROF_SOMBRA = 10;
const PROF_OBJETO = 20;
const PROF_AGARRADO = 30;

/**
 * Un objeto del pasto: imagen + sombra + cuerpo físico.
 * La física está en `cuerpo` (lógica pura); aquí solo se dibuja.
 */
export class Objeto {
  readonly cuerpo: Cuerpo;
  readonly tipo: TipoObjeto;
  /** 0 → 1 al aparecer, 1 → 0 al caer al hoyo. */
  escalaAnim: number;
  /** Segundos que lleva cayendo al hoyo. */
  tiempoCaida = 0;
  private readonly imagen: Phaser.GameObjects.Image;
  private readonly sombra: Phaser.GameObjects.Ellipse;
  /** Escala para que el círculo de choque del PNG (240 de 256 px) mida 2r en pantalla. */
  private readonly escalaBase: number;

  constructor(scene: Phaser.Scene, tipo: TipoObjeto, x: number, y: number, aparecerDeAPoco: boolean) {
    const v = getBalance().visual;
    this.tipo = tipo;
    this.cuerpo = crearCuerpo(x, y, tipo.r, Math.random() * Math.PI * 2);
    this.escalaAnim = aparecerDeAPoco ? 0 : 1;

    const s = v.sombra;
    this.sombra = scene.add
      .ellipse(x, y, tipo.r * 2 * (tipo.sombraAncho ?? 1), tipo.r * 2 * s.alto, Phaser.Display.Color.HexStringToColor(s.color).color, s.opacidad)
      .setDepth(PROF_SOMBRA);

    this.imagen = scene.add.image(x, y, texturaObjeto(tipo.id)).setDepth(PROF_OBJETO);
    // Se calcula con el ancho real del PNG: si cambias la imagen por otra de otro tamaño, igual calza.
    const anchoDeseado = tipo.r * 2 * (v.objetoImagenPx / v.objetoCirculoPx);
    this.escalaBase = anchoDeseado / this.imagen.width;

    this.sincronizar();
  }

  /** Copia posición, giro y tamaño del cuerpo a la imagen. */
  sincronizar(): void {
    const c = this.cuerpo;
    const b = getBalance();
    const sombra = b.visual.sombra;
    const k = this.escalaAnim * (c.arrastrado ? b.lanzamiento.escalaAgarrado : 1);
    this.imagen.setPosition(c.x, c.y).setRotation(c.angulo).setScale(this.escalaBase * k);
    this.imagen.setDepth(c.arrastrado ? PROF_AGARRADO : PROF_OBJETO);
    this.sombra.setPosition(c.x + sombra.dx, c.y + sombra.dy).setScale(this.escalaAnim);
    const visible = this.escalaAnim > 0;
    this.imagen.setVisible(visible);
    this.sombra.setVisible(visible);
  }

  destruir(): void {
    this.imagen.destroy();
    this.sombra.destroy();
  }
}
