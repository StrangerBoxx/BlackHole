// Objetos especiales: dorado (vale mucho más), pesado (no se agarra), bomba (empuja todo al hoyo)
// y Bing Bong (personaje raro que vale mucho).
import type { Balance, IdEspecial, TipoObjeto } from "./balance";
import type { Azar } from "./aparicion";
import type { Cuerpo } from "./fisica";

type Config = Balance["especiales"];

/**
 * Decide si el próximo objeto que aparece es especial. Una sola tirada, en franjas seguidas:
 * bomba, dorado, pesado (solo en objetos de radio >= radioMinimo) y Bing Bong.
 * `extraDorado` suma probabilidad de dorado (mejora permanente "Suerte dorada").
 */
export function elegirEspecial(tipo: TipoObjeto, cfg: Config, azar: Azar, extraDorado = 0): IdEspecial | null {
  const r = azar();
  let desde = 0;
  const franjas: [IdEspecial, number][] = [
    ["bomba", cfg.bomba.probabilidad],
    ["dorado", cfg.dorado.probabilidad + extraDorado],
    ["pesado", cfg.pesado.probabilidad],
    ["bingBong", cfg.bingBong.probabilidad],
  ];
  for (const [id, p] of franjas) {
    if (r >= desde && r < desde + p) return id === "pesado" && tipo.r < cfg.pesado.radioMinimo ? null : id;
    desde += p;
  }
  return null;
}

/** Bomba y Bing Bong reemplazan al objeto que iba a salir por el suyo. Devuelve ese id, o null. */
export function objetoDelEspecial(especial: IdEspecial | null, cfg: Config): string | null {
  if (especial === "bomba") return cfg.bomba.objeto;
  if (especial === "bingBong") return cfg.bingBong.objeto;
  return null;
}

/** Multiplicador de monedas del especial (la bomba vale lo que dice su objeto). */
export function multiplicadorEspecial(especial: IdEspecial | null, cfg: Config): number {
  if (especial === "dorado") return cfg.dorado.multiplicador;
  if (especial === "pesado") return cfg.pesado.multiplicador;
  if (especial === "bingBong") return cfg.bingBong.multiplicador;
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
