// Generador de arte PROVISORIO, estilo "laboratorio blanco".
// Dibuja cada imagen con canvas y devuelve { "ruta/archivo.png": dataURL }.
// Se ejecuta con: node herramientas/generar-arte.mjs (ver NOTAS.md).
// Reemplaza cualquier PNG por tu dibujo con el MISMO nombre y tamaño.
//
// Objetos: 256x256, centrados, el círculo de choque mide 240 px (radio 120). Vistos desde arriba.
// Hoyo: borde 512 px = radio×3.4 · remolino 512 px = radio×3.8 · núcleo 256 px = radio×2.
// Las sombras NO van en el dibujo: las pone el juego.

(function () {
  const R = 120; // radio del círculo de choque en la plantilla

  // Paleta del laboratorio
  const C = {
    fondo: "#e3e8eb",
    blanco: "#f7f9fa",
    acero: "#d5dce1",
    aceroMedio: "#aab4bc",
    aceroOscuro: "#6e7b86",
    linea: "#2b3640",
    naranja: "#f07a1c",
    naranjaClaro: "#ffa45c",
    cian: "#1a9fd6",
    cianClaro: "#7fd3f2",
    amarillo: "#ffc93c",
    rojo: "#d9433b",
    vidrio: "rgba(190,230,245,0.55)",
  };

  // ---------------------------------------------------------------- utilidades
  function lienzo(w, h, dibujar) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    g.lineJoin = "round";
    g.lineCap = "round";
    dibujar(g);
    return c.toDataURL("image/png");
  }
  const objeto = (dibujar) => lienzo(256, 256, (g) => { g.translate(128, 128); dibujar(g); });

  function trazo(g, color = C.linea, ancho = 5) { g.strokeStyle = color; g.lineWidth = ancho; g.stroke(); }
  function circulo(g, x, y, r, relleno, borde, ancho) {
    g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) trazo(g, borde, ancho);
  }
  function caminoRect(g, x, y, w, h, r) {
    g.beginPath();
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r);
    g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r);
    g.arcTo(x, y, x + w, y, r);
    g.closePath();
  }
  function rect(g, x, y, w, h, r, relleno, borde, ancho) {
    caminoRect(g, x, y, w, h, r);
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) trazo(g, borde, ancho);
  }
  function poligono(g, puntos, relleno, borde, ancho) {
    g.beginPath();
    puntos.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    if (relleno) { g.fillStyle = relleno; g.fill(); }
    if (borde) trazo(g, borde, ancho);
  }
  function linea(g, x1, y1, x2, y2, color, ancho) {
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); trazo(g, color, ancho);
  }
  const hexagono = (r, giro = 0) =>
    Array.from({ length: 6 }, (_, i) => [Math.cos(giro + (i * Math.PI) / 3) * r, Math.sin(giro + (i * Math.PI) / 3) * r]);
  function azar(semilla) {
    let s = semilla;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  /** Brillo blanco suave arriba a la izquierda (luz cálida desde la izquierda). */
  function brillo(g, x, y, rx, ry) {
    g.save(); g.fillStyle = "rgba(255,255,255,0.45)";
    g.beginPath(); g.ellipse(x, y, rx, ry, -0.6, 0, Math.PI * 2); g.fill(); g.restore();
  }
  /** Franjas de peligro amarillo/negro dentro de un rectángulo. */
  function franjas(g, x, y, w, h, paso = 22) {
    g.save(); caminoRect(g, x, y, w, h, 4); g.clip();
    g.fillStyle = C.amarillo; g.fillRect(x, y, w, h);
    for (let i = -h; i < w + h; i += paso * 2) poligono(g, [[x + i, y + h], [x + i + paso, y + h], [x + i + paso + h, y], [x + i + h, y]], C.linea);
    g.restore();
    rect(g, x, y, w, h, 4, null, C.linea, 4);
  }

  // ---------------------------------------------------------------- dibujos
  const dibujos = {
    // ===== Laboratorio =====
    "img/objetos/tornillo.png": () => objeto((g) => {
      poligono(g, hexagono(R * 0.95, Math.PI / 6), C.acero, C.linea, 8);
      circulo(g, 0, 0, R * 0.62, C.blanco, C.aceroOscuro, 6);
      poligono(g, hexagono(R * 0.3, 0), C.aceroOscuro);
      brillo(g, -40, -45, 34, 16);
    }),
    "img/objetos/matraz.png": () => objeto((g) => {
      g.rotate(-0.5);
      poligono(g, [[-100, -88], [-100, 88], [40, 34], [40, -34]], C.vidrio, C.linea, 7);
      poligono(g, [[-96, -60], [-96, 84], [-10, 50], [-10, -26]], "rgba(26,159,214,0.75)");
      rect(g, 36, -30, 54, 60, 8, C.vidrio, C.linea, 7);
      rect(g, 86, -26, 26, 52, 6, C.naranja, C.linea, 6);
      circulo(g, -60, 30, 9, "rgba(255,255,255,0.7)");
      circulo(g, -40, 60, 6, "rgba(255,255,255,0.7)");
    }),
    "img/objetos/casco.png": () => objeto((g) => {
      g.beginPath(); g.ellipse(0, 10, R * 0.98, R * 0.88, 0, 0, Math.PI * 2); g.fillStyle = C.naranja; g.fill(); trazo(g, C.linea, 7);
      g.beginPath(); g.ellipse(0, -6, R * 0.74, R * 0.7, 0, 0, Math.PI * 2); g.fillStyle = C.naranjaClaro; g.fill(); trazo(g, C.linea, 5);
      rect(g, -14, -88, 28, 160, 12, C.naranja, C.linea, 5);
      brillo(g, -40, -40, 30, 18);
      rect(g, 36, 18, 34, 22, 5, C.blanco, C.linea, 3);
    }),
    "img/objetos/extintor.png": () => objeto((g) => {
      g.rotate(-0.4);
      rect(g, -110, -46, 170, 92, 46, C.rojo, C.linea, 7);
      rect(g, 50, -30, 36, 60, 10, C.aceroOscuro, C.linea, 6);
      rect(g, 80, -14, 34, 28, 6, C.linea);
      g.beginPath(); g.moveTo(70, 26); g.quadraticCurveTo(60, 100, -10, 80); trazo(g, C.linea, 10);
      rect(g, -60, -30, 70, 60, 6, C.blanco, C.linea, 4);
      circulo(g, -26, 0, 16, C.cianClaro, C.linea, 4);
      brillo(g, -70, -26, 30, 10);
    }),
    "img/objetos/silla.png": () => objeto((g) => {
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i / 5) * Math.PI * 2;
        linea(g, 0, 0, Math.cos(a) * 104, Math.sin(a) * 104, C.linea, 14);
        circulo(g, Math.cos(a) * 104, Math.sin(a) * 104, 14, C.aceroOscuro, C.linea, 4);
      }
      circulo(g, 0, 0, R * 0.62, "#55708a", C.linea, 7);
      circulo(g, 0, 0, R * 0.46, "#6f8ca6");
      g.beginPath(); g.arc(0, 0, R * 0.78, Math.PI * 0.15, Math.PI * 0.85); trazo(g, C.linea, 30);
      g.beginPath(); g.arc(0, 0, R * 0.78, Math.PI * 0.18, Math.PI * 0.82); trazo(g, "#55708a", 20);
      brillo(g, -26, -28, 24, 12);
    }),
    "img/objetos/caja_herramientas.png": () => objeto((g) => {
      rect(g, -112, -72, 224, 144, 14, C.naranja, C.linea, 8);
      rect(g, -112, -72, 224, 34, 14, C.naranjaClaro);
      rect(g, -112, -72, 224, 144, 14, null, C.linea, 8);
      linea(g, -112, -6, 112, -6, C.linea, 5);
      rect(g, -54, -98, 108, 26, 10, C.aceroMedio, C.linea, 6);
      rect(g, -96, -18, 26, 22, 4, C.acero, C.linea, 4);
      rect(g, 70, -18, 26, 22, 4, C.acero, C.linea, 4);
      for (const [x, y] of [[-96, 50], [96, 50], [-96, -50], [96, -50]]) circulo(g, x, y, 5, C.linea);
    }),
    "img/objetos/servidor.png": () => objeto((g) => {
      rect(g, -96, -110, 192, 220, 12, "#3a4651", C.linea, 8);
      for (let i = 0; i < 6; i++) {
        const y = -94 + i * 34;
        rect(g, -82, y, 164, 26, 5, "#4d5b67");
        for (let k = 0; k < 7; k++) linea(g, -70 + k * 14, y + 6, -70 + k * 14, y + 20, "#2b3640", 3);
        circulo(g, 52, y + 13, 5, i % 3 ? C.cian : C.naranja);
        circulo(g, 68, y + 13, 5, C.cianClaro);
      }
      g.beginPath(); g.moveTo(96, 60); g.quadraticCurveTo(130, 90, 110, 116); trazo(g, C.naranja, 8);
    }),
    "img/objetos/robot.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.98, C.blanco, C.linea, 8);
      g.beginPath(); g.arc(0, 0, R * 0.98, -0.9, 0.9); trazo(g, C.aceroMedio, 16);
      g.beginPath(); g.arc(0, 0, R * 0.98, -0.9, 0.9); trazo(g, C.linea, 4);
      circulo(g, 0, 0, R * 0.72, null, C.cian, 8);
      circulo(g, -10, 0, R * 0.42, C.acero, C.linea, 5);
      rect(g, -40, -18, 50, 36, 8, "#1d2a35", C.linea, 3);
      circulo(g, -26, 0, 6, C.cianClaro); circulo(g, -4, 0, 6, C.cianClaro);
      for (const s of [-1, 1]) {
        g.save(); g.translate(70, s * 70);
        for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); linea(g, 0, 0, 22, 0, C.naranja, 5); }
        g.restore();
      }
      circulo(g, 88, 0, 7, C.naranja);
      brillo(g, -50, -60, 32, 14);
    }),
    "img/objetos/tanque.png": () => objeto((g) => {
      rect(g, -118, -66, 220, 132, 60, "#dbe8f0", C.linea, 8);
      rect(g, -118, -66, 220, 40, 30, "#eef6fb");
      rect(g, -118, -66, 220, 132, 60, null, C.linea, 8);
      for (const x of [-60, 20]) rect(g, x, -66, 12, 132, 0, C.aceroMedio);
      rect(g, -40, -26, 70, 52, 8, C.blanco, C.linea, 4);
      g.fillStyle = C.cian; g.font = "bold 30px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("N₂", -5, 2);
      rect(g, 98, -18, 22, 36, 6, C.aceroOscuro, C.linea, 5);
      g.save(); g.translate(118, 0);
      circulo(g, 0, 0, 26, null, C.naranja, 9);
      linea(g, -26, 0, 26, 0, C.naranja, 6); linea(g, 0, -26, 0, 26, C.naranja, 6);
      g.restore();
      for (let i = 0; i < 10; i++) circulo(g, -100 + i * 20, 52 - (i % 3) * 6, 3, "rgba(255,255,255,0.9)");
    }),

    // ===== Almacén =====
    "img/objetos/tuerca.png": () => objeto((g) => {
      poligono(g, hexagono(R * 0.95, Math.PI / 6), C.aceroMedio, C.linea, 8);
      circulo(g, 0, 0, R * 0.5, C.fondo, C.linea, 7);
      circulo(g, 0, 0, R * 0.5, null, C.aceroOscuro, 3);
      brillo(g, -50, -40, 26, 12);
    }),
    "img/objetos/probeta.png": () => objeto((g) => {
      g.rotate(-0.7);
      rect(g, -112, -34, 200, 68, 34, C.vidrio, C.linea, 7);
      rect(g, -108, -28, 110, 56, 28, "rgba(240,122,28,0.85)");
      rect(g, 80, -42, 36, 84, 10, C.aceroOscuro, C.linea, 6);
      linea(g, -60, -34, -60, -14, C.linea, 4); linea(g, -20, -34, -20, -14, C.linea, 4); linea(g, 20, -34, 20, -14, C.linea, 4);
      circulo(g, -80, -8, 6, "rgba(255,255,255,0.8)");
    }),
    "img/objetos/botiquin.png": () => objeto((g) => {
      rect(g, -110, -82, 220, 164, 18, C.blanco, C.linea, 8);
      rect(g, -110, -82, 220, 30, 18, C.acero);
      rect(g, -110, -82, 220, 164, 18, null, C.linea, 8);
      rect(g, -20, -54, 40, 108, 6, C.rojo); rect(g, -54, -20, 108, 40, 6, C.rojo);
      rect(g, -44, -102, 88, 22, 8, C.aceroMedio, C.linea, 5);
    }),
    "img/objetos/bidon.png": () => objeto((g) => {
      rect(g, -96, -110, 192, 220, 22, "#3f7fb3", C.linea, 8);
      rect(g, -96, -110, 192, 60, 22, "#5a9ccc");
      rect(g, -96, -110, 192, 220, 22, null, C.linea, 8);
      poligono(g, [[-60, 20], [60, 20], [70, 80], [-70, 80]], "#356c99");
      rect(g, -66, -96, 90, 30, 12, C.aceroMedio, C.linea, 5);
      circulo(g, 56, -76, 22, C.naranja, C.linea, 5);
      linea(g, -60, 30, 60, 70, "#2a5a80", 6);
    }),
    "img/objetos/carrito.png": () => objeto((g) => {
      for (const [x, y] of [[-92, -72], [92, -72], [-92, 72], [92, 72]]) circulo(g, x, y, 18, C.linea);
      rect(g, -104, -78, 208, 156, 12, C.acero, C.linea, 8);
      for (let i = -80; i <= 80; i += 32) linea(g, i, -70, i, 70, C.aceroMedio, 4);
      rect(g, -84, -58, 80, 70, 6, "#c79a5c", C.linea, 5);
      rect(g, 10, -30, 70, 80, 6, "#d8ad70", C.linea, 5);
      linea(g, -84, -24, -4, -24, "#9b7440", 4);
      rect(g, -124, -50, 20, 100, 8, C.aceroOscuro, C.linea, 5);
    }),
    "img/objetos/barril.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.96, C.amarillo, C.linea, 8);
      circulo(g, 0, 0, R * 0.78, null, "#d9a21f", 8);
      circulo(g, 0, 0, R * 0.56, null, "#d9a21f", 6);
      poligono(g, [[0, -46], [42, 30], [-42, 30]], C.linea);
      poligono(g, [[0, -30], [28, 20], [-28, 20]], C.amarillo);
      rect(g, -4, -14, 8, 22, 3, C.linea); circulo(g, 0, 14, 4, C.linea);
      circulo(g, 60, -60, 12, C.aceroMedio, C.linea, 4);
      brillo(g, -50, -50, 26, 12);
    }),
    "img/objetos/estante.png": () => objeto((g) => {
      rect(g, -120, -54, 240, 108, 8, C.aceroMedio, C.linea, 8);
      const colores = ["#c79a5c", C.cian, C.naranja, "#d8ad70"];
      for (let i = 0; i < 4; i++) {
        const x = -112 + i * 57;
        rect(g, x, -46, 51, 92, 4, C.acero);
        rect(g, x + 6, -38, 39, 34, 4, colores[i], C.linea, 3);
        rect(g, x + 6, 4, 39, 34, 4, colores[(i + 2) % 4], C.linea, 3);
      }
      rect(g, -120, -54, 240, 108, 8, null, C.linea, 8);
    }),
    "img/objetos/montacargas.png": () => objeto((g) => {
      rect(g, 54, -50, 66, 14, 4, C.linea); rect(g, 54, 36, 66, 14, 4, C.linea);
      rect(g, 40, -62, 14, 124, 4, C.aceroOscuro, C.linea, 4);
      for (const [x, y] of [[-70, -64], [20, -64], [-70, 64], [20, 64]]) rect(g, x - 18, y - 12, 36, 24, 6, C.linea);
      rect(g, -100, -58, 140, 116, 22, C.naranja, C.linea, 8);
      rect(g, -100, -58, 140, 30, 18, C.naranjaClaro);
      rect(g, -100, -58, 140, 116, 22, null, C.linea, 8);
      rect(g, -60, -40, 80, 80, 8, null, C.linea, 6);
      linea(g, -60, -40, 20, 40, C.linea, 4); linea(g, 20, -40, -60, 40, C.linea, 4);
      rect(g, -110, -30, 20, 60, 6, C.aceroOscuro, C.linea, 5);
    }),
    "img/objetos/contenedor_carga.png": () => objeto((g) => {
      rect(g, -120, -60, 240, 120, 6, C.cian, C.linea, 8);
      for (let x = -104; x <= 104; x += 16) linea(g, x, -54, x, 54, "#1584b3", 5);
      for (const [x, y] of [[-112, -52], [112, -52], [-112, 52], [112, 52]]) rect(g, x - 10, y - 10, 20, 20, 3, C.aceroOscuro, C.linea, 3);
      rect(g, -40, -24, 80, 48, 6, C.blanco, C.linea, 4);
      franjas(g, -34, -12, 68, 24, 10);
      rect(g, -120, -60, 240, 120, 6, null, C.linea, 8);
    }),

    // ===== Reactor =====
    "img/objetos/fusible.png": () => objeto((g) => {
      g.rotate(-0.6);
      rect(g, -72, -40, 144, 80, 20, C.vidrio, C.linea, 7);
      g.beginPath(); g.moveTo(-70, 0); for (let i = 0; i < 7; i++) g.lineTo(-50 + i * 17, i % 2 ? -18 : 18); g.lineTo(70, 0); trazo(g, C.naranja, 5);
      rect(g, -118, -46, 50, 92, 12, C.aceroMedio, C.linea, 7);
      rect(g, 68, -46, 50, 92, 12, C.aceroMedio, C.linea, 7);
      brillo(g, -30, -24, 24, 6);
    }),
    "img/objetos/bateria.png": () => objeto((g) => {
      g.rotate(-0.5);
      rect(g, -104, -54, 196, 108, 14, "#2f3a44", C.linea, 8);
      rect(g, -40, -54, 70, 108, 0, C.cian);
      rect(g, -104, -54, 196, 108, 14, null, C.linea, 8);
      rect(g, 90, -24, 26, 48, 6, C.aceroMedio, C.linea, 6);
      g.fillStyle = C.blanco; g.font = "bold 44px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.fillText("+", 60, 0); g.fillText("−", -76, -2);
      poligono(g, [[-10, -40], [-26, 6], [-6, 6], [-16, 40], [16, -10], [-4, -10], [6, -40]], C.amarillo, C.linea, 3);
    }),
    "img/objetos/valvula.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.92, null, C.linea, 30);
      circulo(g, 0, 0, R * 0.92, null, C.rojo, 18);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        linea(g, 0, 0, Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, C.linea, 18);
        linea(g, 0, 0, Math.cos(a) * R * 0.86, Math.sin(a) * R * 0.86, C.rojo, 9);
      }
      circulo(g, 0, 0, 26, C.aceroMedio, C.linea, 6);
      circulo(g, 0, 0, 9, C.linea);
    }),
    "img/objetos/bobina.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.98, C.aceroMedio, C.linea, 8);
      for (let r = 98; r > 38; r -= 9) circulo(g, 0, 0, r, null, r % 2 ? "#c46a1a" : C.naranja, 6);
      circulo(g, 0, 0, 34, C.acero, C.linea, 6);
      circulo(g, 0, 0, 12, C.linea);
      g.beginPath(); g.moveTo(90, 30); g.quadraticCurveTo(130, 60, 100, 110); trazo(g, C.naranja, 8);
    }),
    "img/objetos/panel.png": () => objeto((g) => {
      rect(g, -112, -86, 224, 172, 14, C.acero, C.linea, 8);
      rect(g, -96, -70, 110, 70, 8, "#16222c", C.linea, 4);
      g.beginPath(); g.moveTo(-88, -30); for (let i = 0; i < 9; i++) g.lineTo(-84 + i * 11, -30 + (i % 2 ? -18 : 6)); trazo(g, C.cianClaro, 4);
      for (let i = 0; i < 3; i++) circulo(g, 40 + (i % 2) * 34, -50 + i * 26, 12, i === 1 ? C.naranja : C.cian, C.linea, 4);
      for (let i = 0; i < 5; i++) { rect(g, -92 + i * 38, 22, 28, 46, 5, C.aceroMedio, C.linea, 4); rect(g, -86 + i * 38, 30 + (i * 7) % 24, 16, 10, 3, i % 2 ? C.naranja : C.cian); }
    }),
    "img/objetos/generador.png": () => objeto((g) => {
      rect(g, -112, -82, 224, 164, 16, C.naranja, C.linea, 8);
      rect(g, -112, -82, 224, 34, 16, C.naranjaClaro);
      rect(g, -112, -82, 224, 164, 16, null, C.linea, 8);
      circulo(g, -30, 6, 60, "#3a4651", C.linea, 7);
      for (let i = 0; i < 6; i++) { g.save(); g.translate(-30, 6); g.rotate((i / 6) * Math.PI * 2); poligono(g, [[0, 0], [52, -10], [52, 14]], C.aceroMedio); g.restore(); }
      circulo(g, -30, 6, 14, C.linea);
      rect(g, 52, -50, 44, 100, 8, C.acero, C.linea, 5);
      for (let i = 0; i < 4; i++) linea(g, 60, -36 + i * 24, 88, -36 + i * 24, C.aceroOscuro, 4);
    }),
    "img/objetos/transformador.png": () => objeto((g) => {
      rect(g, -100, -96, 200, 192, 12, C.aceroMedio, C.linea, 8);
      for (let x = -84; x <= 84; x += 21) linea(g, x, -90, x, 90, C.aceroOscuro, 6);
      rect(g, -60, -54, 120, 108, 10, C.acero, C.linea, 6);
      for (const x of [-34, 0, 34]) { circulo(g, x, -24, 16, C.cian, C.linea, 5); circulo(g, x, -24, 7, C.cianClaro); }
      poligono(g, [[-26, 8], [6, 8], [-6, 30], [20, 30], [-14, 50], [-4, 32], [-28, 32]], C.amarillo, C.linea, 3);
    }),
    "img/objetos/turbina.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.98, C.acero, C.linea, 8);
      circulo(g, 0, 0, R * 0.84, "#26323c", C.linea, 6);
      for (let i = 0; i < 10; i++) {
        g.save(); g.rotate((i / 10) * Math.PI * 2);
        poligono(g, [[16, -6], [96, -20], [98, 6], [18, 10]], C.aceroMedio, C.linea, 3);
        g.restore();
      }
      circulo(g, 0, 0, 28, C.cian, C.linea, 6);
      circulo(g, 0, 0, 12, C.cianClaro);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; circulo(g, Math.cos(a) * 110, Math.sin(a) * 110, 5, C.linea); }
    }),
    "img/objetos/nucleo.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.99, C.aceroMedio, C.linea, 8);
      for (let i = 0; i < 12; i++) {
        const a0 = (i / 12) * Math.PI * 2, a1 = ((i + 0.5) / 12) * Math.PI * 2;
        g.beginPath(); g.arc(0, 0, 104, a0, a1); trazo(g, C.amarillo, 14);
        g.beginPath(); g.arc(0, 0, 104, a1, a1 + Math.PI / 12); trazo(g, C.linea, 14);
      }
      circulo(g, 0, 0, 84, C.acero, C.linea, 6);
      const grad = g.createRadialGradient(0, 0, 4, 0, 0, 64);
      grad.addColorStop(0, "#ffffff"); grad.addColorStop(0.35, C.cianClaro); grad.addColorStop(1, C.cian);
      circulo(g, 0, 0, 64, grad, C.linea, 6);
      for (let i = 0; i < 3; i++) { g.save(); g.rotate((i / 3) * Math.PI * 2); poligono(g, [[0, 0], [-22, -50], [22, -50]], "rgba(43,54,64,0.55)"); g.restore(); }
      circulo(g, 0, 0, 12, "#ffffff", C.linea, 3);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + 0.2; circulo(g, Math.cos(a) * 74, Math.sin(a) * 74, 5, C.linea); }
    }),

    // ===== Especial: carga inestable (bomba) =====
    "img/objetos/bomba.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.95, C.amarillo, C.linea, 8);
      for (let i = 0; i < 8; i++) { g.beginPath(); g.arc(0, 0, R * 0.86, (i / 8) * Math.PI * 2, ((i + 0.5) / 8) * Math.PI * 2); trazo(g, C.linea, 14); }
      const grad = g.createRadialGradient(-10, -10, 4, 0, 0, 70);
      grad.addColorStop(0, "#ffe2c8"); grad.addColorStop(0.4, "#ff6a3d"); grad.addColorStop(1, "#b5261d");
      circulo(g, 0, 0, 70, grad, C.linea, 6);
      poligono(g, [[0, -34], [30, 22], [-30, 22]], C.amarillo, C.linea, 5);
      rect(g, -4, -16, 8, 22, 3, C.linea); circulo(g, 0, 13, 4, C.linea);
      rect(g, 54, -96, 16, 30, 4, C.aceroOscuro, C.linea, 4);
      circulo(g, 62, -102, 10, C.rojo, C.linea, 3);
    }),

    // ===== Hoyo =====
    // Borde: placas del piso rotas alrededor de la grieta (lo de afuera queda transparente)
    "img/hoyo_borde.png": () => lienzo(512, 512, (g) => {
      g.translate(256, 256);
      const H = 512 / 3.4; // radio del hoyo en este dibujo
      const r = azar(31);
      for (let i = 0; i < 14; i++) {
        const a0 = (i / 14) * Math.PI * 2, a1 = ((i + 1) / 14) * Math.PI * 2;
        const rin = H * (0.98 + r() * 0.06), rout = H * (1.32 + r() * 0.32);
        const am = (a0 + a1) / 2;
        const pts = [
          [Math.cos(a0 + 0.02) * rin, Math.sin(a0 + 0.02) * rin],
          [Math.cos(a0 + 0.04) * rout, Math.sin(a0 + 0.04) * rout],
          [Math.cos(am) * (rout + H * 0.08 * r()), Math.sin(am) * (rout + H * 0.08 * r())],
          [Math.cos(a1 - 0.04) * rout * 0.96, Math.sin(a1 - 0.04) * rout * 0.96],
          [Math.cos(a1 - 0.02) * rin, Math.sin(a1 - 0.02) * rin],
        ];
        const tono = 205 - Math.round(r() * 30);
        poligono(g, pts, `rgb(${tono},${tono + 8},${tono + 14})`, "rgba(43,54,64,0.85)", 4);
      }
      // Sombra hacia adentro: se hunde
      const sombra = g.createRadialGradient(0, 0, H * 0.95, 0, 0, H * 1.5);
      sombra.addColorStop(0, "rgba(20,30,40,0.75)"); sombra.addColorStop(1, "rgba(20,30,40,0)");
      g.fillStyle = sombra; g.beginPath(); g.arc(0, 0, H * 1.5, 0, Math.PI * 2); g.fill();
      // Anillo de contención con franjas de peligro
      for (let i = 0; i < 24; i++) {
        g.beginPath(); g.arc(0, 0, H * 1.06, (i / 24) * Math.PI * 2, ((i + 1) / 24) * Math.PI * 2);
        trazo(g, i % 2 ? C.linea : C.amarillo, H * 0.1);
      }
      circulo(g, 0, 0, H * 1.12, null, C.linea, 3);
      circulo(g, 0, 0, H * 1.0, null, C.linea, 5);
      // Grietas
      for (let i = 0; i < 10; i++) {
        let a = r() * Math.PI * 2, d = H * 1.12;
        g.beginPath(); g.moveTo(Math.cos(a) * d, Math.sin(a) * d);
        for (let k = 0; k < 4; k++) { a += (r() - 0.5) * 0.25; d += H * 0.14; g.lineTo(Math.cos(a) * d, Math.sin(a) * d); }
        trazo(g, "rgba(43,54,64,0.7)", 3);
      }
    }),
    // Remolino: arcos de energía cian y naranja (casi todo transparente; el juego lo hace girar)
    "img/hoyo_remolino.png": () => lienzo(512, 512, (g) => {
      g.translate(256, 256);
      const H = 512 / 3.8;
      for (let i = 0; i < 6; i++) {
        const color = i % 2 ? "rgba(240,122,28," : "rgba(26,159,214,";
        g.save(); g.rotate((i / 6) * Math.PI * 2);
        for (let k = 0; k < 18; k++) {
          const t = k / 18;
          const rad = H * (1.85 - t * 0.8);
          g.beginPath(); g.arc(0, 0, rad, t * 1.4, t * 1.4 + 0.22);
          trazo(g, `${color}${(0.15 + t * 0.6).toFixed(2)})`, 3 + t * 5);
        }
        g.restore();
      }
      const r = azar(7);
      for (let i = 0; i < 40; i++) {
        const a = r() * Math.PI * 2, d = H * (1.05 + r() * 0.8);
        circulo(g, Math.cos(a) * d, Math.sin(a) * d, 1.5 + r() * 2.5, r() > 0.5 ? "rgba(127,211,242,0.8)" : "rgba(255,164,92,0.8)");
      }
    }),
    // Núcleo: negro profundo con borde cian que brilla
    "img/hoyo_nucleo.png": () => lienzo(256, 256, (g) => {
      const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grad.addColorStop(0, "#020406"); grad.addColorStop(0.62, "#05101a"); grad.addColorStop(0.86, "#0b2a40");
      grad.addColorStop(0.95, "#1a9fd6"); grad.addColorStop(1, "rgba(127,211,242,0.9)");
      g.fillStyle = grad; g.beginPath(); g.arc(128, 128, 128, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(128, 128, 104, 0.6, 2.2); trazo(g, "rgba(240,122,28,0.35)", 4);
    }),

    // ===== Interfaz =====
    // Chip de energía (la "moneda")
    "img/moneda.png": () => lienzo(64, 64, (g) => {
      g.translate(32, 32);
      for (let i = 0; i < 4; i++) {
        g.save(); g.rotate((i * Math.PI) / 2);
        for (const x of [-10, 0, 10]) rect(g, x - 2.5, -30, 5, 8, 1, C.aceroMedio, C.linea, 1.5);
        g.restore();
      }
      rect(g, -22, -22, 44, 44, 7, C.cian, C.linea, 3);
      rect(g, -22, -22, 44, 14, 7, C.cianClaro);
      rect(g, -22, -22, 44, 44, 7, null, C.linea, 3);
      rect(g, -11, -11, 22, 22, 4, C.naranja, C.linea, 2.5);
      linea(g, -11, 0, -20, 0, C.linea, 2); linea(g, 11, 0, 20, 0, C.linea, 2);
      circulo(g, 0, 0, 4, "#ffe0c2");
    }),
    "img/materia.png": () => lienzo(64, 64, (g) => {
      const grad = g.createRadialGradient(26, 24, 2, 32, 32, 28);
      grad.addColorStop(0, "#e6f6ff"); grad.addColorStop(0.35, "#5b4bd6"); grad.addColorStop(1, "#140c33");
      g.fillStyle = grad; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
      circulo(g, 32, 32, 28, null, C.linea, 3);
      g.beginPath(); g.ellipse(32, 32, 26, 9, -0.5, 0, Math.PI * 2); trazo(g, "rgba(26,159,214,0.9)", 2);
      g.fillStyle = "#ffffff";
      g.beginPath(); g.moveTo(24, 14); g.lineTo(27, 22); g.lineTo(35, 25); g.lineTo(27, 28); g.lineTo(24, 36); g.lineTo(21, 28); g.lineTo(13, 25); g.lineTo(21, 22); g.closePath(); g.fill();
    }),
    "img/dron.png": () => lienzo(128, 128, (g) => {
      g.translate(64, 64);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const x = Math.cos(a) * 40, y = Math.sin(a) * 40;
        linea(g, 0, 0, x, y, C.linea, 9); linea(g, 0, 0, x, y, C.aceroMedio, 5);
        circulo(g, x, y, 22, "rgba(127,211,242,0.3)", C.cian, 2.5);
        circulo(g, x, y, 6, C.linea);
      }
      rect(g, -22, -18, 44, 36, 10, C.blanco, C.linea, 3);
      rect(g, -12, -8, 24, 16, 5, "#16222c");
      circulo(g, -4, 0, 3, C.cianClaro);
      circulo(g, 16, 0, 4, C.naranja);
    }),

    // ===== Suelos (720x960, el hoyo está en 360,330) =====
    "img/suelo.png": () => lienzo(720, 960, (g) => {
      const r = azar(5);
      g.fillStyle = C.fondo; g.fillRect(0, 0, 720, 960);
      // Baldosas grandes con juntas suaves
      for (let y = 0; y < 960; y += 80) for (let x = 0; x < 720; x += 80) {
        const t = 228 + Math.round(r() * 8);
        g.fillStyle = `rgb(${t - 4},${t + 2},${t + 5})`; g.fillRect(x + 2, y + 2, 76, 76);
      }
      g.strokeStyle = "rgba(150,165,175,0.5)"; g.lineWidth = 2;
      for (let x = 0; x <= 720; x += 80) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 960); g.stroke(); }
      for (let y = 0; y <= 960; y += 80) { g.beginPath(); g.moveTo(0, y); g.lineTo(720, y); g.stroke(); }
      // Pasillo marcado con línea cian y franjas de peligro
      g.fillStyle = "rgba(26,159,214,0.18)"; g.fillRect(0, 720, 720, 120);
      linea(g, 0, 720, 720, 720, "rgba(26,159,214,0.7)", 4); linea(g, 0, 840, 720, 840, "rgba(26,159,214,0.7)", 4);
      franjas(g, 40, 870, 220, 24, 14);
      franjas(g, 460, 870, 220, 24, 14);
      // Rejillas de desagüe
      for (const [x, y] of [[100, 120], [600, 560], [120, 600]]) {
        rect(g, x - 30, y - 30, 60, 60, 6, C.acero, "rgba(43,54,64,0.6)", 3);
        for (let k = -20; k <= 20; k += 10) linea(g, x - 22, y + k, x + 22, y + k, "rgba(43,54,64,0.5)", 3);
      }
      // Canaleta de cables
      rect(g, 640, 0, 36, 700, 6, C.acero, "rgba(43,54,64,0.4)", 2);
      linea(g, 652, 0, 652, 700, "rgba(240,122,28,0.6)", 4); linea(g, 664, 0, 664, 700, "rgba(26,159,214,0.6)", 4);
      // Marcas de uso
      for (let i = 0; i < 40; i++) {
        g.strokeStyle = `rgba(110,123,134,${0.08 + r() * 0.1})`; g.lineWidth = 1 + r() * 2;
        const x = r() * 720, y = r() * 960; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 60, y + (r() - 0.5) * 20); g.stroke();
      }
    }),
    "img/suelo_almacen.png": () => lienzo(720, 960, (g) => {
      const r = azar(17);
      g.fillStyle = "#d9d6cf"; g.fillRect(0, 0, 720, 960);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${r() > 0.5 ? "255,255,255" : "120,110,95"},0.08)`; g.beginPath(); g.ellipse(r() * 720, r() * 960, 30 + r() * 90, 20 + r() * 60, r() * 3, 0, Math.PI * 2); g.fill(); }
      g.strokeStyle = "rgba(120,110,95,0.35)"; g.lineWidth = 2;
      for (let x = 0; x <= 720; x += 120) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 960); g.stroke(); }
      for (let y = 0; y <= 960; y += 120) { g.beginPath(); g.moveTo(0, y); g.lineTo(720, y); g.stroke(); }
      // Carriles amarillos para montacargas
      for (const x of [40, 680]) linea(g, x, 0, x, 960, C.amarillo, 10);
      linea(g, 40, 760, 680, 760, C.amarillo, 10);
      for (let x = 80; x < 680; x += 60) linea(g, x, 860, x + 30, 860, C.amarillo, 8);
      // Marcas de pallets
      for (const [x, y] of [[90, 90], [560, 100], [560, 560], [80, 520]]) {
        rect(g, x, y, 90, 70, 4, "rgba(150,120,80,0.18)", "rgba(120,100,70,0.35)", 2);
        for (let k = 10; k < 90; k += 20) linea(g, x + k, y, x + k, y + 70, "rgba(120,100,70,0.25)", 2);
      }
      franjas(g, 300, 900, 120, 26, 13);
    }),
    "img/suelo_reactor.png": () => lienzo(720, 960, (g) => {
      const r = azar(29);
      g.fillStyle = "#c9d2d8"; g.fillRect(0, 0, 720, 960);
      // Chapa diamantada
      g.fillStyle = "rgba(255,255,255,0.35)";
      for (let y = 0; y < 960; y += 24) for (let x = (y / 24) % 2 ? 12 : 0; x < 720; x += 24) {
        g.save(); g.translate(x, y); g.rotate(0.6); g.fillRect(-7, -2, 14, 4); g.restore();
      }
      g.strokeStyle = "rgba(43,54,64,0.35)"; g.lineWidth = 3;
      for (let x = 0; x <= 720; x += 180) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 960); g.stroke(); }
      for (let y = 0; y <= 960; y += 240) { g.beginPath(); g.moveTo(0, y); g.lineTo(720, y); g.stroke(); }
      for (let x = 0; x <= 720; x += 180) for (let y = 0; y <= 960; y += 240) circulo(g, x + (x ? -8 : 8), y + (y ? -8 : 8), 4, C.aceroOscuro);
      // Líneas de energía cian y naranja
      linea(g, 0, 640, 720, 640, "rgba(26,159,214,0.75)", 6);
      linea(g, 0, 652, 720, 652, "rgba(240,122,28,0.6)", 3);
      linea(g, 90, 0, 90, 640, "rgba(26,159,214,0.6)", 4);
      linea(g, 630, 0, 630, 640, "rgba(26,159,214,0.6)", 4);
      franjas(g, 0, 900, 720, 30, 18);
      for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(43,54,64,${0.05 + r() * 0.08})`; g.beginPath(); g.ellipse(r() * 720, r() * 960, 20 + r() * 50, 6 + r() * 14, r() * 3, 0, Math.PI * 2); g.fill(); }
    }),
  };

  window.generarArte = function () {
    const salida = {};
    for (const [ruta, fn] of Object.entries(dibujos)) salida[ruta] = fn();
    return salida;
  };
})();
