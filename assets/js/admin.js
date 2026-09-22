/* ==========================================================================
   admin.js — the project manager
   --------------------------------------------------------------------------
   Talks to the GitHub Contents API with a fine-grained personal access token
   that you paste in. Nothing is stored on a server; the token lives only in
   this browser (sessionStorage, or localStorage if you tick "remember").

   What it writes:
     data/projects.json                     the project list the site reads
     projects/<slug>/images/<file>          cover and gallery images
     projects/<slug>/<file>                 attachments (PDF, .slx, reports)
     projects/<slug>/index.html             a page for a newly added project
     projects/<slug>/README.md              that project's notes file

   IMPORTANT: this page writes to GitHub, never to your computer. After
   publishing, run `git pull` in your local folder to bring the changes down.
   A browser cannot write to your disk, so there is no way around that.
   ========================================================================== */

import { $, $$, esc, slugify } from "./util.js";
import { initTheme } from "./theme.js";
import { createSiteEditor } from "./admin-site.js";

const KEY  = "portfolio-admin";
const DATA = "data/projects.json";
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg|avif)$/i;

let cfg = null, sha = null, projects = [], saved = "[]", pendingCover = null;

/* The three repeatable editors keep their rows here while you edit. */
let draftGallery = [];   // [{src, caption}]
let draftSections = [];  // [{heading, body}]
let draftFiles = [];     // [{label, path, note}]

const say = (el, text, ok) => {
  el.textContent = text;
  el.className = "msg full " + (ok ? "ok" : "err");
};

/* --------------------------------------------------------------------------
   GitHub plumbing
   -------------------------------------------------------------------------- */
async function gh(path, opts = {}, allow404 = false) {
  const res = await fetch(
    `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`,
    {
      ...opts,
      headers: {
        "Authorization": `Bearer ${cfg.token}`,
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(opts.headers || {})
      }
    }
  );
  if (res.status === 404 && allow404) return null;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      res.status === 401 ? "The token is wrong or expired."
      : res.status === 403 ? "The token doesn't have permission to write to this repository."
      : res.status === 404 ? "Repository or file not found. Check the username, repository and branch."
      : res.status === 409 ? "The file changed on GitHub since you loaded it. Reload this page and try again."
      : body.message || `GitHub error ${res.status}`
    );
  }
  return body;
}

const toB64 = str => {
  const bytes = new TextEncoder().encode(str);
  let bin = "";
  bytes.forEach(b => bin += String.fromCharCode(b));
  return btoa(bin);
};
const fromB64 = b64 =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), c => c.charCodeAt(0)));

/* Creating a file needs no sha; REPLACING one does — GitHub uses it to make
   sure you are editing the version you actually read. */
const put = (path, content, message, fileSha) =>
  gh(path, {
    method: "PUT",
    body: JSON.stringify({ message, content, branch: cfg.branch, ...(fileSha ? { sha: fileSha } : {}) })
  });

/* The Site content tab lives in its own module; it borrows this file's
   GitHub plumbing rather than opening a second connection. */
const siteEditor = createSiteEditor({
  gh, put, toB64, fromB64,
  ref: () => encodeURIComponent(cfg.branch)
});

/* --------------------------------------------------------------------------
   Load
   -------------------------------------------------------------------------- */
async function loadFromGitHub() {
  const file = await gh(`${DATA}?ref=${encodeURIComponent(cfg.branch)}`);
  sha = file.sha;
  projects = JSON.parse(fromB64(file.content))
    .map(p => ({ ...p, slug: p.slug || slugify(p.title) }));
  saved = JSON.stringify(projects);
}

/* --------------------------------------------------------------------------
   Connect
   -------------------------------------------------------------------------- */
$("#connect").onsubmit = e => {
  e.preventDefault();
  const f = e.target;
  cfg = {
    owner: f.owner.value.trim(),
    repo: f.repo.value.trim(),
    branch: f.branch.value.trim(),
    token: f.token.value.trim()
  };
  (f.remember.checked ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(cfg));
  connectAndLoad();
};

async function connectAndLoad() {
  say($("#connectMsg"), "Connecting…", true);
  try {
    await loadFromGitHub();
    $("#connectCard").hidden = true;
    $("#app").hidden = false;
    $("#tabs").hidden = false;
    $("#signout").hidden = false;
    renderList();
    dirtyCheck();
    await siteEditor.load();
    siteEditor.mount();
    siteEditor.setApiCfg(() => cfg);
  } catch (err) {
    say($("#connectMsg"), err.message);
    localStorage.removeItem(KEY);
    sessionStorage.removeItem(KEY);
  }
}

$("#signout").onclick = () => {
  if (isDirty() && !confirm("You have unpublished changes. Sign out anyway?")) return;
  localStorage.removeItem(KEY);
  sessionStorage.removeItem(KEY);
  location.reload();
};

/* --------------------------------------------------------------------------
   The list
   -------------------------------------------------------------------------- */
function renderList() {
  $("#list").innerHTML = projects.length ? projects.map((p, i) => `
    <li>
      <div class="name">
        <b>${esc(p.title)}</b>
        <span class="slug">projects/${esc(p.slug)}/</span><br>
        <span class="pill" data-s="${esc(p.status)}">${esc(p.status || "No status")}</span>
        <span class="pill">${esc(p.category)}</span>
        ${(p.gallery || []).length ? `<span class="pill">${p.gallery.length} image${p.gallery.length > 1 ? "s" : ""}</span>` : ""}
        ${(p.sections || []).length ? `<span class="pill">${p.sections.length} section${p.sections.length > 1 ? "s" : ""}</span>` : ""}
        ${(p.files || []).length ? `<span class="pill">${p.files.length} file${p.files.length > 1 ? "s" : ""}</span>` : ""}
        ${p.published === false ? `<span class="pill hidden">Hidden</span>` : ""}
        ${p.featured ? `<span class="pill">Featured</span>` : ""}
      </div>
      <div class="row">
        <button class="btn icon" data-up="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
        <button class="btn icon" data-down="${i}" ${i === projects.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
        <button class="btn small" data-edit="${i}">Edit</button>
        <button class="btn small danger" data-del="${i}">Delete</button>
      </div>
    </li>`).join("") : `<li class="hint">No projects yet. Add one above.</li>`;
}

$("#list").onclick = e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.up)   { const i = +d.up;   [projects[i - 1], projects[i]] = [projects[i], projects[i - 1]]; }
  if (d.down) { const i = +d.down; [projects[i + 1], projects[i]] = [projects[i], projects[i + 1]]; }
  if (d.edit) { fillForm(projects[+d.edit], +d.edit); $("#pform").scrollIntoView({ behavior: "smooth" }); return; }
  if (d.del) {
    if (!confirm(`Remove "${projects[+d.del].title}" from the list?\n\nThe folder projects/${projects[+d.del].slug}/ stays on GitHub — delete it there if you want it gone.`)) return;
    projects.splice(+d.del, 1);
    if ($("#pform").index.value === d.del) clearForm();
  }
  renderList();
  dirtyCheck();
};

/* --------------------------------------------------------------------------
   The form
   -------------------------------------------------------------------------- */
const form = $("#pform");

function fillForm(p, i) {
  clearForm();
  form.index.value = i;
  for (const k of ["title", "slug", "year", "summary", "image", "code_url", "demo_url", "org"]) {
    form[k].value = p[k] ?? "";
  }
  form.status.value = p.status || "In progress";
  form.category.value = p.category || "Other";
  form.details.value = (p.details || []).join("\n");
  form.tags.value = (p.tags || []).join(", ");
  form.published.checked = p.published !== false;
  form.featured.checked = !!p.featured;
  form.nda.checked = !!p.nda;

  draftGallery = (p.gallery || []).map(g => typeof g === "string" ? { src: g, caption: "" } : { ...g });
  draftSections = (p.sections || []).map(s => ({ ...s }));
  draftFiles = (p.files || []).map(f => ({ ...f }));
  renderGallery(); renderSections(); renderFiles();

  $("#formTitle").textContent = "Edit project";
  $("#addBtn").textContent = "Update in list";
  showPreview(p.image ? rawUrl(p.image) : "");
}

function clearForm() {
  form.reset();
  form.index.value = "";
  pendingCover = null;
  draftGallery = []; draftSections = []; draftFiles = [];
  renderGallery(); renderSections(); renderFiles();
  $("#formTitle").textContent = "Add a project";
  $("#addBtn").textContent = "Add to list";
  $("#imgPreview").innerHTML = "";
  $("#formMsg").textContent = "";
}
$("#clearBtn").onclick = clearForm;

/* Suggest a slug while typing a title, until the slug is edited by hand. */
let slugTouched = false;
form.slug.addEventListener("input", () => { slugTouched = true; });
form.title.addEventListener("input", () => {
  if (!slugTouched && form.index.value === "") form.slug.value = slugify(form.title.value);
});

const rawUrl = path => /^https?:/.test(path)
  ? path
  : `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${cfg.branch}/${path}`;

const showPreview = src =>
  $("#imgPreview").innerHTML = src ? `<img class="preview-img" src="${esc(src)}" alt="">` : "";

/** The slug the uploads should go under. Warns if there isn't one yet. */
function currentSlug(msgEl) {
  const s = slugify(form.slug.value || form.title.value);
  if (!s || s === "project") {
    if (msgEl) say(msgEl, "Give the project a title first — uploads need a folder name.", false);
    return null;
  }
  form.slug.value = s;
  return s;
}

/* Resize big photos in the browser before uploading, so the site stays fast. */
function resizeImage(file, maxW = 1400) {
  return new Promise((resolve, reject) => {
    if (file.type === "image/svg+xml" || file.type === "image/gif") {
      const r = new FileReader();
      r.onload = () => resolve({ b64: r.result.split(",")[1], ext: file.type === "image/gif" ? "gif" : "svg" });
      r.onerror = reject;
      r.readAsDataURL(file);
      return;
    }
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
      const data = c.toDataURL("image/jpeg", .82);
      resolve({ b64: data.split(",")[1], ext: "jpg", preview: data });
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => reject(new Error("That file couldn't be read as an image."));
    img.src = URL.createObjectURL(file);
  });
}

/** Read any file (PDF, .slx, zip) as base64 without touching its bytes. */
const readAsB64 = file => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result.split(",")[1]);
  r.onerror = reject;
  r.readAsDataURL(file);
});

/* ---- cover image: uploaded when you press Add to list ---- */
form.file.onchange = async () => {
  const f = form.file.files[0];
  if (!f) return;
  try {
    pendingCover = await resizeImage(f);
    showPreview(pendingCover.preview || URL.createObjectURL(f));
    say($("#formMsg"), "Cover ready. It uploads when you add the project.", true);
  } catch (err) {
    say($("#formMsg"), err.message);
    pendingCover = null;
  }
};

/* --------------------------------------------------------------------------
   Gallery editor
   -------------------------------------------------------------------------- */
function renderGallery() {
  const wrap = $("#galleryRows");
  if (!draftGallery.length) {
    wrap.innerHTML = `<p class="hint">No extra images. Upload some, or press Scan folder to pick up files you added by hand.</p>`;
    return;
  }
  wrap.innerHTML = draftGallery.map((g, i) => `
    <div class="ed-row">
      <img class="ed-thumb" src="${esc(cfg ? rawUrl(g.src) : g.src)}" alt="">
      <div class="ed-fields">
        <input class="ed-path" value="${esc(g.src)}" data-i="${i}" data-k="src" aria-label="Image path">
        <input value="${esc(g.caption || "")}" data-i="${i}" data-k="caption" placeholder="Caption (optional)" aria-label="Caption">
      </div>
      <div class="ed-btns">
        <button class="btn icon" type="button" data-gup="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
        <button class="btn icon" type="button" data-gdown="${i}" ${i === draftGallery.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
        <button class="btn icon danger" type="button" data-gdel="${i}" aria-label="Remove">✕</button>
      </div>
    </div>`).join("");
}

$("#galleryRows").addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.k) draftGallery[+el.dataset.i][el.dataset.k] = el.value;
});
$("#galleryRows").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.gup)   { const i = +d.gup;   [draftGallery[i - 1], draftGallery[i]] = [draftGallery[i], draftGallery[i - 1]]; }
  if (d.gdown) { const i = +d.gdown; [draftGallery[i + 1], draftGallery[i]] = [draftGallery[i], draftGallery[i + 1]]; }
  if (d.gdel)  draftGallery.splice(+d.gdel, 1);
  renderGallery();
});

/* Upload several images at once, straight into this project's images folder. */
$("#galleryFiles").onchange = async e => {
  const files = [...e.target.files];
  e.target.value = "";
  if (!files.length) return;
  const msg = $("#galleryMsg");
  const slug = currentSlug(msg);
  if (!slug) return;

  let n = 0;
  for (const f of files) {
    try {
      say(msg, `Uploading ${++n} of ${files.length}: ${f.name}…`, true);
      const img = await resizeImage(f);
      const path = `projects/${slug}/images/${slugify(f.name.replace(/\.[^.]+$/, ""))}-${Date.now().toString(36)}.${img.ext}`;
      await put(path, img.b64, `Add image ${path}`);
      draftGallery.push({ src: path, caption: "" });
      renderGallery();
    } catch (err) {
      say(msg, `${f.name}: ${err.message}`, false);
      return;
    }
  }
  say(msg, `Uploaded ${files.length} image${files.length > 1 ? "s" : ""}. Add captions, then press ${form.index.value === "" ? "Add to list" : "Update in list"}.`, true);
};

/* Pick up images that are already in the folder on GitHub — the ones you
   copied in locally and pushed. */
$("#scanBtn").onclick = async () => {
  const msg = $("#galleryMsg");
  const slug = currentSlug(msg);
  if (!slug) return;
  const btn = $("#scanBtn");
  btn.disabled = true;
  try {
    say(msg, "Reading the folder on GitHub…", true);
    const listing = await gh(`projects/${slug}/images?ref=${encodeURIComponent(cfg.branch)}`, {}, true);
    if (!Array.isArray(listing)) {
      say(msg, `projects/${slug}/images/ doesn't exist on GitHub yet. Push your local files first.`, false);
    } else {
      const known = new Set([form.image.value.trim(), ...draftGallery.map(g => g.src)]);
      const found = listing
        .filter(f => f.type === "file" && IMAGE_EXT.test(f.name))
        .map(f => f.path)
        .filter(p => !known.has(p));
      found.forEach(src => draftGallery.push({ src, caption: "" }));
      renderGallery();
      say(msg, found.length
        ? `Added ${found.length} image${found.length > 1 ? "s" : ""} from the folder.`
        : "Nothing new in that folder — everything there is already listed.", true);
    }
  } catch (err) {
    say(msg, err.message, false);
  }
  btn.disabled = false;
};

/* --------------------------------------------------------------------------
   Sections editor
   -------------------------------------------------------------------------- */
function renderSections() {
  const wrap = $("#sectionRows");
  if (!draftSections.length) {
    wrap.innerHTML = `<p class="hint">No extra sections. Add one for Results, Theory, References — anything that deserves its own heading.</p>`;
    return;
  }
  wrap.innerHTML = draftSections.map((s, i) => `
    <div class="ed-row col">
      <div class="ed-top">
        <input value="${esc(s.heading || "")}" data-i="${i}" data-k="heading" placeholder="Heading, e.g. Results" aria-label="Section heading">
        <div class="ed-btns">
          <button class="btn icon" type="button" data-sup="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
          <button class="btn icon" type="button" data-sdown="${i}" ${i === draftSections.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
          <button class="btn icon danger" type="button" data-sdel="${i}" aria-label="Remove">✕</button>
        </div>
      </div>
      <textarea data-i="${i}" data-k="body" placeholder="Text. Blank line starts a new paragraph; lines starting with - become bullets." aria-label="Section text">${esc(s.body || "")}</textarea>
    </div>`).join("");
}

$("#sectionRows").addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.k) draftSections[+el.dataset.i][el.dataset.k] = el.value;
});
$("#sectionRows").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.sup)   { const i = +d.sup;   [draftSections[i - 1], draftSections[i]] = [draftSections[i], draftSections[i - 1]]; }
  if (d.sdown) { const i = +d.sdown; [draftSections[i + 1], draftSections[i]] = [draftSections[i], draftSections[i + 1]]; }
  if (d.sdel)  draftSections.splice(+d.sdel, 1);
  renderSections();
});
$("#addSection").onclick = () => {
  draftSections.push({ heading: "", body: "" });
  renderSections();
  $("#sectionRows").querySelector(".ed-row:last-child input")?.focus();
};

/* --------------------------------------------------------------------------
   Attachments editor
   -------------------------------------------------------------------------- */
function renderFiles() {
  const wrap = $("#fileRows");
  if (!draftFiles.length) {
    wrap.innerHTML = `<p class="hint">No attachments. Upload a manual, a model file or a report to offer it as a download.</p>`;
    return;
  }
  wrap.innerHTML = draftFiles.map((f, i) => `
    <div class="ed-row">
      <span class="ed-ext">${esc((f.path.split(".").pop() || "").toUpperCase().slice(0, 5))}</span>
      <div class="ed-fields">
        <input value="${esc(f.label || "")}" data-i="${i}" data-k="label" placeholder="Label, e.g. Construction manual" aria-label="File label">
        <input value="${esc(f.note || "")}" data-i="${i}" data-k="note" placeholder="Note, e.g. 12 pages · PDF" aria-label="File note">
        <input class="ed-path" value="${esc(f.path)}" data-i="${i}" data-k="path" aria-label="File path">
      </div>
      <div class="ed-btns">
        <button class="btn icon" type="button" data-fup="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
        <button class="btn icon" type="button" data-fdown="${i}" ${i === draftFiles.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
        <button class="btn icon danger" type="button" data-fdel="${i}" aria-label="Remove">✕</button>
      </div>
    </div>`).join("");
}

$("#fileRows").addEventListener("input", e => {
  const el = e.target;
  if (el.dataset.k) draftFiles[+el.dataset.i][el.dataset.k] = el.value;
});
$("#fileRows").addEventListener("click", e => {
  const b = e.target.closest("button");
  if (!b) return;
  const d = b.dataset;
  if (d.fup)   { const i = +d.fup;   [draftFiles[i - 1], draftFiles[i]] = [draftFiles[i], draftFiles[i - 1]]; }
  if (d.fdown) { const i = +d.fdown; [draftFiles[i + 1], draftFiles[i]] = [draftFiles[i], draftFiles[i + 1]]; }
  if (d.fdel)  draftFiles.splice(+d.fdel, 1);
  renderFiles();
});

$("#docFiles").onchange = async e => {
  const files = [...e.target.files];
  e.target.value = "";
  if (!files.length) return;
  const msg = $("#filesMsg");
  const slug = currentSlug(msg);
  if (!slug) return;

  for (const f of files) {
    // GitHub's contents API is happy up to ~25 MB through this route.
    if (f.size > 25 * 1024 * 1024) {
      say(msg, `${f.name} is ${(f.size / 1048576).toFixed(1)} MB — too big to upload here. Add it with git instead.`, false);
      return;
    }
    try {
      say(msg, `Uploading ${f.name}…`, true);
      const b64 = await readAsB64(f);
      const path = `projects/${slug}/${f.name.replace(/[^\w.\-]+/g, "_")}`;
      const existing = await gh(`${path}?ref=${encodeURIComponent(cfg.branch)}`, {}, true);
      await put(path, b64, `Add ${path}`, existing?.sha);
      draftFiles.push({
        label: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " "),
        path,
        note: `${(f.size / 1048576).toFixed(1)} MB`
      });
      renderFiles();
    } catch (err) {
      say(msg, `${f.name}: ${err.message}`, false);
      return;
    }
  }
  say(msg, `Uploaded ${files.length} file${files.length > 1 ? "s" : ""}. Edit the labels, then update the project.`, true);
};

/* --------------------------------------------------------------------------
   Save the form into the list
   -------------------------------------------------------------------------- */
form.onsubmit = async e => {
  e.preventDefault();
  const msg = $("#formMsg");
  $("#addBtn").disabled = true;
  try {
    const slug = currentSlug(msg);
    if (!slug) { $("#addBtn").disabled = false; return; }

    let image = form.image.value.trim();
    if (pendingCover) {
      say(msg, "Uploading cover…", true);
      const path = `projects/${slug}/images/cover-${Date.now().toString(36)}.${pendingCover.ext}`;
      await put(path, pendingCover.b64, `Add image ${path}`);
      image = path;
      pendingCover = null;
    }

    const p = {
      slug,
      title: form.title.value.trim(),
      year: form.year.value.trim(),
      category: form.category.value,
      org: form.org.value.trim(),
      status: form.status.value,
      featured: form.featured.checked,
      published: form.published.checked,
      nda: form.nda.checked,
      summary: form.summary.value.trim(),
      details: form.details.value.split("\n").map(s => s.trim()).filter(Boolean),
      tags: form.tags.value.split(",").map(s => s.trim()).filter(Boolean),
      image,
      gallery: draftGallery.filter(g => g.src.trim()).map(g => ({ src: g.src.trim(), caption: (g.caption || "").trim() })),
      sections: draftSections.filter(s => (s.heading || "").trim() || (s.body || "").trim())
                             .map(s => ({ heading: (s.heading || "").trim(), body: (s.body || "").trim() })),
      files: draftFiles.filter(f => (f.path || "").trim())
                       .map(f => ({ label: (f.label || "").trim(), path: f.path.trim(), note: (f.note || "").trim() })),
      code_url: form.code_url.value.trim(),
      demo_url: form.demo_url.value.trim()
    };

    const i = form.index.value;
    if (i === "") projects.unshift(p); else projects[+i] = p;
    renderList();
    dirtyCheck();
    clearForm();
    slugTouched = false;
    say(msg, `"${p.title}" ${i === "" ? "added" : "updated"}. Press Publish when you're done.`, true);
  } catch (err) {
    say(msg, "Couldn't save: " + err.message);
  }
  $("#addBtn").disabled = false;
};

/* --------------------------------------------------------------------------
   Publish — write projects.json, and create any missing project pages
   -------------------------------------------------------------------------- */
let templates = null;

async function getTemplates() {
  if (templates) return templates;
  const [page, readme] = await Promise.all([
    fetch("assets/templates/project-page.html").then(r => r.text()),
    fetch("assets/templates/project-readme.md").then(r => r.text())
  ]);
  templates = { page, readme };
  return templates;
}

const fill = (tpl, map) =>
  tpl.replace(/\{\{([A-Z]+)\}\}/g, (m, k) => (k in map ? map[k] : m));

/** Give every project a folder with a page and a notes file, if it lacks one. */
async function ensurePages(report) {
  const { page, readme } = await getTemplates();
  let made = 0;
  for (const p of projects) {
    const path = `projects/${p.slug}/index.html`;
    const exists = await gh(`${path}?ref=${encodeURIComponent(cfg.branch)}`, {}, true);
    if (exists) continue;

    report(`Creating projects/${p.slug}/ …`);
    await put(path, toB64(fill(page, {
      TITLE: esc(p.title),
      DESC: esc(p.summary),
      CATEGORY: esc(p.category || "Project")
    })), `Add page for ${p.slug}`);

    await put(`projects/${p.slug}/README.md`, toB64(fill(readme, {
      SLUG: p.slug,
      TITLE: p.title,
      DESC: p.summary,
      STATUS: p.status || "—",
      CATEGORY: p.category || "—",
      YEAR: p.year || "—",
      ORG: p.org || "—",
      TAGS: (p.tags || []).join(", ") || "—",
      DETAILS: (p.details || []).map(d => `- ${d}`).join("\n") || "_Not written up yet._"
    })), `Add notes for ${p.slug}`);
    made++;
  }
  return made;
}

const isDirty = () => JSON.stringify(projects) !== saved;

function dirtyCheck() {
  $("#savebar").classList.toggle("on", isDirty());
  $("#saveText").textContent = "You have unpublished changes.";
  $("#pullNote").hidden = true;
}

$("#discardBtn").onclick = () => {
  if (!confirm("Discard all unpublished changes?")) return;
  projects = JSON.parse(saved);
  renderList();
  clearForm();
  dirtyCheck();
};

$("#publishBtn").onclick = async () => {
  const btn = $("#publishBtn");
  const out = $("#saveText");
  btn.disabled = true;
  out.textContent = "Publishing…";
  try {
    const made = await ensurePages(t => out.textContent = t);
    const res = await put(
      DATA,
      toB64(JSON.stringify(projects, null, 2) + "\n"),
      "Update projects from admin page",
      sha
    );
    sha = res.content.sha;   // keep the new version id for the next publish
    saved = JSON.stringify(projects);
    out.textContent = made
      ? `Published, and created ${made} new project folder${made > 1 ? "s" : ""}. The site updates in 1–2 minutes.`
      : "Published. The site updates in 1–2 minutes.";
    // Everything above happened on GitHub. Remind me to bring it down.
    $("#pullNote").hidden = false;
    $("#savebar").classList.add("on");
  } catch (err) {
    out.textContent = "Couldn't publish: " + err.message;
  }
  btn.disabled = false;
};

$("#copyPull").onclick = async () => {
  try {
    await navigator.clipboard.writeText("git pull");
    $("#copyPull").textContent = "Copied";
    setTimeout(() => $("#copyPull").textContent = "Copy", 1600);
  } catch { /* clipboard blocked: the text is on screen anyway */ }
};

addEventListener("beforeunload", e => {
  if (isDirty() || siteEditor.isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

/* ---- tab switching: Projects | Site content ---- */
$$(".tab").forEach(btn => btn.onclick = () => {
  const target = btn.dataset.tab;
  $$(".tab").forEach(b => b.setAttribute("aria-selected", String(b === btn)));
  $$(".tabpanel").forEach(p => p.hidden = p.id !== `tab-${target}`);
  // Only one save bar should be visible at a time.
  $("#savebar").classList.toggle("muted-bar", target !== "projects");
  $("#siteBar").classList.toggle("muted-bar", target !== "site");
});

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
initTheme();
renderGallery(); renderSections(); renderFiles();
const stored = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
if (stored) { cfg = JSON.parse(stored); connectAndLoad(); }
