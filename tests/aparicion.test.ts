import { describe, expect, it } from "vitest";
import { buscarLugar, elegirTipo, RelojAparicion } from "../src/logica/aparicion";
import type { Balance } from "../src/logica/balance";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const tipos = b.objetos.slice(0, 4); // piedra, lata, pelota, cono

/** Azar predecible para los tests. */
function azarFijo(semilla = 1) {
  let s = semilla;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

describe("elegir tipo con peso 1 + i*0.6", () => {
  it("con azar 0 sale el primero y con azar casi 1 el último", () => {
    expect(elegirTipo(tipos, 1, 0.6, () => 0).id).toBe("piedra");
    expect(elegirTipo(tipos, 1, 0.6, () => 0.9999).id).toBe("cono");
  });

  it("los cortes caen donde dicen los pesos (1, 1.6, 2.2, 2.8 → total 7.6)", () => {
    expect(elegirTipo(tipos, 1, 0.6, () => 0.99 / 7.6).id).toBe("piedra");
    expect(elegirTipo(tipos, 1, 0.6, () => 1.01 / 7.6).id).toBe("lata");
    expect(elegirTipo(tipos, 1, 0.6, () => 2.61 / 7.6).id).toBe("pelota");
    expect(elegirTipo(tipos, 1, 0.6, () => 4.81 / 7.6).id).toBe("cono");
  });

  it("en muchas tiradas, el cono sale ~2.8 veces más que la piedra", () => {
    const azar = azarFijo(7);
    const cuenta: Record<string, number> = {};
    for (let i = 0; i < 20000; i++) {
      const t = elegirTipo(tipos, 1, 0.6, azar).id;
      cuenta[t] = (cuenta[t] ?? 0) + 1;
    }
    expect(cuenta.cono / cuenta.piedra).toBeGreaterThan(2.5);
    expect(cuenta.cono / cuenta.piedra).toBeLessThan(3.1);
  });
});

describe("buscar lugar", () => {
  it("nunca aparece cerca del hoyo ni fuera del mundo", () => {
    const azar = azarFijo(3);
    for (let i = 0; i < 300; i++) {
      const p = buscarLugar(20, [], 55, b, azar)!;
      expect(Math.hypot(p.x - 360, p.y - 330)).toBeGreaterThanOrEqual(55 + 20 + 20);
      expect(p.x).toBeGreaterThanOrEqual(30);
      expect(p.x).toBeLessThanOrEqual(690);
      expect(p.y).toBeLessThanOrEqual(930);
    }
  });

  it("la distancia al hoyo tiene tope de 260 aunque la atracción sea enorme", () => {
    const azar = azarFijo(5);
    const p = buscarLugar(14, [], 1000, b, azar);
    expect(p).not.toBeNull();
    expect(Math.hypot(p!.x - 360, p!.y - 330)).toBeGreaterThanOrEqual(260 + 14 + 20);
  });

  it("no pisa a otros objetos (deja 8 px)", () => {
    const azar = azarFijo(11);
    const otros: { x: number; y: number; r: number }[] = [];
    for (let i = 0; i < 15; i++) {
      const p = buscarLugar(22, otros, 55, b, azar);
      if (p) otros.push({ ...p, r: 22 });
    }
    for (let i = 0; i < otros.length; i++)
      for (let j = i + 1; j < otros.length; j++)
        expect(Math.hypot(otros[i].x - otros[j].x, otros[i].y - otros[j].y)).toBeGreaterThanOrEqual(52);
  });

  it("si no hay lugar devuelve null", () => {
    const lleno = [{ x: 360, y: 480, r: 2000 }]; // un objeto gigante ocupa todo el pasto
    expect(buscarLugar(14, lleno, 55, b, azarFijo(2))).toBeNull();
  });
});

describe("reloj de aparición", () => {
  it("avisa cada intervalo y solo si hay cupo", () => {
    const r = new RelojAparicion();
    expect(r.avanzar(1.0, 1.6, 0, 4)).toBe(false);
    expect(r.avanzar(0.6, 1.6, 0, 4)).toBe(true);
    expect(r.avanzar(1.6, 1.6, 4, 4)).toBe(false); // lleno: se pierde el turno
    expect(r.avanzar(1.6, 1.6, 3, 4)).toBe(true);
  });
});
