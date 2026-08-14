# Gaffa — Portal Submission & Outreach Kit

Everything below is copy-paste ready. Use it with Claude in Chrome (or manually)
to submit to game portals and post to Reddit.

---

## 1. CrazyGames Developer Submission

Submit at: https://developer.crazygames.com/games/new

**Game Title**
Gaffa — Free Football Manager

**Short Description (≤200 chars, shown in listings)**
Take charge of a real club — pick your formation, work the transfer market, and
manage a full league season. 100% free, no download, no account needed.

**Long Description**
Gaffa is a free browser-based football management game. Build your squad,
set your tactics and formation, negotiate transfers, and guide your club
through a full league season — all directly in your browser, with no
download, no install, and no account required.

Whether you're new to the genre or a long-time football manager fan looking
for a quick session in the browser, Gaffa gives you the core management-sim
loop: transfers, tactics, morale, and matchday decisions, in a fast, free
package.

**Category:** Sports / Simulation
**Tags:** football, soccer, management, simulation, sports, strategy, free, browser

**Play URL:** https://www.ballknw.com/gaffa/
**Thumbnail:** assets/og-image.png (check portal's exact size requirement —
CrazyGames wants 1024x1024 or 512x512 square; og-image.png is currently a
social-share crop, so a dedicated square thumbnail may need to be exported
from the same source art before upload)
**Icon:** assets/favicon-192.png (192x192, may need upscale/re-export to meet
their minimum, usually 512x512)

**Technical requirements to verify before submitting:**
- Portals typically require the game to run inside an iframe / their embed
  wrapper. Gaffa is a Next.js static export — confirm it has no
  frame-busting headers (X-Frame-Options / CSP frame-ancestors) blocking
  embedding. Check `vercel.json` headers config.
- Ads: CrazyGames/Poki require you to remove your own ad code from the
  embedded build (they monetize via their own ad layer) or use their SDK.
  The `shared/ads.min.js` script loaded in gaffa/index.html will need a
  portal-specific build variant that skips it.
- They'll ask for control scheme confirmation (mouse/keyboard vs touch) —
  Gaffa is mouse/keyboard, confirm touch fallback works on their required
  min screen size.

---

## 2. Poki Submission

Submit at: https://developers.poki.com/

Poki's flow is similar to CrazyGames — same copy above works. Key
differences to check:
- Poki requires their SDK (`PokiSDK`) integrated for ad breaks and
  session tracking — this needs actual code changes before their review
  will pass, not just a copy-paste submission.
- Poki has stricter load-time requirements (aim under 5s to first
  interaction).

**Recommendation:** Submit to CrazyGames first (lighter integration
lift), use it to validate demand, then invest in the Poki SDK integration
if traffic justifies it.

---

## 3. itch.io Listing

Submit at: https://itch.io/game/new (fastest to get live — minutes, not a
review queue)

**Title:** Gaffa — Free Football Manager
**Project URL:** ballknw-gaffa (or similar)
**Classification:** Games → HTML
**Kind of project:** HTML (upload a zip of the /gaffa export, or embed via
iframe pointing to ballknw.com/gaffa/)
**Genre:** Simulation
**Tags:** football, soccer, sports, management, free-to-play, browser,
management-sim, simulator

**Short description:**
Manage a football club in your browser — free, no download, no account.

**Description (same long description as CrazyGames above)**

itch.io is the easiest of the three — no SDK requirement, embeds via
iframe directly, goes live immediately. Good first move to test the
"does portal traffic even work" hypothesis before investing in
CrazyGames/Poki review cycles.

---

## 4. Reddit Posts

### r/WebGames (post as a builder sharing a project — no self-promo flair issues typically)

**Title:** I built a free browser football manager game — no download, no account [Gaffa]

**Body:**
Been building this for a while — Gaffa is a football (soccer) management
game that runs entirely in the browser. Pick your formation, run the
transfer market, manage morale, and play through a full league season.

No download, no signup, no paywall. Would genuinely appreciate feedback
from this sub, especially on anything that feels clunky in the first few
minutes — that's the part I have the least outside perspective on.

https://www.ballknw.com/gaffa/

---

### r/footballmanagergames

**Title:** Made a free browser-based football manager game — looking for feedback from actual FM players

**Body:**
Long-time FM player here. Built a lightweight browser version of the
management-sim loop — transfers, tactics, formations, a full season —
for when I want something quicker than firing up the full FM install.

It's free, no account needed, runs in-browser: https://www.ballknw.com/gaffa/

Not trying to compete with FM26, obviously — more of a "5 minutes on
lunch break" alternative. Curious what this community thinks is missing
or what would make it worth a second look.

---

### r/incremental_games (only if the loop has idle/incremental mechanics — verify fit before posting, this sub is strict about genre match)

Skip unless Gaffa has an idle/incremental component. If it's a straight
management sim, this sub will remove it — not a fit.

---

## Posting order / sequencing recommendation

1. **itch.io first** (same day) — free, instant, no gatekeeping. Gets a
   second indexable domain pointing at the game concept immediately.
2. **CrazyGames submission** (same day) — review takes days to weeks, so
   get it in the queue early. Fix the iframe/ads technical items above
   before submitting or it'll bounce on first review.
3. **Reddit posts** — space 3-5 days apart across subs, not same-day, to
   avoid looking like a spam blitz. Post when you can actually reply to
   comments within a few hours (mods and users both notice absentee
   self-promotion).
4. **Poki** — only after CrazyGames traffic validates the concept is
   worth the SDK integration effort.
