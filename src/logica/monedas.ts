// Monedas que da cada objeto y el combo por tragar seguido.

/** Monedas por objeto tragado = valor del objeto × multiplicador de "Valor", redondeado. */
export function monedasPorObjeto(valor: number, multiplicador: number): number {
  return Math.round(valor * multiplicador);
}

/**
 * Combo: si el hoyo se traga otro objeto antes de `ventana` segundos, el combo sube en 1.
 * Si no, vuelve a 0. El primer objeto de una racha es combo 0, el segundo 1, el tercero 2...
 */
export class Combo {
  valor = 0;
  private ultimo = -Infinity;

  constructor(private readonly ventana: number) {}

  /** Registra un objeto tragado en el segundo `t` y devuelve el combo nuevo. */
  registrar(t: number): number {
    this.valor = t - this.ultimo < this.ventana ? this.valor + 1 : 0;
    this.ultimo = t;
    return this.valor;
  }

  /** Cuántos objetos van seguidos (combo + 1). */
  get seguidos(): number {
    return this.valor + 1;
  }
}

/** Texto del aviso de combo, o null si todavía no hay que mostrarlo (desde el 3.º seguido). */
export function textoCombo(combo: number, mostrarDesde: number): string | null {
  const seguidos = combo + 1;
  return seguidos >= mostrarDesde ? `¡Combo x${seguidos}!` : null;
}

/** Números cortos para el marcador: 999 · 1.2k · 45k · 3.4M */
export function formatearNumero(n: number): string {
  if (n < 1000) return String(Math.floor(n));
  if (n < 1e6) return (n / 1e3).toFixed(n < 1e4 ? 1 : 0) + "k";
  return (n / 1e6).toFixed(1) + "M";
}
