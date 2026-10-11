// El hoyo: atrae objetos cercanos y se traga los que entran despacio.
import { rapidez, type Cuerpo } from "./fisica";

export interface Punto {
  x: number;
  y: number;
}

/**
 * Distancia al hoyo vista "en perspectiva": el hoyo se ve inclinado (un óvalo más bajo que ancho),
 * así que la distancia vertical cuenta 1/inclinacion veces más. Con inclinacion = 1 es la distancia normal.
 */
export function distanciaInclinada(dx: number, dy: number, inclinacion = 1): number {
  return Math.hypot(dx, dy / inclinacion);
}

/**
 * Fuerza de atracción a cierta distancia del centro.
 * Dentro del radio: fuerza * (1 - dist/radio) + fuerza * fraccionMinima. Fuera: 0.
 */
export function fuerzaAtraccion(dist: number, radio: number, fuerza: number, fraccionMinima: number): number {
  if (dist >= radio || dist <= 1) return 0;
  return fuerza * (1 - dist / radio) + fuerza * fraccionMinima;
}

/**
 * Empuja la velocidad del objeto hacia el centro del hoyo (a los pesados les cuesta más).
 * El radio de atracción es un óvalo si el hoyo se ve inclinado.
 */
export function aplicarAtraccion(
  c: Cuerpo,
  hoyo: Punto,
  radio: number,
  fuerza: number,
  fraccionMinima: number,
  dt: number,
  inclinacion = 1,
): void {
  const dx = hoyo.x - c.x, dy = hoyo.y - c.y;
  const f = fuerzaAtraccion(distanciaInclinada(dx, dy, inclinacion), radio, fuerza, fraccionMinima);
  if (f === 0) return;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  c.vx += ((dx / dist) * f * dt) / c.peso;
  c.vy += ((dy / dist) * f * dt) / c.peso;
}

/** Gravedad pasiva: un tirón suave y constante hacia el hoyo, desde cualquier parte del pasto. */
export function aplicarGravedadPasiva(c: Cuerpo, hoyo: Punto, aceleracion: number, dt: number): void {
  if (aceleracion <= 0) return;
  const dx = hoyo.x - c.x, dy = hoyo.y - c.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return;
  c.vx += ((dx / dist) * aceleracion * dt) / c.peso;
  c.vy += ((dy / dist) * aceleracion * dt) / c.peso;
}

/**
 * ¿Se lo traga? El centro del objeto tiene que estar bien adentro
 * (dist < radioHoyo - r*margen) y tiene que ir más lento que la velocidad de captura.
 * Con el hoyo inclinado, "adentro" es dentro del óvalo.
 */
export function puedeTragar(
  c: { x: number; y: number; vx: number; vy: number; r: number },
  hoyo: Punto,
  radioHoyo: number,
  velocidadCaptura: number,
  margenRadioObjeto: number,
  inclinacion = 1,
): boolean {
  const dist = distanciaInclinada(hoyo.x - c.x, hoyo.y - c.y, inclinacion);
  return dist < radioHoyo - c.r * margenRadioObjeto && rapidez(c) < velocidadCaptura;
}

export interface OpcionesCaida {
  caidaSegundos: number;
  caidaAcercamiento: number;
  caidaGiro: number;
}

/**
 * Un paso de la caída en espiral: se acerca al centro, gira rápido y se achica.
 * `t` es el tiempo que lleva cayendo (ya sumado dt). Devuelve la escala (1 → 0) y si terminó.
 */
export function avanzarCaida(c: Cuerpo, hoyo: Punto, t: number, dt: number, op: OpcionesCaida) {
  const progreso = Math.min(t / op.caidaSegundos, 1);
  const k = Math.min(1, dt * op.caidaAcercamiento);
  c.x += (hoyo.x - c.x) * k;
  c.y += (hoyo.y - c.y) * k;
  c.angulo += dt * op.caidaGiro;
  return { escala: 1 - progreso, terminado: progreso >= 1 };
}
