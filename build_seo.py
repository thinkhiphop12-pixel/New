#!/usr/bin/env python3
"""
Programmatic SEO page generator for Ball Knowledge.

Reads the real 700/data.json World Cup dataset and emits static, fully
internally-linked ranking/guide pages targeting high-volume football
searches (best players, strongest squads, all-time XI). No build tools,
no runtime JS required — pure static HTML using the shared editorial CSS.

Run:  python3 build_seo.py
"""
import json, os, html, datetime

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA = json.load(open(os.path.join(ROOT, "700", "data.json")))
PLAYERS = DATA["players"]
TODAY = datetime.date.today().isoformat()

POS_LABEL = {"GK": "GK", "DF": "DEF", "MF": "MID", "FW": "FWD"}

# ---------- helpers ----------
def page(title, desc, path, body, extra_schema=""):
    """Wrap body in the shared editorial chrome. `path` is the url path used
    for canonical (e.g. '/guides/best-world-cup-players/')."""
    depth = path.strip("/").count("/") + 1  # files live one level deeper than url
    rel = "../" * depth
    canonical = "https://ballknw.com" + path
    nav = (
        f'<a href="{rel}#daily">Daily</a><a href="{rel}footle/">Footle</a>'
        f'<a href="{rel}connections/">Connections</a><a href="{rel}700/">7-0-0</a>'
        f'<a href="{rel}guides/">Guides</a>'
    )
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#f4ecdc">
<title>{html.escape(title)}</title>
<meta name="description" content="{html.escape(desc)}">
<link rel="canonical" href="{canonical}">
<meta property="og:title" content="{html.escape(title)}">
<meta property="og:description" content="{html.escape(desc)}">
<meta property="og:type" content="article">
<meta property="og:url" content="{canonical}">
<meta property="og:image" content="{rel}assets/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" type="image/svg+xml" href="{rel}assets/logo-mark.svg">
<link rel="stylesheet" href="{rel}shared/editorial.css">
<link rel="stylesheet" href="{rel}shared/guides.css">
</head>
<body>
<header class="masthead"><div class="masthead-inner">
<a class="mast-brand" href="{rel}"><span class="mast-title">Ball<span class="amp">·</span>Knowledge</span><span class="mast-sub">Football Guides</span></a>
<nav class="mast-nav">{nav}</nav>
</div></header>
<main class="wrap guide">
{body}
<section class="guide-cta">
  <h2>Put your knowledge to the test</h2>
  <p>Think you know your World Cups? Build a team in <a href="{rel}700/">7-0-0</a>, or play today's
  <a href="{rel}footle/">Footle</a>, <a href="{rel}connections/">Connections XI</a>,
  <a href="{rel}strands/">Pitch Strands</a> and <a href="{rel}letterboxed/">Starting XI</a>.</p>
  <a class="btn btn-primary" href="{rel}700/">Build a World Cup XI →</a>
</section>
</main>
<footer class="site-footer">
<div class="foot-links"><a href="{rel}">Home</a> · <a href="{rel}guides/">Guides</a> · <a href="{rel}footle/">Footle</a> · <a href="{rel}connections/">Connections XI</a> · <a href="{rel}strands/">Pitch Strands</a> · <a href="{rel}letterboxed/">Starting XI</a> · <a href="{rel}700/">7-0-0</a> · <a href="{rel}squads/">Squads</a></div>
<p class="foot-disclaimer">Rankings are derived from a stylised World Cup ratings dataset for entertainment. Ball Knowledge is an unofficial fan project, not affiliated with FIFA. Updated {TODAY}.</p>
</footer>
{extra_schema}
</body>
</html>
"""

def write(path_url, content):
    d = os.path.join(ROOT, path_url.strip("/"))
    os.makedirs(d, exist_ok=True)
    with open(os.path.join(d, "index.html"), "w") as f:
        f.write(content)
    print("wrote", path_url)

def itemlist_schema(names, name):
    items = ",".join(
        f'{{"@type":"ListItem","position":{i+1},"name":"{html.escape(n)}"}}'
        for i, n in enumerate(names[:50])
    )
    return f'<script type="application/ld+json">{{"@context":"https://schema.org","@type":"ItemList","name":"{html.escape(name)}","itemListElement":[{items}]}}</script>'

def flag(_):  # keep static/simple
    return "⚽"

# ---------- 1. best players ----------
def build_best_players():
    ranked = sorted(PLAYERS, key=lambda p: -p["o"])
    seen, top = set(), []
    for p in ranked:
        key = p["n"]
        if key in seen:
            continue
        seen.add(key)
        top.append(p)
        if len(top) >= 100:
            break
    rows = "\n".join(
        f'<tr><td class="rk">{i+1}</td><td class="nm">{html.escape(p["n"])}</td>'
        f'<td>{html.escape(p["country"])}</td><td>{p["year"]}</td>'
        f'<td><span class="chip chip-pos pos-{p["p"][0]}">{POS_LABEL.get(p["p"][0],p["p"][0])}</span></td>'
        f'<td class="ov">{p["o"]}</td></tr>'
        for i, p in enumerate(top)
    )
    body = f"""<p class="eyebrow">Rankings · World Cup</p>
<h1>The 100 best World Cup players of all time</h1>
<p class="guide-lede">A data-driven ranking of the greatest players to grace a World Cup, from 1930 to 2026,
ordered by overall rating in the Ball Knowledge dataset. Every name here is draftable in
<a href="../../700/">7-0-0</a>.</p>
<table class="rank-table"><thead><tr><th>#</th><th>Player</th><th>Nation</th><th>Cup</th><th>Pos</th><th>OVR</th></tr></thead>
<tbody>{rows}</tbody></table>
<h2>How this ranking works</h2>
<p>Ratings combine tournament performance and position baselines for historical squads and modern rating data for
recent World Cups. They're stylised for gameplay rather than official figures — see the full
<a href="../../squads/">World Cup squads and ratings</a> for every nation.</p>"""
    schema = itemlist_schema([p["n"] for p in top], "Best World Cup players of all time")
    write("/guides/best-world-cup-players/",
          page("The 100 Best World Cup Players of All Time | Ball Knowledge",
               "A data-driven ranking of the 100 best World Cup players ever, from 1930 to 2026, by overall rating. Free football rankings from Ball Knowledge.",
               "/guides/best-world-cup-players/", body, schema))

# ---------- 2. strongest squads ----------
def build_strongest_squads():
    from collections import defaultdict
    sq = defaultdict(list)
    for p in PLAYERS:
        sq[(p["country"], p["year"])].append(p["o"])
    rated = []
    for (c, y), ovs in sq.items():
        if len(ovs) < 11:
            continue
        best = sorted(ovs, reverse=True)[:11]
        rated.append((c, y, round(sum(best) / 11, 1)))
    rated.sort(key=lambda r: -r[2])
    top = rated[:50]
    slug = lambda c, y: f"{c.lower().replace(' ', '-')}-{y}"
    def squad_cell(c, y):
        s = slug(c, y)
        if os.path.isdir(os.path.join(ROOT, "squads", s)):
            return f'<a href="../../squads/{s}/">View squad</a>'
        return '<span class="muted">—</span>'
    rows = "\n".join(
        f'<tr><td class="rk">{i+1}</td><td class="nm">{html.escape(c)} {y}</td>'
        f'<td>{squad_cell(c,y)}</td><td class="ov">{r}</td></tr>'
        for i, (c, y, r) in enumerate(top)
    )
    body = f"""<p class="eyebrow">Rankings · World Cup</p>
<h1>The strongest World Cup squads of all time</h1>
<p class="guide-lede">Which World Cup squad was the deepest on paper? We rated the best XI of every nation at every
World Cup since 1930. Here are the 50 strongest. Test them yourself in <a href="../../700/">7-0-0</a>.</p>
<table class="rank-table"><thead><tr><th>#</th><th>Squad</th><th>Players</th><th>XI rating</th></tr></thead>
<tbody>{rows}</tbody></table>
<h2>Build your own</h2>
<p>Disagree with the order? In <a href="../../700/">7-0-0</a> you can draft any XI from these squads and simulate
the seven games it takes to win the tournament. Browse the full <a href="../../squads/">squad archive</a> too.</p>"""
    schema = itemlist_schema([f"{c} {y}" for c, y, r in top], "Strongest World Cup squads of all time")
    write("/guides/strongest-world-cup-squads/",
          page("The Strongest World Cup Squads of All Time, Ranked | Ball Knowledge",
               "The 50 strongest World Cup squads ever, ranked by best-XI rating from 1930 to 2026. Free football rankings from Ball Knowledge.",
               "/guides/strongest-world-cup-squads/", body, schema))

# ---------- 3. all-time XI ----------
def build_all_time_xi():
    # best player per position group
    ranked = sorted(PLAYERS, key=lambda p: -p["o"])
    picks = {"GK": [], "DF": [], "MF": [], "FW": []}
    seen = set()
    need = {"GK": 1, "DF": 4, "MF": 3, "FW": 3}
    for p in ranked:
        g = p["p"][0]
        if g in picks and len(picks[g]) < need[g] and p["n"] not in seen:
            picks[g].append(p); seen.add(p["n"])
    xi = picks["GK"] + picks["DF"] + picks["MF"] + picks["FW"]
    cards = "\n".join(
        f'<div class="xi-card"><span class="chip chip-pos pos-{p["p"][0]}">{POS_LABEL.get(p["p"][0])}</span>'
        f'<span class="xi-name">{html.escape(p["n"])}</span>'
        f'<span class="xi-meta">{html.escape(p["country"])} · {p["year"]}</span>'
        f'<span class="xi-ovr">{p["o"]}</span></div>'
        for p in xi
    )
    body = f"""<p class="eyebrow">The Greatest XI</p>
<h1>The all-time World Cup XI</h1>
<p class="guide-lede">One eleven, the best of every World Cup. Built in a 4-3-3 from the highest-rated players in the
Ball Knowledge dataset — the team to beat in <a href="../../700/">7-0-0</a>.</p>
<div class="xi-grid">{cards}</div>
<h2>Could you build better?</h2>
<p>Every one of these players is draftable. Head to <a href="../../700/">7-0-0</a>, search them by name, and see if your
dream XI can go a perfect seven games unbeaten. Or browse the <a href="best-world-cup-players/">100 best players</a>
and the <a href="strongest-world-cup-squads/">strongest squads</a>.</p>"""
    schema = itemlist_schema([p["n"] for p in xi], "All-time World Cup XI")
    write("/guides/all-time-world-cup-xi/",
          page("The All-Time World Cup XI | Ball Knowledge",
               "The greatest World Cup XI of all time in a 4-3-3, built from the highest-rated players from 1930 to 2026. Free football feature from Ball Knowledge.",
               "/guides/all-time-world-cup-xi/", body, schema))

# ---------- guides hub ----------
def build_hub():
    body = """<p class="eyebrow">Football Guides &amp; Rankings</p>
<h1>Football guides, rankings &amp; lists</h1>
<p class="guide-lede">Data-driven football rankings built from real World Cup squads — the best players, the
strongest teams and the ultimate XI. Free to read, updated regularly.</p>
<div class="guide-cards">
  <a class="guide-card" href="best-world-cup-players/"><h2>100 Best World Cup Players</h2><p>The greatest players ever to play a World Cup, ranked by rating.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="strongest-world-cup-squads/"><h2>Strongest World Cup Squads</h2><p>The 50 deepest squads of all time, by best-XI rating.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="all-time-world-cup-xi/"><h2>All-Time World Cup XI</h2><p>One eleven, the best of every tournament, in a 4-3-3.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="../squads/"><h2>World Cup Squads Archive</h2><p>Full squads and ratings for every nation, 1930–2026.</p><span class="gc-go">Browse →</span></a>
</div>"""
    write("/guides/",
          page("Football Guides, Rankings & Lists | Ball Knowledge",
               "Data-driven football rankings from Ball Knowledge: the best World Cup players, strongest squads and the all-time World Cup XI. Free football lists.",
               "/guides/", body))

# ---------- per-tournament pages ----------
def best_xi_from(players):
    ranked = sorted(players, key=lambda p: -p["o"])
    need = {"GK": 1, "DF": 4, "MF": 3, "FW": 3}
    picks = {"GK": [], "DF": [], "MF": [], "FW": []}
    seen = set()
    for p in ranked:
        g = p["p"][0]
        if g in picks and len(picks[g]) < need[g] and p["n"] not in seen:
            picks[g].append(p); seen.add(p["n"])
    return picks["GK"] + picks["DF"] + picks["MF"] + picks["FW"]

def xi_cards(xi):
    return "\n".join(
        f'<div class="xi-card"><span class="chip chip-pos pos-{p["p"][0]}">{POS_LABEL.get(p["p"][0])}</span>'
        f'<span class="xi-name">{html.escape(p["n"])}</span>'
        f'<span class="xi-meta">{html.escape(p["country"])}</span>'
        f'<span class="xi-ovr">{p["o"]}</span></div>'
        for p in xi
    )

def player_rows(players, n=25, show_year=True):
    out = []
    for i, p in enumerate(players[:n]):
        yr = f'<td>{p["year"]}</td>' if show_year else ''
        out.append(
            f'<tr><td class="rk">{i+1}</td><td class="nm">{html.escape(p["n"])}</td>'
            f'<td>{html.escape(p["country"])}</td>{yr}'
            f'<td><span class="chip chip-pos pos-{p["p"][0]}">{POS_LABEL.get(p["p"][0],p["p"][0])}</span></td>'
            f'<td class="ov">{p["o"]}</td></tr>')
    return "\n".join(out)

def build_tournaments():
    years = sorted({p["year"] for p in PLAYERS})
    built = []
    for y in years:
        pl = [p for p in PLAYERS if p["year"] == y]
        if len(pl) < 22:
            continue
        ranked = sorted(pl, key=lambda p: -p["o"])
        seen, top = set(), []
        for p in ranked:
            if p["n"] in seen: continue
            seen.add(p["n"]); top.append(p)
            if len(top) >= 25: break
        xi = best_xi_from(pl)
        # strongest squads that year
        from collections import defaultdict
        sq = defaultdict(list)
        for p in pl: sq[p["country"]].append(p["o"])
        squads = sorted(((c, round(sum(sorted(v, reverse=True)[:11])/11, 1))
                         for c, v in sq.items() if len(v) >= 11), key=lambda r: -r[1])[:8]
        sq_rows = "\n".join(
            f'<tr><td class="rk">{i+1}</td><td class="nm">{html.escape(c)}</td><td class="ov">{r}</td></tr>'
            for i, (c, r) in enumerate(squads))
        body = f"""<p class="eyebrow">World Cup {y} · Guide</p>
<h1>World Cup {y}: best players, squads &amp; the team of the tournament</h1>
<p class="guide-lede">The standout players and strongest squads of the {y} World Cup, rated in the Ball Knowledge
dataset. Draft any of them in <a href="../../700/">7-0-0</a>.</p>
<h2>Team of the tournament ({y})</h2>
<div class="xi-grid">{xi_cards(xi)}</div>
<h2>Top 25 players · World Cup {y}</h2>
<table class="rank-table"><thead><tr><th>#</th><th>Player</th><th>Nation</th><th>Pos</th><th>OVR</th></tr></thead>
<tbody>{player_rows(top, 25, show_year=False)}</tbody></table>
<h2>Strongest squads · World Cup {y}</h2>
<table class="rank-table"><thead><tr><th>#</th><th>Nation</th><th>XI rating</th></tr></thead><tbody>{sq_rows}</tbody></table>
<p>Browse <a href="../">all football guides</a> or the full <a href="../../squads/">World Cup squad archive</a>.</p>"""
        schema = itemlist_schema([p["n"] for p in top], f"Best players of the {y} World Cup")
        write(f"/guides/world-cup-{y}/",
              page(f"World Cup {y}: Best Players, Squads & Team of the Tournament | Ball Knowledge",
                   f"The best players and strongest squads of the {y} World Cup, with a data-rated team of the tournament. Free football guide from Ball Knowledge.",
                   f"/guides/world-cup-{y}/", body, schema))
        built.append(y)
    return built

import unicodedata, re
def slugify(s):
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode("ascii")
    s = s.lower().replace("'", "").replace("’", "")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return re.sub(r"-+", "-", s)

def build_nations():
    from collections import defaultdict
    by = defaultdict(list)
    for p in PLAYERS: by[p["country"]].append(p)
    nations = [(c, pl) for c, pl in by.items() if len(pl) >= 60]
    nations.sort(key=lambda r: -max(p["o"] for p in r[1]))
    built = []
    for c, pl in nations:
        ranked = sorted(pl, key=lambda p: -p["o"])
        seen, top = set(), []
        for p in ranked:
            if p["n"] in seen: continue
            seen.add(p["n"]); top.append(p)
            if len(top) >= 25: break
        xi = best_xi_from(pl)
        slug = slugify(c)
        body = f"""<p class="eyebrow">{html.escape(c)} · World Cup Guide</p>
<h1>{html.escape(c)}'s greatest World Cup players &amp; all-time XI</h1>
<p class="guide-lede">The best {html.escape(c)} players ever to appear at a World Cup, rated and ranked, with an
all-time {html.escape(c)} XI. Build them in <a href="../../700/">7-0-0</a>.</p>
<h2>{html.escape(c)} all-time World Cup XI</h2>
<div class="xi-grid">{xi_cards(xi)}</div>
<h2>Top {html.escape(c)} World Cup players</h2>
<table class="rank-table"><thead><tr><th>#</th><th>Player</th><th>Nation</th><th>Cup</th><th>Pos</th><th>OVR</th></tr></thead>
<tbody>{player_rows(top, 25)}</tbody></table>
<p>See the <a href="../best-world-cup-players/">100 best players of all time</a> or browse
<a href="../../squads/">every World Cup squad</a>.</p>"""
        schema = itemlist_schema([p["n"] for p in top], f"Best {c} World Cup players")
        write(f"/guides/best-{slug}-world-cup-players/",
              page(f"{c}'s Greatest World Cup Players & All-Time XI | Ball Knowledge",
                   f"The best {c} World Cup players of all time, ranked by rating, with an all-time {c} XI. Free football guide from Ball Knowledge.",
                   f"/guides/best-{slug}-world-cup-players/", body, schema))
        built.append((c, slug))
    return built

def build_hub_full(years, nations):
    yr_links = " · ".join(f'<a href="world-cup-{y}/">{y}</a>' for y in years)
    nat_links = " · ".join(f'<a href="best-{s}-world-cup-players/">{html.escape(c)}</a>' for c, s in nations)
    body = f"""<p class="eyebrow">Football Guides &amp; Rankings</p>
<h1>Football guides, rankings &amp; lists</h1>
<p class="guide-lede">Data-driven football rankings built from real World Cup squads — the best players, the
strongest teams, the ultimate XIs, tournament by tournament and nation by nation. Free to read.</p>
<div class="guide-cards">
  <a class="guide-card" href="best-world-cup-players/"><h2>100 Best World Cup Players</h2><p>The greatest players ever to play a World Cup, ranked by rating.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="strongest-world-cup-squads/"><h2>Strongest World Cup Squads</h2><p>The 50 deepest squads of all time, by best-XI rating.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="all-time-world-cup-xi/"><h2>All-Time World Cup XI</h2><p>One eleven, the best of every tournament, in a 4-3-3.</p><span class="gc-go">Read →</span></a>
  <a class="guide-card" href="../squads/"><h2>World Cup Squads Archive</h2><p>Full squads and ratings for every nation, 1930–2026.</p><span class="gc-go">Browse →</span></a>
</div>
<h2>By tournament</h2>
<p class="guide-links">{yr_links}</p>
<h2>By nation</h2>
<p class="guide-links">{nat_links}</p>"""
    write("/guides/",
          page("Football Guides, Rankings & Lists | Ball Knowledge",
               "Data-driven football rankings from Ball Knowledge: best World Cup players, strongest squads, all-time XIs, plus guides for every tournament and nation.",
               "/guides/", body))

def build_sitemap():
    base = "https://ballknw.com"
    urls = []
    def add(loc, freq, pri):
        urls.append((loc, freq, pri))
    add("/", "daily", "1.0")
    for g in ["footle", "connections", "strands", "letterboxed"]:
        add(f"/{g}/", "daily", "0.9")
    for g in ["700", "dynasty", "lineup", "worldcup", "boardroom", "manager"]:
        add(f"/{g}/", "monthly", "0.8")
    add("/guides/", "weekly", "0.8")
    # all guide subpages
    gdir = os.path.join(ROOT, "guides")
    for name in sorted(os.listdir(gdir)):
        p = os.path.join(gdir, name)
        if os.path.isdir(p) and os.path.exists(os.path.join(p, "index.html")):
            add(f"/guides/{name}/", "weekly", "0.7")
    add("/squads/", "monthly", "0.7")
    sdir = os.path.join(ROOT, "squads")
    if os.path.isdir(sdir):
        for name in sorted(os.listdir(sdir)):
            p = os.path.join(sdir, name)
            if os.path.isdir(p) and os.path.exists(os.path.join(p, "index.html")):
                add(f"/squads/{name}/", "monthly", "0.6")
    for pg in ["/privacy.html", "/terms.html"]:
        add(pg, "yearly", "0.3")
    body = "\n".join(
        f"  <url>\n    <loc>{base}{loc}</loc>\n    <changefreq>{f}</changefreq>\n    <priority>{p}</priority>\n  </url>"
        for loc, f, p in urls)
    out = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + body + "\n</urlset>\n"
    with open(os.path.join(ROOT, "sitemap.xml"), "w") as f:
        f.write(out)
    print("wrote /sitemap.xml with", len(urls), "urls")

if __name__ == "__main__":
    build_best_players()
    build_strongest_squads()
    build_all_time_xi()
    years = build_tournaments()
    nations = build_nations()
    build_hub_full(years, nations)
    build_sitemap()
    print("done — tournaments:", len(years), "nations:", len(nations))
