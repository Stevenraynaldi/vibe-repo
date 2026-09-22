/* ============================================================
   content.js — everything on the site lives here.

   To publish: edit this file (or use /admin.html to generate it),
   commit, push. Vercel redeploys in about 20 seconds.
   ============================================================ */

const SITE = {
  name: "Your Name",
  role: "Building AI agents & developer tools",
  writingIntro:
    "Notes on building with agents, MCP servers, and the messy parts nobody writes down.",
  buildsIntro:
    "Prototypes, tools, and MCP servers. Some are finished. Most are not — that is the point.",
  linkedin: "https://linkedin.com/in/yourhandle",
  github: "https://github.com/yourhandle",
  email: "you@example.com",
  // Your live site, no trailing slash — e.g. "https://whitepaper.vercel.app".
  // Only used to build clickable preview links; leave blank if you like.
  url: ""
};

/* ------------------------------------------------------------
   POSTS
   body uses Markdown: ## headings, **bold**, `code`, ```blocks```,
   - lists, > quotes, ![caption](images/file.png), [text](url)
   Images go in the /images folder, then reference images/name.png

   status: "draft" hides a post from the site; "published" (or no status
   at all) shows it. Read a draft on the live site by adding ?preview=1
   to the URL. Note that a draft is hidden, not secret — its text is in
   this file, which anyone can open.
   ------------------------------------------------------------ */

const POSTS = [
  {
    id: "multi-agent-research-crew",
    title: "Building a five-agent research crew that doesn't fall over",
    dek: "What breaks when you run analysts in parallel, and the three fixes that mattered.",
    date: "2026-08-04",
    status: "published",
    tags: ["CrewAI", "Agents", "Python"],
    verified: "2026-08-04",
    deps: "crewai==1.15.10, yfinance==1.5.2, google-genai==1.65.0, pandas==3.0.5, Python 3.12",
    body: `Most multi-agent tutorials stop at the happy path. This one starts where they end: the run finishes, the output is confidently wrong, and you have no idea which agent did it.

## The shape of the problem

A research crew has a natural fan-out. One ticker goes in, four analysts look at different slices of the same company, and an editor stitches their findings into one note. The fan-out is what makes it fast. It is also what makes it fragile.

The failure is rarely a crash. It is drift — two analysts quietly working from different snapshots of the same data, and an editor with no way to notice.

## Fix one: freeze the data before you fan out

Fetch once, pass the frozen result to every analyst. If each agent calls the API itself, you get four slightly different views of the market and an editor reconciling contradictions that never existed.

\`\`\`python
snapshot = fetch_all(ticker)      # one call, one timestamp
results = run_parallel(analysts, snapshot)
\`\`\`

## Fix two: make every agent cite its block

Each analyst returns which data block it used. When the editor sees a claim without a source block, it drops the claim instead of smoothing over it.

> An agent that cannot say where a number came from should not be allowed to report the number.

## Fix three: budget the editor

The editor sees four full analyses at once. That is the context window's worst moment. Cap each analyst's output length at the task level, not by asking nicely in the prompt.

## What I would do differently

Start with two agents. The orchestration overhead only pays for itself once the analyses are genuinely independent — and with two, you can still read every intermediate output by hand when something looks off.`
  },
  {
    id: "why-i-write-in-public",
    title: "Why I publish the prototypes that didn't work",
    dek: "A short argument for shipping the half-finished thing.",
    date: "2026-07-19",
    status: "published",
    tags: ["Notes"],
    verified: "",
    deps: "",
    body: `A finished project tells people what you can do. An abandoned one tells them how you think — which turns out to be the more useful signal.

## The status field

Every build on this site carries a status: prototype, live, or archived. Labelling something a prototype is not an apology. It is a contract: here is the idea, here is how far I took it, here is where I stopped and why.

## What this is for

Two things. A place to think properly, at more than post length. And a place to point people when a conversation gets past the small talk.

That's the whole thing.`
  }
];

/* ------------------------------------------------------------
   BUILDS
   status: "prototype" | "live" | "archived" — how finished the build is
   visibility: "draft" | "published" (or absent) — whether it shows at all.
     A draft build is hidden from the Builds page the same way a draft post
     is hidden from Writing; read one live with ?preview=1.
   config: optional — shown as a copyable code block (great for MCP servers)
   ------------------------------------------------------------ */

const BUILDS = [
  {
    id: "market-research-mcp",
    name: "Market Research MCP",
    pitch: "An MCP server that gives Claude live market data, filings, and consensus estimates.",
    status: "live",
    visibility: "published",
    stack: ["TypeScript", "MCP", "yfinance"],
    year: "2026",
    repo: "https://github.com/yourhandle/market-research-mcp",
    demo: "",
    detail: `Wraps four data sources behind a single MCP server so an assistant can pull quotes, filings, analyst consensus, and capital flow without leaving the conversation.

The interesting part was tool granularity. One fat get_data tool made the model guess at parameters. Splitting it into four narrow tools with strict schemas cut malformed calls to near zero.`,
    tools: ["get_quote", "get_filings", "get_consensus", "get_capital_flow"],
    config: `{
  "mcpServers": {
    "market-research": {
      "command": "npx",
      "args": ["-y", "market-research-mcp"]
    }
  }
}`
  },
  {
    id: "research-crew",
    name: "Five-Agent Research Crew",
    pitch: "Parallel analyst agents that produce one sourced research note from a single ticker.",
    status: "prototype",
    visibility: "published",
    stack: ["Python", "CrewAI", "Gemini"],
    year: "2026",
    repo: "https://github.com/yourhandle/research-crew",
    demo: "",
    detail: `Four analysts run in parallel over a frozen data snapshot; an editor agent merges them into a single note with citations back to the source block.

Still a prototype because the editor's merge quality drops sharply when analysts disagree. Fixing that properly means a reconciliation step I haven't built yet.`,
    tools: [],
    config: ""
  },
  {
    id: "thread-composer",
    name: "Thread Composer",
    pitch: "Turns a long post into a LinkedIn-native version that stands alone without the link.",
    status: "archived",
    visibility: "published",
    stack: ["React", "Claude API"],
    year: "2025",
    repo: "",
    demo: "",
    detail: `Built this to solve my own distribution problem, used it four times, then realised the constraint was writing the post — not reformatting it.

Archived rather than deleted, because the prompt design is still the best example I have of forcing a model to cut rather than expand.`,
    tools: [],
    config: ""
  }
];
