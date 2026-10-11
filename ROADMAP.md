# Roadmap

Idées d'amélioration, à reprendre une par une. Pour en lancer une avec Claude
Code : « on attaque l'export de fichiers de la roadmap ».

## En cours

- [ ] **Test en conditions réelles** (à partir du 10/10/2026, 2-3 jours).
  Déjà validé : vidéo de 15 min sans chapitres, vidéo d'1 h avec chapitres,
  podcast de 2 h 53. À surveiller : vidéo en français, sous-titres désactivés
  au départ (ils doivent le rester après la récupération).

## Idées

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
- [x] **Raccourci clavier** (v0.4.0, 11/10/2026) : ⌃⇧Y ouvre le panneau
  (Alt+Shift+Y sur Windows). Affiché en bas du panneau, modifiable dans
  `chrome://extensions/shortcuts`. Les raccourcis Récupérer et Copier ont été
  essayés puis abandonnés : ils ne réagissaient pas, et Clément n'en a pas
  besoin.
- [x] **Direction artistique et nouveau nom** (v0.5.0, 11/10/2026) :
  l'extension devient « O.T.I.S – Scribe » (Otis, le scribe de *Mission
  Cléopâtre* ; « Scribe » se dit pareil en anglais). Panneau calqué sur les
  pages de YouTube, en clair et en sombre : police Roboto embarquée, boutons
  avec icône au trait, puces H1…H5, interrupteur bleu, champs façon
  description et commentaire, statut façon « vues · date », barre rouge de
  chargement. Bouton « Apparence » (lune + Clair/Sombre) pour forcer un thème
  (sinon celui du Mac). Nouvelle icône : plume
  blanche sur le rectangle rouge de YouTube.
- [x] **Interface en anglais, français et espagnol** (v0.6.0, 11/10/2026) :
  menu ⚙ en haut à droite, calqué sur celui du compte YouTube. « Apparence »
  propose trois choix (thème de l'appareil, sombre, clair) et « Langue »
  English, Français, Español, avec coche sur le choix actuel. Par défaut, la
  langue de Chrome (anglais si elle n'est pas proposée). Dictionnaire maison
  (`lib/i18n.js`) plutôt que `chrome.i18n`, qui ne permet pas de forcer la
  langue ; `_locales` ne sert qu'à la description et au libellé du raccourci
  dans Chrome. La page PDF suit la langue du panneau.
- [x] **Nouveau logo** (v0.6.1, 11/10/2026) : la plume pleine détonnait avec
  les icônes au trait du panneau. Remplacée par trois lignes de transcript
  (un court trait pour le timecode, puis le texte), en blanc au trait sur le
  même rectangle rouge. Choisi parmi quatre propositions (plume au trait,
  plume de stylo, symbole 文A des langues).

## Écartées pour l'instant

- Envoi direct dans Notion : demanderait une clé d'intégration à stocker dans
  l'extension. À reconsidérer si le copier-coller devient pénible.
