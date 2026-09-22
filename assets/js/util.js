/* ==========================================================================
   util.js — small helpers shared by the home page and the project pages.
   ========================================================================== */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

/** Escape anything that came from projects.json before it touches innerHTML. */
export const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[c]));

/** "435 MHz cross-Yagi antenna" -> "435-mhz-cross-yagi-antenna" */
export const slugify = s => String(s ?? "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-")
  .replace(/^-|-$/g, "")
  .slice(0, 60) || "project";

/**
 * Paths inside projects.json are written relative to the repository root
 * ("projects/foo/images/bar.jpg"). The home page sits at the root, so its
 * base is ""; a project page sits two levels down, so its base is "../../".
 * Absolute URLs and data: URIs are passed through untouched.
 */
export function url(path, base = "") {
  if (!path) return "";
  if (/^(https?:)?\/\//i.test(path) || path.startsWith("data:")) return path;
  return base + String(path).replace(/^\/+/, "");
}

export const STATUS_ORDER = ["In progress", "Completed", "Concluded", "Planned", "On hold"];

export const fmtStatus = s => s ? `<span class="dot" data-s="${esc(s)}"></span>${esc(s)}` : "—";

export function renderSpecs(p) {
  return [
    ["Status", fmtStatus(p.status)],
    ["Area",   esc(p.category || "—")],
    ["Year",   esc(p.year || "—")],
    ["Where",  esc(p.org || "—")]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

/** Line-drawn placeholder for a project with no image yet. */
export const PLACEHOLDER = `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor"
  stroke-width="1.3" stroke-linecap="round" aria-hidden="true" width="46" height="46">
  <circle cx="24" cy="24" r="5"/><circle cx="24" cy="24" r="12" stroke-dasharray="3 4"/>
  <path d="M24 4v6M24 38v6M4 24h6M38 24h6M9.9 9.9l4.3 4.3M33.8 33.8l4.3 4.3M9.9 38.1l4.3-4.3M33.8 14.2l4.3-4.3"/>
</svg>`;

/**
 * Load the project list. Records without a slug get one derived from the
 * title, so an entry added through the admin page still resolves to a folder.
 */
export async function loadProjects(base = "") {
  // Revalidate rather than refuse the cache: a 304 costs headers, a
  // "no-store" fetch costs the whole file on every page view.
  const res = await fetch(`${base}data/projects.json`, { cache: "no-cache" });
  if (!res.ok) throw new Error(`projects.json returned ${res.status}`);
  const all = await res.json();
  return all.map(p => ({ ...p, slug: p.slug || slugify(p.title) }));
}
