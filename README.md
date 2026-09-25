# Whitepaper

A small personal site: writing on one page, a browsable shelf of builds on another, and a signed-in editor to manage both. Every save in the editor is live on the next page load.

The pages are plain HTML/CSS/JS — no framework, no build step. Content lives in a database (Upstash Redis) and images in Vercel Blob, both reached through a handful of small serverless functions.

```
index.html      Writing index
post.html       A single post (post.html?id=slug)
builds.html     Builds grid + detail pop-up
admin.html      The editor (Google sign-in required)
login.html      Google sign-in page
app.js          Loads content from the API, markdown renderer, shared helpers
styles.css      All styling (light + dark)
seed.json       Starter content — imported once into an empty database
middleware.js   Gates /admin.html behind a signed-in session
api/content.js  Public read: published posts + builds (drafts only for you)
api/admin/      Save/delete posts and builds, site details, image upload, import
api/auth/       Google sign-in → session cookie, and logout
lib/            Storage, auth, and session code shared by the functions
.claude/skills  Agent skills for the Obsidian → draft → publish workflow
```

## How it fits together

```
Visitors ──GET /api/content──────────────▶ Upstash Redis
Editor (you, signed in) ──/api/admin/*───▶ Upstash Redis
                                        └─▶ Vercel Blob (images)
Obsidian skills ──/api/admin/* + API key─┘
```

Editing content never touches git or triggers a redeploy — that only happens when the site's *code* changes.

## Deploy

1. Put this repo on GitHub, then vercel.com → Add New → Project → import it. Framework preset: **Other**, build command and output directory empty.
2. **Storage** tab → Create → **Upstash for Redis** → connect it to this project. Its connection details are added as environment variables automatically.
3. **Storage** tab → Create → **Blob** → connect it to this project. Same — `BLOB_READ_WRITE_TOKEN` is added for you.
4. Set up sign-in (next section) and add `ADMIN_API_KEY`.
5. Redeploy, open `/admin.html`, sign in, and choose **Import starter content** (or **Start empty**).

Both stores have free tiers that comfortably cover a personal blog.

**This needs Vercel** (or a host with the same serverless-functions model). GitHub Pages can't run the API, so the site would have no content at all there.

## Setting up sign-in

One-time, in your own Google Cloud and Vercel accounts.

1. **Google Cloud Console** → APIs & Services → OAuth consent screen → User type **External** → fill in the basics → add your own email as a **test user**. (Testing mode is fine indefinitely for a plain sign-in — no need to publish the app.)
2. **Credentials** → Create Credentials → **OAuth client ID** → **Web application** → under Authorized JavaScript origins, add your live URL (e.g. `https://yoursite.vercel.app`) → Create, and copy the Client ID.
3. Paste that Client ID into `login.html`'s `data-client_id`. It isn't secret — it identifies the app to Google, like any client-side sign-in button.
4. **Vercel** → your project → Settings → Environment Variables:
   - `GOOGLE_CLIENT_ID` — the same Client ID.
   - `ALLOWED_EMAIL` — the one Google account allowed in.
   - `SESSION_SECRET` — a long random string that signs the session cookie (`openssl rand -hex 32`, or ask the agent). Must be at least 16 characters.
   - `ADMIN_API_KEY` — a long random string (`openssl rand -hex 32`) that lets the Obsidian skills write without a browser. Treat it like a password: anyone with it can edit your site.
5. Redeploy — env var changes don't reach a deployment that's already running.

This is personal-blog-grade protection: real, but not enterprise SSO. Sessions last 14 days (`SESSION_MAX_AGE` in `api/auth/verify.js`).

## Using the editor

`yoursite.com/admin.html`, or the small **Editor** link in every page's footer.

- **Posts / Builds** — a list of everything with its status. Click one to edit it, or **New post** / **New build**.
- In the editor, each button saves immediately:
  - a draft shows **Save draft** and **Publish**
  - a live one shows **Save** and **Unpublish**
  - **Delete** and **Preview ↗** for anything already saved
- **Insert image** (or drop / paste an image into the text) uploads it and adds it to the post. Big photos are scaled to 1600px wide in your browser first. Text inside the `[ ]` becomes the caption.
- **Insert video** takes a YouTube, Vimeo or Loom link and embeds a player (see *Markdown supported* below).
- **Builds** also take a **card icon** — a logo or app icon shown on the card and in its pop-up.
- **Site** — your name, intros and links. Save, and the header updates everywhere.
- If you try to leave with unsaved changes, it asks first.

## Drafts

Posts carry `status` and builds carry `visibility` — `"draft"` or `"published"`. (Builds use a separate field because their `status` already means prototype / live / archived.)

Drafts are private. The public API never returns them; only you, signed in, get them. Add `?preview=1` to any page to see drafts in place on the real site. It sticks for the browser session, and `?preview=0` turns it off. In a browser where you aren't signed in, preview mode just asks you to sign in.

## The Obsidian workflow

Write in `second brain/Mind Palace/Blog`, then ask Claude Code to *draft my note about X*. The `blog-draft` skill converts the note, uploads any images, and saves it as a draft through the API. Read it back with the preview link it gives you, then ask it to *publish the post about X* (the `blog-publish` skill), or click Publish in the editor. Both skills show you what they're about to do and wait for a yes.

The skills need a `.env.local` file at the repo root (gitignored, never committed):

```
SITE_URL=https://yoursite.vercel.app
ADMIN_API_KEY=the same value you set in Vercel
```

## Local development

The pages load content from `/api/content`, so a plain static server isn't enough. Use Vercel's:

```bash
npx vercel link
```

```bash
npx vercel env pull .env.local
```

```bash
npx vercel dev
```

## Markdown supported

`## Heading` · `### Subheading` · `**bold**` · `*italic*` · `` `code` `` · ```` ```code block``` ```` · `- list` · `1. list` · `> quote` · `[link](url)` · `![caption](url)` · `---` · tables

Tables are the pipe kind Obsidian writes — paste them in as-is, alignment and all:

```
| Tool   | Stars | Notes |
| :----- | ----: | :---: |
| CrewAI |    12 | fast  |
```

**Videos** — put a YouTube, Vimeo or Loom link on its own line (or use Obsidian's `![caption](link)`) and it becomes an embedded player; timestamps like `?t=1m30s` carry over, and YouTube Shorts get a vertical player. Upload videos to YouTube as **Unlisted** — they stay out of YouTube search, and YouTube handles streaming. Don't put video files in Blob storage: uploads through the site cap at ~4 MB, and every play would count against its bandwidth.

Obsidian `[[wikilinks]]` show as plain text (there are no wiki pages to link to). Three or more `##` headings in a post automatically generate a contents list at the top.

## Link previews on LinkedIn

Each page has Open Graph tags pointing at `images/og-default.png`. Add a 1200×630px image at that path and every shared link gets a proper preview card instead of a grey box. All posts share that one image; per-post previews would need pages rendered on the server.

After changing OG tags, run the URL through LinkedIn's Post Inspector to clear its cache.

## Making it yours

Colours and type live at the top of `styles.css` as CSS variables, with a matching dark set below them. The accent is a single ink blue — change `--accent` and the whole site follows.
