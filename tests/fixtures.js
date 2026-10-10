import { toClock } from "../lib/timecode.js";

/**
 * Génère des transcripts dans les différents formats que YouTube produit, à
 * partir d'un même discours : une phrase toutes les ~5 s.
 */

const WORDS = [
  "le jeûne", "intermittent", "on observe", "que le corps", "s'adapte", "très vite",
  "au manque", "de glucose", "et les études", "montrent", "un effet", "sur l'insuline",
];

/** `count` phrases, chacune avec son début et sa fin en secondes. */
export function speech(count, { punctuated = true } = {}) {
  const sentences = [];
  let t = 0;
  for (let i = 0; i < count; i++) {
    const length = 5 + (i % 4) * 2; // phrases de 5 à 11 mots
    const words = Array.from({ length }, (_, j) => WORDS[(i * 3 + j) % WORDS.length]);
    let text = words.join(" ");
    if (punctuated) text = text[0].toUpperCase() + text.slice(1) + (i % 5 === 4 ? " ?" : ".");
    const duration = 3 + (i % 4) * 1.5;
    sentences.push({ start: t, end: t + duration, text });
    t += duration + 0.4;
  }
  return sentences;
}

/** Format du panneau YouTube copié : timecode seul, puis le texte, une phrase par ligne. */
export function perSentence(sentences) {
  return sentences.map((s) => `${toClock(s.start)}\n${s.text}`).join("\n");
}

/** Sous-titres auto : une ligne toutes les ~2,5 s, coupée au milieu des phrases. */
export function fragments(sentences) {
  const words = sentences.flatMap((s) => {
    const list = s.text.split(" ");
    return list.map((w, i) => ({ t: s.start + ((s.end - s.start) * i) / list.length, w }));
  });
  const lines = [];
  for (const { t, w } of words) {
    const last = lines.at(-1);
    if (last && t - last.start < 2.5) last.words.push(w);
    else lines.push({ start: t, words: [w] });
  }
  return lines.map((l) => `${toClock(l.start)}\n${l.words.join(" ")}`).join("\n");
}

/** Un bloc par minute, au format `[HH:MM:SS] texte`. */
export function perMinute(sentences) {
  const minutes = new Map();
  for (const s of sentences) {
    const m = Math.floor(s.start / 60);
    minutes.set(m, [...(minutes.get(m) ?? []), s.text]);
  }
  return [...minutes]
    .map(([m, texts]) => `[00:${String(m).padStart(2, "0")}:00] ${texts.join(" ")}`)
    .join("\n");
}
