// Mejoras: cuánto cuestan y qué valores le dan al hoyo según el nivel.
import { IDS_MEJORA, type Balance, type Efecto, type IdMejora, type Mejora } from "./balance";

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

/** Costo para subir del nivel `nivel` al siguiente: round(base * mult^nivel). */
export function costoMejora(m: Mejora, nivel: number): number {
  return Math.round(m.base * Math.pow(m.mult, nivel));
}

export const estaAlMaximo = (m: Mejora, nivel: number) => nivel >= m.max;

/** ¿Alcanza la plata y queda nivel por subir? */
export function puedeComprar(m: Mejora, nivel: number, monedas: number): boolean {
  return !estaAlMaximo(m, nivel) && monedas >= costoMejora(m, nivel);
}

/** Texto corto de lo que hace una mejora con sus valores en ese nivel. */
export function describirMejora(id: IdMejora, s: Estadisticas): string {
  switch (id) {
    case "pull":
      return `Radio de atracción: ${Math.round(s.radioAtraccion)} px`;
    case "force":
      return `Fuerza de atracción: ${Math.round(s.fuerza)}`;
    case "size":
      return `Hoyo de ${Math.round(s.radioHoyo)} px: traga objetos más grandes y más rápidos`;
    case "spawn":
      return `Hasta ${Math.round(s.maxObjetos)} objetos, uno cada ${s.intervaloAparicion.toFixed(1)} s`;
    case "value":
      return `Cada objeto da x${s.multiplicadorValor.toFixed(2)} monedas`;
  }
}
