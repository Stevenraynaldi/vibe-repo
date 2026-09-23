import { importAll, isEmpty } from "../../lib/store.mjs";
import { isOwner } from "../../lib/auth.mjs";
import { json, fail, unauthorized, readJson } from "../../lib/http.mjs";

export const config = { runtime: "edge" };

// POST { site, posts, builds } — one-time load of starter content. Refuses
// once the database has anything in it, so it can never overwrite your work.
export default async function handler(request) {
  if (!(await isOwner(request))) return unauthorized();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    if (!(await isEmpty())) {
      return json({ error: "The site already has content — import only works on an empty database." }, 409);
    }
    return json({ imported: await importAll(await readJson(request)) });
  } catch (e) {
    return fail(e);
  }
}
