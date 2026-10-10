# Otis YouTube

Extension Chrome qui récupère le transcript et les chapitres d'une vidéo YouTube,
et les met en forme en Markdown, prêt à coller dans Notion ou ailleurs :

```
### 00:00:00 - Introduction

[00:00:00] Bonjour à tous, bienvenue dans ce nouvel épisode.

[00:00:31] Aujourd'hui on va parler du jeûne.
```

Le découpage reprend celui d'[Otis](../Otis) : des blocs d'environ 30 secondes
qui finissent toujours sur une fin de phrase.

## Installation

1. Ouvrir `chrome://extensions`.
2. Activer le **Mode développeur** (en haut à droite).
3. Cliquer sur **Charger l'extension non empaquetée** et choisir ce dossier.
4. Épingler l'extension (icône de puzzle → punaise) pour l'avoir sous la main.

Après une modification du code, cliquer sur ↻ dans `chrome://extensions`.

## Utilisation

1. Ouvrir une vidéo YouTube, puis cliquer sur l'icône de l'extension : un
   panneau s'ouvre à droite.
2. **Récupérer depuis la vidéo** remplit les zones Chapitres et Transcript.
3. Choisir le niveau des titres (H3 par défaut), avec ou sans timecode dans
   les titres, et la durée des blocs. Ces réglages sont mémorisés.
4. **Copier**.

Les zones restent modifiables : on peut corriger un titre de chapitre, ou tout
coller à la main quand la récupération échoue. Le transcript est accepté dans
tous les formats courants (copie du panneau YouTube, `[00:01:23] texte`, SRT,
texte brut sans timecodes) ; pour les chapitres, on peut coller la description
entière, seules les lignes avec un timecode sont retenues.

## Comment le transcript est récupéré

L'API de sous-titres de YouTube renvoie une réponse vide sans un jeton que seul
le lecteur sait calculer. L'extension laisse donc le lecteur charger les
sous-titres (en activant brièvement CC si besoin, puis en le remettant dans son
état), et relit cette même requête. Si ça échoue, elle ouvre le panneau
« Afficher la transcription » et lit ses lignes.

Vérifié le 10/10/2026 sur un podcast de 2 h 53 : 2 552 lignes récupérées en
2,6 s, 328 blocs dont 100 % finissent sur une phrase, 12 chapitres placés à
2 s près de leur timecode, mise en forme en 17 ms.

Pendant une publicité, le lecteur charge les sous-titres de la pub : il faut
réessayer une fois la pub terminée.

## Code

```
manifest.json        déclaration de l'extension (Manifest V3)
background.js        ouvre le panneau au clic sur l'icône
content.js           lit la page YouTube ; sélecteurs regroupés en tête de fichier
sidepanel.*          le panneau
lib/parse.js         tous les formats d'entrée → [{ start, text }]
lib/blocks.js        nettoyage et découpage en blocs (le cœur)
lib/markdown.js      assemblage final
lib/timecode.js      conversions de timecodes
```

Aucune dépendance, aucune compilation. Tests :

```bash
npm test
```
