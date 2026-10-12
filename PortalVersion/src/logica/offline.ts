// Ganancia offline: lo que el dron junta mientras el juego está cerrado.
import type { Balance, TipoObjeto } from "./balance";

/** Valor promedio de lo que aparece, con los mismos pesos de aparición (1 + i*0.6). */
export function valorPromedio(tipos: TipoObjeto[], pesoBase: number, pesoPorIndice: number): number {
  if (tipos.length === 0) return 0;
  let suma = 0, pesos = 0;
  tipos.forEach((t, i) => {
    const w = pesoBase + i * pesoPorIndice;
    suma += w * t.valor;
    pesos += w;
  });
  return suma / pesos;
}

export interface DatosOffline {
  /** Segundos que el juego estuvo cerrado. */
  segundos: number;
  horasMaximas: number;
  hayDron: boolean;
  intervaloDron: number;
  /** Valor promedio de un objeto (ver valorPromedio). */
  valorObjeto: number;
  /** Multiplicadores que siempre aplican (zona, Valor, permanentes...). */
  multiplicador: number;
}

/**
 * Monedas ganadas sin jugar = objetos que empujó el dron × valor promedio × multiplicador × eficiencia.
 * Sin dron no se gana nada. Se cuenta como máximo `horasMaximas`. Menos de `minimoSegundos` no cuenta.
 */
export function gananciaOffline(d: DatosOffline, cfg: Balance["offline"]): number {
  if (!d.hayDron || d.segundos < cfg.minimoSegundos || d.intervaloDron <= 0) return 0;
  const segundos = Math.min(d.segundos, d.horasMaximas * 3600);
  const objetos = segundos / d.intervaloDron;
  return Math.floor(objetos * d.valorObjeto * d.multiplicador * cfg.eficiencia);
}

/** "2 h 15 min", "45 min", "30 s" */
export function formatearDuracion(segundos: number): string {
  const s = Math.floor(segundos);
  if (s < 60) return `${s} s`;
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60);
  return h > 0 ? `${h} h ${m} min` : `${m} min`;
}
