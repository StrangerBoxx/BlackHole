import Phaser from "phaser";

const ALTO_PNG = 960;
const FILA = 80;
/** Las primeras 80 px del suelo son la "pared": al repetir hacia abajo se saltan. */
const SALTAR_ARRIBA = 80;

/**
 * Suelo del alto que haga falta: el PNG de 720x960 arriba y, si la pantalla es más alta,
 * se sigue repitiendo hacia abajo en filas de 80 px (copiando desde y=80, sin la pared de arriba).
 */
export function crearSuelo(scene: Phaser.Scene, clave: string, ancho: number, alto: number): Phaser.GameObjects.Image {
  if (alto <= ALTO_PNG) return scene.add.image(0, 0, clave).setOrigin(0).setDisplaySize(ancho, ALTO_PNG);
  const claveAlta = `${clave}@${alto}`;
  if (!scene.textures.exists(claveAlta)) {
    const origen = scene.textures.get(clave).getSourceImage() as HTMLImageElement | HTMLCanvasElement;
    const k = origen.width / ancho; // por si el PNG no mide exactamente 720 de ancho
    const tex = scene.textures.createCanvas(claveAlta, ancho, alto)!;
    const ctx = tex.getContext();
    ctx.drawImage(origen, 0, 0, origen.width, origen.height, 0, 0, ancho, ALTO_PNG);
    const filas = (ALTO_PNG - SALTAR_ARRIBA) / FILA;
    for (let y = ALTO_PNG, i = 0; y < alto; y += FILA, i++) {
      const sy = SALTAR_ARRIBA + (i % filas) * FILA;
      ctx.drawImage(origen, 0, sy * k, origen.width, FILA * k, 0, y, ancho, FILA);
    }
    tex.refresh();
  }
  return scene.add.image(0, 0, claveAlta).setOrigin(0);
}
