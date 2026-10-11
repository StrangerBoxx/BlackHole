import Phaser from "phaser";
import type { IdSonido, TipoObjeto } from "../logica/balance";
import { tonoMoneda, tonoTragar, volumenTragar } from "../logica/sonido";
import { getBalance } from "./Balance";
import { EVENTOS_GLOBALES } from "./estilo";

const CLAVE_SONIDO = "black-hole-sonido";

/**
 * Sonidos del juego. Escucha los eventos (captura, combo, compra...) y toca el WAV
 * de assets/sonidos/ con el volumen de balance.json. El ambiente suena en loop.
 * Los navegadores no dejan sonar nada hasta el primer toque: Phaser espera solo.
 */
export class Sonido {
  private ambiente: Phaser.Sound.BaseSound | null = null;
  // Se guarda aquí: sound.mute de Phaser tarda un instante en reflejar el cambio
  private encendido = Sonido.prefiereSonido();

  constructor(private readonly game: Phaser.Game) {
    const s = getBalance().sonido;
    game.sound.volume = s.general;
    game.sound.mute = !this.encendido;

    const ev = game.events;
    ev.on(EVENTOS_GLOBALES.CAPTURA, (t: TipoObjeto) =>
      this.tocar("tragar", tonoTragar(t.r, s), volumenTragar(t.r, s)),
    );
    ev.on(EVENTOS_GLOBALES.COMBO, (combo: number) => this.tocar("moneda", tonoMoneda(combo, s), s.volumen.moneda));
    ev.on(EVENTOS_GLOBALES.COMPRA, () => this.tocar("comprar", 1, s.volumen.comprar));
    ev.on(EVENTOS_GLOBALES.DESBLOQUEO, () => this.tocar("desbloquear", 1, s.volumen.desbloquear));

    if (game.sound.locked) game.sound.once(Phaser.Sound.Events.UNLOCKED, () => this.empezarAmbiente());
    else this.empezarAmbiente();
  }

  private empezarAmbiente(): void {
    if (this.ambiente || !this.game.cache.audio.exists("ambiente")) return;
    this.ambiente = this.game.sound.add("ambiente", { loop: true, volume: getBalance().sonido.volumen.ambiente });
    this.ambiente.play();
  }

  /** `rate` cambia el tono (y la velocidad), como pitch_scale en Godot. */
  private tocar(clave: IdSonido, rate: number, volume: number): void {
    if (!this.game.cache.audio.exists(clave)) return; // si falta el archivo, no suena (y no se cae)
    this.game.sound.play(clave, { rate, volume });
  }

  get activo(): boolean {
    return this.encendido;
  }

  /** Prende o apaga todo el sonido y lo recuerda en este dispositivo. */
  alternar(): boolean {
    this.encendido = !this.encendido;
    this.game.sound.mute = !this.encendido;
    try {
      localStorage.setItem(CLAVE_SONIDO, this.activo ? "si" : "no");
    } catch {
      /* sin almacenamiento: solo dura esta sesión */
    }
    return this.activo;
  }

  private static prefiereSonido(): boolean {
    try {
      return localStorage.getItem(CLAVE_SONIDO) !== "no";
    } catch {
      return true;
    }
  }
}

let unico: Sonido | null = null;

/** Crea el sonido una sola vez (después de cargar los assets). */
export function iniciarSonido(game: Phaser.Game): Sonido {
  unico ??= new Sonido(game);
  return unico;
}

export function getSonido(): Sonido | null {
  return unico;
}
