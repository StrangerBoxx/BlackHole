// Física simple de círculos vistos desde arriba (sin gravedad).
// Copia el comportamiento del prototipo: roce, rebote en bordes y choques entre objetos.

export interface Cuerpo {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  angulo: number;
  giro: number;
  /** Lo tiene el dedo: no se mueve solo y los choques no lo empujan. */
  arrastrado: boolean;
  /** Va cayendo al hoyo: ya no choca. */
  cayendo: boolean;
}

export function crearCuerpo(x: number, y: number, r: number, angulo = 0): Cuerpo {
  return { x, y, vx: 0, vy: 0, r, angulo, giro: 0, arrastrado: false, cayendo: false };
}

export const rapidez = (c: { vx: number; vy: number }) => Math.hypot(c.vx, c.vy);

/** Roce con el pasto (como linear_damp de Godot). */
export function aplicarRoce(c: Cuerpo, rozamiento: number, dt: number): void {
  const k = Math.max(0, 1 - rozamiento * dt);
  c.vx *= k;
  c.vy *= k;
}

/** Avanza la posición y hace girar el objeto según lo rápido que va (parece que rueda). */
export function mover(c: Cuerpo, dt: number, giroPorVelocidad: number): void {
  c.x += c.vx * dt;
  c.y += c.vy * dt;
  c.angulo += c.giro * dt;
  c.giro = rapidez(c) * giroPorVelocidad;
}

/** Rebota contra los bordes del mundo perdiendo energía. Devuelve true si tocó un borde. */
export function rebotarBordes(c: Cuerpo, ancho: number, alto: number, rebote: number): boolean {
  let toco = false;
  if (c.x < c.r) { c.x = c.r; c.vx = Math.abs(c.vx) * rebote; toco = true; }
  if (c.x > ancho - c.r) { c.x = ancho - c.r; c.vx = -Math.abs(c.vx) * rebote; toco = true; }
  if (c.y < c.r) { c.y = c.r; c.vy = Math.abs(c.vy) * rebote; toco = true; }
  if (c.y > alto - c.r) { c.y = alto - c.r; c.vy = -Math.abs(c.vy) * rebote; toco = true; }
  return toco;
}

/**
 * Separa los círculos que se pisan y les da un rebote.
 * La masa es r² (un auto empuja más que una piedra).
 * El objeto arrastrado cuenta como de masa infinita: empuja pero no lo empujan.
 */
export function resolverChoques(cuerpos: Cuerpo[], rebote: number, alChocar?: (a: Cuerpo, b: Cuerpo) => void): void {
  for (let i = 0; i < cuerpos.length; i++) {
    for (let j = i + 1; j < cuerpos.length; j++) {
      const a = cuerpos[i], b = cuerpos[j];
      if (a.cayendo || b.cayendo) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d = Math.hypot(dx, dy), min = a.r + b.r;
      if (d >= min || d === 0) continue;
      alChocar?.(a, b);
      const nx = dx / d, ny = dy / d, solape = min - d;
      // Inverso de la masa: cuánto "cede" cada uno. El arrastrado cede 0.
      const ia = a.arrastrado ? 0 : 1 / (a.r * a.r);
      const ib = b.arrastrado ? 0 : 1 / (b.r * b.r);
      const tot = ia + ib;
      if (tot === 0) continue;
      a.x -= nx * solape * (ia / tot); a.y -= ny * solape * (ia / tot);
      b.x += nx * solape * (ib / tot); b.y += ny * solape * (ib / tot);
      const rel = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
      if (rel < 0) {
        const imp = (-(1 + rebote) * rel) / tot;
        a.vx -= imp * ia * nx; a.vy -= imp * ia * ny;
        b.vx += imp * ib * nx; b.vy += imp * ib * ny;
      }
    }
  }
}

export interface OpcionesFisica {
  ancho: number;
  alto: number;
  rozamiento: number;
  rebote: number;
  giroPorVelocidad: number;
  /** Fuerzas extra antes del roce (aquí entra la atracción del hoyo). */
  antesDeMover?: (c: Cuerpo, dt: number) => void;
  /** Revisión después de mover (aquí entra la captura del hoyo). */
  despuesDeMover?: (c: Cuerpo) => void;
  /** Avisos para los tiros especiales. */
  alTocarBorde?: (c: Cuerpo) => void;
  alChocar?: (a: Cuerpo, b: Cuerpo) => void;
}

/** Un paso completo de física para los objetos sueltos (ni arrastrados ni cayendo). */
export function pasoFisica(cuerpos: Cuerpo[], dt: number, op: OpcionesFisica): void {
  for (const c of cuerpos) {
    if (c.arrastrado || c.cayendo) continue;
    op.antesDeMover?.(c, dt);
    aplicarRoce(c, op.rozamiento, dt);
    mover(c, dt, op.giroPorVelocidad);
    if (rebotarBordes(c, op.ancho, op.alto, op.rebote)) op.alTocarBorde?.(c);
    op.despuesDeMover?.(c);
  }
  resolverChoques(cuerpos, op.rebote, op.alChocar);
}
