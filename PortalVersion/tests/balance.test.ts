import { describe, expect, it } from "vitest";
import { revisarBalance, type Balance } from "../src/logica/balance";
import balanceJson from "../public/data/balance.json";

const balance = balanceJson as Balance;

describe("balance.json", () => {
  it("no tiene errores de forma", () => {
    expect(revisarBalance(balance)).toEqual([]);
  });

  it("el laboratorio trae los 8 objetos originales en orden", () => {
    expect(balance.zonas[0].objetos).toEqual([
      "tornillo", "matraz", "casco", "extintor", "silla", "caja_herramientas", "servidor", "robot",
    ]);
  });

  it("detecta un archivo roto", () => {
    const roto = { ...balance, objetos: [] } as Balance;
    expect(revisarBalance(roto)).toContain("objetos vacío");
  });
});
