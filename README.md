# O.T.I.S – Scribe

*[Version française](README.fr.md)*

A Chrome extension that fetches the transcript and chapters of a YouTube video
and formats them as Markdown, ready to paste into Notion or anywhere else:

```
### 00:00:00 - Introduction

[00:00:00] Hello everyone, and welcome to this new episode.

[00:00:31] Today we are going to talk about fasting.
```

Text is split into blocks of about 30 seconds that always end on a full
sentence. The name comes from Otis, the scribe in *Asterix & Obelix: Mission
Cleopatra*.

Not affiliated with, endorsed by or sponsored by YouTube or Google.

## Installation

1. Download this repository (**Code → Download ZIP**, then unzip it) or clone it.
2. Open `chrome://extensions`.
3. Turn on **Developer mode** (top right).
4. Click **Load unpacked** and select this folder.
5. Pin the extension (puzzle icon → pin) to keep it within reach.

Tested on Brave and Dia, two browsers built on Chromium, like Chrome. Arc may
not work properly.

## Usage

1. Open a YouTube video, then click the extension icon: a panel opens on the
   right.
2. **Fetch from the video** fills in the Chapters and Transcript areas.
3. Choose the heading level (H3 by default), with or without timecodes in the
   headings, and the block length. These settings are remembered.
4. **Copy**, or save a file: **Markdown**, **TXT** (headings without their `#`)
   or **PDF**. The first two land in your downloads folder; for PDF, a page
   opens with the print dialog: choose "Save as PDF". The file is named after
   the video.

Keyboard shortcut to open the panel: **⌃⇧Y** on Mac (Control, not Command:
Chrome keeps its ⌘ shortcuts for itself), **Alt+Shift+Y** on Windows. Change it
in `chrome://extensions/shortcuts` ("Edit" link at the bottom of the panel).

The ⚙ menu at the top right sets:

- **Appearance**: device theme, dark or light;
- **Language**: English, Français or Español. Chrome's language by default.

Both choices are remembered.

The text areas stay editable: you can fix a chapter title, or paste everything
by hand when fetching fails. Transcripts are accepted in all common formats
(copied from the YouTube panel, `[00:01:23] text`, SRT, plain text without
timecodes). For chapters, you can paste the whole description: only lines with
a timecode are kept.

## Privacy

Everything happens in your browser. The extension talks to YouTube only, has no
server, no analytics and no account, and sends your data nowhere. Your settings
stay on your device.

## How the transcript is fetched

YouTube's caption API returns an empty response without a token that only the
player can compute. So the extension lets the player load the captions (briefly
turning CC on if needed, then restoring its state) and reads that same request
again. If that fails, it opens the "Show transcript" panel and reads its lines.

Checked on 10/10/2026 on a 2 h 53 podcast: 2,552 lines fetched in 2.6 s, 328
blocks, 100% ending on a sentence, 12 chapters placed within 2 s of their
timecode, formatted in 17 ms.

During an ad, the player loads the ad's captions: try again once the ad is over.

## Code

```
manifest.json        extension declaration (Manifest V3)
background.js        opens the panel on icon click or shortcut
content.js           reads the YouTube page; selectors grouped at the top of the file
sidepanel.*          the panel and its ⚙ menu (YouTube colors as variables at the top of the CSS)
theme.js             applies the forced theme before the panel is shown
_locales/            text displayed by Chrome itself (description, shortcut)
fonts/               Roboto (Apache 2.0 license)
icons/               icon; icon.svg is the source of the PNGs
print.*              print page for PDF export
lib/parse.js         all input formats → [{ start, text }]
lib/blocks.js        cleanup and splitting into blocks (the core)
lib/markdown.js      final assembly
lib/timecode.js      timecode conversions
lib/export.js        file names, TXT version, PDF sections
lib/i18n.js          interface text in English, French and Spanish
```

No dependencies, no build step. Code comments are in French. Tests:

```bash
npm test
```

## License

[MIT](LICENSE)
