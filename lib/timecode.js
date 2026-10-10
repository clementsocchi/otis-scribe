/** Conversions de timecodes. `toHMS` est repris tel quel d'Otis (src/lib/timecode.ts). */

const pad = (n) => String(n).padStart(2, "0");

/**
 * Un timecode tel qu'on le rencontre dans les transcripts et descriptions :
 * `1:23`, `01:23`, `1:02:03`, avec éventuellement des millisecondes (`00:00:01,000`
 * dans un SRT, `00:00:01.000` dans un VTT).
 */
export const TIMECODE = String.raw`(?:\d{1,2}:)?\d{1,2}:\d{2}(?:[.,]\d{1,3})?`;

/** `1:02:03` → 3723. Les millisecondes sont ignorées : on affiche à la seconde. */
export function toSeconds(timecode) {
  return timecode
    .split(/[.,]/)[0]
    .split(":")
    .reduce((total, part) => total * 60 + Number(part), 0);
}

/** `HH:MM:SS`, le format des blocs dans Otis. */
export function toHMS(seconds) {
  const whole = Math.floor(Math.max(0, seconds));
  return `${pad(Math.floor(whole / 3600))}:${pad(Math.floor((whole % 3600) / 60))}:${pad(whole % 60)}`;
}

/** `M:SS` ou `H:MM:SS`, comme YouTube l'écrit dans les descriptions. */
export function toClock(seconds) {
  const whole = Math.floor(Math.max(0, seconds));
  const h = Math.floor(whole / 3600);
  const m = Math.floor((whole % 3600) / 60);
  const s = pad(whole % 60);
  return h ? `${h}:${pad(m)}:${s}` : `${m}:${s}`;
}
