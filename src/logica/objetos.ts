// Qué objetos pueden aparecer.
import type { Balance, TipoObjeto } from "./balance";

/** Un objeto está desbloqueado si su radio cabe: r <= radioHoyo * fraccion. Mantiene el orden del balance. */
export function objetosDesbloqueados(b: Balance, radioHoyo: number): TipoObjeto[] {
  return b.objetos.filter((t) => t.r <= radioHoyo * b.desbloqueo.fraccionRadioHoyo);
}
