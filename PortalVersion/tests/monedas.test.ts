import { describe, expect, it } from "vitest";
import {
  calcularGanancia, Combo, formatearNumero, monedasPorObjeto, multiplicadorCombo, textoCombo,
} from "../src/logica/monedas";

describe("monedas por objeto", () => {
  it("valor × multiplicador", () => {
    expect(monedasPorObjeto(120, 1)).toBe(120);
    expect(monedasPorObjeto(4, 2.5)).toBe(10);
  });

  it("redondea al entero más cercano", () => {
    expect(monedasPorObjeto(1, 1.25)).toBe(1);   // 1.25
    expect(monedasPorObjeto(2, 1.25)).toBe(3);   // 2.5
    expect(monedasPorObjeto(30, 1.75)).toBe(53); // 52.5
  });
});

describe("combo", () => {
  it("el primero es combo 0", () => {
    const c = new Combo();
    expect(c.registrar(10, 2.5)).toBe(0);
  });

  it("sube si el siguiente llega antes de 2.5 s", () => {
    const c = new Combo();
    c.registrar(10, 2.5);
    expect(c.registrar(11, 2.5)).toBe(1);
    expect(c.registrar(13.4, 2.5)).toBe(2);
    expect(c.seguidos).toBe(3);
  });

  it("se corta si pasan 2.5 s o más", () => {
    const c = new Combo();
    c.registrar(10, 2.5);
    c.registrar(11, 2.5);
    expect(c.registrar(13.5, 2.5)).toBe(0);
  });

  it("con la mejora Combo la ventana es más larga", () => {
    const c = new Combo();
    c.registrar(10, 3.1);
    expect(c.registrar(13, 3.1)).toBe(1);
  });

  it("multiplicador: 1 + combo*0.25, tope x3", () => {
    expect(multiplicadorCombo(0, 0.25, 3)).toBe(1);
    expect(multiplicadorCombo(2, 0.25, 3)).toBe(1.5);
    expect(multiplicadorCombo(20, 0.25, 3)).toBe(3);
  });

  it("ganancia = valor × multiplicadores, redondeado", () => {
    expect(calcularGanancia(8, [1.5, 2])).toBe(24);
    expect(calcularGanancia(1, [1.25])).toBe(1);
    expect(calcularGanancia(5, [])).toBe(5);
  });

  it("el aviso aparece desde el 3.º seguido", () => {
    expect(textoCombo(0, 3)).toBeNull();
    expect(textoCombo(1, 3)).toBeNull();
    expect(textoCombo(2, 3)).toBe("¡Combo x3!");
    expect(textoCombo(6, 3)).toBe("¡Combo x7!");
  });
});

describe("formato de números", () => {
  it.each([
    [0, "0"],
    [999, "999"],
    [1000, "1.0k"],
    [1250, "1.3k"],
    [45678, "46k"],
    [3_400_000, "3.4M"],
  ])("%d → %s", (n, txt) => {
    expect(formatearNumero(n)).toBe(txt);
  });
});
