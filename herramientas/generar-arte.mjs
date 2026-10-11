// Genera las imágenes provisorias de herramientas/arte.js en public/assets/.
// Uso:  node herramientas/generar-arte.mjs            (solo crea las que faltan)
//       node herramientas/generar-arte.mjs --todas    (reemplaza todas: ¡pisa tus dibujos!)
// Necesita Google Chrome instalado (lo abre sin ventana para dibujar).
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const todas = process.argv.includes("--todas");
const chromes = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/usr/bin/google-chrome",
];
const ruta = chromes.find(existsSync);
if (!ruta) throw new Error("No encontré Google Chrome");

const puerto = 9400 + Math.floor(Math.random() * 400);
const chrome = spawn(ruta, ["--headless=new", `--remote-debugging-port=${puerto}`, `--user-data-dir=${join(tmpdir(), "bh-arte")}`, "about:blank"]);
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));
let ws;
for (let i = 0; i < 40 && !ws; i++) {
  try {
    const pag = (await (await fetch(`http://127.0.0.1:${puerto}/json`)).json()).find((t) => t.type === "page");
    if (pag) ws = new WebSocket(pag.webSocketDebuggerUrl);
  } catch { await esperar(250); }
}
await new Promise((r) => ws.addEventListener("open", r));
let id = 0;
const pendientes = new Map();
ws.addEventListener("message", (e) => { const m = JSON.parse(e.data); pendientes.get(m.id)?.(m); });
const cmd = (method, params) => new Promise((r) => { pendientes.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });

const codigo = readFileSync(join(raiz, "herramientas/arte.js"), "utf8") + "\nJSON.stringify(window.generarArte())";
const r = await cmd("Runtime.evaluate", { expression: codigo, returnByValue: true });
if (r.result.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails));
const imagenes = JSON.parse(r.result.result.value);

let creadas = 0, saltadas = 0;
for (const [archivo, dataUrl] of Object.entries(imagenes)) {
  const destino = join(raiz, "public/assets", archivo);
  if (existsSync(destino) && !todas) { saltadas++; continue; }
  mkdirSync(dirname(destino), { recursive: true });
  writeFileSync(destino, Buffer.from(dataUrl.split(",")[1], "base64"));
  creadas++;
  console.log("creada", archivo);
}
console.log(`Listo: ${creadas} creadas, ${saltadas} ya existían (no se tocaron).`);
ws.close();
chrome.kill();
process.exit(0);
