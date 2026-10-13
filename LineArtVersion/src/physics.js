// One physics tick. Everything here runs on the flat floor (the camera only affects drawing and input).

import { GRAV, BOUNCE, DAMP, SUCK, LAND_KEEP, MAXT, PUSH, DRAIN, VORTEX, QUAKE, WALK_STRIDE, WALK_MIN, WANDER, F, reach } from './config.js';
import { S } from './save.js';
import { cam, playX, playYMax } from './camera.js';
import { world, absorb, quakeEnv } from './world.js';
import { emit } from './events.js';

const rand = ([a, b]) => a + Math.random() * (b - a);

/** Time to wait before the next walk. */
const wanderWait = () => rand(WANDER.wait);

/**
 * Wandering: pick a walk for o, a random direction and distance that ends on the ground you can see and keeps out of the
 * hole's pull zone (pullR). If none of a few tries works, wait a little and try again.
 */
function pickWalk(o, pullR) {
  const { HX, HY } = cam;
  const keep = pullR + o.r + 30;
  for (let n = 0; n < 8; n++) {
    const a = Math.random() * Math.PI * 2;
    const dist = rand(WANDER.dist);
    const ex = o.x + Math.cos(a) * dist;
    const ey = o.y + Math.sin(a) * dist;
    // it must end on the ground you can see (the play area)
    if (ey < o.r + 10 || ey > playYMax() - o.r - 10) continue;
    const [x0, x1] = playX(ey, o.r + 10);
    if (ex < x0 || ex > x1) continue;
    // check the end and a few points along the way
    let ok = true;
    for (const f of [0.25, 0.5, 0.75, 1]) {
      if (Math.hypot(o.x + (ex - o.x) * f - HX, o.y + (ey - o.y) * f - HY) < keep) ok = false;
    }
    if (!ok) continue;
    o.wdx = Math.cos(a);
    o.wdy = Math.sin(a);
    o.wd = dist; // distance left to walk
    o.wtime = (dist / WANDER.speed) * 2.5; // give up if it takes much longer (stuck against something)
    return;
  }
  o.wt = 0.5;
}

/**
 * Advance the world by dt seconds. For each object: grow-in, fall animation, pull toward the hole,
 * flight, friction, movement, wall bounce, capture. Then collisions between objects, then removal.
 */
export function step(dt) {
  const { HX, HY } = cam;
  const lv = S.lv;
  const pullR = reach(F.pull(lv.pull), F.size(lv.size));
  const force = F.force(lv.force);
  const holeR = F.size(lv.size);
  const capSpeed = F.cap(lv.size);
  const yMax = playYMax(); // the near edge of the play area

  // Earthquake: count down, and every QUAKE.every seconds the ground jolts (see below).
  let jolt = 0;
  if (world.quakeT > 0) {
    jolt = quakeEnv();
    world.quakeT = Math.max(0, world.quakeT - dt);
    world.quakeJolt -= dt;
    if (world.quakeJolt > 0) jolt = 0;
    else world.quakeJolt = QUAKE.every;
  }

  for (const o of world.things) {
    if (o.s < 1 && !o.fall) o.s = Math.min(1, o.s + dt * 4);

    // Swallowed: it falls into the hole right where it is (even at the edge): it stops crossing the ground (what
    // speed it had dies away in a moment) and drops below the surface, shrinking into the dark and fading out, like
    // something falling down a pit seen from above. Standing figures tip over as they fall, objects tumble slowly.
    // After DRAIN.time seconds it is counted. o.fade (0..1) is used by render.js.
    if (o.fall) {
      if (o.s0 == null) o.s0 = o.s;
      o.ft += dt;
      const t = Math.min(1, o.ft / DRAIN.time);
      const slow = Math.exp(-6 * dt);
      o.vx *= slow;
      o.vy *= slow;
      o.x += o.vx * dt;
      o.y += o.vy * dt;
      o.z = -DRAIN.depth * t * t; // sinking below the ground, faster and faster
      o.s = o.s0 * (1 - 0.75 * t * t); // farther down = smaller
      const f = Math.max(0, (t - 0.3) / 0.7);
      o.fade = f * f * (3 - 2 * f);
      if (o.k.up) o.ang += ((o.faceLeft ? -0.7 : 0.7) * t - o.ang) * Math.min(1, dt * 4);
      else o.ang += dt * 2.5;
      if (t >= 1) {
        o.dead = true;
        absorb(o);
      }
      continue;
    }

    // A dragged object is moved by the pointer, not by physics. A heavy one lags behind the finger.
    if (o.drag) {
      if (o.k.heavy) {
        const q = Math.min(1, (dt * 14) / o.k.heavy);
        o.x += (o.tx - o.x) * q;
        o.y += (o.ty - o.y) * q;
      }
      continue;
    }

    // Earthquake jolt: whatever stands on the floor hops a little and is shoved toward the vortex (plus a random
    // shake), so a quake slowly brings everything closer. Walkers stop walking; heavy things move half as much.
    if (jolt > 0 && o.z <= 2) {
      const qx = HX - o.x;
      const qy = HY - o.y;
      const qd = Math.hypot(qx, qy) || 1;
      const k = jolt * (o.k.heavy ? 0.5 : 1);
      const ja = Math.random() * Math.PI * 2;
      const js = Math.random() * QUAKE.jitter;
      o.vx += ((qx / qd) * QUAKE.push + Math.cos(ja) * js) * k;
      o.vy += ((qy / qd) * QUAKE.push + Math.sin(ja) * js) * k;
      o.vz = Math.max(o.vz, (QUAKE.hop[0] + Math.random() * (QUAKE.hop[1] - QUAKE.hop[0])) * k);
      if (o.wd > 0) {
        o.wd = 0;
        o.wt = 1;
      }
    }

    // Pull: inside the pull radius (measured on the floor, whatever the height), accelerate toward the hole
    // (stronger the closer it is). Objects in the air above the zone are also sucked down toward the floor.
    const dx = HX - o.x;
    const dy = HY - o.y;
    const d = Math.hypot(dx, dy);
    // An object counts as inside once half of its body is over the edge of the zone.
    const inPull = d < pullR + o.r * 0.5;
    const edge = Math.min(1, d / pullR); // 0 at the centre, 1 at (or just past) the edge
    // It fades in over the zone's edge (no sudden grab), builds up smoothly toward the centre, pushes sideways
    // (the swirl) so things spiral in, and soaks up speed (drag, stronger toward the centre; half as much in the
    // air) so they settle into the hole instead of slamming through it and swinging back.
    const depth = 1 - edge; // 0 at the edge, 1 at the centre
    const enter = inPull ? Math.min(1, (pullR + o.r * 0.5 - d) / (o.r + 25)) : 0;
    if (inPull && d > 1) {
      const nx = dx / d;
      const ny = dy / d;
      const f = force * VORTEX.soft * (0.15 + 0.85 * depth * depth * (3 - 2 * depth)) * enter;
      o.vx += (nx + ny * VORTEX.swirl) * f * dt;
      o.vy += (ny - nx * VORTEX.swirl) * f * dt;
      const keep = Math.exp(-VORTEX.drag * (0.3 + depth) * enter * (o.z > 2 ? 0.5 : 1) * dt);
      o.vx *= keep;
      o.vy *= keep;
    }
    if (inPull && o.z > 0) {
      o.vz -= SUCK * (1.3 - edge) * (force / F.force(0)) * enter * dt;
      o.vz = Math.max(o.vz, -1000);
    }
    // Wandering: a type with wander walks around on its own while it stands on the floor. Walking = steering its
    // speed toward the walk direction at WANDER.speed. Bumped hard, thrown or caught by the pull: it gives up
    // that walk and waits again.
    if (o.k.wander && o.z <= 0) {
      if (o.wd > 0) {
        if (inPull || Math.hypot(o.vx, o.vy) > WANDER.speed * 1.8 || (o.wtime -= dt) <= 0) {
          o.wd = 0;
          o.wt = wanderWait();
        } else {
          const q = Math.min(1, dt * 6);
          o.vx += (o.wdx * WANDER.speed - o.vx) * q;
          o.vy += (o.wdy * WANDER.speed - o.vy) * q;
          o.wd -= WANDER.speed * dt;
          if (Math.abs(o.wdx) > 0.2) o.faceLeft = o.wdx < 0; // look where it is going, even walking slowly
          if (o.wd <= 0) o.wt = wanderWait();
        }
      } else {
        if (o.wt == null) o.wt = wanderWait(); // just spawned
        if (!inPull && (o.wt -= dt) <= 0) pickWalk(o, pullR);
      }
    }

    // How strongly it is being sucked down right now (0..1), used by the drawing.
    const suckTo = inPull && o.z > 2 ? 1 - edge * 0.6 : 0;
    o.suck = (o.suck || 0) + (suckTo - (o.suck || 0)) * Math.min(1, dt * 8);

    // Flight: gravity pulls it down. A hard landing costs horizontal speed and gives a small hop
    // (no hop when the vortex dragged it down: it sticks to the floor).
    if (o.z > 0 || o.vz > 0) {
      o.vz -= GRAV * dt;
      o.z += o.vz * dt;
      if (o.z <= 0) {
        o.z = 0;
        if (inPull) {
          // Landing on the vortex: no hop, and it soaks up part of the throw (the vortex drag does the rest, so it
          // doesn't stop dead). Most of the speed going away from the hole is removed, and what is left is cut
          // down (more the closer to the centre it lands).
          o.vz = 0;
          if (d > 1) {
            const out = -(o.vx * dx + o.vy * dy) / d;
            if (out > 0) {
              o.vx += (dx / d) * out * 0.6;
              o.vy += (dy / d) * out * 0.6;
            }
          }
          const keep = LAND_KEEP + (1 - LAND_KEEP) * 0.5 * edge;
          o.vx *= keep;
          o.vy *= keep;
        } else if (o.vz < -120) {
          o.vz = -o.vz * 0.3;
          o.vx *= 0.75;
          o.vy *= 0.75;
        } else {
          o.vz = 0;
        }
      }
    }

    // Floor friction only works on the ground; in the air it barely slows down.
    const damp = Math.max(0, 1 - DAMP * (o.z > 2 ? 0.15 : 1) * dt);
    o.vx *= damp;
    o.vy *= damp;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    o.ang += o.spin * dt;
    // tumbles while airborne, whirls when sucked (eased, so it doesn't jump between speeds). Falling in from the sky
    // (o.drop) it keeps still instead, until it has landed and stopped bouncing.
    if (o.drop && o.z <= 0 && o.vz <= 0) o.drop = false;
    const spinTo = o.drop ? 0 : Math.hypot(o.vx, o.vy) * 0.006 + (o.z > 2 ? 5 : 0) + o.suck * 4;
    o.spin = o.drop ? 0 : o.spin + (spinTo - o.spin) * Math.min(1, dt * 5);
    // Standing figures don't roll or tumble: on the floor they stand up straight, and in the air they lean a little
    // the way they fly (render.js shows their falling image there). They turn the shortest way round.
    if (o.k.up) {
      o.spin = 0;
      const want = o.z > 2 && !o.drop ? Math.max(-0.35, Math.min(0.35, o.vx / 1500)) : 0;
      const tilt = Math.atan2(Math.sin(o.ang - want), Math.cos(o.ang - want));
      o.ang -= tilt * Math.min(1, dt * 10);
    }
    // Walking: moving along the floor, a standing figure counts its steps (o.walk, in frames; render.js picks the
    // walk image from it). Too slow, or in the air, it stands still and starts again from the first frame.
    const speed = Math.hypot(o.vx, o.vy);
    o.walking = o.k.up && o.z <= 2 && speed > WALK_MIN;
    o.walk = o.walking ? (o.walk || 0) + (speed * dt) / WALK_STRIDE : 0;

    // Walls: keep it on the ground you can see (the play area, see playX in camera.js) and bounce.
    if (o.y < o.r) {
      o.y = o.r;
      o.vy = Math.abs(o.vy) * BOUNCE;
    }
    if (o.y > yMax - o.r) {
      o.y = yMax - o.r;
      o.vy = -Math.abs(o.vy) * BOUNCE;
    }
    const [x0, x1] = playX(o.y, o.r);
    if (o.x < x0) {
      o.x = x0;
      o.vx = Math.abs(o.vx) * BOUNCE;
    }
    if (o.x > x1) {
      o.x = x1;
      o.vx = -Math.abs(o.vx) * BOUNCE;
    }

    // Swallowed once it reaches the edge of the hole's black core AND is slow enough (the speed limit grows with
    // the hole size), or after it has spent VORTEX.swallowAfter seconds inside the vortex's dark area (on the
    // ground), however fast it is going. Either way it then falls in right there (see above).
    o.vt = o.z < 6 && d < pullR ? (o.vt || 0) + dt : 0;
    const late = o.vt >= VORTEX.swallowAfter;
    if ((o.z < 6 && d < holeR + o.r * 0.3 && Math.hypot(o.vx, o.vy) < capSpeed) || late) {
      o.fall = true;
      o.ft = 0;
      o.z = 0;
      emit('swallow', o.r);
    }
  }

  // Collisions between every pair of objects: push them apart by the overlap (the lighter one moves more; mass
  // ~ radius squared, times heavy), then exchange a bounce impulse along the contact direction.
  // Pushing: a dragged object bumps into others whatever their height (it is held up in the air, but you push with
  // it), and what it pushes picks up the speed of the drag, so it keeps sliding when you stop instead of halting.
  // Pushed objects feel heavier (PUSH times their weight): the hand is only as strong as their plain weight, so
  // they give part of the way and the held one is pushed back. An add-on pushed by the type it comes with (cop ->
  // cop car) isn't made heavier, so it moves fully with the held one.
  const things = world.things;
  // Speed of an object this tick: a dragged one is moved by the finger, so measure how far it went since last tick.
  // (capped at the throw speed limit, so a sudden jump of the finger can't fling things).
  const vel = (o) => {
    if (!o.drag) return [o.vx, o.vy];
    const vx = (o.x - o.lastX) / dt;
    const vy = (o.y - o.lastY) / dt;
    const k = Math.min(1, MAXT / (Math.hypot(vx, vy) || 1));
    return [vx * k, vy * k];
  };
  const isHeavy = (o, by) => o.k.heavy && by.k.id !== o.k.easyWith;
  const pushedHard = (o, by) => by.drag && o.k.freeWith !== by.k.id; // pushed by a held object it doesn't come with
  const mass = (o, by) => o.r * o.r * (isHeavy(o, by) ? o.k.heavy : 1) * (pushedHard(o, by) ? 1 + PUSH : 1);
  /**
   * 1 / mass of o when bumped by `by` (0 = immovable). A dragged object is immovable, unless what it pushes weighs
   * more than its plain weight (heavy, or made heavier by PUSH): then the hand is only as strong as that plain weight.
   */
  const inv = (o, by) => (o.drag ? (mass(by, o) > by.r * by.r ? 1 / (by.r * by.r) : 0) : 1 / mass(o, by));
  for (let i = 0; i < things.length; i++) {
    for (let j = i + 1; j < things.length; j++) {
      const a = things[i];
      const b = things[j];
      // Objects at different heights fly over each other (except the dragged one, which pushes at any height).
      if (a.fall || b.fall) continue;
      const pushing = a.drag || b.drag;
      if (!pushing && Math.abs(a.z - b.z) > Math.min(a.r, b.r)) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.hypot(dx, dy);
      const minD = a.r + b.r;
      if (d >= minD || d === 0) continue;
      const nx = dx / d;
      const ny = dy / d;
      const overlap = minD - d;
      const ia = inv(a, b);
      const ib = inv(b, a);
      const tot = ia + ib;
      if (!tot) continue;
      a.x -= (nx * overlap * ia) / tot;
      a.y -= (ny * overlap * ia) / tot;
      b.x += (nx * overlap * ib) / tot;
      b.y += (ny * overlap * ib) / tot;
      const [avx, avy] = vel(a);
      const [bvx, bvy] = vel(b);
      const rel = (bvx - avx) * nx + (bvy - avy) * ny;
      if (rel < 0) {
        // A push carries the other object along at the drag's speed (no bounce, so it doesn't shoot ahead of
        // the finger). The dragged object's own speed is left alone: the finger decides it.
        const im = (-(pushing ? 1 : 1 + BOUNCE) * rel) / tot;
        if (!a.drag) {
          a.vx -= nx * im * ia;
          a.vy -= ny * im * ia;
        }
        if (!b.drag) {
          b.vx += nx * im * ib;
          b.vy += ny * im * ib;
        }
      }
    }
  }

  // Facing: standing figures look the way they move sideways (thrown, dragged, pushed or pulled in). Below
  // FACE_MIN floor units a second they keep their last facing, so small nudges and a shaky finger don't flip them.
  const FACE_MIN = 40;
  for (const o of things) {
    const vx = (o.x - o.lastX) / dt;
    if (Math.abs(vx) > FACE_MIN && !o.fall) o.faceLeft = vx < 0; // (going down the drain it keeps its facing)
    o.lastX = o.x;
    o.lastY = o.y;
  }

  // Remove objects that finished falling in.
  world.things = world.things.filter((o) => !o.dead);
}
