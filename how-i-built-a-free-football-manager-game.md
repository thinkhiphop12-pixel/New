## I built a free football manager game you can play with zero downloads and zero logins

I didn't set out to build a management sim. I set out to fix one specific
annoyance: every time I wanted to kill fifteen minutes managing a football
club, I hit the same wall. Install a client. Create an account. Verify an
email. Wait for a download bar. By the time I was actually picking a
formation, the fifteen minutes were gone.

So I built the version that skips all of that. It's called Gaffa, it lives
at ballknw.com, and the entire pitch is in the constraint I set for myself
from day one: if a step isn't the game, it doesn't exist. No installer, no
signup screen, no email, no "verify your account before you can play."
You open the tab and you're picking a club.

The underlying belief is bigger than the game, honestly. Most "free" web
games aren't actually free of friction — they're free of price tag and
expensive in everything else: your email, your attention span while an
account wizard loads, a paywall that shows up right when it gets fun. I
think that trade is backwards. If something is free, the *experience* of
getting into it should be free too. That's the standard I held this to.

**Step 1 — Pick the one thing to protect.**
Before writing a line of gameplay logic, I decided the non-negotiable:
friction before the first match had to be zero. Every feature request after
that got measured against whether it added a click before kickoff. A lot of
genuinely good ideas got cut because they failed that test — a fancier
onboarding flow, a "create your manager profile" screen, social login
options. All correctly killed, because all of them were about the product's
convenience, not the player's.

**Step 2 — Make the data feel real, not decorative.**
A management sim is only as good as the world you're managing in. I built
the squads from real current-season club data across English football,
covering three divisions, not placeholder names, because nothing kills
immersion faster than fielding a team of made-up players against another
team of made-up players. Ratings inside the game are my own stylized system
for gameplay balance, not licensed figures from anywhere official — worth
saying plainly, since I'd rather be upfront about that than have someone
assume otherwise. Same with the club itself: independent, fan-made, not
affiliated with any league, federation, or existing game studio. I'd rather
be honest about what this is than borrow credibility I haven't earned.

**Step 3 — Build the loop that makes people come back.**
Formation and tactics were the easy part. What took longer was everything
around it: a transfer market with a real wage and transfer budget so
signings have consequences, contract negotiation, a cup competition running
alongside the league, and a youth academy for anyone who'd rather develop a
player than buy one. The board sets objectives, and missing them has a real
cost — you can get sacked mid-season the way a real manager would. That's
the difference between a toy and something you actually think about between
sessions.

**Step 4 — Solve the mystery "no account" creates.**
Saying "no login" is easy. Making progress persist without one is the actual
engineering problem, and it's the part that generated the strangest bug of
the whole build: production was serving JavaScript that matched *no commit*
in the repository's history, while simultaneously 404ing on a chunk that
*was* committed — and yet serving the exact image asset from the deployed
commit, byte for byte. Three facts that shouldn't coexist. It took tracing
the deploy pipeline line by line to find it: a config value I'd assumed
meant "skip the build step" actually meant "unset — fall back to
auto-detection," which silently triggered a full rebuild on every single
deploy. The committed game folder in the repo was never what users were
actually playing; production was quietly rebuilding itself from source every
time. Once I understood that, the save-without-an-account system got
rebuilt to be provably reliable instead of accidentally working — your
season now really does live in your browser and picks up exactly where you
left it, close the tab or not.

**Step 5 — Cut until only the real thing was left.**
Somewhere in an earlier version of this project there was a whole second
framework's worth of code that had stopped being used and just never got
removed — dead weight nobody was maintaining but everybody was still
shipping. I went through and stripped it out: an entire unused app
skeleton, well over two hundred dependencies nothing actually called,
duplicate copies of the same assets living in three places. What was left
after that cut is smaller, faster, and — this mattered more to me than it
probably should have — honest. I even built a small local server whose only
job is mirroring production exactly, so I'm never testing against a version
of the game that lies to me about what players will see.

**Step 6 — Ship it and see if the constraint held up.**
The test I cared about most, the whole way through: could someone go from a
cold link to actually managing a match in under thirty seconds? If yes, the
whole project worked, no matter how much complexity sat behind the curtain
to make it possible. If it needed a tutorial to get there, I'd failed the
brief I set for myself on day one.

That's the honest version, mystery bug and all. It's free, it's in your
browser, and there's nothing to install or sign up for — you can go try it
right now at ballknw.com/gaffa. If you've got the same fifteen-minute-gap
problem I had, that's exactly who I built it for.
