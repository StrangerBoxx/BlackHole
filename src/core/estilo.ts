import type { IdEspecial, TipoObjeto } from "../logica/balance";
import type { IdTiro } from "../logica/tiros";

// Colores y fuentes de la interfaz (los mismos del prototipo).

export const COLOR = {
  tierra: "#1d1712",
  tierra2: "#2a2119",
  linea: "#3d3127",
  texto: "#f3ead9",
  apagado: "#a89a85",
  acento: "#b98cff",
  oro: "#ffc65c",
  peligro: "#ff8a7a",
  tiro: "#d7b8ff",
  contornoOro: "#28190a",
} as const;

export const FUENTE_TITULO = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
export const FUENTE_TEXTO = '"Nunito", system-ui, sans-serif';

/** Lo que se avisa cuando el hoyo termina de tragarse algo (evento "tragado"). */
export interface InfoTragado {
  tipo: TipoObjeto;
  monedas: number;
  especial: IdEspecial | null;
  tiros: IdTiro[];
  combo: number;
  /** Era el jefe de la zona. */
  jefe: boolean;
}

/** "#rrggbb" → número para Phaser (0xrrggbb). */
export const hex = (c: string) => parseInt(c.slice(1), 16);

/** Bus de eventos entre escenas (game.events). */
export const EVENTOS_GLOBALES = {
  /** Un objeto empieza a caer al hoyo: (tipo: TipoObjeto) */
  CAPTURA: "captura",
  /** Un objeto terminó de caer: (info: InfoTragado) */
  TRAGADO: "tragado",
  /** Mostrar un aviso abajo: (texto: string, segundos: number) */
  AVISO: "aviso",
  /** Tiros especiales logrados: (ids: IdTiro[]) */
  TIRO: "tiro",
  /** Combo nuevo: (combo: number) */
  COMBO: "combo",
  /** Se compró una mejora sin desbloquear nada: (id: IdMejora, nivel: number) */
  COMPRA: "compra",
  /** Se compró una mejora que desbloqueó objetos: (objetos: TipoObjeto[]) */
  DESBLOQUEO: "desbloqueo",
  /** Se borró el progreso: el pasto vuelve a empezar. */
  REINICIO: "reinicio",
} as const;
