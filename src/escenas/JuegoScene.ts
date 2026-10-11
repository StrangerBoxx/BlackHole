import Phaser from "phaser";
import { getBalance } from "../core/Balance";
import { centrarMundo } from "../core/pantalla";
import { Objeto } from "../entidades/Objeto";
import { pasoFisica } from "../logica/fisica";
import {
  agregarPunto, elegirObjeto, limitarAlMundo, velocidadLanzamiento, type PuntoRastro,
} from "../logica/lanzamiento";

/** El campo de juego: pasto, hoyo y objetos. */
export class JuegoScene extends Phaser.Scene {
  private objetos: Objeto[] = [];
  private agarrado: Objeto | null = null;
  private rastro: PuntoRastro[] = [];

  constructor() {
    super("Juego");
  }

  create(): void {
    const { ancho, alto } = getBalance().mundo;
    this.objetos = [];
    this.agarrado = null;
    centrarMundo(this);
    this.add.image(0, 0, "suelo").setOrigin(0).setDisplaySize(ancho, alto);

    this.ponerObjetosDePrueba();
    this.configurarArrastre();
  }

  // PASO 1 (temporal): uno de cada tipo para probar arrastre, tamaños y choques.
  // En el paso 5 se reemplaza por la aparición de verdad.
  private ponerObjetosDePrueba(): void {
    const tipos = getBalance().objetos;
    tipos.forEach((t, i) => {
      const x = 110 + (i % 4) * 167;
      const y = 620 + Math.floor(i / 4) * 160;
      this.objetos.push(new Objeto(this, t, x, y, true));
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

    for (const o of this.objetos) {
      if (o.escalaAnim < 1 && !o.cuerpo.cayendo) o.escalaAnim = Math.min(1, o.escalaAnim + dt * b.aparicion.velocidadCrecer);
    }

    pasoFisica(this.objetos.map((o) => o.cuerpo), dt, {
      ancho: b.mundo.ancho,
      alto: b.mundo.alto,
      rozamiento: b.mundo.rozamiento,
      rebote: b.mundo.rebote,
      giroPorVelocidad: b.visual.giroPorVelocidad,
    });

    for (const o of this.objetos) o.sincronizar();
  }
}
