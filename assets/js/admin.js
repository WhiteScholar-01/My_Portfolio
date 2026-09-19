/* ==========================================================================
   admin.js — the project manager
   --------------------------------------------------------------------------
   Talks to the GitHub Contents API with a fine-grained personal access token
   that you paste in. Nothing is stored on a server; the token lives only in
   this browser (sessionStorage, or localStorage if you tick "remember").

   What it writes:
     data/projects.json                     the project list the site reads
     projects/<slug>/images/<file>          uploaded images
     projects/<slug>/index.html             a page for a newly added project
     projects/<slug>/README.md              that project's notes file
   ========================================================================== */

import { $, esc, slugify } from "./util.js";
import { initTheme } from "./theme.js";

const KEY  = "portfolio-admin";
const DATA = "data/projects.json";

let cfg = null, sha = null, projects = [], saved = "[]", pendingImage = null;

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
    $("#signout").hidden = false;
    renderList();
    dirtyCheck();
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
  $("#formTitle").textContent = "Edit project";
  $("#addBtn").textContent = "Update in list";
  showPreview(p.image ? rawUrl(p.image) : "");
}

function clearForm() {
  form.reset();
  form.index.value = "";
  pendingImage = null;
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

form.file.onchange = async () => {
  const f = form.file.files[0];
  if (!f) return;
  try {
    pendingImage = await resizeImage(f);
    showPreview(pendingImage.preview || URL.createObjectURL(f));
    say($("#formMsg"), "Image ready. It uploads when you add the project.", true);
  } catch (err) {
    say($("#formMsg"), err.message);
    pendingImage = null;
  }
};

form.onsubmit = async e => {
  e.preventDefault();
  const msg = $("#formMsg");
  $("#addBtn").disabled = true;
  try {
    const slug = slugify(form.slug.value || form.title.value);
    form.slug.value = slug;

    let image = form.image.value.trim();
    if (pendingImage) {
      say(msg, "Uploading image…", true);
      // Images live with their project, not in one shared bucket.
      const path = `projects/${slug}/images/cover-${Date.now().toString(36)}.${pendingImage.ext}`;
      await put(path, pendingImage.b64, `Add image ${path}`);
      image = path;
      pendingImage = null;
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
      summary: form.summary.value.trim(),
      details: form.details.value.split("\n").map(s => s.trim()).filter(Boolean),
      tags: form.tags.value.split(",").map(s => s.trim()).filter(Boolean),
      image,
      gallery: (projects[+form.index.value]?.gallery) || [],
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
    say(msg, "Couldn't upload the image: " + err.message);
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
      SLUG: p.slug,
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
    setTimeout(dirtyCheck, 5000);
    $("#savebar").classList.add("on");
  } catch (err) {
    out.textContent = "Couldn't publish: " + err.message;
  }
  btn.disabled = false;
};

addEventListener("beforeunload", e => {
  if (isDirty()) { e.preventDefault(); e.returnValue = ""; }
});

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
initTheme();
const stored = localStorage.getItem(KEY) || sessionStorage.getItem(KEY);
if (stored) { cfg = JSON.parse(stored); connectAndLoad(); }
