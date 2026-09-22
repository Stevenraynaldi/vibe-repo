---
name: blog-publish
description: Publish a hidden draft on the site, or take a published post back to draft. Use when the user says things like "publish the post about X", "make that draft live", "ship it", "unpublish that post", or "take X down".
---

# Publish a draft

Flips a post's `status` in `content.js` between `"draft"` and `"published"`,
then commits and pushes. Vercel redeploys in about 20 seconds.

**Site repo:** `C:\Users\steve\Haribo Mix\vibe repo`

## 1. Find the post

Read `POSTS` in `content.js`.

- Publishing: consider entries with `status: "draft"`.
- Unpublishing: consider everything else. **A post with no `status` field is
  published** — that's the back-compatible default the whole site relies on, so
  don't treat a missing status as a draft.

Match the user's description against titles and ids. If there's exactly one
draft and they said "publish it", that's the one. If it's ambiguous, list the
candidates with their dates and ask — don't guess, publishing is public.

## 2. Make the change

**Publishing:**

- `status: "published"`
- Set `date` to today. A draft's date is when it was drafted; the date readers
  see should be the day it went out. **Say that you're doing it** and offer to
  keep the original if they'd rather.

**Unpublishing:**

- `status: "draft"`
- Leave `date` alone.

Change nothing else — not the body, not the dek, not the tags. If the user wants
edits too, make those edits explicitly and show them.

Check the file still parses:

```bash
node --check content.js
```

## 3. Confirm, then push

Show the title, the old and new status, and the date you're stamping.
**Ask before committing** — this makes writing public immediately.

On approval:

```bash
git add content.js && git commit && git push
```

Commit message: `Publish: <title>` or `Unpublish: <title>`.

Report the live URL — `<SITE.url>/post.html?id=<id>` if `SITE.url` is set,
otherwise the path — and note the ~20 second redeploy. For a publish, the post
now also appears on the writing index at `/`.

## Note

There's no reverse sync back to Obsidian. If the user edits the note in Obsidian
after publishing, they re-run `blog-draft` — it matches on `id` and updates the
existing post in place, though it will leave `status` as it found it rather than
knocking a live post back to draft.
