import { describe, expect, it } from "vitest";
import type { Balance } from "../src/logica/balance";
import { estadisticas, nivelesIniciales } from "../src/logica/mejoras";
import { objetosDesbloqueados } from "../src/logica/objetos";
import balanceJson from "../public/data/balance.json";

const b = balanceJson as Balance;
const conTamano = (size: number) =>
  objetosDesbloqueados(b, b.zonas[0], estadisticas(b, { ...nivelesIniciales(), size }).radioHoyo).map((t) => t.id);

describe("desbloqueo de objetos (r <= radioHoyo * 0.95)", () => {
  it("al empezar: tornillo, matraz, casco y extintor", () => {
    expect(conTamano(0)).toEqual(["tornillo", "matraz", "casco", "extintor"]);
  });

  it("cada nivel de Tamaño desbloquea según el radio", () => {
    expect(conTamano(1)).toContain("silla"); // 33*0.95 = 31.35 ≥ 30
    expect(conTamano(2)).toContain("caja_herramientas");      // 36.1 ≥ 36
    expect(conTamano(3)).not.toContain("servidor");
    expect(conTamano(4)).toContain("servidor");  // 45.6 ≥ 42
    expect(conTamano(6)).not.toContain("robot");  // 55.1 < 56
    expect(conTamano(7)).toContain("robot");      // 59.85 ≥ 56
  });

  it("el límite es inclusivo", () => {
    expect(objetosDesbloqueados(b, b.zonas[0], 36 / 0.95).map((t) => t.id)).toContain("caja_herramientas");
  });

  it("cada zona tiene sus propios objetos (la bomba y los jefes no salen como normales)", () => {
    const todos = b.zonas.flatMap((z) => objetosDesbloqueados(b, z, 1000).map((t) => t.id));
    expect(todos).not.toContain("bomba");
    expect(todos).not.toContain("tanque");
    expect(objetosDesbloqueados(b, b.zonas[1], 28).map((t) => t.id)).toEqual(["tuerca", "probeta", "botiquin", "bidon"]);
  });
});
