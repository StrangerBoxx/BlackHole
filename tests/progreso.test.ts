import { describe, expect, it, vi } from "vitest";
import { Progreso } from "../src/core/Progreso";

describe("progreso", () => {
  it("empieza en cero", () => {
    const p = new Progreso();
    expect(p.monedas).toBe(0);
    expect(p.total).toBe(0);
    expect(p.niveles).toEqual({ pull: 0, force: 0, size: 0, spawn: 0, value: 0 });
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
