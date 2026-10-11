// Progreso del jugador (equivale al Autoload Progreso.gd): monedas, objetos tragados y niveles.
// Un solo objeto compartido por todo el juego. No depende de Phaser, así se puede testear.
// El guardado en el dispositivo lo hace core/Guardado.ts escuchando los cambios.
import type { Balance, IdMejora, TipoObjeto } from "../logica/balance";
import { estadoVacio, type EstadoProgreso } from "../logica/guardado";
import { costoMejora, estadisticas, puedeComprar, type Niveles } from "../logica/mejoras";
import { objetosDesbloqueados, zonaDe } from "../logica/objetos";

export type { EstadoProgreso };

export type ResultadoCompra =
  | { comprado: false }
  | { comprado: true; nivel: number; costo: number; nuevosObjetos: TipoObjeto[] };

type Oyente = (estado: Readonly<EstadoProgreso>) => void;

export class Progreso {
  private estado: EstadoProgreso = estadoVacio();
  private oyentes = new Set<Oyente>();

  get monedas(): number {
    return this.estado.monedas;
  }
  get total(): number {
    return this.estado.total;
  }
  get niveles(): Readonly<Niveles> {
    return this.estado.niveles;
  }
  get zona(): number {
    return this.estado.zona;
  }

  /** Copia del estado (para guardar). */
  exportar(): EstadoProgreso {
    return { ...this.estado, niveles: { ...this.estado.niveles } };
  }

  /** Reemplaza todo el estado (al cargar una partida guardada). */
  cargar(e: EstadoProgreso): void {
    this.estado = { ...e, niveles: { ...e.niveles } };
    this.avisar();
  }

  /** Borra todo y vuelve a empezar. */
  reiniciar(): void {
    this.cargar(estadoVacio());
  }

  /** Llamar cuando el hoyo termina de tragarse un objeto. */
  registrarTragado(monedas: number): void {
    this.estado.monedas += monedas;
    this.estado.total += 1;
    this.avisar();
  }

  /** Suma monedas sin contar objetos (panel de debug). */
  agregarMonedas(n: number): void {
    this.estado.monedas = Math.max(0, this.estado.monedas + n);
    this.avisar();
  }

  /** Sube o baja un nivel gratis, sin salir de 0..máximo (panel de debug). */
  cambiarNivel(b: Balance, id: IdMejora, delta: number): void {
    const max = b.mejoras.find((m) => m.id === id)?.max ?? 0;
    this.estado.niveles[id] = Math.max(0, Math.min(max, this.estado.niveles[id] + delta));
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

    const zona = zonaDe(b, this.estado.zona);
    const antes = objetosDesbloqueados(b, zona, estadisticas(b, this.estado.niveles).radioHoyo);
    const costo = costoMejora(m, nivel);
    this.estado.monedas -= costo;
    this.estado.niveles[id] = nivel + 1;
    const despues = objetosDesbloqueados(b, zona, estadisticas(b, this.estado.niveles).radioHoyo);
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
