import { describe, expect, it } from "vitest";
import {
  agregarPunto, elegirObjeto, limitarAlMundo, velocidadLanzamiento, type PuntoRastro,
} from "../src/logica/lanzamiento";

const op = { velocidadMaxima: 2400, ventanaMs: 90, dtMinimo: 0.016 };

describe("velocidad del lanzamiento", () => {
  it("usa el movimiento de los últimos 90 ms", () => {
    const rastro: PuntoRastro[] = [
      { x: 0, y: 0, t: 0 },      // viejo: se ignora
      { x: 100, y: 0, t: 920 },
      { x: 150, y: 0, t: 970 },
    ];
    const v = velocidadLanzamiento(rastro, 1000, op);
    expect(v.vx).toBeCloseTo(1000); // 50 px en 0.05 s
    expect(v.vy).toBe(0);
  });

  it("si el dedo estaba quieto, no lo lanza", () => {
    const rastro = [{ x: 10, y: 10, t: 0 }, { x: 50, y: 10, t: 100 }];
    expect(velocidadLanzamiento(rastro, 500, op)).toEqual({ vx: 0, vy: 0 });
  });

  it("nunca pasa de 2400 px/s y mantiene la dirección", () => {
    const rastro = [{ x: 0, y: 0, t: 950 }, { x: 300, y: 400, t: 1000 }];
    const v = velocidadLanzamiento(rastro, 1000, op);
    expect(Math.hypot(v.vx, v.vy)).toBeCloseTo(2400);
    expect(v.vx / v.vy).toBeCloseTo(0.75);
  });

  it("dos puntos casi al mismo tiempo no dan una velocidad loca (dt mínimo 16 ms)", () => {
    const rastro = [{ x: 0, y: 0, t: 999 }, { x: 10, y: 0, t: 1000 }];
    expect(velocidadLanzamiento(rastro, 1000, op).vx).toBeCloseTo(625);
  });

  it("el rastro guarda solo los últimos N puntos", () => {
    const rastro: PuntoRastro[] = [];
    for (let i = 0; i < 12; i++) agregarPunto(rastro, { x: i, y: 0, t: i }, 8);
    expect(rastro.length).toBe(8);
    expect(rastro[0].x).toBe(4);
  });
});

describe("agarrar", () => {
  const objs = [
    { x: 100, y: 100, r: 14, cayendo: false },
    { x: 160, y: 100, r: 30, cayendo: false },
  ];

  it("toma el más cercano al dedo", () => {
    expect(elegirObjeto(objs, 125, 100, 22)).toBe(0);
    expect(elegirObjeto(objs, 140, 100, 22)).toBe(1);
  });

  it("acepta tocar un poco afuera (r + 22)", () => {
    expect(elegirObjeto(objs, 100, 135, 22)).toBe(0);
    expect(elegirObjeto(objs, 100, 137, 22)).toBe(-1);
  });

  it("no toma objetos que caen al hoyo", () => {
    expect(elegirObjeto([{ x: 0, y: 0, r: 10, cayendo: true }], 0, 0, 22)).toBe(-1);
  });

  it("mantiene el objeto dentro del mundo", () => {
    expect(limitarAlMundo(-50, 2000, 20, 720, 960)).toEqual({ x: 20, y: 940 });
  });
});
