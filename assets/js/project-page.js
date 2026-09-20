/* ==========================================================================
   project-page.js — fills in a page at projects/<slug>/index.html
   --------------------------------------------------------------------------
   Every project page is the same file. It works out which project it is from
   ITS OWN FOLDER NAME, then renders itself from data/projects.json, so the
   project text lives in exactly one place and the admin page keeps working.

   That means you can add a project by copying any project folder and renaming
   it to the new slug — nothing inside the file needs editing.

   Optional fields this page understands, all safe to omit:
     gallery  ["path"] or [{src, caption}]      extra figures
     sections [{heading, body}]                 your own headed blocks
     files    [{label, path, note}]             downloads (PDF, model, report)
   ========================================================================== */

import { $, esc, url, loadProjects } from "./util.js";
import { initTheme } from "./theme.js";

const BASE = "../../";   // this page is two folders below the repository root

/**
 * Which project is this? The FOLDER NAME decides, so a copied folder
 * identifies itself correctly without being edited. `data-project` on <body>
 * is only a fallback, for the odd case where the path gives us nothing.
 */
function slugFromLocation() {
  const parts = location.pathname.split("/").filter(Boolean);
  let last = parts.at(-1) || "";
  if (/\.html?$/i.test(last)) last = parts.at(-2) || "";
  return decodeURIComponent(last) || document.body.dataset.project || "";
}

const fmtStatus = s => s ? `<span class="dot" data-s="${esc(s)}"></span>${esc(s)}` : "—";

function renderSpecs(p) {
  return [
    ["Status", fmtStatus(p.status)],
    ["Area",   esc(p.category || "—")],
    ["Year",   esc(p.year || "—")],
    ["Where",  esc(p.org || "—")]
  ].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join("");
}

/**
 * Turn a plain-text block into paragraphs and lists.
 * Blank line starts a new paragraph; a run of lines beginning "- " or "* "
 * becomes a bullet list. Everything is escaped first, so section text can
 * never inject markup.
 */
function richText(text) {
  const blocks = String(text || "").trim().split(/\n\s*\n/);
  return blocks.map(block => {
    const lines = block.split("\n").map(l => l.trim()).filter(Boolean);
    if (!lines.length) return "";
    if (lines.every(l => /^[-*]\s+/.test(l))) {
      return `<ul class="highlights">${
        lines.map(l => `<li>${esc(l.replace(/^[-*]\s+/, ""))}</li>`).join("")
      }</ul>`;
    }
    return `<p>${lines.map(esc).join("<br>")}</p>`;
  }).join("");
}

/** Your own headed blocks, between "What I did" and the images. */
function renderSections(p) {
  const list = (p.sections || []).filter(s => s && (s.heading || s.body));
  if (!list.length) return "";
  return list.map(s => `
    <div class="p-section">
      <h2>${esc(s.heading || "Notes")}</h2>
      ${richText(s.body)}
    </div>`).join("");
}

function renderGallery(p) {
  // `image` is the cover; `gallery` holds any number of extra figures.
  const items = [];
  if (p.image) items.push({ src: p.image, caption: "" });
  for (const g of p.gallery || []) {
    const it = typeof g === "string" ? { src: g, caption: "" } : g;
    if (it && it.src) items.push(it);
  }
  if (!items.length) {
    return `<div class="no-media">No photos in this project's images folder yet.</div>`;
  }
  return `<div class="gallery${items.length === 1 ? " single" : ""}">
    ${items.map(it => `<figure>
      <a href="${esc(url(it.src, BASE))}" target="_blank" rel="noopener">
        <img src="${esc(url(it.src, BASE))}" alt="${esc(it.caption || p.title)}" loading="lazy" decoding="async">
      </a>
      ${it.caption ? `<figcaption>${esc(it.caption)}</figcaption>` : ""}
    </figure>`).join("")}
  </div>`;
}

/** Attachments: manuals, models, reports. Shown as download buttons. */
function renderFiles(p) {
  const list = (p.files || []).filter(f => f && f.path);
  if (!list.length) return "";
  const ext = path => (String(path).split(".").pop() || "").toUpperCase().slice(0, 5);
  return `<div class="sheet">
    <h3>Downloads</h3>
    ${list.map(f => `
      <a class="dl" href="${esc(url(f.path, BASE))}" download>
        <span class="dl-ext">${esc(ext(f.path))}</span>
        <span class="dl-text">
          <b>${esc(f.label || f.path.split("/").pop())}</b>
          ${f.note ? `<span>${esc(f.note)}</span>` : ""}
        </span>
      </a>`).join("")}
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

  $("#pSections").innerHTML = renderSections(p);
  $("#pGallery").innerHTML = renderGallery(p);
  $("#pFiles").innerHTML = renderFiles(p);

  $("#pTags").innerHTML = (p.tags || []).length
    ? `<div class="tags">${p.tags.map(t => `<span>${esc(t)}</span>`).join("")}</div>`
    : `<p class="muted">—</p>`;

  $("#pLinks").innerHTML = [
    p.code_url && `<a class="btn small" href="${esc(p.code_url)}" target="_blank" rel="noopener">View the code</a>`,
    p.demo_url && `<a class="btn small" href="${esc(p.demo_url)}" target="_blank" rel="noopener">See it live</a>`,
    `<a class="btn small" href="${BASE}#projects">All projects</a>`
  ].filter(Boolean).join("");

  $("#pNav").innerHTML = renderNav(list, idx);
  $("#pMain").hidden = false;
}

function fail(message) {
  $("#pMain").hidden = true;
  $("#pFail").hidden = false;
  $("#pFailMsg").textContent = message;
}

initTheme();
$("#yr") && ($("#yr").textContent = new Date().getFullYear());

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
