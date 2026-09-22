import { verifyGoogleIdToken } from "../../lib/googleAuth.mjs";
import { createSessionCookie } from "../../lib/session.mjs";

export const config = { runtime: "edge" };

const SESSION_MAX_AGE = 60 * 60 * 24 * 14; // 14 days — change here if you want a different session length

export default async function handler(request) {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  let credential;
  try {
    ({ credential } = await request.json());
  } catch {
    return new Response("Bad request", { status: 400 });
  }
  if (!credential) return new Response("Missing credential", { status: 400 });

  let payload;
  try {
    payload = await verifyGoogleIdToken(credential, {
      clientId: process.env.GOOGLE_CLIENT_ID
    });
  } catch {
    return new Response("Invalid Google token", { status: 401 });
  }

  if (payload.email.toLowerCase() !== (process.env.ALLOWED_EMAIL || "").toLowerCase()) {
    return new Response("That Google account isn't the site owner", { status: 403 });
  }

  const cookie = await createSessionCookie(
    payload.email,
    process.env.SESSION_SECRET,
    SESSION_MAX_AGE
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": `session=${encodeURIComponent(cookie)}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`
    }
  });
}
