// Guardado automático en el dispositivo (equivale a user://save.json).
// En el navegador y en la app de Android (Capacitor) se usa localStorage, que queda en el teléfono.
import type { Balance } from "../logica/balance";
import { calcularOffline } from "../logica/economia";
import { deserializar, serializar } from "../logica/guardado";
import type { Progreso } from "./Progreso";

export const CLAVE_GUARDADO = "black-hole-save";

function leer(): string | null {
  try {
    return localStorage.getItem(CLAVE_GUARDADO);
  } catch {
    return null; // navegador sin almacenamiento (modo privado estricto): se juega sin guardar
  }
}

function escribir(texto: string): void {
  try {
    localStorage.setItem(CLAVE_GUARDADO, texto);
  } catch {
    /* sin almacenamiento: no se guarda */
  }
}

/**
 * Carga la partida guardada, paga la ganancia offline y deja el guardado automático andando:
 * cada vez que cambia algo (tragar, comprar, reiniciar) se guarda al tiro,
 * y también al esconder la app (por si el sistema la cierra).
 * Devuelve lo que se ganó con el juego cerrado (para avisarlo).
 */
export function iniciarGuardado(p: Progreso, b: Balance): { segundos: number; monedas: number } {
  const estado = deserializar(leer(), b);
  p.cargar(estado);
  const offline = calcularOffline(b, estado, Date.now());
  if (offline.monedas > 0) p.agregarMonedas(offline.monedas);

  const guardar = () => escribir(serializar({ ...p.exportar(), ultimaVez: Date.now() }));
  guardar();
  p.alCambiar(guardar);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") guardar();
  });
  window.addEventListener("pagehide", guardar);
  // Cada 30 s, para que "ultimaVez" no quede vieja si no pasa nada
  setInterval(guardar, 30000);
  return offline;
}
