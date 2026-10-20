/* ==========================================================================
   media.js — project videos
   --------------------------------------------------------------------------
   A project may carry   videos: [{ title, url, poster, loop }]
     url    a YouTube link, a path to an uploaded .mp4/.webm
            ("projects/<slug>/videos/clip.mp4"), or any other link
     poster image path for an uploaded clip (the admin grabs a frame)
     loop   uploaded clips only: muted, endless, plays while on screen

   YouTube is never loaded until a visitor presses play — the page shows
   YouTube's own thumbnail instead, so a video costs nothing until it is used.
   ========================================================================== */

import { esc, url } from "./util.js";

const FILE_EXT = /\.(mp4|webm|m4v|mov)(\?.*)?$/i;

/** Pull the id (and optional start second) out of any common YouTube link. */
export function parseYouTube(link) {
  let u;
  try { u = new URL(String(link).trim()); } catch { return null; }
  const host = u.hostname.replace(/^www\.|^m\./, "");
  let id = "";
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v") || "";
    else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([\w-]{6,})/);
      if (m) id = m[1];
    }
  }
  if (!/^[\w-]{6,15}$/.test(id)) return null;
  // t=90, t=90s, t=1m30s, start=90
  const raw = u.searchParams.get("t") || u.searchParams.get("start") || "";
  const hms = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s?)?$/);
  const start = hms && raw ? (+hms[1] || 0) * 3600 + (+hms[2] || 0) * 60 + (+hms[3] || 0) : 0;
  return { id, start };
}

/** "youtube" | "file" | "link" */
export function videoKind(v) {
  if (!v || !v.url) return "";
  if (parseYouTube(v.url)) return "youtube";
  if (FILE_EXT.test(v.url) && !/^https?:\/\//i.test(v.url)) return "file";
  return "link";
}

const cleanList = p => (p.videos || []).filter(v => v && String(v.url || "").trim());
export const hasVideo = p => cleanList(p).length > 0;

const PLAY = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5.5v13l11-6.5z" fill="currentColor"/></svg>`;

function renderOne(v, base, i) {
  const kind = videoKind(v);
  const title = esc(v.title || "Project video");
  const cap = v.title ? `<figcaption>${title}</figcaption>` : "";

  if (kind === "youtube") {
    const { id, start } = parseYouTube(v.url);
    return `<figure class="vid">
      <button class="vid-frame" type="button" data-yt="${esc(id)}" data-start="${start}" aria-label="Play video: ${title}">
        <img src="https://i.ytimg.com/vi/${esc(id)}/hqdefault.jpg" alt="" loading="lazy" decoding="async">
        <span class="vid-play">${PLAY}</span>
      </button>${cap}</figure>`;
  }
  if (kind === "file") {
    const src = esc(url(v.url, base));
    const poster = v.poster ? ` poster="${esc(url(v.poster, base))}"` : "";
    return v.loop
      ? `<figure class="vid"><video class="vid-el" data-loop src="${src}"${poster} muted loop playsinline preload="metadata" aria-label="${title}"></video>${cap}</figure>`
      : `<figure class="vid"><video class="vid-el" src="${src}"${poster} controls playsinline preload="none" aria-label="${title}"></video>${cap}</figure>`;
  }
  return `<a class="btn small" href="${esc(v.url)}" target="_blank" rel="noopener">${PLAY.replace("<svg", '<svg width="14" height="14"')} ${v.title ? title : "Watch video"}</a>`;
}

/** The whole "Videos" block for a project page. Empty string if none. */
export function renderVideos(p, base = "") {
  const list = cleanList(p);
  if (!list.length) return "";
  const players = list.filter(v => videoKind(v) !== "link");
  const links = list.filter(v => videoKind(v) === "link");
  return `<div class="p-section" id="pVideos">
    <h2>Video${list.length > 1 ? "s" : ""}</h2>
    ${players.length ? `<div class="vids${players.length === 1 ? " single" : ""}">${players.map((v, i) => renderOne(v, base, i)).join("")}</div>` : ""}
    ${links.length ? `<div class="vid-links">${links.map((v, i) => renderOne(v, base, i)).join("")}</div>` : ""}
  </div>`;
}

/** Wire up click-to-load YouTube frames and the on-screen autoplay of loops. */
export function activateVideos(root = document) {
  root.querySelectorAll("button[data-yt]").forEach(btn => {
    btn.onclick = () => {
      const ifr = document.createElement("iframe");
      ifr.className = "vid-iframe";
      ifr.src = `https://www.youtube-nocookie.com/embed/${encodeURIComponent(btn.dataset.yt)}`
        + `?autoplay=1&rel=0${+btn.dataset.start ? `&start=${+btn.dataset.start}` : ""}`;
      ifr.allow = "autoplay; encrypted-media; picture-in-picture; fullscreen";
      ifr.allowFullscreen = true;
      ifr.title = btn.getAttribute("aria-label") || "Video";
      btn.replaceWith(ifr);
    };
  });

  const loops = root.querySelectorAll("video[data-loop]");
  if (!loops.length) return;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce || !("IntersectionObserver" in window)) {
    loops.forEach(v => v.controls = true);   // let the visitor decide
    return;
  }
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause();
  }), { threshold: .35 });
  loops.forEach(v => io.observe(v));
}

/** Small badge for a project card. */
export const videoBadge = p => hasVideo(p)
  ? `<span class="vid-badge" title="Has a video">${PLAY} Video</span>` : "";

/* ---- admin helper: grab a poster frame from a local video file ---- */
export function captureFrame(file, maxW = 1000) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    const src = URL.createObjectURL(file);
    const done = (fn, arg) => { URL.revokeObjectURL(src); fn(arg); };
    v.muted = true; v.playsInline = true; v.preload = "metadata";
    v.onerror = () => done(reject, new Error("The browser couldn't read that video."));
    v.onloadedmetadata = () => { v.currentTime = Math.min(1, (v.duration || 1) / 4); };
    v.onseeked = () => {
      const s = Math.min(1, maxW / v.videoWidth);
      const c = document.createElement("canvas");
      c.width = Math.round(v.videoWidth * s); c.height = Math.round(v.videoHeight * s);
      c.getContext("2d").drawImage(v, 0, 0, c.width, c.height);
      done(resolve, c.toDataURL("image/jpeg", .8).split(",")[1]);
    };
    v.src = src;
  });
}
