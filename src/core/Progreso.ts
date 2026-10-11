// Progreso del jugador (equivale al Autoload Progreso.gd): monedas, objetos tragados y niveles.
// Un solo objeto compartido por todo el juego. No depende de Phaser, así se puede testear.
import { nivelesIniciales, type Niveles } from "../logica/mejoras";

export interface EstadoProgreso {
  monedas: number;
  /** Objetos tragados en total. */
  total: number;
  niveles: Niveles;
}

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
