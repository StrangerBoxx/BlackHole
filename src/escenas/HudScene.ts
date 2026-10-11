import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TITULO, FUENTE_TEXTO, hex } from "../core/estilo";
import { ALTO_AYUDA_TIENDA as ALTO_AYUDA, ALTO_BARRA_HUD as ALTO_BARRA, ALTO_BOTON_TIENDA as ALTO_BOTON,
  ALTO_MENU_TIENDA, ALTO_TIENDA, ESPACIO_TIENDA as ESPACIO_BOTONES, FILAS_TIENDA } from "../core/pantalla";
import { progreso } from "../core/Progreso";
import { getSonido } from "../core/Sonido";
import { BotonMejora } from "../entidades/BotonMejora";
import { fichasDeZona } from "../logica/album";
import { misionCumplida } from "../logica/misiones";
import { puedeColapsar } from "../logica/colapso";
import { zonaDe } from "../logica/objetos";
import { Boton } from "../ui/Boton";
import type { Pestana } from "./PanelScene";
import type { Mejora } from "../logica/balance";
import { describirMejora, estadisticas, estaAlMaximo } from "../logica/mejoras";
import { formatearNumero } from "../logica/monedas";
import { formatearDuracion } from "../logica/offline";

const MARGEN = 20;
const AYUDA_INICIAL = "Toca una mejora para comprarla";

/**
 * Interfaz encima del juego: título, monedas, avisos y tienda de mejoras.
 * Se ancla a los bordes de la pantalla (no del mundo), así en celulares altos usa el espacio extra.
 */
export class HudScene extends Phaser.Scene {
  private barra!: Phaser.GameObjects.Rectangle;
  private titulo!: Phaser.GameObjects.Text;
  private lineaBarra!: Phaser.GameObjects.Rectangle;
  private lineaTienda!: Phaser.GameObjects.Rectangle;
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
  /** Botones de menú arriba de la tienda (abren el panel). */
  private menu: { boton: Boton; pestana: Pestana }[] = [];

  constructor() {
    super("Hud");
  }

  create(): void {
    this.barra = this.add.rectangle(0, 0, 10, ALTO_BARRA, hex(COLOR.panel), 0.96).setOrigin(0);
    this.lineaBarra = this.add.rectangle(0, ALTO_BARRA - 2, 10, 2, hex(COLOR.linea)).setOrigin(0);
    const estiloTitulo = { fontFamily: FUENTE_TITULO, fontSize: "38px", fontStyle: "700", color: COLOR.texto };
    this.titulo = this.add.text(MARGEN, 30, "BLACK ", estiloTitulo).setOrigin(0, 0.5);
    this.add
      .text(MARGEN + this.titulo.width, 30, "HOLE", { ...estiloTitulo, color: COLOR.chip })
      .setOrigin(0, 0.5);
    this.crearOpciones();

    this.monedas = this.add
      .text(0, 30, "0", { fontFamily: FUENTE_TITULO, fontSize: "42px", fontStyle: "700", color: COLOR.chip })
      .setOrigin(1, 0.5);
    this.icono = this.add.image(0, 30, "moneda").setDisplaySize(32, 32);
    this.detalle = this.add
      .text(0, 62, "", { fontFamily: FUENTE_TEXTO, fontSize: "17px", color: COLOR.apagado, fontStyle: "600" })
      .setOrigin(1, 0.5);

    this.avisoFondo = this.add.graphics();
    this.avisoTexto = this.add
      .text(0, 0, "", { fontFamily: FUENTE_TITULO, fontSize: "30px", fontStyle: "700", color: COLOR.textoClaro, align: "center" })
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

    const offline = this.registry.get("offline") as { segundos: number; monedas: number } | undefined;
    const avisoInicial = this.registry.get("avisoInicial") as string | undefined;
    if (avisoInicial) {
      this.registry.remove("avisoInicial");
      this.mostrarAviso(avisoInicial, 4);
    } else if (offline && offline.monedas > 0) {
      this.registry.remove("offline");
      this.mostrarAviso(
        `Mientras no estabas (${formatearDuracion(offline.segundos)}), tu dron juntó +${formatearNumero(offline.monedas)} chips`,
        5,
      );
    } else if (progreso.total === 0) this.mostrarAviso("Arrastra un objeto y lánzalo al agujero", 4);
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
    this.fondoTienda = this.add.rectangle(0, 0, 10, 10, hex(COLOR.panel), 0.96).setOrigin(0);
    this.lineaTienda = this.add.rectangle(0, 0, 10, 2, hex(COLOR.linea)).setOrigin(0);
    this.botones = getBalance().mejoras.map(
      (m) => new BotonMejora(this, m, () => this.mostrarAyuda(m), () => this.comprar(m)),
    );
    this.menu = (["misiones", "album", "colapso"] as Pestana[]).map((pestana) => ({
      pestana,
      boton: new Boton(this, 0, 0, { ancho: 100, alto: ALTO_MENU_TIENDA, texto: "", tamano: 19 }, () => this.abrirPanel(pestana)),
    }));
    this.ayuda = this.add
      .text(0, 0, AYUDA_INICIAL, { fontFamily: FUENTE_TEXTO, fontSize: "17px", fontStyle: "600", color: COLOR.apagado })
      .setOrigin(0.5);
  }

  private abrirPanel(pestana: Pestana): void {
    if (!this.scene.isActive("Panel")) this.scene.launch("Panel", { pestana });
  }

  /** Textos de los botones de menú: misiones por cobrar y fichas del álbum. */
  private actualizarMenu(): void {
    const b = getBalance();
    for (const { boton, pestana } of this.menu) {
      if (pestana === "misiones") {
        const listas = progreso.misiones.filter(misionCumplida).length;
        boton.setTexto(listas ? `Misiones (${listas} por cobrar)` : "Misiones");
        boton.setColores(listas ? { borde: COLOR.chip, colorTexto: COLOR.chip } : { borde: COLOR.linea, colorTexto: COLOR.texto });
      } else if (pestana === "album") {
        const zona = zonaDe(b, progreso.zona);
        boton.setTexto(`Álbum ${progreso.fichasAlbum(zona.id).length}/${fichasDeZona(zona).length}`);
      } else if (pestana === "colapso") {
        const listo = puedeColapsar(b, progreso.exportar());
        boton.setTexto(listo ? "¡Colapso listo!" : "Colapso");
        boton.setColores(listo ? { borde: COLOR.acento, colorTexto: COLOR.acento } : { borde: COLOR.linea, colorTexto: COLOR.texto });
      }
    }
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
    this.lineaBarra.width = width;
    this.monedas.setX(width - MARGEN);
    this.icono.setX(width - MARGEN - this.monedas.width - 22);
    this.detalle.setX(width - MARGEN);

    // Tienda abajo: botones en 2 filas y la ayuda debajo
    const altoTienda = ALTO_TIENDA;
    const arriba = height - altoTienda;
    this.fondoTienda.setPosition(0, arriba).setSize(width, altoTienda);
    this.lineaTienda.setPosition(0, arriba).setSize(width, 2);
    this.fondoTienda.input?.hitArea.setTo(0, 0, width, altoTienda);
    const anchoMenu = (width - 2 * MARGEN + ESPACIO_BOTONES) / this.menu.length - ESPACIO_BOTONES;
    this.menu.forEach(({ boton }, i) => {
      boton.setPosition(MARGEN + anchoMenu / 2 + i * (anchoMenu + ESPACIO_BOTONES), arriba + ESPACIO_BOTONES + ALTO_MENU_TIENDA / 2);
      boton.setTamano(anchoMenu, ALTO_MENU_TIENDA);
    });
    const arribaBotones = arriba + ESPACIO_BOTONES + ALTO_MENU_TIENDA;
    const columnas = Math.ceil(this.botones.length / FILAS_TIENDA);
    const anchoBoton = (width - 2 * MARGEN + ESPACIO_BOTONES) / columnas - ESPACIO_BOTONES;
    this.botones.forEach((bt, i) => {
      const col = i % columnas, fila = Math.floor(i / columnas);
      bt.setPosition(
        MARGEN + anchoBoton / 2 + col * (anchoBoton + ESPACIO_BOTONES),
        arribaBotones + ESPACIO_BOTONES + ALTO_BOTON / 2 + fila * (ALTO_BOTON + ESPACIO_BOTONES),
      );
      bt.medir(anchoBoton, ALTO_BOTON);
    });
    this.ayuda.setPosition(width / 2, height - ALTO_AYUDA / 2 - 2);
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
    const zona = zonaDe(getBalance(), progreso.zona);
    this.detalle.setText(
      progreso.materiaOscura > 0 || progreso.colapsos > 0
        ? `${zona.nombre} · ${formatearNumero(progreso.materiaOscura)} materia oscura`
        : progreso.total === 0
          ? "Lanza objetos al hoyo"
          : `${zona.nombre} · ${formatearNumero(progreso.total)} ${progreso.total === 1 ? "tragado" : "tragados"}`,
    );
    this.icono.setX(this.scale.gameSize.width - MARGEN - this.monedas.width - 22);
    this.actualizarBotones();
    this.actualizarMenu();
  }

  /** Aviso abajo al centro durante `segundos` (se desvanece al final). */
  mostrarAviso(texto: string, segundos: number): void {
    const { width } = this.scale.gameSize;
    this.avisoTexto.setText(texto);
    const ancho = Math.min(width - 40, this.avisoTexto.width + 48);
    this.avisoTexto.setScale(Math.min(1, (ancho - 30) / this.avisoTexto.width));
    this.avisoFondo.clear();
    this.avisoFondo.fillStyle(hex(COLOR.oscuro), 0.88);
    this.avisoFondo.fillRoundedRect(-ancho / 2, -26, ancho, 52, 26);
    this.avisoRestante = segundos;
  }

  update(_t: number, deltaMs: number): void {
    if (this.avisoRestante > 0) this.avisoRestante -= deltaMs / 1000;
    this.aviso.setAlpha(Math.max(0, Math.min(1, this.avisoRestante * 2)));
  }
}
