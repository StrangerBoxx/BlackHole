// Hambre del hoyo: se llena tragando objetos; cuando está llena aparece el jefe de la zona.
import type { Balance } from "./balance";
import { distanciaInclinada } from "./captura";

/** Cuánto hay que llenar: meta * crecePorJefe^(jefes ya comidos). */
export function metaHambre(cfg: Balance["hambre"], jefesComidos: number): number {
  return Math.round(cfg.meta * Math.pow(cfg.crecePorJefe, jefesComidos));
}

/** Suma el valor base del objeto tragado, sin pasar la meta. */
export function sumarHambre(actual: number, valor: number, meta: number): number {
  return Math.min(meta, actual + valor);
}

export const hambreLlena = (actual: number, meta: number) => actual >= meta;

/**
 * Regla de captura del jefe: es más grande que el hoyo, así que basta con que
 * su CENTRO llegue dentro del hoyo y vaya más lento que la velocidad de captura.
 */
export function puedeTragarJefe(
  c: { x: number; y: number; vx: number; vy: number },
  hoyo: { x: number; y: number },
  radioHoyo: number,
  velocidadCaptura: number,
  inclinacion = 1,
): boolean {
  return distanciaInclinada(c.x - hoyo.x, c.y - hoyo.y, inclinacion) < radioHoyo && Math.hypot(c.vx, c.vy) < velocidadCaptura;
}
