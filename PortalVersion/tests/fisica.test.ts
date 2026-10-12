import { describe, expect, it } from "vitest";
import {
  aplicarRoce, crearCuerpo, mover, pasoFisica, rapidez, rebotarBordes, resolverChoques,
} from "../src/logica/fisica";

const op = { ancho: 720, alto: 960, rozamiento: 1.6, rebote: 0.6, giroPorVelocidad: 0.006 };

describe("roce", () => {
  it("frena la velocidad en (1 - 1.6*dt)", () => {
    const c = crearCuerpo(100, 100, 14);
    c.vx = 1000;
    aplicarRoce(c, 1.6, 0.1);
    expect(c.vx).toBeCloseTo(840);
  });

  it("nunca invierte la dirección aunque dt sea grande", () => {
    const c = crearCuerpo(100, 100, 14);
    c.vx = 500;
    aplicarRoce(c, 1.6, 1);
    expect(c.vx).toBe(0);
  });

  it("un objeto lanzado termina deteniéndose", () => {
    const c = crearCuerpo(360, 480, 14);
    c.vx = 2400;
    for (let i = 0; i < 600; i++) pasoFisica([c], 1 / 60, op);
    expect(rapidez(c)).toBeLessThan(1);
  });
});

describe("mover", () => {
  it("avanza según la velocidad y gira al rodar", () => {
    const c = crearCuerpo(0, 0, 10);
    c.vx = 100; c.vy = -50;
    mover(c, 0.5, 0.006);
    expect(c.x).toBe(50);
    expect(c.y).toBe(-25);
    expect(c.giro).toBeCloseTo(Math.hypot(100, 50) * 0.006);
  });
});

describe("bordes", () => {
  it("rebota en la pared derecha con 0.6 de la velocidad", () => {
    const c = crearCuerpo(715, 300, 14);
    c.vx = 500;
    rebotarBordes(c, 720, 960, 0.6);
    expect(c.x).toBe(706);
    expect(c.vx).toBe(-300);
  });

  it("rebota en la pared de arriba", () => {
    const c = crearCuerpo(300, 2, 14);
    c.vy = -400;
    rebotarBordes(c, 720, 960, 0.6);
    expect(c.y).toBe(14);
    expect(c.vy).toBe(240);
  });

  it("no sale del mundo aunque vaya rapidísimo", () => {
    const c = crearCuerpo(360, 480, 20);
    c.vx = 2400; c.vy = 2400;
    for (let i = 0; i < 100; i++) pasoFisica([c], 1 / 30, op);
    expect(c.x).toBeGreaterThanOrEqual(20);
    expect(c.x).toBeLessThanOrEqual(700);
    expect(c.y).toBeLessThanOrEqual(940);
  });
});

describe("choques", () => {
  it("separa dos objetos que se pisan", () => {
    const a = crearCuerpo(100, 100, 20), b = crearCuerpo(130, 100, 20);
    resolverChoques([a, b], 0.6);
    expect(b.x - a.x).toBeCloseTo(40);
  });

  it("el más grande se mueve menos (masa = r²)", () => {
    const chico = crearCuerpo(100, 100, 14), grande = crearCuerpo(130, 100, 56);
    resolverChoques([chico, grande], 0.6);
    expect(100 - chico.x).toBeGreaterThan(grande.x - 130);
  });

  it("choque frontal de iguales: se intercambian velocidad con rebote 0.6", () => {
    const a = crearCuerpo(100, 100, 20), b = crearCuerpo(139, 100, 20);
    a.vx = 100;
    resolverChoques([a, b], 0.6);
    expect(a.vx).toBeCloseTo(20);
    expect(b.vx).toBeCloseTo(80);
  });

  it("el objeto arrastrado empuja pero no lo empujan", () => {
    const dedo = crearCuerpo(100, 100, 20), otro = crearCuerpo(130, 100, 20);
    dedo.arrastrado = true;
    resolverChoques([dedo, otro], 0.6);
    expect(dedo.x).toBe(100);
    expect(otro.x).toBeCloseTo(140);
  });

  it("los que caen al hoyo no chocan", () => {
    const a = crearCuerpo(100, 100, 20), b = crearCuerpo(110, 100, 20);
    b.cayendo = true;
    resolverChoques([a, b], 0.6);
    expect(a.x).toBe(100);
  });
});
