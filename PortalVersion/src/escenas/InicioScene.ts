import Phaser from "phaser";
import { texturaObjeto } from "../core/assets";
import { getBalance } from "../core/Balance";
import { altoMundo } from "../core/pantalla";
import { CLAVE_DISTORSION, registrarDistorsion, type DistorsionFX } from "../efectos/DistorsionFX";
import { crearCapaLuz } from "../efectos/Luz";
import { crearSuelo } from "../efectos/Suelo";
import { Hoyo } from "../entidades/Hoyo";
import { tipoPorId } from "../logica/objetos";

/** Dónde va el hoyo en la pantalla de inicio (fracción del alto) y su tamaño. */
const ALTO_HOYO = 0.4;
const RADIO_HOYO = 72;
const RADIO_HALO = 230;
/** Cada cuánto cae un objeto de adorno (segundos). */
const CADA = 0.9;

/**
 * Fondo de la pantalla de inicio: el piso de baldosas blancas del laboratorio,
 * el agujero negro grande con sus efectos y objetos que caen en espiral.
 * El título y los botones van encima, en HTML (src/ui/inicio.ts).
 */
export class InicioScene extends Phaser.Scene {
  private hoyo!: Hoyo;
  private suelo: Phaser.GameObjects.Image | null = null;
  private distorsion: DistorsionFX | null = null;
  private reloj = 0;

  constructor() {
    super("Inicio");
  }

  create(): void {
    this.reloj = 0;
    this.armar();
    const alCambiarTamano = () => this.scene.restart();
    this.scale.on(Phaser.Scale.Events.RESIZE, alCambiarTamano);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, alCambiarTamano));
  }

  private armar(): void {
    const b = getBalance();
    const ancho = b.mundo.ancho, alto = altoMundo();
    this.suelo = crearSuelo(this, b.zonas[0].suelo, ancho, alto).setDepth(0);
    this.distorsion = null;
    if (registrarDistorsion(this.game)) {
      this.suelo.setPostPipeline(CLAVE_DISTORSION);
      this.distorsion = this.suelo.getPostPipeline(CLAVE_DISTORSION) as DistorsionFX;
    }
    crearCapaLuz(this, 38, ancho, alto);
    this.hoyo = new Hoyo(this, RADIO_HOYO, RADIO_HALO, { x: ancho / 2, y: alto * ALTO_HOYO });
  }

  update(_t: number, deltaMs: number): void {
    const dt = Math.min(deltaMs / 1000, 1 / 30);
    this.hoyo.actualizar(dt, RADIO_HOYO, RADIO_HALO, 0);
    this.reloj += dt;
    if (this.reloj >= CADA) {
      this.reloj = 0;
      this.caerObjeto();
    }
    const fx = this.distorsion;
    if (fx) {
      const d = getBalance().visual.distorsion;
      fx.centro.x = this.hoyo.x;
      fx.centro.y = this.hoyo.y;
      fx.radio = this.hoyo.radioVisible * d.radio;
      fx.giro = d.giro;
      fx.hundir = d.hundimiento;
      fx.oscuro = d.oscurecer;
      fx.inclinacion = this.hoyo.inclinacion;
    }
  }

  /** Un objeto del laboratorio aparece en un borde y cae al hoyo girando y achicándose. */
  private caerObjeto(): void {
    const b = getBalance();
    const ids = b.zonas[0].objetos;
    const id = ids[Math.floor(Math.random() * ids.length)];
    const tipo = tipoPorId(b, id);
    const ancho = b.mundo.ancho, alto = altoMundo();
    // Desde un punto al azar en un círculo grande alrededor del hoyo
    const a = Math.random() * Math.PI * 2;
    const dist = Math.max(ancho, alto) * 0.7;
    const x0 = this.hoyo.x + Math.cos(a) * dist, y0 = this.hoyo.y + Math.sin(a) * dist;
    const img = this.add.image(x0, y0, texturaObjeto(tipo.id)).setDepth(20);
    const escala = (tipo.r * 2 * (b.visual.objetoImagenPx / b.visual.objetoCirculoPx)) / img.width;
    img.setScale(escala).setRotation(Math.random() * Math.PI * 2);
    // Espiral: el ángulo avanza mientras la distancia se achica
    const estado = { t: 0 };
    const giros = 1.2 + Math.random();
    this.tweens.add({
      targets: estado,
      t: 1,
      duration: 2600 + Math.random() * 1400,
      ease: "Sine.easeIn",
      onUpdate: () => {
        const t = estado.t;
        const ang = a + t * giros * Math.PI * 2;
        const d = dist * (1 - t);
        img.setPosition(this.hoyo.x + Math.cos(ang) * d, this.hoyo.y + Math.sin(ang) * d * this.hoyo.inclinacion);
        img.setRotation(img.rotation + 0.05);
        img.setScale(escala * (t < 0.85 ? 1 : (1 - t) / 0.15));
      },
      onComplete: () => {
        img.destroy();
        this.hoyo.rafaga(tipo.r / 56);
      },
    });
  }
}
