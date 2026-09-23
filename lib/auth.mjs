/* Who counts as the site owner. Two ways in:
   - the Google-sign-in session cookie (the admin page in a browser)
   - a bearer ADMIN_API_KEY (the Obsidian skills, which have no browser) */

import { verifySessionCookie } from "./session.mjs";

function sessionToken(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function hasOwnerSession(request) {
  const allowed = (process.env.ALLOWED_EMAIL || "").toLowerCase();
  if (!allowed) return false;
  const session = await verifySessionCookie(sessionToken(request), process.env.SESSION_SECRET);
  return !!session && String(session.email || "").toLowerCase() === allowed;
}

function sameString(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function hasApiKey(request) {
  const key = process.env.ADMIN_API_KEY || "";
  if (key.length < 24) return false; // unset or too weak to trust
  const auth = request.headers.get("authorization") || "";
  return auth.startsWith("Bearer ") && sameString(auth.slice(7).trim(), key);
}

export async function isOwner(request) {
  return hasApiKey(request) || hasOwnerSession(request);
}
