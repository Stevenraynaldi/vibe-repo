---
name: blog-draft
description: Import a reflection written in Obsidian and add it to the site as a hidden draft. Use when the user says things like "take my latest reflection and put it on the site", "draft my Obsidian note", "import the post about X", or names a note in the Obsidian Blog folder.
---

# Import an Obsidian note as a site draft

Turns a note from the Obsidian vault into a `POSTS` entry in `content.js` with
`status: "draft"`, then commits and pushes. The draft is hidden from the public
site; the user reads it back via a `?preview=1` URL and publishes later with the
`blog-publish` skill.

**Vault folder:** `C:\Users\steve\Haribo Mix\second brain\Mind Palace\Blog`
**Site repo:** `C:\Users\steve\Haribo Mix\vibe repo`

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
| `id` | slug of the title (see step 4) |
| `verified`, `deps` | `""` — these are for technical posts, leave blank unless frontmatter sets them |

The user writes reflections, not structured posts. A note with no frontmatter at
all is the normal case, not an error.

## 3. Convert the body

The site's renderer (`app.js`) is deliberately small. Convert to what it
actually supports — `##`–`####` headings, `**bold**`, `*italic*`, `` `code` ``,
` ```blocks``` `, `-`/`1.` lists, `>` quotes, `[text](url)`,
`![caption](images/x.png)`, `---`.

- Strip the frontmatter block.
- Strip the leading `# H1` — it became the title. **Demote any remaining `#` to
  `##`**: the renderer only matches `#{2,4}` (`app.js:62`), so a lone `#` would
  render as literal "# text".
- `[[Note|alias]]` → `alias`; `[[Note]]` → `Note`. There are no wiki pages to
  link to on this site.
- `![[image.png]]` → copy the attachment into the repo's `images/` folder and
  rewrite to `![](images/image.png)`. Search the vault for the file. **If you
  can't find it, leave the line as-is and report it** — never silently drop
  someone's image.
- Remove inline `#tags` lines you consumed as tags.
- Normalise `\r\n` to `\n`. Leave the prose itself alone — don't rewrite the
  user's words, tighten their sentences, or "improve" the structure.

Alt text renders as a visible caption underneath the image, so only give an
image alt text if it reads well as a caption.

## 4. Write into content.js

- **Slug**: lowercase, non-alphanumerics → `-`, trim leading/trailing `-`, cap
  at 60 chars. Same rule as `slug()` in `admin.html`.
- **If a post with that `id` already exists, update it in place** rather than
  adding a second copy — re-running after an edit in Obsidian must be safe. Say
  which one you did. **Keep the existing `status`**: re-importing an edit to a
  post that's already live must not silently take it down. Mention that it
  stayed live, so the user knows the edit is public the moment you push.
- Otherwise insert at the top of the `POSTS` array with `status: "draft"`.
- Field order matches the existing entries: `id, title, dek, date, status, tags,
  verified, deps, body`.

**Escaping — get this right or the file won't parse.** `body` is a JS template
literal. In the body text, escape in this order: `\` → `\\`, then `` ` `` →
`` \` ``, then `${` → `\${`. This mirrors `tpl()` in `admin.html`. Fenced code
blocks inside the note contain backticks, so this bites on almost every
technical post.

Then check the file parses before you commit:

```bash
node --check content.js
```

## 5. Confirm, then push

Show the user, before touching git:

- title, dek (flagged if you wrote it), date, tags, id
- whether this created a new draft or updated an existing one
- any warnings — missing image attachments, syntax you couldn't convert
- a body word count

**Ask before committing.** A push is public and immediate. On approval:

```bash
git add content.js images/ && git commit && git push
```

Commit message: `Add draft: <title>` (or `Update draft: <title>`).

Then hand back the preview link — `<SITE.url>/post.html?id=<id>&preview=1` if
`SITE.url` is set in `content.js`, otherwise the path alone with a note that
filling in `SITE.url` would make it clickable. Mention that Vercel takes about
20 seconds, and that publishing is `blog-publish` when they're happy.
