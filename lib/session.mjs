/* Signs and verifies the editor's session cookie.
   Uses jose's own JWT (HS256) rather than a hand-rolled cookie format —
   one dependency covers this and Google token verification (googleAuth.mjs). */

import { SignJWT, jwtVerify } from "jose";

const ALG = "HS256";

function key(secret) {
  return new TextEncoder().encode(secret);
}

export async function createSessionCookie(email, secret, maxAgeSeconds) {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + maxAgeSeconds)
    .sign(key(secret));
}

// Returns the { email, iat, exp } payload, or null if the token is missing,
// tampered with, expired, or signed with a different secret.
export async function verifySessionCookie(token, secret) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(secret), { algorithms: [ALG] });
    return payload;
  } catch {
    return null;
  }
}
