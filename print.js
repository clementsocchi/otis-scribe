import { fileName, toPrintSections } from "./lib/export.js";
import { pickLanguage, translate } from "./lib/i18n.js";

/**
 * Page ouverte par le bouton PDF du panneau. Le panneau y dépose la fiche dans
 * `chrome.storage.session` (effacé à la fermeture de Chrome) : une adresse
 * d'onglet ne pourrait pas transporter un transcript de 3 h.
 */
const { "otis:print": sheet } = await chrome.storage.session.get("otis:print");
const main = document.getElementById("sheet");

// Même langue que le panneau : il l'enregistre dans `localStorage`, partagé
// par toutes les pages de l'extension.
let saved = null;
try {
  saved = localStorage.getItem("otis:lang");
} catch {
  // Stockage indisponible : on suit Chrome.
}
const lang = pickLanguage(saved, navigator.languages);
const t = (key, params) => translate(lang, key, params);
document.documentElement.lang = lang;

// « choisis {target} comme destination », avec {target} en gras.
const [before, after] = t("print.hint").split("{target}");
document
  .getElementById("hint")
  .replaceChildren(before, Object.assign(document.createElement("strong"), { textContent: t("print.target") }), after ?? "");

if (!sheet?.markdown) {
  main.textContent = t("print.empty");
} else {
  // Chrome propose comme nom de PDF le titre de la page.
  document.title = fileName(sheet.title);

  if (sheet.title) {
    main.append(Object.assign(document.createElement("h1"), { className: "video-title", textContent: sheet.title }));
  }
  for (const { level, text } of toPrintSections(sheet.markdown)) {
    // textContent, jamais innerHTML : le transcript n'est que du texte.
    main.append(Object.assign(document.createElement(level ? `h${level}` : "p"), { textContent: text }));
  }

  // L'onglet ne sert qu'à l'impression : on le ferme quand elle est finie ou
  // annulée. window.close() ne suffit pas pour un onglet ouvert par l'extension.
  window.addEventListener("afterprint", async () => {
    const tab = await chrome.tabs.getCurrent();
    if (tab) chrome.tabs.remove(tab.id);
  });
  window.print();
}
