// Generador de arte PROVISORIO (plantillas) para los assets nuevos.
// Dibuja cada imagen con canvas y devuelve { "ruta/archivo.png": dataURL }.
// Se ejecuta en un navegador: node herramientas/generar-arte.mjs (ver NOTAS.md).
// Reemplaza cualquier PNG por tu dibujo con el MISMO nombre y tamaño.
//
// Objetos: 256x256, centrados, el círculo de choque mide 240 px (radio 120).

(function () {
  const R = 120; // radio del círculo de choque en la plantilla

  function lienzo(w, h, dibujar) {
    const c = document.createElement("canvas");
    c.width = w;
    c.height = h;
    const g = c.getContext("2d");
    dibujar(g);
    return c.toDataURL("image/png");
  }
  const objeto = (dibujar) => lienzo(256, 256, (g) => { g.translate(128, 128); dibujar(g); });

  function circulo(g, x, y, r, color) { g.fillStyle = color; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
  function aro(g, x, y, r, color, ancho) { g.strokeStyle = color; g.lineWidth = ancho; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  function rect(g, x, y, w, h, radio, color) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(x + radio, y);
    g.arcTo(x + w, y, x + w, y + h, radio);
    g.arcTo(x + w, y + h, x, y + h, radio);
    g.arcTo(x, y + h, x, y, radio);
    g.arcTo(x, y, x + w, y, radio);
    g.closePath();
    g.fill();
  }
  function poligono(g, puntos, color) {
    g.fillStyle = color;
    g.beginPath();
    puntos.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.closePath();
    g.fill();
  }
  function azar(semilla) {
    let s = semilla;
    return () => (s = (s * 16807) % 2147483647) / 2147483647;
  }
  /** Auto visto desde arriba (para estante y otros). */
  function robot(g, cuerpo, techo, vidrio, largo = R * 1.0, ancho = R * 0.6) {
    rect(g, -largo, -ancho, largo * 2, ancho * 2, 30, cuerpo);
    rect(g, largo * 0.15, -ancho * 0.75, largo * 0.38, ancho * 1.5, 12, vidrio);
    rect(g, -largo * 0.75, -ancho * 0.7, largo * 0.3, ancho * 1.4, 12, vidrio);
    rect(g, -largo * 0.42, -ancho * 0.8, largo * 0.55, ancho * 1.6, 14, techo);
    circulo(g, largo * 0.9, -ancho * 0.65, 10, "#ffe08a");
    circulo(g, largo * 0.9, ancho * 0.65, 10, "#ffe08a");
  }

  const dibujos = {
    // ---------- especiales ----------
    "img/objetos/bomba.png": () => objeto((g) => {
      circulo(g, 0, 8, R * 0.82, "#1b1b22");
      circulo(g, -30, -22, R * 0.28, "#3b3b48");
      circulo(g, -40, -34, R * 0.1, "#6b6b7a");
      rect(g, 30, -88, 44, 34, 8, "#555a66");
      g.strokeStyle = "#a5793f"; g.lineWidth = 10; g.lineCap = "round";
      g.beginPath(); g.moveTo(52, -86); g.quadraticCurveTo(80, -118, 100, -100); g.stroke();
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.strokeStyle = i % 2 ? "#ffd34d" : "#ff7a2e"; g.lineWidth = 7;
        g.beginPath(); g.moveTo(100, -100); g.lineTo(100 + Math.cos(a) * 24, -100 + Math.sin(a) * 24); g.stroke();
      }
      circulo(g, 100, -100, 9, "#fff6c8");
    }),

    // ---------- jefes ----------
    "img/objetos/tanque.png": () => objeto((g) => {
      rect(g, -112, -100, 70, 44, 10, "#1c1c1c"); rect(g, -112, 56, 70, 44, 10, "#1c1c1c");
      rect(g, 50, -78, 44, 26, 8, "#1c1c1c"); rect(g, 50, 52, 44, 26, 8, "#1c1c1c");
      rect(g, -100, -60, 205, 120, 22, "#3f9b3a");
      rect(g, 10, -44, 98, 88, 16, "#4fb446");
      for (let i = 0; i < 4; i++) rect(g, 30 + i * 18, -34, 8, 68, 4, "#2f7a2b");
      rect(g, -96, -52, 92, 104, 14, "#2c2c2c");
      rect(g, -86, -42, 72, 84, 10, "#9fd0f2");
      rect(g, -70, -24, 40, 48, 8, "#f2c53d");
    }),
    "img/objetos/contenedor_carga.png": () => objeto((g) => {
      rect(g, -118, -54, 236, 108, 18, "#d63131");
      rect(g, 56, -50, 58, 100, 14, "#b82626");
      rect(g, 74, -40, 30, 80, 8, "#9fd0f2");
      rect(g, -104, -14, 150, 28, 6, "#d9d9d9");
      for (let i = 0; i < 9; i++) rect(g, -100 + i * 17, -18, 6, 36, 2, "#9a9a9a");
      rect(g, -110, -50, 160, 10, 4, "#ffffff"); rect(g, -110, 40, 160, 10, 4, "#ffffff");
      circulo(g, 64, -38, 9, "#3da5ff"); circulo(g, 64, 38, 9, "#ff4040");
    }),
    "img/objetos/nucleo.png": () => objeto((g) => {
      poligono(g, [[-84, -40], [-118, -84], [-60, -44]], "#d63131");
      poligono(g, [[-84, 40], [-118, 84], [-60, 44]], "#d63131");
      rect(g, -96, -44, 170, 88, 40, "#f2f2f2");
      poligono(g, [[70, -44], [118, 0], [70, 44]], "#d63131");
      circulo(g, 20, 0, 24, "#4a6fa5"); circulo(g, 20, 0, 16, "#9fd0f2");
      rect(g, -60, -44, 14, 88, 4, "#c9c9c9");
      poligono(g, [[-96, -26], [-122, 0], [-96, 26]], "#ff9a2e");
    }),

    // ---------- almacen ----------
    "img/objetos/tuerca.png": () => objeto((g) => {
      g.rotate(-0.5);
      rect(g, -100, -46, 140, 92, 34, "#2f8f5a");
      rect(g, 30, -24, 60, 48, 12, "#2f8f5a");
      rect(g, 84, -28, 26, 56, 8, "#d8b13a");
      rect(g, -80, -30, 90, 22, 10, "rgba(255,255,255,0.35)");
      rect(g, -60, -40, 60, 80, 8, "#f1e3c2");
    }),
    "img/objetos/probeta.png": () => objeto((g) => {
      circulo(g, 0, 0, R * 0.92, "#d29a4f");
      circulo(g, 0, 0, R * 0.78, "#c4432f");
      circulo(g, 0, 0, R * 0.72, "#f3cf5a");
      const r = azar(4);
      for (let i = 0; i < 8; i++) { const a = r() * 6.28, d = r() * 60 + 14; circulo(g, Math.cos(a) * d, Math.sin(a) * d, 13, "#b0302a"); }
      g.fillStyle = "rgba(0,0,0,0)"; g.globalCompositeOperation = "destination-out";
      poligono(g, [[0, 0], [R, -40], [R, 40]], "#000"); g.globalCompositeOperation = "source-over";
    }),
    "img/objetos/botiquin.png": () => objeto((g) => {
      rect(g, -112, -26, 224, 52, 18, "#b8231f");
      circulo(g, -108, 0, 22, "#9a1d1a"); circulo(g, 108, 0, 22, "#9a1d1a");
      circulo(g, 0, 0, 82, "#d6302a");
      circulo(g, 0, 0, 60, "#e6493f");
      circulo(g, 0, 0, 28, "#9a1d1a");
      circulo(g, -10, -12, 10, "#ff8b80");
    }),
    "img/objetos/bidon.png": () => objeto((g) => {
      circulo(g, 0, 0, R, "#b9653a");
      circulo(g, 0, 0, R * 0.86, "#d27a48");
      circulo(g, 0, 0, R * 0.72, "#4a3322");
      for (let i = 0; i < 9; i++) {
        g.save(); g.rotate((i / 9) * Math.PI * 2);
        g.fillStyle = i % 2 ? "#3f9b3a" : "#58b84e";
        g.beginPath(); g.ellipse(46, 0, 46, 18, 0, 0, Math.PI * 2); g.fill();
        g.restore();
      }
      circulo(g, 0, 0, 16, "#ffd65c");
    }),
    "img/objetos/carrito.png": () => objeto((g) => {
      const n = 8;
      for (let i = 0; i < n; i++) {
        const a0 = (i / n) * Math.PI * 2, a1 = ((i + 1) / n) * Math.PI * 2;
        poligono(g, [[0, 0], [Math.cos(a0) * R, Math.sin(a0) * R], [Math.cos(a1) * R, Math.sin(a1) * R]], i % 2 ? "#f4f1ea" : "#e0483e");
      }
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        g.strokeStyle = "rgba(0,0,0,0.15)"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R, Math.sin(a) * R); g.stroke();
      }
      circulo(g, 0, 0, 14, "#7a5a3a");
    }),
    "img/objetos/barril.png": () => objeto((g) => {
      rect(g, -118, -76, 236, 152, 14, "#245a3b");
      rect(g, -110, -68, 106, 136, 10, "#2f6f4a");
      rect(g, 4, -68, 106, 136, 10, "#2f6f4a");
      rect(g, -24, -82, 48, 14, 6, "#9aa0a8");
      rect(g, -24, 68, 48, 14, 6, "#9aa0a8");
      for (let i = 0; i < 3; i++) { rect(g, -96, -50 + i * 40, 80, 8, 4, "#245a3b"); rect(g, 18, -50 + i * 40, 80, 8, 4, "#245a3b"); }
    }),
    "img/objetos/estante.png": () => objeto((g) => {
      robot(g, "#f2c12e", "#d9a91f", "#9fd0f2");
      rect(g, -36, -20, 40, 40, 6, "#222");
      g.fillStyle = "#f2c12e"; g.font = "bold 16px sans-serif"; g.textAlign = "center"; g.textBaseline = "middle";
      g.save(); g.rotate(Math.PI / 2); g.fillText("TAXI", 0, 16); g.restore();
      for (let i = 0; i < 8; i++) rect(g, -110 + i * 28, (i % 2 ? 58 : 50), 14, 8, 2, "#222");
    }),
    "img/objetos/montacargas.png": () => objeto((g) => {
      rect(g, -120, -58, 240, 116, 18, "#2f6fd6");
      rect(g, -112, -50, 224, 100, 12, "#e8eef7");
      rect(g, -60, -28, 54, 56, 8, "#b8c4d6");
      rect(g, 10, -28, 54, 56, 8, "#b8c4d6");
      rect(g, 96, -50, 18, 100, 6, "#9fd0f2");
      for (let i = 0; i < 6; i++) circulo(g, -96 + i * 18, 0, 5, "#9aa0a8");
      circulo(g, 112, -44, 7, "#ffe08a"); circulo(g, 112, 44, 7, "#ffe08a");
    }),

    // ---------- reactor ----------
    "img/objetos/fusible.png": () => objeto((g) => {
      poligono(g, [[-R, -10], [-60, -R], [70, -96], [R, 10], [50, R * 0.95], [-80, 90]], "#8d8f96");
      circulo(g, -30, -30, 26, "#73757c"); circulo(g, 40, 30, 18, "#73757c"); circulo(g, -40, 50, 12, "#73757c");
      circulo(g, -36, -36, 10, "#a9abb2");
    }),
    "img/objetos/bateria.png": () => objeto((g) => {
      g.rotate(-0.4);
      rect(g, -112, -6, 224, 12, 6, "#c9c9c9");
      rect(g, -100, -96, 150, 96, 6, "#f4f4f4");
      circulo(g, -25, -48, 30, "#7b4bd6");
      circulo(g, -25, -48, 16, "#1b1030");
      circulo(g, -112, 0, 14, "#9aa0a8");
    }),
    "img/objetos/valvula.png": () => objeto((g) => {
      circulo(g, 0, 0, R, "#e8e8ec");
      circulo(g, 0, 0, R * 0.9, "#f7f7fa");
      g.save(); g.beginPath(); g.ellipse(14, 0, 82, 70, 0, 0, Math.PI * 2); g.clip();
      circulo(g, 14, 0, 90, "#d9a43a"); circulo(g, -10, -20, 34, "rgba(255,255,255,0.45)"); g.restore();
      rect(g, -118, -14, 30, 28, 8, "#c9c9cf");
    }),
    "img/objetos/bobina.png": () => objeto((g) => {
      rect(g, -120, -34, 80, 68, 6, "#2b4f8f"); rect(g, 40, -34, 80, 68, 6, "#2b4f8f");
      for (let i = 0; i < 3; i++) { rect(g, -116 + i * 26, -30, 4, 60, 0, "#4a7cc7"); rect(g, 44 + i * 26, -30, 4, 60, 0, "#4a7cc7"); }
      rect(g, -46, -46, 92, 92, 10, "#d9a43a");
      rect(g, -34, -34, 68, 68, 6, "#f0c35a");
      circulo(g, 0, 0, 18, "#e8e8ec");
    }),
    "img/objetos/panel.png": () => objeto((g) => {
      for (const y of [-72, 72]) for (const x of [-70, 0, 70]) rect(g, x - 20, y - 18, 40, 36, 10, "#2b2b2b");
      rect(g, -96, -58, 192, 116, 14, "#c9ccd2");
      rect(g, -84, -46, 120, 92, 8, "#2b4f8f");
      for (let i = 0; i < 4; i++) rect(g, -80 + i * 30, -46, 3, 92, 0, "#4a7cc7");
      circulo(g, 70, 0, 20, "#e8e8ec"); circulo(g, 74, 0, 8, "#3a3a3a");
    }),
    "img/objetos/generador.png": () => objeto((g) => {
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        g.strokeStyle = "#b8bcc4"; g.lineWidth = 8;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * 104, Math.sin(a) * 104); g.stroke();
        circulo(g, Math.cos(a) * 104, Math.sin(a) * 104, 14, "#9aa0a8");
      }
      const oct = Array.from({ length: 8 }, (_, i) => [Math.cos((i * Math.PI) / 4) * 74, Math.sin((i * Math.PI) / 4) * 74]);
      poligono(g, oct, "#d9a43a");
      circulo(g, 0, 0, 44, "#c9ccd2");
      circulo(g, 0, 0, 22, "#3a3a3a");
    }),
    "img/objetos/transformador.png": () => objeto((g) => {
      circulo(g, 0, 0, R, "#e8e8ec");
      aro(g, 0, 0, R * 0.75, "#c9ccd2", 6);
      aro(g, 0, 0, R * 0.5, "#c9ccd2", 6);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2;
        g.strokeStyle = "#9aa0a8"; g.lineWidth = 6;
        g.beginPath(); g.moveTo(Math.cos(a) * 100, Math.sin(a) * 100); g.lineTo(0, 0); g.stroke();
      }
      circulo(g, 0, 0, 18, "#d63131");
    }),
    "img/objetos/turbina.png": () => objeto((g) => {
      circulo(g, 0, 0, R, "#c9ccd2");
      circulo(g, 0, 0, R * 0.9, "#f2f2f4");
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        g.strokeStyle = "#d4d7dd"; g.lineWidth = 3;
        g.beginPath(); g.moveTo(0, 0); g.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9); g.stroke();
      }
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; circulo(g, Math.cos(a) * 80, Math.sin(a) * 80, 10, "#4a90d9"); }
      circulo(g, 0, 0, 34, "#e8e8ec"); circulo(g, 0, 0, 20, "#4a90d9");
    }),

    // ---------- otros ----------
    "img/dron.png": () => lienzo(128, 128, (g) => {
      g.translate(64, 64);
      for (let i = 0; i < 4; i++) {
        const a = Math.PI / 4 + (i * Math.PI) / 2;
        const x = Math.cos(a) * 40, y = Math.sin(a) * 40;
        g.strokeStyle = "#3a3a44"; g.lineWidth = 8; g.beginPath(); g.moveTo(0, 0); g.lineTo(x, y); g.stroke();
        circulo(g, x, y, 22, "rgba(200,220,255,0.35)");
        aro(g, x, y, 22, "rgba(220,235,255,0.7)", 2);
        circulo(g, x, y, 6, "#3a3a44");
      }
      rect(g, -22, -18, 44, 36, 10, "#e0e3ea");
      rect(g, -14, -10, 28, 20, 6, "#b98cff");
      circulo(g, 16, 0, 4, "#7dff9a");
    }),
    "img/materia.png": () => lienzo(64, 64, (g) => {
      const grad = g.createRadialGradient(26, 24, 2, 32, 32, 28);
      grad.addColorStop(0, "#e6d4ff"); grad.addColorStop(0.35, "#9b6bff"); grad.addColorStop(1, "#2a1050");
      g.fillStyle = grad; g.beginPath(); g.arc(32, 32, 28, 0, Math.PI * 2); g.fill();
      aro(g, 32, 32, 28, "#1a0a33", 3);
      g.fillStyle = "#ffffff";
      g.beginPath(); g.moveTo(24, 14); g.lineTo(27, 22); g.lineTo(35, 25); g.lineTo(27, 28); g.lineTo(24, 36); g.lineTo(21, 28); g.lineTo(13, 25); g.lineTo(21, 22); g.closePath(); g.fill();
    }),

    // ---------- suelos (720x960, hoyo en 360,330) ----------
    "img/suelo_ciudad.png": () => lienzo(720, 960, (g) => {
      const r = azar(11);
      g.fillStyle = "#8d8a86"; g.fillRect(0, 0, 720, 960);
      for (let y = 0; y < 960; y += 60) for (let x = (y / 60) % 2 ? -30 : 0; x < 720; x += 60) {
        g.fillStyle = r() > 0.5 ? "#96938e" : "#87847f"; g.fillRect(x + 2, y + 2, 56, 56);
      }
      g.fillStyle = "#3d3f44"; g.fillRect(0, 700, 720, 180);
      for (let x = 0; x < 720; x += 90) { g.fillStyle = "#e6c34a"; g.fillRect(x + 20, 786, 50, 8); }
      for (let i = 0; i < 8; i++) { g.fillStyle = "#f2f2f2"; g.fillRect(60 + i * 26, 704, 16, 172); }
      for (let i = 0; i < 2; i++) { circulo(g, 120 + i * 470, 140 + i * 380, 26, "#6e6c69"); aro(g, 120 + i * 470, 140 + i * 380, 26, "#5a5856", 4); }
      for (let i = 0; i < 900; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"; g.fillRect(r() * 720, r() * 960, 3, 3); }
      g.strokeStyle = "rgba(40,40,40,0.35)"; g.lineWidth = 2;
      for (let i = 0; i < 6; i++) { let x = r() * 720, y = r() * 960; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 4; k++) { x += (r() - 0.5) * 60; y += (r() - 0.5) * 60; g.lineTo(x, y); } g.stroke(); }
    }),
    "img/suelo_luna.png": () => lienzo(720, 960, (g) => {
      const r = azar(23);
      g.fillStyle = "#7b7d84"; g.fillRect(0, 0, 720, 960);
      for (let i = 0; i < 60; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)"; g.beginPath(); g.ellipse(r() * 720, r() * 960, 40 + r() * 100, 30 + r() * 70, r() * 3, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 28; i++) {
        const x = r() * 720, y = r() * 960, rad = 10 + r() * 46;
        if (Math.hypot(x - 360, y - 330) < 90) continue;
        circulo(g, x + rad * 0.12, y + rad * 0.12, rad * 1.08, "rgba(170,172,178,0.6)");
        circulo(g, x, y, rad, "#62646b");
        circulo(g, x - rad * 0.15, y - rad * 0.15, rad * 0.8, "#6d6f76");
      }
      for (let i = 0; i < 1400; i++) { g.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)"; g.fillRect(r() * 720, r() * 960, 2, 2); }
      for (let i = 0; i < 30; i++) { const x = r() * 720, y = r() * 960; for (let k = 0; k < 6; k++) circulo(g, x + k * 9, y + (k % 2) * 4, 3, "rgba(60,60,66,0.35)"); }
    }),
  };

  window.generarArte = function () {
    const salida = {};
    for (const [ruta, fn] of Object.entries(dibujos)) salida[ruta] = fn();
    return salida;
  };
})();
