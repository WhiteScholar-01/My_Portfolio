/* ==========================================================================
   admin-site.js — the Site content tab
   --------------------------------------------------------------------------
   Edits data/site.json: the hero, the proof numbers, About, Experience,
   Skills, the resume block, Contact and the footer.

   The form is built from SPEC rather than written out by hand, so adding a
   field later means adding one line here and one key in site.json.

   Field types:
     text   single line
     area   multi-line, stored as one string
     md     multi-line, **bold** allowed when rendered on the site
     lines  multi-line, stored as an array — one entry per line
     csv    single line, stored as an array — split on commas
   ========================================================================== */

import { $, esc } from "./util.js";

const PATH = "data/site.json";

const SPEC = [
  {
    key: "hero", title: "Hero",
    hint: "The first screen. Leave the eyebrow empty to hide it.",
    fields: [
      { k: "eyebrow",     label: "Eyebrow", type: "text", hint: "small line above your name — empty hides it" },
      { k: "name",        label: "Name", type: "text" },
      { k: "roles",       label: "Rotating job titles", type: "lines", hint: "one per line; they type themselves in turn" },
      { k: "lede",        label: "Intro paragraph", type: "area" },
      { k: "ctaLabel",    label: "Main button label", type: "text" },
      { k: "ctaHref",     label: "Main button link", type: "text" },
      { k: "resumeLabel", label: "Resume button label", type: "text" }
    ]
  },
  {
    key: "stats", title: "Proof numbers", topLevelList: true,
    hint: "Three facts a reader can check at a glance. Shown under the hero buttons.",
    itemFields: [
      { k: "value", label: "Number", type: "text" },
      { k: "label", label: "Label", type: "text" }
    ]
  },
  {
    key: "about", title: "About",
    fields: [
      { k: "heading",    label: "Heading", type: "text" },
      { k: "paragraphs", label: "Paragraphs", type: "lines", hint: "one paragraph per line; **wrap in asterisks** for bold" }
    ],
    lists: [
      { k: "panel", title: "Spec panel", hint: "the boxed label/value table beside the text",
        itemFields: [
          { k: "label", label: "Label", type: "text" },
          { k: "value", label: "Value", type: "text" }
        ] }
    ]
  },
  {
    key: "experience", title: "Experience",
    fields: [
      { k: "intro", label: "Intro line", type: "text" }
    ],
    lists: [
      { k: "items", title: "Roles", hint: "newest first — they appear down the timeline in this order",
        itemFields: [
          { k: "role",    label: "Job title", type: "text" },
          { k: "when",    label: "Dates", type: "text", hint: "e.g. Aug 2025 – Present" },
          { k: "org",     label: "Organisation and place", type: "text" },
          { k: "bullets", label: "Bullet points", type: "lines" }
        ] }
    ]
  },
  {
    key: "skills", title: "Skills",
    fields: [
      { k: "note", label: "Note above the groups", type: "text", hint: "optional — e.g. what backs each item" }
    ],
    lists: [
      { k: "groups", title: "Skill groups",
        itemFields: [
          { k: "title", label: "Group title", type: "text" },
          { k: "items", label: "Items", type: "csv", hint: "comma separated" }
        ] }
    ]
  },
  {
    key: "resume", title: "Resume block",
    fields: [
      { k: "intro",   label: "Intro line", type: "text" },
      { k: "updated", label: "Last updated", type: "text", hint: "e.g. September 2026 — shows the CV is current" }
    ],
    lists: [
      { k: "certs", title: "Certificates",
        itemFields: [
          { k: "title",  label: "Certificate", type: "text" },
          { k: "issuer", label: "Issuer and year", type: "text" }
        ] }
    ]
  },
  {
    key: "contact", title: "Contact",
    fields: [
      { k: "heading",  label: "Heading", type: "text" },
      { k: "text",     label: "Paragraph", type: "area" },
      { k: "email",    label: "Email", type: "text" },
      { k: "linkedin", label: "LinkedIn URL", type: "text" },
      { k: "github",   label: "GitHub URL", type: "text" },
      { k: "phone",    label: "Phone", type: "text", hint: "optional — adds a fourth card, leave empty to hide it" }
    ]
  },
  {
    key: "footer", title: "Footer",
    fields: [{ k: "location", label: "Location", type: "text" }]
  }
];

/* ---- value <-> form-field conversion ---------------------------------- */
const toField = (type, v) => {
  if (type === "lines") return (Array.isArray(v) ? v : []).join("\n");
  if (type === "csv")   return (Array.isArray(v) ? v : []).join(", ");
  return v ?? "";
};
const fromField = (type, s) => {
  if (type === "lines") return String(s).split("\n").map(x => x.trim()).filter(Boolean);
  if (type === "csv")   return String(s).split(",").map(x => x.trim()).filter(Boolean);
  return String(s);
};

const control = (f, value, attrs) => {
  const v = esc(toField(f.type, value));
  const common = `${attrs} aria-label="${esc(f.label)}"`;
  if (f.type === "area" || f.type === "lines" || f.type === "md") {
    return `<textarea ${common}>${v}</textarea>`;
  }
  return `<input ${common} value="${v}">`;
};

export function createSiteEditor(api) {
  // api: { gh, put, toB64, fromB64, ref }
  let site = null, sha = null, saved = "";

  const isDirty = () => site !== null && JSON.stringify(site) !== saved;

  /* ---- load ---- */
  async function load() {
    const file = await api.gh(`${PATH}?ref=${api.ref()}`, {}, true);
    if (!file) {
      // No site.json yet — start from a blank shape so the editor still works.
      site = {};
      sha = null;
      SPEC.forEach(g => { site[g.key] = g.topLevelList ? [] : {}; });
    } else {
      sha = file.sha;
      site = JSON.parse(api.fromB64(file.content));
    }
    SPEC.forEach(g => {
      if (g.topLevelList) site[g.key] ??= [];
      else {
        site[g.key] ??= {};
        (g.lists || []).forEach(l => { site[g.key][l.k] ??= []; });
      }
    });
    saved = JSON.stringify(site);
    render();
  }

  /* ---- render ---- */
  function listRows(groupKey, list) {
    const rows = groupKey === null ? site[list.k] : site[groupKey][list.k];
    if (!rows.length) {
      return `<p class="hint">Nothing here yet. Press Add to create the first one.</p>`;
    }
    return rows.map((item, i) => `
      <div class="ed-row col">
        <div class="ed-top">
          <span class="ed-idx">${i + 1}</span>
          <div class="ed-btns">
            <button class="btn icon" type="button" data-move="up" data-g="${esc(groupKey ?? "")}" data-l="${esc(list.k)}" data-i="${i}" ${i === 0 ? "disabled" : ""} aria-label="Move up">↑</button>
            <button class="btn icon" type="button" data-move="down" data-g="${esc(groupKey ?? "")}" data-l="${esc(list.k)}" data-i="${i}" ${i === rows.length - 1 ? "disabled" : ""} aria-label="Move down">↓</button>
            <button class="btn icon danger" type="button" data-del="1" data-g="${esc(groupKey ?? "")}" data-l="${esc(list.k)}" data-i="${i}" aria-label="Remove">✕</button>
          </div>
        </div>
        ${list.itemFields.map(f => `
          <label class="ed-field">
            <span>${esc(f.label)}${f.hint ? ` <em class="hint">${esc(f.hint)}</em>` : ""}</span>
            ${control(f, item?.[f.k], `data-g="${esc(groupKey ?? "")}" data-l="${esc(list.k)}" data-i="${i}" data-k="${esc(f.k)}" data-t="${f.type}"`)}
          </label>`).join("")}
      </div>`).join("");
  }

  function render() {
    const root = $("#siteEditor");
    if (!root || !site) return;

    root.innerHTML = SPEC.map(g => `
      <section class="card">
        <h2>${esc(g.title)}</h2>
        ${g.hint ? `<p class="hint" style="margin:-8px 0 14px">${esc(g.hint)}</p>` : ""}

        ${(g.fields || []).map(f => `
          <label class="ed-field">
            <span>${esc(f.label)}${f.hint ? ` <em class="hint">${esc(f.hint)}</em>` : ""}</span>
            ${control(f, site[g.key]?.[f.k], `data-g="${esc(g.key)}" data-k="${esc(f.k)}" data-t="${f.type}"`)}
          </label>`).join("")}

        ${g.topLevelList ? `
          <div class="editor">
            <div class="ed-head">
              <span class="ed-title">${esc(g.title)}</span>
              <button class="btn small" type="button" data-add="1" data-g="" data-l="${esc(g.key)}">Add</button>
            </div>
            ${listRows(null, { k: g.key, itemFields: g.itemFields })}
          </div>` : ""}

        ${(g.lists || []).map(l => `
          <div class="editor">
            <div class="ed-head">
              <span class="ed-title">${esc(l.title)}</span>
              ${l.hint ? `<span class="hint">${esc(l.hint)}</span>` : ""}
              <button class="btn small" type="button" data-add="1" data-g="${esc(g.key)}" data-l="${esc(l.k)}">Add</button>
            </div>
            ${listRows(g.key, l)}
          </div>`).join("")}
      </section>`).join("");

    markDirty();
  }

  /* ---- editing ---- */
  const arrayAt = (g, l) => (g ? site[g][l] : site[l]);

  function onInput(e) {
    const el = e.target;
    const { g, l, i, k, t } = el.dataset;
    if (!k && !l) return;
    const value = fromField(t, el.value);
    if (l !== undefined && i !== undefined) {
      const arr = arrayAt(g || null, l);
      arr[+i] ??= {};
      arr[+i][k] = value;
    } else if (g && k) {
      site[g] ??= {};
      site[g][k] = value;
    }
    markDirty();
  }

  function onClick(e) {
    const b = e.target.closest("button");
    if (!b) return;
    const { g, l, i, move, del, add } = b.dataset;
    if (add) {
      arrayAt(g || null, l).push({});
      render();
      return;
    }
    if (move) {
      const arr = arrayAt(g || null, l), n = +i;
      const j = move === "up" ? n - 1 : n + 1;
      if (j < 0 || j >= arr.length) return;
      [arr[j], arr[n]] = [arr[n], arr[j]];
      render();
      return;
    }
    if (del) {
      arrayAt(g || null, l).splice(+i, 1);
      render();
    }
  }

  function markDirty() {
    const bar = $("#siteBar");
    if (bar) bar.classList.toggle("on", isDirty());
  }

  /* ---- save ---- */
  async function save() {
    const out = $("#siteMsg");
    out.textContent = "Saving…";
    out.className = "msg ok";
    try {
      const res = await api.put(
        PATH,
        api.toB64(JSON.stringify(site, null, 2) + "\n"),
        "Update site content from admin page",
        sha || undefined
      );
      sha = res.content.sha;
      saved = JSON.stringify(site);
      markDirty();
      out.textContent = "Saved. The site updates in 1–2 minutes — run git pull locally to catch up.";
    } catch (err) {
      out.textContent = "Couldn't save: " + err.message;
      out.className = "msg err";
    }
  }

  function mount() {
    const root = $("#siteEditor");
    if (!root) return;
    root.addEventListener("input", onInput);
    root.addEventListener("click", onClick);
    $("#siteSaveBtn")?.addEventListener("click", save);
    $("#siteRevertBtn")?.addEventListener("click", () => {
      if (!confirm("Discard unsaved changes to the site content?")) return;
      site = JSON.parse(saved);
      render();
    });
  }

  return { load, mount, isDirty };
}
