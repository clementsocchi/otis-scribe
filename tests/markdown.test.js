import { test } from "node:test";
import assert from "node:assert/strict";
import { formatMarkdown } from "../lib/markdown.js";
import { cleanCues, endsSentence } from "../lib/blocks.js";
import { toSeconds } from "../lib/timecode.js";
import { fragments, perMinute, perSentence, speech } from "./fixtures.js";

/** Les blocs `[HH:MM:SS] texte` du Markdown produit. */
function blocksOf(markdown) {
  return markdown
    .split("\n")
    .filter((line) => line.startsWith("["))
    .map((line) => ({ start: toSeconds(line.slice(1, 9)), text: line.slice(11) }));
}

const SPEECH = speech(60); // ~6 minutes

for (const [name, transcript] of [
  ["une phrase par ligne", perSentence(SPEECH)],
  ["une ligne toutes les 2,5 s", fragments(SPEECH)],
  ["un bloc par minute", perMinute(SPEECH)],
]) {
  test(`${name} : chaque bloc finit sur une phrase et dure ~30 s`, () => {
    const { markdown, warnings } = formatMarkdown({ transcript });
    const blocks = blocksOf(markdown);
    assert.deepEqual(warnings, []);
    assert.ok(blocks.length >= 8, `seulement ${blocks.length} blocs`);
    for (const block of blocks) assert.ok(endsSentence(block.text), `bloc coupé : « ${block.text} »`);
    for (let i = 1; i < blocks.length; i++) {
      const duration = blocks[i].start - blocks[i - 1].start;
      assert.ok(duration >= 15 && duration <= 45, `bloc de ${duration} s à ${blocks[i - 1].start} s`);
    }
  });
}

test("le texte est conservé intégralement, sans reformulation", () => {
  const { markdown } = formatMarkdown({ transcript: fragments(SPEECH) });
  const text = blocksOf(markdown)
    .map((b) => b.text)
    .join(" ");
  assert.equal(text, SPEECH.map((s) => s.text).join(" "));
});

test("sans ponctuation : blocs coupés sur les pauses, avec un avertissement", () => {
  const transcript = fragments(speech(60, { punctuated: false }));
  const { markdown, warnings } = formatMarkdown({ transcript });
  const blocks = blocksOf(markdown);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].key, "warning.noPunctuation");
  for (let i = 1; i < blocks.length; i++) {
    const duration = blocks[i].start - blocks[i - 1].start;
    assert.ok(duration >= 25 && duration <= 50, `bloc de ${duration} s`);
  }
});

test("chapitres : titres H3 par défaut, placés en fin de phrase, sans bloc à cheval", () => {
  const chapters = "0:00 Introduction\n2:00 Le jeûne\n4:10 Conclusion";
  const { markdown } = formatMarkdown({ transcript: perSentence(SPEECH), chapters, chapterTimecodes: false });
  const lines = markdown.split("\n");
  assert.equal(lines[0], "### Introduction");
  assert.equal(lines.filter((l) => l.startsWith("### ")).length, 3);

  // Le bloc qui suit chaque titre commence à moins de 20 s du timecode du chapitre.
  for (const [title, at] of [["Le jeûne", 120], ["Conclusion", 250]]) {
    const index = lines.indexOf(`### ${title}`);
    const next = blocksOf(lines.slice(index).join("\n"))[0];
    assert.ok(Math.abs(next.start - at) <= 20, `${title} placé à ${next.start} s`);
    // Le bloc juste avant le titre se termine sur une phrase.
    const before = blocksOf(lines.slice(0, index).join("\n")).at(-1);
    assert.ok(endsSentence(before.text));
  }
});

test("niveau de titre au choix", () => {
  const { markdown } = formatMarkdown({ transcript: perSentence(SPEECH), chapters: "0:00 Intro", headingLevel: 1 });
  assert.ok(markdown.startsWith("# 00:00:00 - Intro\n\n[00:00:00] "));
});

test("premier chapitre après 0:00 : les blocs du début restent sans titre", () => {
  const { markdown } = formatMarkdown({ transcript: perSentence(SPEECH), chapters: "1:00 Le vif du sujet" });
  assert.ok(markdown.startsWith("[00:00:00] "));
  assert.match(markdown, /^### \d{2}:\d{2}:\d{2} - Le vif du sujet$/m);
});

test("timecode des titres : celui du premier bloc du chapitre, au format 00:00:00", () => {
  const { markdown } = formatMarkdown({ transcript: perSentence(SPEECH), chapters: "0:00 Intro\n2:00 Le jeûne" });
  const lines = markdown.split("\n");
  for (const [i, line] of lines.entries()) {
    if (!line.startsWith("### ")) continue;
    const [, timecode] = line.match(/^### (\d{2}:\d{2}:\d{2}) - /);
    // Le premier bloc sous le titre porte le même timecode.
    assert.ok(lines[i + 2].startsWith(`[${timecode}] `), `${line} / ${lines[i + 2].slice(0, 12)}`);
  }
});

test("timecode des titres désactivable", () => {
  const { markdown } = formatMarkdown({ transcript: perSentence(SPEECH), chapters: "2:00 Le jeûne", chapterTimecodes: false });
  assert.match(markdown, /^### Le jeûne$/m);
});

test("sans chapitres : un transcript propre en blocs, sans titre ni avertissement", () => {
  const { markdown, warnings } = formatMarkdown({ transcript: perSentence(SPEECH), chapters: "" });
  assert.ok(!markdown.includes("#"));
  assert.deepEqual(warnings, []);
});

test("sans timecodes : paragraphes, chapitres ignorés avec avertissement", () => {
  const transcript = SPEECH.map((s) => s.text).join("\n");
  const { markdown, warnings } = formatMarkdown({ transcript, chapters: "0:00 Intro" });
  assert.ok(!markdown.includes("["));
  assert.ok(!markdown.includes("#"));
  assert.ok(markdown.split("\n\n").length > 3);
  assert.equal(warnings[0].key, "warning.chaptersIgnored");
});

test("nettoyage : annotations retirées, chevauchements supprimés, « nous nous » conservé", () => {
  const cues = cleanCues([
    { start: 0, text: "[Musique]" },
    { start: 2, text: "on va parler   du" },
    { start: 4, text: "parler du jeûne >> et nous" },
    { start: 6, text: "nous sommes ♪ partis." },
  ]);
  assert.deepEqual(cues, [
    { start: 2, text: "on va parler du" },
    { start: 4, text: "jeûne et nous" },
    { start: 6, text: "nous sommes partis." },
  ]);
});

test("podcast de 3 h : traité en moins d'une seconde", () => {
  const long = speech(2000); // ~3 h à une phrase toutes les 5 s
  const transcript = fragments(long);
  const started = performance.now();
  const { markdown, endSec } = formatMarkdown({ transcript, chapters: "0:00 Début\n1:30:00 Milieu" });
  const elapsed = performance.now() - started;
  assert.ok(elapsed < 1000, `${Math.round(elapsed)} ms`);
  assert.ok(endSec > 2.5 * 3600);
  assert.ok(blocksOf(markdown).length > 300);
});
