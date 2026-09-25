---
name: blog-draft
description: Import a reflection written in Obsidian and add it to the site as a private draft. Use when the user says things like "take my latest reflection and put it on the site", "draft my Obsidian note", "import the post about X", or names a note in the Obsidian Blog folder.
---

# Import an Obsidian note as a site draft

Turns a note from the Obsidian vault into a post on the site with
`status: "draft"`, saved straight to the site's database through its admin API.
Drafts are private: only the signed-in owner can see them, via a `?preview=1`
link. Publishing later is the `blog-publish` skill (or the Publish button in
the site's editor). There are no git commits for content.

**Vault folder:** `C:\Users\steve\Haribo Mix\second brain\Mind Palace\Blog`
**Site repo:** `C:\Users\steve\Haribo Mix\vibe repo`

## 0. Credentials

The site's admin API needs two values, kept in `.env.local` at the repo root
(gitignored — never commit it, never print its contents):

```
SITE_URL=https://your-site.vercel.app
ADMIN_API_KEY=...the same value as ADMIN_API_KEY in Vercel...
```

If the file or either value is missing, stop and tell the user how to add it.
Load it in the same shell command as each request so the key never appears in
the command text:

```bash
set -a; . ./.env.local; set +a; curl -sS "$SITE_URL/api/content?drafts=1" -H "Authorization: Bearer $ADMIN_API_KEY"
```

## 1. Pick the note

- If the user named one, match it case-insensitively against the `.md` filenames
  and titles in the Blog folder.
- If they didn't, list the notes with their modified times. Take the obvious one
  if there is exactly one recently-modified candidate; otherwise ask which.
- Read the whole note before doing anything else.

## 2. Read the fields

Optional YAML frontmatter, all keys optional:

```yaml
---
title: Why I stopped writing weekly
dek: One sentence for the index and link previews.
tags: [Notes, Writing]
date: 2026-08-15
id: why-i-stopped-writing-weekly
---
```

Fill in whatever is missing:

| Field | If absent |
|---|---|
| `title` | the note's leading `# H1`, else the filename without `.md` |
| `dek` | write one sentence from the opening paragraph — **tell the user you generated it** so they can replace it |
| `date` | today, `YYYY-MM-DD` |
| `tags` | inline `#tags` found in the note, stripped from the body; else `[]` |
| `id` | slug of the title: lowercase, non-alphanumerics → `-`, trim leading/trailing `-`, max 60 chars |
| `verified`, `deps` | `""` — these are for technical posts, leave blank unless frontmatter sets them |

The user writes reflections, not structured posts. A note with no frontmatter at
all is the normal case, not an error.

## 3. Convert the body

The site's renderer (`markdown()` in `app.js`) is deliberately small. Convert to
what it actually supports — `##`–`####` headings, `**bold**`, `*italic*`,
`` `code` ``, ` ```blocks``` `, `-`/`1.` lists, `>` quotes, `[text](url)`,
`![caption](url)`, `---`, and pipe tables (`| a | b |` with a `| --- | :---: |`
row; column alignment is kept). **Leave Obsidian tables exactly as they are.**

Video embeds also work: a YouTube, Vimeo or Loom link on its own line, or
Obsidian's `![caption](video link)`, becomes a player. **Leave those as-is** —
they aren't images, so don't try to upload them. A video link in the middle of
a sentence stays a plain link.

- Strip the frontmatter block.
- Strip the leading `# H1` — it became the title. **Demote any remaining `#` to
  `##`**: the renderer only matches `#{2,4}`, so a lone `#` would render as
  literal "# text".
- `[[Note|alias]]` → `alias`; `[[Note]]` → `Note`. There are no wiki pages to
  link to on this site. Inside a table Obsidian writes `[[Note\|alias]]` — that
  becomes `alias` too. (The site also flattens any wikilink you miss, so this is
  tidiness, not a correctness issue.)
- `![[image.png]]` → find the file in the vault and upload it (step 4). Rewrite
  the embed to `![](<returned url>)`. **If you can't find it or the upload
  fails, leave the line as-is and report it** — never silently drop an image.
- Remove inline `#tags` lines you consumed as tags.
- Normalise `\r\n` to `\n`. Leave the prose itself alone — don't rewrite the
  user's words, tighten their sentences, or "improve" the structure.

Alt text renders as a visible caption underneath the image, so only give an
image alt text if it reads well as a caption.

## 4. Upload images

Each image goes up on its own; the response is `{ "url": "..." }`:

```bash
set -a; . ./.env.local; set +a; curl -sS -X POST "$SITE_URL/api/admin/upload?name=photo.png" -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: image/png" --data-binary @"C:/path/to/photo.png"
```

Accepted: JPEG, PNG, WebP, GIF, AVIF, up to 4 MB. Set `Content-Type` to match
the file. A larger file is rejected — report it rather than skipping silently
(the user can resize it, or add it later through the editor's Insert image,
which shrinks photos automatically).

## 5. Check whether it already exists

Fetch everything including drafts (`GET /api/content?drafts=1`, as in step 0)
and look for a post with the same `id`.

- **Exists → update it in place**, and **keep its existing `status`**:
  re-importing an edit to a post that's already live must not silently take it
  down. Tell the user it stayed live, so they know the edit is public as soon
  as you save.
- **New → `status: "draft"`.**

## 6. Confirm, then save

Show the user, before saving anything:

- title, dek (flagged if you wrote it), date, tags, id
- new draft, or update to an existing post (and whether that post is live)
- any warnings — missing images, syntax you couldn't convert
- a body word count

**Ask before saving.** On approval, write the post as JSON to a file in your
scratchpad (not the repo) — this sidesteps all shell-quoting problems with the
body — then POST it:

```json
{ "id": "...", "title": "...", "dek": "...", "date": "YYYY-MM-DD", "status": "draft",
  "tags": ["..."], "verified": "", "deps": "", "body": "..." }
```

```bash
set -a; . ./.env.local; set +a; curl -sS -X POST "$SITE_URL/api/admin/posts" -H "Authorization: Bearer $ADMIN_API_KEY" -H "Content-Type: application/json" --data-binary @"<scratchpad>/post.json"
```

The response is `{ "post": { ... } }` with the saved post, or `{ "error": "..." }`
— show the error if there is one.

Then hand back the preview link: `$SITE_URL/post.html?id=<id>&preview=1`. It
shows the draft only in a browser where the user is signed in to the editor.
It's saved instantly — no redeploy to wait for. Publishing is `blog-publish`,
or the Publish button in the editor.
