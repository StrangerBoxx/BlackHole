import { describe, expect, it } from "vitest";
import { Combo, formatearNumero, monedasPorObjeto, textoCombo } from "../src/logica/monedas";

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
    const c = new Combo(2.5);
    expect(c.registrar(10)).toBe(0);
  });

  it("sube si el siguiente llega antes de 2.5 s", () => {
    const c = new Combo(2.5);
    c.registrar(10);
    expect(c.registrar(11)).toBe(1);
    expect(c.registrar(13.4)).toBe(2);
    expect(c.seguidos).toBe(3);
  });

  it("se corta si pasan 2.5 s o más", () => {
    const c = new Combo(2.5);
    c.registrar(10);
    c.registrar(11);
    expect(c.registrar(13.5)).toBe(0);
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
