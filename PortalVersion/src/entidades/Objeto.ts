import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { texturaObjeto } from "../core/assets";
import type { IdEspecial, TipoObjeto } from "../logica/balance";
import { crearCuerpo, type Cuerpo } from "../logica/fisica";
import { tiroQuieto, type EstadoTiro, type IdTiro } from "../logica/tiros";

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
  /** Cómo fue lanzado (para los tiros especiales). */
  tiro: EstadoTiro = tiroQuieto();
  /** Tiros especiales logrados al entrar al hoyo. */
  tirosLogrados: IdTiro[] = [];
  readonly especial: IdEspecial | null;
  private readonly imagen: Phaser.GameObjects.Image;
  private readonly sombra: Phaser.GameObjects.Ellipse;
  /** Anillo del especial: brillo dorado o anillo del pesado. */
  private readonly aura: Phaser.GameObjects.Arc | null = null;
  /** Capa dorada encima de la imagen (se ve dorado aunque el dibujo sea oscuro). */
  private readonly brillo: Phaser.GameObjects.Image | null = null;
  /** Escala para que el círculo de choque del PNG (240 de 256 px) mida 2r en pantalla. */
  private readonly escalaBase: number;

  constructor(
    scene: Phaser.Scene,
    tipo: TipoObjeto,
    x: number,
    y: number,
    aparecerDeAPoco: boolean,
    especial: IdEspecial | null = null,
  ) {
    const b = getBalance();
    const v = b.visual;
    this.tipo = tipo;
    this.especial = especial;
    this.cuerpo = crearCuerpo(x, y, tipo.r, Math.random() * Math.PI * 2);
    this.escalaAnim = aparecerDeAPoco ? 0 : 1;
    if (especial === "pesado") {
      this.cuerpo.peso = b.especiales.pesado.peso;
      this.cuerpo.agarrable = false;
    }

    const s = v.sombra;
    this.sombra = scene.add
      .ellipse(x, y, tipo.r * 2 * (tipo.sombraAncho ?? 1), tipo.r * 2 * s.alto, Phaser.Display.Color.HexStringToColor(s.color).color, s.opacidad)
      .setDepth(PROF_SOMBRA);

    this.imagen = scene.add.image(x, y, texturaObjeto(tipo.id)).setDepth(PROF_OBJETO);
    // Se calcula con el ancho real del PNG: si cambias la imagen por otra de otro tamaño, igual calza.
    const anchoDeseado = tipo.r * 2 * (v.objetoImagenPx / v.objetoCirculoPx);
    this.escalaBase = anchoDeseado / this.imagen.width;

    const color = (h: string) => Phaser.Display.Color.HexStringToColor(h).color;
    if (especial === "dorado") {
      this.brillo = scene.add.image(x, y, texturaObjeto(tipo.id)).setTintFill(color(b.especiales.dorado.color)).setDepth(PROF_OBJETO);
      this.aura = scene.add.circle(x, y, tipo.r * 1.25).setStrokeStyle(5, color(b.especiales.dorado.color)).setDepth(PROF_SOMBRA + 1);
    } else if (especial === "pesado") {
      this.imagen.setTint(color(b.especiales.pesado.color));
      this.aura = scene.add.circle(x, y, tipo.r * 1.08).setStrokeStyle(7, 0x3a3e48, 0.9).setDepth(PROF_OBJETO + 1);
    }

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

    const t = this.imagen.scene.time.now / 1000;
    if (this.aura) {
      this.aura.setPosition(c.x, c.y).setScale(this.escalaAnim).setVisible(visible);
      if (this.especial === "dorado") this.aura.setAlpha(0.45 + 0.4 * Math.sin(t * 6));
    }
    if (this.brillo) {
      this.brillo
        .setPosition(c.x, c.y)
        .setRotation(c.angulo)
        .setScale(this.escalaBase * k)
        .setVisible(visible)
        .setDepth(this.imagen.depth + 0.5)
        .setAlpha(0.5 + 0.2 * Math.sin(t * 6));
    }
    // La bomba late (la mecha está por explotar)
    if (this.especial === "bomba") this.imagen.setScale(this.escalaBase * k * (1 + 0.06 * Math.sin(t * 12)));
  }

  destruir(): void {
    this.imagen.destroy();
    this.sombra.destroy();
    this.aura?.destroy();
    this.brillo?.destroy();
  }
}
