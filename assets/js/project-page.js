/* ==========================================================================
   project-page.js — fills in a page at projects/<slug>/index.html
   --------------------------------------------------------------------------
   Every project page is the same file. It works out which project it is from
   its own folder name, then renders itself from data/projects.json, so the
   project text lives in exactly one place and the admin page keeps working.

   That means you can add a project by copying any project folder, renaming
   it to match the new slug, and editing the two lines marked in the HTML.
   ========================================================================== */

import { $, esc, url, loadProjects, PLACEHOLDER } from "./util.js";
import { initTheme } from "./theme.js";

const BASE = "../../";   // this page is two folders below the repository root

/** Which project is this? The folder name is the slug. */
function slugFromLocation() {
  if (document.body.dataset.project) return document.body.dataset.project;
  const parts = location.pathname.split("/").filter(Boolean);
  let last = parts.at(-1) || "";
  if (/\.html?$/i.test(last)) last = parts.at(-2) || "";
  return decodeURIComponent(last);
}

const fmtStatus = s => s
  ? `<span class="dot" data-s="${esc(s)}"></span>${esc(s)}`
  : "—";

function renderSpecs(p) {
  const rows = [
    ["Status",   fmtStatus(p.status)],
    ["Area",     esc(p.category || "—")],
    ["Year",     esc(p.year || "—")],
    ["Where",    esc(p.org || "—")]
  ];
  return rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

function renderGallery(p) {
  // `image` is the cover; `gallery` is an optional list of extra figures,
  // each either "path/to.jpg" or { src, caption }.
  const items = [];
  if (p.image) items.push({ src: p.image, caption: "" });
  for (const g of p.gallery || []) {
    items.push(typeof g === "string" ? { src: g, caption: "" } : g);
  }
  if (!items.length) {
    return `<div class="no-media">No photos in this project's images folder yet.</div>`;
  }
  return `<div class="gallery${items.length === 1 ? " single" : ""}">
    ${items.map(it => `<figure>
      <img src="${esc(url(it.src, BASE))}" alt="${esc(it.caption || p.title)}" loading="lazy" decoding="async">
      ${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}
    </figure>`).join("")}
  </div>`;
}

function renderNav(list, idx) {
  const prev = list[idx - 1], next = list[idx + 1];
  return `
    ${prev ? `<a class="prev" href="../${esc(prev.slug)}/"><span>← Previous</span>${esc(prev.title)}</a>` : "<span></span>"}
    ${next ? `<a class="next" href="../${esc(next.slug)}/"><span>Next →</span>${esc(next.title)}</a>` : ""}`;
}

function render(p, list, idx) {
  document.title = `${p.title} — Saqib Ali`;
  $('meta[name="description"]')?.setAttribute("content", p.summary || "");

  $("#pTitle").textContent = p.title;
  $("#pLede").textContent = p.summary || "";
  $("#pCrumbCat").textContent = p.category || "Project";
  $("#pSpecs").innerHTML = renderSpecs(p);

  $("#pHighlights").innerHTML = p.details?.length
    ? `<ul class="highlights">${p.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul>`
    : `<p class="muted">Write-up in progress. The notes for this project live in
       <code>projects/${esc(p.slug)}/README.md</code>.</p>`;

  $("#pGallery").innerHTML = renderGallery(p);

  $("#pTags").innerHTML = (p.tags || []).length
    ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>`
    : `<p class="muted">—</p>`;

  const links = [
    p.code_url && `<a class="btn small" href="${esc(p.code_url)}" target="_blank" rel="noopener">View the code</a>`,
    p.demo_url && `<a class="btn small" href="${esc(p.demo_url)}" target="_blank" rel="noopener">See it live</a>`,
    `<a class="btn small" href="${BASE}#projects">All projects</a>`
  ].filter(Boolean).join("");
  $("#pLinks").innerHTML = links;

  $("#pNav").innerHTML = renderNav(list, idx);
  $("#pMain").hidden = false;
}

function fail(message) {
  $("#pMain").hidden = true;
  $("#pFail").hidden = false;
  $("#pFailMsg").textContent = message;
}

initTheme();

try {
  const all  = (await loadProjects(BASE)).filter(p => p.published !== false);
  const slug = slugFromLocation();
  const idx  = all.findIndex(p => p.slug === slug);
  if (idx === -1) {
    fail(`No project called "${slug}" is listed in data/projects.json.`);
  } else {
    render(all[idx], all, idx);
  }
} catch (err) {
  console.error(err);
  fail("The project list couldn't be loaded. Check that data/projects.json exists.");
}
