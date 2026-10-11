import { describe, expect, it } from "vitest";
import { Progreso } from "../src/core/Progreso";
import type { Balance } from "../src/logica/balance";
import {
  aplicarColapso, describirPermanente, estadisticasPermanentes, materiaPorColapso, puedeColapsar,
} from "../src/logica/colapso";
import { multiplicadorSiempre } from "../src/logica/economia";
import { estadoVacio } from "../src/logica/guardado";
import { costoMejora, nivelesIniciales } from "../src/logica/mejoras";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const conTamanoMax = () => ({ ...estadoVacio(), niveles: { ...nivelesIniciales(), size: 7 } });

describe("colapso", () => {
  it("solo con Tamaño al máximo", () => {
    expect(puedeColapsar(b, estadoVacio())).toBe(false);
    expect(puedeColapsar(b, conTamanoMax())).toBe(true);
  });

  it("materia oscura = floor(√(monedas de la vuelta / 400)), mínimo 1", () => {
    expect(materiaPorColapso(b, 0)).toBe(1);
    expect(materiaPorColapso(b, 40000)).toBe(10);
    expect(materiaPorColapso(b, 48399)).toBe(10);
    expect(materiaPorColapso(b, 48400)).toBe(11);
  });

  it("pasa a la siguiente zona, borra lo de la vuelta y conserva lo permanente", () => {
    const antes = {
      ...conTamanoMax(),
      monedas: 9999, total: 500, ganadasVuelta: 40000, materiaOscura: 3, colapsos: 1,
      hambre: 80, jefes: 2, album: { laboratorio: ["tornillo"] }, permanentes: { inicio: 2 },
    };
    const d = aplicarColapso(b, antes);
    expect(d.zona).toBe(1);
    expect(d.materiaOscura).toBe(13);
    expect(d.colapsos).toBe(2);
    expect(d.monedas).toBe(300); // Empujón inicial nivel 2 = 150 × 2
    expect(d.niveles).toEqual(nivelesIniciales());
    expect(d.total).toBe(500);
    expect(d.album).toEqual({ laboratorio: ["tornillo"] });
    expect(d.permanentes).toEqual({ inicio: 2 });
    expect([d.ganadasVuelta, d.hambre, d.jefes, d.misiones.length]).toEqual([0, 0, 0, 0]);
  });

  it("en la última zona se queda en la última", () => {
    expect(aplicarColapso(b, { ...conTamanoMax(), zona: 2 }).zona).toBe(2);
  });

  it("Dron de fábrica: empieza con dron", () => {
    expect(aplicarColapso(b, { ...conTamanoMax(), permanentes: { dronPerm: 2 } }).niveles.drone).toBe(2);
  });
});

describe("mejoras permanentes", () => {
  it("valores por nivel", () => {
    const p = estadisticasPermanentes(b, { valorPerm: 2, comboPerm: 1, raros: 3, offline: 1 });
    expect(p.multiplicadorPermanente).toBe(2);
    expect(p.comboExtra).toBe(0.5);
    expect(p.doradoExtra).toBeCloseTo(0.06);
    expect(p.horasOfflineExtra).toBe(2);
    expect(describirPermanente("raros", p)).toBe("+6% de objetos dorados");
  });

  it("Valor eterno multiplica todas las monedas", () => {
    expect(multiplicadorSiempre(b, { ...estadoVacio(), permanentes: { valorPerm: 2 } })).toBe(2);
  });

  it("se compran con materia oscura y tienen máximo", () => {
    const p = new Progreso();
    p.cargar({ ...estadoVacio(), materiaOscura: 100 });
    expect(p.comprarPermanente(b, "dronPerm")).toBe(true); // cuesta 4
    expect(p.materiaOscura).toBe(96);
    expect(p.permanentes.dronPerm).toBe(1);
    const dron = b.permanentes.find((x) => x.id === "dronPerm")!;
    expect(costoMejora(dron, 1)).toBe(10);
    p.comprarPermanente(b, "dronPerm");
    p.comprarPermanente(b, "dronPerm");
    expect(p.comprarPermanente(b, "dronPerm")).toBe(false); // máximo 3
    expect(p.permanentes.dronPerm).toBe(3);
  });

  it("colapsar desde Progreso suma la materia y cambia de zona", () => {
    const p = new Progreso();
    p.cargar(conTamanoMax());
    p.registrarTragado(40000);
    expect(p.colapsar(b)).toEqual({ materia: 10, zona: 1 });
    expect(p.materiaOscura).toBe(10);
    expect(p.zona).toBe(1);
    expect(p.monedas).toBe(0);
  });

  it("sin Tamaño al máximo no colapsa", () => {
    const p = new Progreso();
    expect(p.colapsar(b)).toBeNull();
    expect(p.zona).toBe(0);
  });
});
