# Whitepaper

A small personal site: writing on one page, a browsable shelf of builds on another, and a browser-based editor that generates your content file.

No framework, no build step, no database. Five files and a folder of images.

```
index.html     Writing index
post.html      A single post (post.html?id=slug)
builds.html    Builds grid + detail pop-up
admin.html     Editor — generates content.js (not deployed)
content.js     ← all your content lives here
app.js         Markdown renderer + shared helpers
styles.css     All styling
images/        Your images
.vercelignore  What stays out of the live site
.claude/skills Agent skills for the Obsidian workflow
```

## Deploy

**Vercel (recommended)**

1. Create a new GitHub repo and upload these files to the root.
2. Go to vercel.com → Add New → Project → import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy. You'll get a live URL in about 30 seconds.

Every `git push` after that redeploys automatically.

**GitHub Pages** works too: repo Settings → Pages → deploy from `main`, root folder.

## Drafts

Every post carries a `status`:

- `"draft"` — hidden from the writing index, and `post.html?id=slug` reports it doesn't exist.
- `"published"`, or no `status` at all — live.

To read a draft on the real site, add `?preview=1` to any URL. Preview stays on for the rest of the browser session, so you can click from the index into a draft, and a black bar across the top reminds you it's on. `?preview=0` turns it off.

**A draft is hidden, not secret.** Its text still sits inside `content.js`, which anyone can open directly at `yoursite.com/content.js`. That's fine for unfinished writing. Don't put anything you'd mind being read in one.

## Publishing

Three ways.

**From Obsidian, via the agent** — the main path. Write in `second brain/Mind Palace/Blog`, then ask Claude Code to *draft my note about X*. The `blog-draft` skill converts it, adds it as a draft, and pushes. Read it back on the live site with the preview link it gives you. When you're happy, ask it to *publish the post about X* and the `blog-publish` skill flips it live. Both skills show you what they're about to do and wait for a yes before pushing.

**Using the editor** — open `admin.html` locally, write, set the status, then click *Download content.js*. Replace `content.js` in your repo and commit.

**Directly** — open `content.js` in any text editor and add an object to `POSTS` or `BUILDS`. Faster once you're used to it.

### A note on the editor

It's listed in `.vercelignore`, so it never reaches the live site — there's no `/admin.html` out there for anyone to find. Open it locally instead:

```bash
python3 -m http.server 8000
```

Then go to `localhost:8000/admin.html`.

It runs entirely in your browser; nothing is sent anywhere. Your draft is held in that browser's local storage until you export it, so **export before you clear your browser data or switch machines.**

Because the agent skills also write `content.js`, the editor checks whether the file has changed since your last visit and asks which version to keep rather than quietly overwriting the newer one.

There's no login on any of this, and there can't be — the site is static, with no server to check a password against. Keeping the editor out of the deploy *is* the lock. Anything stronger (a real login, genuinely private drafts) needs Vercel's paid deployment protection or a small backend.

## Adding images

Put the file in `images/`, then reference it in the body:

```
![Architecture of the research crew](images/crew-diagram.png)
```

The alt text renders as a caption underneath. Resize images to about 1400px wide before uploading — anything larger just slows the page down.

## Markdown supported

`## Heading` · `### Subheading` · `**bold**` · `*italic*` · `` `code` `` · ```` ```code block``` ```` · `- list` · `1. list` · `> quote` · `[link](url)` · `![caption](images/x.png)` · `---`

Three or more `##` headings in a post automatically generate a contents list at the top.

## Link previews on LinkedIn

Each page has Open Graph tags pointing at `images/og-default.png`. Add a 1200×630px image at that path and every shared link gets a proper preview card instead of a grey box.

Because there's no build step, all posts share that one preview image. If you want per-post images later, that's the point where moving to a static site generator earns its keep.

After changing OG tags, run the URL through LinkedIn's Post Inspector to clear its cache.

## Making it yours

Colours and type live at the top of `styles.css` as CSS variables. The accent is a single ink blue — change `--accent` and the whole site follows.
