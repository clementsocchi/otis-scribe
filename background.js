// Un clic sur l'icône de l'extension ouvre le panneau latéral. Un panneau plutôt
// qu'une popup : une popup se ferme dès qu'on clique ailleurs, ce qui rendrait
// le copier-coller dans les zones de texte pénible. Le raccourci clavier
// (`_execute_action` dans le manifest) équivaut à ce clic.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
