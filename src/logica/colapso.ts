// Colapso (el "prestigio"): el hoyo se traga el pasto entero y empiezas en la zona siguiente.
// Pierdes monedas y mejoras, pero ganas materia oscura para mejoras permanentes.
import type { Balance, IdPermanente } from "./balance";
import { estadoVacio, type EstadoProgreso } from "./guardado";
import { estaAlMaximo, nivelesIniciales, valorEfecto } from "./mejoras";

export type NivelesPermanentes = Record<IdPermanente, number>;

export interface EstadisticasPermanentes {
  /** Monedas x esto, siempre. */
  multiplicadorPermanente: number;
  /** Monedas con que empieza cada vuelta. */
  monedasIniciales: number;
  /** Segundos extra de ventana de combo. */
  comboExtra: number;
  /** Probabilidad extra de que salga un dorado. */
  doradoExtra: number;
  /** Nivel de Dron con que empieza cada vuelta. */
  dronInicial: number;
  /** Horas extra de ganancia offline. */
  horasOfflineExtra: number;
}

export function permanentesIniciales(b: Balance): NivelesPermanentes {
  return Object.fromEntries(b.permanentes.map((p) => [p.id, 0])) as NivelesPermanentes;
}

export function estadisticasPermanentes(b: Balance, niveles: Partial<NivelesPermanentes>): EstadisticasPermanentes {
  const v = (k: keyof EstadisticasPermanentes) => {
    const ef = b.efectosPermanentes[k];
    return valorEfecto(ef, niveles[ef.permanente] ?? 0);
  };
  return {
    multiplicadorPermanente: v("multiplicadorPermanente"),
    monedasIniciales: v("monedasIniciales"),
    comboExtra: v("comboExtra"),
    doradoExtra: v("doradoExtra"),
    dronInicial: v("dronInicial"),
    horasOfflineExtra: v("horasOfflineExtra"),
  };
}

/** Se puede colapsar cuando el Tamaño está al máximo. */
export function puedeColapsar(b: Balance, e: EstadoProgreso): boolean {
  const tamano = b.mejoras.find((m) => m.id === "size");
  return !!tamano && estaAlMaximo(tamano, e.niveles.size);
}

/** Materia oscura por colapsar: max(mínimo, floor((monedas de la vuelta / divisor)^exponente)). */
export function materiaPorColapso(b: Balance, ganadasVuelta: number): number {
  const c = b.colapso;
  return Math.max(c.minimo, Math.floor(Math.pow(ganadasVuelta / c.divisor, c.exponente)));
}

/**
 * El estado después de colapsar: siguiente zona, materia oscura sumada, mejoras en 0
 * (salvo el Dron de fábrica) y monedas iniciales. Se conservan el álbum, el total y lo permanente.
 */
export function aplicarColapso(b: Balance, e: EstadoProgreso): EstadoProgreso {
  const p = estadisticasPermanentes(b, e.permanentes);
  const dron = b.mejoras.find((m) => m.id === "drone");
  const niveles = nivelesIniciales();
  niveles.drone = Math.min(dron?.max ?? 0, Math.round(p.dronInicial));
  return {
    ...estadoVacio(),
    total: e.total,
    album: structuredClone(e.album),
    ultimaVez: e.ultimaVez,
    permanentes: { ...e.permanentes },
    materiaOscura: e.materiaOscura + materiaPorColapso(b, e.ganadasVuelta),
    colapsos: e.colapsos + 1,
    zona: Math.min(b.zonas.length - 1, e.zona + 1),
    niveles,
    monedas: Math.round(p.monedasIniciales),
  };
}

/** Texto de lo que da una mejora permanente en un nivel. */
export function describirPermanente(id: IdPermanente, p: EstadisticasPermanentes): string {
  switch (id) {
    case "valorPerm":
      return `Chips x${Math.round(p.multiplicadorPermanente * 100) / 100} para siempre`;
    case "inicio":
      return `Empiezas cada sala con ${Math.round(p.monedasIniciales)} chips`;
    case "comboPerm":
      return `El combo dura ${p.comboExtra.toFixed(1)} s más`;
    case "raros":
      return `+${Math.round(p.doradoExtra * 100)}% de objetos dorados`;
    case "dronPerm":
      return `Empiezas cada sala con Dron nivel ${Math.round(p.dronInicial)}`;
    case "offline":
      return `${Math.round(p.horasOfflineExtra)} h más de ganancia sin jugar`;
  }
}
