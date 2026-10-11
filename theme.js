// Applique le thème forcé (bouton 🌙/☀️) avant le premier affichage, sinon le
// panneau apparaîtrait un instant dans le thème du système puis basculerait.
// D'où un script classique dans <head>, lu tout de suite : un module attend la
// fin de la page, et Chrome interdit les scripts écrits dans le HTML des
// extensions. `localStorage` plutôt que `chrome.storage` parce qu'il répond
// immédiatement, sans attendre.
// Sans thème enregistré, le CSS suit celui du Mac (prefers-color-scheme).
try {
  const theme = localStorage.getItem("otis:theme");
  if (theme === "light" || theme === "dark") document.documentElement.dataset.theme = theme;
} catch {
  // Stockage indisponible : on suit le thème du système.
}
