/* ==========================================================================
   site.js — home page behaviour
   --------------------------------------------------------------------------
   Order matters here. The page content comes from data/site.json and has to
   be written into the DOM BEFORE the intro animation splits the headline and
   before the scroll chrome measures the timeline — otherwise those two would
   work on markup that is about to be replaced.

   If data/site.json is missing or unreadable, nothing is replaced and the
   fallback markup already in index.html stands. The site never goes blank.
   ========================================================================== */

import { $, $$, esc, url, loadProjects, STATUS_ORDER, PLACEHOLDER } from "./util.js";
import { initTheme } from "./theme.js";
import { initHero } from "./hero.js";

window.__jsReady = true;

/* --------------------------------------------------------------------------
   0. Page content from data/site.json
   -------------------------------------------------------------------------- */
async function loadSite() {
  try {
    // "no-cache" revalidates but still allows a 304, so a repeat visit costs
    // headers instead of the whole file. "no-store" forced a full download
    // on every single page view.
    const res = await fetch("data/site.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.warn("data/site.json not loaded — using the markup in index.html.", err);
    return null;
  }
}

/** Escape, then allow **bold** only. Keeps author text safe but expressive. */
const bold = s => esc(s).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");

const setText = (sel, value) => {
  const el = $(sel);
  if (el && value != null && value !== "") el.textContent = value;
};

function applySite(site) {
  if (!site) return;

  /* ---- hero ---- */
  const h = site.hero || {};
  if (h.name) $("#heroName").textContent = h.name;
  if (h.lede) $("#heroLede").textContent = h.lede;
  setText("#heroResumeLabel", h.resumeLabel);
  if (h.ctaLabel) $("#heroCta").textContent = h.ctaLabel;
  if (h.ctaHref) $("#heroCta").setAttribute("href", h.ctaHref);

  const eyebrow = $("#heroEyebrow");
  if (eyebrow) {
    // Empty string means "no eyebrow" — that is the default.
    if (h.eyebrow) { eyebrow.textContent = h.eyebrow; eyebrow.hidden = false; }
    else { eyebrow.hidden = true; }
  }

  /* ---- proof numbers ---- */
  const stats = $("#heroStats");
  if (stats && Array.isArray(site.stats) && site.stats.length) {
    stats.innerHTML = site.stats
      .filter(s => s && (s.value || s.label))
      .map(s => `<div><dt>${esc(s.value)}</dt><dd>${esc(s.label)}</dd></div>`)
      .join("");
    stats.hidden = false;
  }

  /* ---- about ---- */
  const a = site.about || {};
  setText("#aboutHeading", a.heading);
  if (Array.isArray(a.paragraphs) && a.paragraphs.length) {
    $("#aboutBody").innerHTML = a.paragraphs
      .filter(Boolean).map(p => `<p>${bold(p)}</p>`).join("");
  }
  if (Array.isArray(a.panel) && a.panel.length) {
    $("#aboutPanel").innerHTML = a.panel
      .filter(r => r && (r.label || r.value))
      .map(r => `<div><dt>${esc(r.label)}</dt><dd>${esc(r.value)}</dd></div>`)
      .join("");
  }

  /* ---- experience ---- */
  const x = site.experience || {};
  setText("#expIntro", x.intro);
  if (Array.isArray(x.items) && x.items.length) {
    $("#timeline").innerHTML = x.items.filter(Boolean).map(j => `
      <li class="reveal"><div class="job sheet ticked">
        <div class="job-top"><h3>${esc(j.role)}</h3><span class="when">${esc(j.when || "")}</span></div>
        ${j.org ? `<p class="org">${esc(j.org)}</p>` : ""}
        ${(j.bullets || []).length
          ? `<ul>${j.bullets.filter(Boolean).map(b => `<li>${esc(b)}</li>`).join("")}</ul>`
          : ""}
      </div></li>`).join("");
  }

  /* ---- skills ---- */
  const sk = site.skills || {};
  if (sk.note) { const n = $("#skillsNote"); n.textContent = sk.note; n.hidden = false; }
  if (Array.isArray(sk.groups) && sk.groups.length) {
    $("#skillsGrid").innerHTML = sk.groups.filter(Boolean).map(g => `
      <div class="skill sheet reveal">
        <h3>${esc(g.title)}</h3>
        <ul>${(g.items || []).filter(Boolean).map(i => `<li>${esc(i)}</li>`).join("")}</ul>
      </div>`).join("");
  }

  /* ---- resume ---- */
  const r = site.resume || {};
  setText("#resumeIntro", r.intro);
  if (r.updated) {
    const u = $("#resumeUpdated");
    u.textContent = `Last updated ${r.updated}`;
    u.hidden = false;
  }
  if (Array.isArray(r.certs) && r.certs.length) {
    $("#certs").innerHTML = r.certs
      .filter(c => c && (c.title || c.issuer))
      .map(c => `<li>${esc(c.title)}<span>${esc(c.issuer || "")}</span></li>`)
      .join("");
  }

  /* ---- contact ---- */
  const c = site.contact || {};
  setText("#contactHeading", c.heading);
  setText("#contactText", c.text);
  renderContactCard(c);

  /* ---- footer ---- */
  setText("#footerLoc", site.footer?.location);
}


/* --------------------------------------------------------------------------
   Contact card
   --------------------------------------------------------------------------
   The values are printed, not hidden behind a button. A mailto: link does
   nothing at all on a machine with no mail client configured, so the address
   has to be readable — and copyable in one click — on its own.
   -------------------------------------------------------------------------- */
const ICON = {
  email: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>`,
  github: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48l-.01-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.61.07-.61 1 .07 1.53 1.03 1.53 1.03.89 1.53 2.34 1.09 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.56-1.11-4.56-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85l-.01 2.75c0 .27.18.58.69.48A10 10 0 0 0 12 2z"/></svg>`,
  linkedin: `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M4.98 3.5a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.05c.53-.95 1.83-1.95 3.77-1.95C20.5 8.75 21 11 21 14v7h-4v-6.2c0-1.48-.03-3.38-2.06-3.38-2.06 0-2.38 1.6-2.38 3.27V21H9z"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .3 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.4 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/></svg>`
};

/** Show a handle rather than a whole URL: github.com/x -> x */
const handle = (u, prefix = "") => {
  try {
    const parts = new URL(u).pathname.split("/").filter(Boolean);
    return prefix + parts.slice(-1)[0];
  } catch { return u; }
};

function renderContactCard(c) {
  const box = $("#contactCard");
  if (!box) return;
  const cells = [
    c.email && { k: "email", label: "Email", href: `mailto:${c.email}`, text: c.email, copy: c.email },
    c.github && { k: "github", label: "GitHub", href: c.github, text: handle(c.github), ext: true },
    c.linkedin && { k: "linkedin", label: "LinkedIn", href: c.linkedin, text: handle(c.linkedin, "in/"), ext: true },
    c.phone && { k: "phone", label: "Phone", href: `tel:${String(c.phone).replace(/[^+\d]/g, "")}`, text: c.phone, copy: c.phone }
  ].filter(Boolean);
  if (!cells.length) return;

  box.innerHTML = cells.map(cell => `
    <div class="cc sheet">
      <span class="cc-label">${ICON[cell.k]}${esc(cell.label)}</span>
      <a class="cc-value" href="${esc(cell.href)}"${cell.ext ? ' target="_blank" rel="noopener"' : ""}>${esc(cell.text)}</a>
      ${cell.copy ? `<button class="cc-copy" type="button" data-copy="${esc(cell.copy)}" aria-label="Copy ${esc(cell.label).toLowerCase()}">Copy</button>` : ""}
    </div>`).join("");

  box.onclick = async e => {
    const b = e.target.closest(".cc-copy");
    if (!b) return;
    try {
      await navigator.clipboard.writeText(b.dataset.copy);
    } catch {
      // Clipboard API needs a secure context; fall back to selecting the text.
      const r = document.createRange();
      r.selectNodeContents(b.previousElementSibling);
      getSelection().removeAllRanges();
      getSelection().addRange(r);
    }
    b.textContent = "Copied";
    b.classList.add("done");
    setTimeout(() => { b.textContent = "Copy"; b.classList.remove("done"); }, 1600);
  };
}

/* --------------------------------------------------------------------------
   A. Intro — the name rises one letter at a time
   -------------------------------------------------------------------------- */
function initIntro() {
  const h1 = $("[data-split]");
  if (!h1) return;
  const text = h1.textContent;
  h1.setAttribute("aria-label", text);
  h1.innerHTML = [...text]
    .map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`)
    .join("");
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));
}

/* --------------------------------------------------------------------------
   B. The job title types itself
   -------------------------------------------------------------------------- */
function initRoles(roles) {
  const out = $("#roleText");
  if (!out) return;
  const list = (roles || []).filter(Boolean);
  if (!list.length) return;

  out.textContent = list[0];
  if (list.length === 1) { $(".caret")?.setAttribute("hidden", ""); return; }

  const mq = matchMedia("(prefers-reduced-motion: reduce)");
  const caret = $(".caret");
  let timer = null, i = 0;

  const stop = () => { clearTimeout(timer); clearInterval(timer); timer = null; };

  /* Reduce-motion is about movement, not about withholding content, so the
     titles still cycle — they cross-fade instead of typing, with no caret. */
  const crossFade = () => {
    caret?.setAttribute("hidden", "");
    out.style.transition = "opacity .3s ease";
    out.style.opacity = "1";
    timer = setInterval(() => {
      i = (i + 1) % list.length;
      out.style.opacity = "0";
      setTimeout(() => { out.textContent = list[i]; out.style.opacity = "1"; }, 300);
    }, 2600);
  };

  const typewriter = () => {
    caret?.removeAttribute("hidden");
    out.style.transition = "";
    out.style.opacity = "1";
    let n = list[i].length, deleting = true;
    const tick = () => {
      const w = list[i];
      out.textContent = w.slice(0, n);
      if (!deleting && n === w.length) { deleting = true;  timer = setTimeout(tick, 1800); return; }
      if (deleting && n === 0)         { deleting = false; i = (i + 1) % list.length; timer = setTimeout(tick, 280); return; }
      n += deleting ? -1 : 1;
      timer = setTimeout(tick, deleting ? 28 : 55);
    };
    // Short lead-in: a rotation nobody waits around for looks broken.
    timer = setTimeout(tick, 1200);
  };

  const start = () => { stop(); (mq.matches ? crossFade : typewriter)(); };
  start();
  // If the visitor flips "reduce motion" while the page is open, switch modes.
  mq.addEventListener?.("change", start);
}

/* --------------------------------------------------------------------------
   C. Scroll chrome — progress bar, sticky nav, active link, timeline fill
   Runs after the timeline is rendered, so it measures the real entries.
   -------------------------------------------------------------------------- */
function initScrollChrome() {
  const bar = $("#progress"), top = $("#topbar"), tl = $("#timeline");
  const dots  = tl ? [...tl.children] : [];
  const links = $$("nav a[href^='#']");
  const secs  = links.map(a => $(a.getAttribute("href")));
  let queued = false;

  const update = () => {
    const d = document.documentElement;
    if (bar) bar.style.transform = `scaleX(${d.scrollTop / ((d.scrollHeight - d.clientHeight) || 1)})`;
    if (top) top.classList.toggle("scrolled", d.scrollTop > 20);

    const mid = innerHeight * .62;
    if (tl) {
      const r = tl.getBoundingClientRect();
      tl.style.setProperty("--p", Math.max(0, Math.min(1, (mid - r.top) / r.height)));
      dots.forEach(li => li.classList.toggle("lit", li.getBoundingClientRect().top + 14 < mid));
    }
    let cur = -1;
    secs.forEach((s, k) => { if (s && s.getBoundingClientRect().top < 140) cur = k; });
    links.forEach((a, k) => a.classList.toggle("current", k === cur));
    queued = false;
  };

  addEventListener("scroll", () => {
    if (!queued) { queued = true; requestAnimationFrame(update); }
  }, { passive: true });
  addEventListener("resize", update);
  update();
}

/* --------------------------------------------------------------------------
   D. Reveal on scroll
   -------------------------------------------------------------------------- */
let observer;
function reveals() {
  const items = $$(".reveal:not(.in)");
  if (!("IntersectionObserver" in window)) return items.forEach(n => n.classList.add("in"));
  observer ??= new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add("in"); observer.unobserve(e.target); }
  }), { threshold: .12, rootMargin: "0px 0px -40px 0px" });
  items.forEach((n, i) => {
    const staggered = n.parentElement?.classList.contains("skills") || n.parentElement?.id === "grid";
    n.style.transitionDelay = staggered ? `${(i % 4) * 70}ms` : "";
    observer.observe(n);
  });
}

/* --------------------------------------------------------------------------
   E. Projects — cards from data/projects.json, plus the quick-look dialog
   -------------------------------------------------------------------------- */
let projects = [], byCategory = "All", byStatus = "All";

const statusBadge = s => s ? `<span class="status-badge" data-s="${esc(s)}">${esc(s)}</span>` : "";

function card(p, i) {
  const img = p.image
    ? `<img src="${esc(url(p.image))}" alt="" loading="lazy" decoding="async">`
    : `<div class="ph">${PLACEHOLDER}</div>`;
  const big = p.featured && byCategory === "All" && byStatus === "All";
  return `<article class="card reveal${big ? " featured" : ""}">
    <div class="thumb">${img}${statusBadge(p.status)}</div>
    <div class="body">
      <div class="meta"><span class="cat">${esc(p.category)}</span><span>${esc(p.year || "—")}</span></div>
      <h3><a class="stretch" href="projects/${esc(p.slug)}/">${esc(p.title)}</a></h3>
      <p>${esc(p.summary)}</p>
      <div class="tags">${(p.tags || []).slice(0, 4).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <button class="peek" type="button" data-i="${i}" aria-haspopup="dialog">Quick look</button>
    </div>
  </article>`;
}

function chipRow(list, current, attr, label) {
  return `<div class="toolbar" role="group" aria-label="${esc(label)}">
    <span class="label">${esc(label)}</span>
    ${list.map(c => `<button class="chip small" type="button" aria-pressed="${c === current}" data-${attr}="${esc(c)}">${esc(c)}</button>`).join("")}
  </div>`;
}

function render() {
  const grid = $("#grid"), filters = $("#filters");
  if (!grid) return;
  if (!projects.length) { grid.innerHTML = `<p class="status">No projects to show yet.</p>`; return; }

  const cats  = ["All", ...new Set(projects.map(p => p.category))];
  const stats = ["All", ...STATUS_ORDER.filter(s => projects.some(p => p.status === s))];

  filters.innerHTML = chipRow(cats, byCategory, "v", "Area")
    + (stats.length > 2 ? chipRow(stats, byStatus, "st", "Status") : "");
  $$("[data-v]", filters).forEach(b => b.onclick = () => { byCategory = b.dataset.v; render(); });
  $$("[data-st]", filters).forEach(b => b.onclick = () => { byStatus = b.dataset.st; render(); });

  const shown = projects
    .map((p, i) => [p, i])
    .filter(([p]) => (byCategory === "All" || p.category === byCategory)
                  && (byStatus   === "All" || p.status   === byStatus));

  grid.innerHTML = shown.length
    ? shown.map(([p, i]) => card(p, i)).join("")
    : `<p class="status">Nothing matches those filters.</p>`;

  $$(".peek", grid).forEach(b => b.onclick = () => openModal(projects[+b.dataset.i]));
  reveals();
}

const modal = $("#modal");
function openModal(p) {
  if (!p || !modal) return;
  const links = [
    `<a class="btn small primary" href="projects/${esc(p.slug)}/">Full write-up</a>`,
    p.code_url && `<a class="btn small" href="${esc(p.code_url)}" target="_blank" rel="noopener">Code</a>`,
    p.demo_url && `<a class="btn small" href="${esc(p.demo_url)}" target="_blank" rel="noopener">See it live</a>`
  ].filter(Boolean).join("");

  $("#mContent").innerHTML = `
    ${p.image ? `<div class="m-img"><img src="${esc(url(p.image))}" alt=""></div>` : ""}
    <div class="m-body">
      <div class="meta">
        <span class="cat">${esc(p.category)}${p.status ? " · " + esc(p.status) : ""}</span>
        <span>${esc(p.year || "")}</span>
      </div>
      <h3 id="mTitle">${esc(p.title)}</h3>
      <p class="muted">${esc(p.summary)}</p>
      ${p.details?.length ? `<ul>${p.details.map(d => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}
      <div class="tags" style="margin:18px 0">${(p.tags || []).map(t => `<span>${esc(t)}</span>`).join("")}</div>
      <div class="actions">${links}</div>
    </div>`;
  modal.showModal();
}

if (modal) {
  $("#mClose").onclick = () => modal.close();
  modal.addEventListener("click", e => { if (e.target === modal) modal.close(); });
}

/* --------------------------------------------------------------------------
   F. Menu, year
   -------------------------------------------------------------------------- */
function initMenu() {
  const btn = $(".menu-btn"), list = $("#navlist");
  if (!btn || !list) return;
  btn.onclick = () => btn.setAttribute("aria-expanded", list.classList.toggle("open"));
  $$("a", list).forEach(a => a.addEventListener("click", () => {
    list.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
/* Both data files are needed, and neither depends on the other — so ask for
   them at the same time rather than one after the other. */
const sitePromise = loadSite();
const projectsPromise = loadProjects()
  .then(all => all.filter(p => p.published !== false))
  .catch(err => { console.error("Couldn't load data/projects.json —", err); return null; });

const site = await sitePromise;
applySite(site);

initIntro();
initRoles(site?.hero?.roles ?? [
  "Electrical engineer", "Lead engineer at Orbitalink",
  "Motor drive researcher", "Satellite tracker builder"
]);
initScrollChrome();
initMenu();
initTheme();
initHero($("#sky"));

const yr = $("#yr");
if (yr) yr.textContent = new Date().getFullYear();

reveals();

const loaded = await projectsPromise;
if (loaded) {
  projects = loaded;
  render();
  const projStat = $$("#heroStats dd").find(dd => dd.textContent.toLowerCase().includes("project"));
  if (projStat && projStat.previousElementSibling) {
    projStat.previousElementSibling.textContent = projects.length;
  }
} else {
  $("#grid").innerHTML = `<p class="status">Projects couldn't load. Check that <code>data/projects.json</code> exists.</p>`;
}

/* The resume preview embeds a PDF. Only fetch it once it is close to the
   viewport — on a phone the preview is display:none and it is never fetched
   at all, which saves the whole file on the platform that can least afford it. */
(() => {
  const obj = $("#resumePreview");
  if (!obj || !obj.dataset.pdf) return;
  const load = () => { obj.data = obj.dataset.pdf; };
  if (!("IntersectionObserver" in window)) return load();
  const io = new IntersectionObserver(es => {
    if (es.some(e => e.isIntersecting)) { load(); io.disconnect(); }
  }, { rootMargin: "600px" });
  io.observe(obj);
})();
