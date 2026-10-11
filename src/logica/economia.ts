// Cuentas que mezclan varias partes del progreso (zona, mejoras...).
import { bonusAlbum } from "./album";
import type { Balance } from "./balance";
import type { EstadoProgreso } from "./guardado";
import { estadisticas } from "./mejoras";
import { objetosDesbloqueados, zonaDe } from "./objetos";
import { gananciaOffline, valorPromedio } from "./offline";
import { estadisticasPermanentes } from "./colapso";

/** Multiplicador que se aplica a TODO lo tragado: zona × mejora Valor × álbum × Valor eterno. */
export function multiplicadorSiempre(b: Balance, e: EstadoProgreso): number {
  return (
    zonaDe(b, e.zona).multiplicadorValor *
    estadisticas(b, e.niveles).multiplicadorValor *
    bonusAlbum(b, e.album) *
    estadisticasPermanentes(b, e.permanentes).multiplicadorPermanente
  );
}

/** Monedas ganadas mientras el juego estuvo cerrado (desde e.ultimaVez hasta `ahoraMs`). */
export function calcularOffline(b: Balance, e: EstadoProgreso, ahoraMs: number): { segundos: number; monedas: number } {
  if (!e.ultimaVez) return { segundos: 0, monedas: 0 };
  const segundos = Math.max(0, (ahoraMs - e.ultimaVez) / 1000);
  const s = estadisticas(b, e.niveles);
  const tipos = objetosDesbloqueados(b, zonaDe(b, e.zona), s.radioHoyo);
  const monedas = gananciaOffline(
    {
      segundos,
      horasMaximas: b.offline.horasMaximas + estadisticasPermanentes(b, e.permanentes).horasOfflineExtra,
      hayDron: s.hayDron,
      intervaloDron: s.intervaloDron,
      valorObjeto: valorPromedio(tipos, b.aparicion.pesoBase, b.aparicion.pesoPorIndice),
      multiplicador: multiplicadorSiempre(b, e),
    },
    b.offline,
  );
  return { segundos, monedas };
}

/** Datos para crear y cobrar misiones en la zona actual. */
export function contextoMisiones(b: Balance, e: EstadoProgreso) {
  const zona = zonaDe(b, e.zona);
  return {
    objetosZona: objetosDesbloqueados(b, zona, estadisticas(b, e.niveles).radioHoyo),
    escalaMonedas: zona.multiplicadorValor,
    multiplicador: multiplicadorSiempre(b, e),
  };
}
