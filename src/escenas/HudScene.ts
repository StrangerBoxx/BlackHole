import Phaser from "phaser";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TITULO, FUENTE_TEXTO, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import { formatearNumero } from "../logica/monedas";

const ALTO_BARRA = 84;
const MARGEN = 20;

/**
 * Interfaz encima del juego: título, monedas y avisos.
 * Se ancla a los bordes de la pantalla (no del mundo), así en celulares altos usa el espacio extra.
 */
export class HudScene extends Phaser.Scene {
  private barra!: Phaser.GameObjects.Rectangle;
  private titulo!: Phaser.GameObjects.Text;
  private icono!: Phaser.GameObjects.Image;
  private monedas!: Phaser.GameObjects.Text;
  private detalle!: Phaser.GameObjects.Text;
  private aviso!: Phaser.GameObjects.Container;
  private avisoFondo!: Phaser.GameObjects.Graphics;
  private avisoTexto!: Phaser.GameObjects.Text;
  private avisoRestante = 0;

  constructor() {
    super("Hud");
  }

  create(): void {
    this.barra = this.add.rectangle(0, 0, 10, ALTO_BARRA, hex(COLOR.tierra), 0.78).setOrigin(0);
    const estiloTitulo = { fontFamily: FUENTE_TITULO, fontSize: "36px", color: COLOR.texto };
    this.titulo = this.add.text(MARGEN, ALTO_BARRA / 2, "Black ", estiloTitulo).setOrigin(0, 0.5);
    this.add
      .text(MARGEN + this.titulo.width, ALTO_BARRA / 2, "Hole", { ...estiloTitulo, color: COLOR.acento })
      .setOrigin(0, 0.5);

    this.monedas = this.add
      .text(0, 30, "0", { fontFamily: FUENTE_TITULO, fontSize: "40px", color: COLOR.oro })
      .setOrigin(1, 0.5);
    this.icono = this.add.image(0, 30, "moneda").setDisplaySize(32, 32);
    this.detalle = this.add
      .text(0, 62, "", { fontFamily: FUENTE_TEXTO, fontSize: "17px", color: COLOR.apagado, fontStyle: "600" })
      .setOrigin(1, 0.5);

    this.avisoFondo = this.add.graphics();
    this.avisoTexto = this.add
      .text(0, 0, "", { fontFamily: FUENTE_TITULO, fontSize: "30px", color: COLOR.texto, align: "center" })
      .setOrigin(0.5);
    this.aviso = this.add.container(0, 0, [this.avisoFondo, this.avisoTexto]).setAlpha(0);

    this.acomodar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.acomodar, this);

    this.actualizarMonedas();
    const dejar = progreso.alCambiar(() => this.actualizarMonedas());
    this.game.events.on(EVENTOS_GLOBALES.AVISO, this.mostrarAviso, this);

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      dejar();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.acomodar, this);
      this.game.events.off(EVENTOS_GLOBALES.AVISO, this.mostrarAviso, this);
    });

    if (progreso.total === 0) this.mostrarAviso("Arrastra un objeto y lánzalo al agujero", 4);
  }

  /** Ubica todo según el tamaño actual de la pantalla. */
  private acomodar(): void {
    const { width, height } = this.scale.gameSize;
    this.barra.width = width;
    this.monedas.setX(width - MARGEN);
    this.icono.setX(width - MARGEN - this.monedas.width - 22);
    this.detalle.setX(width - MARGEN);
    this.aviso.setPosition(width / 2, height - 52);
  }

  private actualizarMonedas(): void {
    this.monedas.setText(formatearNumero(progreso.monedas));
    this.detalle.setText(
      progreso.total === 0
        ? "Lanza objetos al hoyo"
        : progreso.total === 1
          ? "1 objeto tragado"
          : `${formatearNumero(progreso.total)} objetos tragados`,
    );
    this.icono.setX(this.scale.gameSize.width - MARGEN - this.monedas.width - 22);
  }

  /** Aviso abajo al centro durante `segundos` (se desvanece al final). */
  mostrarAviso(texto: string, segundos: number): void {
    const { width } = this.scale.gameSize;
    this.avisoTexto.setText(texto);
    const ancho = Math.min(width - 40, this.avisoTexto.width + 48);
    this.avisoTexto.setScale(Math.min(1, (ancho - 30) / this.avisoTexto.width));
    this.avisoFondo.clear();
    this.avisoFondo.fillStyle(hex(COLOR.tierra), 0.82);
    this.avisoFondo.fillRoundedRect(-ancho / 2, -26, ancho, 52, 26);
    this.avisoRestante = segundos;
  }

  update(_t: number, deltaMs: number): void {
    if (this.avisoRestante > 0) this.avisoRestante -= deltaMs / 1000;
    this.aviso.setAlpha(Math.max(0, Math.min(1, this.avisoRestante * 2)));
  }
}
