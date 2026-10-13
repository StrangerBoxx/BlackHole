// The pause menu, styled like a camcorder's on-screen menu: the pause button in the HUD (or Esc) freezes the game
// and opens it. Reanudar = back to the game, Opciones = volume slider, language, reset progress and the dev
// infinite-money switch, Salir = the camcorder switches off (in the
// phone app the app then closes; a web page can't close itself, so in the browser it waits in standby).

import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { S, save, resetProgress } from './save.js';
import { world, resetWorld } from './world.js';
import { pauseAudio, setSound } from './audio.js';
import { refresh, relabel, toast } from './ui.js';
import { t, applyStatic, LANGS } from './i18n.js';
import { $ } from './util.js';

const STEPS = 10; // cells in the volume bar

let menuEl;
let lastFocus = null; // what had focus before the menu opened, to give it back on resume

/** Show one panel of the menu ('m-main' or 'm-opt') and focus its first control. */
function showPanel(id) {
  for (const p of menuEl.querySelectorAll('.mbox')) p.hidden = p.id !== id;
  const first = $(id).querySelector('input, button');
  if (first) first.focus();
}

/** Pause button: ❚❚ while playing, ▶ (resume) while paused; the labels follow the language. */
function showPauseState() {
  const p = world.paused;
  $('pause').innerHTML = p ? '&#9654;' : '&#10074;&#10074;';
  $('pause').setAttribute('aria-label', t(p ? 'resume' : 'pause'));
  $('pause').setAttribute('aria-expanded', String(p));
  document.querySelector('#cam .lbl').textContent = p ? t('paused') : 'REC';
}

/** Language button: highlight the current one and say it to screen readers. */
function showLang() {
  for (const b of $('langbtn').querySelectorAll('[data-l]')) b.classList.toggle('on', b.dataset.l === S.lang);
  $('langbtn').setAttribute('aria-label', t('language') + ': ' + t('langName'));
}

/** Dev switch: show SI / NO (ON / OFF) and say it to screen readers. */
function showDev() {
  $('devv').textContent = t(S.inf ? 'on' : 'off');
  $('devv').classList.toggle('on', S.inf);
  $('devbtn').setAttribute('aria-pressed', String(S.inf));
}

// Reset needs two taps within 3 seconds so it can't happen by accident. The second tap wipes the progress and
// goes back to the game, so you see it start over.
let resetArmed = false;
let resetTimer;

function disarmReset() {
  clearTimeout(resetTimer);
  resetArmed = false;
  $('rst').textContent = t('reset');
}

function reset() {
  if (!resetArmed) {
    resetArmed = true;
    $('rst').textContent = t('resetConfirm');
    resetTimer = setTimeout(disarmReset, 3000);
    return;
  }
  disarmReset();
  resetProgress();
  resetWorld();
  refresh();
  resume();
  toast(t('resetDone'), 2000);
}

/** Switch to the next language and re-label everything on screen. */
function nextLang() {
  S.lang = LANGS[(LANGS.indexOf(S.lang) + 1) % LANGS.length];
  save();
  applyStatic();
  relabel();
  refresh();
  showPauseState();
  showLang();
  showVolume();
  showDev();
  disarmReset();
}

function pause() {
  if (world.paused) return;
  world.paused = true;
  // Drop anything held, so it doesn't stay glued to a finger that let go behind the menu.
  if (world.held) {
    world.held.drag = false;
    world.held = null;
  }
  document.body.classList.add('paused');
  showPauseState();
  pauseAudio(true);
  lastFocus = document.activeElement;
  menuEl.hidden = false;
  showPanel('m-main');
}

function resume() {
  if (!world.paused) return;
  disarmReset();
  menuEl.hidden = true;
  $('off').hidden = true;
  world.paused = false;
  document.body.classList.remove('paused');
  showPauseState();
  pauseAudio(false);
  if (lastFocus && lastFocus.focus) lastFocus.focus();
}

/** Salir: CRT switch-off animation, then standby (browser) or close the app (phone). */
function exit() {
  menuEl.hidden = true;
  const off = $('off');
  off.hidden = false;
  off.classList.remove('done');
  off.classList.add('anim');
  setTimeout(() => {
    off.classList.add('done');
    $('power').focus();
    if (Capacitor.isNativePlatform()) App.exitApp().catch(() => {});
  }, 600);
}

/** Volume: fill the cells and show the percentage. */
function showVolume() {
  const n = Math.round(S.vol * STEPS);
  $('vol').value = n;
  $('vol').setAttribute('aria-valuetext', Math.round(S.vol * 100) + '%');
  $('volv').textContent = Math.round(S.vol * 100);
  [...$('volbar').children].forEach((c, i) => c.classList.toggle('on', i < n));
}

export function initMenu() {
  menuEl = $('menu');
  $('volbar').innerHTML = '<i></i>'.repeat(STEPS);
  applyStatic();
  showVolume();
  showLang();
  showDev();
  showPauseState();

  $('pause').onclick = () => (world.paused ? resume() : pause());
  $('power').onclick = resume; // turning the camcorder back on returns to the game

  menuEl.addEventListener('click', (e) => {
    const act = e.target.closest('button')?.dataset.act;
    if (act === 'resume') resume();
    else if (act === 'options') showPanel('m-opt');
    else if (act === 'back') {
      disarmReset();
      showPanel('m-main');
    } else if (act === 'lang') nextLang();
    else if (act === 'reset') reset();
    else if (act === 'dev') {
      S.inf = !S.inf;
      save();
      showDev();
      refresh();
    }
    else if (act === 'exit') exit();
    else if (e.target === menuEl) resume(); // tap outside the box
  });

  $('vol').addEventListener('input', () => {
    S.vol = $('vol').value / STEPS;
    if (S.vol > 0 && !S.snd) S.snd = true; // raising the volume turns sound back on
    setSound(S.snd);
    showVolume();
    refresh(); // the megaphone's on/off look
  });
  $('vol').addEventListener('change', save);

  // Esc / the Android back button: close options, then the menu; or open it while playing.
  const back = () => {
    if (!$('off').hidden) return;
    if (!world.paused) pause();
    else if (!$('m-opt').hidden) showPanel('m-main');
    else resume();
  };
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') back();
    // Keep Tab inside the open menu panel (or on the power button in standby).
    if (e.key === 'Tab' && world.paused) {
      const box = !$('off').hidden ? $('off') : menuEl.querySelector('.mbox:not([hidden])');
      const items = [...box.querySelectorAll('button, input')];
      const i = items.indexOf(document.activeElement);
      const next = (i + (e.shiftKey ? -1 : 1) + items.length) % items.length;
      items[i < 0 ? 0 : next].focus();
      e.preventDefault();
    }
  });
  if (Capacitor.isNativePlatform()) App.addListener('backButton', back);
}
