import type { IdEspecial, TipoObjeto } from "../logica/balance";
import type { IdTiro } from "../logica/tiros";

// Colores y fuentes de la interfaz: estilo "laboratorio blanco".

export const COLOR = {
  /** Fondo general (alrededor del mundo). */
  fondo: "#e3e8eb",
  /** Paneles de acero claro (barra de arriba, tienda, panel de menú). */
  panel: "#f4f6f8",
  /** Fondo de botones y tarjetas. */
  boton: "#ffffff",
  /** Bordes y líneas finas. */
  linea: "#c3ccd3",
  texto: "#22303b",
  apagado: "#6b7a86",
  /** Cian: acento principal (pestañas, álbum, halo). */
  acento: "#1a9fd6",
  /** Naranja: chips de energía, costos, "se puede comprar". */
  chip: "#f07a1c",
  peligro: "#d9433b",
  tiro: "#1a9fd6",
  /** Contorno oscuro de los textos que flotan sobre el piso claro. */
  contorno: "#1d2a35",
  /** Avisos: cartel oscuro con letras claras. */
  oscuro: "#22303b",
  textoClaro: "#f4f6f8",
  /** Fondos suaves para resaltar (pestaña activa, botón cobrar, tarjeta de colapso). */
  cianSuave: "#d9eff9",
  naranjaSuave: "#fde7d4",
  moradoSuave: "#ebe7fb",
} as const;

export const FUENTE_TITULO = '"Rajdhani", "Arial Narrow", sans-serif';
export const FUENTE_TEXTO = '"IBM Plex Sans", system-ui, sans-serif';

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
  /** Se cumplió una misión: (mision: Mision) */
  MISION: "mision",
  /** Objeto nuevo en el álbum: (tipo: TipoObjeto, completo: boolean) */
  ALBUM: "album",
  /** El dron empujó un objeto. */
  DRON: "dron",
  /** Apareció el jefe de la zona: (tipo: TipoObjeto) */
  JEFE: "jefe",
  /** Tiros especiales logrados: (ids: IdTiro[]) */
  TIRO: "tiro",
  /** Combo nuevo: (combo: number) */
  COMBO: "combo",
  /** Se compró una mejora sin desbloquear nada: (id: IdMejora, nivel: number) */
  COMPRA: "compra",
  /** Se compró una mejora que desbloqueó objetos: (objetos: TipoObjeto[]) */
  DESBLOQUEO: "desbloqueo",
  /** Se desbloqueó un logro: (logro: DefLogro) */
  LOGRO: "logro",
  /** Se colapsó: ({ materia, zona }) */
  COLAPSO: "colapso",
  /** La escena de juego terminó de armarse (para los avisos del comienzo). */
  JUEGO_LISTO: "juegoListo",
  /** Se abrió o cerró el panel de Misiones/Álbum/Colapso: (abierto: boolean) */
  PANEL: "panel",
  /** Se borró el progreso: el pasto vuelve a empezar. */
  REINICIO: "reinicio",
} as const;
