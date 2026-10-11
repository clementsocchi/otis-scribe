import { DEFAULT_HEADING_LEVEL, formatMarkdown } from "./lib/markdown.js";
import { DEFAULT_BLOCK_SEC } from "./lib/blocks.js";
import { captionsToText, parseChapters } from "./lib/parse.js";
import { fileName, toPlainText } from "./lib/export.js";
import { toClock } from "./lib/timecode.js";

const $ = (id) => document.getElementById(id);
const ui = {
  fetch: $("fetch"),
  status: $("status"),
  statusTitle: $("status-title"),
  statusMeta: $("status-meta"),
  heading: $("heading"),
  chapterTimecodes: $("chapter-timecodes"),
  block: $("block"),
  chapters: $("chapters"),
  transcript: $("transcript"),
  warnings: $("warnings"),
  notes: $("notes"),
  output: $("output"),
  copy: $("copy"),
  clear: $("clear"),
  saveMd: $("save-md"),
  saveTxt: $("save-txt"),
  savePdf: $("save-pdf"),
  shortcut: $("shortcut"),
  shortcutKeys: $("shortcut-keys"),
  editShortcut: $("edit-shortcut"),
  theme: $("theme"),
};

/** Durée de la vidéo récupérée, pour repérer un transcript incomplet. */
let videoDurationSec = null;
/** Titre de la vidéo récupérée, pour nommer les fichiers exportés. */
let videoTitle = "";

/**
 * Le panneau peut s'ouvrir hors de Chrome (aperçu dans un navigateur, tests) :
 * on n'appelle les API de l'extension que si elles existent.
 */
const extension = globalThis.chrome?.runtime?.id ? chrome : null;

/**
 * Statut sur deux lignes, comme sous une vidéo YouTube : un titre facultatif
 * (celui de la vidéo), puis le message en gris, ou en rouge pour une erreur.
 */
function setStatus(text, kind = "", title = "") {
  ui.statusTitle.textContent = title;
  ui.statusMeta.textContent = text;
  ui.status.className = `status ${kind}`;
}

/** Niveau de titre choisi parmi les puces H1…H5. */
function headingLevel() {
  return Number(ui.heading.querySelector("input:checked")?.value ?? DEFAULT_HEADING_LEVEL);
}

function setHeadingLevel(level) {
  const chip = ui.heading.querySelector(`input[value="${level}"]`);
  if (chip) chip.checked = true;
}

function render() {
  const { markdown, notes, warnings, endSec } = formatMarkdown({
    transcript: ui.transcript.value,
    chapters: ui.chapters.value,
    headingLevel: headingLevel(),
    chapterTimecodes: ui.chapterTimecodes.checked,
    blockSec: Number(ui.block.value) || DEFAULT_BLOCK_SEC,
  });

  // Un transcript qui s'arrête plus d'une minute avant la fin de la vidéo n'a
  // probablement pas fini de charger.
  if (videoDurationSec && endSec !== null && videoDurationSec - endSec > 60) {
    warnings.push(
      `Le transcript s'arrête à ${toClock(endSec)} alors que la vidéo dure ${toClock(videoDurationSec)} : il est peut-être incomplet. Relance la récupération.`
    );
  }

  ui.output.value = markdown;
  for (const button of [ui.copy, ui.saveMd, ui.saveTxt, ui.savePdf]) button.disabled = !markdown;
  ui.notes.textContent = notes.join(" · ");
  ui.warnings.replaceChildren(
    ...warnings.map((text) => Object.assign(document.createElement("li"), { textContent: text }))
  );
}

// Sur un transcript de 3 h, on évite de tout recalculer à chaque touche.
let renderTimer;
function scheduleRender() {
  clearTimeout(renderTimer);
  renderTimer = setTimeout(render, 150);
}

async function saveSettings() {
  await extension?.storage.local.set({
    headingLevel: String(headingLevel()),
    blockSec: ui.block.value,
    chapterTimecodes: ui.chapterTimecodes.checked,
  });
}

async function loadSettings() {
  const saved = (await extension?.storage.local.get(["headingLevel", "blockSec", "chapterTimecodes"])) ?? {};
  setHeadingLevel(saved.headingLevel ?? DEFAULT_HEADING_LEVEL);
  ui.chapterTimecodes.checked = saved.chapterTimecodes ?? true;
  ui.block.value = saved.blockSec ?? String(DEFAULT_BLOCK_SEC);
}

/** Envoie la demande à l'onglet, en y injectant le script s'il n'y est pas encore. */
async function askTab(tabId) {
  try {
    return await extension.tabs.sendMessage(tabId, { type: "otis:extract" });
  } catch {
    // L'onglet était ouvert avant l'installation de l'extension : le script de
    // lecture n'y a jamais été chargé. On l'injecte, puis on redemande.
    await extension.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return await extension.tabs.sendMessage(tabId, { type: "otis:extract" });
  }
}

async function fetchFromVideo() {
  if (!extension) return setStatus("Disponible uniquement dans l'extension Chrome.", "error");
  const [tab] = await extension.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://www.youtube.com/watch")) {
    return setStatus("Ouvre une vidéo YouTube dans l'onglet actif, puis réessaie.", "error");
  }

  ui.fetch.disabled = true;
  document.body.classList.add("loading");
  setStatus("Lecture de la vidéo…");
  try {
    const result = await askTab(tab.id);
    if (result?.error) throw new Error(result.error);

    videoDurationSec = result.durationSec ?? null;
    videoTitle = result.title ?? "";
    const chapters = parseChapters(result.description ?? "");
    ui.chapters.value = chapters.map((ch) => `${toClock(ch.start)} ${ch.title}`).join("\n");
    ui.transcript.value = result.captions ? captionsToText(result.captions) : (result.transcript ?? "");
    render();

    const found = [
      chapters.length ? `${chapters.length} chapitre${chapters.length > 1 ? "s" : ""}` : "pas de chapitres",
      result.segmentCount ? `${result.segmentCount.toLocaleString("fr-FR")} lignes` : null,
      result.track ? `sous-titres ${result.track}` : null,
    ].filter(Boolean);
    if (result.transcriptError) {
      setStatus(`${found[0]} · ${result.transcriptError}`, "error", result.title);
    } else {
      setStatus(found.join(" · "), "", result.title);
    }
  } catch (error) {
    setStatus(`Récupération impossible : ${error.message} Tu peux coller le transcript à la main.`, "error");
  } finally {
    ui.fetch.disabled = false;
    document.body.classList.remove("loading");
  }
}

extension?.runtime.onMessage.addListener((message) => {
  if (message?.type === "otis:progress" && message.count > 0) {
    setStatus(`Lecture du transcript… (${message.count.toLocaleString("fr-FR")} lignes)`);
  }
});

ui.fetch.addEventListener("click", fetchFromVideo);
ui.chapters.addEventListener("input", scheduleRender);
ui.transcript.addEventListener("input", () => {
  // Un transcript collé à la main ne correspond plus forcément à la vidéo récupérée.
  videoDurationSec = null;
  scheduleRender();
});
for (const setting of [ui.heading, ui.chapterTimecodes, ui.block]) {
  setting.addEventListener("change", () => {
    saveSettings();
    render();
  });
}

ui.copy.addEventListener("click", async () => {
  await navigator.clipboard.writeText(ui.output.value);
  // On ne change que le texte : l'icône du bouton reste en place.
  const label = ui.copy.querySelector(".label");
  label.textContent = "Copié ✓";
  setTimeout(() => (label.textContent = "Copier"), 1500);
});

ui.clear.addEventListener("click", () => {
  ui.chapters.value = "";
  ui.transcript.value = "";
  videoDurationSec = null;
  videoTitle = "";
  setStatus("");
  render();
});

/**
 * Téléchargement direct, sans permission supplémentaire : un lien `download`
 * pointant vers le texte en mémoire, cliqué aussitôt. Le fichier arrive dans
 * le dossier de téléchargements de Chrome.
 */
function download(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type: `${type};charset=utf-8` }));
  Object.assign(document.createElement("a"), { href: url, download: name }).click();
  // Chrome a besoin de l'adresse le temps de lancer le téléchargement.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}

ui.saveMd.addEventListener("click", () => {
  download(ui.output.value, fileName(videoTitle, "md"), "text/markdown");
});

ui.saveTxt.addEventListener("click", () => {
  download(toPlainText(ui.output.value), fileName(videoTitle, "txt"), "text/plain");
});

// Le PDF passe par l'impression de Chrome, depuis une page dédiée (print.html)
// mise en page pour le papier.
ui.savePdf.addEventListener("click", async () => {
  if (!extension) return setStatus("Disponible uniquement dans l'extension Chrome.", "error");
  await extension.storage.session.set({ "otis:print": { title: videoTitle, markdown: ui.output.value } });
  await extension.tabs.create({ url: "print.html" });
});

/** Affiche le raccourci réellement attribué : chacun peut le changer. */
async function showShortcut() {
  const open = (await extension.commands.getAll()).find((c) => c.name === "_execute_action");
  ui.shortcutKeys.textContent = open?.shortcut
    ? `Raccourci : ${open.shortcut} ouvre le panneau`
    : "Aucun raccourci pour ouvrir le panneau.";
  ui.shortcut.hidden = false;
}

ui.editShortcut.addEventListener("click", () => {
  // Une page chrome:// ne s'ouvre pas avec un lien ordinaire, seulement via l'API.
  extension.tabs.create({ url: "chrome://extensions/shortcuts" });
});

// Thème : `theme.js` a déjà appliqué un éventuel thème forcé. Le bouton bascule
// à partir du thème affiché, qui est celui du Mac tant que rien n'est forcé.
const systemDark = matchMedia("(prefers-color-scheme: dark)");

function shownTheme() {
  return document.documentElement.dataset.theme ?? (systemDark.matches ? "dark" : "light");
}

/** Comme le menu « Apparence » de YouTube : même lune, le texte dit le thème affiché. */
function updateThemeButton() {
  const dark = shownTheme() === "dark";
  ui.theme.querySelector(".label").textContent = dark ? "Sombre" : "Clair";
  ui.theme.title = dark ? "Passer en mode clair" : "Passer en mode sombre";
}

ui.theme.addEventListener("click", () => {
  const next = shownTheme() === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem("otis:theme", next);
  } catch {
    // Pas de stockage : le choix vaut jusqu'à la fermeture du panneau.
  }
  updateThemeButton();
});
systemDark.addEventListener("change", updateThemeButton);
updateThemeButton();

await loadSettings();
render();
if (extension) showShortcut();
