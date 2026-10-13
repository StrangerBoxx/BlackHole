// Touch / mouse input: grab an object, drag it, let go to throw it.
// Pointer positions are in screen space; held objects are mapped back onto the floor with toG().

import { MAXT, HOLDZ, upH } from './config.js';
import { cam, sc, toG, lift, ctr, unshake, playX, playYMax } from './camera.js';
import { world } from './world.js';
import { unlockAudio } from './audio.js';
import { clamp } from './util.js';

export function initInput(canvas) {
  // Pointer event -> field coordinates (undoing the camera shake, then the zoom and offset).
  const toField = (e) => {
    const r = canvas.getBoundingClientRect();
    const [x, y] = unshake(e.clientX - r.left, e.clientY - r.top);
    return [(x - cam.TX) / cam.K, (y - cam.TY) / cam.K];
  };

  // Press: pick the nearest object under the finger (tested against the raised sprite on screen),
  // remember where it was grabbed, lift it, and start recording the trail.
  canvas.addEventListener('pointerdown', (e) => {
    unlockAudio(); // browsers only allow sound after a touch
    const m = toField(e);
    let best = null;
    let bestD = 1e9;
    for (const o of world.things) {
      if (o.fall) continue;
      const c = ctr(o);
      // Standing figures are tall: test against the middle of the body, with a bigger reach.
      const s = sc(o.y) * o.s;
      // (the body runs from the feet, 0.8 r below the centre, up to its standing height above them)
      const hh = o.k.up ? upH(o.k) / 2 : 0;
      const d = Math.hypot(m[0] - c[0], m[1] - c[1] + (o.k.up ? (hh - 0.8 * o.r) * s : 0));
      const reachR = o.r * (o.k.look || (o.k.up ? 2 : 1)); // how far from its middle a tap still grabs it
      if (d < (o.k.up ? Math.max(hh, reachR) : reachR) * s + 22 && d < bestD) {
        best = o;
        bestD = d;
      }
    }
    if (!best) return;
    world.held = best;
    const c = ctr(best);
    world.grabOffset = [m[0] - c[0], m[1] - c[1]];
    world.pointer = m;
    best.drag = true;
    best.drop = false; // grabbed out of the sky: from now on it flies like anything you throw
    best.vx = best.vy = 0;
    best.z = HOLDZ;
    best.vz = 0;
    best.tx = best.x; // where the finger wants it (heavy objects trail behind, see physics.js)
    best.ty = best.y;
    world.trail = [{ x: best.x, y: best.y, t: performance.now() }];
    canvas.setPointerCapture(e.pointerId);
  });

  // Drag: turn the pointer into a floor position, keep it inside the floor, record the trail.
  // A heavy object only gets a target there; physics.js drags it toward it slowly.
  canvas.addEventListener('pointermove', (e) => {
    const held = world.held;
    if (!held) return;
    const m = toField(e);
    world.pointer = m;
    const g = toG(m[0] - world.grabOffset[0], m[1] - world.grabOffset[1] + lift(held));
    // (anywhere on the ground you can see, see playX in camera.js)
    held.ty = clamp(g[1], held.r, playYMax() - held.r);
    const [x0, x1] = playX(held.ty, held.r);
    held.tx = clamp(g[0], x0, x1);
    if (!held.k.heavy) {
      held.x = held.tx;
      held.y = held.ty;
    }
    world.trail.push({ x: held.tx, y: held.ty, t: performance.now() });
    if (world.trail.length > 8) world.trail.shift();
  });

  // Release: throw velocity = distance / time over the last ~90 ms of the trail, capped at MAXT
  // (and divided by how heavy the object is).
  const release = () => {
    const held = world.held;
    if (!held) return;
    const now = performance.now();
    const recent = world.trail.filter((p) => now - p.t < 90);
    if (recent.length >= 2) {
      const a = recent[0];
      const b = recent[recent.length - 1];
      const dt = Math.max((b.t - a.t) / 1000, 0.016);
      let vx = (b.x - a.x) / dt;
      let vy = (b.y - a.y) / dt;
      let speed = Math.hypot(vx, vy);
      if (speed > MAXT) {
        vx *= MAXT / speed;
        vy *= MAXT / speed;
      }
      if (held.k.heavy) {
        vx /= held.k.heavy;
        vy /= held.k.heavy;
        speed = Math.hypot(vx, vy);
      }
      held.vx = vx;
      held.vy = vy;
      // Launch upward too: a faster flick throws it higher and farther before it lands
      // (a slow release just drops it).
      held.vz = speed > 60 ? 120 + Math.min(speed, MAXT) * 0.45 : 0;
    }
    held.drag = false;
    world.held = null;
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);
}
