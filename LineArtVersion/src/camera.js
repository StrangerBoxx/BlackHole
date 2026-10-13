// The camera. The game runs on a flat floor (W wide, cam.H long) in "ground units".
// toS() projects a floor point onto the screen with perspective (far = smaller),
// and toG() does the opposite so a finger position can be turned back into a floor position.

import { W, TILT, PERSP, HZ, SHAKE } from './config.js';
import { clamp } from './util.js';

/**
 * Camera state, filled in by initCamera() and updated when the window changes size.
 *  H, HX, HY   floor length and the hole position on the floor
 *  A, TOTAL    projection constant and projected floor height
 *  K, TX, TY   zoom and offset that centre the whole floor in the canvas
 *  cw, ch, dpr canvas size in CSS pixels and the device pixel ratio
 *  SX, SY, SR  handheld shake: offset in CSS pixels and tilt in radians around the canvas centre
 */
export const cam = { H: 1000, HX: W / 2, HY: 340, A: 0, TOTAL: 0, K: 1, TX: 0, TY: 0, cw: 1, ch: 1, dpr: 1, SX: 0, SY: 0, SR: 0 };

const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

/**
 * Handheld shake: a few slow, unrelated sine waves added together, so the view drifts and tilts a little like
 * a camera held by someone breathing, without ever repeating in an obvious way. With reduced motion turned on
 * in the system it is kept, but much gentler.
 */
export function updateShake(t, quake = 0) {
  const m = reducedMotion.matches ? 0.35 : 1;
  const a = SHAKE * m;
  cam.SX = a * (0.7 * Math.sin(t * 0.9) + 0.4 * Math.sin(t * 2.3 + 1.3) + 0.12 * Math.sin(t * 7.1 + 0.4));
  cam.SY = a * (0.6 * Math.sin(t * 1.2 + 2.1) + 0.35 * Math.sin(t * 2.9 + 0.7) + 0.12 * Math.sin(t * 6.3 + 2.5));
  cam.SR = a * 0.0012 * (Math.sin(t * 0.7 + 0.5) + 0.5 * Math.sin(t * 1.9 + 2));
  // Earthquake (quake = its strength in CSS pixels): fast, rough shaking on top of the handheld sway.
  if (quake > 0) {
    const q = quake * m;
    cam.SX += q * (Math.sin(t * 47) + 0.6 * Math.sin(t * 73 + 1.1));
    cam.SY += q * (Math.sin(t * 53 + 2) + 0.6 * Math.sin(t * 89 + 0.3));
    cam.SR += q * 0.003 * Math.sin(t * 41 + 0.7);
  }
}

/** Canvas point (CSS pixels) as seen through the shaking camera -> the same point without the shake. */
export function unshake(x, y) {
  const cx = cam.cw / 2 + cam.SX;
  const cy = cam.ch / 2 + cam.SY;
  const c = Math.cos(-cam.SR);
  const s = Math.sin(-cam.SR);
  const dx = x - cx;
  const dy = y - cy;
  return [cam.cw / 2 + dx * c - dy * s, cam.ch / 2 + dx * s + dy * c];
}

/** Call once at start-up with the play-area element and the canvas. */
export function initCamera(stage, canvas) {
  // Floor length: chosen once at load so the projected floor roughly fills the screen shape (900 to 1400).
  const r0 = stage.getBoundingClientRect();
  const ratio = r0.width > 0 ? r0.height / r0.width : 1.5;
  const FOR = (TILT * Math.log(1 + PERSP)) / PERSP;
  cam.H = clamp(Math.round((ratio * (W + 80) - 90) / FOR), 900, 1400);
  cam.HX = W / 2;
  cam.HY = cam.H * 0.34;
  cam.A = (TILT * cam.H) / PERSP;
  cam.TOTAL = cam.A * Math.log(1 + PERSP);

  // Sizes the canvas (sharp on high-DPI screens) and computes zoom + offset so the floor is centred and visible.
  const fit = () => {
    const r = stage.getBoundingClientRect();
    cam.dpr = window.devicePixelRatio || 1;
    cam.cw = r.width;
    cam.ch = r.height;
    canvas.width = Math.round(cam.cw * cam.dpr);
    canvas.height = Math.round(cam.ch * cam.dpr);
    const bx = W + 80;
    const by = cam.TOTAL + 90;
    cam.K = Math.min(cam.cw / bx, cam.ch / by);
    cam.TX = (cam.cw - bx * cam.K) / 2 + 40 * cam.K;
    cam.TY = (cam.ch - by * cam.K) / 2 + (cam.TOTAL + 50) * cam.K;
  };
  fit();
  new ResizeObserver(fit).observe(stage);
}

/** Size scale at floor depth gy (far = smaller). */
export const sc = (gy) => 1 / (1 + (PERSP * (cam.H - gy)) / cam.H);

/** Floor point -> screen point (screen y = 0 is the near edge; far points have negative y). */
export const toS = (x, y) => {
  const k = 1 + (PERSP * (cam.H - y)) / cam.H;
  return [W / 2 + (x - W / 2) / k, -cam.A * Math.log(k)];
};

/** Screen point -> floor point (inverse of toS). */
export const toG = (sx, sy) => {
  const k = Math.exp(-sy / cam.A);
  return [W / 2 + (sx - W / 2) * k, cam.H - ((k - 1) / PERSP) * cam.H];
};

/**
 * The ground you can see on screen (the play area), in floor units: things can be dragged and thrown anywhere in
 * it. It is wider than the floor itself, more so toward the far end where the perspective spreads it out, and
 * reaches down to the bottom of the play area. playX(y) = the left and right edges at floor row y (keeping r away).
 */
export function playX(y, r = 0) {
  const k = 1 + (PERSP * (cam.H - y)) / cam.H;
  const left = -cam.TX / cam.K;
  const right = (cam.cw - cam.TX) / cam.K;
  return [W / 2 + (left - W / 2) * k + r, W / 2 + (right - W / 2) * k - r];
}

/** The nearest floor row still on screen (the bottom edge of the play area). The far limit is the floor's far end (0). */
export const playYMax = () => toG(W / 2, (cam.ch - cam.TY) / cam.K - 4)[1];

/** Objects are drawn standing up: how far the sprite is raised above its ground point (o.z = height in the air). */
export const lift = (o) => {
  const s = sc(o.y) * o.s;
  return o.r * s * 0.8 + o.z * s * HZ;
};

/** Screen position of an object's sprite centre. */
export const ctr = (o) => {
  const p = toS(o.x, o.y);
  return [p[0], p[1] - lift(o)];
};
