// Every text the player reads, in Spanish (es) and English (en). The title "FEED IT!" and the camcorder labels
// (REC, SP, STANDBY) are the same in both. To add a language, copy the `en` block, translate it, and add its
// code to LANGS (and a label for the language button in the `lang` entries).
//
// t('key') returns a text; entries that are functions take values: t('level', 3) -> "Nivel 3".
// In index.html, data-i18n="key" fills an element's text and data-i18n-aria="key" its aria-label.

import { F } from './config.js';
import { S } from './save.js';

export const LANGS = ['es', 'en'];

const STR = {
  es: {
    langName: 'Español',
    // Shop and counters
    level: (l) => 'Nivel ' + l,
    max: 'Máximo',
    swallowed: (n) => n + ' objetos tragados',
    rateEmpty: 'Lanza objetos al hoyo para ganar monedas',
    // Toasts
    intro: 'Arrastra un objeto y lánzalo al agujero',
    newObj: (name) => '¡Nuevo objeto: ' + name + '!',
    bought: (name, l) => name + ' nivel ' + l,
    combo: (n) => '¡Combo x' + n + '!',
    resetDone: 'Progreso reiniciado',
    // Objects menu (head button)
    objects: 'Objetos',
    owned: 'Tienes',
    needSize: (l) => 'Tamaño ' + l,
    needSizeLong: (l) => 'Necesitas Tamaño nivel ' + l,
    // Footer
    soundOn: 'Sonido: sí',
    soundOff: 'Sonido: no',
    reset: 'Reiniciar progreso',
    resetConfirm: 'Toca otra vez para borrar',
    devMoney: 'Dev: dinero infinito',
    quakeNow: '¡Terremoto!',
    on: 'SÍ',
    off: 'NO',
    // Pause menu
    pause: 'Pausa',
    paused: 'PAUSA',
    menu: 'Menú',
    resume: 'Reanudar',
    options: 'Opciones',
    exit: 'Salir',
    volume: 'Volumen',
    language: 'Idioma',
    back: 'Volver',
    powerOn: 'Toca para encender',
    // Upgrades (names and what the next level does)
    'up.pull': 'Atracción',
    'up.force': 'Fuerza',
    'up.size': 'Tamaño',
    'up.spawn': 'Aparición',
    'up.value': 'Valor',
    'info.pull': (l) => `Radio de atracción: ${Math.round(F.pull(l))} px`,
    'info.force': (l) => `Fuerza de atracción: ${F.force(l)}`,
    'info.size': (l) => `Hoyo de ${Math.round(F.size(l))} px: traga objetos más grandes y más rápidos`,
    'info.spawn': (l) => `Hasta ${F.max(l)} objetos, uno cada ${F.every(l).toFixed(1)} s`,
    'info.value': (l) => `Cada objeto da x${F.val(l).toFixed(2)} monedas`,
    // Objects
    'obj.humano': 'Humano',
    'obj.policia': 'Policía',
    'obj.patrulla': 'Patrulla',
    'obj.pino': 'Pino',
    'obj.camilla': 'Cama de hospital',
    'obj.bombero': 'Bombero',
    'obj.doctor': 'Doctor',
    'obj.neumatico': 'Neumático',
    'obj.caja': 'Caja',
    'obj.basurero': 'Basurero',
    'obj.auto': 'Auto',
  },
  en: {
    langName: 'English',
    level: (l) => 'Level ' + l,
    max: 'Max',
    swallowed: (n) => n + ' objects swallowed',
    rateEmpty: 'Throw objects into the hole to earn coins',
    intro: 'Drag an object and throw it into the hole',
    newObj: (name) => 'New object: ' + name + '!',
    bought: (name, l) => name + ' level ' + l,
    combo: (n) => 'Combo x' + n + '!',
    resetDone: 'Progress reset',
    objects: 'Objects',
    owned: 'Owned',
    needSize: (l) => 'Size ' + l,
    needSizeLong: (l) => 'Needs Size level ' + l,
    soundOn: 'Sound: on',
    soundOff: 'Sound: off',
    reset: 'Reset progress',
    resetConfirm: 'Tap again to erase',
    devMoney: 'Dev: infinite money',
    quakeNow: 'Earthquake!',
    on: 'ON',
    off: 'OFF',
    pause: 'Pause',
    paused: 'PAUSE',
    menu: 'Menu',
    resume: 'Resume',
    options: 'Options',
    exit: 'Exit',
    volume: 'Volume',
    language: 'Language',
    back: 'Back',
    powerOn: 'Tap to turn on',
    'up.pull': 'Pull',
    'up.force': 'Force',
    'up.size': 'Size',
    'up.spawn': 'Spawn',
    'up.value': 'Value',
    'info.pull': (l) => `Pull radius: ${Math.round(F.pull(l))} px`,
    'info.force': (l) => `Pull strength: ${F.force(l)}`,
    'info.size': (l) => `${Math.round(F.size(l))} px hole: swallows bigger and faster objects`,
    'info.spawn': (l) => `Up to ${F.max(l)} objects, one every ${F.every(l).toFixed(1)} s`,
    'info.value': (l) => `Each object gives x${F.val(l).toFixed(2)} coins`,
    'obj.humano': 'Human',
    'obj.policia': 'Cop',
    'obj.patrulla': 'Cop car',
    'obj.pino': 'Pine tree',
    'obj.camilla': 'Hospital bed',
    'obj.bombero': 'Firefighter',
    'obj.doctor': 'Doctor',
    'obj.neumatico': 'Tire',
    'obj.caja': 'Box',
    'obj.basurero': 'Trash can',
    'obj.auto': 'Car',
  },
};

/** The text for key in the current language (falls back to Spanish, then to the key itself). */
export function t(key, ...args) {
  const v = STR[S.lang]?.[key] ?? STR.es[key] ?? key;
  return typeof v === 'function' ? v(...args) : v;
}

/** Fill every data-i18n / data-i18n-aria element in the page and set <html lang>. */
export function applyStatic() {
  document.documentElement.lang = S.lang;
  for (const e of document.querySelectorAll('[data-i18n]')) e.textContent = t(e.dataset.i18n);
  for (const e of document.querySelectorAll('[data-i18n-aria]')) e.setAttribute('aria-label', t(e.dataset.i18nAria));
}
