import { InputError } from "./store.mjs";

// Content changes must show up on the very next page load, so nothing is cached.
export const json = (data, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

export const unauthorized = () => json({ error: "Sign in again to make changes." }, 401);

export function fail(error) {
  if (error instanceof InputError) return json({ error: error.message }, 400);
  return json({ error: error.message || "Something went wrong." }, 500);
}

// Requiring a JSON content type also means a plain cross-site form can't
// post here without the browser's CORS preflight stepping in.
export async function readJson(request) {
  if (!(request.headers.get("content-type") || "").includes("application/json")) {
    throw new InputError("Expected a JSON body.");
  }
  try {
    return await request.json();
  } catch {
    throw new InputError("That wasn't valid JSON.");
  }
}
