// Small helpers shared by every module.

/** Keep a number between a minimum and a maximum. */
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

/** Short number format: 950 -> "950", 1234 -> "1.2k", 25000 -> "25k", 3400000 -> "3.4M". */
export const fmt = (n) =>
  n < 1e3
    ? '' + n
    : n < 1e4
      ? (n / 1e3).toFixed(1) + 'k'
      : n < 1e6
        ? Math.round(n / 1e3) + 'k'
        : (n / 1e6).toFixed(1) + 'M';

/** document.getElementById, shortened. */
export const $ = (id) => document.getElementById(id);
