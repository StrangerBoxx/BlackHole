import { describe, expect, it } from "vitest";
import { aplicarAtraccion, avanzarCaida, fuerzaAtraccion, puedeTragar } from "../src/logica/captura";
import { crearCuerpo } from "../src/logica/fisica";

const hoyo = { x: 360, y: 330 };
const caida = { caidaSegundos: 0.6, caidaAcercamiento: 9, caidaGiro: 16 };

describe("atracción", () => {
  it("usa fuerza*(1 - dist/radio) + fuerza*0.15", () => {
    expect(fuerzaAtraccion(50, 100, 700, 0.15)).toBeCloseTo(700 * 0.5 + 105);
  });

  it("es más fuerte cerca del centro", () => {
    expect(fuerzaAtraccion(10, 100, 700, 0.15)).toBeGreaterThan(fuerzaAtraccion(90, 100, 700, 0.15));
  });

  it("fuera del radio no atrae", () => {
    expect(fuerzaAtraccion(100, 100, 700, 0.15)).toBe(0);
    expect(fuerzaAtraccion(150, 100, 700, 0.15)).toBe(0);
  });

  it("acelera el objeto hacia el hoyo", () => {
    const c = crearCuerpo(hoyo.x + 40, hoyo.y, 14);
    aplicarAtraccion(c, hoyo, 55, 700, 0.15, 0.1);
    expect(c.vx).toBeLessThan(0);
    expect(c.vy).toBeCloseTo(0);
  });

  it("un objeto lejos no se mueve", () => {
    const c = crearCuerpo(hoyo.x + 200, hoyo.y, 14);
    aplicarAtraccion(c, hoyo, 55, 700, 0.15, 0.1);
    expect(c.vx).toBe(0);
  });
});

describe("regla de captura", () => {
  it("se traga un objeto lento que está adentro", () => {
    const c = crearCuerpo(hoyo.x + 10, hoyo.y, 14);
    expect(puedeTragar(c, hoyo, 28, 420, 0.2)).toBe(true);
  });

  it("no se traga uno que pasa muy rápido", () => {
    const c = crearCuerpo(hoyo.x + 10, hoyo.y, 14);
    c.vx = 500;
    expect(puedeTragar(c, hoyo, 28, 420, 0.2)).toBe(false);
  });

  it("borde exacto: dist < radioHoyo - r*0.2", () => {
    // radio 28, tornillo r=14 → límite 25.2
    expect(puedeTragar(crearCuerpo(hoyo.x + 25.1, hoyo.y, 14), hoyo, 28, 420, 0.2)).toBe(true);
    expect(puedeTragar(crearCuerpo(hoyo.x + 25.3, hoyo.y, 14), hoyo, 28, 420, 0.2)).toBe(false);
  });

  it("un objeto grande tiene que llegar más al centro", () => {
    const chico = crearCuerpo(hoyo.x + 20, hoyo.y, 14);
    const grande = crearCuerpo(hoyo.x + 20, hoyo.y, 56);
    expect(puedeTragar(chico, hoyo, 28, 420, 0.2)).toBe(true);
    expect(puedeTragar(grande, hoyo, 28, 420, 0.2)).toBe(false);
  });
});

describe("caída en espiral", () => {
  it("dura 0.6 s, se achica hasta 0 y termina en el centro", () => {
    const c = crearCuerpo(hoyo.x + 20, hoyo.y + 10, 14);
    let t = 0;
    let r = { escala: 1, terminado: false };
    const escalas: number[] = [];
    while (!r.terminado && t < 2) {
      t += 1 / 60;
      r = avanzarCaida(c, hoyo, t, 1 / 60, caida);
      escalas.push(r.escala);
    }
    expect(t).toBeCloseTo(0.6, 1);
    expect(r.escala).toBe(0);
    expect(escalas[10]).toBeLessThan(escalas[5]);
    expect(Math.hypot(c.x - hoyo.x, c.y - hoyo.y)).toBeLessThan(0.5);
  });

  it("gira mientras cae", () => {
    const c = crearCuerpo(hoyo.x, hoyo.y, 14);
    avanzarCaida(c, hoyo, 0.1, 0.1, caida);
    expect(c.angulo).toBeCloseTo(1.6);
  });
});
