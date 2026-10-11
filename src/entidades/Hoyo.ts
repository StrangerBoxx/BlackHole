import Phaser from "phaser";
import { getBalance } from "../core/Balance";

const PROF_HALO = 1;
const PROF_BORDE = 2;
const PROF_REMOLINO = 3;
const PROF_NUCLEO = 4;

const TEX_HALO = "halo_atraccion";
const TAM_HALO = 512;

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

interface Mota {
  angulo: number;
  dist: number;
}

/**
 * El agujero negro: tres capas de imagen (borde, remolino que gira, núcleo),
 * más el halo morado de atracción y el polvo que cae en espiral (hechos por código).
 * Cuando sube de nivel, el tamaño cambia suave hasta el nuevo valor.
 */
export class Hoyo {
  readonly x: number;
  readonly y: number;
  /** Radios que se ven ahora (se acercan de a poco a los de verdad). */
  radioVisible: number;
  atraccionVisible: number;

  private readonly borde: Phaser.GameObjects.Image;
  private readonly remolino: Phaser.GameObjects.Image;
  private readonly nucleo: Phaser.GameObjects.Image;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly haloTex: Phaser.Textures.CanvasTexture;
  private readonly graficos: Phaser.GameObjects.Graphics;
  private readonly sinMovimiento: boolean;
  private polvo: Mota[] = [];
  private ultimoHalo = { r: -1, p: -1 };

  constructor(scene: Phaser.Scene, radio: number, atraccion: number) {
    const { hoyo } = getBalance().mundo;
    this.x = hoyo.x;
    this.y = hoyo.y;
    this.radioVisible = radio;
    this.atraccionVisible = atraccion;
    this.sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.haloTex =
      (scene.textures.exists(TEX_HALO) && (scene.textures.get(TEX_HALO) as Phaser.Textures.CanvasTexture)) ||
      scene.textures.createCanvas(TEX_HALO, TAM_HALO, TAM_HALO)!;
    this.halo = scene.add.image(this.x, this.y, TEX_HALO).setDepth(PROF_HALO);
    this.graficos = scene.add.graphics().setDepth(PROF_HALO);
    this.borde = scene.add.image(this.x, this.y, "hoyo_borde").setDepth(PROF_BORDE);
    this.remolino = scene.add.image(this.x, this.y, "hoyo_remolino").setDepth(PROF_REMOLINO);
    this.nucleo = scene.add.image(this.x, this.y, "hoyo_nucleo").setDepth(PROF_NUCLEO);
    this.dibujar();
  }

  /** Llamar cada cuadro con los radios de verdad (según las mejoras). */
  actualizar(dt: number, radio: number, atraccion: number): void {
    const v = getBalance().visual;
    const k = Math.min(1, dt * v.suavizadoHoyo);
    this.radioVisible += (radio - this.radioVisible) * k;
    this.atraccionVisible += (atraccion - this.atraccionVisible) * k;
    if (!this.sinMovimiento) {
      this.remolino.rotation += dt * v.giroRemolino;
      this.moverPolvo(dt);
    }
    this.dibujar();
  }

  private moverPolvo(dt: number): void {
    const p = getBalance().visual.polvo;
    if (this.polvo.length < p.maximo && Math.random() < p.probabilidad) {
      this.polvo.push({ angulo: Math.random() * Math.PI * 2, dist: this.atraccionVisible });
    }
    for (const m of this.polvo) {
      m.angulo += dt * (p.giroBase + p.giroCerca / Math.max(m.dist, 10));
      m.dist -= dt * p.velocidad;
    }
    this.polvo = this.polvo.filter((m) => m.dist > this.radioVisible);
  }

  private dibujar(): void {
    const v = getBalance().visual;
    const R = this.radioVisible, P = this.atraccionVisible;

    // Capas de imagen: el tamaño sale del radio; setDisplaySize usa el tamaño real del PNG
    this.borde.setDisplaySize(R * v.hoyoBorde, R * v.hoyoBorde);
    this.remolino.setDisplaySize(R * v.hoyoRemolino, R * v.hoyoRemolino);
    this.nucleo.setDisplaySize(R * v.hoyoNucleo, R * v.hoyoNucleo);

    // Halo: degradado desde el borde del hoyo hasta el radio de atracción
    if (Math.abs(R - this.ultimoHalo.r) > 0.3 || Math.abs(P - this.ultimoHalo.p) > 0.3) {
      this.pintarHalo(R, P);
      this.ultimoHalo = { r: R, p: P };
    }
    this.halo.setDisplaySize(P * 2, P * 2);

    // Línea del borde de atracción y polvo
    const g = this.graficos;
    g.clear();
    g.lineStyle(v.halo.bordeGrosor, color(v.halo.borde), v.halo.bordeOpacidad);
    g.strokeCircle(this.x, this.y, P);
    const pv = v.polvo;
    for (const m of this.polvo) {
      g.fillStyle(color(pv.color), Math.min(1, m.dist / P) * pv.opacidad);
      g.fillCircle(this.x + Math.cos(m.angulo) * m.dist, this.y + Math.sin(m.angulo) * m.dist, pv.radio);
    }
  }

  private pintarHalo(R: number, P: number): void {
    const h = getBalance().visual.halo;
    const c = Phaser.Display.Color.HexStringToColor(h.color);
    const ctx = this.haloTex.getContext();
    const mitad = TAM_HALO / 2;
    ctx.clearRect(0, 0, TAM_HALO, TAM_HALO);
    const interior = Math.max(0, Math.min(1, R / P)) * mitad;
    const grad = ctx.createRadialGradient(mitad, mitad, interior, mitad, mitad, mitad);
    grad.addColorStop(0, `rgba(${c.red},${c.green},${c.blue},${h.opacidad})`);
    grad.addColorStop(1, `rgba(${c.red},${c.green},${c.blue},0)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(mitad, mitad, mitad, 0, Math.PI * 2);
    ctx.fill();
    this.haloTex.refresh();
  }
}
