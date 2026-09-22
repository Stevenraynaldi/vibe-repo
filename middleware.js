/* Runs before /admin.html is served — the actual gate. A client-side check
   alone can always be read or bypassed in devtools; this can't be, because
   it decides whether the file is sent at all. */

import { verifySessionCookie } from "./lib/session.mjs";

export const config = { matcher: ["/admin.html"] };

export default async function middleware(request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const match = cookieHeader.match(/(?:^|;\s*)session=([^;]+)/);
  const token = match && decodeURIComponent(match[1]);

  const session = await verifySessionCookie(token, process.env.SESSION_SECRET);
  const allowed = (process.env.ALLOWED_EMAIL || "").toLowerCase();

  if (session && session.email.toLowerCase() === allowed) {
    return; // fall through to the static file
  }

  return Response.redirect(new URL("/login.html", request.url));
}
