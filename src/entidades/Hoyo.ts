import Phaser from "phaser";
import { getBalance } from "../core/Balance";

/** Todo el hoyo va en un contenedor bajo los objetos (que están en 10-30). */
const PROF_HOYO = 2;

const TEX_HALO = "halo_atraccion";
const TAM_HALO = 512;
const TEX_BRILLO = "brillo_suave";
const TEX_PARED = "pared_hoyo";
const TAM_PARED = 256;

const color = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;

/** Chispa que cae en espiral hacia el hoyo. */
interface Chispa {
  angulo: number;
  dist: number;
  color: number;
}

/** Chispa de la ráfaga que sale al tragar algo. */
interface Destello {
  x: number;
  y: number;
  vx: number;
  vy: number;
  vida: number;
  color: number;
}

/**
 * El agujero negro: tres capas de imagen (borde, remolino que gira, núcleo) y efectos por código:
 * brillo naranja/cian que pulsa, halo de atracción cian con borde punteado, chispas en espiral,
 * ráfaga al tragar y anillo de hambre. Cuando sube de nivel, el tamaño cambia suave.
 *
 * Se ve INCLINADO: todo va dentro de un contenedor aplastado en vertical (visual.inclinacion),
 * así el hoyo es un óvalo acostado en el piso y el remolino gira sobre el piso. Encima del núcleo
 * se dibuja la pared interior del pozo (el lado de atrás), para que se note que es hondo.
 * Las cosas dentro del contenedor se dibujan con coordenadas relativas al centro (0, 0).
 */
export class Hoyo {
  readonly x: number;
  readonly y: number;
  /** 1 = visto desde arriba; menos = más inclinado (el óvalo mide radio × inclinacion de alto). */
  readonly inclinacion: number;
  /** Radios que se ven ahora (se acercan de a poco a los de verdad). */
  radioVisible: number;
  atraccionVisible: number;

  private readonly borde: Phaser.GameObjects.Image;
  private readonly remolino: Phaser.GameObjects.Image;
  private readonly nucleo: Phaser.GameObjects.Image;
  private readonly pared: Phaser.GameObjects.Image;
  private readonly contenedor: Phaser.GameObjects.Container;
  private readonly halo: Phaser.GameObjects.Image;
  private readonly haloTex: Phaser.Textures.CanvasTexture;
  private readonly brillos: Phaser.GameObjects.Image[];
  private readonly graficos: Phaser.GameObjects.Graphics;
  private readonly graficosChispas: Phaser.GameObjects.Graphics;
  private readonly sinMovimiento: boolean;
  private chispas: Chispa[] = [];
  private destellos: Destello[] = [];
  /** Anillo de luz que se expande al tragar (0 = no hay). */
  private onda = 0;
  /** Barra de hambre de 0 a 1 (anillo alrededor del hoyo). */
  private hambre = 0;
  private tiempo = 0;
  private ultimoHalo = { r: -1, p: -1 };

  /** `centro`: dónde va (por defecto el del balance; la pantalla de inicio lo pone en otro lugar). */
  constructor(scene: Phaser.Scene, radio: number, atraccion: number, centro?: { x: number; y: number }) {
    const b = getBalance();
    this.x = centro?.x ?? b.mundo.hoyo.x;
    this.y = centro?.y ?? b.mundo.hoyo.y;
    this.inclinacion = b.visual.inclinacion;
    this.radioVisible = radio;
    this.atraccionVisible = atraccion;
    this.sinMovimiento = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;

    this.haloTex =
      (scene.textures.exists(TEX_HALO) && (scene.textures.get(TEX_HALO) as Phaser.Textures.CanvasTexture)) ||
      scene.textures.createCanvas(TEX_HALO, TAM_HALO, TAM_HALO)!;
    this.halo = scene.add.image(0, 0, TEX_HALO);
    this.graficos = scene.add.graphics();

    // Brillos: un degradado blanco teñido de naranja y otro de cian, que pulsan desfasados
    Hoyo.crearTexturaBrillo(scene);
    this.brillos = b.visual.brillo.colores.map((c) => scene.add.image(0, 0, TEX_BRILLO).setTint(color(c)));

    this.borde = scene.add.image(0, 0, "hoyo_borde");
    this.remolino = scene.add.image(0, 0, "hoyo_remolino");
    this.nucleo = scene.add.image(0, 0, "hoyo_nucleo");
    Hoyo.crearTexturaPared(scene, b.visual.inclinacion, b.visual.profundidad);
    this.pared = scene.add.image(0, 0, TEX_PARED).setVisible(b.visual.inclinacion < 0.999);
    this.graficosChispas = scene.add.graphics();

    // Orden de abajo hacia arriba
    this.contenedor = scene.add
      .container(this.x, this.y, [this.halo, this.graficos, ...this.brillos, this.borde, this.remolino, this.nucleo, this.pared, this.graficosChispas])
      .setDepth(PROF_HOYO)
      .setScale(1, b.visual.inclinacion);
    this.dibujar();
  }

  private static crearTexturaBrillo(scene: Phaser.Scene): void {
    if (scene.textures.exists(TEX_BRILLO)) return;
    const tex = scene.textures.createCanvas(TEX_BRILLO, 256, 256)!;
    const ctx = tex.getContext();
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, "rgba(255,255,255,1)");
    grad.addColorStop(0.45, "rgba(255,255,255,0.55)");
    grad.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    tex.refresh();
  }

  /**
   * Pared interior del pozo vista en perspectiva: la parte de la boca que queda ARRIBA del fondo.
   * En coordenadas sin aplastar, el fondo es el mismo círculo corrido hacia abajo.
   * Se dibuja una vez, según la inclinación y la profundidad del balance.
   */
  private static crearTexturaPared(scene: Phaser.Scene, inclinacion: number, profundidad: number): void {
    if (scene.textures.exists(TEX_PARED)) scene.textures.remove(TEX_PARED);
    const tex = scene.textures.createCanvas(TEX_PARED, TAM_PARED, TAM_PARED)!;
    const ctx = tex.getContext();
    const r = TAM_PARED / 2;
    const k = Math.max(0.2, Math.min(1, inclinacion));
    // Cuánto baja el fondo: profundidad × sen(ángulo), pasado a coordenadas sin aplastar (÷ k)
    const corrimiento = (profundidad * r * Math.sqrt(1 - k * k)) / k;
    ctx.save();
    ctx.beginPath();
    ctx.arc(r, r, r, 0, Math.PI * 2);
    ctx.clip();
    const grad = ctx.createLinearGradient(0, 0, 0, corrimiento + r * 0.4);
    grad.addColorStop(0, "#8d9ba7");
    grad.addColorStop(0.25, "#4a5a68");
    grad.addColorStop(0.7, "#121c26");
    grad.addColorStop(1, "#04080c");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, TAM_PARED, TAM_PARED);
    // Franjas de la pared (anillos que bajan) con un toque cian
    for (let i = 1; i <= 4; i++) {
      const y = (corrimiento * i) / 5;
      ctx.strokeStyle = `rgba(26,159,214,${0.35 - i * 0.06})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(r, r + y, r - 2, Math.PI * 1.05, Math.PI * 1.95);
      ctx.stroke();
    }
    // Recortar el fondo: lo que queda es solo la pared de atrás
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(r, r + corrimiento, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    tex.refresh();
  }

  /** Llamar cada cuadro con los radios de verdad (según las mejoras) y el hambre (0 a 1). */
  actualizar(dt: number, radio: number, atraccion: number, hambre: number): void {
    const v = getBalance().visual;
    this.hambre = Math.max(0, Math.min(1, hambre));
    this.tiempo += dt;
    const k = Math.min(1, dt * v.suavizadoHoyo);
    this.radioVisible += (radio - this.radioVisible) * k;
    this.atraccionVisible += (atraccion - this.atraccionVisible) * k;
    if (!this.sinMovimiento) {
      this.remolino.rotation += dt * v.giroRemolino;
      this.moverChispas(dt);
    }
    this.moverDestellos(dt);
    this.dibujar();
  }

  /** Ráfaga de chispas naranjas y cian al tragar algo (más grande = más chispas). */
  rafaga(tamano = 1): void {
    const c = getBalance().visual.chispas;
    const colores = c.colores.map(color);
    this.onda = c.rafagaSegundos;
    const n = Math.round(c.rafaga * (0.6 + tamano * 0.6));
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const vel = c.rafagaVelocidad * (0.5 + Math.random() * 0.7);
      this.destellos.push({
        x: Math.cos(a) * this.radioVisible * 0.6,
        y: Math.sin(a) * this.radioVisible * 0.6,
        vx: Math.cos(a) * vel,
        vy: Math.sin(a) * vel,
        vida: c.rafagaSegundos * (0.6 + Math.random() * 0.4),
        color: colores[i % colores.length],
      });
    }
  }

  private moverChispas(dt: number): void {
    const c = getBalance().visual.chispas;
    if (this.chispas.length < c.maximo && Math.random() < c.probabilidad) {
      const colores = c.colores;
      this.chispas.push({
        angulo: Math.random() * Math.PI * 2,
        dist: this.atraccionVisible,
        color: color(colores[this.chispas.length % colores.length]),
      });
    }
    for (const m of this.chispas) {
      m.angulo += dt * (c.giroBase + c.giroCerca / Math.max(m.dist, 10));
      m.dist -= dt * c.velocidad;
    }
    this.chispas = this.chispas.filter((m) => m.dist > this.radioVisible * 0.9);
  }

  private moverDestellos(dt: number): void {
    for (const d of this.destellos) {
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.vx *= 1 - 3 * dt;
      d.vy *= 1 - 3 * dt;
      d.vida -= dt;
    }
    this.destellos = this.destellos.filter((d) => d.vida > 0);
    this.onda = Math.max(0, this.onda - dt);
  }

  private dibujar(): void {
    const b = getBalance();
    const v = b.visual;
    const R = this.radioVisible, P = this.atraccionVisible;

    this.contenedor.setScale(1, this.inclinacion);

    // Capas de imagen: el tamaño sale del radio; setDisplaySize usa el tamaño real del PNG
    this.borde.setDisplaySize(R * v.hoyoBorde, R * v.hoyoBorde);
    this.remolino.setDisplaySize(R * v.hoyoRemolino, R * v.hoyoRemolino);
    this.nucleo.setDisplaySize(R * v.hoyoNucleo, R * v.hoyoNucleo);
    this.pared.setDisplaySize(R * 2, R * 2);

    // Brillos que pulsan (uno naranja, otro cian, desfasados)
    const br = v.brillo;
    this.brillos.forEach((img, i) => {
      const fase = Math.sin(this.tiempo * br.pulso + i * Math.PI);
      const tam = R * br.tamano * (1 + 0.12 * fase);
      img.setDisplaySize(tam, tam).setAlpha(br.opacidad * (0.65 + 0.35 * fase));
    });

    // Halo: degradado cian desde el borde del hoyo hasta el radio de atracción
    if (Math.abs(R - this.ultimoHalo.r) > 0.3 || Math.abs(P - this.ultimoHalo.p) > 0.3) {
      this.pintarHalo(R, P);
      this.ultimoHalo = { r: R, p: P };
    }
    this.halo.setDisplaySize(P * 2, P * 2);

    const g = this.graficos;
    g.clear();
    // Borde de atracción punteado (gira despacio)
    const h = v.halo;
    g.lineStyle(h.bordeGrosor, color(h.borde), h.bordeOpacidad);
    const paso = (h.trazo + h.hueco) / P;
    const largo = h.trazo / P;
    const giro = this.sinMovimiento ? 0 : this.tiempo * 0.15;
    for (let a = 0; a < Math.PI * 2 - paso / 2; a += paso) {
      g.beginPath();
      g.arc(0, 0, P, a + giro, a + giro + largo);
      g.strokePath();
    }

    // Anillo de hambre: se llena en sentido horario desde arriba; lleno = late
    const hm = b.hambre;
    const radioAnillo = R * hm.distancia;
    g.lineStyle(hm.grosor, 0x2b3640, 0.18);
    g.strokeCircle(0, 0, radioAnillo);
    if (this.hambre > 0) {
      const c0 = Phaser.Display.Color.HexStringToColor(hm.colorVacio);
      const c1 = Phaser.Display.Color.HexStringToColor(hm.colorLleno);
      const mezcla = Phaser.Display.Color.Interpolate.ColorWithColor(c0, c1, 100, Math.round(this.hambre * 100));
      const lleno = this.hambre >= 1;
      const alfa = lleno ? 0.65 + 0.35 * Math.sin(this.tiempo * 8) : 0.9;
      g.lineStyle(hm.grosor, Phaser.Display.Color.GetColor(mezcla.r, mezcla.g, mezcla.b), alfa);
      g.beginPath();
      g.arc(0, 0, radioAnillo, -Math.PI / 2, -Math.PI / 2 + this.hambre * Math.PI * 2);
      g.strokePath();
    }

    // Chispas en espiral (rayita en la dirección en que giran) y ráfaga
    const gc = this.graficosChispas;
    gc.clear();
    const ch = v.chispas;
    for (const m of this.chispas) {
      const alfa = Math.min(1, (P - m.dist) / 30 + 0.2) * Math.min(1, (m.dist - R * 0.9) / 20);
      const x = Math.cos(m.angulo) * m.dist, y = Math.sin(m.angulo) * m.dist;
      const atras = m.angulo - ch.largo / Math.max(m.dist, 10);
      gc.lineStyle(ch.grosor, m.color, Math.max(0, alfa));
      gc.lineBetween(Math.cos(atras) * (m.dist + 4), Math.sin(atras) * (m.dist + 4), x, y);
    }
    for (const d of this.destellos) {
      const alfa = Math.min(1, d.vida / (ch.rafagaSegundos * 0.5));
      gc.lineStyle(ch.grosor + 2, d.color, alfa);
      gc.lineBetween(d.x - d.vx * 0.06, d.y - d.vy * 0.06, d.x, d.y);
    }
    if (this.onda > 0) {
      const t = 1 - this.onda / ch.rafagaSegundos;
      gc.lineStyle(4, 0xffffff, 0.8 * (1 - t));
      gc.strokeCircle(0, 0, R * (1 + t * 1.6));
      gc.lineStyle(2, color(ch.colores[1] ?? "#1a9fd6"), 0.9 * (1 - t));
      gc.strokeCircle(0, 0, R * (1.05 + t * 1.6));
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
