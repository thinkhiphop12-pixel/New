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

Here's roughly how it came together, kept intentionally high-level because
the interesting part isn't the stack — it's the decisions.

**Step 1 — Pick the one thing to protect.**
Before writing anything, I decided the non-negotiable: friction before the
first match had to be zero. Every feature request after that got measured
against whether it added a click before kickoff. A lot of good ideas got cut
because they failed that test.

**Step 2 — Make the data feel real, not decorative.**
A management sim is only as good as the world you're managing in. I built
the squads from real current-season club data across English football, not
placeholder names, because nothing kills immersion faster than managing a
team of made-up players. Ratings inside the game are my own stylized system
for gameplay balance, not licensed figures from anywhere official — worth
saying plainly, since I'd rather be upfront about that than have someone
assume otherwise.

**Step 3 — Build the loop that makes people come back.**
Formation and tactics were the easy part. What took longer was everything
around it: a transfer market with a real wage and transfer budget so signings
have consequences, contract negotiation, a cup competition running alongside
the league, and a youth academy for anyone who'd rather develop a player than
buy one. The board sets objectives, and missing them has a real cost. That's
the difference between a toy and something you actually think about between
sessions.

**Step 4 — Make "no account" actually work.**
Saying "no login" is easy. Making progress persist without one is the actual
engineering problem. Your season lives in your browser and picks up exactly
where you left it — close the tab, come back tomorrow, still your club,
still your table position. Getting that reliable without asking for an
account was most of the unglamorous work nobody sees.

**Step 5 — Ship it and see if the constraint held up.**
The test I cared about most: could someone go from a cold link to actually
managing a match in under thirty seconds? If yes, the whole project worked.
If it needed a tutorial to get there, I'd failed the brief I set myself.

That's the honest version. It's free, it's in your browser, and there's
nothing to install or sign up for — you can go try it right now at
ballknw.com/gaffa. If you've got the same fifteen-minute-gap problem I had,
that's exactly who I built it for.
