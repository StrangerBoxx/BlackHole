// All the game's numbers and tables live here. Change them and reload.

// ===== Physics and camera =====
// W        floor width in "ground units" (the physics space, independent of the screen size)
// TILT     1 = camera straight above, lower = flatter floor (camera lower)
// PERSP    how much smaller the far end of the floor looks (stronger perspective = bigger number)
// MAXT     maximum throw speed
// BOUNCE   bounciness of walls and collisions
// DAMP     floor friction
// GRAV     gravity for thrown objects (units / s^2)
// HZ       how much of one height unit shows up as height on the screen
// HOLDZ    how high an object is lifted while you hold it
// SUCK     extra downward pull on objects flying over the hole's pull zone (scales with the Fuerza upgrade)
// SHAKE    how much the handheld camera sways (0 = tripod). Roughly the drift in CSS pixels.
// LAND_KEEP share of horizontal speed kept when a thrown object lands right at the hole's centre
//           (at the edge of the pull zone it keeps a bit more); lower = landings on the vortex stop deader
// PUSH     how much heavier objects feel when you push them with the one you're dragging: they move 1 / (1 + PUSH)
//          of the way (3 = a quarter) and the held one is pushed back. 0 = they move fully with it.
//          Not for an add-on pushed by the type it comes with (the cop pushing the cop car): that one moves fully.
export const W = 720;
export const TAU = Math.PI * 2;
export const TILT = 0.78;
export const PERSP = 0.75;
export const MAXT = 1200;
export const BOUNCE = 0.6;
export const DAMP = 1.6;
export const GRAV = 1800;
export const HZ = 0.65;
export const HOLDZ = 28;
export const SUCK = 4200;
export const LAND_KEEP = 0.55;
export const PUSH = 3;
export const SHAKE = 20;

// ===== Object types =====
// r = radius (the hole must be big enough to swallow it), v = coins it is worth. Names are in i18n.js (obj.<id>).
// up = a standing figure: drawn upright with its feet on the floor (UP_H tall, keeping the image's
//      proportions), mirrored to face the way it is moving, and it slides instead of rolling. Its image must face right.
//      An optional <id>-grabbed image is shown while you hold it: it hangs from the top of the image (the raised
//      hand) under your finger, UP_GRAB_H tall.
//      Both heights are in floor units and the same for every figure, whatever its r. grabLeft = that image faces left instead of right.
//      h = a different standing height for this type (default UP_H), e.g. for side-view objects like the cop car.
//      Walking: while it moves along the floor it plays <img or id>-walk-1.png, -2, -3 ... (as many as there are,
//      any width, same height as the standing image, facing right, feet on the bottom edge), one frame per WALK_STRIDE
//      floor units. walk = a different name for those files (without the -1). No walk files = no walking animation.
//      Falling: in the air after a throw, and while sinking into the hole, it shows <img or id>-fall.png (same
//      rules as the walk frames). fallImg = a different name for that file. No fall file = its normal drawing.
// The image of each type is src/assets/objects/<id>.svg or .png (drawn by render.js, function drawThing);
// img = use a different file name instead of the id; grab = file name of the held pose (default <img>-grabbed).
// How often each type spawns is set in the lists below TYPES (SPAWN, ADDONS, RARE), not here.
// price = coins to buy it in the objects menu (the head button under the coins). Only the first type (the human)
//     is owned from the start. A bought type spawns once the hole is big enough for it; it can only be bought then.
// freeWith = can't be bought on its own: you get it for free when you buy that other type (its price is ignored).
// heavy = it weighs this many times more: slow to drag, weak throws, and other objects barely shove it.
// easyWith = the exception to heavy: objects of that type bump it as if it weren't heavy.
// look = draw it this many times bigger than its r (its shadow and the area you can tap too), without changing
//     how it collides or which Size level it needs. Standing figures set their drawing with h; look then only
//     widens their shadow and tap area (for long side-view objects like the cop car).
// wander = it walks around on its own: waits, then walks a random distance in a random direction (see WANDER).
export const UP_H = 120;
export const UP_GRAB_H = 130;
// VORTEX       how the pull zone moves things. soft = share of the Fuerza upgrade's force actually used (it builds
//              up smoothly from the zone's edge to the centre); swirl = sideways push, as a share of the pull, so
//              things spiral in like water down a drain; drag = how much speed the zone soaks up per second (more
//              toward the centre), so things settle in instead of shooting through the middle and back.
export const VORTEX = { soft: 0.6, swirl: 0.8, drag: 6, swallowAfter: 0.6 };
//              swallowAfter = seconds anything can stay inside the vortex's dark area (on the ground) before it is
//              swallowed right where it is (it falls into the hole there), even if it never reaches the centre.
// DRAIN        being swallowed: it falls into the hole where it is. time = seconds until it is gone (and counted),
//              depth = how far below the ground it sinks while shrinking and fading into the dark
export const DRAIN = { time: 0.9, depth: 70 };
// WALK_STRIDE  floor units travelled per walking frame (lower = faster steps)
// WALK_MIN     slower than this (floor units / s) it stands still with its normal drawing
export const WALK_STRIDE = 22;
export const WALK_MIN = 30;
// WANDER  walking around on their own (types with wander: true). After a random wait (seconds, between the two
//         wait numbers) they walk a random distance (floor units, between the two dist numbers) in a random
//         direction at speed floor units / s. They never pick a walk that ends in, or crosses, the hole's pull
//         zone, and give up a walk when they are bumped, thrown, grabbed or caught by the pull.
export const WANDER = { speed: 60, dist: [50, 220], wait: [1, 6] };
/** Standing height of an upright type (up: true). */
export const upH = (t) => t.h ?? UP_H;
export const TYPES = [
  { id: 'humano', r: 14, v: 1, price: 0, up: true, wander: true, grabLeft: true },
  { id: 'policia', r: 13, v: 2, price: 60, up: true, wander: true, img: 'humano-cop-idle', walk: 'humano-cop-walk', fallImg: 'humano-cop-fall' },
  {
    id: 'patrulla',
    r: 30,
    v: 10,
    price: 0,
    freeWith: 'policia',
    heavy: 4,
    easyWith: 'policia',
    up: true,
    h: 100,
    look: 2.4,
  },
  {
    id: 'bombero',
    r: 20,
    v: 4,
    price: 200,
    up: true,
    wander: true,
    img: 'humano-fireman-idle',
    grab: 'humano-fireman-grabbed',
    walk: 'humano-fireman-walk',
    fallImg: 'humano-fireman-fall',
    grabLeft: true,
  },
  { id: 'pino', r: 26, v: 6, price: 0, freeWith: 'bombero', heavy: 4, easyWith: 'bombero', up: true, h: 170 },
  { id: 'doctor', r: 22, v: 8, price: 500, up: true, wander: true, img: 'humano-doctor-idle', walk: 'humano-doctor-walk', fallImg: 'humano-doctor-fall' },
  { id: 'camilla', r: 30, v: 12, price: 0, freeWith: 'doctor', heavy: 4, easyWith: 'doctor', up: true, h: 68 },
  { id: 'neumatico', r: 30, v: 16, price: 1200 },
  { id: 'caja', r: 36, v: 30, price: 3000 },
  { id: 'basurero', r: 42, v: 55, price: 7000 },
  { id: 'auto', r: 56, v: 120, price: 18000, look: 1.5 },
];

// ===== Earthquake =====
// Every `need` objects swallowed fill the quake bar; when it is full the ground shakes for `time` seconds. The camera
// shakes (`shake` = how hard, in CSS pixels) and every `every` seconds the ground jolts: everything standing on the
// floor hops a little (`hop` = min and max upward speed) and is nudged toward the vortex (`push`, plus a random
// shove of up to `jitter` in any direction). Heavy objects move half as much. It builds up fast and dies down slowly.
export const QUAKE = { need: 12, time: 2.5, shake: 9, every: 0.13, push: 20, jitter: 12, hop: [50, 130] };

// ===== Spawn chances =====
// Every spawn tick (how often: the Spawn upgrade, F.every), each type that is available rolls its own chance:
// 1 = it appears every tick, 0.3 = on 30% of ticks, 0 = never. Several can appear in the same tick; if there
// isn't room for all of them (the Spawn upgrade's max on the floor, F.max), a random few of them do.
// A type that isn't in any list never spawns.

// Humans and objects: available once bought in the objects menu (the human from the start) and the hole is big enough.
export const SPAWN = {
  humano: 0.5,
  policia: 0.3,
  bombero: 0.25,
  doctor: 0.2,
  neumatico: 0.2,
  caja: 0.15,
  basurero: 0.12,
  auto: 0.1,
};

// Add-ons: come free with another type (freeWith in TYPES, e.g. the cop car with the cop). Not shown in the objects menu.
export const ADDONS = {
  patrulla: 0.1, // with the cop
  pino: 0.15, // with the firefighter
  camilla: 0.15, // with the doctor
};

// Rare objects: no need to buy them, they can show up as soon as the hole is big enough. Not shown in the objects
// menu. Give them small chances (0.01 = 1% of ticks). None yet: add the type to TYPES, then e.g. ovni: 0.01 here.
export const RARE = {};

// ===== Shop upgrades =====
// base = price at level 0, m = price multiplier per level, max = highest level. Names are in i18n.js (up.<id>).
export const UP = [
  { id: 'pull', max: 12, base: 10, m: 1.55 },
  { id: 'force', max: 12, base: 15, m: 1.6 },
  { id: 'size', max: 7, base: 25, m: 1.9 },
  { id: 'spawn', max: 10, base: 12, m: 1.5 },
  { id: 'value', max: 20, base: 40, m: 1.7 },
];

// ===== Stats by upgrade level (l) =====
// pull   radius of the zone where the hole pulls objects (never smaller than the drawn swirl, see reach)
// force  how strongly it pulls
// size   radius of the hole itself (the drawn swirl and the pull reach out to SWIRL x this, see reach)
// fit    biggest object radius the hole can swallow, so which object types appear (kept apart from size so the
//        bigger starting hole doesn't change when each object unlocks)
// cap    top speed at which an object can still be swallowed
// max    most objects on the floor at once
// every  seconds between new objects
// val    coin multiplier
export const F = {
  pull: (l) => 55 + l * 24.75,
  force: (l) => 6000 + l * 420,
  size: (l) => 37 + l * 5,
  fit: (l) => (28 + l * 5) * 0.95,
  cap: (l) => 420 + l * 110,
  max: (l) => 6 + l,
  every: (l) => Math.max(0.3, 1.0 * 0.86 ** l),
  val: (l) => 1 + l * 0.25,
};

// The swirl is drawn out to SWIRL x the hole radius, so the pull always reaches at least that far: anything that
// looks like it is on the vortex gets sucked in. Used by physics (real values) and render (displayed values).
export const SWIRL = 2.4;
export const reach = (pull, size) => Math.max(pull, size * SWIRL);

/** Price of an upgrade when it is currently at level l. */
export const cost = (u, l) => Math.round(u.base * u.m ** l);
