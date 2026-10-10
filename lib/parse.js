import { TIMECODE, toClock, toSeconds } from "./timecode.js";

/**
 * Lecture des textes collés ou récupérés sur YouTube.
 *
 * Tout ce qui entre dans l'extension passe par ici, quel que soit son format,
 * pour en sortir sous une seule forme : une liste de `{ start, text }`. Le reste
 * du traitement n'a ainsi jamais à se soucier de l'origine du texte.
 */

/** Un timecode seul sur sa ligne : c'est ce que donne la copie du panneau YouTube. */
const ONLY_TIMECODE = new RegExp(String.raw`^[\[(]?(${TIMECODE})[\])]?$`);

/** `[00:01:23] texte`, `00:01:23 texte`, `1:23 - texte`… */
const LEADING_TIMECODE = new RegExp(String.raw`^[\[(]?(${TIMECODE})[\])]?\s*(?:[-–—:|]\s*)?(\S.*)$`);

/** La ligne de temps d'un SRT ou d'un VTT : `00:00:01,000 --> 00:00:04,000`. */
const SRT_TIMING = new RegExp(String.raw`^(${TIMECODE})\s*-->`);

/**
 * Les libellés d'accessibilité que YouTube glisse sous chaque timecode et qui
 * remontent parfois au copier-coller : « 2 secondes », « 1 minute, 5 secondes ».
 */
const DURATION_LABEL =
  /^\d+\s*(?:heures?|minutes?|secondes?|hours?|seconds?)(?:,?\s*\d+\s*(?:heures?|minutes?|secondes?|hours?|seconds?))*$/i;

/**
 * Transforme un transcript, quel que soit son format, en cues `{ start, text }`.
 *
 * Une ligne de texte sans timecode prolonge le cue précédent. Un transcript sans
 * aucun timecode donne donc un seul cue, à `start = null`.
 */
export function parseTranscript(raw) {
  const lines = raw.split(/\r?\n/).map((line) => line.trim());
  const cues = [];
  let pendingStart = null; // timecode lu seul sur sa ligne, en attente de son texte

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line || line === "WEBVTT" || DURATION_LABEL.test(line)) continue;
    // Le numéro de séquence d'un SRT, juste avant sa ligne de temps.
    if (/^\d+$/.test(line) && SRT_TIMING.test(lines[i + 1] ?? "")) continue;

    let match;
    if ((match = line.match(SRT_TIMING)) || (match = line.match(ONLY_TIMECODE))) {
      pendingStart = toSeconds(match[1]);
    } else if ((match = line.match(LEADING_TIMECODE))) {
      cues.push({ start: toSeconds(match[1]), text: match[2] });
      pendingStart = null;
    } else if (pendingStart !== null) {
      cues.push({ start: pendingStart, text: line });
      pendingStart = null;
    } else if (cues.length) {
      cues.at(-1).text += " " + line;
    } else {
      cues.push({ start: null, text: line });
    }
  }

  const hasTimecodes = cues.some((cue) => cue.start !== null);
  // Du texte avant le premier timecode : on le date au début de la vidéo.
  if (hasTimecodes && cues[0].start === null) cues[0].start = 0;
  return { cues, hasTimecodes };
}

/**
 * Sous-titres lus dans le lecteur (`[{ start, text }]`) → texte `M:SS` + ligne
 * de texte, le même format que la copie du panneau YouTube. On les affiche ainsi
 * dans la zone Transcript, lisibles et modifiables avant la mise en forme.
 */
export function captionsToText(captions) {
  return captions
    .map(({ start, text }) => ({ start, text: text.replace(/\s+/g, " ").trim() }))
    .filter(({ text }) => text)
    .map(({ start, text }) => `${toClock(start)}\n${text}`)
    .join("\n");
}

const CHAPTER_TIMECODE_FIRST = new RegExp(String.raw`^[\[(]?(${TIMECODE})[\])]?\s*[-–—:|•·.)]*\s*(.+)$`);
const CHAPTER_TIMECODE_LAST = new RegExp(String.raw`^(.+?)\s*[-–—:|•·(\[]*\s*[\[(]?(${TIMECODE})[\])]?$`);

/**
 * Extrait les chapitres d'une description ou d'une liste collée.
 *
 * On ne retient que les lignes qui commencent ou finissent par un timecode
 * (`0:00 Intro`, `Intro - 0:00`, `▶️ (1:02:03) Titre`). Le reste de la
 * description (liens, remerciements, un « à 12:30 » au milieu d'une phrase) est
 * ignoré : on peut donc coller la description entière.
 */
export function parseChapters(raw) {
  const chapters = [];
  for (let line of raw.split(/\r?\n/)) {
    // Puces et émojis en tête de ligne, très fréquents dans les descriptions.
    line = line.replace(/^[^\p{L}\p{N}[(]+/u, "").trim();
    let match;
    let start, title;
    if ((match = line.match(CHAPTER_TIMECODE_FIRST))) {
      [start, title] = [match[1], match[2]];
    } else if ((match = line.match(CHAPTER_TIMECODE_LAST))) {
      [start, title] = [match[2], match[1]];
    } else {
      continue;
    }
    title = title.replace(/^[\s\-–—:|•·]+|[\s\-–—:|•·]+$/g, "");
    if (/[\p{L}\p{N}]/u.test(title)) chapters.push({ start: toSeconds(start), title });
  }

  chapters.sort((a, b) => a.start - b.start);
  return chapters.filter((ch, i) => i === 0 || ch.start !== chapters[i - 1].start);
}
