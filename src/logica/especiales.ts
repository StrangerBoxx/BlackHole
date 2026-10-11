// Objetos especiales: dorado (vale mucho más), pesado (no se agarra) y bomba (empuja todo al hoyo).
import type { Balance, IdEspecial, TipoObjeto } from "./balance";
import type { Azar } from "./aparicion";
import type { Cuerpo } from "./fisica";

type Config = Balance["especiales"];

/**
 * Decide si el próximo objeto que aparece es especial. Una sola tirada:
 * primero bomba, después dorado, después pesado (este solo en objetos de radio >= radioMinimo).
 * `extraDorado` suma probabilidad de dorado (mejora permanente "Suerte dorada").
 */
export function elegirEspecial(tipo: TipoObjeto, cfg: Config, azar: Azar, extraDorado = 0): IdEspecial | null {
  const r = azar();
  let corte = cfg.bomba.probabilidad;
  if (r < corte) return "bomba";
  corte += cfg.dorado.probabilidad + extraDorado;
  if (r < corte) return "dorado";
  corte += cfg.pesado.probabilidad;
  if (r < corte && tipo.r >= cfg.pesado.radioMinimo) return "pesado";
  return null;
}

/** Multiplicador de monedas del especial (la bomba vale lo que dice su objeto). */
export function multiplicadorEspecial(especial: IdEspecial | null, cfg: Config): number {
  if (especial === "dorado") return cfg.dorado.multiplicador;
  if (especial === "pesado") return cfg.pesado.multiplicador;
  return 1;
}

/**
 * La bomba explotó en el hoyo: empuja hacia el hoyo a todo lo que está cerca.
 * Más fuerte mientras más cerca (impulso * (1 - dist/radio)). No mueve lo agarrado ni lo que ya cae.
 */
export function explotarBomba(cuerpos: Cuerpo[], hoyo: { x: number; y: number }, radio: number, impulso: number): number {
  let afectados = 0;
  for (const c of cuerpos) {
    if (c.arrastrado || c.cayendo) continue;
    const dx = hoyo.x - c.x, dy = hoyo.y - c.y;
    const d = Math.hypot(dx, dy);
    if (d >= radio || d < 1) continue;
    const fuerza = (impulso * (1 - d / radio)) / c.peso;
    c.vx += (dx / d) * fuerza;
    c.vy += (dy / d) * fuerza;
    afectados++;
  }
  return afectados;
}
