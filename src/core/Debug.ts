// Opciones del panel de debug. En la versión final (npm run build) el panel no existe
// y estas opciones quedan siempre apagadas.
export const debug = {
  /** Dibuja los círculos de choque, el radio del hoyo y el radio de atracción. */
  mostrarCirculos: false,
  /** 1 = normal, 2 = el juego corre al doble. */
  velocidad: 1 as 1 | 2,
};
