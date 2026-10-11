import Phaser from "phaser";
import { texturaObjeto } from "../core/assets";
import { getBalance } from "../core/Balance";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TEXTO, FUENTE_TITULO, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import { fichasDeZona } from "../logica/album";
import { contextoMisiones } from "../logica/economia";
import { misionCumplida, premioMision, textoMision } from "../logica/misiones";
import { formatearNumero } from "../logica/monedas";
import { tipoPorId, zonaDe } from "../logica/objetos";
import { Boton } from "../ui/Boton";

export type Pestana = "misiones" | "album" | "colapso";

/** Una pestaña: su título y cómo dibuja su contenido en el área (x, y, ancho, alto). */
export interface DefPestana {
  id: Pestana;
  titulo: string;
  dibujar: (panel: PanelScene, area: Phaser.Geom.Rectangle) => void;
}

/** Pestañas registradas (Colapso se agrega desde su propio archivo). */
const PESTANAS: DefPestana[] = [];
export function registrarPestana(p: DefPestana): void {
  if (!PESTANAS.some((x) => x.id === p.id)) PESTANAS.push(p);
}

/**
 * Panel de menú encima de todo: pestañas (Misiones, Álbum...) y botón Cerrar.
 * Mientras está abierto, el juego queda en pausa.
 */
export class PanelScene extends Phaser.Scene {
  private pestana: Pestana = "misiones";
  private contenido!: Phaser.GameObjects.Container;
  private marco!: Phaser.Geom.Rectangle;
  private botonesPestana: Boton[] = [];
  /** Zona que se está mirando en el álbum. */
  zonaAlbum = 0;
  private pendiente = false;

  constructor() {
    super("Panel");
  }

  init(datos: { pestana?: Pestana }): void {
    this.pestana = datos.pestana ?? "misiones";
    this.zonaAlbum = progreso.zona;
  }

  create(): void {
    this.scene.pause("Juego");
    const { width, height } = this.scale.gameSize;
    // Fondo oscuro que tapa y atrapa los toques
    this.add.rectangle(0, 0, width, height, 0x1d2a35, 0.45).setOrigin(0).setInteractive();

    const ancho = Math.min(680, width - 24);
    const alto = Math.min(height - 40, 1000);
    this.marco = new Phaser.Geom.Rectangle((width - ancho) / 2, (height - alto) / 2, ancho, alto);
    const g = this.add.graphics();
    g.fillStyle(hex(COLOR.panel), 0.98).fillRoundedRect(this.marco.x, this.marco.y, ancho, alto, 22);
    g.lineStyle(2, hex(COLOR.acento), 1).strokeRoundedRect(this.marco.x, this.marco.y, ancho, alto, 22);

    // Pestañas arriba
    const lista = PESTANAS;
    const anchoPestana = (ancho - 40 - (lista.length - 1) * 8) / lista.length;
    this.botonesPestana = lista.map(
      (p, i) =>
        new Boton(
          this,
          this.marco.x + 20 + anchoPestana / 2 + i * (anchoPestana + 8),
          this.marco.y + 40,
          { ancho: anchoPestana, alto: 48, texto: p.titulo, tamano: 21 },
          () => this.mostrar(p.id),
        ),
    );

    new Boton(
      this,
      this.marco.centerX,
      this.marco.bottom - 42,
      { ancho: 220, alto: 52, texto: "Cerrar", tamano: 22 },
      () => this.cerrar(),
    );

    this.contenido = this.add.container(0, 0);
    this.mostrar(this.pestana);
    this.dibujarAhora();

    const dejar = progreso.alCambiar(() => (this.pendiente = true));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      dejar();
      this.scene.resume("Juego");
    });
  }

  mostrar(id: Pestana): void {
    this.pestana = id;
    PESTANAS.forEach((p, i) =>
      this.botonesPestana[i].setColores(p.id === id ? { borde: COLOR.acento, fondo: COLOR.cianSuave } : { borde: COLOR.linea, fondo: COLOR.boton }),
    );
    this.redibujar();
  }

  update(): void {
    // Se redibuja aquí (no dentro del toque) para no borrar un botón mientras se está usando
    if (this.pendiente) {
      this.pendiente = false;
      this.dibujarAhora();
    }
  }

  /** Pide volver a dibujar la pestaña actual en el próximo cuadro. */
  redibujar(): void {
    this.pendiente = true;
  }

  private dibujarAhora(): void {
    if (!this.contenido) return;
    this.contenido.removeAll(true);
    const area = new Phaser.Geom.Rectangle(this.marco.x + 20, this.marco.y + 84, this.marco.width - 40, this.marco.height - 84 - 84);
    PESTANAS.find((p) => p.id === this.pestana)?.dibujar(this, area);
  }

  /** Agrega algo al contenido de la pestaña (se borra al redibujar). */
  poner<T extends Phaser.GameObjects.GameObject>(obj: T): T {
    this.contenido.add(obj);
    return obj;
  }

  texto(x: number, y: number, texto: string, tamano: number, color: string = COLOR.texto, titulo = false): Phaser.GameObjects.Text {
    return this.poner(
      this.add.text(x, y, texto, {
        fontFamily: titulo ? FUENTE_TITULO : FUENTE_TEXTO,
        fontSize: `${tamano}px`,
        fontStyle: titulo ? "700" : "600",
        color,
      }),
    );
  }

  cerrar(): void {
    this.scene.stop();
  }
}

// ---------------------------------------------------------------- Misiones
registrarPestana({
  id: "misiones",
  titulo: "Misiones",
  dibujar(panel, area) {
    const b = getBalance();
    const ctx = contextoMisiones(b, progreso.exportar());
    const altoTarjeta = 150;
    progreso.misiones.forEach((m, i) => {
      const y = area.y + i * (altoTarjeta + 14);
      const listo = misionCumplida(m);
      const g = panel.poner(panel.add.graphics());
      g.fillStyle(hex(COLOR.boton), 1).fillRoundedRect(area.x, y, area.width, altoTarjeta, 16);
      g.lineStyle(2, hex(listo ? COLOR.chip : COLOR.linea), 1).strokeRoundedRect(area.x, y, area.width, altoTarjeta, 16);

      panel.texto(area.x + 18, y + 16, textoMision(b, m), 23);
      // Barra de progreso
      const anchoBarra = area.width - 36;
      const frac = Math.min(1, m.progreso / m.objetivo);
      g.fillStyle(hex(COLOR.linea), 0.6).fillRoundedRect(area.x + 18, y + 58, anchoBarra, 18, 9);
      if (frac > 0) g.fillStyle(hex(listo ? COLOR.chip : COLOR.acento), 1).fillRoundedRect(area.x + 18, y + 58, Math.max(18, anchoBarra * frac), 18, 9);
      panel.texto(area.x + 18, y + 86, `${formatearNumero(m.progreso)} / ${formatearNumero(m.objetivo)}`, 18, COLOR.apagado);

      const premio = premioMision(b, m, ctx.multiplicador);
      panel.poner(panel.add.image(area.x + 30, y + 126, "moneda").setDisplaySize(24, 24));
      panel.texto(area.x + 48, y + 112, `+${formatearNumero(premio)}`, 22, COLOR.chip, true);

      const boton = panel.poner(
        new Boton(panel, area.right - 100, y + 112, { ancho: 168, alto: 48, texto: listo ? "Cobrar" : "En curso", tamano: 20 }, () => {
          const r = progreso.cobrarMision(b, i, ctx.multiplicador, ctx.objetosZona, ctx.escalaMonedas, Math.random);
          if (r > 0) panel.game.events.emit(EVENTOS_GLOBALES.COMPRA, "mision", 0);
        }),
      );
      if (listo) boton.setColores({ borde: COLOR.chip, fondo: COLOR.naranjaSuave, colorTexto: COLOR.chip });
      boton.setActivo(listo);
    });
    panel.texto(area.x, area.y + 3 * (altoTarjeta + 14) + 6, "Las misiones cumplidas se cobran aquí.\nAl cobrar, sale una misión nueva.", 18, COLOR.apagado);
  },
});

// ---------------------------------------------------------------- Álbum
registrarPestana({
  id: "album",
  titulo: "Álbum",
  dibujar(panel, area) {
    const b = getBalance();
    const zona = zonaDe(b, panel.zonaAlbum);
    const fichas = fichasDeZona(zona);
    const tengo = progreso.fichasAlbum(zona.id);
    const completo = progreso.albumCompleto(zona);

    // Encabezado con flechas para mirar otras zonas ya visitadas
    panel.texto(area.centerX, area.y + 4, `${zona.nombre}: ${tengo.length}/${fichas.length}`, 30, COLOR.texto, true).setOrigin(0.5, 0);
    const flecha = (x: number, texto: string, delta: number) => {
      const destino = panel.zonaAlbum + delta;
      const boton = panel.poner(
        new Boton(panel, x, area.y + 24, { ancho: 56, alto: 44, texto, tamano: 24 }, () => {
          panel.zonaAlbum = destino;
          panel.redibujar();
        }),
      );
      boton.setActivo(destino >= 0 && destino <= progreso.zona);
    };
    flecha(area.x + 30, "<", -1);
    flecha(area.right - 30, ">", +1);
    panel
      .texto(
        area.centerX,
        area.y + 52,
        completo
          ? `¡Completo! Chips x${1 + b.album.bonusPorZona} para siempre`
          : `Trágate todo (y al jefe) para ganar chips x${1 + b.album.bonusPorZona} para siempre`,
        18,
        completo ? COLOR.chip : COLOR.apagado,
      )
      .setOrigin(0.5, 0);

    // Grilla de 3x3
    const columnas = 3;
    const celdaAncho = (area.width - (columnas - 1) * 10) / columnas;
    const celdaAlto = Math.min(190, (area.height - 100 - 20) / 3);
    fichas.forEach((id, i) => {
      const tipo = tipoPorId(b, id);
      const x = area.x + (i % columnas) * (celdaAncho + 10);
      const y = area.y + 96 + Math.floor(i / columnas) * (celdaAlto + 10);
      const la = tengo.includes(id);
      const esJefe = id === zona.jefe;
      const g = panel.poner(panel.add.graphics());
      g.fillStyle(hex(COLOR.boton), 1).fillRoundedRect(x, y, celdaAncho, celdaAlto, 14);
      g.lineStyle(2, hex(esJefe ? COLOR.peligro : la ? COLOR.acento : COLOR.linea), 1).strokeRoundedRect(x, y, celdaAncho, celdaAlto, 14);
      const img = panel.poner(panel.add.image(x + celdaAncho / 2, y + celdaAlto / 2 - 14, texturaObjeto(id)));
      img.setScale(Math.min(celdaAncho, celdaAlto - 40) * 0.8 / img.width);
      if (!la) img.setTintFill(0x000000).setAlpha(0.35);
      panel
        .texto(x + celdaAncho / 2, y + celdaAlto - 30, la ? tipo.nombre : "???", 17, la ? COLOR.texto : COLOR.apagado)
        .setOrigin(0.5, 0);
      if (esJefe) panel.texto(x + 10, y + 8, "JEFE", 14, COLOR.peligro);
    });
  },
});
