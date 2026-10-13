// Saved progress. In the browser and inside the phone app it is kept in localStorage.
// Every access is wrapped in try/catch because storage can be unavailable (private windows, blocked data).

import { TYPES } from './config.js';

const KEY = 'bh_save';
const START = [TYPES[0].id]; // object types owned at the start: only the human

/** S = everything that is saved: coins, total swallowed, upgrade levels, object types bought, sound on/off, volume (0 to 1), language, dev infinite money. */
export const S = {
  coins: 0,
  total: 0,
  lv: { pull: 0, force: 0, size: 0, spawn: 0, value: 0 },
  own: [...START], // ids of the object types bought in the objects menu
  snd: true,
  vol: 1,
  inf: false, // dev option: infinite money (buying costs nothing)
  // Language: the saved choice, or the device's language the first time (Spanish if it is Spanish, else English).
  lang: (navigator.language || '').toLowerCase().startsWith('es') ? 'es' : 'en',
};

// Load once when the game starts.
try {
  const d = JSON.parse(localStorage.getItem(KEY) || 'null');
  if (d) {
    S.coins = d.coins | 0;
    S.total = d.total | 0;
    S.snd = d.snd !== false;
    if (d.lang === 'es' || d.lang === 'en') S.lang = d.lang;
    S.inf = d.inf === true;
    if (typeof d.vol === 'number') S.vol = Math.min(1, Math.max(0, d.vol));
    for (const k in S.lv) if (d.lv && d.lv[k] != null) S.lv[k] = d.lv[k] | 0;
    if (Array.isArray(d.own)) S.own = [...new Set([...START, ...d.own.filter((id) => TYPES.some((t) => t.id === id))])];
    // Types that come free with one you already own (added in an update after you bought it).
    for (const t of TYPES) if (t.freeWith && S.own.includes(t.freeWith) && !S.own.includes(t.id)) S.own.push(t.id);
  }
} catch (e) {
  /* no saved game, start fresh */
}

/** Write the progress to storage (errors are ignored). */
export function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(S));
  } catch (e) {
    /* storage unavailable */
  }
}

/** Back to level 0, zero coins and only the human (the sound settings and the dev option are kept). */
export function resetProgress() {
  S.coins = 0;
  S.total = 0;
  for (const k in S.lv) S.lv[k] = 0;
  S.own = [...START];
  save();
}
