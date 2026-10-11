// Mejoras: cuánto cuestan y qué valores le dan al hoyo según el nivel.
import { IDS_MEJORA, type Balance, type Efecto, type IdMejora } from "./balance";

export type Niveles = Record<IdMejora, number>;

export function nivelesIniciales(): Niveles {
  return Object.fromEntries(IDS_MEJORA.map((id) => [id, 0])) as Niveles;
}

/** Valor de un efecto en un nivel: lineal (base + nivel*porNivel) o exponencial (base*factor^nivel), con mínimo opcional. */
export function valorEfecto(ef: Efecto, nivel: number): number {
  const v =
    ef.factorPorNivel !== undefined
      ? ef.base * Math.pow(ef.factorPorNivel, nivel)
      : ef.base + nivel * (ef.porNivel ?? 0);
  return ef.minimo !== undefined ? Math.max(ef.minimo, v) : v;
}

export interface Estadisticas {
  radioAtraccion: number;
  fuerza: number;
  radioHoyo: number;
  velocidadCaptura: number;
  maxObjetos: number;
  intervaloAparicion: number;
  multiplicadorValor: number;
}

/** Todos los valores actuales del hoyo según los niveles comprados. */
export function estadisticas(b: Balance, niveles: Niveles): Estadisticas {
  const v = (k: keyof Estadisticas) => {
    const ef = b.efectos[k];
    return valorEfecto(ef, niveles[ef.mejora] ?? 0);
  };
  return {
    radioAtraccion: v("radioAtraccion"),
    fuerza: v("fuerza"),
    radioHoyo: v("radioHoyo"),
    velocidadCaptura: v("velocidadCaptura"),
    maxObjetos: v("maxObjetos"),
    intervaloAparicion: v("intervaloAparicion"),
    multiplicadorValor: v("multiplicadorValor"),
  };
}
