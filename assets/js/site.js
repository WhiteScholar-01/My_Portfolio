/* ==========================================================================
   site.js — home page behaviour
   Sections: A intro  B roles  C scroll chrome  D reveals  E projects  F misc
   ========================================================================== */

import { $, $$, esc, url, loadProjects, STATUS_ORDER, PLACEHOLDER } from "./util.js";
import { initTheme } from "./theme.js";
import { initHero } from "./hero.js";

/* Tell the CSS that JS is alive, and cancel the no-JS safety net. */
window.__jsReady = true;

/* --------------------------------------------------------------------------
   A. Intro — the name rises one letter at a time
   -------------------------------------------------------------------------- */
(() => {
  const h1 = $("[data-split]");
  if (!h1) return;
  const text = h1.textContent;
  h1.setAttribute("aria-label", text);
  h1.innerHTML = [...text]
    .map((c, i) => `<span class="ch" aria-hidden="true" style="--i:${i}">${c === " " ? "&nbsp;" : esc(c)}</span>`)
    .join("");
  requestAnimationFrame(() => requestAnimationFrame(() => document.body.classList.add("ready")));
})();

/* --------------------------------------------------------------------------
   B. The job title types itself
   -------------------------------------------------------------------------- */
(() => {
  const out = $("#roleText");
  if (!out) return;
  const roles = [
    "Electrical engineer",
    "Lead engineer at Orbitalink",
    "Motor drive researcher",
    "Satellite tracker builder"
  ];
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
    out.textContent = roles[0];
    $(".caret")?.remove();
    return;
  }
  let r = 0, i = roles[0].length, deleting = true;
  const tick = () => {
    const w = roles[r];
    out.textContent = w.slice(0, i);
    if (!deleting && i === w.length) { deleting = true;  return setTimeout(tick, 2200); }
    if (deleting && i === 0)         { deleting = false; r = (r + 1) % roles.length; return setTimeout(tick, 350); }
    i += deleting ? -1 : 1;
    setTimeout(tick, deleting ? 32 : 65);
  };
  setTimeout(tick, 2800);
})();

/* --------------------------------------------------------------------------
   C. Scroll chrome — progress bar, sticky nav, active link, timeline fill
   One scroll listener, one rAF, everything measured together.
   -------------------------------------------------------------------------- */
(() => {
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
})();

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
      <button class="peek" type="button" data-i="${i}" aria-haspopup="dialog">
        Quick look
      </button>
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
  if (!projects.length) {
    grid.innerHTML = `<p class="status">No projects to show yet.</p>`;
    return;
  }

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
   F. Menu, year, boot
   -------------------------------------------------------------------------- */
(() => {
  const btn = $(".menu-btn"), list = $("#navlist");
  if (!btn || !list) return;
  btn.onclick = () => btn.setAttribute("aria-expanded", list.classList.toggle("open"));
  $$("a", list).forEach(a => a.addEventListener("click", () => {
    list.classList.remove("open");
    btn.setAttribute("aria-expanded", "false");
  }));
})();

const yr = $("#yr");
if (yr) yr.textContent = new Date().getFullYear();

initTheme();
initHero($("#sky"));
reveals();

try {
  projects = (await loadProjects()).filter(p => p.published !== false);
  render();
} catch (err) {
  console.error("Couldn't load data/projects.json —", err);
  $("#grid").innerHTML = `<p class="status">Projects couldn't load. Check that <code>data/projects.json</code> exists.</p>`;
}
