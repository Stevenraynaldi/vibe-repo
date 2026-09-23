---
name: blog-publish
description: Publish a private draft on the site, or take a published post back to draft. Use when the user says things like "publish the post about X", "make that draft live", "ship it", "unpublish that post", or "take X down".
---

# Publish (or unpublish) a post

Flips a post's `status` between `"draft"` and `"published"` through the site's
admin API. The change is live on the next page load — no commit, no redeploy.

**Site repo:** `C:\Users\steve\Haribo Mix\vibe repo`

Credentials come from `.env.local` at the repo root (`SITE_URL`,
`ADMIN_API_KEY`) — see the `blog-draft` skill, step 0. Load them in the same
shell command as each request and never print the key.

## 1. Find the post

```bash
set -a; . ./.env.local; set +a; curl -sS "$SITE_URL/api/content?drafts=1" -H "Authorization: Bearer $ADMIN_API_KEY"
```

The response is `{ site, posts, builds }`.

- Publishing: consider posts with `status: "draft"`.
- Unpublishing: consider posts with `status: "published"`.

Match the user's description against titles and ids. If there's exactly one
draft and they said "publish it", that's the one. If it's ambiguous, list the
candidates with their dates and ask — don't guess, publishing is public.

## 2. Make the change

Start from the post exactly as the API returned it.

**Publishing:**

- `status: "published"`
- Set `date` to today. A draft's date is when it was drafted; the date readers
  see should be the day it went out. **Say that you're doing it** and offer to
  keep the original if they'd rather.

**Unpublishing:**

- `status: "draft"`
- Leave `date` alone.

Change nothing else — not the body, not the dek, not the tags. If the user wants
edits too, make those explicitly and show them.

## 3. Confirm, then save

Show the title, the old and new status, and the date you're stamping.
**Ask before saving** — publishing makes writing public immediately.

On approval, write the full post object (with its `id`) as JSON to a file in
your scratchpad and POST it:

```bash
set -a; . ./.env.local; set +a; curl -sS -X POST "$SITE_URL/api/admin/posts" -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" --data-binary @"<scratchpad>/post.json"
```

The response is `{ "post": { ... } }`, or `{ "error": "..." }` — show the error
if there is one.

Report the live URL — `$SITE_URL/post.html?id=<id>`. After a publish the post
also appears on the writing index at `/`; after an unpublish it disappears from
public view immediately.

## Note

There's no reverse sync back to Obsidian. If the user edits the note in Obsidian
after publishing, they re-run `blog-draft` — it matches on `id` and updates the
existing post in place, keeping its current status rather than knocking a live
post back to draft.
