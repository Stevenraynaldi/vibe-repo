/* All site content lives in Upstash Redis, reached over its REST API with
   plain fetch (no SDK, so values come back exactly as stored).

   Keys:
     site          JSON string
     posts         hash   id -> post JSON
     builds        hash   id -> build JSON
     builds:order  list   build ids, in the order the grid shows them */

export class InputError extends Error {}

const POST_FIELDS = ["id", "title", "dek", "date", "status", "tags", "verified", "deps", "body"];
const BUILD_FIELDS = ["id", "name", "icon", "pitch", "status", "visibility", "stack", "year", "repo", "demo", "detail", "tools", "config"];
const SITE_FIELDS = ["name", "role", "writingIntro", "buildsIntro", "linkedin", "github", "email", "url"];
const LIST_FIELDS = new Set(["tags", "stack", "tools"]);

/* ---------- Redis over REST ---------- */

function connection() {
  // The Vercel/Upstash integration has used both naming schemes.
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  if (!url || !token) {
    throw new Error("The database isn't connected yet — add Upstash Redis from Vercel's Storage tab.");
  }
  return { url: url.replace(/\/$/, ""), token };
}

async function send(path, commands) {
  const { url, token } = connection();
  const res = await fetch(`${url}${path}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error(`Database request failed (${res.status})`);
  const results = await res.json();
  return results.map(r => {
    if (r.error) throw new Error(`Database error: ${r.error}`);
    return r.result;
  });
}

const pipeline = commands => send("/pipeline", commands);
const transaction = commands => send("/multi-exec", commands); // runs atomically, nothing interleaves

/* ---------- cleaning input ---------- */

function pick(input, fields) {
  const out = {};
  for (const f of fields) {
    const v = input == null ? undefined : input[f];
    out[f] = LIST_FIELDS.has(f)
      ? (Array.isArray(v) ? v : String(v ?? "").split(",")).map(x => String(x).trim()).filter(Boolean)
      : String(v ?? "");
  }
  return out;
}

function oneOf(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback;
}

export function slugify(text) {
  return String(text || "").toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
}

function uniqueId(base, taken) {
  const root = base || `item-${Date.now().toString(36)}`;
  let id = root;
  for (let n = 2; taken.includes(id); n++) id = `${root}-${n}`;
  return id;
}

const parse = s => { try { return JSON.parse(s); } catch { return null; } };

function hashToItems(flat) {
  const items = [];
  for (let i = 0; i < (flat || []).length; i += 2) {
    const item = parse(flat[i + 1]);
    if (item) items.push(item);
  }
  return items;
}

/* ---------- reads ---------- */

export async function getAll({ includeDrafts = false } = {}) {
  const [siteJson, postsFlat, buildsFlat, order] = await pipeline([
    ["GET", "site"],
    ["HGETALL", "posts"],
    ["HGETALL", "builds"],
    ["LRANGE", "builds:order", "0", "-1"]
  ]);

  const site = pick(parse(siteJson) || {}, SITE_FIELDS);
  let posts = hashToItems(postsFlat)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));

  const byId = new Map(hashToItems(buildsFlat).map(b => [b.id, b]));
  let builds = (order || []).map(id => byId.get(id)).filter(Boolean);
  for (const b of byId.values()) if (!builds.includes(b)) builds.push(b);

  const empty = !siteJson && posts.length === 0 && builds.length === 0;

  if (!includeDrafts) {
    posts = posts.filter(p => p.status !== "draft");
    builds = builds.filter(b => b.visibility !== "draft");
  }
  return { site, posts, builds, empty };
}

export async function isEmpty() {
  const [hasSite, postCount, buildCount] = await pipeline([
    ["EXISTS", "site"], ["HLEN", "posts"], ["HLEN", "builds"]
  ]);
  return !hasSite && !postCount && !buildCount;
}

/* ---------- writes ---------- */

function cleanPost(input) {
  const post = pick(input, POST_FIELDS);
  post.title = post.title.trim();
  if (!post.title) throw new InputError("A post needs a title.");
  post.status = oneOf(post.status, ["draft", "published"], "draft");
  if (!post.date) post.date = new Date().toISOString().slice(0, 10);
  return post;
}

function cleanBuild(input) {
  const build = pick(input, BUILD_FIELDS);
  build.name = build.name.trim();
  if (!build.name) throw new InputError("A build needs a name.");
  build.status = oneOf(build.status, ["prototype", "live", "archived"], "prototype");
  build.visibility = oneOf(build.visibility, ["draft", "published"], "draft");
  return build;
}

export async function savePost(input) {
  const post = cleanPost(input);
  if (!post.id) {
    const [taken] = await pipeline([["HKEYS", "posts"]]);
    post.id = uniqueId(slugify(post.title), taken || []);
  }
  await pipeline([["HSET", "posts", post.id, JSON.stringify(post)]]);
  return post;
}

export async function deletePost(id) {
  if (!id) throw new InputError("Missing id.");
  const [removed] = await pipeline([["HDEL", "posts", id]]);
  return removed > 0;
}

export async function saveBuild(input) {
  const build = cleanBuild(input);
  let isNew = false;
  if (!build.id) {
    const [taken] = await pipeline([["HKEYS", "builds"]]);
    build.id = uniqueId(slugify(build.name), taken || []);
    isNew = true;
  } else {
    const [exists] = await pipeline([["HEXISTS", "builds", build.id]]);
    isNew = !exists;
  }
  const commands = [["HSET", "builds", build.id, JSON.stringify(build)]];
  if (isNew) commands.push(["LPUSH", "builds:order", build.id]); // new builds go first
  await transaction(commands);
  return build;
}

export async function deleteBuild(id) {
  if (!id) throw new InputError("Missing id.");
  const [removed] = await transaction([
    ["HDEL", "builds", id],
    ["LREM", "builds:order", "0", id]
  ]);
  return removed > 0;
}

// Only reorders — ids that don't exist are dropped, and any existing build
// missing from the list is kept at the end, so a bad request can't lose one.
export async function setBuildOrder(ids) {
  if (!Array.isArray(ids)) throw new InputError("order must be a list of ids.");
  const [existing] = await pipeline([["HKEYS", "builds"]]);
  const known = new Set(existing || []);
  const order = [...new Set(ids.map(String))].filter(id => known.has(id));
  for (const id of known) if (!order.includes(id)) order.push(id);
  const commands = [["DEL", "builds:order"]];
  if (order.length) commands.push(["RPUSH", "builds:order", ...order]);
  await transaction(commands);
  return order;
}

export async function saveSite(input) {
  const site = pick(input, SITE_FIELDS);
  await pipeline([["SET", "site", JSON.stringify(site)]]);
  return site;
}

export async function importAll({ site, posts = [], builds = [] }) {
  const cleanPosts = posts.map(p => ({ ...cleanPost(p), id: p.id || slugify(p.title) }));
  const cleanBuilds = builds.map(b => ({ ...cleanBuild(b), id: b.id || slugify(b.name) }));

  const commands = [["SET", "site", JSON.stringify(pick(site || {}, SITE_FIELDS))]];
  if (cleanPosts.length) {
    commands.push(["HSET", "posts", ...cleanPosts.flatMap(p => [p.id, JSON.stringify(p)])]);
  }
  if (cleanBuilds.length) {
    commands.push(["HSET", "builds", ...cleanBuilds.flatMap(b => [b.id, JSON.stringify(b)])]);
    commands.push(["DEL", "builds:order"]);
    commands.push(["RPUSH", "builds:order", ...cleanBuilds.map(b => b.id)]);
  }
  await transaction(commands);
  return { posts: cleanPosts.length, builds: cleanBuilds.length };
}
