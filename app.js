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

/* ---------- shared chrome ---------- */

function mountChrome(current) {
  const head = document.getElementById("masthead");
  if (head) {
    head.innerHTML = `
      <div class="wrap masthead__inner">
        <a class="wordmark" href="index.html">${esc(SITE.name)}<span>${esc(SITE.role)}</span></a>
        <nav class="nav">
          <a href="index.html" ${current === "writing" ? 'aria-current="page"' : ""}>Writing</a>
          <a href="builds.html" ${current === "builds" ? 'aria-current="page"' : ""}>Builds</a>
          <a href="admin.html" ${current === "admin" ? 'aria-current="page"' : ""}>Editor</a>
        </nav>
      </div>`;
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
      </div>`;
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
