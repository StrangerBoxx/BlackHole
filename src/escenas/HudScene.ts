import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TITULO, FUENTE_TEXTO, hex } from "../core/estilo";
import { ALTO_AYUDA_TIENDA as ALTO_AYUDA, ALTO_BARRA_HUD as ALTO_BARRA, ALTO_BOTON_TIENDA as ALTO_BOTON,
  ALTO_TIENDA, ESPACIO_TIENDA as ESPACIO_BOTONES } from "../core/pantalla";
import { progreso } from "../core/Progreso";
import { getSonido } from "../core/Sonido";
import { BotonMejora } from "../entidades/BotonMejora";
import type { Mejora } from "../logica/balance";
import { describirMejora, estadisticas, estaAlMaximo } from "../logica/mejoras";
import { formatearNumero } from "../logica/monedas";

const MARGEN = 20;
const AYUDA_INICIAL = "Toca una mejora para comprarla";

/**
 * Interfaz encima del juego: título, monedas, avisos y tienda de mejoras.
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
  private fondoTienda!: Phaser.GameObjects.Rectangle;
  private botones: BotonMejora[] = [];
  private ayuda!: Phaser.GameObjects.Text;

  constructor() {
    super("Hud");
  }

  create(): void {
    this.barra = this.add.rectangle(0, 0, 10, ALTO_BARRA, hex(COLOR.tierra), 0.78).setOrigin(0);
    const estiloTitulo = { fontFamily: FUENTE_TITULO, fontSize: "36px", color: COLOR.texto };
    this.titulo = this.add.text(MARGEN, 30, "Black ", estiloTitulo).setOrigin(0, 0.5);
    this.add
      .text(MARGEN + this.titulo.width, 30, "Hole", { ...estiloTitulo, color: COLOR.acento })
      .setOrigin(0, 0.5);
    this.crearOpciones();

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

    this.crearTienda();
    // Los fondos atrapan los toques: así tocar la interfaz no agarra objetos del pasto
    this.barra.setInteractive();
    this.fondoTienda.setInteractive();

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

  /** Botones chicos debajo del título. */
  private crearOpciones(): void {
    const estilo = { fontFamily: FUENTE_TEXTO, fontSize: "17px", fontStyle: "600", color: COLOR.apagado };
    const textoSonido = () => `Sonido: ${getSonido()?.activo === false ? "no" : "sí"}`;
    const sonido = this.add.text(MARGEN, 64, textoSonido(), estilo).setOrigin(0, 0.5).setPadding(0, 6, 12, 6);
    sonido.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_UP, () => {
      getSonido()?.alternar();
      sonido.setText(textoSonido());
      reiniciar.setX(sonido.x + sonido.width + 4);
    });

    // Reiniciar con confirmación: hay que tocar dos veces en menos de 3 s
    const reiniciar = this.add
      .text(sonido.x + sonido.width + 4, 64, "Reiniciar", estilo)
      .setOrigin(0, 0.5)
      .setPadding(0, 6, 12, 6);
    let armado: Phaser.Time.TimerEvent | null = null;
    const desarmar = () => {
      armado?.remove();
      armado = null;
      reiniciar.setText("Reiniciar").setColor(COLOR.apagado);
    };
    reiniciar.setInteractive({ useHandCursor: true }).on(Phaser.Input.Events.POINTER_UP, () => {
      if (!armado) {
        reiniciar.setText("¿Borrar todo? Toca otra vez").setColor(COLOR.peligro);
        armado = this.time.delayedCall(3000, desarmar);
        return;
      }
      desarmar();
      progreso.reiniciar();
      this.game.events.emit(EVENTOS_GLOBALES.REINICIO);
      this.mostrarAviso("Progreso reiniciado", 2);
    });
  }

  private crearTienda(): void {
    this.fondoTienda = this.add.rectangle(0, 0, 10, 10, hex(COLOR.tierra), 0.78).setOrigin(0);
    this.botones = getBalance().mejoras.map(
      (m) => new BotonMejora(this, m, () => this.mostrarAyuda(m), () => this.comprar(m)),
    );
    this.ayuda = this.add
      .text(0, 0, AYUDA_INICIAL, { fontFamily: FUENTE_TEXTO, fontSize: "17px", fontStyle: "600", color: COLOR.apagado })
      .setOrigin(0.5);
  }

  /** Muestra qué hace la mejora en el siguiente nivel. */
  private mostrarAyuda(m: Mejora): void {
    const b = getBalance();
    const nivel = progreso.niveles[m.id];
    const max = estaAlMaximo(m, nivel);
    const s = estadisticas(b, { ...progreso.niveles, [m.id]: max ? nivel : nivel + 1 });
    this.ayuda.setText(describirMejora(m.id, s) + (max ? " (máximo)" : " (siguiente nivel)"));
    this.ajustarAyuda();
  }

  private ajustarAyuda(): void {
    const { width } = this.scale.gameSize;
    this.ayuda.setScale(Math.min(1, (width - 2 * MARGEN) / this.ayuda.width));
  }

  private comprar(m: Mejora): void {
    const r = progreso.comprar(getBalance(), m.id);
    if (!r.comprado) return;
    if (r.nuevosObjetos.length > 0) {
      const nuevo = r.nuevosObjetos[r.nuevosObjetos.length - 1];
      this.mostrarAviso(`¡Nuevo objeto: ${nuevo.nombre}!`, 3);
      this.game.events.emit(EVENTOS_GLOBALES.DESBLOQUEO, r.nuevosObjetos);
    } else {
      this.mostrarAviso(`${m.nombre} nivel ${r.nivel}`, 1.6);
      this.game.events.emit(EVENTOS_GLOBALES.COMPRA, m.id, r.nivel);
    }
    this.mostrarAyuda(m);
  }

  /** Ubica todo según el tamaño actual de la pantalla. */
  private acomodar(): void {
    const { width, height } = this.scale.gameSize;
    this.barra.width = width;
    this.monedas.setX(width - MARGEN);
    this.icono.setX(width - MARGEN - this.monedas.width - 22);
    this.detalle.setX(width - MARGEN);

    // Tienda abajo: 5 botones en fila y la ayuda debajo
    const altoTienda = ALTO_TIENDA;
    const arriba = height - altoTienda;
    this.fondoTienda.setPosition(0, arriba).setSize(width, altoTienda);
    this.fondoTienda.input?.hitArea.setTo(0, 0, width, altoTienda);
    const n = this.botones.length;
    const anchoBoton = (width - 2 * MARGEN + ESPACIO_BOTONES) / n - ESPACIO_BOTONES;
    this.botones.forEach((bt, i) => {
      bt.setPosition(MARGEN + anchoBoton / 2 + i * (anchoBoton + ESPACIO_BOTONES), arriba + ESPACIO_BOTONES + ALTO_BOTON / 2);
      bt.medir(anchoBoton, ALTO_BOTON);
    });
    this.ayuda.setPosition(width / 2, height - ALTO_AYUDA / 2 - 4);
    this.ajustarAyuda();
    this.barra.input?.hitArea.setTo(0, 0, width, ALTO_BARRA);

    this.aviso.setPosition(width / 2, arriba - 44);
    this.actualizarBotones();
  }

  private actualizarBotones(): void {
    for (const bt of this.botones) bt.actualizar(progreso.niveles[bt.mejora.id], progreso.monedas);
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
    this.actualizarBotones();
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
