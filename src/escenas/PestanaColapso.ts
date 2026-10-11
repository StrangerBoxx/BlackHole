// Pestaña "Colapso" del panel: colapsar y comprar mejoras permanentes con materia oscura.
import { getBalance } from "../core/Balance";
import { COLOR, EVENTOS_GLOBALES, hex } from "../core/estilo";
import { progreso } from "../core/Progreso";
import { describirPermanente, estadisticasPermanentes, materiaPorColapso, puedeColapsar } from "../logica/colapso";
import { costoMejora, estaAlMaximo } from "../logica/mejoras";
import { formatearNumero } from "../logica/monedas";
import { zonaDe } from "../logica/objetos";
import { Boton } from "../ui/Boton";
import { registrarPestana } from "./PanelScene";

/** Para confirmar con un segundo toque. */
let confirmarHasta = 0;

registrarPestana({
  id: "colapso",
  titulo: "Colapso",
  dibujar(panel, area) {
    const b = getBalance();
    const e = progreso.exportar();
    const zona = zonaDe(b, e.zona);
    const ultima = e.zona >= b.zonas.length - 1;
    const siguiente = zonaDe(b, e.zona + 1);
    const puede = puedeColapsar(b, e);
    const ganaria = materiaPorColapso(b, e.ganadasVuelta);

    // Encabezado: materia oscura
    panel.poner(panel.add.image(area.x + 22, area.y + 22, "materia").setDisplaySize(40, 40));
    panel.texto(area.x + 52, area.y + 2, `Materia oscura: ${formatearNumero(e.materiaOscura)}`, 30, COLOR.texto, true);

    // Tarjeta de colapso
    const y0 = area.y + 58;
    const alto = 228;
    const g = panel.poner(panel.add.graphics());
    g.fillStyle(hex("#2a1d3d"), 1).fillRoundedRect(area.x, y0, area.width, alto, 16);
    g.lineStyle(2, hex(puede ? COLOR.acento : COLOR.linea), 1).strokeRoundedRect(area.x, y0, area.width, alto, 16);
    const explicacion = ultima
      ? `El hoyo se traga toda la ${zona.nombre}. Pierdes monedas y mejoras, vuelves a empezar aquí y ganas materia oscura.`
      : `El hoyo se traga todo el ${zona.nombre}. Pierdes monedas y mejoras, pasas a ${siguiente.nombre} (todo vale x${siguiente.multiplicadorValor}) y ganas materia oscura.`;
    panel.texto(area.x + 18, y0 + 14, explicacion, 18).setWordWrapWidth(area.width - 36);
    const tamano = b.mejoras.find((m) => m.id === "size")!;
    panel.texto(
      area.x + 18,
      y0 + 96,
      puede ? `Ganarías +${formatearNumero(ganaria)} materia oscura` : `Necesitas Tamaño al máximo (${e.niveles.size}/${tamano.max})`,
      21,
      puede ? COLOR.acento : COLOR.peligro,
    );
    panel.texto(area.x + 18, y0 + 128, `Monedas ganadas en esta vuelta: ${formatearNumero(e.ganadasVuelta)}`, 16, COLOR.apagado);

    const armado = performance.now() < confirmarHasta;
    const boton = panel.poner(
      new Boton(panel, area.centerX, y0 + alto - 38, { ancho: 320, alto: 54, texto: armado ? "¿Seguro? Toca otra vez" : "¡Colapsar!", tamano: 22 }, () => {
        if (performance.now() > confirmarHasta) {
          confirmarHasta = performance.now() + 3000;
          panel.redibujar();
          panel.time.delayedCall(3100, () => panel.redibujar());
          return;
        }
        confirmarHasta = 0;
        const r = progreso.colapsar(b);
        if (!r) return;
        panel.cerrar();
        panel.game.events.emit(EVENTOS_GLOBALES.COLAPSO, r);
      }),
    );
    boton.setActivo(puede);
    if (puede) boton.setColores({ borde: COLOR.acento, fondo: "#3a2a55", colorTexto: armado ? COLOR.peligro : COLOR.texto });

    // Mejoras permanentes
    const yLista = y0 + alto + 18;
    panel.texto(area.x, yLista, "Mejoras permanentes (no se pierden)", 20, COLOR.apagado);
    const altoFila = 74;
    b.permanentes.forEach((p, i) => {
      const y = yLista + 34 + i * (altoFila + 8);
      const nivel = e.permanentes[p.id] ?? 0;
      const max = estaAlMaximo(p, nivel);
      const costo = costoMejora(p, nivel);
      const alcanza = !max && e.materiaOscura >= costo;
      const gf = panel.poner(panel.add.graphics());
      gf.fillStyle(hex(COLOR.tierra2), 1).fillRoundedRect(area.x, y, area.width, altoFila, 12);
      gf.lineStyle(1.5, hex(alcanza ? COLOR.acento : COLOR.linea), 1).strokeRoundedRect(area.x, y, area.width, altoFila, 12);
      panel.texto(area.x + 14, y + 8, `${p.nombre}  ${nivel}/${p.max}`, 20);
      const proximo = estadisticasPermanentes(b, { ...e.permanentes, [p.id]: max ? nivel : nivel + 1 });
      panel.texto(area.x + 14, y + 40, describirPermanente(p.id, proximo) + (max ? "" : " (siguiente)"), 15, COLOR.apagado);
      const comprar = panel.poner(
        new Boton(panel, area.right - 74, y + altoFila / 2, { ancho: 128, alto: 50, texto: max ? "Máximo" : `${costo}`, tamano: 21 }, () => {
          if (progreso.comprarPermanente(b, p.id)) panel.game.events.emit(EVENTOS_GLOBALES.COMPRA, p.id, nivel + 1);
        }),
      );
      if (!max) panel.poner(panel.add.image(area.right - 120, y + altoFila / 2, "materia").setDisplaySize(24, 24));
      comprar.setActivo(alcanza);
    });
  },
});
