import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { objetosDeZona } from "../src/logica/objetos";
import { formatearDuracion, gananciaOffline, valorPromedio } from "../src/logica/offline";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const cfg = b.offline;
const base = { segundos: 3600, horasMaximas: 2, hayDron: true, intervaloDron: 6, valorObjeto: 4, multiplicador: 1 };

describe("ganancia offline", () => {
  it("valor promedio con los pesos de aparición", () => {
    const [piedra, lata] = objetosDeZona(b, b.zonas[0]);
    // pesos 1 y 1.6: (1*1 + 1.6*2) / 2.6
    expect(valorPromedio([piedra, lata], 1, 0.6)).toBeCloseTo(4.2 / 2.6);
    expect(valorPromedio([], 1, 0.6)).toBe(0);
  });

  it("1 hora con dron cada 6 s: 600 objetos × 4 × 50%", () => {
    expect(gananciaOffline(base, cfg)).toBe(1200);
  });

  it("sin dron no gana nada", () => {
    expect(gananciaOffline({ ...base, hayDron: false }, cfg)).toBe(0);
  });

  it("tiene tope de horas", () => {
    expect(gananciaOffline({ ...base, segundos: 10 * 3600 }, cfg)).toBe(gananciaOffline({ ...base, segundos: 2 * 3600 }, cfg));
  });

  it("menos de un minuto no cuenta", () => {
    expect(gananciaOffline({ ...base, segundos: 30 }, cfg)).toBe(0);
  });

  it("usa el multiplicador (zona, Valor...)", () => {
    expect(gananciaOffline({ ...base, multiplicador: 12 }, cfg)).toBe(14400);
  });

  it("formato de duración", () => {
    expect(formatearDuracion(30)).toBe("30 s");
    expect(formatearDuracion(45 * 60)).toBe("45 min");
    expect(formatearDuracion(2 * 3600 + 15 * 60)).toBe("2 h 15 min");
  });
});
