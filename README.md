# Whitepaper

A small personal site: writing on one page, a browsable shelf of builds on another, and a browser-based editor that generates your content file.

No framework, no build step, no database. Five files and a folder of images.

```
index.html     Writing index
post.html      A single post (post.html?id=slug)
builds.html    Builds grid + detail pop-up
admin.html     Editor — generates content.js
content.js     ← all your content lives here
app.js         Markdown renderer + shared helpers
styles.css     All styling
images/        Your images
```

## Deploy

**Vercel (recommended)**

1. Create a new GitHub repo and upload these files to the root.
2. Go to vercel.com → Add New → Project → import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty.
4. Deploy. You'll get a live URL in about 30 seconds.

Every `git push` after that redeploys automatically.

**GitHub Pages** works too: repo Settings → Pages → deploy from `main`, root folder.

## Publishing

Two ways, both fine.

**Using the editor** — open `/admin.html` on your live site, write, then click *Download content.js*. Replace `content.js` in your repo with the downloaded file and commit.

**Directly** — open `content.js` in any text editor and add an object to `POSTS` or `BUILDS`. Faster once you're used to it.

### A note on the editor

It runs entirely in your browser. Nothing is sent anywhere, which is why it needs no password — there's nothing to protect. Your draft is held in that browser's local storage until you export it, so **export before you clear your browser data or switch machines.**

If you'd rather nobody stumbles on it, delete `admin.html` from the repo and only run it locally (open the file directly, or `python3 -m http.server` in the folder).

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
