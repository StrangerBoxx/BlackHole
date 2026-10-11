import { describe, expect, it } from "vitest";
import { revisarBalance, type Balance } from "../src/logica/balance";
import balanceJson from "../public/data/balance.json";

const balance = balanceJson as Balance;

describe("balance.json", () => {
  it("no tiene errores de forma", () => {
    expect(revisarBalance(balance)).toEqual([]);
  });

  it("trae los 8 objetos en orden", () => {
    expect(balance.objetos.map((o) => o.id)).toEqual([
      "piedra", "lata", "pelota", "cono", "neumatico", "caja", "basurero", "auto",
    ]);
  });

  it("detecta un archivo roto", () => {
    const roto = { ...balance, objetos: [] } as Balance;
    expect(revisarBalance(roto)).toContain("objetos vacío");
  });
});
