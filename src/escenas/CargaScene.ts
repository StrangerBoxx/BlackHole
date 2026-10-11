import Phaser from "phaser";
import { IMAGENES, texturaObjeto } from "../core/assets";
import { setBalance } from "../core/Balance";
import { iniciarGuardado } from "../core/Guardado";
import { progreso } from "../core/Progreso";
import { iniciarSonido } from "../core/Sonido";
import { IDS_SONIDO, revisarBalance, type Balance } from "../logica/balance";

/**
 * Lee el balance y después carga cada imagen y sonido por su nombre.
 * Los nombres de los objetos salen del balance: si agregas un objeto al JSON,
 * basta con poner assets/img/objetos/<id>.png.
 */
export class CargaScene extends Phaser.Scene {
  constructor() {
    super("Carga");
  }

  preload(): void {
    this.load.json("balance", "data/balance.json");
  }

  create(): void {
    const balance = this.cache.json.get("balance") as Balance;
    const errores = revisarBalance(balance);
    if (errores.length) {
      this.add.text(20, 20, "balance.json tiene errores:\n" + errores.join("\n"), { color: "#ff8a7a", fontSize: "20px" });
      console.error("balance.json:", errores);
      return;
    }
    setBalance(balance);
    // Lo ganado con el juego cerrado: el HUD lo avisa al empezar
    this.registry.set("offline", iniciarGuardado(progreso, balance));

    for (const k of IMAGENES) this.load.image(k, `assets/img/${k}.png`);
    for (const z of balance.zonas) this.load.image(z.suelo, `assets/img/${z.suelo}.png`);
    for (const o of balance.objetos) this.load.image(texturaObjeto(o.id), `assets/img/objetos/${o.id}.png`);
    for (const s of IDS_SONIDO) this.load.audio(s, `assets/sonidos/${s}.wav`);

    this.load.on(Phaser.Loader.Events.FILE_LOAD_ERROR, (f: Phaser.Loader.File) =>
      console.warn("No se pudo cargar", f.src),
    );
    this.load.once(Phaser.Loader.Events.COMPLETE, async () => {
      // Esperar la fuente para que los textos no salgan con la letra por defecto
      try {
        await Promise.race([
          Promise.all([
            document.fonts.load('30px "Lilita One"'),
            document.fonts.load('600 17px "Nunito"'),
            document.fonts.load('800 17px "Nunito"'),
          ]),
          new Promise((r) => setTimeout(r, 1500)),
        ]);
      } catch {
        /* si la fuente falla, se usa la de respaldo */
      }
      iniciarSonido(this.game);
      this.scene.start("Juego");
    });
    this.load.start();
  }
}
