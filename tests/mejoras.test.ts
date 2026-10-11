import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import {
  costoMejora, describirMejora, estadisticas, nivelesIniciales, puedeComprar, valorEfecto,
} from "../src/logica/mejoras";
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
      ventanaCombo: 2.5,
    });
  });

  it("cada mejora cambia sus valores según la tabla", () => {
    const s = estadisticas(b, { ...nivelesIniciales(), pull: 3, force: 2, size: 7, spawn: 5, value: 4, combo: 2 });
    expect(s.radioAtraccion).toBe(55 + 3 * 28);
    expect(s.fuerza).toBe(700 + 2 * 420);
    expect(s.radioHoyo).toBe(28 + 7 * 5);
    expect(s.velocidadCaptura).toBe(420 + 7 * 110);
    expect(s.maxObjetos).toBe(9);
    expect(s.intervaloAparicion).toBeCloseTo(1.6 * Math.pow(0.86, 5));
    expect(s.multiplicadorValor).toBe(2);
    expect(s.ventanaCombo).toBeCloseTo(3.1);
  });

  it("el intervalo de aparición nunca baja de 0.35 s", () => {
    expect(valorEfecto(b.efectos.intervaloAparicion, 10)).toBeCloseTo(Math.max(0.35, 1.6 * 0.86 ** 10));
    expect(valorEfecto(b.efectos.intervaloAparicion, 50)).toBe(0.35);
  });
});

describe("costo de las mejoras", () => {
  const m = (id: string) => b.mejoras.find((x) => x.id === id)!;

  it("nivel 0 cuesta la base", () => {
    expect(b.mejoras.slice(0, 5).map((x) => costoMejora(x, 0))).toEqual([10, 15, 25, 12, 40]);
  });

  it("round(base * mult^nivel)", () => {
    expect(costoMejora(m("pull"), 1)).toBe(16); // 15.5 → 16
    expect(costoMejora(m("pull"), 2)).toBe(24);
    expect(costoMejora(m("force"), 2)).toBe(38);
    expect(costoMejora(m("size"), 6)).toBe(1176);
    expect(costoMejora(m("spawn"), 9)).toBe(461);
    expect(costoMejora(m("value"), 19)).toBe(956290);
  });

  it("no se puede comprar sin plata ni pasado el máximo", () => {
    expect(puedeComprar(m("pull"), 0, 9)).toBe(false);
    expect(puedeComprar(m("pull"), 0, 10)).toBe(true);
    expect(puedeComprar(m("size"), 7, 1e12)).toBe(false);
  });

  it("máximos de las 5 originales: 12, 12, 7, 10, 20", () => {
    expect(b.mejoras.slice(0, 5).map((x) => x.max)).toEqual([12, 12, 7, 10, 20]);
  });

  it("describe la mejora con sus valores", () => {
    const s = estadisticas(b, { ...nivelesIniciales(), pull: 1, spawn: 2, value: 3 });
    expect(describirMejora("pull", s)).toBe("Radio de atracción: 83 px");
    expect(describirMejora("spawn", s)).toBe("Hasta 6 objetos, uno cada 1.2 s");
    expect(describirMejora("value", s)).toBe("Cada objeto da x1.75 monedas");
  });
});
