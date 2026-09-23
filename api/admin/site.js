import { saveSite } from "../../lib/store.mjs";
import { isOwner } from "../../lib/auth.mjs";
import { json, fail, unauthorized, readJson } from "../../lib/http.mjs";

export const config = { runtime: "edge" };

// POST { name, role, writingIntro, buildsIntro, linkedin, github, email, url }
export default async function handler(request) {
  if (!(await isOwner(request))) return unauthorized();
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    return json({ site: await saveSite(await readJson(request)) });
  } catch (e) {
    return fail(e);
  }
}
