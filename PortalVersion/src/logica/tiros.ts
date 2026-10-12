// Tiros especiales: premian CÓMO llega el objeto al hoyo.
import type { Balance } from "./balance";

export type IdTiro = "carambola" | "lejos" | "directo";
export const IDS_TIRO: IdTiro[] = ["carambola", "lejos", "directo"];

/** Lo que se sabe del último lanzamiento de un objeto. */
export interface EstadoTiro {
  /** Lo lanzó el jugador (o lo empujó un objeto lanzado). */
  lanzado: boolean;
  /** Tocó una pared u otro objeto después de lanzarlo. */
  reboto: boolean;
  /** Segundos desde que se lanzó. */
  tiempo: number;
  /** Distancia al hoyo desde donde se soltó. */
  distancia: number;
}

export const tiroQuieto = (): EstadoTiro => ({ lanzado: false, reboto: false, tiempo: 0, distancia: 0 });

/** Al soltar: cuenta como lanzado solo si salió con cierta rapidez (no si lo dejaste quieto). */
export function iniciarTiro(distanciaAlHoyo: number, rapidez: number, rapidezMinima: number): EstadoTiro {
  if (rapidez < rapidezMinima) return tiroQuieto();
  return { lanzado: true, reboto: false, tiempo: 0, distancia: distanciaAlHoyo };
}

/** Dos objetos chocaron: el lanzado "rebota" y el golpeado pasa a contar como lanzado (carambola en cadena). */
export function alChocar(a: EstadoTiro, b: EstadoTiro): void {
  const aLanzado = a.lanzado, bLanzado = b.lanzado;
  if (aLanzado) {
    a.reboto = true;
    if (!bLanzado) Object.assign(b, { lanzado: true, reboto: true, tiempo: 0, distancia: 0 });
  }
  if (bLanzado) {
    b.reboto = true;
    if (!aLanzado) Object.assign(a, { lanzado: true, reboto: true, tiempo: 0, distancia: 0 });
  }
}

export function alTocarBorde(t: EstadoTiro): void {
  if (t.lanzado) t.reboto = true;
}

/** ¿Qué tiros especiales logró este objeto al entrar al hoyo? */
export function evaluarTiro(t: EstadoTiro, cfg: Balance["tiros"]): IdTiro[] {
  if (!t.lanzado) return [];
  const logrados: IdTiro[] = [];
  if (t.reboto) logrados.push("carambola");
  if (t.distancia >= cfg.lejos.distancia) logrados.push("lejos");
  if (!t.reboto && t.tiempo <= cfg.directo.segundos) logrados.push("directo");
  return logrados;
}

/** Multiplicador de monedas: 1 + suma de los bonus de cada tiro logrado. */
export function multiplicadorTiro(ids: IdTiro[], cfg: Balance["tiros"]): number {
  return 1 + ids.reduce((suma, id) => suma + cfg[id].bonus, 0);
}
