(function () {
  var STORAGE_KEY = "bh-theme";
  var html = document.documentElement;

  var SUN =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/></svg>';
  var MOON =
    '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

  function currentTheme() {
    return html.getAttribute("data-bh-theme") === "light" ? "light" : "dark";
  }

  function applyTheme(theme) {
    if (theme === "light") {
      html.setAttribute("data-bh-theme", "light");
    } else {
      html.removeAttribute("data-bh-theme");
      theme = "dark";
    }
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch (e) {}
    updateButton(theme);
  }

  function updateButton(theme) {
    var btn = document.getElementById("bh-theme-toggle");
    if (!btn) return;
    var isDark = theme !== "light";
    btn.innerHTML = isDark ? SUN : MOON;
    btn.setAttribute("aria-label", isDark ? "Mode terang" : "Mode gelap");
    btn.title = isDark ? "Mode terang" : "Mode gelap";
  }

  function ensureButton() {
    var header = document.getElementById("header");
    if (!header || header.style.display === "none") return;
    if (document.getElementById("bh-theme-toggle")) return;

    var btn = document.createElement("button");
    btn.type = "button";
    btn.id = "bh-theme-toggle";
    btn.className = "bh-theme-toggle";
    btn.addEventListener("click", function () {
      applyTheme(currentTheme() === "dark" ? "light" : "dark");
    });
    header.appendChild(btn);
    updateButton(currentTheme());
  }

  try {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light") html.setAttribute("data-bh-theme", "light");
  } catch (e) {}

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", ensureButton);
  } else {
    ensureButton();
  }

  new MutationObserver(ensureButton).observe(document.documentElement, {
    childList: true,
    subtree: true,
  });
})();
