// Entry point: wires the modules together and runs the game loop.

import './styles.css';
import { Capacitor } from '@capacitor/core';
import { ScreenOrientation } from '@capacitor/screen-orientation';

import { F } from './config.js';
import { S } from './save.js';
import { cam, initCamera, ctr } from './camera.js';
import { world, initWorld, seedObjects, spawnTick } from './world.js';
import { step } from './physics.js';
import { initInput } from './input.js';
import { initRender, draw } from './render.js';
import { initAudio } from './audio.js';
import { initUI, tick } from './ui.js';
import { initMenu } from './menu.js';
import { $ } from './util.js';

const stage = $('stage');
const canvas = $('cv');

// Inside the phone app: keep the game in portrait.
if (Capacitor.isNativePlatform()) {
  ScreenOrientation.lock({ orientation: 'portrait' }).catch(() => {});
}

// Order matters: the camera decides the floor size, the world needs it to place objects.
initCamera(stage, canvas);
initWorld();
initAudio();
initRender(canvas);
initInput(canvas);
initUI();
initMenu();
seedObjects();

// While developing (npm run dev) the game state is available in the browser console as __feedit.
if (import.meta.env.DEV) window.__feedit = { world, cam, S, ctr };

// Main loop: dt (capped so a lag spike can't make objects jump), spawn timer, physics, ease the displayed
// radii toward the real ones, age the popups, draw, repeat. While paused nothing moves (the last frame stays).
let last = 0;
function frame(ts) {
  const dt = Math.min((ts - last) / 1000, 1 / 30);
  last = ts;
  if (world.paused) {
    requestAnimationFrame(frame);
    return;
  }
  world.time += dt;
  world.spawnT += dt;
  tick();
  if (world.spawnT >= F.every(S.lv.spawn)) {
    world.spawnT = 0;
    spawnTick(F.max(S.lv.spawn) - world.things.length, false);
  }
  step(dt);
  world.shR += (F.size(S.lv.size) - world.shR) * Math.min(1, dt * 4);
  world.shP += (F.pull(S.lv.pull) - world.shP) * Math.min(1, dt * 4);
  world.pops.forEach((p) => (p.t += dt));
  world.pops = world.pops.filter((p) => p.t < 1.2);
  draw();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
