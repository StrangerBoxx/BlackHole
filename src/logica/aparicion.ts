// Aparición de objetos: cuál sale, dónde y cuándo.
import type { Balance, TipoObjeto } from "./balance";
import { distanciaInclinada } from "./captura";

/** Número al azar entre 0 y 1 (se puede cambiar en los tests para que sea predecible). */
export type Azar = () => number;

/**
 * Elige un tipo con peso `pesoBase + índice * pesoPorIndice`:
 * los objetos más grandes (al final de la lista) salen un poco más seguido.
 */
export function elegirTipo(tipos: TipoObjeto[], pesoBase: number, pesoPorIndice: number, azar: Azar): TipoObjeto {
  const pesos = tipos.map((_, i) => pesoBase + i * pesoPorIndice);
  let r = azar() * pesos.reduce((a, b) => a + b, 0);
  for (let i = 0; i < tipos.length; i++) {
    r -= pesos[i];
    if (r <= 0) return tipos[i];
  }
  return tipos[tipos.length - 1];
}

/** Zona donde pueden aparecer objetos (por defecto todo el mundo del balance). */
export interface AreaAparicion {
  ancho: number;
  alto: number;
  /** Límites de y para el centro del objeto (lejos del marcador y del dock). */
  yMin?: number;
  yMax?: number;
}

/**
 * Busca un lugar libre para un objeto de radio `r`: dentro del área, lejos del hoyo
 * y sin pisar a otros. Prueba `intentos` veces; si no encuentra, devuelve null.
 */
export function buscarLugar(
  r: number,
  otros: { x: number; y: number; r: number }[],
  radioAtraccion: number,
  b: Balance,
  azar: Azar,
  area: AreaAparicion = b.mundo,
): { x: number; y: number } | null {
  const { hoyo } = b.mundo;
  const { ancho, alto } = area;
  const a = b.aparicion;
  const lejosDelHoyo = Math.min(radioAtraccion, a.distanciaHoyoMaxima) + r + a.margenHoyo;
  const yMin = Math.max(r + a.margenBorde, area.yMin ?? 0);
  const yMax = Math.min(alto - r - a.margenBorde, area.yMax ?? alto);
  if (yMax <= yMin) return null;
  for (let i = 0; i < a.intentos; i++) {
    const x = r + a.margenBorde + azar() * (ancho - 2 * r - 2 * a.margenBorde);
    const y = yMin + azar() * (yMax - yMin);
    if (distanciaInclinada(x - hoyo.x, y - hoyo.y, b.visual.inclinacion ?? 1) < lejosDelHoyo) continue;
    if (otros.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + a.separacion)) continue;
    return { x, y };
  }
  return null;
}

/** Reloj de aparición: cada `intervalo` segundos toca intentar sacar un objeto (si hay cupo). */
export class RelojAparicion {
  private acumulado = 0;

  /** Avanza el reloj. Devuelve true si toca aparecer uno ahora. */
  avanzar(dt: number, intervalo: number, cantidad: number, maximo: number): boolean {
    this.acumulado += dt;
    if (this.acumulado < intervalo) return false;
    this.acumulado = 0;
    return cantidad < maximo;
  }
}
