# BALLKNW Visual Editing Handover

## Project Overview

**BALLKNW** is a free football manager game site with two main sections:
- **Landing page** at `/` (marketing, guides, SEO pages)
- **Gaffa game** at `/gaffa/` (React-based football manager, static export)

The site is deployed as **pure static files** to `ballknw.com` via Vercel (`vercel.json` has `buildCommand: null`, `outputDirectory: "."`).

## Recent Cleanup (Completed)

A major repo restructuring was done to remove vestigial code and clarify what actually runs:

**Removed:**
- Vestigial Blink Next.js app (`next.config.ts`, root `tsconfig`, `src/app`, `src/pages`, etc.) — never served in production
- Build-bot automation files (`.bolt/`, `.claude/`, `CLAUDE.md`, `goal.md`, `.checkpoint.md`, etc.)
- Unreferenced misc (`New-advanced-tree.svg`, `verification.html`, `docs/`)
- Duplicate source dirs (`src/assets`, `src/shared`, `src/styles`, etc.) — production uses root-level `assets/`, `shared/`, `styles.css`

**Kept and clarified:**
- Root-level marketing HTML (`index.html`, `gaffer-guide.html`, guides, redirects, SEO files)
- Game source at `src/games/football-manager/` (React + Tailwind v4)
- Static exports: `gaffa/`, `perfect-cup/`, `scout/` (pre-built, committed)
- Shared assets: `assets/`, `shared/`, `styles.css`, `theme.css`

**Added:**
- `scripts/preview-server.mjs` — zero-dependency Node static server that mirrors production locally
- Reworked `package.json` — stripped 215 unused deps, updated scripts

## Current Structure

```
/vercel/share/v0-project/
├── index.html                    # Landing page (BALLKNW hero + CTA)
├── gaffer-guide.html             # Guide page
├── perfect-cup.html, scout.html  # Other game landing pages
├── vercel.json                   # Redirects, deployment config
├── assets/                       # Shared images, fonts, etc.
├── shared/                       # Shared CSS/JS snippets
├── styles.css, theme.css         # Global styles
├── gaffa/                        # Game static export (from `npm run build`)
├── perfect-cup/                  # Perfect Cup static export
├── scout/                        # Scout static export
├── src/
│   └── games/
│       └── football-manager/     # Game source (React/Tailwind v4)
│           ├── app/layout.tsx, page.tsx
│           ├── components/
│           ├── lib/
│           ├── next.config.mjs
│           ├── tailwind.config.ts
│           ├── postcss.config.mjs
│           ├── scripts/
│           │   └── export-static.sh  # Builds and exports to /gaffa
│           └── package.json
├── package.json                  # Root workspace + preview server
├── scripts/
│   └── preview-server.mjs        # Local static server (dev)
├── sitemap.xml, robots.txt       # SEO
└── BingSiteAuth.xml              # Bing verification
```

## Development Workflow

### Local Preview (Mirrors Production)

```bash
npm run dev
# Starts preview server on :3000
# Serves repo root statically with vercel.json redirects applied
# Landing at http://localhost:3000/
# Game at http://localhost:3000/gaffa/
```

The preview server applies all `vercel.json` redirects (e.g., `/football-manager/` → `/gaffa/`), so the local preview matches live URLs exactly.

### Edit Game (Hot Reload)

For live-reloading edits to game internals:

```bash
cd src/games/football-manager
npm run dev
# Dev server on a different port (check console)
# Use this for iterating on game logic, UI, styles
```

### Build & Export Game

After editing the game source, regenerate the static export:

```bash
npm run build
# Calls: npm -w src/games/football-manager run export:static
# Builds game with NEXT_PUBLIC_BASE_PATH=/gaffa
# Exports to /gaffa/ (committed, deployed with repo)
```

### Edit Landing Page / Static Content

- `index.html` — main hero, logo, CTA buttons
- `gaffer-guide.html`, `perfect-cup.html`, `scout.html` — guide/info pages
- `assets/` — images, fonts, badges
- `styles.css`, `theme.css` — global styles
- `shared/` — reusable CSS/JS snippets

Edit directly and refresh the preview (`npm run dev` keeps serving).

## What's Ready for Visual Editing

- **Landing page (`/`)** — Static HTML with embedded CSS, marketing hero with "Play Gaffa" CTA, responsive
- **Game hub (`/gaffa/`)** — React app with dark FM-style theme, player cards, matchday UI
- **Guides** — Multiple static HTML guide pages linked from landing
- **Redirects** — `/football-manager/` → `/gaffa/`, `/DraftXI/` → `/gaffa/`

## Key Tech Notes

- **Landing & guides:** Plain HTML + CSS (root-level `styles.css`, `theme.css`)
- **Game:** React 19 + Tailwind v4 (separate config in `src/games/football-manager/`)
- **Fonts:** Likely specified in `theme.css` or `shared/`
- **Colors:** Theme variables in `theme.css`; game has own Tailwind theme
- **Preview:** Static server with `vercel.json` redirect logic baked in

## Next Steps for Visual Editing

1. **Decide what to edit** — landing page hero, game UI, guide pages, colors, layouts, etc.
2. **Run `npm run dev`** to start the preview (mirrors production locally)
3. **Open http://localhost:3000/** and navigate to the page/route you want to edit
4. **Edit the files** (HTML, CSS, React components) and refresh the preview
5. **For game source edits**, optionally run the game's own dev server for hot reload
6. **After game edits**, run `npm run build` to regenerate `/gaffa/`
7. **Commit and push** when ready

---

**Questions for the next chat:**
- Which page do you want to visually edit first? (landing, game, guides)
- Are there specific sections, colors, layouts, or content you want to change?
- Any design references or inspiration you'd like to follow?
