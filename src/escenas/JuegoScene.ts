import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { centrarMundo } from "../core/pantalla";
import { Hoyo } from "../entidades/Hoyo";
import { Objeto } from "../entidades/Objeto";
import type { TipoObjeto } from "../logica/balance";
import { aplicarAtraccion, avanzarCaida, puedeTragar } from "../logica/captura";
import { pasoFisica } from "../logica/fisica";
import {
  agregarPunto, elegirObjeto, limitarAlMundo, velocidadLanzamiento, type PuntoRastro,
} from "../logica/lanzamiento";
import { estadisticas, nivelesIniciales, type Estadisticas, type Niveles } from "../logica/mejoras";

const PROF_LINEA = 25;

/** Eventos que esta escena avisa (los escucha el HUD y el sonido). */
export const EVENTOS_JUEGO = {
  /** Empieza a caer al hoyo: (tipo: TipoObjeto) */
  CAPTURA: "captura",
  /** Terminó de caer: (tipo: TipoObjeto) */
  TRAGADO: "tragado",
} as const;

/** El campo de juego: pasto, hoyo y objetos. */
export class JuegoScene extends Phaser.Scene {
  private objetos: Objeto[] = [];
  private agarrado: Objeto | null = null;
  private rastro: PuntoRastro[] = [];
  private hoyo!: Hoyo;
  private linea!: Phaser.GameObjects.Graphics;
  // Temporal hasta el paso 4/7: niveles en 0
  private niveles: Niveles = nivelesIniciales();

  constructor() {
    super("Juego");
  }

  private get stats(): Estadisticas {
    return estadisticas(getBalance(), this.niveles);
  }

  create(): void {
    const { ancho, alto } = getBalance().mundo;
    this.objetos = [];
    this.agarrado = null;
    centrarMundo(this);
    this.add.image(0, 0, "suelo").setOrigin(0).setDisplaySize(ancho, alto);

    const s = this.stats;
    this.hoyo = new Hoyo(this, s.radioHoyo, s.radioAtraccion);
    this.linea = this.add.graphics().setDepth(PROF_LINEA);

    this.ponerObjetosDePrueba();
    this.configurarArrastre();
  }

  // TEMPORAL (pasos 1-4): uno de cada tipo abajo y, si se lo tragan, vuelve a aparecer.
  // En el paso 5 se reemplaza por la aparición de verdad.
  private ponerObjetosDePrueba(): void {
    getBalance().objetos.forEach((t, i) => {
      const x = 110 + (i % 4) * 167;
      const y = 620 + Math.floor(i / 4) * 160;
      this.objetos.push(new Objeto(this, t, x, y, true));
    });
    this.events.on(EVENTOS_JUEGO.TRAGADO, (t: TipoObjeto) => {
      this.time.delayedCall(800, () => {
        const x = Phaser.Math.Between(60, 660), y = Phaser.Math.Between(620, 900);
        this.objetos.push(new Objeto(this, t, x, y, true));
      });
    });
  }

  private configurarArrastre(): void {
    const b = getBalance();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (p: Phaser.Input.Pointer) => {
      if (this.agarrado) return; // un solo dedo a la vez
      const i = elegirObjeto(this.objetos.map((o) => o.cuerpo), p.worldX, p.worldY, b.lanzamiento.margenAgarre);
      if (i < 0) return;
      const o = this.objetos[i];
      o.cuerpo.arrastrado = true;
      o.cuerpo.vx = o.cuerpo.vy = 0;
      this.agarrado = o;
      this.rastro = [{ x: o.cuerpo.x, y: o.cuerpo.y, t: performance.now() }];
    });

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      const o = this.agarrado;
      if (!o || !p.isDown) return;
      const pos = limitarAlMundo(p.worldX, p.worldY, o.cuerpo.r, b.mundo.ancho, b.mundo.alto);
      o.cuerpo.x = pos.x;
      o.cuerpo.y = pos.y;
      agregarPunto(this.rastro, { ...pos, t: performance.now() }, b.lanzamiento.puntosRastro);
    });

    const soltar = () => {
      const o = this.agarrado;
      if (!o) return;
      const v = velocidadLanzamiento(this.rastro, performance.now(), b.lanzamiento);
      o.cuerpo.vx = v.vx;
      o.cuerpo.vy = v.vy;
      o.cuerpo.arrastrado = false;
      this.agarrado = null;
    };
    this.input.on(Phaser.Input.Events.POINTER_UP, soltar);
    this.input.on(Phaser.Input.Events.POINTER_UP_OUTSIDE, soltar);
    this.input.on(Phaser.Input.Events.GAME_OUT, soltar);
  }

  update(_time: number, deltaMs: number): void {
    const b = getBalance();
    const dt = Math.min(deltaMs / 1000, b.mundo.dtMaximo);
    const s = this.stats;
    const centro = this.hoyo;

    // Objetos nuevos crecen; los que caen siguen su espiral
    for (const o of this.objetos) {
      if (o.cuerpo.cayendo) {
        o.tiempoCaida += dt;
        const r = avanzarCaida(o.cuerpo, centro, o.tiempoCaida, dt, b.captura);
        o.escalaAnim = r.escala;
        if (r.terminado) this.tragar(o);
      } else if (o.escalaAnim < 1) {
        o.escalaAnim = Math.min(1, o.escalaAnim + dt * b.aparicion.velocidadCrecer);
      }
    }
    this.objetos = this.objetos.filter((o) => o.escalaAnim > 0 || !o.cuerpo.cayendo);

    pasoFisica(this.objetos.map((o) => o.cuerpo), dt, {
      ancho: b.mundo.ancho,
      alto: b.mundo.alto,
      rozamiento: b.mundo.rozamiento,
      rebote: b.mundo.rebote,
      giroPorVelocidad: b.visual.giroPorVelocidad,
      antesDeMover: (c, paso) =>
        aplicarAtraccion(c, centro, s.radioAtraccion, s.fuerza, b.atraccion.fuerzaMinimaFraccion, paso),
      despuesDeMover: (c) => {
        if (puedeTragar(c, centro, s.radioHoyo, s.velocidadCaptura, b.captura.margenRadioObjeto)) {
          c.cayendo = true;
          const o = this.objetos.find((x) => x.cuerpo === c)!;
          o.tiempoCaida = 0;
          this.events.emit(EVENTOS_JUEGO.CAPTURA, o.tipo);
        }
      },
    });

    this.hoyo.actualizar(dt, s.radioHoyo, s.radioAtraccion);
    for (const o of this.objetos) o.sincronizar();
    this.dibujarLinea();
  }

  private tragar(o: Objeto): void {
    o.destruir();
    this.events.emit(EVENTOS_JUEGO.TRAGADO, o.tipo);
  }

  /** Línea punteada del objeto agarrado al hoyo (ayuda a apuntar). */
  private dibujarLinea(): void {
    const g = this.linea;
    g.clear();
    const o = this.agarrado;
    if (!o) return;
    const l = getBalance().visual.lineaAgarre;
    g.lineStyle(l.grosor, Phaser.Display.Color.HexStringToColor(l.color).color, l.opacidad);
    const x0 = o.cuerpo.x, y0 = o.cuerpo.y;
    const dx = this.hoyo.x - x0, dy = this.hoyo.y - y0;
    const largo = Math.hypot(dx, dy);
    if (largo < 1) return;
    const ux = dx / largo, uy = dy / largo;
    for (let d = 0; d < largo; d += l.trazo + l.hueco) {
      const fin = Math.min(d + l.trazo, largo);
      g.lineBetween(x0 + ux * d, y0 + uy * d, x0 + ux * fin, y0 + uy * fin);
    }
  }
}
