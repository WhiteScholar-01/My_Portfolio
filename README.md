# My_Portfolio

Personal portfolio site for **Saqib Ali** — Electrical Engineering, AMU.
Live at <https://whitescholar-01.github.io/My_Portfolio/>

Plain HTML, CSS and JavaScript. No build step, no framework, no dependencies:
what is in this repository is exactly what the browser runs.

---

## Folder layout

```
My_Portfolio/
├── index.html              the home page
├── admin.html              private page for adding/editing projects
├── .nojekyll               tells GitHub Pages to serve files as-is
│
├── assets/
│   ├── css/
│   │   ├── tokens.css      ← every colour and size lives here
│   │   ├── site.css        layout and components
│   │   ├── project.css     extras for project pages
│   │   └── admin.css       the admin page
│   ├── js/
│   │   ├── util.js         shared helpers
│   │   ├── theme.js        light/dark switching
│   │   ├── hero.js         the animated satellite-pass canvas
│   │   ├── site.js         home page behaviour
│   │   ├── project-page.js fills in a project page
│   │   ├── admin.js        the project manager
│   │   └── admin-site.js   the Site content tab
│   ├── docs/
│   │   ├── Saqib_Ali_Resume.pdf
│   │   └── Saqib_Ali_CV.pdf
│   ├── img/
│   │   └── og-image.png    social preview card (1200x630)
│   └── templates/          used by admin.html to create new project folders
│
├── data/
│   ├── site.json           ← the home page, minus the projects
│   └── projects.json       ← the single source of truth for all projects
│
└── projects/
    ├── five-phase-ipmsm-foc/
    │   ├── index.html      the project's own page
    │   ├── README.md       your notes for that project
    │   └── images/         its photos, plots and diagrams
    ├── two-axis-antenna-tracker/
    ├── cross-yagi-435mhz/
    ├── adaptive-pid-mount/
    ├── sdr-image-downlink/
    ├── dc-dc-boost-converter/
    └── weather-dashboard/
```

**The rule:** anything that belongs to one project lives in that project's
folder. Anything shared by the whole site lives under `assets/`. Content lives
in `data/projects.json`, never inside a page.

---

## The three things that drive everything

### 1. `data/site.json`

Everything on the home page except the projects: the hero, the proof numbers,
About, Experience, Skills, the resume block, Contact and the footer. Edit it in
`admin.html` under the **Site content** tab, or by hand.

```json
{
  "hero":       { "eyebrow": "", "name": "…", "roles": ["…"], "lede": "…" },
  "stats":      [ { "value": "8", "label": "Projects" } ],
  "about":      { "heading": "…", "paragraphs": ["…"], "panel": [ { "label": "…", "value": "…" } ] },
  "experience": { "intro": "…", "items": [ { "role": "…", "when": "…", "org": "…", "bullets": ["…"] } ] },
  "skills":     { "note": "", "groups": [ { "title": "…", "items": ["…"] } ] },
  "resume":     { "intro": "…", "updated": "September 2026", "certs": [ { "title": "…", "issuer": "…" } ] },
  "contact":    { "heading": "…", "text": "…", "email": "…", "linkedin": "…", "github": "…" },
  "footer":     { "location": "…" }
}
```

Two things worth knowing:

- **An empty `hero.eyebrow` means no eyebrow.** The small line above your name
  is hidden unless you put something in it.
- **About paragraphs accept `**bold**` and nothing else.** Everything is escaped
  first, so text from this file can never inject markup into the page.

If `data/site.json` is missing or unreadable the page falls back to the markup
written into `index.html`, so nothing breaks. That fallback is also what a
visitor with JavaScript turned off sees.

### 2. `data/projects.json`

One object per project. The home page builds its cards from this, and each
project page reads its own entry from it.

```json
{
  "slug": "cross-yagi-435mhz",        // must match the folder name
  "title": "435 MHz cross-Yagi antenna",
  "year": "2025",
  "category": "RF & antennas",        // becomes a filter chip
  "org": "Orbitalink",                // optional
  "status": "In progress",            // In progress | Completed | Planned | On hold
  "featured": false,                  // true = double-width card
  "published": true,                  // false = hidden from the site
  "summary": "One or two sentences.",
  "details": ["Bullet points", "shown under 'What I did'"],
  "tags": ["MMANA-GAL", "NEC", "UHF"],
  "image": "projects/cross-yagi-435mhz/images/cover.jpg",
  "code_url": "",
  "demo_url": ""
}
```

Image paths are written **from the repository root**, so the same string works
on the home page and on a project page.

Three more fields are optional — leave them out and nothing breaks:

```json
"gallery": [
  { "src": "projects/cross-yagi-435mhz/images/pattern.png", "caption": "Radiation pattern" }
],
"sections": [
  { "heading": "Results", "body": "Measured 1.4:1 at 435 MHz.\n\n- Front-to-back 16 dB" }
],
"files": [
  { "label": "Construction manual", "path": "projects/cross-yagi-435mhz/manual.pdf", "note": "12 pages · PDF" }
]
```

- **gallery** — extra figures under the Images heading. A bare string works too.
- **sections** — your own headings on the project page, between "What I did"
  and the images. In `body`, a blank line starts a new paragraph and lines
  beginning `-` become bullets. Everything is escaped, so text is never markup.
- **files** — downloads in the sidebar: a manual, a model file, a report.

All three have editors in `admin.html`; you rarely need to write them by hand.

### 3. `assets/css/tokens.css`

Every colour in both themes. Change `--accent` there and the whole site — cards,
buttons, the timeline, the animated hero — follows, because nothing else in the
CSS contains a raw colour value.

---

## Colour system

A light "paper" theme and a dark "night" theme, switched by the button in the
header. With no choice stored the site follows the operating system.

| Role    | Light     | Dark      | Used for                              |
| ------- | --------- | --------- | ------------------------------------- |
| Ground  | `#F5F2EB` | `#0A1420` | page background, faint drawing grid   |
| Ink     | `#12233A` | `#E8EEF5` | headings and body text                |
| Copper  | `#B4652A` | `#E7A15A` | the accent: buttons, rules, the beam  |
| Signal  | `#1F6F8B` | `#63B8D6` | data: categories, the satellite       |

Copper sits near hue 25°, signal near 195° — close to opposite each other, so
they never compete. The ground is almost colourless, which is what lets two
accents carry all the meaning. Every text pair passes WCAG AA (4.5:1).

---

## Everyday tasks

### Add or edit a project — the easy way

1. Open `admin.html` (locally, or at `/My_Portfolio/admin.html`).
2. Paste a fine-grained GitHub token with **Contents: read and write** on this
   repository.
3. Fill the form, press **Add to list**, then **Publish to site**.

Publishing writes `data/projects.json` and, for any project that doesn't have
one yet, creates `projects/<slug>/index.html` and `README.md` for you.

> The token is never sent anywhere except GitHub. Don't commit it.

**The admin page writes to GitHub, never to your computer.** A browser cannot
write to your disk, so after publishing, run `git pull` in this folder to bring
the changes down. The save bar reminds you every time. Skip it for a while and
your next `git push` will collide with work you made through the admin page.

### Add a project by hand

1. Copy any folder in `projects/` and rename it to the new slug.
2. Open its `index.html` and edit the two lines marked at the top — the
   `<title>` and the meta description. Nothing else needs changing: the page
   works out which project it is **from its folder name**.
3. Add a matching entry to `data/projects.json` with the same `slug`.

### Add images you copied in by hand

1. Drop them into `projects/<slug>/images/`, then commit and push.
2. In `admin.html`, open that project and press **Scan folder** — it lists what
   is actually in the folder on GitHub and adds anything not already shown.
3. Caption them, update the project, publish.

### Change the hero, About or Experience

Open `admin.html`, connect, then switch to the **Site content** tab. Every field
on the home page is there, with repeatable rows for the proof numbers, the spec
panel, your roles, the skill groups and the certificates. Press **Save site
content**, then run `git pull` locally.

### Change a colour

Edit `assets/css/tokens.css`. Light values are in the `:root` block, dark ones
in `:root[data-theme="dark"]` — and the same values appear once more in the
`prefers-color-scheme` block at the bottom, which covers visitors who have not
pressed the toggle. Change all three.

### Replace the resume or CV

Overwrite the files in `assets/docs/` keeping the same names, and every link on
the site stays correct.

---

## Publishing changes

```bash
git add .
git commit -m "Describe what changed"
git push
```

GitHub Pages rebuilds in a minute or two. To pick up edits made on github.com or
through the admin page, run `git pull` before you start working locally.

---

## Working on it locally

Open `index.html` directly and the project list will not load — browsers block
`fetch()` from `file://`. Run a tiny local server instead:

```bash
python -m http.server 8000
```

Then visit <http://localhost:8000>.
