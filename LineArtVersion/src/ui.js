// Everything made of HTML: the coin counter, the shop buttons, the objects menu, toasts, the sound (megaphone) button,
// the camcorder timecode and the thumb that taps each thing you buy. (Reset is in the pause menu, menu.js.)

import { UP, TYPES, RARE, cost } from './config.js';
import { S, save } from './save.js';
import { world, unlocked, fits } from './world.js';
import { on } from './events.js';
import { playBuy, playUnlock, setSound } from './audio.js';
import { fmt, $ } from './util.js';
import { t } from './i18n.js';

const btns = {}; // upgrade id -> its <button>
const rows = {}; // object type id -> its <button> in the objects menu

// Shop icons: src/assets/icons/<upgrade id>.svg. They are used as a mask over the text colour, so only their
// shape matters (any colour works) and they turn white with the button when it is pressed.
const ICONS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/icons/*.svg', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.match(/([^/]+)\.svg$/)[1], url],
  ),
);
// Object pictures for the objects menu: the same files the game draws (src/assets/objects/<img or id>.svg/.png).
const OBJ_IMGS = Object.fromEntries(
  Object.entries(import.meta.glob('./assets/objects/*.{svg,png}', { eager: true, query: '?url', import: 'default' })).map(
    ([path, url]) => [path.match(/([^/]+)\.(svg|png)$/)[1], url],
  ),
);
let toastTimer;

// Paying. With the dev option "infinite money" on, everything is affordable and nothing is taken.
const canPay = (n) => S.inf || S.coins >= n;
const pay = (n) => {
  if (!S.inf) S.coins -= n;
};

/** Show a message pill at the bottom of the play area for ms milliseconds. */
export function toast(txt, ms) {
  const e = $('toast');
  e.textContent = txt;
  e.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => e.classList.remove('show'), ms);
}

/** Re-renders coins, counters and each button's level and cost; disables what you can't afford or is maxed. */
export function refresh() {
  $('mass').textContent = S.inf ? '∞' : fmt(S.coins);
  $('rate').textContent = S.total ? t('swallowed', fmt(S.total)) : t('rateEmpty');
  UP.forEach((u) => {
    const l = S.lv[u.id];
    const maxed = l >= u.max;
    const price = cost(u, l);
    const b = btns[u.id];
    b.children[1].textContent = maxed ? t('max') : t('level', l);
    b.children[2].textContent = maxed ? '—' : fmt(price);
    b.disabled = maxed || !canPay(price);
  });
  for (const id in rows) {
    const tp = TYPES.find((x) => x.id === id);
    const b = rows[id];
    const owned = S.own.includes(id);
    const need = sizeNeeded(tp);
    b.classList.toggle('own', owned);
    b.querySelector('.st').textContent = owned ? t('owned') : need > S.lv.size ? t('needSize', need) : fmt(tp.price);
    b.querySelector('.st').classList.toggle('pr', !owned && need <= S.lv.size);
    b.title = owned ? '' : need > S.lv.size ? t('needSizeLong', need) : '';
    b.disabled = owned || need > S.lv.size || !canPay(tp.price);
  }
  $('snd').setAttribute('aria-pressed', String(S.snd));
  $('snd').setAttribute('aria-label', S.snd ? t('soundOn') : t('soundOff'));
}

/** Lowest Size level whose hole is big enough for object type tp. */
function sizeNeeded(tp) {
  const top = UP.find((u) => u.id === 'size').max;
  for (let l = 0; l <= top; l++) if (fits(tp, l)) return l;
  return top + 1;
}

/** Upgrade names on the shop buttons (tooltip and screen readers): call again after the language changes. */
export function relabel() {
  UP.forEach((u) => {
    btns[u.id].title = t('up.' + u.id);
    btns[u.id].querySelector('.vh').textContent = t('up.' + u.id);
  });
  for (const id in rows) rows[id].querySelector('.nm').textContent = t('obj.' + id);
}

/** Buying: pay, level up, then show a toast. If the bigger hole unlocked a new object type, celebrate instead. */
function buy(u) {
  const l = S.lv[u.id];
  const price = cost(u, l);
  if (l >= u.max || !canPay(price)) return;
  const before = unlocked().length;
  pay(price);
  S.lv[u.id] = l + 1;
  const after = unlocked();
  if (after.length > before) {
    toast(t('newObj', t('obj.' + after[after.length - 1].id)), 3000);
    playUnlock();
  } else {
    toast(t('bought', t('up.' + u.id), l + 1), 1600);
    playBuy();
  }
  pressThumb(btns[u.id]);
  save();
  refresh();
}

/** Buying an object type in the objects menu: from now on it spawns, and so do the types that come free with it. */
function buyType(tp) {
  if (tp.freeWith || S.own.includes(tp.id) || !fits(tp) || !canPay(tp.price)) return;
  const got = [tp, ...TYPES.filter((x) => x.freeWith === tp.id && !S.own.includes(x.id))];
  pay(tp.price);
  S.own.push(...got.map((x) => x.id));
  toast(t('newObj', got.map((x) => t('obj.' + x.id)).join(' + ')), 3000);
  playUnlock();
  pressThumb(rows[tp.id]);
  save();
  refresh();
}

// ---------- objects menu ----------
// The head button under the coins slides a panel down below it. Tapping the button again, or anywhere outside
// the panel, slides it back up. The game keeps running behind it.
let rosterOpen = false;

function setRoster(open) {
  rosterOpen = open;
  $('roster').style.top = $('chars').offsetTop + $('chars').offsetHeight + 6 + 'px';
  $('roster').classList.toggle('open', open);
  $('roster').inert = !open;
  $('chars').setAttribute('aria-expanded', String(open));
  $('chars').classList.toggle('on', open);
  // Closed while the thumb is still pressing one of its rows: the thumb has nothing to press any more, so it fades out.
  if (!open && thumbTarget && $('roster').contains(thumbTarget)) fadeThumb();
}

// ---------- the thumb that taps the bought upgrade ----------
// On every purchase a thumb, seen from the player's point of view (nail side up, coming from below), rises to the
// bought button, hovers over it nervously (trembling, with a false start), presses it (the button squashes a
// little and a ring spreads out from the thumb tip) and drops back below the screen. It uses the Web Animations
// API, so a new purchase restarts it right away instead of queuing. With reduced motion on, it still moves but
// trembles half as much.
let thumbEl;
let ringEl;
let reducedMotion;
let thumbAnim = null;
let ringAnim = null;
let thumbTarget = null; // the button the thumb is pressing
let fadeAnims = []; // the quick fade-out of the thumb and ring, while it runs

/** Fade the thumb (and its ring) out quickly and stop them, if they are on screen. */
function fadeThumb() {
  if (!thumbAnim || thumbAnim.playState !== 'running' || fadeAnims.length) return;
  const anim = thumbAnim;
  const ring = ringAnim;
  fadeAnims = [thumbEl, ringEl].map((el) =>
    el.animate([{ opacity: getComputedStyle(el).opacity }, { opacity: 0 }], { duration: 150, easing: 'ease-out', fill: 'forwards' }),
  );
  fadeAnims[0].onfinish = () => {
    anim.cancel();
    if (ring) ring.cancel();
    fadeAnims.forEach((a) => a.cancel());
    fadeAnims = [];
  };
}

/** Animate the thumb pressing button b. */
function pressThumb(b) {
  if (!b) return;
  const br = b.getBoundingClientRect();
  const pr = document.body.getBoundingClientRect();
  // The thumb tip (top edge, 40% from the left of the 96 px wide drawing) lands half way down the button.
  const tx = br.left - pr.left + br.width / 2;
  const ty = br.top - pr.top + br.height * 0.5;
  thumbEl.style.left = tx - 38 + 'px';
  thumbEl.style.top = ty - 4 + 'px';
  ringEl.style.left = tx - 9 + 'px';
  ringEl.style.top = ty - 9 + 'px';
  if (thumbAnim) thumbAnim.cancel();
  if (ringAnim) ringAnim.cancel();
  fadeAnims.forEach((a) => a.cancel()); // a new press stops a fade that was still running
  fadeAnims = [];
  thumbTarget = b;
  const T = 930; // total duration in ms
  const PRESS = 0.62; // when the thumb touches the button (fraction of T)
  // Off screen: far enough down that the whole thumb starts (and ends) below the bottom edge of the screen.
  const OFF = window.innerHeight - (br.top + br.height * 0.5 - 4) + 20;
  // With reduced motion turned on in the system it still moves, but trembles half as much.
  const shake = reducedMotion.matches ? 0.5 : 1;
  // Pose: how far below the button the tip is (px), tilt (deg) and scale (closer to the camera = bigger). The slight
  // tilt is a right thumb from the lower right. Random jitter is added on top to make it tremble.
  const pose = (y, rot, sc, jit = 0) => {
    const j = () => (Math.random() * 2 - 1) * jit * shake;
    return `translate(${j().toFixed(1)}px, ${(y + j()).toFixed(1)}px) rotate(${(rot + j() * 0.6).toFixed(2)}deg) scale(${sc})`;
  };
  // Keyframes: slide up from below the screen, hover over the button trembling (with a small false start toward
  // it and a pull back), then commit and press, still shaking a little, hold a moment, and drop back off screen.
  const frames = [
    { transform: pose(OFF, -16, 1.15), opacity: 1, offset: 0, easing: 'ease-out' },
    { transform: pose(30, -10, 1.06), opacity: 1, offset: 0.22 },
  ];
  const hover = [
    [0.26, 28], [0.29, 31], [0.32, 26], [0.36, 14], // creeping closer... false start
    [0.4, 24], [0.44, 32], [0.48, 29], [0.52, 31], [0.56, 27], // ...pulls back, nervous
  ];
  for (const [at, y] of hover) frames.push({ transform: pose(y, -10, 1.04, 3), opacity: 1, offset: at });
  frames.push({ transform: pose(0, -8, 1), opacity: 1, offset: PRESS, easing: 'ease-in' }); // commit: press
  for (const at of [0.66, 0.7, 0.74, 0.78]) frames.push({ transform: pose(0, -8, 1, 1.2), opacity: 1, offset: at });
  frames.push({ transform: pose(OFF, -16, 1.15), opacity: 1, offset: 1 });
  frames[frames.length - 2].easing = 'ease-in';
  thumbAnim = thumbEl.animate(frames, { duration: T, easing: 'linear' });
  // The button dips and the ring spreads out right when the thumb touches it.
  b.animate([{ transform: 'scale(1)' }, { transform: 'scale(.9)' }, { transform: 'scale(1)' }], {
    duration: 280,
    delay: T * PRESS - 40,
    easing: 'ease-out',
  });
  ringAnim = ringEl.animate(
    [
      { transform: 'scale(.4)', opacity: 0.9 },
      { transform: 'scale(3)', opacity: 0 },
    ],
    { duration: 450, delay: T * PRESS, easing: 'ease-out' },
  );
}

// ---------- camcorder timecode ----------
// Top-right of the frame: HH:MM:SS since the game opened. It only touches the page once per second.
let tcEl;
let tcSec = -1;

/** Call every frame. */
export function tick() {
  const s = Math.floor(world.time);
  if (s === tcSec) return;
  tcSec = s;
  const p = (n) => String(n).padStart(2, '0');
  tcEl.textContent = p(Math.floor(s / 3600)) + ':' + p(Math.floor(s / 60) % 60) + ':' + p(s % 60);
}

// ---------- start-up ----------

/** Build the shop buttons and wire up every button and event. Call once. */
export function initUI() {
  thumbEl = $('finger');
  ringEl = $('tap');
  tcEl = $('tc');
  reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  // One button per upgrade, shown as an icon (the name stays as tooltip and for screen readers).
  UP.forEach((u) => {
    const b = document.createElement('button');
    b.className = 'up';
    b.innerHTML = '<b><span class="ic"></span><span class="vh"></span></b><i></i><em></em>';
    if (ICONS[u.id]) b.querySelector('.ic').style.setProperty('--icon', 'url("' + ICONS[u.id] + '")');
    b.onclick = () => buy(u);
    $('shop').appendChild(b);
    btns[u.id] = b;
  });

  // Objects menu: one row per object type you can buy: picture, name, coins it is worth, and its price / state.
  // Types that come free with another one (freeWith, like the cop car) and rare types don't get a row.
  $('chars').querySelector('.ic').style.setProperty('--icon', 'url("' + ICONS.head + '")');
  TYPES.filter((tp) => !tp.freeWith && !(tp.id in RARE)).forEach((tp) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'obj';
    b.innerHTML = '<span class="pic"><img alt="" draggable="false"></span><span class="nm"></span><span class="vl"></span><span class="st"></span>';
    b.querySelector('img').src = OBJ_IMGS[tp.img || tp.id] || '';
    b.querySelector('.vl').textContent = '+' + fmt(tp.v);
    b.onclick = () => buyType(tp);
    $('roster-list').appendChild(b);
    rows[tp.id] = b;
  });
  $('chars').onclick = () => setRoster(!rosterOpen);
  document.addEventListener('pointerdown', (e) => {
    if (rosterOpen && !$('roster').contains(e.target) && !$('chars').contains(e.target)) setRoster(false);
  });

  // Sound toggle: the megaphone in the camcorder frame, left of the battery.
  $('snd').onclick = () => {
    S.snd = !S.snd;
    setSound(S.snd);
    save();
    refresh();
  };

  // The message when the ground starts shaking (the quake meter itself is the ring around the vortex, render.js).
  on('quake', () => toast(t('quakeNow'), 2200));

  // An object finished falling in: show a combo message and update the counters.
  on('absorb', ({ combo }) => {
    if (combo >= 2) toast(t('combo', combo + 1), 1200);
    refresh();
  });

  relabel();
  refresh();
  if (!S.total) toast(t('intro'), 4000);
}
