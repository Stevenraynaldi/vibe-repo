# Whitepaper

A small personal site: writing on one page, a browsable shelf of builds on another, and a browser-based editor that generates your content file.

Almost no backend — the pages themselves are still plain HTML/CSS/JS with no framework or build step. The one exception is the editor's login, which needs a couple of small serverless functions to be real. See [Setting up the editor's login](#setting-up-the-editors-login).

```
index.html     Writing index
post.html      A single post (post.html?id=slug)
builds.html    Builds grid + detail pop-up
admin.html     Editor — generates content.js (login-gated)
login.html     Google sign-in page for the editor
content.js     ← all your content lives here
app.js         Markdown renderer + shared helpers
styles.css     All styling
images/        Your images
middleware.js  Gates /admin.html behind a signed-in session
api/auth/      Verifies Google sign-in, issues/clears the session cookie
lib/           Shared cookie + Google-token verification code
package.json   One dependency (jose), only for the login gate
.vercelignore  What stays out of the live site
.claude/skills Agent skills for the Obsidian workflow
```

## Deploy

**Vercel — the only supported option now.**

1. Create a new GitHub repo and upload these files to the root.
2. Go to vercel.com → Add New → Project → import the repo.
3. Framework preset: **Other**. Leave build command and output directory empty. Vercel installs `package.json`'s one dependency and deploys `middleware.js` / `api/` automatically — no other setup.
4. Deploy. You'll get a live URL in about 30 seconds.
5. Finish the login setup below before you rely on the editor being gated.

Every `git push` after that redeploys automatically.

**GitHub Pages no longer works.** It only serves static files — there's nowhere for `middleware.js` or `api/auth/*` to run, so the login gate would have nothing to check and `/admin.html` would be wide open. If you don't want the login feature, you could strip `middleware.js`, `api/`, `lib/`, `login.html`, and `package.json` back out and go back to the old approach of excluding `admin.html` from the deploy instead — but as shipped, this repo needs Vercel (or another host with the same serverless-functions-plus-middleware model, like Netlify or Cloudflare Pages).

## Drafts

Every post carries a `status`, and every build carries a `visibility` — same idea, different field name because a build's `status` already means something else (prototype/live/archived):

- `"draft"` — hidden from its public page. `post.html?id=slug` reports the post doesn't exist; a draft build just doesn't appear in the Builds grid.
- `"published"`, or the field absent — live.

To read a draft on the real site, add `?preview=1` to any URL. Preview stays on for the rest of the browser session, so you can click from index to post (or into a draft build's pop-up), and a black bar across the top reminds you it's on. `?preview=0` turns it off.

**A draft is hidden, not secret.** Its text still sits inside `content.js`, which anyone can open directly at `yoursite.com/content.js`. That's true even with the editor's login below — the login gates who can *use the editor*, not what's in that file. Don't put anything you'd mind being read in a draft.

## Publishing

Three ways.

**From Obsidian, via the agent** — the main path. Write in `second brain/Mind Palace/Blog`, then ask Claude Code to *draft my note about X*. The `blog-draft` skill converts it, adds it as a draft, and pushes. Read it back on the live site with the preview link it gives you. When you're happy, ask it to *publish the post about X* and the `blog-publish` skill flips it live. Both skills show you what they're about to do and wait for a yes before pushing.

**Using the editor** — go to `yoursite.com/admin.html` (there's a small "Editor" link in the footer of every page), sign in with your Google account, write, set the status, then click *Download content.js*. Replace `content.js` in your repo and commit.

**Directly** — open `content.js` in any text editor and add an object to `POSTS` or `BUILDS`. Faster once you're used to it.

### A note on the editor

`/admin.html` is deployed, but `middleware.js` checks for a valid signed-in session before the file is even served — anyone else hitting that URL is redirected to `/login.html` and can't get past it. This is a real gate, not a client-side check: there's nothing in the browser to bypass, because the browser never receives the page without a valid session cookie in the first place.

Signing in still works locally too, once the login setup below is done and you're pointed at the live site's `/api/auth/verify` — but running the editor purely offline (`python3 -m http.server`) skips the gate entirely, since there's no middleware without Vercel serving the request. That's fine for writing; just remember the login only matters once it's deployed.

It otherwise runs the same as before: entirely client-side, holding your draft in that browser's local storage until you export it, so **export before you clear your browser data or switch machines.** Because the agent skills also write `content.js`, the editor checks whether the file has changed since your last visit and asks which version to keep rather than quietly overwriting the newer one.

## Setting up the editor's login

One-time setup, using your own Google Cloud and Vercel accounts — I can't do these steps for you.

1. **Google Cloud Console** → APIs & Services → OAuth consent screen → User type **External** → fill in the basics → add your own email as a **test user**. (Testing mode is fine indefinitely for a plain sign-in with no extra scopes — no need to publish the app.)
2. **Credentials** → Create Credentials → **OAuth client ID** → Application type **Web application** → under Authorized JavaScript origins, add your live Vercel URL (e.g. `https://yoursite.vercel.app`) → Create. Copy the Client ID it gives you (ends in `.apps.googleusercontent.com`).
3. Paste that Client ID into `login.html`, replacing `YOUR_CLIENT_ID.apps.googleusercontent.com` in the `data-client_id` attribute. This value isn't secret — it identifies the app to Google, the same way it appears in any client-side Google sign-in button — but it does need to match exactly what you set as the env var next.
4. **Vercel** → your project → Settings → Environment Variables → add three:
   - `GOOGLE_CLIENT_ID` — the same Client ID from step 2.
   - `ALLOWED_EMAIL` — the one Google account allowed to sign in as the owner.
   - `SESSION_SECRET` — a long random string, used only to sign the session cookie. Generate one with `openssl rand -base64 32` (or ask the agent to generate one — it's just randomness, not tied to any account).
5. Redeploy (env var changes don't apply to a deployment already running — an empty commit or the Redeploy button in Vercel both work).
6. Visit `/admin.html`. You should land on `/login.html`; sign in with the allowed account and you should land back in the editor. Any other Google account gets turned away with a 403.

This is personal-blog-grade protection — real, but not enterprise SSO. No device management, no audit log, a 14-day session (change `SESSION_MAX_AGE` in `api/auth/verify.js` if you want shorter). Reasonable for a single-owner site.

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
