import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { hambreLlena, metaHambre, puedeTragarJefe, sumarHambre } from "../src/logica/hambre";
import balanceJson from "../public/data/balance.json";

const cfg = (balanceJson as Balance).hambre;

describe("hambre y jefe", () => {
  it("la meta crece 1.5 veces por cada jefe comido", () => {
    expect(metaHambre(cfg, 0)).toBe(150);
    expect(metaHambre(cfg, 1)).toBe(225);
    expect(metaHambre(cfg, 2)).toBe(338);
  });

  it("se llena con el valor base de lo tragado y no pasa de la meta", () => {
    let h = 0;
    h = sumarHambre(h, 120, 150);
    expect(hambreLlena(h, 150)).toBe(false);
    h = sumarHambre(h, 55, 150);
    expect(h).toBe(150);
    expect(hambreLlena(h, 150)).toBe(true);
  });

  it("el jefe cae cuando su centro entra al hoyo y va lento", () => {
    const hoyo = { x: 0, y: 0 };
    expect(puedeTragarJefe({ x: 20, y: 0, vx: 0, vy: 0 }, hoyo, 28, 420)).toBe(true);
    expect(puedeTragarJefe({ x: 40, y: 0, vx: 0, vy: 0 }, hoyo, 28, 420)).toBe(false);
    expect(puedeTragarJefe({ x: 20, y: 0, vx: 600, vy: 0 }, hoyo, 28, 420)).toBe(false);
  });
});
