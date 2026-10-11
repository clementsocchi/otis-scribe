import { DEFAULT_HEADING_LEVEL, formatMarkdown } from "./lib/markdown.js";
import { DEFAULT_BLOCK_SEC } from "./lib/blocks.js";
import { captionsToText, parseChapters } from "./lib/parse.js";
import { fileName, toPlainText } from "./lib/export.js";
import { toClock } from "./lib/timecode.js";
import { LANGUAGES, pickLanguage, translate } from "./lib/i18n.js";

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
  menuButton: $("menu-button"),
  menu: $("menu"),
  appearanceLabel: $("appearance-label"),
  languageLabel: $("language-label"),
  appearanceOptions: $("appearance-options"),
  languageOptions: $("language-options"),
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
 * Langue du panneau. Mémorisée dans `localStorage`, comme le thème : la
 * réponse est immédiate, et la page d'impression (print.html) la lit aussi.
 */
const LANG_KEY = "otis:lang";
function savedLanguage() {
  try {
    return localStorage.getItem(LANG_KEY);
  } catch {
    return null; // stockage indisponible : on suit Chrome
  }
}
let lang = pickLanguage(savedLanguage(), navigator.languages);

/** Texte de l'interface dans la langue choisie (dictionnaire : lib/i18n.js). */
const t = (key, params) => translate(lang, key, params);

/**
 * Message d'erreur renvoyé par content.js : un code à traduire, ou un message
 * brut pour une erreur imprévue (ou d'une ancienne version du script, encore
 * chargée dans un onglet ouvert avant la mise à jour).
 */
function errorText(error) {
  if (typeof error === "string") return error;
  return error?.code ? t(`error.${error.code}`) : (error?.message ?? "");
}

/**
 * Statut sur deux lignes, comme sous une vidéo YouTube : un titre facultatif
 * (celui de la vidéo), puis le message en gris, ou en rouge pour une erreur.
 *
 * Le message est donné sous forme de fonction (`() => t(...)`) : si on change
 * de langue juste après une récupération, on le réécrit dans la nouvelle.
 */
let status = { message: () => "", kind: "", title: "" };
function setStatus(message, kind = "", title = "") {
  status = { message: typeof message === "function" ? message : () => message, kind, title };
  showStatus();
}
function showStatus() {
  ui.statusTitle.textContent = status.title;
  ui.statusMeta.textContent = status.message();
  ui.status.className = `status ${status.kind}`;
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
    warnings.push({ key: "warning.incomplete", params: { end: toClock(endSec), duration: toClock(videoDurationSec) } });
  }

  ui.output.value = markdown;
  for (const button of [ui.copy, ui.saveMd, ui.saveTxt, ui.savePdf]) button.disabled = !markdown;
  ui.notes.textContent = notes.map(({ key, params }) => t(key, params)).join(" · ");
  ui.warnings.replaceChildren(
    ...warnings.map(({ key, params }) => Object.assign(document.createElement("li"), { textContent: t(key, params) }))
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
  if (!extension) return setStatus(() => t("status.extensionOnly"), "error");
  const [tab] = await extension.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url?.startsWith("https://www.youtube.com/watch")) {
    return setStatus(() => t("status.openVideo"), "error");
  }

  ui.fetch.disabled = true;
  document.body.classList.add("loading");
  setStatus(() => t("status.reading"));
  try {
    const result = await askTab(tab.id);
    if (result?.error) throw Object.assign(new Error(), { detail: result.error });

    videoDurationSec = result.durationSec ?? null;
    videoTitle = result.title ?? "";
    const chapters = parseChapters(result.description ?? "");
    ui.chapters.value = chapters.map((ch) => `${toClock(ch.start)} ${ch.title}`).join("\n");
    ui.transcript.value = result.captions ? captionsToText(result.captions) : (result.transcript ?? "");
    render();

    const found = () =>
      [
        chapters.length ? t("status.chapters", { count: chapters.length }) : t("status.noChapters"),
        result.segmentCount ? t("status.lines", { count: result.segmentCount }) : null,
        result.track ? t("status.track", { track: result.track }) : null,
      ].filter(Boolean);
    // `transcriptError` : réponse d'une ancienne version de content.js.
    const errors = result.transcriptErrors ?? (result.transcriptError ? [result.transcriptError] : null);
    if (errors) {
      setStatus(() => [found()[0], ...errors.map(errorText)].join(" · "), "error", result.title);
    } else {
      setStatus(() => found().join(" · "), "", result.title);
    }
  } catch (error) {
    const reason = error.detail ? error.detail : error.message;
    setStatus(() => t("status.failed", { error: errorText(reason) }), "error");
  } finally {
    ui.fetch.disabled = false;
    document.body.classList.remove("loading");
  }
}

extension?.runtime.onMessage.addListener((message) => {
  if (message?.type === "otis:progress" && message.count > 0) {
    setStatus(() => t("status.progress", { count: message.count }));
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
  label.textContent = t("result.copied");
  setTimeout(() => (label.textContent = t("result.copy")), 1500);
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
  if (!extension) return setStatus(() => t("status.extensionOnly"), "error");
  await extension.storage.session.set({ "otis:print": { title: videoTitle, markdown: ui.output.value } });
  await extension.tabs.create({ url: "print.html" });
});

/** Raccourci réellement attribué (chacun peut le changer), lu à l'ouverture. */
let shortcutKeys = null;
async function loadShortcut() {
  const open = (await extension.commands.getAll()).find((c) => c.name === "_execute_action");
  shortcutKeys = open?.shortcut ?? "";
  showShortcut();
}
function showShortcut() {
  if (shortcutKeys === null) return;
  ui.shortcutKeys.textContent = shortcutKeys ? t("shortcut.current", { keys: shortcutKeys }) : t("shortcut.none");
  ui.shortcut.hidden = false;
}

ui.editShortcut.addEventListener("click", () => {
  // Une page chrome:// ne s'ouvre pas avec un lien ordinaire, seulement via l'API.
  extension.tabs.create({ url: "chrome://extensions/shortcuts" });
});


// Thème : `theme.js` a déjà appliqué un éventuel thème forcé avant l'affichage.
// Trois choix comme sur YouTube : celui de l'appareil (rien d'enregistré, le
// CSS suit le Mac), sombre ou clair.
const THEME_KEY = "otis:theme";
const THEMES = ["device", "dark", "light"];

function currentTheme() {
  const forced = document.documentElement.dataset.theme;
  return forced === "dark" || forced === "light" ? forced : "device";
}

function setTheme(theme) {
  try {
    if (theme === "device") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, theme);
  } catch {
    // Pas de stockage : le choix vaut jusqu'à la fermeture du panneau.
  }
  if (theme === "device") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
}

function setLanguage(code) {
  lang = code;
  try {
    localStorage.setItem(LANG_KEY, code);
  } catch {
    // Pas de stockage : le choix vaut jusqu'à la fermeture du panneau.
  }
  applyLanguage();
}

/** Écrit tous les textes du panneau dans la langue choisie, sans recharger. */
function applyLanguage() {
  document.documentElement.lang = lang;
  for (const element of document.querySelectorAll("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n);
  }
  for (const element of document.querySelectorAll("[data-i18n-placeholder]")) {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  }
  // Boutons sans texte (⚙, ←) : l'infobulle sert aussi de nom pour les
  // lecteurs d'écran.
  for (const element of document.querySelectorAll("[data-i18n-title]")) {
    element.title = t(element.dataset.i18nTitle);
    element.setAttribute("aria-label", element.title);
  }
  updateMenu();
  showStatus();
  showShortcut();
  render();
}

/**
 * Une ligne de sous-menu : coche ✓ à gauche du choix actuel, comme dans le
 * menu « Langue » de YouTube.
 */
function optionButton(label, checked, onChoose) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "menu-item option";
  button.setAttribute("role", "menuitemradio");
  button.setAttribute("aria-checked", String(checked));
  button.innerHTML = `<svg class="icon check"><use href="#i-check" /></svg><span class="menu-label"></span>`;
  button.querySelector(".menu-label").textContent = label;
  button.addEventListener("click", () => {
    onChoose();
    showMenuPage("main");
  });
  return button;
}

/** Remplit le menu : libellés « Apparence : Sombre », « Langue : Français » et les deux listes. */
function updateMenu() {
  const theme = currentTheme();
  const language = LANGUAGES.find((l) => l.code === lang);
  ui.appearanceLabel.textContent = t("menu.appearance", { value: t(`appearance.short.${theme}`) });
  ui.languageLabel.textContent = t("menu.language", { value: language.name });
  ui.appearanceOptions.replaceChildren(
    ...THEMES.map((choice) =>
      optionButton(t(`appearance.${choice}`), choice === theme, () => {
        setTheme(choice);
        updateMenu();
      })
    )
  );
  ui.languageOptions.replaceChildren(
    ...LANGUAGES.map(({ code, name }) => optionButton(name, code === lang, () => setLanguage(code)))
  );
}

function showMenuPage(name) {
  for (const page of ui.menu.querySelectorAll(".menu-page")) page.hidden = page.dataset.page !== name;
  // Le focus suit, pour qu'on puisse continuer au clavier.
  ui.menu.querySelector(`.menu-page[data-page="${name}"] button`)?.focus();
}

function openMenu() {
  ui.menu.hidden = false;
  ui.menuButton.setAttribute("aria-expanded", "true");
  showMenuPage("main");
}

function closeMenu() {
  if (ui.menu.hidden) return;
  ui.menu.hidden = true;
  ui.menuButton.setAttribute("aria-expanded", "false");
}

ui.menuButton.addEventListener("click", () => (ui.menu.hidden ? openMenu() : closeMenu()));
for (const button of ui.menu.querySelectorAll("[data-open]")) {
  button.addEventListener("click", () => showMenuPage(button.dataset.open));
}
for (const button of ui.menu.querySelectorAll("[data-back]")) {
  button.addEventListener("click", () => showMenuPage("main"));
}
// Un clic ailleurs ou Échap ferme le menu, comme sur YouTube. `composedPath`
// plutôt que `closest` : un choix reconstruit la liste, et le bouton cliqué
// n'est alors plus dans la page quand le clic arrive ici.
const menuAnchor = ui.menuButton.parentElement;
document.addEventListener("click", (event) => {
  if (!event.composedPath().includes(menuAnchor)) closeMenu();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !ui.menu.hidden) {
    closeMenu();
    ui.menuButton.focus();
  }
});
applyLanguage();
await loadSettings();
render();
if (extension) loadShortcut();
