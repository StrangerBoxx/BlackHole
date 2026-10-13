// Everything that is drawn on the canvas, in black and white ink:
// the horizon, the spinning vortex, the objects (with shadows) and the "+coins" popups.

import { W, TAU, TILT, PERSP, TYPES, UP_GRAB_H, QUAKE, upH, reach } from './config.js';
import { cam, sc, toS, ctr, updateShake } from './camera.js';
import { world, quakeEnv } from './world.js';
import { clamp } from './util.js';

let ctx;

// Object images: src/assets/objects/<type id>.svg (or .png). Each one is a square image with the object centred;
// its width is SPRITE x the diameter, so a circle touching 80% of the width is the object's collision size.
// Standing figures (up: true in TYPES) are the exception: any proportions, UP_H (or their h) tall, feet at the bottom edge,
// plus an optional <id>-grabbed image (UP_GRAB_H tall) for while it is held.
// Each image is drawn into an offscreen canvas at the size it really has on screen (redone when the window is
// resized), so the game only shrinks it a little per frame. Shrinking a big image a lot in one go every frame
// makes thin ink lines flicker in and out as things move.
const SPRITE = 1.25;
// file name ("humano", "humano-grabbed") -> { cv: canvas, w, h in floor units, hx = where the top of the image is,
// as a fraction of its width }, filled in as the images load
const sprites = {};
const loaded = []; // { name, t, grabbed, img } for every image that finished loading
let spriteRes = 0; // canvas pixels per floor unit the sprites were drawn at
const spriteUrls = import.meta.glob('./assets/objects/*.{svg,png}', { eager: true, query: '?url', import: 'default' });

/** Pixels per floor unit for an object at the front of the floor while held (the biggest it gets). */
const wantedRes = () => cam.K * cam.dpr * 1.15;

/** Draw img into a new w x h canvas, halving step by step first so a big shrink keeps every line. */
function shrink(img, w, h) {
  let src = img;
  let sw = img.naturalWidth || img.width;
  let sh = img.naturalHeight || img.height;
  while (sw > w * 2 && sh > h * 2) {
    sw = Math.ceil(sw / 2);
    sh = Math.ceil(sh / 2);
    const half = document.createElement('canvas');
    half.width = sw;
    half.height = sh;
    const hg = half.getContext('2d');
    hg.imageSmoothingQuality = 'high';
    hg.drawImage(src, 0, 0, sw, sh);
    src = half;
  }
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const g = cv.getContext('2d', { willReadFrequently: true });
  g.imageSmoothingQuality = 'high';
  g.drawImage(src, 0, 0, w, h);
  return cv;
}

function bake({ name, t, grabbed, img }) {
  const h = grabbed ? UP_GRAB_H : t.up ? upH(t) : 2 * t.r * SPRITE * (t.look || 1);
  const w = t.up ? (h * img.naturalWidth) / img.naturalHeight : h;
  const cv = shrink(img, Math.max(1, Math.ceil(w * spriteRes)), Math.max(1, Math.ceil(h * spriteRes)));
  // Find the top of the drawing (the raised hand on a grabbed figure): middle of the first solid row.
  let hx = 0.5;
  const rows = Math.min(cv.height, 20);
  const top = cv.getContext('2d').getImageData(0, 0, cv.width, rows).data;
  for (let y = 0, found = false; y < rows && !found; y++) {
    const xs = [];
    for (let x = 0; x < cv.width; x++) if (top[(y * cv.width + x) * 4 + 3] > 128) xs.push(x);
    if (xs.length) {
      hx = (xs[0] + xs[xs.length - 1]) / 2 / cv.width;
      found = true;
    }
  }
  sprites[name] = { cv, w, h, hx };
}

/** Redraw every sprite when the on-screen size changed noticeably (window resized, phone rotated). */
function checkSprites() {
  const want = wantedRes();
  if (Math.abs(want - spriteRes) / want < 0.03) return;
  spriteRes = want;
  loaded.forEach(bake);
}

/** File name of a type's held pose. */
const grabName = (t) => t.grab || (t.img || t.id) + '-grabbed';
/** File name of a type's falling image (in the air, and sinking into the hole). */
const fallName = (t) => t.fallImg || (t.img || t.id) + '-fall';
/** File name of a type's walking frames, without the -1, -2 ... */
const walkName = (t) => t.walk || (t.img || t.id) + '-walk';
const walkFrames = {}; // type id -> its walking frame file names, in order (frame 1 first)

function loadSprites() {
  for (const [path, url] of Object.entries(spriteUrls)) {
    const name = path.match(/([^/]+)\.\w+$/)[1];
    let t = TYPES.find((t) => name === (t.img || t.id) || name === grabName(t) || (t.up && name === fallName(t)));
    // Walking frame: <walk name>-<number>
    const m = !t && name.match(/^(.+)-(\d+)$/);
    if (m) {
      t = TYPES.find((t) => t.up && walkName(t) === m[1]);
      if (t) {
        if (!walkFrames[t.id]) walkFrames[t.id] = [];
        walkFrames[t.id][m[2] - 1] = name;
      }
    }
    if (!t) continue;
    const entry = { name, t, grabbed: name === grabName(t), img: new Image() };
    entry.img.onload = () => {
      loaded.push(entry);
      if (spriteRes) bake(entry);
    };
    entry.img.src = url;
  }
}

export function initRender(canvas) {
  ctx = canvas.getContext('2d');
  loadSprites();
}

// ---------- drawing helpers ----------

/** Trace a path through a list of [x, y] points (then call ctx.stroke() or ctx.fill()). */
function poly(pts) {
  ctx.beginPath();
  pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])));
}

/** Filled circle. */
function dot(x, y, r, fill) {
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}


/**
 * The coin (same drawing as src/assets/icons/coin.svg: a bitcoin-style B in a ring) centred at x, y, r in radius,
 * on a white disc so it reads over anything, a = opacity.
 */
const COIN_B = new Path2D('M11 8.5h6.2a3.6 3.6 0 0 1 0 7.2H11zM11 15.7h7.2a3.9 3.9 0 0 1 0 7.8H11zM11 8.5v15M8.8 8.5H11M8.8 23.5H11');
const COIN_BARS = new Path2D('M13.6 5.6v2.9M17 5.6v2.9M13.6 23.5v2.9M17 23.5v2.9');
function drawCoin(x, y, r, a) {
  dot(x, y, r, `rgba(255,255,255,${a})`);
  ctx.save();
  ctx.translate(x - r, y - r);
  ctx.scale(r / 16, r / 16);
  ctx.strokeStyle = `rgba(0,0,0,${a})`;
  ctx.lineCap = 'square';
  ctx.lineJoin = 'miter';
  ctx.lineWidth = 2.6;
  ctx.beginPath();
  ctx.arc(16, 16, 14.2, 0, TAU);
  ctx.stroke();
  ctx.stroke(COIN_B);
  ctx.lineCap = 'butt';
  ctx.lineWidth = 2.2;
  ctx.stroke(COIN_BARS);
  ctx.restore();
}

// ---------- the scene ----------

// ---------- the ground: a dry, moon-like plain ----------
// Craters, cracks, rocks and rubble, drawn in ink on the floor in perspective. They never change, so they are
// worked out once (from a fixed random seed, so the ground looks the same every time) and kept as ready-made
// paths in floor-drawing units; every frame just paints those paths (the handheld camera only moves the whole
// picture). Everything is spread a bit wider than the floor so the ground also fills the sides of the screen.
let terrain = null; // { H, craters: [...], cracks, shadows, rocks, rockLines, pebbles }

/** Same random numbers every time (mulberry32). */
function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * clearR: nothing is placed within this distance of the hole (the vortex's darkness covers it). The random numbers
 * are drawn the same way whatever clearR is, so the rest of the ground doesn't move when the vortex grows.
 */
function buildTerrain(clearR) {
  const rnd = seeded(7);
  const R = (a, b) => a + rnd() * (b - a);
  const H = cam.H;
  const X0 = -320, X1 = W + 320; // floor x range to fill (the far end of the screen is wider than the floor)
  const t = {
    H,
    craters: [],
    cracks: new Path2D(), shadows: new Path2D(), rocks: new Path2D(), rockLines: new Path2D(), pebbles: new Path2D(),
  };
  // a closed shape on the floor: points around (x, y) at radius rad(angle), projected with perspective
  const blob = (path, x, y, n, rad, dy = 0, dx = 0) => {
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const p = toS(x + Math.cos(a) * rad(i % n) + dx, y + Math.sin(a) * rad(i % n) + dy);
      i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]);
    }
    path.closePath();
  };
  // outside the vortex's darkness (with room for something of size r)?
  const clear = (x, y, r) => Math.hypot(x - cam.HX, y - cam.HY) > clearR + r;
  // part of a circle on the floor, from angle a0 to a1 (angles: 0 = right, PI / 2 = toward you)
  const arc = (path, x, y, r, a0, a1, n = 18) => {
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      const p = toS(x + Math.cos(a) * r, y + Math.sin(a) * r);
      i ? path.lineTo(p[0], p[1]) : path.moveTo(p[0], p[1]);
    }
  };

  // Craters: hollows in the ground, lit from the far left (like the rocks' shadows). The bowl darkens toward its
  // far side (you look down into it), the far-left inside wall is in shadow with ink hatching, the near edge -
  // where the ground drops away - is a crisp line and the far rim only a faint one; a little debris lies around.
  for (let i = 0; i < 10; i++) {
    const x = R(X0 + 150, X1 - 150), y = R(H * 0.04, H * 1.05), r = R(26, 70);
    if (Math.hypot(x - cam.HX, y - cam.HY) < r + 140) continue; // not under the vortex
    const c = { bowl: new Path2D(), shade: new Path2D(), hatch: new Path2D(), near: new Path2D(), far: new Path2D() };
    blob(c.bowl, x, y, 32, () => r);
    // shadow: the bowl minus a smaller copy moved toward you and to the right -> a crescent inside the far-left rim
    blob(c.shade, x, y, 32, () => r);
    blob(c.shade, x, y, 32, () => r * 0.9, r * 0.34, r * 0.2);
    arc(c.near, x, y, r, 0.1, Math.PI - 0.1);
    arc(c.far, x, y, r, Math.PI + 0.25, TAU - 0.25);
    // hatching over the crater's box, every few units at 45 degrees (only shows inside the shadow)
    const tl = toS(x - r, y - r), br = toS(x + r, y + r);
    const gap = 3.4 * sc(y);
    for (let d = tl[0] - (br[1] - tl[1]); d < br[0]; d += gap) {
      c.hatch.moveTo(d, br[1]);
      c.hatch.lineTo(d + (br[1] - tl[1]), tl[1]);
    }
    c.grad = ctx.createLinearGradient(0, tl[1], 0, br[1]);
    c.grad.addColorStop(0, 'rgba(0,0,0,.2)');
    c.grad.addColorStop(0.55, 'rgba(0,0,0,.07)');
    c.grad.addColorStop(1, 'rgba(0,0,0,.02)');
    const shown = clear(x, y, r * 1.6); // (a big vortex covers it: worked out anyway, so the rest stays put)
    if (shown) t.craters.push(c);
    // debris thrown out around it (added to the rubble below)
    for (let k = 0; k < 12; k++) {
      const a = R(0, TAU), d = r * R(1.08, 1.6);
      t.debris = t.debris || [];
      if (shown) t.debris.push([x + Math.cos(a) * d, y + Math.sin(a) * d]);
    }
  }

  // Cracks: jagged lines that wander and sometimes fork.
  const crack = (x, y, a, steps, len) => {
    let p = toS(x, y);
    t.cracks.moveTo(p[0], p[1]);
    for (let s = 0; s < steps; s++) {
      a += R(-0.65, 0.65);
      x += Math.cos(a) * len * R(0.6, 1.2);
      y += Math.sin(a) * len * R(0.6, 1.2);
      p = toS(x, y);
      if (clear(x, y, 0)) t.cracks.lineTo(p[0], p[1]);
      else t.cracks.moveTo(p[0], p[1]); // under the vortex: a gap
      if (rnd() < 0.28 && steps > 3) {
        crack(x, y, a + (rnd() < 0.5 ? 1 : -1) * R(0.5, 1.1), Math.floor(steps / 2), len * 0.7);
        p = toS(x, y);
        t.cracks.moveTo(p[0], p[1]);
      }
    }
  };
  for (let i = 0; i < 18; i++) crack(R(X0 + 100, X1 - 100), R(0, H * 1.1), R(0, TAU), Math.floor(R(4, 9)), R(12, 24));

  // Rocks: lumpy outlined stones with a soft shadow and one ink stroke on the shaded side; a few big boulders.
  const rocks = [];
  for (let i = 0; i < 95; i++) rocks.push([R(X0, X1), R(0, H * 1.12), i < 5 ? R(11, 17) : R(2.5, 8)]);
  for (const [x, y, r] of rocks) {
    const lumps = Array.from({ length: 7 }, () => R(0.72, 1.15));
    if (!clear(x, y, r * 1.5)) continue;
    blob(t.shadows, x + r * 0.35, y + r * 0.45, 10, () => r * 1.05);
    blob(t.rocks, x, y, 7, (k) => r * lumps[k]);
    const a = toS(x - r * 0.1, y + r * 0.55), b = toS(x + r * 0.6, y + r * 0.2);
    t.rockLines.moveTo(a[0], a[1]);
    t.rockLines.lineTo(b[0], b[1]);
  }

  // Rubble: tiny specks, half scattered everywhere and half gathered around the rocks.
  const speck = (x, y, r) => {
    if (!clear(x, y, r)) return;
    const p = toS(x, y), s = sc(y);
    t.pebbles.moveTo(p[0] + r * s, p[1]);
    t.pebbles.ellipse(p[0], p[1], r * s, r * s * TILT * 0.9, 0, 0, TAU);
  };
  for (let i = 0; i < 420; i++) speck(R(X0, X1), R(0, H * 1.12), R(0.6, 1.8));
  for (const [x, y] of t.debris || []) speck(x, y, R(0.6, 1.6));
  for (const [x, y, r] of rocks) {
    const n = Math.floor(R(2, 6));
    for (let k = 0; k < n; k++) speck(x + R(-3, 3) * r, y + R(-2, 3) * r, R(0.5, 1.4));
  }
  return t;
}

function drawTerrain() {
  // Rebuilt (rarely) when the vortex grows, so the ground under its darkness stays empty.
  const clearR = Math.ceil((reach(world.shP, world.shR) * 1.12) / 6) * 6;
  if (!terrain || terrain.H !== cam.H || terrain.clearR !== clearR) {
    terrain = buildTerrain(clearR);
    terrain.clearR = clearR;
  }
  const t = terrain;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  for (const c of t.craters) {
    ctx.fillStyle = c.grad;
    ctx.fill(c.bowl);
    ctx.save();
    ctx.clip(c.bowl); // the shadow stays inside the crater
    ctx.fillStyle = 'rgba(0,0,0,.12)';
    ctx.fill(c.shade, 'evenodd');
    ctx.clip(c.shade, 'evenodd');
    ctx.strokeStyle = 'rgba(0,0,0,.4)';
    ctx.lineWidth = 0.8;
    ctx.stroke(c.hatch);
    ctx.restore();
    ctx.strokeStyle = 'rgba(0,0,0,.22)';
    ctx.lineWidth = 1;
    ctx.stroke(c.far);
    ctx.strokeStyle = 'rgba(0,0,0,.75)';
    ctx.lineWidth = 1.6;
    ctx.stroke(c.near);
  }
  ctx.strokeStyle = 'rgba(0,0,0,.5)';
  ctx.lineWidth = 1.2;
  ctx.stroke(t.cracks);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  ctx.fill(t.pebbles);
  ctx.fillStyle = 'rgba(0,0,0,.1)';
  ctx.fill(t.shadows);
  ctx.fillStyle = '#f3f3f3';
  ctx.fill(t.rocks);
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.4;
  ctx.stroke(t.rocks);
  ctx.strokeStyle = 'rgba(0,0,0,.55)';
  ctx.lineWidth = 1;
  ctx.stroke(t.rockLines);
}

/** Where the horizon line is on screen: a little beyond the far edge of the floor. Nothing on the ground goes past it. */
const horizonY = () => toS(W / 2, 0)[1] - 28;

/** The background: the horizon with a range of low, bumpy hills on it, plus a faint haze under it. */
function drawHorizon() {
  // The horizon sits a little beyond the far edge of the floor and spans the whole screen width.
  const hy = horizonY();
  // (with extra margin so the ends never show while the handheld camera tilts)
  const x0 = -cam.TX / cam.K - 80;
  const x1 = (cam.cw - cam.TX) / cam.K + 80;
  // Faint haze just under the line: the ground looks darker toward the horizon and fades out toward you.
  const g = ctx.createLinearGradient(0, hy, 0, hy + 170);
  g.addColorStop(0, 'rgba(0,0,0,.12)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x0, hy, x1 - x0, 170);
  // Distant hills: a low bumpy ridge (a few overlapping waves, the same every time) sitting on the horizon.
  const ridge = [];
  for (let x = x0; x <= x1 + 12; x += 12) {
    const h = 6 + 3.5 * Math.sin(x * 0.011 + 1.3) + 2.5 * Math.sin(x * 0.027 + 0.4) + 1.5 * Math.sin(x * 0.071 + 2.2);
    ridge.push([x, hy - Math.max(2, h)]);
  }
  ctx.fillStyle = 'rgba(0,0,0,.07)';
  poly([[x0, hy], ...ridge, [x1 + 12, hy]]);
  ctx.fill();
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1.8;
  ctx.lineJoin = 'round';
  poly(ridge);
  ctx.stroke();
  // The horizon line itself.
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'butt';
  poly([[x0, hy], [x1, hy]]);
  ctx.stroke();
}

/**
 * The vortex, "dead signal": a hole the camera can't record. The ground under it sinks into a dark pit, and inside
 * it the picture breaks up into camcorder static: grains of noise swirling in (faster toward the middle, re-rolled
 * 24 times a second so they crawl like real static), plus torn scanlines rolling through, around a black centre.
 *
 * It is painted flat, as seen from straight above, into a small picture of the floor around the hole (vortexTex),
 * then laid onto the ground in thin horizontal strips, each squeezed exactly like that row of the floor (toS). So it
 * is smooth and lines up with the quake ring, the cracks and the objects (a circle on the floor looks squeezed at the
 * far side and wider at the near side).
 */
const VTEX = 512; // the flat picture's size in pixels
let vortexTex = null;
let vtx = null;
let vortexScr = null;

function drawVortex() {
  const { HX, HY, H } = cam;
  const R = world.shR;
  const outer = reach(world.shP, R);
  const time = world.time;
  const core = R / outer; // the hole's catching edge, as a share of the swirl
  const PR = 1.15; // the darkness thins out over the ground to 1.15 x the swirl's size
  const maxR = outer * PR;
  if (!vortexTex) {
    vortexTex = document.createElement('canvas');
    vortexTex.width = vortexTex.height = VTEX;
    vtx = vortexTex.getContext('2d');
  }
  const g = vtx;
  const res = VTEX / (2 * maxR); // picture pixels per floor unit
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.clearRect(0, 0, VTEX, VTEX);
  g.setTransform(res, 0, 0, res, VTEX / 2, VTEX / 2); // floor units, the hole at 0, 0

  // The pit: black through the hole and nearly black around it, so the ground underneath is hidden, then thinning out.
  const pit = g.createRadialGradient(0, 0, 0, 0, 0, maxR);
  pit.addColorStop(0, '#000');
  pit.addColorStop(core / PR, '#000');
  pit.addColorStop((core + (1 - core) * 0.4) / PR, '#0a0a0a');
  pit.addColorStop(1 / PR, '#080808'); // solid all the way to the swirl's edge
  pit.addColorStop(1.06 / PR, 'rgba(0,0,0,.55)');
  pit.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = pit;
  g.beginPath();
  g.arc(0, 0, maxR, 0, TAU);
  g.fill();

  // The static, kept inside most of the swirl.
  const sr = outer * 0.88;
  g.save();
  g.beginPath();
  g.arc(0, 0, sr, 0, TAU);
  g.clip();
  const rnd = seeded(Math.floor(time * 24) + 1);
  const grains = Math.round(clamp(sr * 10, 250, 1400)); // more grains for a bigger hole
  const gs = 2.4; // grain size in floor units
  for (let i = 0; i < grains; i++) {
    const d = Math.sqrt(rnd()) * sr; // spread evenly over the area
    const u = d / sr; // 0 at the middle, 1 at the edge
    const a = rnd() * TAU + time * (3 - u * 2); // the whole cloud turns, faster in the middle
    const v = Math.floor(rnd() * 255 * (0.3 + 0.7 * (1 - u)) * 0.85); // brighter toward the middle, grey at the edge
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.fillRect(Math.cos(a) * d, Math.sin(a) * d, gs, gs);
  }
  // Torn scanlines: thin bright bands rolling down through the hole, each with a dark tear just under it.
  for (let k = 0; k < 4; k++) {
    const y = -sr + ((time * 70 + k * sr * 0.55) % (sr * 2));
    g.fillStyle = `rgba(255,255,255,${0.12 + 0.1 * rnd()})`;
    g.fillRect(-sr, y, sr * 2, 1.5 + rnd() * 2.5);
    g.fillStyle = 'rgba(0,0,0,.6)';
    g.fillRect(-sr + rnd() * sr * 0.25, y + 4, sr * 2, 2.5);
  }
  g.restore();

  // The black centre.
  g.fillStyle = '#000';
  g.beginPath();
  g.arc(0, 0, R * 0.7, 0, TAU);
  g.fill();

  // Lay it onto the ground: thin strips, each squeezed and placed like that row of the floor. They are put
  // together on whole pixel rows in a second picture (vortexScr, screen-sized, so no strip overlaps or leaves a
  // hairline gap), which is then drawn in one go (through the camera's shake like everything else).
  const px = cam.K * cam.dpr; // screen pixels per drawing unit
  const top = toS(HX, HY - maxR)[1];
  const bottom = toS(HX, HY + maxR)[1];
  const kNear = 1 + (PERSP * (H - (HY + maxR))) / H; // the near edge is the widest row
  const left = W / 2 + (HX - maxR - W / 2) / kNear;
  const wpx = Math.min(2400, Math.ceil(((2 * maxR) / kNear) * px) + 2);
  const hpx = Math.min(2400, Math.ceil((bottom - top) * px) + 2);
  if (!vortexScr) vortexScr = document.createElement('canvas');
  if (vortexScr.width !== wpx || vortexScr.height !== hpx) {
    vortexScr.width = wpx;
    vortexScr.height = hpx;
  }
  const sctx = vortexScr.getContext('2d');
  sctx.clearRect(0, 0, wpx, hpx);
  sctx.imageSmoothingQuality = 'high';
  const STRIPS = Math.max(20, Math.min(220, hpx));
  const sh = VTEX / STRIPS;
  let rowAbove = 0;
  for (let i = 0; i < STRIPS; i++) {
    const y1 = HY - maxR + (2 * maxR * (i + 1)) / STRIPS;
    const yMid = y1 - maxR / STRIPS;
    const k = 1 + (PERSP * (H - yMid)) / H; // how much that row of the floor is shrunk
    const row = Math.round((toS(HX, y1)[1] - top) * px);
    if (row <= rowAbove) continue;
    const x = (W / 2 + (HX - maxR - W / 2) / k - left) * px;
    sctx.drawImage(vortexTex, 0, i * sh, VTEX, sh, x, rowAbove, ((2 * maxR) / k) * px, row - rowAbove);
    rowAbove = row;
  }
  ctx.drawImage(vortexScr, left, top, wpx / px, hpx / px);
}

/** Soft ellipse on the floor under an object (squashed vertically by TILT). */
function drawShadow(o) {
  if (o.s <= 0) return;
  const p = toS(o.x, o.y);
  // The shadow stays on the floor (not on the flying object) and shrinks / fades the higher the object is.
  const height = 1 / (1 + Math.max(0, o.z) / 160); // (below the ground, falling into the hole: no bigger)
  const base = o.r * sc(o.y) * o.s * (0.6 + 0.4 * height) * (1 - (o.fade || 0)); // (fades as it goes down the drain)
  const rx = base * (o.k.look || 1);
  // A long standing object (the cop car) casts a long, flat shadow: as wide as its drawing, only a bit deep.
  const ry = (o.k.up && o.k.look ? base * 1.4 : rx) * TILT * 0.9;
  ctx.fillStyle = `rgba(0,0,0,${0.22 * height})`;
  ctx.beginPath();
  ctx.ellipse(p[0] + 3, p[1] + 2, rx, ry, 0, 0, TAU);
  ctx.fill();
}

/**
 * Suction funnel under an object that flies over the pull zone: a few ink lines twist from the object down to
 * its spot on the floor, spinning like the vortex, so you can see it being dragged down. Fades with o.suck.
 */
function drawSuck(o) {
  const k = o.suck || 0;
  if (k < 0.05 || o.s <= 0 || o.fall) return;
  const c = ctr(o);
  const p = toS(o.x, o.y);
  const len = p[1] - c[1];
  if (len < 4) return;
  const w = o.r * sc(o.y) * 0.9;
  const time = world.time;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) {
    const ph = time * 9 + (i * TAU) / 3;
    const pts = [];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12; // 0 at the object, 1 at the floor
      const amp = w * (1 - t * 0.8);
      pts.push([c[0] + Math.sin(ph + t * 7) * amp, c[1] + len * t]);
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.45 * k})`;
    ctx.lineWidth = 1.5 + k;
    poly(pts);
    ctx.stroke();
  }
}

/**
 * Draws one object: move to its raised screen position, stretch if sucked, rotate, scale by depth, then draw
 * its image. To add a new object type, add it to TYPES in config.js and an <id>.svg to src/assets/objects/.
 */
function drawThing(o) {
  if (o.s <= 0) return;
  const c = ctr(o);
  const s = o.s * sc(o.y) * (o.drag ? 1.12 : 1);
  const r = o.r;
  ctx.save();
  ctx.translate(c[0], c[1]);
  // Being sucked down: stretch toward the floor and get pinched sideways.
  const k = o.drag ? 0 : o.suck || 0;
  if (k > 0.01) ctx.scale(1 - 0.15 * k, 1 + 0.3 * k);
  const hanging = o.drag && o.k.up && sprites[grabName(o.k)];
  if (!hanging) ctx.rotate(o.ang);
  ctx.scale(s, s);
  // Depth cue: the farther an object is (smaller scale), the slightly lighter it is drawn (0.78 far, 1 near).
  const nearest = 1 / (1 + PERSP);
  ctx.globalAlpha = (0.78 + 0.22 * clamp((sc(o.y) - nearest) / (1 - nearest), 0, 1)) * (1 - (o.fade || 0));

  let sp = sprites[o.k.img || o.k.id];
  // Falling: thrown through the air, or sinking into the hole.
  const fallSp = o.k.up && !o.drag && (o.fall || o.z > 2) && sprites[fallName(o.k)];
  if (fallSp) sp = fallSp;
  // Walking: the frame for how far it has walked (only once every frame has loaded; a gap in the numbers = none).
  const frames = walkFrames[o.k.id];
  if (o.walking && frames && !fallSp) {
    const f = sprites[frames[Math.floor(o.walk) % frames.length]];
    if (f && Array.from(frames).every((n) => n && sprites[n])) sp = f;
  }
  const faceLeft = o.faceLeft ?? o.x > cam.HX; // which way it looks: where it last moved (see physics.js)
  if (hanging) {
    // Held standing figure: the grabbed pose, hanging by the top of the image (its raised hand) from the finger,
    // mirrored so it faces the hole. world.pointer is in the same field units as this drawing.
    const g = hanging;
    const flip = faceLeft !== !!o.k.grabLeft ? -1 : 1;
    ctx.scale(flip, 1);
    const px = ((world.pointer[0] - c[0]) / s) * flip;
    const py = (world.pointer[1] - c[1]) / s;
    ctx.drawImage(g.cv, px - g.hx * g.w, py - g.h * 0.02, g.w, g.h);
  } else if (!sp) dot(0, 0, r, '#000'); // still loading (or missing): a plain black disc
  else if (o.k.up) {
    // Standing figure: feet on the floor (0.8 r below the centre, see lift() in camera.js), and mirrored when it is
    // moving left so it faces the way it goes.
    if (faceLeft) ctx.scale(-1, 1);
    ctx.drawImage(sp.cv, -sp.w / 2, r * 0.8 - sp.h, sp.w, sp.h);
  } else ctx.drawImage(sp.cv, -sp.w / 2, -sp.h / 2, sp.w, sp.h); // square, centred
  ctx.restore();
}

/**
 * Quake meter, drawn on the ground around the vortex: a ring of QUAKE.need ink segments just outside the swirl.
 * Each object swallowed inks in the next one (going round the way the vortex turns, starting at the far side); the
 * last two shimmer when it is nearly full. When it is full the ground shakes: shock waves ripple out from the hole,
 * the ground splits into open fissures (see drawQuakeGround) and the whole ring flashes and trembles.
 */
function drawQuakeRing() {
  const { HX, HY } = cam;
  const outer = reach(world.shP, world.shR);
  const n = QUAKE.need;
  const q = quakeEnv();
  const time = world.time;
  // It lies on the ground, so it stops at the horizon (a big vortex's ring would reach past it).
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e5, horizonY(), 2e5, 1e5);
  ctx.clip();
  // just outside the vortex's darkness (which fades out to 1.15 x the swirl), trembling while the ground shakes
  const rr = outer * 1.15 + 14 + q * Math.sin(time * 61) * 3;
  const seg = TAU / n;
  ctx.lineCap = 'round';
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * seg + seg * 0.14;
    const a1 = a0 + seg * 0.72;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const a = a0 + ((a1 - a0) * k) / 6;
      pts.push(toS(HX + Math.cos(a) * rr, HY + Math.sin(a) * rr));
    }
    const filled = q > 0 || i < world.quakeFill;
    let alpha = filled ? 0.9 : 0.22;
    if (q > 0) alpha = 0.55 + 0.45 * Math.abs(Math.sin(time * 18 + i)); // flashing
    else if (filled && world.quakeFill >= n - 2) alpha = 0.6 + 0.4 * Math.abs(Math.sin(time * 6 + i * 0.6)); // nearly full
    ctx.strokeStyle = `rgba(0,0,0,${alpha})`;
    ctx.lineWidth = filled ? 4.5 : 1.6;
    poly(pts);
    ctx.stroke();
  }
  ctx.restore();
}

/** The earthquake's shock waves and fissures, under the vortex and stopping at the horizon. */
function drawQuakeCracks() {
  if (quakeEnv() <= 0) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-1e5, horizonY(), 2e5, 1e5);
  ctx.clip();
  drawQuakeGround(reach(world.shP, world.shR));
  ctx.restore();
}

// ---------- the ground during an earthquake ----------
// Fissures: a new set of cracks for every quake (world.quakeSeed). Each one is a jagged line running out from
// under the hole, kept as points on the floor with a width that is widest at the hole and tapers to nothing,
// plus a fork or two. They are drawn as open gaps (black) with a band of broken, shaded ground along them.
let fissures = null;
let fissureSeed = -1;

function makeFissures(outer) {
  const rnd = seeded(Math.floor(world.quakeSeed * 1e9));
  const R = (a, b) => a + rnd() * (b - a);
  const list = [];
  const crack = (x, y, a, len, w, steps, depth) => {
    const pts = [[x, y, w]];
    for (let s = 1; s <= steps; s++) {
      a += R(-0.38, 0.38);
      x += Math.cos(a) * (len / steps);
      y += Math.sin(a) * (len / steps);
      pts.push([x, y, w * Math.pow(1 - s / steps, 0.75)]);
      if (depth === 0 && (s === 3 || s === 5) && rnd() < 0.7) {
        crack(x, y, a + (rnd() < 0.5 ? 1 : -1) * R(0.5, 0.95), len * R(0.3, 0.5), w * 0.55, 4, 1);
      }
    }
    list.push(pts);
  };
  const n = 7;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + R(-0.35, 0.35);
    const r0 = world.shR * 0.9;
    crack(cam.HX + Math.cos(a) * r0, cam.HY + Math.sin(a) * r0, a, outer * R(1.7, 3.1), R(12, 19), 10, 0);
  }
  return list;
}

/** The outline of a fissure's first `upTo` (0..1) of its length, `open` (0..1) times its full width, on screen. */
function fissureShape(pts, upTo, open, extra = 0) {
  const last = Math.max(1, (pts.length - 1) * upTo);
  const left = [];
  const right = [];
  for (let i = 0; i <= Math.ceil(last); i++) {
    const k = Math.min(i, last);
    const a = pts[Math.floor(k)];
    const b = pts[Math.min(pts.length - 1, Math.floor(k) + 1)];
    const f = k - Math.floor(k);
    const x = a[0] + (b[0] - a[0]) * f;
    const y = a[1] + (b[1] - a[1]) * f;
    // the tip of the visible part closes to a point
    const w = (i === Math.ceil(last) ? 0 : a[2] + (b[2] - a[2]) * f) * open + extra;
    const dx = b[0] - a[0] || 1e-6;
    const dy = b[1] - a[1];
    const dl = Math.hypot(dx, dy);
    const nx = -dy / dl;
    const ny = dx / dl;
    // a little zigzag on each edge, so the gap looks torn
    const zz = (i % 2 ? 0.35 : -0.35) * w;
    left.push(toS(x + nx * (w / 2 + zz), y + ny * (w / 2 + zz)));
    right.push(toS(x - nx * (w / 2 - zz), y - ny * (w / 2 - zz)));
  }
  return [...left, ...right.reverse()];
}

function drawQuakeGround(outer) {
  const { HX, HY } = cam;
  const q = quakeEnv();
  const p = 1 - world.quakeT / QUAKE.time; // 0 -> 1 over the quake
  const time = world.time;

  // Shock waves: rings rippling out across the ground from the vortex, a few per second, fading as they spread.
  ctx.lineWidth = 2.6;
  for (let k = 0; k < 3; k++) {
    const f = (time * 1.6 + k / 3) % 1;
    const r = world.shR * 1.2 + f * outer * 2.6;
    const pts = [];
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * TAU;
      const wob = 1 + 0.03 * Math.sin(a * 7 + time * 9);
      pts.push(toS(HX + Math.cos(a) * r * wob, HY + Math.sin(a) * r * wob));
    }
    ctx.strokeStyle = `rgba(0,0,0,${0.55 * q * (1 - f)})`;
    poly(pts);
    ctx.stroke();
  }

  // Fissures: tear open fast (the first fifth of the quake), stay open, and close as the shaking dies down.
  if (fissureSeed !== world.quakeSeed) {
    fissures = makeFissures(outer);
    fissureSeed = world.quakeSeed;
  }
  const upTo = Math.min(1, p / 0.2);
  const open = Math.min(1, q * 1.4);
  ctx.lineJoin = 'round';
  for (const f of fissures) {
    // broken ground along the crack (a wider, faint band), then the open gap itself
    ctx.fillStyle = `rgba(0,0,0,${0.1 * open})`;
    poly(fissureShape(f, upTo, open, 6));
    ctx.fill();
    ctx.fillStyle = '#0d0d0d';
    poly(fissureShape(f, upTo, open));
    ctx.fill();
  }
}

/**
 * One frame: clear, apply zoom, then draw back to front: horizon, vortex, shadows, objects sorted far to near,
 * the dashed line while dragging, and the "+coins" popups.
 */
export function draw() {
  const { HX, HY, K, TX, TY, dpr } = cam;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  // Handheld camera: shift and tilt the whole scene a little around the canvas centre, then zoom and offset.
  updateShake(world.time, quakeEnv() * QUAKE.shake);
  checkSprites();
  ctx.imageSmoothingQuality = 'high'; // (resizing the canvas resets this, so set it every frame)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.translate(cam.cw / 2 + cam.SX, cam.ch / 2 + cam.SY);
  ctx.rotate(cam.SR);
  ctx.translate(-cam.cw / 2 + TX, -cam.ch / 2 + TY);
  ctx.scale(K, K);

  drawHorizon();
  drawTerrain();
  drawQuakeCracks();
  drawVortex();
  drawQuakeRing();
  world.things.forEach(drawShadow);
  [...world.things]
    .sort((a, b) => a.y + a.z * 0.4 - b.y - b.z * 0.4)
    .forEach((o) => {
      drawSuck(o);
      drawThing(o);
    });

  // Dashed guide from the held object to the hole.
  if (world.held) {
    const c = ctr(world.held);
    const h = toS(HX, HY);
    ctx.setLineDash([8, 8]);
    ctx.strokeStyle = 'rgba(0,0,0,.45)';
    ctx.lineWidth = 2;
    poly([c, h]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // "+coins" popups rising above the hole.
  const hs = toS(HX, HY);
  ctx.font = '44px VT323,ui-monospace,monospace';
  ctx.lineJoin = 'round';
  for (const p of world.pops) {
    const a = 1 - p.t / 1.2;
    const y = hs[1] - world.shR * sc(HY) * TILT - 14 - p.t * 60;
    const w = ctx.measureText(p.txt).width;
    const x = hs[0] + 14 - w / 2;
    ctx.strokeStyle = `rgba(255,255,255,${a})`;
    ctx.lineWidth = 8;
    ctx.strokeText(p.txt, x, y);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillText(p.txt, x, y);
    drawCoin(x - 20, y - 12, 15, a);
  }
}
