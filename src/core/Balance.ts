import type { Balance } from "../logica/balance";

// El balance se lee de public/data/balance.json al arrancar (CargaScene).
// Después cualquier parte del juego lo pide con getBalance().
let actual: Balance | null = null;

export function setBalance(b: Balance): void {
  actual = b;
}

export function getBalance(): Balance {
  if (!actual) throw new Error("El balance todavía no se cargó");
  return actual;
}
