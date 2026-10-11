import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { tonoMoneda, tonoTragar, volumenTragar } from "../src/logica/sonido";
import balanceJson from "../public/data/balance.json";

const s = (balanceJson as Balance).sonido;

describe("tono de tragar (1.3 - tamaño*0.6)", () => {
  it("objeto chico: agudo", () => {
    expect(tonoTragar(14, s)).toBeCloseTo(1.3 - (14 / 56) * 0.6); // 1.15
  });

  it("robot: el más grave (0.7)", () => {
    expect(tonoTragar(56, s)).toBeCloseTo(0.7);
  });

  it("más grande nunca da más grave que 0.7", () => {
    expect(tonoTragar(200, s)).toBeCloseTo(0.7);
  });

  it("volumen sube con el tamaño y usa el volumen del archivo", () => {
    expect(volumenTragar(56, s)).toBeCloseTo((0.6 + 0.8) * 0.56);
    expect(volumenTragar(14, s)).toBeLessThan(volumenTragar(56, s));
  });
});

describe("tono de moneda (2^(combo/12), tope 12)", () => {
  it("sin combo: tono normal", () => {
    expect(tonoMoneda(0, s)).toBe(1);
  });

  it("cada combo sube medio tono", () => {
    expect(tonoMoneda(1, s)).toBeCloseTo(1.0595, 3);
    expect(tonoMoneda(7, s)).toBeCloseTo(1.4983, 3);
  });

  it("tope: una octava (x2)", () => {
    expect(tonoMoneda(12, s)).toBeCloseTo(2);
    expect(tonoMoneda(30, s)).toBeCloseTo(2);
  });
});
