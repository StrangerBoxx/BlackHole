// Arrastrar y lanzar: qué objeto toma el dedo y con qué velocidad sale al soltar.

export interface PuntoRastro {
  x: number;
  y: number;
  /** Momento en milisegundos. */
  t: number;
}

export interface OpcionesLanzamiento {
  velocidadMaxima: number;
  ventanaMs: number;
  dtMinimo: number;
}

/** Guarda la posición del dedo; solo se recuerdan los últimos `maxPuntos`. */
export function agregarPunto(rastro: PuntoRastro[], p: PuntoRastro, maxPuntos: number): void {
  rastro.push(p);
  while (rastro.length > maxPuntos) rastro.shift();
}

/**
 * Velocidad del lanzamiento = cuánto se movió el dedo en los últimos `ventanaMs` ms.
 * Si el dedo estaba quieto (menos de 2 puntos recientes) devuelve 0 (el objeto queda donde lo soltaste).
 * Nunca pasa de `velocidadMaxima`.
 */
export function velocidadLanzamiento(
  rastro: PuntoRastro[],
  ahoraMs: number,
  op: OpcionesLanzamiento,
): { vx: number; vy: number } {
  const recientes = rastro.filter((p) => ahoraMs - p.t < op.ventanaMs);
  if (recientes.length < 2) return { vx: 0, vy: 0 };
  const a = recientes[0], b = recientes[recientes.length - 1];
  const dt = Math.max((b.t - a.t) / 1000, op.dtMinimo);
  let vx = (b.x - a.x) / dt, vy = (b.y - a.y) / dt;
  const v = Math.hypot(vx, vy);
  if (v > op.velocidadMaxima) {
    vx *= op.velocidadMaxima / v;
    vy *= op.velocidadMaxima / v;
  }
  return { vx, vy };
}

/**
 * Índice del objeto más cercano al dedo, si el dedo está a menos de `r + margen`.
 * Ignora los que van cayendo al hoyo y los que no se pueden agarrar. Devuelve -1 si no hay ninguno.
 */
export function elegirObjeto(
  cuerpos: { x: number; y: number; r: number; cayendo: boolean; agarrable?: boolean }[],
  x: number,
  y: number,
  margen: number,
): number {
  let mejor = -1, mejorD = Infinity;
  cuerpos.forEach((c, i) => {
    if (c.cayendo || c.agarrable === false) return;
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < c.r + margen && d < mejorD) { mejor = i; mejorD = d; }
  });
  return mejor;
}

/** Mantiene el objeto agarrado dentro del mundo. */
export function limitarAlMundo(x: number, y: number, r: number, ancho: number, alto: number) {
  return {
    x: Math.max(r, Math.min(ancho - r, x)),
    y: Math.max(r, Math.min(alto - r, y)),
  };
}
