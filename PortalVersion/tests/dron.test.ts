import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { aplicarGravedadPasiva, puedeTragar } from "../src/logica/captura";
import { elegirObjetivo, empujarHaciaHoyo, velocidadParaLlegar } from "../src/logica/dron";
import { crearCuerpo, pasoFisica, rapidez } from "../src/logica/fisica";
import { estadisticas, nivelesIniciales } from "../src/logica/mejoras";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const hoyo = { x: 360, y: 330 };

describe("dron", () => {
  it("no trabaja sin comprarlo; con nivel, cada vez más seguido (mín 1.2 s)", () => {
    expect(estadisticas(b, nivelesIniciales()).hayDron).toBe(false);
    const s1 = estadisticas(b, { ...nivelesIniciales(), drone: 1 });
    const s10 = estadisticas(b, { ...nivelesIniciales(), drone: 10 });
    expect(s1.hayDron).toBe(true);
    expect(s1.intervaloDron).toBeCloseTo(9 * 0.84);
    expect(s10.intervaloDron).toBeCloseTo(Math.max(1.2, 9 * 0.84 ** 10));
  });

  it("velocidad = distancia × roce × extra, con tope", () => {
    expect(velocidadParaLlegar(300, 1.6, 1.12, 1600)).toBeCloseTo(537.6);
    expect(velocidadParaLlegar(5000, 1.6, 1.12, 1600)).toBe(1600);
  });

  it("el objeto empujado pasa por el hoyo lo bastante lento para caer", () => {
    for (const [x, y] of [[360, 900], [40, 40], [700, 500]]) {
      const c = crearCuerpo(x, y, 20);
      empujarHaciaHoyo(c, hoyo, b.mundo.rozamiento, b.dron.extraVelocidad, b.dron.velocidadMaxima);
      let cayo = false;
      for (let i = 0; i < 600 && !cayo; i++) {
        pasoFisica([c], 1 / 60, { ancho: 720, alto: 960, rozamiento: 1.6, rebote: 0.6, giroPorVelocidad: 0 });
        cayo = puedeTragar(c, hoyo, 28, 420, 0.2);
      }
      expect(cayo).toBe(true);
    }
  });

  it("solo elige objetos sueltos y agarrables", () => {
    const a = crearCuerpo(0, 0, 10), p = crearCuerpo(0, 0, 10), c = crearCuerpo(0, 0, 10);
    p.agarrable = false;
    c.cayendo = true;
    expect(elegirObjetivo([a, p, c], () => 0.9)).toBe(a);
    expect(elegirObjetivo([p, c], () => 0.5)).toBeNull();
  });
});

describe("gravedad pasiva", () => {
  it("acerca al hoyo desde cualquier distancia", () => {
    const c = crearCuerpo(360, 900, 14);
    aplicarGravedadPasiva(c, hoyo, 36, 1);
    expect(c.vy).toBeCloseTo(-36);
    expect(rapidez(c)).toBeCloseTo(36);
  });

  it("nivel 0: no hace nada", () => {
    const c = crearCuerpo(360, 900, 14);
    aplicarGravedadPasiva(c, hoyo, 0, 1);
    expect(c.vy).toBe(0);
  });
});
