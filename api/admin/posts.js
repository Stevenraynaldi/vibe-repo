import { savePost, deletePost } from "../../lib/store.mjs";
import { isOwner } from "../../lib/auth.mjs";
import { json, fail, unauthorized, readJson } from "../../lib/http.mjs";

export const config = { runtime: "edge" };

// POST  { ...post }  → create (no id) or update (with id); returns { post }
// DELETE ?id=…       → remove
export default async function handler(request) {
  if (!(await isOwner(request))) return unauthorized();
  try {
    if (request.method === "POST") {
      return json({ post: await savePost(await readJson(request)) });
    }
    if (request.method === "DELETE") {
      const id = new URL(request.url).searchParams.get("id");
      return json({ deleted: await deletePost(id) });
    }
    return json({ error: "Method not allowed" }, 405);
  } catch (e) {
    return fail(e);
  }
}
