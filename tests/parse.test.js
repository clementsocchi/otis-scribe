import { test } from "node:test";
import assert from "node:assert/strict";
import { captionsToText, parseChapters, parseTranscript } from "../lib/parse.js";
import { toClock, toHMS, toSeconds } from "../lib/timecode.js";

test("timecodes : lecture et écriture", () => {
  assert.equal(toSeconds("1:23"), 83);
  assert.equal(toSeconds("01:02:03"), 3723);
  assert.equal(toSeconds("00:00:04,500"), 4);
  assert.equal(toHMS(3723.9), "01:02:03");
  assert.equal(toClock(83), "1:23");
  assert.equal(toClock(3723), "1:02:03");
});

test("transcript copié depuis le panneau YouTube, libellés d'accessibilité compris", () => {
  const { cues } = parseTranscript("0:00\n2 secondes\nBonjour à tous.\n0:04\n4 secondes\nOn commence.");
  assert.deepEqual(cues, [
    { start: 0, text: "Bonjour à tous." },
    { start: 4, text: "On commence." },
  ]);
});

test("timecodes en début de ligne, entre crochets ou non", () => {
  const { cues } = parseTranscript("[00:00:00] Un.\n00:00:31 Deux.\n1:05 - Trois.");
  assert.deepEqual(
    cues.map((c) => c.start),
    [0, 31, 65]
  );
  assert.equal(cues[2].text, "Trois.");
});

test("fichier SRT", () => {
  const { cues } = parseTranscript("1\n00:00:01,000 --> 00:00:03,000\nPremière ligne\n\n2\n00:00:03,500 --> 00:00:05,000\nSeconde ligne");
  assert.deepEqual(cues, [
    { start: 1, text: "Première ligne" },
    { start: 3, text: "Seconde ligne" },
  ]);
});

test("sous-titres du lecteur : sauts de ligne internes aplatis, lignes vides retirées", () => {
  const text = captionsToText([
    { start: 0.08, text: "- The following is a conversation\nwith a guest" },
    { start: 3.78, text: "\n" },
    { start: 3725.5, text: "who has spent decades." },
  ]);
  assert.equal(text, "0:00\n- The following is a conversation with a guest\n1:02:05\nwho has spent decades.");
  assert.deepEqual(
    parseTranscript(text).cues.map((c) => c.start),
    [0, 3725]
  );
});

test("texte sans timecode : un seul cue non daté", () => {
  const { cues, hasTimecodes } = parseTranscript("Une phrase.\nUne autre phrase.");
  assert.equal(hasTimecodes, false);
  assert.deepEqual(cues, [{ start: null, text: "Une phrase. Une autre phrase." }]);
});

test("chapitres : timecode en tête, en fin, avec puces et émojis", () => {
  const description = [
    "Dans cet épisode on parle du jeûne.",
    "",
    "▶️ 0:00 Introduction",
    "- (2:15) Le jeûne intermittent",
    "Les effets sur l'insuline - 12:40",
    "• 1:02:03 – Conclusion",
    "Rendez-vous à 12:30 sur Instagram pour en parler",
    "https://instagram.com/exemple",
  ].join("\n");
  assert.deepEqual(parseChapters(description), [
    { start: 0, title: "Introduction" },
    { start: 135, title: "Le jeûne intermittent" },
    { start: 760, title: "Les effets sur l'insuline" },
    { start: 3723, title: "Conclusion" },
  ]);
});

test("chapitres : une ligne piégée ne fige pas le panneau", () => {
  // Une description fait 5 000 caractères au maximum. Sans la limite de
  // longueur, cette ligne prenait 25 s.
  const startedAt = performance.now();
  const chapters = parseChapters(`a${" ".repeat(4990)}b\n0:00 Intro`);
  assert.deepEqual(chapters, [{ start: 0, title: "Intro" }]);
  assert.ok(performance.now() - startedAt < 500);
});
