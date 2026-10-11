import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { estadisticas, nivelesIniciales, valorEfecto } from "../src/logica/mejoras";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;

describe("efectos de las mejoras", () => {
  it("nivel 0: valores iniciales del hoyo", () => {
    expect(estadisticas(b, nivelesIniciales())).toEqual({
      radioAtraccion: 55,
      fuerza: 700,
      radioHoyo: 28,
      velocidadCaptura: 420,
      maxObjetos: 4,
      intervaloAparicion: 1.6,
      multiplicadorValor: 1,
    });
  });

  it("cada mejora cambia sus valores según la tabla", () => {
    const s = estadisticas(b, { pull: 3, force: 2, size: 7, spawn: 5, value: 4 });
    expect(s.radioAtraccion).toBe(55 + 3 * 28);
    expect(s.fuerza).toBe(700 + 2 * 420);
    expect(s.radioHoyo).toBe(28 + 7 * 5);
    expect(s.velocidadCaptura).toBe(420 + 7 * 110);
    expect(s.maxObjetos).toBe(9);
    expect(s.intervaloAparicion).toBeCloseTo(1.6 * Math.pow(0.86, 5));
    expect(s.multiplicadorValor).toBe(2);
  });

  it("el intervalo de aparición nunca baja de 0.35 s", () => {
    expect(valorEfecto(b.efectos.intervaloAparicion, 10)).toBeCloseTo(Math.max(0.35, 1.6 * 0.86 ** 10));
    expect(valorEfecto(b.efectos.intervaloAparicion, 50)).toBe(0.35);
  });
});
