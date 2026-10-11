// Genera public/assets/sonidos/ambiente.wav: ambiente de laboratorio con zumbido eléctrico.
// 30 s que empalman perfecto en loop (todas las ondas dan vueltas enteras en 30 s y el ruido se funde).
// Uso: node herramientas/generar-ambiente.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const SEG = 30;
const N = SR * SEG;
const FUNDIDO = 2 * SR; // segundos de mezcla del ruido al final con el principio

// Ruido con semilla (siempre el mismo resultado)
let semilla = 12345;
const azar = () => ((semilla = (semilla * 16807) % 2147483647) / 2147483647) * 2 - 1;

/** Ruido filtrado (pasa bajos de un polo) con N + FUNDIDO muestras, mezclado para que empalme. */
function ruidoEnLoop(corte) {
  const a = Math.exp((-2 * Math.PI * corte) / SR);
  const largo = N + FUNDIDO;
  const crudo = new Float32Array(largo);
  let y = 0;
  for (let i = 0; i < largo; i++) crudo[i] = y = (1 - a) * azar() + a * y;
  const salida = new Float32Array(N);
  for (let i = 0; i < N; i++) salida[i] = crudo[i];
  for (let i = 0; i < FUNDIDO; i++) {
    const t = i / FUNDIDO;
    salida[i] = crudo[i] * t + crudo[N + i] * (1 - t);
  }
  return salida;
}

const ventilacion = ruidoEnLoop(900);
const soplido = ruidoEnLoop(180);
const datos = new Float32Array(N);
const TAU = Math.PI * 2;

// Chasquidos eléctricos (pocos y suaves), en posiciones fijas
const chasquidos = Array.from({ length: 14 }, () => Math.floor(((azar() + 1) / 2) * (N - SR)));

for (let i = 0; i < N; i++) {
  const t = i / SR;
  // LFOs con vueltas enteras en 30 s → el loop no se nota
  const respira = 0.5 + 0.5 * Math.sin((TAU * 2 * t) / SEG);
  const tiembla = 0.5 + 0.5 * Math.sin((TAU * 7 * t) / SEG);

  // Zumbido de la red eléctrica: 50 Hz y armónicos (el de 100 Hz es el "bzzz")
  let zumbido = 0;
  const armonicos = [[50, 0.5], [100, 0.9], [150, 0.35], [200, 0.25], [250, 0.12], [300, 0.1], [350, 0.05]];
  for (const [f, amp] of armonicos) zumbido += amp * Math.sin(TAU * f * t);
  zumbido *= 0.18 * (0.75 + 0.25 * tiembla);

  // Tono grave del hoyo (55 Hz y su quinta), que respira lento
  const grave = (0.22 * Math.sin(TAU * 55 * t) + 0.1 * Math.sin(TAU * 82 * t)) * (0.6 + 0.4 * respira);

  // Ventilación y soplido de fondo
  const aire = ventilacion[i] * 0.55 * (0.7 + 0.3 * respira) + soplido[i] * 1.2;

  datos[i] = zumbido + grave + aire;
}

// Chasquidos: ráfagas cortas de ruido agudo que se apagan rápido
for (const inicio of chasquidos) {
  const largo = Math.floor(SR * 0.05);
  for (let k = 0; k < largo; k++) {
    const env = Math.exp(-k / (SR * 0.008));
    datos[inicio + k] += azar() * 0.25 * env;
  }
}

// Normalizar a 80 % (igual que los otros sonidos) y escribir WAV 16 bits mono
let pico = 0;
for (const x of datos) pico = Math.max(pico, Math.abs(x));
const k = 0.8 / pico;
const buf = Buffer.alloc(44 + N * 2);
buf.write("RIFF", 0);
buf.writeUInt32LE(36 + N * 2, 4);
buf.write("WAVE", 8);
buf.write("fmt ", 12);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(1, 22);
buf.writeUInt32LE(SR, 24);
buf.writeUInt32LE(SR * 2, 28);
buf.writeUInt16LE(2, 32);
buf.writeUInt16LE(16, 34);
buf.write("data", 36);
buf.writeUInt32LE(N * 2, 40);
for (let i = 0; i < N; i++) buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, datos[i] * k)) * 32767), 44 + i * 2);

const destino = join(dirname(fileURLToPath(import.meta.url)), "../public/assets/sonidos/ambiente.wav");
writeFileSync(destino, buf);
console.log("Listo:", destino, `(${SEG} s, ${(buf.length / 1024 / 1024).toFixed(1)} MB)`);
