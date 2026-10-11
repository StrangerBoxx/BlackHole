// Guardar y cargar el progreso como texto JSON (equivale a user://save.json).
// Cargar nunca se cae: si el texto viene roto o raro, se arregla o se empieza de cero.
import type { Album } from "./album";
import { IDS_MEJORA, type Balance } from "./balance";
import { nivelesIniciales, type Niveles } from "./mejoras";
import type { Mision } from "./misiones";

export const VERSION_GUARDADO = 2;

export interface EstadoProgreso {
  monedas: number;
  /** Objetos tragados en total. */
  total: number;
  niveles: Niveles;
  /** Índice de la zona actual en balance.zonas. */
  zona: number;
  /** Cuánto se ha llenado la barra de hambre. */
  hambre: number;
  /** Jefes comidos en total (la meta de hambre crece con esto). */
  jefes: number;
  /** Cuándo se guardó por última vez (ms desde 1970), para la ganancia offline. */
  ultimaVez: number;
  /** Misiones activas (las que faltan se crean al empezar a jugar). */
  misiones: Mision[];
  /** Objetos tragados por zona. */
  album: Album;
}

export function estadoVacio(): EstadoProgreso {
  return { monedas: 0, total: 0, niveles: nivelesIniciales(), zona: 0, hambre: 0, jefes: 0, ultimaVez: 0, misiones: [], album: {} };
}

export function serializar(e: EstadoProgreso): string {
  return JSON.stringify({ version: VERSION_GUARDADO, ...e });
}

/** Número entero >= 0, o el valor por defecto si no sirve. */
function entero(v: unknown, porDefecto = 0): number {
  return typeof v === "number" && Number.isFinite(v) && v >= 0 ? Math.floor(v) : porDefecto;
}

/**
 * Lee un guardado. Arregla lo que pueda:
 * números negativos o raros → 0, niveles por encima del máximo → máximo, mejoras que faltan → 0.
 * Si el texto no es JSON válido, devuelve un progreso vacío.
 */
export function deserializar(texto: string | null | undefined, b: Balance): EstadoProgreso {
  const vacio = estadoVacio();
  if (!texto) return vacio;
  let datos: unknown;
  try {
    datos = JSON.parse(texto);
  } catch {
    return vacio;
  }
  if (typeof datos !== "object" || datos === null) return vacio;
  const d = datos as Record<string, unknown>;
  const nivelesGuardados = (typeof d.niveles === "object" && d.niveles !== null ? d.niveles : {}) as Record<string, unknown>;

  const niveles = nivelesIniciales();
  for (const id of IDS_MEJORA) {
    const max = b.mejoras.find((m) => m.id === id)?.max ?? 0;
    niveles[id] = Math.min(max, entero(nivelesGuardados[id]));
  }
  return {
    monedas: entero(d.monedas),
    total: entero(d.total),
    niveles,
    zona: Math.min(b.zonas.length - 1, entero(d.zona)),
    hambre: entero(d.hambre),
    jefes: entero(d.jefes),
    ultimaVez: entero(d.ultimaVez),
    misiones: leerMisiones(d.misiones, b),
    album: leerAlbum(d.album, b),
  };
}

/** Solo misiones con plantilla conocida y números válidos. */
function leerMisiones(v: unknown, b: Balance): Mision[] {
  if (!Array.isArray(v)) return [];
  const salida: Mision[] = [];
  for (const m of v) {
    if (typeof m !== "object" || m === null) continue;
    const x = m as Record<string, unknown>;
    if (typeof x.plantilla !== "string" || !b.misiones.plantillas.some((p) => p.id === x.plantilla)) continue;
    const objetivo = entero(x.objetivo, 1) || 1;
    const mision: Mision = {
      plantilla: x.plantilla,
      objetivo,
      dificultad: entero(x.dificultad),
      progreso: Math.min(objetivo, entero(x.progreso)),
    };
    if (typeof x.objeto === "string" && b.objetos.some((o) => o.id === x.objeto)) mision.objeto = x.objeto;
    salida.push(mision);
  }
  return salida.slice(0, b.misiones.activas);
}

/** Solo zonas y objetos que existen, sin repetidos. */
function leerAlbum(v: unknown, b: Balance): Album {
  const album: Album = {};
  if (typeof v !== "object" || v === null) return album;
  for (const z of b.zonas) {
    const lista = (v as Record<string, unknown>)[z.id];
    if (!Array.isArray(lista)) continue;
    const validos = [...z.objetos, z.jefe];
    album[z.id] = [...new Set(lista.filter((id): id is string => typeof id === "string" && validos.includes(id)))];
  }
  return album;
}
