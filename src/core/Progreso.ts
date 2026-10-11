// Progreso del jugador (equivale al Autoload Progreso.gd): monedas, objetos tragados y niveles.
// Un solo objeto compartido por todo el juego. No depende de Phaser, así se puede testear.
import type { Balance, IdMejora, TipoObjeto } from "../logica/balance";
import { costoMejora, estadisticas, nivelesIniciales, puedeComprar, type Niveles } from "../logica/mejoras";
import { objetosDesbloqueados } from "../logica/objetos";

export interface EstadoProgreso {
  monedas: number;
  /** Objetos tragados en total. */
  total: number;
  niveles: Niveles;
}

export type ResultadoCompra =
  | { comprado: false }
  | { comprado: true; nivel: number; costo: number; nuevosObjetos: TipoObjeto[] };

type Oyente = (estado: Readonly<EstadoProgreso>) => void;

export class Progreso {
  private estado: EstadoProgreso = Progreso.vacio();
  private oyentes = new Set<Oyente>();

  static vacio(): EstadoProgreso {
    return { monedas: 0, total: 0, niveles: nivelesIniciales() };
  }

  get monedas(): number {
    return this.estado.monedas;
  }
  get total(): number {
    return this.estado.total;
  }
  get niveles(): Readonly<Niveles> {
    return this.estado.niveles;
  }

  /** Llamar cuando el hoyo termina de tragarse un objeto. */
  registrarTragado(monedas: number): void {
    this.estado.monedas += monedas;
    this.estado.total += 1;
    this.avisar();
  }

  /**
   * Compra un nivel de una mejora si alcanza la plata.
   * Devuelve los objetos que se desbloquearon con esta compra (para avisar "¡Nuevo objeto!").
   */
  comprar(b: Balance, id: IdMejora): ResultadoCompra {
    const m = b.mejoras.find((x) => x.id === id);
    if (!m) return { comprado: false };
    const nivel = this.estado.niveles[id];
    if (!puedeComprar(m, nivel, this.estado.monedas)) return { comprado: false };

    const antes = objetosDesbloqueados(b, estadisticas(b, this.estado.niveles).radioHoyo);
    const costo = costoMejora(m, nivel);
    this.estado.monedas -= costo;
    this.estado.niveles[id] = nivel + 1;
    const despues = objetosDesbloqueados(b, estadisticas(b, this.estado.niveles).radioHoyo);
    this.avisar();
    return {
      comprado: true,
      nivel: nivel + 1,
      costo,
      nuevosObjetos: despues.filter((t) => !antes.includes(t)),
    };
  }

  /** Avisa cada vez que algo cambia. Devuelve una función para dejar de escuchar. */
  alCambiar(fn: Oyente): () => void {
    this.oyentes.add(fn);
    return () => this.oyentes.delete(fn);
  }

  private avisar(): void {
    for (const fn of this.oyentes) fn(this.estado);
  }
}

/** El progreso del juego (único). */
export const progreso = new Progreso();
