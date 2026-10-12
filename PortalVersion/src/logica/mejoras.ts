// Mejoras: cuánto cuestan y qué valores le dan al hoyo según el nivel.
import { IDS_MEJORA, type Balance, type FormulaEfecto, type IdEfecto, type IdMejora } from "./balance";

export type Niveles = Record<IdMejora, number>;

export function nivelesIniciales(): Niveles {
  return Object.fromEntries(IDS_MEJORA.map((id) => [id, 0])) as Niveles;
}

/** Valor de un efecto en un nivel: lineal (base + nivel*porNivel) o exponencial (base*factor^nivel), con mínimo opcional. */
export function valorEfecto(ef: FormulaEfecto, nivel: number): number {
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
  ventanaCombo: number;
  gravedadPasiva: number;
  intervaloDron: number;
  /** El dron trabaja solo si se compró al menos un nivel. */
  hayDron: boolean;
}

/** Todos los valores actuales del hoyo según los niveles comprados. */
export function estadisticas(b: Balance, niveles: Niveles): Estadisticas {
  const v = (k: IdEfecto) => {
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
    ventanaCombo: v("ventanaCombo"),
    gravedadPasiva: v("gravedadPasiva"),
    intervaloDron: v("intervaloDron"),
    hayDron: (niveles.drone ?? 0) > 0,
  };
}

/** Costo para subir del nivel `nivel` al siguiente: round(base * mult^nivel). */
export function costoMejora(m: { base: number; mult: number }, nivel: number): number {
  return Math.round(m.base * Math.pow(m.mult, nivel));
}

export const estaAlMaximo = (m: { max: number }, nivel: number) => nivel >= m.max;

/** ¿Alcanza la plata y queda nivel por subir? */
export function puedeComprar(m: { base: number; mult: number; max: number }, nivel: number, monedas: number): boolean {
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
      return `Cada objeto da x${s.multiplicadorValor.toFixed(2)} chips de energía`;
    case "combo":
      return `El combo dura ${s.ventanaCombo.toFixed(1)} s entre objeto y objeto`;
    case "gravity":
      return `Todo el pasto se acerca solo al hoyo (fuerza ${Math.round(s.gravedadPasiva)})`;
    case "drone":
      return `Un dron empuja un objeto cada ${s.intervaloDron.toFixed(1)} s (también con el juego cerrado)`;
  }
}
