/**
 * Préparation des fichiers exportés (Markdown, TXT, PDF) à partir du Markdown
 * produit par `formatMarkdown`. Fonctions pures : l'enregistrement lui-même se
 * fait dans le panneau.
 */

/** Nom utilisé quand le transcript a été collé à la main, sans titre de vidéo. */
export const DEFAULT_FILE_NAME = "Transcript";

/**
 * Nom de fichier tiré du titre de la vidéo, utilisable sur macOS comme sur
 * Windows : on retire les caractères interdits par l'un ou l'autre
 * (`/ \ : * ? " < > |`), les retours à la ligne, et les points en bord de nom
 * (un nom commençant par un point est caché sur macOS). Les accents et les
 * espaces sont gardés : ils ne posent pas de problème et le nom reste lisible.
 *
 * Sans extension (`extension` vide), sert de titre à la page d'impression :
 * Chrome en tire le nom du PDF proposé.
 */
export function fileName(title, extension = "") {
  const base =
    String(title ?? "")
      .replace(/[\/\\:*?"<>|\u0000-\u001f]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^\.+|\.+$/g, "")
      // Certains systèmes refusent les noms trop longs : 100 caractères suffisent
      // à reconnaître la vidéo.
      .slice(0, 100)
      .trim() || DEFAULT_FILE_NAME;
  return extension ? `${base}.${extension}` : base;
}

const HEADING = /^(#{1,6}) +(.*)$/;

/**
 * Version texte brut : le Markdown sans les `#` des titres. Le reste (les
 * blocs `[00:00:00] texte`) est déjà lisible tel quel.
 */
export function toPlainText(markdown) {
  return markdown
    .split("\n")
    .map((line) => line.replace(HEADING, "$2"))
    .join("\n");
}

/**
 * Découpe le Markdown en éléments à afficher sur la page d'impression :
 * `{ level: 1..6, text }` pour un titre, `{ level: 0, text }` pour un
 * paragraphe. La page construit ensuite ses éléments avec `textContent`, sans
 * jamais interpréter le texte comme du HTML.
 */
export function toPrintSections(markdown) {
  const sections = [];
  for (const line of markdown.split("\n")) {
    if (!line.trim()) continue;
    const heading = line.match(HEADING);
    sections.push(heading ? { level: heading[1].length, text: heading[2] } : { level: 0, text: line });
  }
  return sections;
}
