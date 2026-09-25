/* ============================================================
   app.js — markdown rendering + small shared helpers.
   No dependencies, no build step.
   ============================================================ */

/* ---------- escaping ---------- */

function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ---------- inline markdown ---------- */

function inline(s) {
  return s
    // Obsidian [[Note]] / [[Note|alias]] — no wiki pages here, so show the text.
    // Embeds (![[file]]) are left alone; the importer turns those into images.
    .replace(/(^|[^!])\[\[([^\]|]+)\|([^\]]+)\]\]/g, "$1$3")
    .replace(/(^|[^!])\[\[([^\]]+)\]\]/g, "$1$2")
    // images first, so their alt text isn't mangled
    .replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g,
      (m, alt, src) => `<img src="${esc(src)}" alt="${esc(alt)}">` +
        (alt ? `<em class="cap">${esc(alt)}</em>` : ""))
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g,
      (m, txt, href) => `<a href="${esc(href)}" rel="noopener">${txt}</a>`)
    .replace(/`([^`]+)`/g, (m, c) => `<code>${c}</code>`)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
}

/* ---------- tables ----------
   Pipe tables as Obsidian and GitHub write them:
     | Name | Score |
     | :--- | ----: |
     | a    | 1     |
   Outer pipes are optional; \| inside a cell is a literal pipe. */

const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)*\|?\s*$/;

function splitRow(line) {
  let s = line.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const cells = [];
  let cur = "";
  for (let k = 0; k < s.length; k++) {
    if (s[k] === "\\" && s[k + 1] === "|") { cur += "|"; k++; continue; }
    if (s[k] === "|") { cells.push(cur.trim()); cur = ""; continue; }
    cur += s[k];
  }
  cells.push(cur.trim());
  return cells;
}

function isTableStart(line, next) {
  return line.includes("|") && next !== undefined && next.includes("|") &&
    TABLE_DELIMITER.test(next) && splitRow(line).length === splitRow(next).length;
}

function tableHtml(headerLine, delimiterLine, rowLines) {
  const align = splitRow(delimiterLine).map(c =>
    c.startsWith(":") && c.endsWith(":") ? "center" : c.endsWith(":") ? "right" : "");
  const header = splitRow(headerLine);
  const cell = (tag, text, i) =>
    `<${tag}${align[i] ? ` style="text-align:${align[i]}"` : ""}>${inline(text || "")}</${tag}>`;
  const rows = rowLines.map(l => {
    const cells = splitRow(l);
    return "<tr>" + header.map((_, i) => cell("td", cells[i], i)).join("") + "</tr>";
  });
  return `<div class="table-wrap"><table>` +
    `<thead><tr>${header.map((h, i) => cell("th", h, i)).join("")}</tr></thead>` +
    `<tbody>${rows.join("")}</tbody></table></div>`;
}

/* ---------- video embeds ----------
   A YouTube, Vimeo or Loom link on its own line — or Obsidian's
   ![caption](video link) — becomes an embedded player. The player URL is
   rebuilt from the video's id alone, never from the raw link. */

function toSeconds(t) {
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t);
  const m = t.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);
  return m ? (+m[1] || 0) * 3600 + (+m[2] || 0) * 60 + (+m[3] || 0) : 0;
}

function videoEmbed(link) {
  let u;
  try { u = new URL(link); } catch { return null; }
  const host = u.hostname.replace(/^(www|m)\./, "");
  const parts = u.pathname.split("/").filter(Boolean);

  if (host === "youtube.com" || host === "youtube-nocookie.com" || host === "youtu.be") {
    const id = host === "youtu.be" ? parts[0]
      : ["shorts", "embed", "live"].includes(parts[0]) ? parts[1]
      : u.searchParams.get("v");
    if (!/^[\w-]{11}$/.test(id || "")) return null;
    const start = toSeconds(u.searchParams.get("t") || u.searchParams.get("start"));
    return {
      src: `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ""}`,
      vertical: parts[0] === "shorts"
    };
  }
  if (host === "vimeo.com" && /^\d+$/.test(parts[0] || "")) {
    const hash = /^[0-9a-f]+$/.test(parts[1] || "") ? `?h=${parts[1]}` : ""; // unlisted videos
    return { src: `https://player.vimeo.com/video/${parts[0]}${hash}`, vertical: false };
  }
  if (host === "loom.com" && parts[0] === "share" && /^[0-9a-f]+$/.test(parts[1] || "")) {
    return { src: `https://www.loom.com/embed/${parts[1]}`, vertical: false };
  }
  return null;
}

// Takes an already-escaped markdown line; returns player HTML, or null if
// the line isn't just a video.
function videoBlock(line) {
  const m = line.trim().match(/^(?:!\[([^\]]*)\]\((\S+)\)|(https?:\/\/\S+))$/);
  if (!m) return null;
  const video = videoEmbed((m[2] || m[3]).replace(/&amp;/g, "&"));
  if (!video) return null;
  const caption = m[1] || "";
  return `<figure class="video${video.vertical ? " video--vertical" : ""}">` +
    `<div class="video__frame"><iframe src="${esc(video.src)}" title="${caption || "Video"}" loading="lazy" ` +
    `allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ` +
    `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` +
    (caption ? `<figcaption>${caption}</figcaption>` : "") +
    `</figure>`;
}

/* ---------- block markdown ---------- */

function markdown(src) {
  if (!src) return "";
  const lines = esc(src).replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;
  let para = [];

  const flush = () => {
    if (para.length) {
      out.push("<p>" + inline(para.join(" ")) + "</p>");
      para = [];
    }
  };

  while (i < lines.length) {
    const line = lines[i];

    // fenced code
    if (/^```/.test(line)) {
      flush();
      const buf = [];
      i++;
      while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
      i++;
      out.push("<pre><code>" + buf.join("\n") + "</code></pre>");
      continue;
    }

    // headings
    const h = line.match(/^(#{2,4})\s+(.*)$/);
    if (h) {
      flush();
      const lvl = h[1].length;
      const text = h[2].trim();
      const slug = text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      out.push(`<h${lvl} id="${slug}">${inline(text)}</h${lvl}>`);
      i++;
      continue;
    }

    // horizontal rule
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) {
      flush();
      out.push("<hr>");
      i++;
      continue;
    }

    // blockquote
    if (/^&gt;\s?/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^&gt;\s?/.test(lines[i])) {
        buf.push(lines[i].replace(/^&gt;\s?/, ""));
        i++;
      }
      out.push("<blockquote>" + inline(buf.join(" ")) + "</blockquote>");
      continue;
    }

    // unordered list
    if (/^[-*]\s+/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        buf.push("<li>" + inline(lines[i].replace(/^[-*]\s+/, "")) + "</li>");
        i++;
      }
      out.push("<ul>" + buf.join("") + "</ul>");
      continue;
    }

    // ordered list
    if (/^\d+\.\s+/.test(line)) {
      flush();
      const buf = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        buf.push("<li>" + inline(lines[i].replace(/^\d+\.\s+/, "")) + "</li>");
        i++;
      }
      out.push("<ol>" + buf.join("") + "</ol>");
      continue;
    }

    // video on its own line
    const video = videoBlock(line);
    if (video) {
      flush();
      out.push(video);
      i++;
      continue;
    }

    // table
    if (isTableStart(line, lines[i + 1])) {
      flush();
      const header = line;
      const delimiter = lines[i + 1];
      const rows = [];
      i += 2;
      while (i < lines.length && lines[i].trim() && lines[i].includes("|")) rows.push(lines[i++]);
      out.push(tableHtml(header, delimiter, rows));
      continue;
    }

    // blank line
    if (!line.trim()) {
      flush();
      i++;
      continue;
    }

    para.push(line.trim());
    i++;
  }

  flush();
  return out.join("\n");
}

/* ---------- helpers ---------- */

// Only web addresses or site-relative paths, never javascript: and friends.
function safeImageUrl(u) {
  const s = String(u || "").trim();
  return /^https?:\/\//i.test(s) || /^\/?[\w-]+\//.test(s) ? s : "";
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function readingTime(body) {
  const words = String(body || "").trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220)) + " min read";
}

function byNewest(a, b) {
  return String(b.date || "").localeCompare(String(a.date || ""));
}

/* ---------- content ----------
   Everything comes from /api/content (backed by the database), so a save
   in the editor shows up on the next page load. Pages call startPage(),
   which fills these globals and then runs the page's render function. */

let SITE = { name: "", role: "", writingIntro: "", buildsIntro: "", linkedin: "", github: "", email: "", url: "" };
let POSTS = [];
let BUILDS = [];
let DRAFTS_LOCKED = false; // preview was asked for, but you aren't signed in

async function fetchContent(withDrafts) {
  const res = await fetch("/api/content" + (withDrafts ? "?drafts=1" : ""), { cache: "no-store" });
  if (res.status === 401 && withDrafts) {
    DRAFTS_LOCKED = true;
    return fetchContent(false);
  }
  if (!res.ok) throw new Error(`Couldn't load content (${res.status})`);
  return res.json();
}

async function loadContent() {
  try {
    const data = await fetchContent(previewMode());
    SITE = { ...SITE, ...data.site };
    POSTS = data.posts || [];
    BUILDS = data.builds || [];
    return true;
  } catch (e) {
    return false;
  }
}

function startPage(current, render) {
  loadContent().then(ok => {
    mountChrome(current);
    if (ok) return render();
    const main = document.querySelector("main");
    if (main) {
      main.innerHTML = `
        <div class="wrap" style="padding:80px 0">
          <div class="empty">
            <p>Couldn't load this page right now.</p>
            <p class="hint">Try again in a moment.</p>
          </div>
        </div>`;
    }
  });
}

/* ---------- drafts & preview ----------
   Drafts never leave the server unless you're signed in as the owner.
   Preview mode (?preview=1 to turn on, ?preview=0 to turn off) asks for
   them, and sticks for the rest of the browser session so you can click
   from the index into a draft without carrying the parameter around.
   -------------------------------------------------------------------- */

const PREVIEW_KEY = "whitepaper-preview";

function previewMode() {
  const q = new URLSearchParams(location.search).get("preview");
  try {
    if (q === "1") sessionStorage.setItem(PREVIEW_KEY, "1");
    if (q === "0") sessionStorage.removeItem(PREVIEW_KEY);
    return sessionStorage.getItem(PREVIEW_KEY) === "1";
  } catch (e) {
    return q === "1"; // storage unavailable — fall back to the URL alone
  }
}

function isDraft(p) {
  return (p || {}).status === "draft";
}

function visiblePosts() {
  return previewMode() ? [...POSTS] : POSTS.filter(p => !isDraft(p));
}

// Builds already use `status` for prototype/live/archived, so their
// draft/published flag lives in a separate field: `visibility`.
function isBuildDraft(b) {
  return (b || {}).visibility === "draft";
}

function visibleBuilds() {
  return previewMode() ? [...BUILDS] : BUILDS.filter(b => !isBuildDraft(b));
}

function previewExitHref() {
  const u = new URL(location.href);
  u.searchParams.set("preview", "0");
  return u.href;
}

/* ---------- light/dark theme ----------
   Follows the OS by default (see the @media block in styles.css). A click
   on the toggle stores an explicit choice that overrides the OS either way,
   until clicked again. The <head> of every page also runs a tiny inline
   script that applies a stored choice before first paint — without it,
   this file (loaded at the end of <body>) would apply it too late and a
   returning visitor would see a flash of the wrong theme.
   -------------------------------------------------------------------- */

const THEME_KEY = "whitepaper-theme";

function currentTheme() {
  let stored = null;
  try { stored = localStorage.getItem(THEME_KEY); } catch (e) {}
  if (stored === "light" || stored === "dark") return stored;
  return (window.matchMedia && matchMedia("(prefers-color-scheme: dark)").matches)
    ? "dark" : "light";
}

function setTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch (e) {}
  document.documentElement.setAttribute("data-theme", theme);
}

function toggleTheme() {
  setTheme(currentTheme() === "dark" ? "light" : "dark");
  renderThemeToggle();
}

function renderThemeToggle() {
  const btn = document.getElementById("themeToggle");
  if (!btn) return;
  const dark = currentTheme() === "dark";
  btn.textContent = dark ? "☀" : "☾";
  btn.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
}

/* ---------- shared chrome ---------- */

function mountChrome(current) {
  const head = document.getElementById("masthead");
  if (head) {
    const bar = previewMode()
      ? `<div class="previewbar">
           <span>${DRAFTS_LOCKED
             ? `<b>Preview</b> — <a href="login.html">sign in</a> to see drafts`
             : `<b>Preview</b> — drafts are visible because you're signed in`}</span>
           <a href="${esc(previewExitHref())}">Exit preview</a>
         </div>`
      : "";
    head.innerHTML = bar + `
      <div class="wrap masthead__inner">
        <a class="wordmark" href="index.html">${esc(SITE.name)}<span>${esc(SITE.role)}</span></a>
        <nav class="nav">
          <a href="index.html" ${current === "writing" ? 'aria-current="page"' : ""}>Writing</a>
          <a href="builds.html" ${current === "builds" ? 'aria-current="page"' : ""}>Builds</a>
          <button class="theme-toggle" id="themeToggle" type="button"></button>
        </nav>
      </div>`;
    document.getElementById("themeToggle").onclick = toggleTheme;
    renderThemeToggle();
    // Keep the icon honest if the OS theme changes while no explicit
    // choice has been made (CSS already reacts to this on its own).
    if (window.matchMedia) {
      matchMedia("(prefers-color-scheme: dark)").addEventListener("change", renderThemeToggle);
    }
  }

  const foot = document.getElementById("foot");
  if (foot) {
    const links = [
      SITE.linkedin ? `<a href="${esc(SITE.linkedin)}" rel="noopener">LinkedIn</a>` : "",
      SITE.github ? `<a href="${esc(SITE.github)}" rel="noopener">GitHub</a>` : "",
      SITE.email ? `<a href="mailto:${esc(SITE.email)}">Email</a>` : ""
    ].filter(Boolean).join(" · ");
    foot.innerHTML = `
      <div class="wrap foot">
        <div>© ${new Date().getFullYear()} ${esc(SITE.name)}</div>
        <div>${links}</div>
      </div>
      <div class="wrap footnote"><a href="admin.html">Editor</a></div>`;
  }
}

function toast(msg) {
  let el = document.querySelector(".toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.setAttribute("data-show", "true");
  clearTimeout(el._t);
  el._t = setTimeout(() => el.setAttribute("data-show", "false"), 2200);
}
