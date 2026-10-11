// Guardar y cargar el progreso como texto JSON (equivale a user://save.json).
// Cargar nunca se cae: si el texto viene roto o raro, se arregla o se empieza de cero.
import { ALBUM_ESPECIALES, fichasEspeciales, type Album } from "./album";
import { IDS_MEJORA, type Balance } from "./balance";
import { nivelesIniciales, type Niveles } from "./mejoras";
import type { Mision } from "./misiones";
import type { NivelesPermanentes } from "./colapso";
import { recordsVacios, type Records } from "./logros";

export const VERSION_GUARDADO = 3;

/**
 * Guardados de antes del estilo laboratorio (versión < 3) usaban otros nombres.
 * Se traducen al cargar para no perder álbum ni misiones. Va por zona porque "casco"
 * era de la Luna (ahora "valvula") y ahora es del Laboratorio.
 */
const ZONAS_VIEJAS: Record<string, string> = { parque: "laboratorio", ciudad: "almacen", luna: "reactor" };
const OBJETOS_VIEJOS: Record<string, string> = {
  piedra: "tornillo", lata: "matraz", pelota: "casco", cono: "extintor", neumatico: "silla",
  caja: "caja_herramientas", basurero: "servidor", auto: "robot", tractor: "tanque",
  botella: "tuerca", pizza: "probeta", hidrante: "botiquin", maceta: "bidon", quitasol: "carrito",
  contenedor: "barril", taxi: "estante", bus: "montacargas", bomberos: "contenedor_carga",
  roca_lunar: "fusible", bandera: "bateria", casco: "valvula", satelite: "bobina", rover: "panel",
  modulo: "generador", antena: "transformador", estacion: "turbina", cohete: "nucleo",
};

/** Traduce álbum y misiones de un guardado viejo a los nombres nuevos. */
export function migrarNombres(d: Record<string, unknown>): Record<string, unknown> {
  if (typeof d.version === "number" && d.version >= 3) return d;
  const salida = { ...d };
  if (typeof d.album === "object" && d.album !== null) {
    const album: Record<string, unknown> = {};
    for (const [zona, lista] of Object.entries(d.album as Record<string, unknown>)) {
      album[ZONAS_VIEJAS[zona] ?? zona] = Array.isArray(lista)
        ? lista.map((id) => (typeof id === "string" ? (OBJETOS_VIEJOS[id] ?? id) : id))
        : lista;
    }
    salida.album = album;
  }
  if (Array.isArray(d.misiones)) {
    salida.misiones = d.misiones.map((m) => {
      if (typeof m !== "object" || m === null) return m;
      const x = m as Record<string, unknown>;
      return typeof x.objeto === "string" ? { ...x, objeto: OBJETOS_VIEJOS[x.objeto] ?? x.objeto } : x;
    });
  }
  return salida;
}

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
  /** Moneda del colapso (no se pierde). */
  materiaOscura: number;
  /** Niveles de las mejoras permanentes. */
  permanentes: Partial<NivelesPermanentes>;
  /** Monedas ganadas desde el último colapso (dan la materia oscura). */
  ganadasVuelta: number;
  /** Veces que se colapsó. */
  colapsos: number;
  /** Récords de por vida (para los logros). */
  records: Records;
  /** Ids de los logros ya desbloqueados. */
  logros: string[];
}

export function estadoVacio(): EstadoProgreso {
  return { monedas: 0, total: 0, niveles: nivelesIniciales(), zona: 0, hambre: 0, jefes: 0, ultimaVez: 0, misiones: [], album: {}, materiaOscura: 0, permanentes: {}, ganadasVuelta: 0, colapsos: 0,
    records: recordsVacios(), logros: [] };
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
  const d = migrarNombres(datos as Record<string, unknown>);
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
    materiaOscura: entero(d.materiaOscura),
    permanentes: leerPermanentes(d.permanentes, b),
    ganadasVuelta: entero(d.ganadasVuelta),
    colapsos: entero(d.colapsos),
    records: leerRecords(d.records),
    logros: Array.isArray(d.logros)
      ? [...new Set(d.logros.filter((id): id is string => typeof id === "string" && b.logros.some((l) => l.id === id)))]
      : [],
  };
}

function leerRecords(v: unknown): Records {
  const r = (typeof v === "object" && v !== null ? v : {}) as Record<string, unknown>;
  return { comboMax: entero(r.comboMax), jefes: entero(r.jefes), dorados: entero(r.dorados), tiros: entero(r.tiros) };
}

/** Niveles de mejoras permanentes que existen, dentro de 0..máximo. */
function leerPermanentes(v: unknown, b: Balance): Partial<NivelesPermanentes> {
  const salida: Partial<NivelesPermanentes> = {};
  if (typeof v !== "object" || v === null) return salida;
  for (const p of b.permanentes) {
    const n = Math.min(p.max, entero((v as Record<string, unknown>)[p.id]));
    if (n > 0) salida[p.id] = n;
  }
  return salida;
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
  const especiales = (v as Record<string, unknown>)[ALBUM_ESPECIALES];
  if (Array.isArray(especiales)) {
    const validos = fichasEspeciales(b);
    album[ALBUM_ESPECIALES] = [...new Set(especiales.filter((id): id is string => typeof id === "string" && validos.includes(id)))];
  }
  return album;
}
