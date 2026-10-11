# Roadmap

Idées d'amélioration, à reprendre une par une. Pour en lancer une avec Claude
Code : « on attaque l'export de fichiers de la roadmap ».

## En cours

- [ ] **Test en conditions réelles** (à partir du 10/10/2026, 2-3 jours).
  Déjà validé : vidéo de 15 min sans chapitres, vidéo d'1 h avec chapitres,
  podcast de 2 h 53. À surveiller : vidéo en français, sous-titres désactivés
  au départ (ils doivent le rester après la récupération).

## Idées

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

## Fait

- [x] **Première version** (v0.1.0, 10/10/2026) : transcript lu via les
  sous-titres du lecteur (panneau de transcription en secours), chapitres lus
  dans la description, blocs d'environ 30 s finissant sur une phrase, tous
  formats de transcript acceptés, nettoyage léger, titres H1 à H5 (H3 par
  défaut), saisie manuelle et bouton Copier, vidéos de 2-3 h et sans chapitres.
- [x] **Timecode dans les titres de chapitres** (v0.2.0, 10/10/2026) :
  `### 00:15:18 - Titre`, avec le timecode du premier bloc du chapitre.
  Désactivable par la case « Timecode dans les titres ».
- [x] **Export en fichier** (v0.3.0, 11/10/2026) : boutons Markdown, TXT
  (titres sans `#`) et PDF. Markdown et TXT arrivent dans les
  téléchargements ; le PDF passe par une page d'impression (`print.html`) et
  « Enregistrer au format PDF ». Fichier nommé d'après le titre de la vidéo
  (« Transcript » pour un texte collé à la main).

## Écartées pour l'instant

- Envoi direct dans Notion : demanderait une clé d'intégration à stocker dans
  l'extension. À reconsidérer si le copier-coller devient pénible.
