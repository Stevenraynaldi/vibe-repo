import { verifySessionCookie } from "../../lib/session.mjs";

export const config = { runtime: "edge" };

// This function only ever targets this one repo — update if you fork it.
const OWNER = "Stevenraynaldi";
const REPO = "vibe-repo";
const BRANCH = "main";
const PATH = "content.js";

// Edge has no Buffer, and content.js may contain non-ASCII text (accents,
// em dashes, etc.) — a plain btoa() would throw on those, so encode UTF-8
// bytes first.
function toBase64(str) {
  const bytes = new TextEncoder().encode(str);
  let binary = "";
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary);
}

function githubHeaders() {
  return {
    Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // middleware.js only guards /admin.html — an API route needs its own
  // check, and returns JSON rather than a redirect.
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match && decodeURIComponent(match[1]);
  const session = await verifySessionCookie(token, process.env.SESSION_SECRET);
  const allowed = (process.env.ALLOWED_EMAIL || "").toLowerCase();

  if (!session || session.email.toLowerCase() !== allowed) {
    return Response.json({ error: "Sign in again to save changes." }, { status: 401 });
  }

  let content;
  try {
    ({ content } = await request.json());
  } catch {
    return Response.json({ error: "Bad request." }, { status: 400 });
  }
  if (typeof content !== "string" || !content.trim()) {
    return Response.json({ error: "Nothing to save." }, { status: 400 });
  }

  const apiUrl = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${PATH}`;

  const current = await fetch(`${apiUrl}?ref=${BRANCH}`, { headers: githubHeaders() });
  if (!current.ok) {
    return Response.json(
      { error: `Couldn't read the current file from GitHub (${current.status}).` },
      { status: 502 }
    );
  }
  const { sha } = await current.json();

  const put = await fetch(apiUrl, {
    method: "PUT",
    headers: { ...githubHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({
      message: "Update content.js via editor",
      content: toBase64(content),
      sha,
      branch: BRANCH
    })
  });

  if (put.status === 409) {
    return Response.json(
      { error: "content.js changed elsewhere since you loaded this page — reload and try again." },
      { status: 409 }
    );
  }
  if (!put.ok) {
    const body = await put.text().catch(() => "");
    return Response.json(
      { error: `GitHub rejected the commit (${put.status}). ${body.slice(0, 200)}` },
      { status: 502 }
    );
  }

  return Response.json({ ok: true });
}
