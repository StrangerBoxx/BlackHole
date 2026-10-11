import { describe, expect, it } from "vitest";
import { anotarEnAlbum, bonusAlbum, zonaCompleta, type Album } from "../src/logica/album";
import type { Balance } from "../src/logica/balance";
import {
  avanzarMisiones, crearMision, misionCumplida, premioMision, textoMision, type EventoMision, type Mision,
} from "../src/logica/misiones";
import { objetosDeZona, tipoPorId } from "../src/logica/objetos";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const laboratorio = b.zonas[0];
const extintor = tipoPorId(b, "extintor");
const ev = (extra: Partial<EventoMision> = {}): EventoMision => ({
  tipo: extintor, monedas: 8, especial: null, tiros: [], combo: 0, jefe: false, ...extra,
});
const mision = (plantilla: string, objetivo: number, extra: Partial<Mision> = {}): Mision => ({
  plantilla, objetivo, dificultad: 0, progreso: 0, ...extra,
});

describe("misiones", () => {
  it("crea misiones distintas de las activas", () => {
    let i = 0;
    const azar = () => [0.0, 0.5, 0.0, 0.5][i++ % 4];
    const a = crearMision(b, [], objetosDeZona(b, laboratorio), 1, azar);
    const c = crearMision(b, [a], objetosDeZona(b, laboratorio), 1, azar);
    expect(a.plantilla).not.toBe(c.plantilla);
  });

  it("'Traga N × objeto' elige un objeto de la zona", () => {
    const m = crearMision(b, b.misiones.plantillas.filter((p) => p.id !== "tragarTipo").map((p) => mision(p.id, 1)), [extintor], 1, () => 0);
    expect(m.plantilla).toBe("tragarTipo");
    expect(m.objeto).toBe("extintor");
    expect(textoMision(b, m)).toBe("Traga 3 × Extintor");
  });

  it("las metas de monedas crecen con la zona", () => {
    const otras = b.misiones.plantillas.filter((p) => p.id !== "monedas").map((p) => mision(p.id, 1));
    expect(crearMision(b, otras, [extintor], 12, () => 0).objetivo).toBe(300 * 12);
  });

  it("textos con singular", () => {
    expect(textoMision(b, mision("dorado", 1))).toBe("Traga 1 objeto dorado");
    expect(textoMision(b, mision("dorado", 3))).toBe("Traga 3 objetos dorados");
    expect(textoMision(b, mision("monedas", 2000))).toBe("Gana 2.0k monedas");
  });

  it("cada tipo de misión avanza con lo suyo", () => {
    const ms = [
      mision("tragar", 2),
      mision("tragarTipo", 2, { objeto: "tornillo" }),
      mision("combo", 3),
      mision("carambola", 1),
      mision("dorado", 1),
      mision("monedas", 100),
      mision("jefe", 1),
    ];
    avanzarMisiones(b, ms, ev({ combo: 2, tiros: ["carambola"], especial: "dorado", monedas: 80 }));
    expect(ms.map((m) => m.progreso)).toEqual([1, 0, 3, 1, 1, 80, 0]);
  });

  it("avisa solo las que se cumplen justo ahora y no pasa del objetivo", () => {
    const m = mision("tragar", 2);
    expect(avanzarMisiones(b, [m], ev())).toEqual([]);
    expect(avanzarMisiones(b, [m], ev())).toEqual([m]);
    expect(avanzarMisiones(b, [m], ev())).toEqual([]);
    expect(m.progreso).toBe(2);
    expect(misionCumplida(m)).toBe(true);
  });

  it("premio = base × premio × (dificultad + 1) × multiplicador", () => {
    expect(premioMision(b, mision("carambola", 7, { dificultad: 2 }), 1)).toBe(30 * 2 * 3);
    expect(premioMision(b, mision("tragar", 15), 12)).toBe(30 * 12);
  });
});

describe("álbum", () => {
  it("anota objetos nuevos una sola vez", () => {
    const a: Album = {};
    expect(anotarEnAlbum(a, laboratorio, "extintor")).toEqual({ nuevo: true, completo: false });
    expect(anotarEnAlbum(a, laboratorio, "extintor")).toEqual({ nuevo: false, completo: false });
    expect(anotarEnAlbum(a, laboratorio, "estante")).toEqual({ nuevo: false, completo: false }); // no es del laboratorio
    expect(a).toEqual({ laboratorio: ["extintor"] });
  });

  it("se completa con los 8 objetos y el jefe, y da x1.1", () => {
    const a: Album = {};
    for (const id of laboratorio.objetos) anotarEnAlbum(a, laboratorio, id);
    expect(zonaCompleta(a, laboratorio)).toBe(false);
    expect(bonusAlbum(b, a)).toBe(1);
    expect(anotarEnAlbum(a, laboratorio, "tanque")).toEqual({ nuevo: true, completo: true });
    expect(bonusAlbum(b, a)).toBeCloseTo(1.1);
  });
});
