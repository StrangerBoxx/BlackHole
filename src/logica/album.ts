// Álbum: qué objetos de cada zona ya se tragó el hoyo. Completar una zona da un bonus para siempre.
import type { Balance, Zona } from "./balance";

/** zonaId → ids de objetos ya tragados */
export type Album = Record<string, string[]>;

/** Lo que hay que juntar en una zona: sus 8 objetos y su jefe. */
export const fichasDeZona = (z: Zona) => [...z.objetos, z.jefe];

/** Anota un objeto. Devuelve si es nuevo y si con esto se completó la zona. */
export function anotarEnAlbum(album: Album, zona: Zona, objetoId: string): { nuevo: boolean; completo: boolean } {
  if (!fichasDeZona(zona).includes(objetoId)) return { nuevo: false, completo: false };
  const lista = (album[zona.id] ??= []);
  if (lista.includes(objetoId)) return { nuevo: false, completo: false };
  lista.push(objetoId);
  return { nuevo: true, completo: zonaCompleta(album, zona) };
}

export function zonaCompleta(album: Album, zona: Zona): boolean {
  const lista = album[zona.id] ?? [];
  return fichasDeZona(zona).every((id) => lista.includes(id));
}

/** Monedas x(1 + bonusPorZona × zonas completas). */
export function bonusAlbum(b: Balance, album: Album): number {
  const completas = b.zonas.filter((z) => zonaCompleta(album, z)).length;
  return 1 + b.album.bonusPorZona * completas;
}
