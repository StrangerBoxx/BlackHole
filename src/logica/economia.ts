// Cuentas que mezclan varias partes del progreso (zona, mejoras...).
import type { Balance } from "./balance";
import type { EstadoProgreso } from "./guardado";
import { estadisticas } from "./mejoras";
import { objetosDesbloqueados, zonaDe } from "./objetos";
import { gananciaOffline, valorPromedio } from "./offline";

/** Multiplicador que se aplica a TODO lo tragado: zona × mejora Valor. */
export function multiplicadorSiempre(b: Balance, e: EstadoProgreso): number {
  return zonaDe(b, e.zona).multiplicadorValor * estadisticas(b, e.niveles).multiplicadorValor;
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
      horasMaximas: b.offline.horasMaximas,
      hayDron: s.hayDron,
      intervaloDron: s.intervaloDron,
      valorObjeto: valorPromedio(tipos, b.aparicion.pesoBase, b.aparicion.pesoPorIndice),
      multiplicador: multiplicadorSiempre(b, e),
    },
    b.offline,
  );
  return { segundos, monedas };
}
