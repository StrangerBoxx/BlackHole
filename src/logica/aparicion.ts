// Aparición de objetos: cuál sale, dónde y cuándo.
import type { Balance, TipoObjeto } from "./balance";

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

/**
 * Busca un lugar libre para un objeto de radio `r`: dentro del mundo, lejos del hoyo
 * y sin pisar a otros. Prueba `intentos` veces; si no encuentra, devuelve null.
 */
export function buscarLugar(
  r: number,
  otros: { x: number; y: number; r: number }[],
  radioAtraccion: number,
  b: Balance,
  azar: Azar,
): { x: number; y: number } | null {
  const { ancho, alto, hoyo } = b.mundo;
  const a = b.aparicion;
  const lejosDelHoyo = Math.min(radioAtraccion, a.distanciaHoyoMaxima) + r + a.margenHoyo;
  for (let i = 0; i < a.intentos; i++) {
    const x = r + a.margenBorde + azar() * (ancho - 2 * r - 2 * a.margenBorde);
    const y = r + a.margenBorde + azar() * (alto - 2 * r - 2 * a.margenBorde);
    if (Math.hypot(x - hoyo.x, y - hoyo.y) < lejosDelHoyo) continue;
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
