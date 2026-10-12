// El dron: cada cierto tiempo empuja un objeto hacia el hoyo.
import type { Azar } from "./aparicion";
import type { Cuerpo } from "./fisica";

/**
 * Velocidad para que un objeto recorra `distancia` con roce y llegue lento al hoyo.
 * Con roce k, un objeto que parte a v0 recorre en total v0/k; se pide un poquito más (extra)
 * para que no se quede corto, y la atracción del hoyo hace el resto.
 */
export function velocidadParaLlegar(distancia: number, rozamiento: number, extra: number, maxima: number): number {
  return Math.min(maxima, distancia * rozamiento * extra);
}

/** Elige al azar un objeto que el dron pueda empujar (suelto, agarrable y que no esté cayendo). */
export function elegirObjetivo<T extends Cuerpo>(cuerpos: T[], azar: Azar): T | null {
  const candidatos = cuerpos.filter((c) => !c.cayendo && !c.arrastrado && c.agarrable);
  if (candidatos.length === 0) return null;
  return candidatos[Math.floor(azar() * candidatos.length) % candidatos.length];
}

/** Le da al objeto la velocidad hacia el hoyo. */
export function empujarHaciaHoyo(
  c: Cuerpo,
  hoyo: { x: number; y: number },
  rozamiento: number,
  extra: number,
  maxima: number,
): void {
  const dx = hoyo.x - c.x, dy = hoyo.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d < 1) return;
  const v = velocidadParaLlegar(d, rozamiento, extra, maxima);
  c.vx = (dx / d) * v;
  c.vy = (dy / d) * v;
}
