// The game world: the objects on the floor, the "+coins" popups and the clock.
// Everything lives in the single `world` object so every module sees the same state.

import { TAU, HZ, TYPES, SPAWN, ADDONS, RARE, QUAKE, F, upH } from './config.js';
import { S, save } from './save.js';
import { cam, sc, toS, playX, playYMax } from './camera.js';
import { emit } from './events.js';
import { fmt } from './util.js';

/**
 *  things       objects on the floor (see spawn() for their fields)
 *  pops         "+coins" popups
 *  held         the object being dragged, grabOffset = where on screen you grabbed it, pointer = the finger now
 *  trail        recent drag points (used to work out the throw speed)
 *  time         seconds since the game started; spawnT = time since the last spawn tick
 *  combo        chained catches; lastCatch = time of the last one
 *  shR, shP     DISPLAYED hole and pull radius (they ease toward the real values after an upgrade)
 */
export const world = {
  things: [],
  pops: [],
  held: null,
  grabOffset: [0, 0],
  pointer: [0, 0],
  paused: false, // the pause menu is open
  trail: [],
  time: 0,
  spawnT: 0,
  combo: 0,
  lastCatch: -10,
  shR: 0,
  shP: 0,
  quakeFill: 0, // objects swallowed toward the next earthquake (QUAKE.need fills the bar)
  quakeT: 0, // seconds of earthquake left (0 = none)
  quakeJolt: 0, // seconds until the next jolt of the ground
  quakeSeed: 0, // a new random number for every quake (its crack pattern, see render.js)
};

/** How strong the earthquake is right now, 0 to 1: builds up fast, then dies down slowly. */
export function quakeEnv() {
  if (world.quakeT <= 0) return 0;
  const p = 1 - world.quakeT / QUAKE.time;
  return Math.min(1, p / 0.12) * Math.min(1, (1 - p) / 0.35);
}

/** Set the displayed radii from the saved upgrade levels. */
export function initWorld() {
  world.shR = F.size(S.lv.size);
  world.shP = F.pull(S.lv.pull);
}

/** Whether a hole with Size level l is big enough for object type t (the current level if l is left out). */
export const fits = (t, l = S.lv.size) => t.r <= F.fit(l);

/** Object types you have: bought in the objects menu (or free with one) and small enough for the current hole. */
export const unlocked = () => TYPES.filter((t) => S.own.includes(t.id) && fits(t));

/** Spawn chance (0 to 1) of type t right now: from its list in config.js, 0 if it isn't available. */
function chance(t) {
  if (t.id in RARE) return fits(t) ? RARE[t.id] : 0;
  if (!S.own.includes(t.id) || !fits(t)) return 0;
  return ADDONS[t.id] ?? SPAWN[t.id] ?? 0;
}

/**
 * One spawn tick: every available type rolls its own chance, and the ones that pass appear (in random order,
 * as long as there is room: at most room objects). instant = true skips the grow-in animation.
 * Returns how many appeared.
 */
export function spawnTick(room, instant) {
  const hits = TYPES.filter((t) => Math.random() < chance(t));
  for (let i = hits.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [hits[i], hits[j]] = [hits[j], hits[i]];
  }
  let n = 0;
  for (const kind of hits.slice(0, Math.max(0, room))) if (spawn(kind, instant)) n++;
  return n;
}

/**
 * How high (z) an object of type kind at floor point x, y must start so that all of it is above the top edge of
 * the play area: it then falls into view from the sky.
 */
function skyHeight(kind, x, y) {
  const s = sc(y);
  const tall = kind.up ? upH(kind) : 2 * kind.r * 1.25 * (kind.look || 1); // drawn height (see render.js)
  const top = -cam.TY / cam.K; // the top edge of the play area, in the same units as toS
  return Math.max(250, (toS(x, y)[1] - top + 40 - tall * s) / (s * HZ));
}

/**
 * Adds one object of type kind at a free spot away from the hole. It falls from the sky onto that spot (its
 * shadow on the floor shows where it will land); instant = true puts it straight on the floor instead (the
 * objects the game starts with). Returns false if no free spot was found.
 */
export function spawn(kind, instant) {
  const r = kind.r;
  const keepAway = Math.min(F.pull(S.lv.pull), 260) + r + 20;
  for (let n = 0; n < 40; n++) {
    // anywhere on the ground you can see (the play area, see playX in camera.js)
    const y = r + 10 + Math.random() * (playYMax() - 2 * r - 20);
    const [x0, x1] = playX(y, r + 10);
    const x = x0 + Math.random() * (x1 - x0);
    if (Math.hypot(x - cam.HX, y - cam.HY) < keepAway) continue;
    if (world.things.some((o) => Math.hypot(o.x - x, o.y - y) < o.r + r + 8)) continue;
    world.things.push({
      k: kind, // the type (see TYPES)
      x, y, // position on the floor
      vx: 0, vy: 0, // speed on the floor
      z: instant ? 0 : skyHeight(kind, x, y), vz: instant ? 0 : -200, // height above the floor and vertical speed (thrown and new objects fly)
      r, // radius
      ang: kind.up && !instant ? 0 : Math.random() * TAU, // drawing rotation (standing figures fall in upright)
      drop: !instant, // falling in from the sky: no tumbling until it has landed and stopped bouncing
      spin: 0, // rotation speed
      s: 1, // drawing scale (shrinks while it goes down the drain)
      fall: false, ft: 0, // falling into the hole, and for how long
      drag: false, // being held by the player
      wd: 0, // wandering: distance left of the current walk (wt = seconds until the next one, set by physics.js)
      faceLeft: x > cam.HX, // which way a standing figure looks (starts toward the hole, then the way it moves)
      lastX: x, lastY: y, // position at the end of the last physics tick, to tell which way and how fast it moved
      dead: false, // finished falling: remove it
    });
    return true;
  }
  return false;
}

/** The four objects the game starts with (spawn ticks run at once until there are four, or 50 tries). */
export function seedObjects() {
  for (let i = 0; i < 50 && world.things.length < 4; i++) spawnTick(4 - world.things.length, true);
}

/** Clear the floor and start again (used by the reset button). */
export function resetWorld() {
  world.things = [];
  world.held = null;
  world.combo = 0;
  world.quakeFill = 0;
  world.quakeT = 0;
  seedObjects();
}

/**
 * Runs when an object has finished falling in: pays the coins, updates the combo (another catch within
 * 2.5 s), shows the popup and saves. Sound and UI listen to the 'absorb' event.
 */
export function absorb(o) {
  const gain = Math.round(o.k.v * F.val(S.lv.value));
  world.combo = world.time - world.lastCatch < 2.5 ? world.combo + 1 : 0;
  world.lastCatch = world.time;
  world.pops.push({ t: 0, txt: '+' + fmt(gain) });
  S.coins += gain;
  S.total++;
  save();
  emit('absorb', { gain, combo: world.combo });
  // The quake bar: full -> the ground shakes (it doesn't fill up again while the ground is still shaking).
  if (world.quakeT <= 0 && ++world.quakeFill >= QUAKE.need) {
    world.quakeFill = 0;
    world.quakeT = QUAKE.time;
    world.quakeJolt = 0;
    world.quakeSeed = Math.random();
    emit('quake');
  }
}
