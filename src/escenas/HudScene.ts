import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { COLOR, EVENTOS_GLOBALES, FUENTE_TEXTO, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import { BotonMejora } from "../entidades/BotonMejora";
import type { Mejora } from "../logica/balance";
import { describirMejora, estadisticas, estaAlMaximo } from "../logica/mejoras";

// TEMPORAL: solo la tienda de abajo, hasta que el dock (HTML) la reemplace.
const ALTO_BOTON = 86;
const FILAS_TIENDA = 2;
const ESPACIO_BOTONES = 8;
const ALTO_AYUDA = 32;
const ALTO_TIENDA = ESPACIO_BOTONES + FILAS_TIENDA * (ALTO_BOTON + ESPACIO_BOTONES) + ALTO_AYUDA;
const MARGEN = 20;
const AYUDA_INICIAL = "Toca una mejora para comprarla";

export class HudScene extends Phaser.Scene {
  private fondoTienda!: Phaser.GameObjects.Rectangle;
  private botones: BotonMejora[] = [];
  private ayuda!: Phaser.GameObjects.Text;

  constructor() {
    super("Hud");
  }

  create(): void {
    this.fondoTienda = this.add.rectangle(0, 0, 10, 10, hex(COLOR.panel), 0.96).setOrigin(0).setInteractive();
    this.botones = getBalance().mejoras.map(
      (m) => new BotonMejora(this, m, () => this.mostrarAyuda(m), () => this.comprar(m)),
    );
    this.ayuda = this.add
      .text(0, 0, AYUDA_INICIAL, { fontFamily: FUENTE_TEXTO, fontSize: "17px", fontStyle: "600", color: COLOR.apagado })
      .setOrigin(0.5);
    this.acomodar();
    this.scale.on(Phaser.Scale.Events.RESIZE, this.acomodar, this);
    const dejar = progreso.alCambiar(() => this.actualizarBotones());
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      dejar();
      this.scale.off(Phaser.Scale.Events.RESIZE, this.acomodar, this);
    });
  }

  private mostrarAyuda(m: Mejora): void {
    const nivel = progreso.niveles[m.id];
    const max = estaAlMaximo(m, nivel);
    const s = estadisticas(getBalance(), { ...progreso.niveles, [m.id]: max ? nivel : nivel + 1 });
    this.ayuda.setText(describirMejora(m.id, s) + (max ? " (máximo)" : " (siguiente nivel)"));
  }

  private comprar(m: Mejora): void {
    const r = progreso.comprar(getBalance(), m.id);
    if (!r.comprado) return;
    if (r.nuevosObjetos.length > 0) {
      const nuevo = r.nuevosObjetos[r.nuevosObjetos.length - 1];
      this.game.events.emit(EVENTOS_GLOBALES.AVISO, `¡Nuevo objeto: ${nuevo.nombre}!`, 3);
      this.game.events.emit(EVENTOS_GLOBALES.DESBLOQUEO, r.nuevosObjetos);
    } else {
      this.game.events.emit(EVENTOS_GLOBALES.AVISO, `${m.nombre} nivel ${r.nivel}`, 1.6);
      this.game.events.emit(EVENTOS_GLOBALES.COMPRA, m.id, r.nivel);
    }
    this.mostrarAyuda(m);
  }

  private acomodar(): void {
    const { width, height } = this.scale.gameSize;
    const arriba = height - ALTO_TIENDA;
    this.fondoTienda.setPosition(0, arriba).setSize(width, ALTO_TIENDA);
    this.fondoTienda.input?.hitArea.setTo(0, 0, width, ALTO_TIENDA);
    const columnas = Math.ceil(this.botones.length / FILAS_TIENDA);
    const anchoBoton = (width - 2 * MARGEN + ESPACIO_BOTONES) / columnas - ESPACIO_BOTONES;
    this.botones.forEach((bt, i) => {
      const col = i % columnas, fila = Math.floor(i / columnas);
      bt.setPosition(
        MARGEN + anchoBoton / 2 + col * (anchoBoton + ESPACIO_BOTONES),
        arriba + ESPACIO_BOTONES + ALTO_BOTON / 2 + fila * (ALTO_BOTON + ESPACIO_BOTONES),
      );
      bt.medir(anchoBoton, ALTO_BOTON);
    });
    this.ayuda.setPosition(width / 2, height - ALTO_AYUDA / 2 - 2);
    this.actualizarBotones();
  }

  private actualizarBotones(): void {
    for (const bt of this.botones) bt.actualizar(progreso.niveles[bt.mejora.id], progreso.monedas);
  }
}
