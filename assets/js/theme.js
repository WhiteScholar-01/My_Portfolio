/* ==========================================================================
   theme.js — light / dark switching
   --------------------------------------------------------------------------
   The *boot* half of this lives inline in the <head> of every page, because
   it has to run before the first paint or the page flashes the wrong theme.
   This file only handles the button and tells the rest of the site when the
   theme changed, via a "themechange" event on window.

   Rules:
   - No stored choice  -> follow the operating system (no data-theme set).
   - A click          -> store an explicit choice and set data-theme.
   - The stored choice always wins over the system setting.
   ========================================================================== */

const KEY = "portfolio-theme";

const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };

/** What the visitor is actually looking at right now. */
export function currentTheme() {
  const set = document.documentElement.getAttribute("data-theme");
  if (set === "light" || set === "dark") return set;
  return matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function label(theme) {
  const btn = document.querySelector("#themeBtn");
  if (btn) {
    btn.setAttribute("aria-label", theme === "dark" ? "Switch to light theme" : "Switch to dark theme");
    btn.setAttribute("title", theme === "dark" ? "Light theme" : "Dark theme");
  }
}

/** Set the theme on the page and announce it. `remember` writes the choice. */
function apply(theme, remember) {
  document.documentElement.setAttribute("data-theme", theme);
  if (remember) { try { localStorage.setItem(KEY, theme); } catch { /* private mode: fine */ } }
  label(theme);
  // Let the canvas (and anything else that caches colours) repaint.
  dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
}

export function initTheme() {
  const btn = document.querySelector("#themeBtn");
  if (!btn) return;

  const stored = read();          // read BEFORE anything writes, or we'd always
  label(currentTheme());          // look "chosen" and stop following the system

  btn.addEventListener("click", () => apply(currentTheme() === "dark" ? "light" : "dark", true));

  // If the visitor never chose, keep following the system as it changes.
  if (stored !== "light" && stored !== "dark") {
    matchMedia("(prefers-color-scheme: dark)")
      .addEventListener?.("change", e => apply(e.matches ? "dark" : "light", false));
  }
}
