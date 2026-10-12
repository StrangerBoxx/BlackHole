import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import {
  alChocar, alTocarBorde, evaluarTiro, iniciarTiro, multiplicadorTiro, tiroQuieto,
} from "../src/logica/tiros";
import balanceJson from "../public/data/balance.json";

const cfg = (balanceJson as Balance).tiros;

describe("tiros especiales", () => {
  it("soltar sin velocidad no es un tiro", () => {
    expect(iniciarTiro(500, 50, 200).lanzado).toBe(false);
    expect(evaluarTiro(iniciarTiro(500, 50, 200), cfg)).toEqual([]);
  });

  it("directo: entra rápido sin tocar nada", () => {
    const t = iniciarTiro(150, 900, 200);
    t.tiempo = 0.5;
    expect(evaluarTiro(t, cfg)).toEqual(["directo"]);
  });

  it("si tarda mucho ya no es directo", () => {
    const t = iniciarTiro(150, 900, 200);
    t.tiempo = 2;
    expect(evaluarTiro(t, cfg)).toEqual([]);
  });

  it("carambola: rebotó en la pared", () => {
    const t = iniciarTiro(150, 900, 200);
    alTocarBorde(t);
    t.tiempo = 0.5;
    expect(evaluarTiro(t, cfg)).toEqual(["carambola"]);
  });

  it("desde lejos (380 px) y directo a la vez", () => {
    const t = iniciarTiro(400, 2000, 200);
    t.tiempo = 0.6;
    expect(evaluarTiro(t, cfg)).toEqual(["lejos", "directo"]);
  });

  it("un objeto quieto golpeado por uno lanzado cuenta como carambola", () => {
    const lanzado = iniciarTiro(300, 900, 200);
    const quieto = tiroQuieto();
    alChocar(lanzado, quieto);
    expect(lanzado.reboto).toBe(true);
    expect(evaluarTiro(quieto, cfg)).toEqual(["carambola"]);
  });

  it("dos objetos quietos que se tocan no cuentan", () => {
    const a = tiroQuieto(), b = tiroQuieto();
    alChocar(a, b);
    alTocarBorde(a);
    expect(evaluarTiro(a, cfg)).toEqual([]);
    expect(evaluarTiro(b, cfg)).toEqual([]);
  });

  it("multiplicador: 1 + suma de bonus", () => {
    expect(multiplicadorTiro([], cfg)).toBe(1);
    expect(multiplicadorTiro(["carambola"], cfg)).toBe(1.5);
    expect(multiplicadorTiro(["lejos", "directo"], cfg)).toBe(1.75);
  });
});
