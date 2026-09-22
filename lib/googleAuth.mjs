/* Verifies a Google Sign-In ID token server-side, using jose against
   Google's own public keys rather than trusting anything the browser sent. */

import { createRemoteJWKSet, jwtVerify } from "jose";

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const GOOGLE_ISSUERS = ["https://accounts.google.com", "accounts.google.com"];

// Throws if the token doesn't verify against Google's keys, isn't for our
// Client ID, or its email isn't verified. Returns the decoded payload
// (includes .email) on success.
export async function verifyGoogleIdToken(idToken, { clientId }) {
  const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
    issuer: GOOGLE_ISSUERS,
    audience: clientId
  });

  if (!payload.email || payload.email_verified !== true) {
    throw new Error("Google account has no verified email");
  }

  return payload;
}
