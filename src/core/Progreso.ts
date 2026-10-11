// Progreso del jugador (equivale al Autoload Progreso.gd): monedas, objetos tragados y niveles.
// Un solo objeto compartido por todo el juego. No depende de Phaser, así se puede testear.
// El guardado en el dispositivo lo hace core/Guardado.ts escuchando los cambios.
import { anotarEnAlbum, anotarEspecial, zonaCompleta } from "../logica/album";
import type { Azar } from "../logica/aparicion";
import type { Balance, IdMejora, IdPermanente, TipoObjeto, Zona } from "../logica/balance";
import { aplicarColapso, materiaPorColapso, puedeColapsar, type NivelesPermanentes } from "../logica/colapso";
import { anotarRecord, logrosNuevos, type DefLogro, type EventoRecord } from "../logica/logros";
import { estadoVacio, type EstadoProgreso } from "../logica/guardado";
import { costoMejora, estadisticas, puedeComprar, type Niveles } from "../logica/mejoras";
import {
  avanzarMisiones, crearMision, misionCumplida, premioMision, type EventoMision, type Mision,
} from "../logica/misiones";
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
  get hambre(): number {
    return this.estado.hambre;
  }
  get jefes(): number {
    return this.estado.jefes;
  }
  get materiaOscura(): number {
    return this.estado.materiaOscura;
  }
  get permanentes(): Readonly<Partial<NivelesPermanentes>> {
    return this.estado.permanentes;
  }
  get ganadasVuelta(): number {
    return this.estado.ganadasVuelta;
  }
  get colapsos(): number {
    return this.estado.colapsos;
  }

  /** Compra un nivel de una mejora permanente con materia oscura. */
  comprarPermanente(b: Balance, id: IdPermanente): boolean {
    const p = b.permanentes.find((x) => x.id === id);
    if (!p) return false;
    const nivel = this.estado.permanentes[id] ?? 0;
    if (!puedeComprar(p, nivel, this.estado.materiaOscura)) return false;
    this.estado.materiaOscura -= costoMejora(p, nivel);
    this.estado.permanentes[id] = nivel + 1;
    this.avisar();
    return true;
  }

  /** Colapsa (si se puede): pasa a la siguiente zona y suma materia oscura. */
  colapsar(b: Balance): { materia: number; zona: number } | null {
    if (!puedeColapsar(b, this.estado)) return null;
    const materia = materiaPorColapso(b, this.estado.ganadasVuelta);
    this.estado = aplicarColapso(b, this.estado);
    this.avisar();
    return { materia, zona: this.estado.zona };
  }

  get misiones(): readonly Readonly<Mision>[] {
    return this.estado.misiones;
  }
  /** Cuántas fichas del álbum hay en una zona. */
  fichasAlbum(zonaId: string): readonly string[] {
    return this.estado.album[zonaId] ?? [];
  }
  albumCompleto(zona: Zona): boolean {
    return zonaCompleta(this.estado.album, zona);
  }

  /** Anota un objeto tragado en el álbum. */
  anotarAlbum(zona: Zona, objetoId: string): { nuevo: boolean; completo: boolean } {
    const r = anotarEnAlbum(this.estado.album, zona, objetoId);
    if (r.nuevo) this.avisar();
    return r;
  }

  /** Anota un objeto especial (Bing Bong) en el álbum. Devuelve true si es nuevo. */
  anotarEspecialAlbum(b: Balance, objetoId: string): boolean {
    const nuevo = anotarEspecial(this.estado.album, b, objetoId);
    if (nuevo) this.avisar();
    return nuevo;
  }

  /** Crea misiones hasta tener las activas que pide el balance. */
  completarMisiones(b: Balance, objetosZona: TipoObjeto[], escalaMonedas: number, azar: Azar): void {
    let cambio = false;
    while (this.estado.misiones.length < b.misiones.activas) {
      this.estado.misiones.push(crearMision(b, this.estado.misiones, objetosZona, escalaMonedas, azar));
      cambio = true;
    }
    if (cambio) this.avisar();
  }

  /** Suma progreso a las misiones; devuelve las recién cumplidas. */
  avanzarMisiones(b: Balance, ev: EventoMision): Mision[] {
    const recien = avanzarMisiones(b, this.estado.misiones, ev);
    this.avisar();
    return recien;
  }

  /**
   * Cobra una misión cumplida: suma el premio y la reemplaza por una nueva.
   * Devuelve el premio (0 si no estaba cumplida).
   */
  cobrarMision(b: Balance, indice: number, multiplicador: number, objetosZona: TipoObjeto[], escalaMonedas: number, azar: Azar): number {
    const m = this.estado.misiones[indice];
    if (!m || !misionCumplida(m)) return 0;
    const premio = premioMision(b, m, multiplicador);
    this.estado.monedas += premio;
    this.estado.ganadasVuelta += premio;
    const resto = this.estado.misiones.filter((_, i) => i !== indice);
    this.estado.misiones[indice] = crearMision(b, resto, objetosZona, escalaMonedas, azar);
    this.avisar();
    return premio;
  }

  /** Suma hambre (ya limitada a la meta por quien llama). */
  ponerHambre(valor: number): void {
    this.estado.hambre = valor;
    this.avisar();
  }

  /** Se comió al jefe: la barra vuelve a 0 y la próxima meta es más alta. */
  jefeComido(): void {
    this.estado.hambre = 0;
    this.estado.jefes += 1;
    this.avisar();
  }

  /** Copia del estado (para guardar). */
  exportar(): EstadoProgreso {
    return structuredClone(this.estado);
  }

  /** Reemplaza todo el estado (al cargar una partida guardada). */
  cargar(e: EstadoProgreso): void {
    this.estado = structuredClone(e);
    this.avisar();
  }

  /** Borra todo y vuelve a empezar. */
  reiniciar(): void {
    this.cargar(estadoVacio());
  }

  /** Llamar cuando el hoyo termina de tragarse un objeto. */
  registrarTragado(monedas: number): void {
    this.estado.monedas += monedas;
    this.estado.ganadasVuelta += monedas;
    this.estado.total += 1;
    this.avisar();
  }

  /** Anota un objeto tragado en los récords de por vida (para los logros). */
  anotarRecords(ev: EventoRecord): void {
    anotarRecord(this.estado.records, ev);
  }

  /** Marca como desbloqueados los logros recién cumplidos y los devuelve (para avisar). */
  revisarLogros(b: Balance): DefLogro[] {
    const nuevos = logrosNuevos(b, this.estado);
    if (nuevos.length === 0) return [];
    this.estado.logros.push(...nuevos.map((l) => l.id));
    this.avisar();
    return nuevos;
  }

  get logros(): readonly string[] {
    return this.estado.logros;
  }

  /** Suma materia oscura (panel de debug). */
  agregarMateria(n: number): void {
    this.estado.materiaOscura = Math.max(0, this.estado.materiaOscura + n);
    this.avisar();
  }

  /** Cambia de zona directo, sin colapsar (panel de debug). */
  irAZona(b: Balance, zona: number): void {
    this.estado.zona = Math.max(0, Math.min(b.zonas.length - 1, zona));
    this.estado.misiones = [];
    this.estado.hambre = 0;
    this.avisar();
  }

  /** Suma monedas sin contar objetos (offline, debug). */
  agregarMonedas(n: number): void {
    this.estado.monedas = Math.max(0, this.estado.monedas + n);
    if (n > 0) this.estado.ganadasVuelta += n;
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
