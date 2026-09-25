/* Node.js runtime, not Edge like the other routes: @vercel/blob imports
   Node modules (undici, stream). The Web-standard `POST(request)` export is
   what Vercel's Node runtime calls. */

import { put } from "@vercel/blob";
import { isOwner } from "../../lib/auth.mjs";
import { json, fail, unauthorized } from "../../lib/http.mjs";
import { slugify } from "../../lib/store.mjs";

const MAX_BYTES = 4 * 1024 * 1024; // Vercel caps function request bodies at ~4.5 MB

// No SVG: it can carry script, and these files are served publicly.
const TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif"
};

// Vercel now connects Blob stores with OIDC: no long-lived secret, just
// BLOB_STORE_ID plus a short-lived identity token Vercel attaches to each
// request. Older connections (and local dev) use a read-write token instead,
// possibly renamed by a custom env-var prefix (e.g. IMAGES_READ_WRITE_TOKEN).
function blobAuth(request) {
  const env = process.env;
  const oidcToken = request.headers.get("x-vercel-oidc-token") || env.VERCEL_OIDC_TOKEN;
  const storeId = env.BLOB_STORE_ID ||
    (Object.entries(env).find(([k, v]) => k.endsWith("_STORE_ID") && v) || [])[1];
  if (oidcToken && storeId) return { oidcToken, storeId };

  const token = env.BLOB_READ_WRITE_TOKEN ||
    Object.values(env).find(v => typeof v === "string" && v.startsWith("vercel_blob_rw_"));
  return token ? { token } : null;
}

// POST raw image bytes, Content-Type: image/…, ?name=original-filename
// → { url } of the stored, publicly served image
export async function POST(request) {
  if (!(await isOwner(request))) return unauthorized();

  const auth = blobAuth(request);
  if (!auth) {
    return json({ error: "Image storage isn't reaching this deployment. In Vercel → Storage, check your Blob store is connected to Production, then redeploy." }, 500);
  }

  const type = (request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = TYPES[type];
  if (!ext) return json({ error: "Images only: JPEG, PNG, WebP, GIF or AVIF." }, 400);

  if (Number(request.headers.get("content-length") || 0) > MAX_BYTES) {
    return json({ error: "That image is over 4 MB — try a smaller one." }, 413);
  }

  try {
    const bytes = Buffer.from(await request.arrayBuffer());
    if (!bytes.length) return json({ error: "That file is empty." }, 400);
    if (bytes.length > MAX_BYTES) return json({ error: "That image is over 4 MB — try a smaller one." }, 413);

    const name = new URL(request.url).searchParams.get("name") || "image";
    const base = slugify(name.replace(/\.[^.]+$/, "")) || "image";
    const blob = await put(`images/${base}.${ext}`, bytes, {
      access: "public",
      contentType: type,
      addRandomSuffix: true,
      ...auth
    });
    return json({ url: blob.url });
  } catch (e) {
    return fail(e);
  }
}
