// Logros: metas que se desbloquean solas jugando (no dan premio; son para presumir).
import type { Balance } from "./balance";
import { zonaCompleta } from "./album";
import type { EstadoProgreso } from "./guardado";

export type TipoLogro =
  | "tragados" // objetos tragados en total
  | "combo" // mejor combo (objetos seguidos)
  | "jefes" // jefes tragados en total
  | "dorados" // objetos dorados tragados
  | "tiros" // tiros especiales logrados
  | "colapsos" // veces que se colapsó
  | "sala" // sala más avanzada a la que se llegó (1 = Laboratorio, 2 = Almacén, 3 = Reactor)
  | "albumes"; // álbumes de sala completos

export interface DefLogro {
  id: string;
  nombre: string;
  descripcion: string;
  tipo: TipoLogro;
  meta: number;
}

/** Récords de por vida que solo sirven para los logros. */
export interface Records {
  comboMax: number;
  jefes: number;
  dorados: number;
  tiros: number;
}

export const recordsVacios = (): Records => ({ comboMax: 0, jefes: 0, dorados: 0, tiros: 0 });

/** Lo que pasó al tragar algo (para los récords). */
export interface EventoRecord {
  combo: number;
  jefe: boolean;
  especial: string | null;
  tiros: unknown[];
}

/** Suma un objeto tragado a los récords. */
export function anotarRecord(r: Records, ev: EventoRecord): void {
  r.comboMax = Math.max(r.comboMax, ev.combo + 1);
  if (ev.jefe) r.jefes += 1;
  if (ev.especial === "dorado") r.dorados += 1;
  r.tiros += ev.tiros.length;
}

/** Cuánto se lleva de un logro: valor actual y meta (para la barra). */
export function avanceLogro(b: Balance, d: DefLogro, e: EstadoProgreso): { valor: number; meta: number } {
  const meta = d.meta;
  let valor = 0;
  switch (d.tipo) {
    case "tragados": valor = e.total; break;
    case "combo": valor = e.records.comboMax; break;
    case "jefes": valor = e.records.jefes; break;
    case "dorados": valor = e.records.dorados; break;
    case "tiros": valor = e.records.tiros; break;
    case "colapsos": valor = e.colapsos; break;
    case "sala": valor = e.zona + 1; break;
    case "albumes": valor = b.zonas.filter((z) => zonaCompleta(e.album, z)).length; break;
  }
  return { valor: Math.min(valor, meta), meta };
}

export const logroCumplido = (b: Balance, d: DefLogro, e: EstadoProgreso) => {
  const a = avanceLogro(b, d, e);
  return a.valor >= a.meta;
};

/** Logros cumplidos que todavía no estaban anotados (para avisar "¡Logro!"). */
export function logrosNuevos(b: Balance, e: EstadoProgreso): DefLogro[] {
  return b.logros.filter((d) => !e.logros.includes(d.id) && logroCumplido(b, d, e));
}
