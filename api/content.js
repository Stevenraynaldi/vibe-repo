import { getAll } from "../lib/store.mjs";
import { isOwner } from "../lib/auth.mjs";
import { json, fail } from "../lib/http.mjs";

export const config = { runtime: "edge" };

// Public: published posts and builds only. ?drafts=1 adds drafts, and only
// for the owner — so drafts are genuinely private, not just hidden.
export default async function handler(request) {
  if (request.method !== "GET") return json({ error: "Method not allowed" }, 405);

  const withDrafts = new URL(request.url).searchParams.get("drafts") === "1";
  if (withDrafts && !(await isOwner(request))) {
    return json({ error: "Sign in to see drafts." }, 401);
  }

  try {
    return json(await getAll({ includeDrafts: withDrafts }));
  } catch (e) {
    return fail(e);
  }
}
