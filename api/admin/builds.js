import { saveBuild, deleteBuild, setBuildOrder } from "../../lib/store.mjs";
import { isOwner } from "../../lib/auth.mjs";
import { json, fail, unauthorized, readJson } from "../../lib/http.mjs";

export const config = { runtime: "edge" };

// POST  { ...build }        → create (no id) or update (with id); returns { build }
// POST  { order: [ids] }    → reorder the Builds grid; returns { order }
// DELETE ?id=…              → remove
export default async function handler(request) {
  if (!(await isOwner(request))) return unauthorized();
  try {
    if (request.method === "POST") {
      const body = await readJson(request);
      if (Array.isArray(body.order)) return json({ order: await setBuildOrder(body.order) });
      return json({ build: await saveBuild(body) });
    }
    if (request.method === "DELETE") {
      const id = new URL(request.url).searchParams.get("id");
      return json({ deleted: await deleteBuild(id) });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return fail(e);
  }
}
