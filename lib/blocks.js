/**
 * Nettoyage du transcript et découpage en blocs datés.
 *
 * Le découpage reprend `turnsFromSegments` d'Otis (src/lib/transcript.ts) : on
 * accumule le texte jusqu'à environ 30 s, et on ne coupe que sur une fin de
 * phrase. La différence tient à l'entrée : Voxtral livrait une phrase par
 * segment, alors que YouTube livre selon les vidéos une ligne toutes les 2 s,
 * une phrase par ligne ou un bloc par minute. D'où l'étape `toUnits`, qui ramène
 * tout à une granularité exploitable avant le découpage.
 */

/** Durée visée pour un bloc, en secondes : celle d'Otis. */
export const DEFAULT_BLOCK_SEC = 30;

/**
 * Au-delà de cette durée, le début estimé d'une phrase peut s'écarter de
 * quelques secondes de la réalité : on le signale dans le panneau.
 */
const APPROX_CUE_SEC = 15;

/** Débit moyen du français parlé, pour estimer la fin de la toute dernière ligne. */
const CHARS_PER_SEC = 15;

/**
 * Filet de sécurité, comme dans Otis : un passage mal ponctué ne doit pas
 * reconstituer un bloc géant. Marge absolue plutôt que proportionnelle, pour
 * la même raison mesurée dans Otis (docs/decisions.md, § 10).
 */
const SAFETY_MARGIN_SEC = 60;

/** Sans ponctuation, on cherche la meilleure pause entre 30 s et 30 + 15 s. */
const PAUSE_WINDOW_SEC = 15;

/** Vrai si le texte se termine sur une fin de phrase, guillemet fermant compris (« … fin. »). */
export function endsSentence(text) {
  return /[.!?…](?:\s*["»)\]])?\s*$/.test(text);
}

/**
 * Découpe un texte en phrases.
 *
 * On coupe après . ! ? … suivis d'une espace. Un nombre décimal (« 3.5 ») n'est
 * donc pas coupé, et un guillemet fermant reste avec sa phrase.
 */
export function splitSentences(text) {
  return text.split(/(?<=[.!?…](?:\s*["»)\]])?)\s+(?!["»)\]])/).filter(Boolean);
}

/**
 * Nettoyage léger : on retire ce qui n'est pas de la parole, sans jamais
 * reformuler. `[Musique]`, `[Applaudissements]`, `♪` et les `>>` que YouTube met
 * aux changements de speaker disparaissent. Un crochet contenant un chiffre est
 * conservé, parce que ce pourrait être un timecode cité dans le texte.
 */
export function cleanText(text) {
  return text
    .replace(/\[[^\]\d]{1,40}\]/g, " ")
    .replace(/[♪♫]+/g, " ")
    .replace(/>>+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Nombre de mots en tête de `next` qui répètent la fin de `previous`.
 *
 * Les sous-titres automatiques chevauchent parfois leurs lignes (« on va parler
 * du » / « parler du jeûne »). On n'efface qu'une répétition d'au moins deux
 * mots, identique à la lettre près, ponctuation et majuscules comprises : un
 * seul mot répété est souvent du vrai français (« nous nous sommes vus »), et
 * une comparaison plus souple effaçait de vraies phrases qui commençaient
 * comme la précédente finissait.
 */
function overlapLength(previous, next) {
  for (let k = Math.min(8, previous.length, next.length); k >= 2; k--) {
    let same = true;
    for (let j = 0; j < k && same; j++) {
      same = previous[previous.length - k + j] === next[j];
    }
    if (same) return k;
  }
  return 0;
}

/** Nettoie chaque ligne, retire les lignes vides, les doublons et les chevauchements. */
export function cleanCues(cues) {
  const result = [];
  for (const cue of cues) {
    const text = cleanText(cue.text);
    if (!text) continue;
    const previous = result.at(-1);
    if (previous && previous.text === text) continue;
    if (previous) {
      const words = text.split(" ");
      const overlap = overlapLength(previous.text.split(" "), words);
      if (overlap === words.length) continue;
      result.push({ start: cue.start, text: words.slice(overlap).join(" ") });
    } else {
      result.push({ start: cue.start, text });
    }
  }
  return result;
}

/**
 * Ramène les lignes YouTube à des unités `{ start, end, text, approx }`.
 *
 * YouTube ne donne que le début de chaque ligne : sa fin est le début de la
 * suivante. Une ligne contenant une fin de phrase est découpée à cet endroit,
 * et le début de chaque morceau estimé au prorata de sa longueur.
 *
 * C'est ce qui permet de couper les blocs sur les phrases quel que soit le
 * format : avec des lignes de 2 s, une phrase finit souvent en pleine ligne
 * (« …s'adapte. Que le corps… ») ; avec des blocs d'une minute, sans ce
 * découpage, on obtiendrait des blocs d'une minute.
 */
export function toUnits(cues) {
  const units = [];
  cues.forEach((cue, i) => {
    const next = cues[i + 1];
    const end = next
      ? Math.max(next.start, cue.start)
      : cue.start + Math.max(2, cue.text.length / CHARS_PER_SEC);
    const duration = end - cue.start;
    const sentences = splitSentences(cue.text);

    if (sentences.length < 2) {
      units.push({ start: cue.start, end, text: cue.text, approx: false });
      return;
    }
    const approx = duration > APPROX_CUE_SEC;
    const total = sentences.reduce((sum, s) => sum + s.length, 0);
    let offset = 0;
    for (const sentence of sentences) {
      const start = cue.start + (duration * offset) / total;
      offset += sentence.length;
      units.push({ start, end: cue.start + (duration * offset) / total, text: sentence, approx });
    }
  });
  return units;
}

/**
 * Le transcript est-il ponctué ?
 *
 * Les sous-titres écrits par un humain le sont, les sous-titres automatiques
 * souvent pas du tout. En dessous d'une fin de phrase par minute, on considère
 * que la ponctuation est absente : couper sur les phrases donnerait alors des
 * blocs de 90 s, plafonnés par le seul filet de sécurité.
 */
export function isPunctuated(units) {
  if (!units.length) return true;
  const ends = units.reduce((n, u) => n + (u.text.match(/[.!?…](?=\s|["»)\]]|$)/g)?.length ?? 0), 0);
  const minutes = (units.at(-1).end - units[0].start) / 60;
  return ends >= Math.max(1, minutes);
}

/** Une coupure avant l'unité `i` tombe-t-elle entre deux phrases ? */
const cutsCleanly = (units, i, punctuated) =>
  i === 0 || i === units.length || !punctuated || endsSentence(units[i - 1].text);

/** Distance maximale entre le timecode d'un chapitre et la fin de phrase où on le place. */
const CHAPTER_SNAP_SEC = 20;

/**
 * Place chaque chapitre devant une unité : `Map<index d'unité, titres[]>`.
 * L'index `units.length` désigne « après la dernière unité ».
 *
 * Le timecode d'un chapitre tombe rarement pile entre deux phrases. On choisit
 * la fin de phrase la plus proche, à 20 s près. À défaut, on prend l'unité la
 * plus proche, quitte à couper une phrase : mieux vaut un titre au bon endroit
 * qu'un titre décalé de plusieurs minutes.
 */
export function placeChapters(units, chapters, punctuated) {
  const placed = new Map();
  if (!units.length) return placed;
  const startOf = (i) => (i < units.length ? units[i].start : units.at(-1).end);

  let from = 0; // les chapitres sont triés : on ne revient jamais en arrière
  for (const chapter of chapters) {
    let best = -1;
    let nearest = from;
    for (let i = from; i <= units.length; i++) {
      const distance = Math.abs(startOf(i) - chapter.start);
      if (distance < Math.abs(startOf(nearest) - chapter.start)) nearest = i;
      const clean = cutsCleanly(units, i, punctuated) && distance <= CHAPTER_SNAP_SEC;
      if (clean && (best === -1 || distance < Math.abs(startOf(best) - chapter.start))) best = i;
      if (startOf(i) > chapter.start + CHAPTER_SNAP_SEC) break;
    }
    const index = best === -1 ? nearest : best;
    if (!placed.has(index)) placed.set(index, []);
    placed.get(index).push(chapter.title);
    from = index;
  }
  return placed;
}

/** Débuts de bloc pour un transcript ponctué : la règle d'Otis. */
function sentenceStarts(units, blockSec, forced) {
  const starts = [0];
  for (let i = 1; i < units.length; i++) {
    if (forced.has(i)) {
      starts.push(i);
      continue;
    }
    const elapsed = units[i].end - units[starts.at(-1)].start;
    const canCut = endsSentence(units[i - 1].text) || elapsed > blockSec + SAFETY_MARGIN_SEC;
    if (elapsed > blockSec && canCut) starts.push(i);
  }
  return starts;
}

/**
 * Débuts de bloc pour un transcript sans ponctuation.
 *
 * Faute de points, on cherche la pause la plus probable entre 30 et 45 s. Une
 * ligne qui dure plus longtemps que son texte ne le justifie (au débit moyen de
 * la vidéo) cache probablement un silence. Une virgule en fin de ligne compte
 * comme un indice supplémentaire.
 */
function pauseStarts(units, blockSec, forced) {
  const duration = units.at(-1).end - units[0].start;
  const chars = units.reduce((n, u) => n + u.text.length, 0);
  const rate = duration > 0 ? chars / duration : CHARS_PER_SEC;
  const pauseBefore = (k) => {
    const previous = units[k - 1];
    return previous.end - previous.start - previous.text.length / rate + (/[,;:]$/.test(previous.text) ? 2 : 0);
  };

  const starts = [0];
  let i = 1;
  while (i < units.length) {
    const blockStart = units[starts.at(-1)].start;
    if (forced.has(i)) {
      starts.push(i++);
      continue;
    }
    if (units[i].end - blockStart <= blockSec) {
      i++;
      continue;
    }
    let best = i;
    for (let k = i; k < units.length && units[k].start - blockStart <= blockSec + PAUSE_WINDOW_SEC; k++) {
      if (forced.has(k)) {
        best = k;
        break;
      }
      if (pauseBefore(k) > pauseBefore(best)) best = k;
    }
    starts.push(best);
    i = best + 1;
  }
  return starts;
}

/**
 * Regroupe les unités en blocs `{ start, text, headings }`.
 *
 * `chapters` (issu de `placeChapters`) force une coupure devant chaque chapitre,
 * pour qu'aucun bloc ne déborde sur deux chapitres. `headings` porte les titres
 * à écrire juste avant le bloc. `trailing` porte ceux qui tombent après la fin
 * du transcript.
 */
export function buildBlocks(units, { blockSec = DEFAULT_BLOCK_SEC, punctuated = true, chapters = new Map() } = {}) {
  if (!units.length) return { blocks: [], trailing: chapters.get(0) ?? [] };
  const starts = (punctuated ? sentenceStarts : pauseStarts)(units, blockSec, chapters);

  const blocks = starts.map((from, b) => {
    const to = starts[b + 1] ?? units.length;
    return {
      start: units[from].start,
      text: units
        .slice(from, to)
        .map((u) => u.text)
        .join(" "),
      headings: chapters.get(from) ?? [],
    };
  });
  return { blocks, trailing: chapters.get(units.length) ?? [] };
}

/**
 * Découpage d'un transcript sans aucun timecode : des paragraphes d'environ
 * `targetChars` caractères, coupés en fin de phrase. Une « phrase » démesurée
 * (texte sans ponctuation) est découpée sur les mots.
 */
export function paragraphsWithoutTime(text, targetChars = 500) {
  const pieces = [];
  for (const sentence of splitSentences(text)) {
    if (sentence.length <= targetChars * 2) {
      pieces.push(sentence);
      continue;
    }
    let chunk = "";
    for (const word of sentence.split(" ")) {
      if (chunk.length >= targetChars) {
        pieces.push(chunk);
        chunk = "";
      }
      chunk += (chunk ? " " : "") + word;
    }
    if (chunk) pieces.push(chunk);
  }

  const paragraphs = [];
  let current = "";
  for (const piece of pieces) {
    current += (current ? " " : "") + piece;
    if (current.length >= targetChars) {
      paragraphs.push(current);
      current = "";
    }
  }
  if (current) paragraphs.push(current);
  return paragraphs;
}
