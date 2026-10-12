// Fórmulas de tono y volumen (el "pitch_scale" de Godot = "rate" en Phaser).
import type { Balance } from "./balance";

type ConfigSonido = Balance["sonido"];

/** Tamaño del objeto de 0 a 1 (el robot, r=56, es 1). */
export const tamanoRelativo = (r: number, radioReferencia: number) => Math.min(1, r / radioReferencia);

/** "tragar" más grave con objetos grandes: tonoBase - tamaño * tonoPorTamano (1.3 - tamaño*0.6). */
export function tonoTragar(r: number, s: ConfigSonido): number {
  return s.tragar.tonoBase - tamanoRelativo(r, s.tragar.radioReferencia) * s.tragar.tonoPorTamano;
}

/** "tragar" más fuerte con objetos grandes; ya multiplicado por el volumen del archivo. */
export function volumenTragar(r: number, s: ConfigSonido): number {
  const t = tamanoRelativo(r, s.tragar.radioReferencia);
  return (s.tragar.volumenBase + t * s.tragar.volumenPorTamano) * s.volumen.tragar;
}

/** "moneda" sube medio tono por cada combo: 2^(combo/12), con tope de 12 semitonos (una octava). */
export function tonoMoneda(combo: number, s: ConfigSonido): number {
  return Math.pow(2, Math.min(combo, s.moneda.semitonosMaximo) / 12);
}
