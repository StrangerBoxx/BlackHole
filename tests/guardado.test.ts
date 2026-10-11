import { describe, expect, it } from "vitest";
import { Progreso } from "../src/core/Progreso";
import type { Balance } from "../src/logica/balance";
import { deserializar, estadoVacio, serializar } from "../src/logica/guardado";
import { nivelesIniciales } from "../src/logica/mejoras";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;

describe("guardar y cargar", () => {
  it("lo que se guarda se vuelve a cargar igual", () => {
    const e = { monedas: 1234, total: 56, niveles: { ...nivelesIniciales(), pull: 3, force: 2, size: 1, spawn: 4, value: 5 }, zona: 1, hambre: 40, jefes: 2, ultimaVez: 1700000000000,
      misiones: [{ plantilla: "tragarTipo", objetivo: 6, dificultad: 1, objeto: "cono", progreso: 2 }],
      album: { parque: ["piedra", "cono"] },
      materiaOscura: 12, permanentes: { valorPerm: 3, raros: 1 }, ganadasVuelta: 5000, colapsos: 2 };
    expect(deserializar(serializar(e), b)).toEqual(e);
  });

  it("el texto guardado trae versión", () => {
    expect(JSON.parse(serializar(estadoVacio())).version).toBe(2);
  });

  it("sin guardado (primera vez) empieza de cero", () => {
    expect(deserializar(null, b)).toEqual(estadoVacio());
    expect(deserializar("", b)).toEqual(estadoVacio());
  });

  it("texto roto no hace caer el juego", () => {
    expect(deserializar("{monedas: 5", b)).toEqual(estadoVacio());
    expect(deserializar("null", b)).toEqual(estadoVacio());
    expect(deserializar("42", b)).toEqual(estadoVacio());
  });

  it("arregla valores raros", () => {
    const raro = JSON.stringify({
      monedas: -50,
      total: "muchos",
      niveles: { pull: 99, force: -2, size: 2.7, value: "x", inventada: 5 },
    });
    expect(deserializar(raro, b)).toEqual({
      monedas: 0,
      total: 0,
      niveles: { ...nivelesIniciales(), pull: 12, size: 2 },
      zona: 0,
      hambre: 0,
      jefes: 0,
      ultimaVez: 0,
      misiones: [],
      album: {},
      materiaOscura: 0,
      permanentes: {},
      ganadasVuelta: 0,
      colapsos: 0,
    });
  });

  it("descarta misiones y fichas de álbum que no existen", () => {
    const raro = JSON.stringify({
      misiones: [{ plantilla: "inventada", objetivo: 3 }, { plantilla: "tragar", objetivo: 15, progreso: 99 }],
      album: { parque: ["piedra", "piedra", "dinosaurio"], marte: ["x"] },
    });
    const e = deserializar(raro, b);
    expect(e.misiones).toEqual([{ plantilla: "tragar", objetivo: 15, dificultad: 0, progreso: 15 }]);
    expect(e.album).toEqual({ parque: ["piedra"] });
  });

  it("niveles permanentes: solo los que existen y sin pasar el máximo", () => {
    const e = deserializar(JSON.stringify({ permanentes: { valorPerm: 99, inventada: 3, raros: -1 } }), b);
    expect(e.permanentes).toEqual({ valorPerm: 25 });
  });

  it("guardados viejos sin alguna mejora la dejan en 0", () => {
    const viejo = JSON.stringify({ monedas: 10, total: 3, niveles: { pull: 1 } });
    expect(deserializar(viejo, b).niveles).toEqual({ ...nivelesIniciales(), pull: 1 });
  });
});

describe("progreso: cargar, reiniciar y debug", () => {
  it("cargar reemplaza todo y exportar devuelve una copia", () => {
    const p = new Progreso();
    p.cargar({ ...estadoVacio(), monedas: 7, total: 2, niveles: { ...nivelesIniciales(), pull: 1 } });
    const copia = p.exportar();
    copia.niveles.pull = 9;
    expect(p.niveles.pull).toBe(1);
    expect(p.monedas).toBe(7);
  });

  it("reiniciar deja todo en cero", () => {
    const p = new Progreso();
    p.agregarMonedas(1000);
    p.comprar(b, "size");
    p.reiniciar();
    expect(p.exportar()).toEqual(estadoVacio());
  });

  it("debug: +monedas no cuenta objetos", () => {
    const p = new Progreso();
    p.agregarMonedas(1000);
    expect(p.monedas).toBe(1000);
    expect(p.total).toBe(0);
  });

  it("debug: subir y bajar nivel sin salir de 0..máximo", () => {
    const p = new Progreso();
    p.cambiarNivel(b, "size", -1);
    expect(p.niveles.size).toBe(0);
    for (let i = 0; i < 10; i++) p.cambiarNivel(b, "size", +1);
    expect(p.niveles.size).toBe(7);
    p.cambiarNivel(b, "size", -1);
    expect(p.niveles.size).toBe(6);
    expect(p.monedas).toBe(0);
  });
});
