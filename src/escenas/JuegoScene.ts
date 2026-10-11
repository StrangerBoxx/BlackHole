import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { debug } from "../core/Debug";
import { COLOR, EVENTOS_GLOBALES, type InfoTragado } from "../core/estilo";
import { centrarMundo } from "../core/pantalla";
import { progreso } from "../core/Progreso";
import { Hoyo } from "../entidades/Hoyo";
import { Objeto } from "../entidades/Objeto";
import { mostrarPopupMonedas, mostrarTextoFlotante } from "../entidades/Popup";
import { buscarLugar, elegirTipo, RelojAparicion } from "../logica/aparicion";
import { aplicarAtraccion, avanzarCaida, puedeTragar } from "../logica/captura";
import { pasoFisica } from "../logica/fisica";
import {
  agregarPunto, elegirObjeto, limitarAlMundo, velocidadLanzamiento, type PuntoRastro,
} from "../logica/lanzamiento";
import { estadisticas, type Estadisticas } from "../logica/mejoras";
import {
  calcularGanancia, Combo, formatearMultiplicador, formatearNumero, multiplicadorCombo, textoCombo,
} from "../logica/monedas";
import { objetosDesbloqueados, tipoPorId, zonaDe } from "../logica/objetos";
import { elegirEspecial, explotarBomba, multiplicadorEspecial } from "../logica/especiales";
import { hambreLlena, metaHambre, puedeTragarJefe, sumarHambre } from "../logica/hambre";
import * as Tiros from "../logica/tiros";
import type { Cuerpo } from "../logica/fisica";
import type { IdEspecial } from "../logica/balance";

const PROF_LINEA = 25;
const PROF_DEBUG = 50;

/** El campo de juego: pasto, hoyo y objetos. */
export class JuegoScene extends Phaser.Scene {
  private objetos: Objeto[] = [];
  private agarrado: Objeto | null = null;
  /** El dedo (o mouse) que tiene el objeto. */
  private dedo: Phaser.Input.Pointer | null = null;
  private rastro: PuntoRastro[] = [];
  private hoyo!: Hoyo;
  private linea!: Phaser.GameObjects.Graphics;
  private circulos!: Phaser.GameObjects.Graphics;
  private combo!: Combo;
  private reloj!: RelojAparicion;
  /** El jefe de la zona, si está en el pasto. */
  private jefe: Objeto | null = null;
  private esperaJefe = 0;
  /** Segundos de juego (avanza con el dt del juego, no con el reloj). */
  private tiempo = 0;

  constructor() {
    super("Juego");
  }

  private get stats(): Estadisticas {
    return estadisticas(getBalance(), progreso.niveles);
  }

  create(): void {
    const { ancho, alto } = getBalance().mundo;
    this.objetos = [];
    this.agarrado = null;
    this.dedo = null;
    this.jefe = null;
    this.tiempo = 0;
    this.combo = new Combo();
    this.reloj = new RelojAparicion();
    centrarMundo(this);
    this.add.image(0, 0, zonaDe(getBalance(), progreso.zona).suelo).setOrigin(0).setDisplaySize(ancho, alto);

    const s = this.stats;
    this.hoyo = new Hoyo(this, s.radioHoyo, s.radioAtraccion);
    this.linea = this.add.graphics().setDepth(PROF_LINEA);
    this.circulos = this.add.graphics().setDepth(PROF_DEBUG);

    this.poblar();
    this.configurarArrastre();
    this.scene.launch("Hud");

    const reiniciar = () => this.reiniciar();
    this.game.events.on(EVENTOS_GLOBALES.REINICIO, reiniciar);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.game.events.off(EVENTOS_GLOBALES.REINICIO, reiniciar));
  }

  /** Los objetos del comienzo aparecen de una vez, sin animación. */
  private poblar(): void {
    for (let i = 0; i < getBalance().aparicion.iniciales; i++) this.aparecerObjeto(false);
  }

  /** Progreso borrado: se limpia el pasto y se empieza de nuevo. */
  private reiniciar(): void {
    for (const o of this.objetos) o.destruir();
    this.objetos = [];
    this.agarrado = this.dedo = null;
    this.jefe = null;
    this.combo = new Combo();
    this.reloj = new RelojAparicion();
    this.poblar();
  }

  /**
   * Saca un objeto desbloqueado (al azar con peso) en un lugar libre. Si no hay lugar, no sale.
   * `forzar` lo hace especial sí o sí (panel de debug).
   */
  aparecerObjeto(deAPoco: boolean, forzar?: IdEspecial): void {
    const b = getBalance();
    const s = this.stats;
    const tipos = objetosDesbloqueados(b, zonaDe(b, progreso.zona), s.radioHoyo);
    if (tipos.length === 0) return;
    let tipo = elegirTipo(tipos, b.aparicion.pesoBase, b.aparicion.pesoPorIndice, Math.random);
    const especial = forzar ?? elegirEspecial(tipo, b.especiales, Math.random);
    if (especial === "bomba") tipo = tipoPorId(b, b.especiales.bomba.objeto);
    const lugar = buscarLugar(tipo.r, this.objetos.map((o) => o.cuerpo), s.radioAtraccion, b, Math.random);
    if (lugar) this.objetos.push(new Objeto(this, tipo, lugar.x, lugar.y, deAPoco, especial));
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
      o.tiro = Tiros.tiroQuieto();
      this.agarrado = o;
      this.dedo = p;
      this.rastro = [{ x: o.cuerpo.x, y: o.cuerpo.y, t: performance.now() }];
    });
    // Mover y soltar se revisan en cada cuadro (seguirDedo): así funciona aunque el dedo
    // pase o se levante encima de la barra o la tienda, que se quedan con esos eventos.
  }

  /** Mueve el objeto agarrado al dedo; si el dedo se levantó, lo lanza. */
  private seguirDedo(): void {
    const o = this.agarrado, p = this.dedo;
    if (!o || !p) return;
    const b = getBalance();
    if (!p.isDown) {
      const v = velocidadLanzamiento(this.rastro, performance.now(), b.lanzamiento);
      o.cuerpo.vx = v.vx;
      o.cuerpo.vy = v.vy;
      o.cuerpo.arrastrado = false;
      const distancia = Math.hypot(o.cuerpo.x - this.hoyo.x, o.cuerpo.y - this.hoyo.y);
      o.tiro = Tiros.iniciarTiro(distancia, Math.hypot(v.vx, v.vy), b.tiros.rapidezMinima);
      this.agarrado = this.dedo = null;
      return;
    }
    const mundo = this.cameras.main.getWorldPoint(p.x, p.y);
    const pos = limitarAlMundo(mundo.x, mundo.y, o.cuerpo.r, b.mundo.ancho, b.mundo.alto);
    if (pos.x === o.cuerpo.x && pos.y === o.cuerpo.y) return; // el dedo está quieto
    o.cuerpo.x = pos.x;
    o.cuerpo.y = pos.y;
    agregarPunto(this.rastro, { ...pos, t: performance.now() }, b.lanzamiento.puntosRastro);
  }

  update(_time: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, getBalance().mundo.dtMaximo);
    this.seguirDedo();
    // Velocidad x2 (debug): dos pasos por cuadro en vez de uno más largo, así nada atraviesa paredes
    for (let i = 0; i < debug.velocidad; i++) this.paso(dt);
    for (const o of this.objetos) o.sincronizar();
    this.dibujarLinea();
    this.dibujarCirculos();
  }

  /** Un paso de simulación de `dt` segundos. */
  private paso(dt: number): void {
    const b = getBalance();
    this.tiempo += dt;
    const s = this.stats;
    const centro = this.hoyo;

    const normales = this.objetos.filter((o) => o !== this.jefe).length;
    if (this.reloj.avanzar(dt, s.intervaloAparicion, normales, s.maxObjetos)) this.aparecerObjeto(true);
    this.revisarJefe(dt);

    // Objetos nuevos crecen; los que caen siguen su espiral
    for (const o of this.objetos) {
      if (o.cuerpo.cayendo) {
        o.tiempoCaida += dt;
        const r = avanzarCaida(o.cuerpo, centro, o.tiempoCaida, dt, b.captura);
        o.escalaAnim = r.escala;
        if (r.terminado) this.tragar(o);
      } else {
        if (o.escalaAnim < 1) o.escalaAnim = Math.min(1, o.escalaAnim + dt * b.aparicion.velocidadCrecer);
        if (o.tiro.lanzado) o.tiro.tiempo += dt;
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
        const o = this.objetoDe(c);
        const cae =
          o === this.jefe
            ? puedeTragarJefe(c, centro, s.radioHoyo, s.velocidadCaptura)
            : puedeTragar(c, centro, s.radioHoyo, s.velocidadCaptura, b.captura.margenRadioObjeto);
        if (cae) {
          c.cayendo = true;
          o.tiempoCaida = 0;
          o.tirosLogrados = Tiros.evaluarTiro(o.tiro, b.tiros);
          this.game.events.emit(EVENTOS_GLOBALES.CAPTURA, o.tipo);
        }
      },
      alTocarBorde: (c) => Tiros.alTocarBorde(this.objetoDe(c).tiro),
      alChocar: (a, c) => Tiros.alChocar(this.objetoDe(a).tiro, this.objetoDe(c).tiro),
    });

    this.hoyo.actualizar(dt, s.radioHoyo, s.radioAtraccion, progreso.hambre / this.metaHambre);
  }

  private get metaHambre(): number {
    return metaHambre(getBalance().hambre, progreso.jefes);
  }

  /** Si el hambre está llena y no hay jefe, intenta sacarlo (cada medio segundo hasta que haya lugar). */
  private revisarJefe(dt: number): void {
    if (this.jefe || !hambreLlena(progreso.hambre, this.metaHambre)) return;
    this.esperaJefe -= dt;
    if (this.esperaJefe > 0) return;
    this.esperaJefe = 0.5;
    const b = getBalance();
    const tipo = tipoPorId(b, zonaDe(b, progreso.zona).jefe);
    const lugar = buscarLugar(tipo.r, this.objetos.map((o) => o.cuerpo), this.stats.radioAtraccion, b, Math.random);
    if (!lugar) return;
    this.jefe = new Objeto(this, tipo, lugar.x, lugar.y, true);
    this.objetos.push(this.jefe);
    this.game.events.emit(EVENTOS_GLOBALES.AVISO, `¡El hoyo tiene hambre! Apareció: ${tipo.nombre}`, 3);
    this.game.events.emit(EVENTOS_GLOBALES.JEFE, tipo);
  }

  private objetoDe(c: Cuerpo): Objeto {
    return this.objetos.find((o) => o.cuerpo === c)!;
  }

  /** Debug: círculos de choque (rojo), radio del hoyo (amarillo) y radio de atracción (celeste). */
  private dibujarCirculos(): void {
    const g = this.circulos;
    g.clear();
    if (!debug.mostrarCirculos) return;
    const s = this.stats;
    g.lineStyle(2, 0x5ad1ff, 0.9).strokeCircle(this.hoyo.x, this.hoyo.y, s.radioAtraccion);
    g.lineStyle(2, 0xffe14d, 0.9).strokeCircle(this.hoyo.x, this.hoyo.y, s.radioHoyo);
    for (const o of this.objetos) {
      g.lineStyle(2, o.cuerpo.cayendo ? 0x999999 : 0xff4d4d, 0.9).strokeCircle(o.cuerpo.x, o.cuerpo.y, o.cuerpo.r);
    }
  }

  /** El objeto terminó de caer: monedas, combo y "+N". */
  private tragar(o: Objeto): void {
    o.destruir();
    const b = getBalance();
    const s = this.stats;
    const combo = this.combo.registrar(this.tiempo, s.ventanaCombo);
    const xCombo = multiplicadorCombo(combo, b.combo.multiplicadorPorCombo, b.combo.multiplicadorMaximo);
    const xTiro = Tiros.multiplicadorTiro(o.tirosLogrados, b.tiros);
    const xEspecial = multiplicadorEspecial(o.especial, b.especiales);
    const zona = zonaDe(b, progreso.zona);
    const ganancia = calcularGanancia(o.tipo.valor, [zona.multiplicadorValor, s.multiplicadorValor, xCombo, xTiro, xEspecial]);
    progreso.registrarTragado(ganancia);

    const esJefe = o === this.jefe;
    if (esJefe) {
      this.jefe = null;
      progreso.jefeComido();
      this.cameras.main.shake(400, 0.012);
      this.game.events.emit(EVENTOS_GLOBALES.AVISO, `¡Te comiste el ${o.tipo.nombre}! +${formatearNumero(ganancia)}`, 3);
    } else if (o.especial !== "bomba") {
      progreso.ponerHambre(sumarHambre(progreso.hambre, o.tipo.valor, this.metaHambre));
    }

    const arriba = this.hoyo.y - this.hoyo.radioVisible;
    if (o.especial === "dorado") mostrarTextoFlotante(this, this.hoyo.x, arriba - 100, "¡Dorado! x10", b.especiales.dorado.color);
    if (o.especial === "pesado") mostrarTextoFlotante(this, this.hoyo.x, arriba - 100, "¡Pesado! x4", COLOR.texto);
    if (o.especial === "bomba") this.explotar();

    if (o.tirosLogrados.length) {
      const nombres = o.tirosLogrados.map((id) => b.tiros[id].nombre).join(" ");
      const y = this.hoyo.y - this.hoyo.radioVisible - 60;
      mostrarTextoFlotante(this, this.hoyo.x, y, `${nombres} x${formatearMultiplicador(xTiro)}`, COLOR.tiro);
      this.game.events.emit(EVENTOS_GLOBALES.TIRO, o.tirosLogrados);
    }

    this.game.events.emit(EVENTOS_GLOBALES.COMBO, combo);
    const aviso = textoCombo(combo, b.combo.mostrarDesde);
    if (aviso) this.game.events.emit(EVENTOS_GLOBALES.AVISO, `${aviso}  monedas x${formatearMultiplicador(xCombo)}`, 1.2);

    mostrarPopupMonedas(this, this.hoyo.x, this.hoyo.y - this.hoyo.radioVisible - 10, `+${formatearNumero(ganancia)}`);
    const info: InfoTragado = { tipo: o.tipo, monedas: ganancia, especial: o.especial, tiros: o.tirosLogrados, combo, jefe: esJefe };
    this.game.events.emit(EVENTOS_GLOBALES.TRAGADO, info);
  }

  /** La bomba llegó al fondo: empuja todo lo cercano hacia el hoyo y sacude la pantalla. */
  private explotar(): void {
    const e = getBalance().especiales.bomba;
    explotarBomba(this.objetos.map((x) => x.cuerpo), this.hoyo, e.radioEfecto, e.impulso);
    this.cameras.main.shake(260, 0.008);
    this.cameras.main.flash(180, 255, 200, 120);
    mostrarTextoFlotante(this, this.hoyo.x, this.hoyo.y - this.hoyo.radioVisible - 100, "¡BOOM!", COLOR.peligro);
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
