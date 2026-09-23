/* Runs before /admin.html is served — the actual gate. A client-side check
   alone can always be read or bypassed in devtools; this can't be, because
   it decides whether the file is sent at all. */

import { hasOwnerSession } from "./lib/auth.mjs";

export const config = { matcher: ["/admin.html"] };

export default async function middleware(request) {
  if (await hasOwnerSession(request)) return; // fall through to the static file
  return Response.redirect(new URL("/login.html", request.url));
}
