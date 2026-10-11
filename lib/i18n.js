/**
 * Textes de l'interface en trois langues.
 *
 * Pourquoi un dictionnaire maison plutôt que `chrome.i18n`, le mécanisme
 * standard des extensions : `chrome.i18n` suit toujours la langue de Chrome,
 * impossible de la changer depuis le menu du panneau. `_locales/` ne sert qu'aux
 * textes que Chrome affiche lui-même (description, libellé du raccourci).
 *
 * Une clé par texte, des paramètres entre accolades (`{count}`). Pour un texte
 * qui dépend d'un nombre, deux clés : `.one` (singulier) et `.other` (pluriel).
 * Tout nouveau texte s'ajoute dans les trois langues : un test le vérifie.
 */

/** Les langues proposées, chacune écrite dans sa propre langue, comme sur YouTube. */
export const LANGUAGES = [
  { code: "en", name: "English" },
  { code: "fr", name: "Français" },
  { code: "es", name: "Español" },
];

export const DEFAULT_LANGUAGE = "en";

export const MESSAGES = {
  fr: {
    "menu.settings": "Paramètres",
    "menu.appearance": "Apparence : {value}",
    "menu.language": "Langue : {value}",
    "menu.back": "Retour",
    "appearance.title": "Apparence",
    "appearance.hint": "Le réglage ne s'applique qu'à ce panneau",
    "appearance.device": "Thème de l'appareil",
    "appearance.dark": "Thème sombre",
    "appearance.light": "Thème clair",
    "appearance.short.device": "Thème de l'appareil",
    "appearance.short.dark": "Sombre",
    "appearance.short.light": "Clair",
    "language.title": "Choisissez votre langue",
    "language.hint": "Boutons et textes de ce panneau",

    "fetch.button": "Récupérer depuis la vidéo",
    "settings.title": "Réglages",
    "settings.headings": "Titres des chapitres",
    "settings.timecodes": "Timecode dans les titres",
    "settings.blocks": "Blocs d'environ",
    "chapters.title": "Chapitres",
    "chapters.hint": "une ligne par chapitre, ou la description entière",
    "chapters.placeholder": "0:00 Introduction\n2:15 Le jeûne intermittent",
    "transcript.title": "Transcript",
    "transcript.hint": "tel que copié depuis YouTube, avec ou sans timecodes",
    "transcript.placeholder": "0:00\nBonjour à tous…",
    "result.clear": "Effacer",
    "result.copy": "Copier",
    "result.copied": "Copié ✓",
    "result.download": "Télécharger :",
    "shortcut.current": "Raccourci : {keys} ouvre le panneau",
    "shortcut.none": "Aucun raccourci pour ouvrir le panneau.",
    "shortcut.edit": "Modifier",

    "status.extensionOnly": "Disponible uniquement dans l'extension Chrome.",
    "status.openVideo": "Ouvre une vidéo YouTube dans l'onglet actif, puis réessaie.",
    "status.reading": "Lecture de la vidéo…",
    "status.progress": "Lecture du transcript… ({count} lignes)",
    "status.chapters.one": "{count} chapitre",
    "status.chapters.other": "{count} chapitres",
    "status.noChapters": "pas de chapitres",
    "status.lines": "{count} lignes",
    "status.track": "sous-titres {track}",
    "status.failed": "Récupération impossible : {error} Tu peux coller le transcript à la main.",

    "error.noVideo": "Ouvre d'abord une vidéo YouTube.",
    "error.noPlayer": "Lecteur introuvable.",
    "error.adPlaying": "Une publicité est en cours : réessaie une fois qu'elle est terminée.",
    "error.noCaptionsLoaded": "Le lecteur n'a chargé aucun sous-titre.",
    "error.emptyCaptions": "Sous-titres vides.",
    "error.noTranscriptButton":
      "Pas de bouton « Afficher la transcription » : la vidéo n'a peut-être pas de transcript.",
    "error.emptyPanel": "Le panneau de transcription est resté vide.",

    "notes.noTimecodes": "Aucun timecode : {count} paragraphes d'environ 500 caractères.",
    "notes.lines": "{count} lignes, un timecode toutes les ~{spacing} s",
    "notes.blocks.one": "{count} bloc",
    "notes.blocks.other": "{count} blocs",
    "notes.approx": "timecodes espacés : début de certaines phrases estimé",
    "warning.chaptersIgnored":
      "Sans timecodes dans le transcript, impossible de placer les chapitres : ils sont ignorés.",
    "warning.noPunctuation":
      "Transcript sans ponctuation : les blocs sont coupés sur les pauses probables, pas sur les phrases.",
    "warning.trailingChapters.one": "{count} chapitre après la fin du transcript : vérifie qu'il est complet.",
    "warning.trailingChapters.other": "{count} chapitres après la fin du transcript : vérifie qu'il est complet.",
    "warning.incomplete":
      "Le transcript s'arrête à {end} alors que la vidéo dure {duration} : il est peut-être incomplet. Relance la récupération.",

    "print.hint": "Dans la fenêtre d'impression, choisis {target} comme destination. Cet onglet se ferme ensuite tout seul.",
    "print.target": "Enregistrer au format PDF",
    "print.empty": "Rien à imprimer : relance l'export depuis le panneau.",
  },

  en: {
    "menu.settings": "Settings",
    "menu.appearance": "Appearance: {value}",
    "menu.language": "Display language: {value}",
    "menu.back": "Back",
    "appearance.title": "Appearance",
    "appearance.hint": "Setting applies to this panel only",
    "appearance.device": "Use device theme",
    "appearance.dark": "Dark theme",
    "appearance.light": "Light theme",
    "appearance.short.device": "Device theme",
    "appearance.short.dark": "Dark",
    "appearance.short.light": "Light",
    "language.title": "Display language",
    "language.hint": "Buttons and display text in this panel",

    "fetch.button": "Get from video",
    "settings.title": "Settings",
    "settings.headings": "Chapter headings",
    "settings.timecodes": "Timecode in headings",
    "settings.blocks": "Blocks of about",
    "chapters.title": "Chapters",
    "chapters.hint": "one line per chapter, or the whole description",
    "chapters.placeholder": "0:00 Introduction\n2:15 Intermittent fasting",
    "transcript.title": "Transcript",
    "transcript.hint": "as copied from YouTube, with or without timecodes",
    "transcript.placeholder": "0:00\nHi everyone…",
    "result.clear": "Clear",
    "result.copy": "Copy",
    "result.copied": "Copied ✓",
    "result.download": "Download:",
    "shortcut.current": "Shortcut: {keys} opens the panel",
    "shortcut.none": "No shortcut to open the panel.",
    "shortcut.edit": "Change",

    "status.extensionOnly": "Only available in the Chrome extension.",
    "status.openVideo": "Open a YouTube video in the active tab, then try again.",
    "status.reading": "Reading the video…",
    "status.progress": "Reading the transcript… ({count} lines)",
    "status.chapters.one": "{count} chapter",
    "status.chapters.other": "{count} chapters",
    "status.noChapters": "no chapters",
    "status.lines": "{count} lines",
    "status.track": "{track} captions",
    "status.failed": "Couldn't get the transcript: {error} You can paste it by hand.",

    "error.noVideo": "Open a YouTube video first.",
    "error.noPlayer": "Video player not found.",
    "error.adPlaying": "An ad is playing: try again once it's over.",
    "error.noCaptionsLoaded": "The player didn't load any captions.",
    "error.emptyCaptions": "Captions are empty.",
    "error.noTranscriptButton": "No “Show transcript” button: the video may not have a transcript.",
    "error.emptyPanel": "The transcript panel stayed empty.",

    "notes.noTimecodes": "No timecodes: {count} paragraphs of about 500 characters.",
    "notes.lines": "{count} lines, one timecode every ~{spacing} s",
    "notes.blocks.one": "{count} block",
    "notes.blocks.other": "{count} blocks",
    "notes.approx": "sparse timecodes: start of some sentences estimated",
    "warning.chaptersIgnored": "Without timecodes in the transcript, chapters can't be placed: they are ignored.",
    "warning.noPunctuation":
      "Transcript without punctuation: blocks are cut at likely pauses, not at sentence ends.",
    "warning.trailingChapters.one": "{count} chapter after the end of the transcript: check that it's complete.",
    "warning.trailingChapters.other": "{count} chapters after the end of the transcript: check that it's complete.",
    "warning.incomplete":
      "The transcript stops at {end} but the video lasts {duration}: it may be incomplete. Try fetching it again.",

    "print.hint": "In the print window, choose {target} as the destination. This tab then closes by itself.",
    "print.target": "Save as PDF",
    "print.empty": "Nothing to print: export again from the panel.",
  },

  es: {
    "menu.settings": "Configuración",
    "menu.appearance": "Aspecto: {value}",
    "menu.language": "Idioma: {value}",
    "menu.back": "Atrás",
    "appearance.title": "Aspecto",
    "appearance.hint": "La configuración solo se aplica a este panel",
    "appearance.device": "Usar el tema del dispositivo",
    "appearance.dark": "Tema oscuro",
    "appearance.light": "Tema claro",
    "appearance.short.device": "Tema del dispositivo",
    "appearance.short.dark": "Oscuro",
    "appearance.short.light": "Claro",
    "language.title": "Elige tu idioma",
    "language.hint": "Botones y textos de este panel",

    "fetch.button": "Obtener del vídeo",
    "settings.title": "Ajustes",
    "settings.headings": "Títulos de los capítulos",
    "settings.timecodes": "Marca de tiempo en los títulos",
    "settings.blocks": "Bloques de unos",
    "chapters.title": "Capítulos",
    "chapters.hint": "una línea por capítulo, o la descripción entera",
    "chapters.placeholder": "0:00 Introducción\n2:15 El ayuno intermitente",
    "transcript.title": "Transcripción",
    "transcript.hint": "tal como se copia de YouTube, con o sin marcas de tiempo",
    "transcript.placeholder": "0:00\nHola a todos…",
    "result.clear": "Borrar",
    "result.copy": "Copiar",
    "result.copied": "Copiado ✓",
    "result.download": "Descargar:",
    "shortcut.current": "Atajo: {keys} abre el panel",
    "shortcut.none": "Ningún atajo para abrir el panel.",
    "shortcut.edit": "Cambiar",

    "status.extensionOnly": "Solo disponible en la extensión de Chrome.",
    "status.openVideo": "Abre un vídeo de YouTube en la pestaña activa y vuelve a intentarlo.",
    "status.reading": "Leyendo el vídeo…",
    "status.progress": "Leyendo la transcripción… ({count} líneas)",
    "status.chapters.one": "{count} capítulo",
    "status.chapters.other": "{count} capítulos",
    "status.noChapters": "sin capítulos",
    "status.lines": "{count} líneas",
    "status.track": "subtítulos {track}",
    "status.failed": "No se pudo obtener la transcripción: {error} Puedes pegarla a mano.",

    "error.noVideo": "Abre primero un vídeo de YouTube.",
    "error.noPlayer": "No se encuentra el reproductor.",
    "error.adPlaying": "Se está reproduciendo un anuncio: vuelve a intentarlo cuando termine.",
    "error.noCaptionsLoaded": "El reproductor no ha cargado ningún subtítulo.",
    "error.emptyCaptions": "Subtítulos vacíos.",
    "error.noTranscriptButton":
      "No hay botón «Mostrar transcripción»: puede que el vídeo no tenga transcripción.",
    "error.emptyPanel": "El panel de transcripción se quedó vacío.",

    "notes.noTimecodes": "Sin marcas de tiempo: {count} párrafos de unos 500 caracteres.",
    "notes.lines": "{count} líneas, una marca de tiempo cada ~{spacing} s",
    "notes.blocks.one": "{count} bloque",
    "notes.blocks.other": "{count} bloques",
    "notes.approx": "marcas de tiempo espaciadas: inicio de algunas frases estimado",
    "warning.chaptersIgnored":
      "Sin marcas de tiempo en la transcripción, no se pueden colocar los capítulos: se ignoran.",
    "warning.noPunctuation":
      "Transcripción sin puntuación: los bloques se cortan en las pausas probables, no en las frases.",
    "warning.trailingChapters.one":
      "{count} capítulo después del final de la transcripción: comprueba que esté completa.",
    "warning.trailingChapters.other":
      "{count} capítulos después del final de la transcripción: comprueba que esté completa.",
    "warning.incomplete":
      "La transcripción termina en {end} pero el vídeo dura {duration}: puede que esté incompleta. Vuelve a obtenerla.",

    "print.hint": "En la ventana de impresión, elige {target} como destino. Después, esta pestaña se cierra sola.",
    "print.target": "Guardar como PDF",
    "print.empty": "Nada que imprimir: vuelve a exportar desde el panel.",
  },
};

const isSupported = (code) => LANGUAGES.some((language) => language.code === code);

/**
 * Langue du panneau : celle choisie dans le menu si elle existe, sinon la
 * première langue du navigateur qu'on sait afficher (`fr-FR` → `fr`), sinon
 * l'anglais.
 */
export function pickLanguage(saved, browserLanguages = []) {
  if (isSupported(saved)) return saved;
  for (const tag of browserLanguages) {
    const code = String(tag).toLowerCase().split("-")[0];
    if (isSupported(code)) return code;
  }
  return DEFAULT_LANGUAGE;
}

/**
 * Texte traduit, paramètres remplacés. Les nombres sont écrits à la façon de la
 * langue (« 2 552 » en français, « 2,552 » en anglais).
 *
 * Si `params.count` est un nombre et que la clé a des formes `.one`/`.other`,
 * on choisit la bonne avec `Intl.PluralRules`, qui connaît les règles de chaque
 * langue (en français, 0 est singulier ; en anglais, pluriel).
 *
 * Un texte manquant retombe sur l'anglais, puis sur la clé elle-même : jamais
 * de « undefined » à l'écran.
 */
export function translate(lang, key, params = {}) {
  const messages = MESSAGES[lang] ?? MESSAGES[DEFAULT_LANGUAGE];
  let fullKey = key;
  if (typeof params.count === "number" && `${key}.other` in messages) {
    const form = new Intl.PluralRules(lang).select(params.count);
    fullKey = `${key}.${form}` in messages ? `${key}.${form}` : `${key}.other`;
  }
  const template = messages[fullKey] ?? MESSAGES[DEFAULT_LANGUAGE][fullKey] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => {
    const value = params[name];
    if (value === undefined) return match;
    return typeof value === "number" ? value.toLocaleString(lang) : String(value);
  });
}
