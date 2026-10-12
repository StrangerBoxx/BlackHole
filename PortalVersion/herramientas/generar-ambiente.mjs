// Genera public/assets/sonidos/ambiente.wav: ambiente envolvente para el laboratorio con el agujero negro.
// Sin ruido blanco: solo tonos suaves (drone grave, colchón armónico, campanitas y un zumbido eléctrico muy bajo).
// 30 s que empalman perfecto en loop: todas las frecuencias dan vueltas enteras en 30 s
// y las colas de las campanitas del final siguen al principio.
// Uso: node herramientas/generar-ambiente.mjs
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const SR = 44100;
const SEG = 30;
const N = SR * SEG;
const TAU = Math.PI * 2;
const datos = new Float32Array(N);

/** Redondea una frecuencia para que dé vueltas enteras en 30 s (así el loop no se nota). */
const f = (hz) => Math.round(hz * SEG) / SEG;

/** Seno con vibrato suave (periódico en 30 s). */
function voz(t, hz, vibratoHz, vibratoVueltas) {
  return Math.sin(TAU * f(hz) * t + vibratoHz / ((vibratoVueltas || 1) / SEG) * Math.sin((TAU * vibratoVueltas * t) / SEG));
}

// Notas (La menor con novena): La1 55, Mi2 82.4, La2 110, Do3 130.8, Mi3 164.8, Si3 246.9, Do4 261.6, Mi4 329.6
const DRONE = [
  { hz: 55, amp: 0.34, vib: 0.15, vueltas: 2 },
  { hz: 82.41, amp: 0.2, vib: 0.12, vueltas: 3 },
  { hz: 110, amp: 0.16, vib: 0.2, vueltas: 1 },
];
// Colchón: cada nota sube y baja de volumen a su propio ritmo (vueltas enteras en 30 s)
const COLCHON = [
  { hz: 130.81, amp: 0.1, lfo: 1, fase: 0.0 },
  { hz: 164.81, amp: 0.1, lfo: 2, fase: 1.3 },
  { hz: 220.0, amp: 0.08, lfo: 3, fase: 2.1 },
  { hz: 246.94, amp: 0.06, lfo: 2, fase: 4.0 },
  { hz: 261.63, amp: 0.06, lfo: 1, fase: 3.0 },
  { hz: 329.63, amp: 0.05, lfo: 3, fase: 5.2 },
];

for (let i = 0; i < N; i++) {
  const t = i / SR;
  let s = 0;

  // Drone grave del agujero negro, que "respira" cada 15 s
  const respira = 0.7 + 0.3 * Math.sin((TAU * 2 * t) / SEG - Math.PI / 2);
  for (const d of DRONE) {
    const tono = voz(t, d.hz, d.vib, d.vueltas);
    s += d.amp * respira * (tono + 0.25 * Math.sin(2 * TAU * f(d.hz) * t)); // un armónico para calidez
  }

  // Colchón armónico: dos voces apenas desafinadas por nota (efecto coro, suave)
  for (const c of COLCHON) {
    const nivel = c.amp * (0.45 + 0.55 * (0.5 + 0.5 * Math.sin((TAU * c.lfo * t) / SEG + c.fase)));
    s += nivel * 0.5 * (Math.sin(TAU * f(c.hz) * t) + Math.sin(TAU * f(c.hz + 0.4) * t));
  }

  // Zumbido eléctrico del laboratorio: muy bajo y redondo (sin "bzzz" áspero)
  s += 0.025 * Math.sin(TAU * 100 * t) + 0.012 * Math.sin(TAU * 50 * t);

  datos[i] = s;
}

// Campanitas de cristal: notas de la escala pentatónica de La, en momentos fijos, con cola larga
const CAMPANAS = [
  [1.2, 880], [4.6, 1046.5], [7.9, 1318.5], [11.3, 987.8], [14.0, 880], [17.4, 1174.7],
  [20.1, 1318.5], [23.6, 1046.5], [26.2, 783.99], [28.7, 1174.7],
];
for (const [inicio, hz] of CAMPANAS) {
  const largo = Math.floor(SR * 3.5);
  const i0 = Math.floor(inicio * SR);
  for (let k = 0; k < largo; k++) {
    const t = k / SR;
    const ataque = Math.min(1, t / 0.012);
    const cuerpo = Math.exp(-t / 1.1);
    const brillo = Math.exp(-t / 0.35);
    const muestra =
      ataque *
      (0.06 * cuerpo * Math.sin(TAU * hz * t) +
        0.025 * brillo * Math.sin(TAU * hz * 2 * t) +
        0.015 * brillo * Math.sin(TAU * hz * 2.76 * t)); // parcial "de cristal"
    datos[(i0 + k) % N] += muestra; // lo que pasa del final sigue al principio
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
