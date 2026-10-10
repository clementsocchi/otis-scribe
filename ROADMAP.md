# Roadmap

Idées d'amélioration, à reprendre une par une. Pour en lancer une avec Claude
Code : « on attaque l'export de fichiers de la roadmap ».

## En cours

- [ ] **Test en conditions réelles** (à partir du 10/10/2026, 2-3 jours).
  Déjà validé : vidéo de 15 min sans chapitres, vidéo d'1 h avec chapitres,
  podcast de 2 h 53. À surveiller : vidéo en français, sous-titres désactivés
  au départ (ils doivent le rester après la récupération).

## Idées

- [ ] **Export en fichier** : enregistrer une fiche sur l'ordinateur, au choix
  en Markdown, TXT ou PDF. Le Markdown et le TXT sont simples (téléchargement
  direct) ; le PDF demande une mise en page, via l'impression de Chrome par
  exemple. Nom de fichier proposé à partir du titre de la vidéo.
- [ ] **Raccourcis clavier** : ouvrir le panneau, récupérer, copier. Chrome
  permet de les déclarer dans le manifest, et chacun peut les modifier dans
  `chrome://extensions/shortcuts`.
- [ ] **Direction artistique** : une interface plus soignée et identifiable
  (couleurs, typographie, icône, états de chargement).
- [ ] **Interface en anglais et en français** : langue choisie selon celle de
  Chrome (mécanisme `_locales` des extensions), avec une option pour forcer.
  Prérequis pour un repo public.
- [ ] **Repo public sur GitHub** : après la version bilingue. Prévoir un README
  en anglais, une licence (MIT par exemple) et des captures d'écran.

## Écartées pour l'instant

- Envoi direct dans Notion : demanderait une clé d'intégration à stocker dans
  l'extension. À reconsidérer si le copier-coller devient pénible.
