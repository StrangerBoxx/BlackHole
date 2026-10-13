// Sound: short WAV files in src/assets/sounds/, played with the Web Audio API. To change a sound, replace its
// file (same name). coin, buy, unlock and swallow are one-shots; drone loops quietly in the background.

import { S } from './save.js';
import { on } from './events.js';

// Every file in the sounds folder, by name (coin, buy, ...). Vite turns each into a URL that works in the app too.
const URLS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/sounds/*.wav', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.match(/([^/]+)\.wav$/)[1], url],
  ),
);

// The files start downloading right away; they are decoded once the audio engine exists.
const files = {}; // name -> Promise<ArrayBuffer>
const buffers = {}; // name -> AudioBuffer, ready to play

// AC = AudioContext (browsers only allow it after a touch). MG = master volume (S.vol, or 0 when sound is off).
// paused = the pause menu is open: the whole engine is suspended, so the drone stops too.
let AC;
let MG;
let paused = false;

/** Decode every sound file; the drone starts looping as soon as it is ready. */
function decodeAll() {
  for (const [name, file] of Object.entries(files)) {
    file
      .then((data) => AC.decodeAudioData(data))
      .then((buf) => {
        buffers[name] = buf;
        if (name === 'drone') play('drone', { loop: true, force: true });
      })
      .catch(() => {}); // a missing or broken file just stays silent
  }
}

/**
 * Creates the audio engine once, wakes it up if it is suspended, and returns null when sound is off.
 * Call it from a touch handler.
 */
export function unlockAudio() {
  if (!AC) {
    try {
      AC = new (window.AudioContext || window.webkitAudioContext)();
      MG = AC.createGain();
      MG.gain.value = S.snd ? S.vol : 0;
      MG.connect(AC.destination);
      decodeAll();
    } catch (e) {
      AC = null;
    }
  }
  if (AC && AC.state === 'suspended' && !paused) AC.resume();
  return S.snd ? AC : null;
}

/** Sound toggle and volume slider: both just set the master volume from S.snd and S.vol. */
export function setSound(on) {
  if (MG) MG.gain.value = on ? S.vol : 0;
  else if (on) unlockAudio();
}

/** Pause menu: freeze every sound (and the drone) while it is open. */
export function pauseAudio(p) {
  paused = p;
  if (!AC) return;
  if (p) AC.suspend();
  else AC.resume();
}

/** Plays a loaded sound. vol = volume, rate = speed (higher = higher pitch and shorter), loop = repeat forever. */
function play(name, { vol = 1, rate = 1, loop = false, force = false } = {}) {
  const c = force ? AC : unlockAudio();
  const buf = buffers[name];
  if (!c || !buf) return;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = loop;
  src.playbackRate.value = rate;
  const g = c.createGain();
  g.gain.value = vol;
  src.connect(g).connect(MG);
  src.start();
}

/** Coin chime: the pitch goes up one semitone per combo step (max one octave). */
function coinSound(combo) {
  play('coin', { rate: 2 ** (Math.min(combo, 12) / 12) });
}

/** Purchase: short rising arpeggio. */
export function playBuy() {
  play('buy');
}

/** New object unlocked: longer arpeggio plus a chord. */
export function playUnlock() {
  play('unlock');
}

/** Whoosh + low thump. The file is a medium object; bigger objects play it louder and deeper. */
function swallowSound(r) {
  const size = Math.min(1, r / 56);
  play('swallow', { vol: 0.6 + 0.8 * size, rate: 1.3 - 0.6 * size });
}

/** Start downloading the sounds and hook the game events up to them. */
export function initAudio() {
  for (const [name, url] of Object.entries(URLS)) files[name] = fetch(url).then((r) => r.arrayBuffer());
  on('swallow', (r) => swallowSound(r));
  // Earthquake: the swallow sound slowed right down makes a deep rumble, played twice a little apart.
  on('quake', () => {
    play('swallow', { vol: 1.6, rate: 0.32 });
    setTimeout(() => play('swallow', { vol: 1.2, rate: 0.26 }), 450);
  });
  on('absorb', ({ combo }) => coinSound(combo));
}
