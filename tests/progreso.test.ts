import { describe, expect, it, vi } from "vitest";
import { Progreso } from "../src/core/Progreso";
import type { Balance } from "../src/logica/balance";
import balanceJson from "../public/data/balance.json";

describe("progreso", () => {
  it("empieza en cero", () => {
    const p = new Progreso();
    expect(p.monedas).toBe(0);
    expect(p.total).toBe(0);
    expect(Object.values(p.niveles).every((n) => n === 0)).toBe(true);
  });

  it("tragar suma monedas y cuenta el objeto", () => {
    const p = new Progreso();
    p.registrarTragado(4);
    p.registrarTragado(120);
    expect(p.monedas).toBe(124);
    expect(p.total).toBe(2);
  });

  it("avisa a quien escucha y se puede dejar de escuchar", () => {
    const p = new Progreso();
    const fn = vi.fn();
    const dejar = p.alCambiar(fn);
    p.registrarTragado(1);
    expect(fn).toHaveBeenCalledTimes(1);
    dejar();
    p.registrarTragado(1);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe("comprar mejoras", () => {
  const b = balanceJson as Balance;

  it("descuenta el costo y sube el nivel", () => {
    const p = new Progreso();
    p.registrarTragado(30);
    const r = p.comprar(b, "pull");
    expect(r).toMatchObject({ comprado: true, nivel: 1, costo: 10 });
    expect(p.monedas).toBe(20);
    expect(p.niveles.pull).toBe(1);
  });

  it("sin plata no compra ni cambia nada", () => {
    const p = new Progreso();
    p.registrarTragado(5);
    expect(p.comprar(b, "pull")).toEqual({ comprado: false });
    expect(p.monedas).toBe(5);
    expect(p.niveles.pull).toBe(0);
  });

  it("no pasa del máximo", () => {
    const p = new Progreso();
    p.registrarTragado(1e9);
    for (let i = 0; i < 10; i++) p.comprar(b, "size");
    expect(p.niveles.size).toBe(7);
  });

  it("avisa qué objeto se desbloqueó", () => {
    const p = new Progreso();
    p.registrarTragado(1000);
    const r1 = p.comprar(b, "size");
    expect(r1.comprado && r1.nuevosObjetos.map((t) => t.id)).toEqual(["silla"]);
    const r2 = p.comprar(b, "pull");
    expect(r2.comprado && r2.nuevosObjetos).toEqual([]);
  });
});
