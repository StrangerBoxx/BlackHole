import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { aplicarAtraccion } from "../src/logica/captura";
import { elegirEspecial, explotarBomba, multiplicadorEspecial, objetoDelEspecial } from "../src/logica/especiales";
import { crearCuerpo, resolverChoques } from "../src/logica/fisica";
import { elegirObjeto } from "../src/logica/lanzamiento";
import { tipoPorId } from "../src/logica/objetos";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const cfg = b.especiales;
const extintor = tipoPorId(b, "extintor"), tornillo = tipoPorId(b, "tornillo");

describe("elegir especial (bomba 4%, dorado 4%, pesado 6%)", () => {
  it("los cortes de la tirada", () => {
    expect(elegirEspecial(extintor, cfg, () => 0.01)).toBe("bomba");
    expect(elegirEspecial(extintor, cfg, () => 0.05)).toBe("dorado");
    expect(elegirEspecial(extintor, cfg, () => 0.1)).toBe("pesado");
    expect(elegirEspecial(extintor, cfg, () => 0.5)).toBeNull();
  });

  it("los objetos chicos no salen pesados", () => {
    expect(elegirEspecial(tornillo, cfg, () => 0.1)).toBeNull();
  });

  it("la Suerte dorada agranda la franja del dorado", () => {
    expect(elegirEspecial(extintor, cfg, () => 0.1)).toBe("pesado");
    expect(elegirEspecial(extintor, cfg, () => 0.1, 0.05)).toBe("dorado");
  });

  it("la bomba trae su propio objeto; los demás no", () => {
    expect(objetoDelEspecial("bomba", cfg)).toBe("bomba");
    expect(objetoDelEspecial("dorado", cfg)).toBeNull();
    expect(elegirEspecial(extintor, cfg, () => 0.15)).toBeNull();
  });

  it("multiplicadores: dorado x10, pesado x4, normal x1", () => {
    expect(multiplicadorEspecial("dorado", cfg)).toBe(10);
    expect(multiplicadorEspecial("pesado", cfg)).toBe(4);
    expect(multiplicadorEspecial(null, cfg)).toBe(1);
  });
});

describe("pesado", () => {
  it("no se puede agarrar", () => {
    const c = crearCuerpo(100, 100, 30);
    c.agarrable = false;
    expect(elegirObjeto([c], 100, 100, 22)).toBe(-1);
  });

  it("se mueve menos al chocar y lo atrae menos el hoyo", () => {
    const normal = crearCuerpo(0, 0, 30), pesado = crearCuerpo(50, 0, 30);
    pesado.peso = 5;
    resolverChoques([normal, pesado], 0.6);
    expect(-normal.x).toBeGreaterThan(pesado.x - 50);

    const a = crearCuerpo(40, 0, 30), p = crearCuerpo(40, 0, 30);
    p.peso = 5;
    aplicarAtraccion(a, { x: 0, y: 0 }, 100, 700, 0.15, 0.1);
    aplicarAtraccion(p, { x: 0, y: 0 }, 100, 700, 0.15, 0.1);
    expect(p.vx).toBeCloseTo(a.vx / 5);
  });
});

describe("bomba", () => {
  it("empuja hacia el hoyo lo que está dentro del radio, más fuerte cerca", () => {
    const cerca = crearCuerpo(100, 0, 14), lejos = crearCuerpo(400, 0, 14), fuera = crearCuerpo(600, 0, 14);
    const n = explotarBomba([cerca, lejos, fuera], { x: 0, y: 0 }, 460, 700);
    expect(n).toBe(2);
    expect(cerca.vx).toBeLessThan(lejos.vx);
    expect(lejos.vx).toBeLessThan(0);
    expect(fuera.vx).toBe(0);
  });

  it("no mueve lo que está agarrado ni lo que ya cae", () => {
    const a = crearCuerpo(100, 0, 14), c = crearCuerpo(100, 50, 14);
    a.arrastrado = true;
    c.cayendo = true;
    expect(explotarBomba([a, c], { x: 0, y: 0 }, 460, 700)).toBe(0);
  });
});
