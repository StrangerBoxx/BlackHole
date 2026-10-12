// Qué objetos pueden aparecer.
import type { Balance, TipoObjeto, Zona } from "./balance";

/** Busca un tipo de objeto por id. */
export function tipoPorId(b: Balance, id: string): TipoObjeto {
  const t = b.objetos.find((o) => o.id === id);
  if (!t) throw new Error(`No existe el objeto "${id}" en balance.json`);
  return t;
}

/** La zona por su índice (si el índice no existe, la última). */
export function zonaDe(b: Balance, indice: number): Zona {
  return b.zonas[Math.max(0, Math.min(b.zonas.length - 1, indice))];
}

/** Los 8 objetos de una zona, en orden. */
export function objetosDeZona(b: Balance, zona: Zona): TipoObjeto[] {
  return zona.objetos.map((id) => tipoPorId(b, id));
}

/** Un objeto de la zona está desbloqueado si su radio cabe: r <= radioHoyo * fraccion. */
export function objetosDesbloqueados(b: Balance, zona: Zona, radioHoyo: number): TipoObjeto[] {
  return objetosDeZona(b, zona).filter((t) => t.r <= radioHoyo * b.desbloqueo.fraccionRadioHoyo);
}
