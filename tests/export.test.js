import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_FILE_NAME, fileName, toPlainText, toPrintSections } from "../lib/export.js";

test("nom de fichier : le titre de la vidéo, sans les caractères interdits", () => {
  assert.equal(fileName("Le jeûne : mythe ou réalité ?", "md"), "Le jeûne mythe ou réalité.md");
  assert.equal(fileName('A/B \\ "test" <1> | *2*', "txt"), "A B test 1 2.txt");
  assert.equal(fileName("Ligne 1\nLigne 2"), "Ligne 1 Ligne 2");
});

test("nom de fichier : pas de point en bord de nom, pas de nom vide", () => {
  assert.equal(fileName("...Suite...", "md"), "Suite.md");
  assert.equal(fileName("", "md"), `${DEFAULT_FILE_NAME}.md`);
  assert.equal(fileName(undefined, "txt"), `${DEFAULT_FILE_NAME}.txt`);
  assert.equal(fileName(" ?? ", "md"), `${DEFAULT_FILE_NAME}.md`);
});

test("nom de fichier : limité à 100 caractères avant l'extension", () => {
  const name = fileName("a".repeat(300), "md");
  assert.equal(name, "a".repeat(100) + ".md");
});

const MARKDOWN = "### 00:00:00 - Introduction\n\n[00:00:00] Bonjour à tous.\n\n[00:00:31] On parle du jeûne.\n";

test("TXT : les titres perdent leurs #, le reste est inchangé", () => {
  assert.equal(
    toPlainText(MARKDOWN),
    "00:00:00 - Introduction\n\n[00:00:00] Bonjour à tous.\n\n[00:00:31] On parle du jeûne.\n"
  );
  assert.equal(toPlainText("# Titre\n##### Sous-titre"), "Titre\nSous-titre");
});

test("PDF : titres et paragraphes, lignes vides ignorées", () => {
  assert.deepEqual(toPrintSections(MARKDOWN), [
    { level: 3, text: "00:00:00 - Introduction" },
    { level: 0, text: "[00:00:00] Bonjour à tous." },
    { level: 0, text: "[00:00:31] On parle du jeûne." },
  ]);
});

test("PDF : un # sans espace n'est pas un titre", () => {
  assert.deepEqual(toPrintSections("#hashtag"), [{ level: 0, text: "#hashtag" }]);
});
