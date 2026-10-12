// Misiones cortas: "Traga 30 objetos", "Haz 4 carambolas"... Se cumplen, se cobran y sale otra.
import type { Azar } from "./aparicion";
import type { Balance, IdEspecial, TipoObjeto } from "./balance";
import { formatearNumero } from "./monedas";
import type { IdTiro } from "./tiros";

export type TipoMision = "tragar" | "tragarTipo" | "combo" | "tiro" | "dorado" | "monedas" | "jefe";

export interface PlantillaMision {
  id: string;
  /** Texto con {n} (cantidad) y {objeto} (nombre). */
  texto: string;
  /** Texto cuando la cantidad es 1 (opcional). */
  textoUno?: string;
  tipo: TipoMision;
  /** Para tipo "tiro": cuál tiro cuenta. */
  tiro?: IdTiro;
  /** Cantidades posibles; las más altas dan más premio. */
  objetivos: number[];
  /** Multiplica el premio base. */
  premio: number;
}

export interface Mision {
  plantilla: string;
  objetivo: number;
  /** Índice dentro de `objetivos` (más alto = más premio). */
  dificultad: number;
  /** Para "tragarTipo": id del objeto. */
  objeto?: string;
  progreso: number;
}

/** Lo que pasó al tragar algo (lo que necesitan las misiones). */
export interface EventoMision {
  tipo: TipoObjeto;
  monedas: number;
  especial: IdEspecial | null;
  tiros: IdTiro[];
  combo: number;
  jefe: boolean;
}

export const plantillaDe = (b: Balance, m: Mision) => b.misiones.plantillas.find((p) => p.id === m.plantilla);
export const misionCumplida = (m: Mision) => m.progreso >= m.objetivo;

/**
 * Crea una misión nueva, distinta de las que ya están activas.
 * `objetosZona` son los objetos que ya pueden aparecer (para "Traga N conos").
 * `escalaMonedas` agranda las metas de monedas en zonas más ricas.
 */
export function crearMision(
  b: Balance,
  activas: Mision[],
  objetosZona: TipoObjeto[],
  escalaMonedas: number,
  azar: Azar,
): Mision {
  const usadas = new Set(activas.map((m) => m.plantilla));
  const libres = b.misiones.plantillas.filter((p) => !usadas.has(p.id) && (p.tipo !== "tragarTipo" || objetosZona.length > 0));
  const lista = libres.length ? libres : b.misiones.plantillas;
  const p = lista[Math.floor(azar() * lista.length) % lista.length];
  const dificultad = Math.floor(azar() * p.objetivos.length) % p.objetivos.length;
  let objetivo = p.objetivos[dificultad];
  if (p.tipo === "monedas") objetivo = Math.round(objetivo * escalaMonedas);
  const m: Mision = { plantilla: p.id, objetivo, dificultad, progreso: 0 };
  if (p.tipo === "tragarTipo") m.objeto = objetosZona[Math.floor(azar() * objetosZona.length) % objetosZona.length].id;
  return m;
}

/** Texto para mostrar: "Traga 6 × Extintor" */
export function textoMision(b: Balance, m: Mision): string {
  const p = plantillaDe(b, m);
  if (!p) return "?";
  const texto = m.objetivo === 1 && p.textoUno ? p.textoUno : p.texto;
  const nombre = m.objeto ? (b.objetos.find((o) => o.id === m.objeto)?.nombre ?? m.objeto) : "";
  return texto.replace("{n}", formatearNumero(m.objetivo)).replace("{objeto}", nombre);
}

/**
 * Suma progreso a las misiones según lo que se tragó.
 * Devuelve las misiones que se cumplieron JUSTO ahora (para avisar).
 */
export function avanzarMisiones(b: Balance, misiones: Mision[], ev: EventoMision): Mision[] {
  const recien: Mision[] = [];
  for (const m of misiones) {
    if (misionCumplida(m)) continue;
    const p = plantillaDe(b, m);
    if (!p) continue;
    switch (p.tipo) {
      case "tragar": m.progreso += 1; break;
      case "tragarTipo": if (ev.tipo.id === m.objeto) m.progreso += 1; break;
      case "combo": m.progreso = Math.max(m.progreso, ev.combo + 1); break;
      case "tiro": if (p.tiro && ev.tiros.includes(p.tiro)) m.progreso += 1; break;
      case "dorado": if (ev.especial === "dorado") m.progreso += 1; break;
      case "monedas": m.progreso += ev.monedas; break;
      case "jefe": if (ev.jefe) m.progreso += 1; break;
    }
    m.progreso = Math.min(m.progreso, m.objetivo);
    if (misionCumplida(m)) recien.push(m);
  }
  return recien;
}

/** Premio en monedas: premioBase × premio de la plantilla × (dificultad + 1) × multiplicador de la partida. */
export function premioMision(b: Balance, m: Mision, multiplicador: number): number {
  const p = plantillaDe(b, m);
  return Math.round(b.misiones.premioBase * (p?.premio ?? 1) * (m.dificultad + 1) * multiplicador);
}
