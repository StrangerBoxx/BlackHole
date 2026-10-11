import { describe, expect, it } from "vitest";
import { Progreso } from "../src/core/Progreso";
import type { Balance } from "../src/logica/balance";
import { aplicarColapso } from "../src/logica/colapso";
import { deserializar, estadoVacio } from "../src/logica/guardado";
import { anotarRecord, avanceLogro, logrosNuevos, recordsVacios } from "../src/logica/logros";
import { nivelesIniciales } from "../src/logica/mejoras";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const logro = (id: string) => b.logros.find((l) => l.id === id)!;

describe("logros", () => {
  it("hay 12 y todos tienen id distinto", () => {
    expect(b.logros.length).toBe(12);
    expect(new Set(b.logros.map((l) => l.id)).size).toBe(12);
  });

  it("récords: mejor combo, jefes, dorados y tiros", () => {
    const r = recordsVacios();
    anotarRecord(r, { combo: 4, jefe: false, especial: "dorado", tiros: ["carambola", "lejos"] });
    anotarRecord(r, { combo: 1, jefe: true, especial: null, tiros: [] });
    expect(r).toEqual({ comboMax: 5, jefes: 1, dorados: 1, tiros: 2 });
  });

  it("avance de cada tipo", () => {
    const e = { ...estadoVacio(), total: 42, zona: 1, records: { comboMax: 6, jefes: 0, dorados: 0, tiros: 3 } };
    expect(avanceLogro(b, logro("hambriento"), e)).toEqual({ valor: 42, meta: 100 });
    expect(avanceLogro(b, logro("en_racha"), e)).toEqual({ valor: 5, meta: 5 }); // no pasa de la meta
    expect(avanceLogro(b, logro("al_reactor"), e)).toEqual({ valor: 2, meta: 3 });
    expect(avanceLogro(b, logro("bing"), e)).toEqual({ valor: 0, meta: 1 });
  });

  it("logros nuevos: solo los cumplidos que no estaban anotados", () => {
    const e = { ...estadoVacio(), total: 1, logros: [] as string[] };
    expect(logrosNuevos(b, e).map((l) => l.id)).toEqual(["primer_bocado"]);
    e.logros.push("primer_bocado");
    expect(logrosNuevos(b, e)).toEqual([]);
  });

  it("Bing Bong y álbum completo", () => {
    const e = { ...estadoVacio(), album: { especiales: ["bing_bong"], laboratorio: [...b.zonas[0].objetos, b.zonas[0].jefe] } };
    expect(logrosNuevos(b, e).map((l) => l.id).sort()).toEqual(["bing", "coleccionista"]);
  });

  it("Progreso los anota una sola vez", () => {
    const p = new Progreso();
    p.registrarTragado(5);
    expect(p.revisarLogros(b).map((l) => l.id)).toEqual(["primer_bocado"]);
    expect(p.revisarLogros(b)).toEqual([]);
    expect(p.logros).toEqual(["primer_bocado"]);
  });

  it("colapsar conserva récords y logros", () => {
    const e = { ...estadoVacio(), niveles: { ...nivelesIniciales(), size: 7 }, records: { comboMax: 9, jefes: 1, dorados: 0, tiros: 0 }, logros: ["cazajefes"] };
    const d = aplicarColapso(b, e);
    expect(d.records.comboMax).toBe(9);
    expect(d.logros).toEqual(["cazajefes"]);
  });

  it("al cargar descarta logros que no existen", () => {
    const e = deserializar(JSON.stringify({ logros: ["primer_bocado", "inventado", "primer_bocado"] }), b);
    expect(e.logros).toEqual(["primer_bocado"]);
  });
});
