// Lit la page YouTube à la demande du panneau latéral.
//
// YouTube ne recharge pas la page quand on passe d'une vidéo à l'autre : tout ce
// qu'on lirait au chargement serait périmé à la vidéo suivante. On relit donc
// tout au moment du clic. Seule exception, l'observateur de requêtes ci-dessous,
// qui ne fait que noter des adresses.
(() => {
  // Le panneau peut réinjecter ce script dans un onglet ouvert avant
  // l'installation de l'extension : on évite de l'enregistrer deux fois.
  if (window.__otisYoutube) return;
  window.__otisYoutube = true;

  // YouTube change régulièrement son HTML. Quand la récupération casse, c'est
  // presque toujours ici qu'il faut corriger. Plusieurs sélecteurs par élément :
  // le premier qui trouve quelque chose l'emporte.
  const SELECTORS = {
    player: "#movie_player",
    captionsButton: ".ytp-subtitles-button",
    descriptionExpand: ["#description-inline-expander #expand", "tp-yt-paper-button#expand"],
    transcriptButton: [
      "ytd-video-description-transcript-section-renderer button",
      "ytd-video-description-transcript-section-renderer ytd-button-renderer",
    ],
    transcriptPanel: "ytd-engagement-panel-section-list-renderer[target-id='engagement-panel-searchable-transcript']",
    segments: ["ytd-transcript-segment-renderer", "transcript-segment-view-model"],
    segmentTime: [".segment-timestamp", "[class*='timestamp']"],
    segmentText: [".segment-text", "[class*='segment-text']", "yt-formatted-string"],
    description: ["#description-inline-expander yt-attributed-string", "#description-inline-expander", "#description"],
  };

  const POLL_MS = 250;
  /** Le panneau de transcription est considéré complet quand il ne grossit plus pendant 1 s. */
  const STABLE_MS = 1000;
  /** Un podcast de 3 h peut compter 5 000 lignes, que YouTube met un moment à afficher. */
  const PANEL_WAIT_MS = 20000;
  /** Délai laissé au lecteur pour charger les sous-titres après activation. */
  const CAPTIONS_WAIT_MS = 8000;

  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  const first = (selectors, root = document) => {
    for (const selector of selectors) {
      const element = root.querySelector(selector);
      if (element) return element;
    }
    return null;
  };
  async function waitFor(check, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const value = check();
      if (value) return value;
      await sleep(POLL_MS);
    }
    return null;
  }
  /**
   * Erreur repérée par un code (`noPlayer`…) plutôt que par une phrase : ce
   * script ne peut pas importer `lib/i18n.js`, c'est le panneau qui traduit.
   */
  const fail = (code) => Object.assign(new Error(code), { code });
  /** Ce qu'on renvoie au panneau : le code s'il y en a un, sinon le message brut (erreur imprévue). */
  const describe = (error) => (error.code ? { code: error.code } : { message: error.message });

  const isAdShowing = () => document.querySelector(SELECTORS.player)?.classList.contains("ad-showing") ?? false;

  /**
   * Adresses de sous-titres demandées par le lecteur, par identifiant de vidéo.
   *
   * L'API de sous-titres de YouTube renvoie une réponse vide sans un jeton
   * (`pot`) que seul le lecteur sait calculer, et ce jeton est lié à la vidéo :
   * vérifié, il ne fonctionne pas en changeant l'identifiant. On note donc les
   * requêtes du lecteur au passage, pour les rejouer au format JSON.
   *
   * Un observateur plutôt qu'une lecture ponctuelle de `performance` : YouTube
   * vide régulièrement cette liste, et elle plafonne à 250 entrées.
   */
  const captionUrls = new Map();
  function rememberCaptionUrl(address) {
    try {
      const url = new URL(address);
      if (url.pathname !== "/api/timedtext" || !url.searchParams.has("pot")) return;
      const videoId = url.searchParams.get("v");
      // Une piste traduite automatiquement (`tlang`) ne remplace jamais l'originale.
      if (url.searchParams.has("tlang") && captionUrls.has(videoId)) return;
      captionUrls.set(videoId, url);
    } catch {
      // Adresse illisible : rien à noter.
    }
  }
  new PerformanceObserver((list) => list.getEntries().forEach((entry) => rememberCaptionUrl(entry.name))).observe({
    type: "resource",
    buffered: true,
  });
  function captionUrlFor(videoId) {
    performance.getEntriesByType("resource").forEach((entry) => rememberCaptionUrl(entry.name));
    return captionUrls.get(videoId) ?? null;
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type !== "otis:extract") return;
    extract().then(sendResponse, (error) => sendResponse({ error: describe(error) }));
    return true; // la réponse arrive plus tard, de façon asynchrone
  });

  async function extract() {
    const videoId = new URL(location.href).searchParams.get("v");
    if (!location.pathname.startsWith("/watch") || !videoId) {
      throw fail("noVideo");
    }
    const meta = await readMetadata(videoId);

    // Deux méthodes : les sous-titres du lecteur d'abord, le panneau
    // « Afficher la transcription » en secours. Le panneau s'est montré
    // capricieux à l'essai : YouTube refusait parfois de le remplir (erreur 400).
    let captionsError;
    try {
      return { videoId, ...meta, ...(await readCaptions(videoId)) };
    } catch (error) {
      captionsError = describe(error);
    }
    try {
      return { videoId, ...meta, ...(await readTranscriptPanel()) };
    } catch (error) {
      return { videoId, ...meta, transcript: "", transcriptErrors: [captionsError, describe(error)] };
    }
  }

  /**
   * Titre, description complète et durée.
   *
   * On relit la page de la vidéo depuis le serveur plutôt que le DOM : la
   * description affichée est tronquée tant qu'on n'a pas cliqué sur « plus »,
   * et les données intégrées à la page restent celles de la première vidéo
   * ouverte dans l'onglet. Le DOM ne sert que de secours.
   */
  async function readMetadata(videoId) {
    try {
      const html = await (await fetch(`/watch?v=${videoId}`, { credentials: "include" })).text();
      const details = extractJson(html, "ytInitialPlayerResponse")?.videoDetails;
      if (details?.videoId === videoId) {
        return {
          title: details.title,
          description: details.shortDescription ?? "",
          durationSec: Number(details.lengthSeconds) || videoDuration(),
        };
      }
    } catch {
      // On passe au DOM.
    }
    return {
      title: document.title.replace(/ - YouTube$/, ""),
      description: first(SELECTORS.description)?.textContent ?? "",
      durationSec: videoDuration(),
    };
  }

  const videoDuration = () => {
    const duration = document.querySelector("video")?.duration;
    return Number.isFinite(duration) ? duration : null;
  };

  /** Extrait l'objet JSON qui suit `nom = ` dans le HTML, en comptant les accolades. */
  function extractJson(html, name) {
    const at = html.search(new RegExp(`${name}\\s*=\\s*\\{`));
    if (at < 0) return null;
    const start = html.indexOf("{", at);
    let depth = 0;
    let inString = false;
    for (let i = start; i < html.length; i++) {
      const char = html[i];
      if (inString) {
        if (char === "\\") i++;
        else if (char === '"') inString = false;
      } else if (char === '"') inString = true;
      else if (char === "{") depth++;
      else if (char === "}" && --depth === 0) return JSON.parse(html.slice(start, i + 1));
    }
    return null;
  }

  /**
   * Sous-titres de la vidéo, tels que le lecteur les charge.
   *
   * Si le lecteur ne les a pas encore demandés, on active les sous-titres (CC)
   * le temps qu'il le fasse, puis on les remet dans leur état initial.
   */
  async function readCaptions(videoId) {
    let url = captionUrlFor(videoId);
    if (url) {
      const captions = await fetchCaptions(url).catch(() => null);
      if (captions) return captions;
      captionUrls.delete(videoId); // jeton expiré : on en redemande un
    }

    const button = document.querySelector(SELECTORS.captionsButton);
    if (!button) throw fail("noPlayer");
    const wasOn = button.getAttribute("aria-pressed") === "true";
    if (wasOn) {
      // Déjà actifs mais pas encore chargés : on les relance.
      button.click();
      await sleep(300);
    }
    button.click();
    url = await waitFor(() => captionUrlFor(videoId), CAPTIONS_WAIT_MS);
    if (!wasOn && button.getAttribute("aria-pressed") === "true") button.click();

    if (!url) {
      throw fail(isAdShowing() ? "adPlaying" : "noCaptionsLoaded");
    }
    return fetchCaptions(url);
  }

  async function fetchCaptions(url) {
    const json = new URL(url);
    json.searchParams.set("fmt", "json3");
    const data = await (await fetch(json)).json();
    const captions = (data.events ?? [])
      .filter((event) => event.segs)
      .map((event) => ({ start: event.tStartMs / 1000, text: event.segs.map((seg) => seg.utf8).join("") }))
      .filter((caption) => caption.text.trim());
    if (!captions.length) throw fail("emptyCaptions");

    const language = url.searchParams.get("lang");
    const automatic = url.searchParams.get("kind") === "asr";
    return {
      captions,
      segmentCount: captions.length,
      track: `${language}${automatic ? " (auto)" : ""}`,
    };
  }

  /** Méthode de secours : ouvrir le panneau « Afficher la transcription » et lire ses lignes. */
  async function readTranscriptPanel() {
    if (!findSegments().length) await openTranscriptPanel();
    const segments = await waitForSegments();
    return {
      transcript: segments.map(segmentText).join("\n"),
      segmentCount: segments.length,
    };
  }

  const findSegments = () => {
    for (const selector of SELECTORS.segments) {
      const found = document.querySelectorAll(selector);
      if (found.length) return [...found];
    }
    return [];
  };

  async function openTranscriptPanel() {
    first(SELECTORS.descriptionExpand)?.click();
    await sleep(300);
    const button = first(SELECTORS.transcriptButton);
    if (button) {
      (button.querySelector("button") ?? button).click();
      return;
    }
    const panel = document.querySelector(SELECTORS.transcriptPanel);
    if (panel) {
      panel.setAttribute("visibility", "ENGAGEMENT_PANEL_VISIBILITY_EXPANDED");
      return;
    }
    throw fail("noTranscriptButton");
  }

  /**
   * Attend que le panneau ait fini de se remplir : sur une vidéo longue, YouTube
   * ajoute les lignes progressivement. On renvoie le décompte au panneau
   * latéral pour qu'il affiche la progression.
   */
  async function waitForSegments() {
    const startedAt = Date.now();
    let lastCount = -1;
    let stableSince = startedAt;
    while (Date.now() - startedAt < PANEL_WAIT_MS) {
      const count = findSegments().length;
      if (count !== lastCount) {
        lastCount = count;
        stableSince = Date.now();
        chrome.runtime.sendMessage({ type: "otis:progress", count }).catch(() => {});
      } else if (count > 0 && Date.now() - stableSince >= STABLE_MS) {
        break;
      }
      await sleep(POLL_MS);
    }
    const segments = findSegments();
    if (!segments.length) throw fail("emptyPanel");
    return segments;
  }

  /** `timecode\ntexte`, le format que `parseTranscript` sait lire. */
  function segmentText(segment) {
    const time = first(SELECTORS.segmentTime, segment)?.textContent.trim();
    const text = first(SELECTORS.segmentText, segment)?.textContent.trim();
    if (time && text) return `${time}\n${text}`;
    return segment.innerText.trim();
  }
})();
