import { parseChapters, parseTranscript } from "./parse.js";
import {
  DEFAULT_BLOCK_SEC,
  buildBlocks,
  cleanCues,
  cleanText,
  isPunctuated,
  paragraphsWithoutTime,
  placeChapters,
  toUnits,
} from "./blocks.js";
import { toHMS } from "./timecode.js";

export const DEFAULT_HEADING_LEVEL = 3;

/**
 * Assemble le Markdown final à partir des deux zones de texte.
 *
 * Renvoie aussi `notes` (ce qui a été détecté, pour information), `warnings`
 * (ce qui mérite l'attention de Clément) et `endSec`, la fin estimée du
 * transcript : le panneau la compare à la durée de la vidéo pour repérer un
 * transcript incomplet.
 *
 * Avec `chapterTimecodes`, chaque titre est précédé du timecode de son premier
 * bloc (`### 00:15:18 - Titre`) plutôt que de celui annoncé dans la
 * description : le titre étant calé sur la fin de phrase la plus proche, les
 * deux diffèrent parfois d'1 ou 2 s, et c'est le bloc qui fait foi à la lecture.
 */
export function formatMarkdown({
  transcript = "",
  chapters = "",
  headingLevel = DEFAULT_HEADING_LEVEL,
  blockSec = DEFAULT_BLOCK_SEC,
  chapterTimecodes = true,
}) {
  const notes = [];
  const warnings = [];
  const heading = "#".repeat(Math.min(6, Math.max(1, headingLevel))) + " ";
  const chapterList = parseChapters(chapters);
  const { cues, hasTimecodes } = parseTranscript(transcript);

  if (!cues.length) return { markdown: "", notes, warnings, endSec: null };

  if (!hasTimecodes) {
    const paragraphs = paragraphsWithoutTime(cleanText(cues.map((c) => c.text).join(" ")));
    notes.push(`Aucun timecode : ${paragraphs.length} paragraphes d'environ 500 caractères.`);
    if (chapterList.length) {
      warnings.push("Sans timecodes dans le transcript, impossible de placer les chapitres : ils sont ignorés.");
    }
    return { markdown: paragraphs.join("\n\n") + "\n", notes, warnings, endSec: null };
  }

  const cleaned = cleanCues(cues);
  const units = toUnits(cleaned);
  if (!units.length) return { markdown: "", notes, warnings, endSec: null };

  const punctuated = isPunctuated(units);
  const placed = placeChapters(units, chapterList, punctuated);
  const { blocks, trailing } = buildBlocks(units, { blockSec, punctuated, chapters: placed });

  const endSec = units.at(-1).end;
  const headingLine = (title, at) => heading + (chapterTimecodes ? `${toHMS(at)} - ` : "") + title;

  const lines = [];
  for (const block of blocks) {
    for (const title of block.headings) lines.push(headingLine(title, block.start), "");
    lines.push(`[${toHMS(block.start)}] ${block.text}`, "");
  }
  // Un chapitre après la fin du transcript n'a pas de bloc : on le date à la fin.
  for (const title of trailing) lines.push(headingLine(title, endSec), "");

  const spacing = cleaned.length > 1 ? Math.round((cleaned.at(-1).start - cleaned[0].start) / (cleaned.length - 1)) : 0;
  notes.push(
    `${cleaned.length} lignes, un timecode toutes les ~${spacing} s`,
    chapterList.length ? `${chapterList.length} chapitres` : "pas de chapitres",
    `${blocks.length} blocs`
  );
  if (units.some((u) => u.approx)) {
    notes.push("timecodes espacés : début de certaines phrases estimé");
  }
  if (!punctuated) {
    warnings.push("Transcript sans ponctuation : les blocs sont coupés sur les pauses probables, pas sur les phrases.");
  }
  if (trailing.length) {
    warnings.push(`${trailing.length} chapitre(s) après la fin du transcript : vérifie qu'il est complet.`);
  }

  return { markdown: lines.join("\n").trimEnd() + "\n", notes, warnings, endSec };
}
