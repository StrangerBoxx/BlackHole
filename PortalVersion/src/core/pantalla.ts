import Phaser from "phaser";

// El juego ocupa toda la pantalla: 720 de ancho fijo y el alto se ajusta a la forma del celular
// (entre 960 y 1600). La interfaz (marcador y dock) va encima, en HTML (src/ui/).

export const ANCHO_BASE = 720;
export const ALTO_MINIMO = 960;
export const ALTO_MAXIMO = 1600;

/**
 * Los objetos aparecen lejos del marcador (arriba) y del dock (abajo). Mínimo entre y=90 y alto−140;
 * si la interfaz está visible, se usa lo que de verdad ocupa (ver zonaLibre).
 */
export const APARICION_ARRIBA = 90;
export const APARICION_ABAJO = 140;
/** Espacio extra entre la interfaz y el objeto que aparece. */
const MARGEN_INTERFAZ = 12;

type MedirInterfaz = () => { arriba: number; abajo: number } | null;
let medirInterfaz: MedirInterfaz = () => null;

/** La interfaz (HTML) dice dónde terminan el marcador y dónde empieza el dock, en píxeles del juego. */
export function registrarMedidaInterfaz(fn: MedirInterfaz): void {
  medirInterfaz = fn;
}

/** Franja donde pueden aparecer objetos: entre el marcador y el dock (o la bandeja "Más" si está abierta). */
export function zonaLibre(): { arriba: number; abajo: number } {
  const alto = altoMundo();
  const medida = medirInterfaz();
  return {
    arriba: Math.max(APARICION_ARRIBA, (medida?.arriba ?? 0) + MARGEN_INTERFAZ),
    abajo: Math.min(alto - APARICION_ABAJO, (medida?.abajo ?? alto) - MARGEN_INTERFAZ),
  };
}

/** Alto del juego para una ventana de este tamaño (mismo ancho 720, misma forma, con límites). */
export function altoParaVentana(anchoVentana: number, altoVentana: number): number {
  if (anchoVentana <= 0 || altoVentana <= 0) return ALTO_MINIMO;
  const alto = Math.round((ANCHO_BASE * altoVentana) / anchoVentana);
  return Math.max(ALTO_MINIMO, Math.min(ALTO_MAXIMO, alto));
}

let altoActual = ALTO_MINIMO;

/** Alto actual del mundo (= alto del juego). */
export const altoMundo = () => altoActual;

/** Alto con el que arranca el juego. */
export function altoInicial(): number {
  altoActual = altoParaVentana(window.innerWidth, window.innerHeight);
  return altoActual;
}

/**
 * Cuando cambia el tamaño de la ventana (o se gira el celular), el juego cambia de alto.
 * Las escenas escuchan Phaser.Scale.Events.RESIZE para rearmar el suelo.
 */
export function seguirTamanoVentana(game: Phaser.Game): void {
  const ajustar = () => {
    const alto = altoParaVentana(window.innerWidth, window.innerHeight);
    if (alto === altoActual) return;
    altoActual = alto;
    game.scale.setGameSize(ANCHO_BASE, alto);
  };
  window.addEventListener("resize", ajustar);
}
