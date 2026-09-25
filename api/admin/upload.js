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

// Connecting a Blob store with a custom env-var prefix renames the variable
// (e.g. IMAGES_READ_WRITE_TOKEN), so fall back to any value shaped like one.
function blobToken() {
  return process.env.BLOB_READ_WRITE_TOKEN ||
    Object.values(process.env).find(v => typeof v === "string" && v.startsWith("vercel_blob_rw_"));
}

// POST raw image bytes, Content-Type: image/…, ?name=original-filename
// → { url } of the stored, publicly served image
export async function POST(request) {
  if (!(await isOwner(request))) return unauthorized();

  const token = blobToken();
  if (!token) {
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
      token
    });
    return json({ url: blob.url });
  } catch (e) {
    return fail(e);
  }
}
