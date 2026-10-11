import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { LANGUAGES, MESSAGES, pickLanguage, translate } from "../lib/i18n.js";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const params = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
/** Clé sans sa forme de pluriel : `status.chapters.one` → `status.chapters`. */
const baseKey = (key) => key.replace(/\.(one|other)$/, "");

test("langue : le choix enregistré passe avant celle de Chrome", () => {
  assert.equal(pickLanguage("es", ["fr-FR"]), "es");
});

test("langue : celle de Chrome, variante régionale comprise, sinon l'anglais", () => {
  assert.equal(pickLanguage(null, ["fr-FR", "en"]), "fr");
  assert.equal(pickLanguage(null, ["es-419"]), "es");
  assert.equal(pickLanguage(null, ["de-DE", "es"]), "es");
  assert.equal(pickLanguage(null, ["de-DE"]), "en");
  assert.equal(pickLanguage("xx", []), "en");
});

test("les trois langues ont exactement les mêmes textes, avec les mêmes paramètres", () => {
  const reference = MESSAGES.fr;
  for (const { code } of LANGUAGES) {
    const messages = MESSAGES[code];
    assert.deepEqual(Object.keys(messages).sort(), Object.keys(reference).sort(), `clés différentes en ${code}`);
    for (const key of Object.keys(reference)) {
      assert.deepEqual(params(messages[key]), params(reference[key]), `paramètres de ${key} en ${code}`);
    }
  }
});

test("chaque texte utilisé par le code existe dans le dictionnaire", () => {
  const known = new Set(Object.keys(MESSAGES.fr).map(baseKey));
  const used = new Set();
  const html = read("sidepanel.html");
  for (const m of html.matchAll(/data-i18n(?:-placeholder|-title)?="([\w.]+)"/g)) used.add(m[1]);
  for (const file of ["sidepanel.js", "print.js"]) {
    for (const m of read(file).matchAll(/\bt\("([\w.]+)"/g)) used.add(m[1]);
  }
  for (const m of read("lib/markdown.js").matchAll(/key: "([\w.]+)"/g)) used.add(m[1]);
  for (const m of read("content.js").matchAll(/fail\("(\w+)"\)/g)) used.add(`error.${m[1]}`);
  for (const m of read("content.js").matchAll(/"(adPlaying|noCaptionsLoaded)"/g)) used.add(`error.${m[1]}`);

  assert.ok(used.size > 30, `seulement ${used.size} clés trouvées : la recherche est cassée`);
  for (const key of used) assert.ok(known.has(key), `texte manquant : ${key}`);
});

test("traduction : paramètres remplacés, nombres à la façon de la langue", () => {
  assert.equal(translate("en", "status.lines", { count: 2552 }), "2,552 lines");
  assert.equal(translate("fr", "status.lines", { count: 2552 }), "2 552 lignes");
  assert.equal(translate("es", "menu.language", { value: "Español" }), "Idioma: Español");
});

test("traduction : singulier ou pluriel selon la langue", () => {
  assert.equal(translate("fr", "status.chapters", { count: 1 }), "1 chapitre");
  assert.equal(translate("fr", "status.chapters", { count: 12 }), "12 chapitres");
  assert.equal(translate("en", "status.chapters", { count: 1 }), "1 chapter");
  assert.equal(translate("es", "notes.blocks", { count: 328 }), "328 bloques");
});

test("traduction : un texte manquant ne s'affiche jamais « undefined »", () => {
  assert.equal(translate("de", "result.copy"), "Copy");
  assert.equal(translate("fr", "cle.inconnue"), "cle.inconnue");
});
