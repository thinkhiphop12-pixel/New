import FootballManagerGame from '@/components/FootballManagerGame';

/* Structured data for /gaffa/. The hand-written pages each carry their own
   JSON-LD; this page had none, so the one page on the site that is an actual
   product was the one search engines were told least about. Rendered from a
   server component so it lands in the static export rather than being
   injected on the client, where a crawler that does not run JavaScript would
   never see it. Absolute URLs because JSON-LD @id values are not resolved
   against the document, unlike the metadataBase-relative tags in layout.tsx. */
const GAFFA_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  '@id': 'https://www.ballknw.com/gaffa/#app',
  // No alternateName. "Gaffa Football Manager" appears nowhere a visitor can
  // see it, and the FAQ below states outright that this is not Football
  // Manager — claiming it as an alias would contradict the page's own words
  // and lean on a trademark the disclaimer disowns.
  name: 'Gaffa',
  url: 'https://www.ballknw.com/gaffa/',
  applicationCategory: 'GameApplication',
  applicationSubCategory: 'Sports Management Simulation',
  // operatingSystem takes OS names ("Windows 7", "Android 1.6"); a browser is
  // not one. The game is genuinely platform-independent, so "All" is the
  // honest value, and the browser statement belongs in browserRequirements.
  operatingSystem: 'All',
  browserRequirements: 'Requires a modern web browser with JavaScript enabled',
  description:
    'Free browser football management game. Take charge of a real club: pick the formation, ' +
    'name the starting eleven, work the transfer market, run the youth academy and manage a ' +
    'full league season plus cups. No download, no account and no payment.',
  inLanguage: 'en-GB',
  isAccessibleForFree: true,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'GBP',
    availability: 'https://schema.org/InStock',
  },
  publisher: { '@id': 'https://www.ballknw.com/#org' },
  isPartOf: { '@id': 'https://www.ballknw.com/#website' },
};

/* The game itself is a client component that renders almost nothing until the
   player database loads, so the exported HTML for /gaffa/ was a near-empty
   shell — eight words, and no crawlable description of what the page is. This
   section is a server component, so it ships in the static export and is there
   for both readers and crawlers before any JavaScript runs. Strategy advice
   deliberately lives on /gaffer-guide.html instead; this is what the game is,
   not how to win at it. */
function AboutGaffa() {
  return (
    <>
      <section className="fm-about">
        <h2>What is Gaffa?</h2>
        <p>
          Gaffa is a free football management game that runs in your browser. You take charge of a
          real club and manage it the way a gaffer actually does: pick the shape the team plays,
          decide who starts and who is rested, work the transfer market, keep contracts in order,
          bring players through the youth academy, and steer the club through a full league season
          plus its cup competitions. There is no download, no account and no payment — you open the
          page and start a career.
        </p>

        <h2>Managing a season</h2>
        <p>
          A season runs week by week. You pick a formation and a tactical approach, name your
          starting eleven, and play the fixture; the result feeds into a league table that moves
          around you as every other club plays too. Form, fitness and morale all drift over the
          course of a campaign, so a side that starts brilliantly can fade if you never rotate it.
          Finish high enough and you go up, or into Europe; finish badly enough and you go down, and
          the board&rsquo;s patience is not unlimited.
        </p>
        <ul>
          <li>
            <strong>Ten playable leagues</strong> across the English pyramid and Europe, with squads
            based on real clubs and real players.
          </li>
          <li>
            <strong>Transfers and contracts</strong> — sign players, sell the ones you have no room
            for, and renew the deals of anyone you want to keep before they run down.
          </li>
          <li>
            <strong>A youth academy</strong> that produces prospects over time, which is where a
            smaller club finds quality it could never afford to buy.
          </li>
          <li>
            <strong>Cup competitions</strong> running alongside the league, with the fixture
            congestion that comes with a deep run.
          </li>
          <li>
            <strong>Finances and facilities</strong> — a wage bill and a transfer budget that grow
            or shrink with how the club is doing.
          </li>
        </ul>

        <h2>What a match week looks like</h2>
        <p>
          Between fixtures you work through the parts of the club that need you. The inbox carries
          the week&rsquo;s business — injury news, board messages, transfer interest in your players,
          contract situations coming to a head. The squad screen shows who is fit, who is tired and
          who has quietly stopped playing well. From there you set the team up: choose the
          formation, put players in the positions that suit them, and pick an approach for the
          specific game in front of you, because holding a lead away at a stronger side is a
          different job from breaking down a team that has parked in front of its own box.
        </p>
        <p>
          Then the fixture is played and the consequences land. A win moves you up the table and
          settles the board; a bad run does the opposite, and the objectives you were set at the
          start of the season stop looking generous. Injuries and suspensions force changes you did
          not plan for, which is where squad depth stops being an abstraction and starts deciding
          results.
        </p>

        <h2>Building a squad over seasons</h2>
        <p>
          Gaffa is a career game rather than a single-season one, so the interesting decisions are
          the ones that pay off later. Young players develop if they get minutes, ageing players
          decline whether or not you are ready for it, and a contract you leave alone for a season
          too long turns a saleable asset into a free transfer out of the door. Academy intakes give
          you players you did not pay for, which matters most at clubs where the transfer budget
          will never compete. Managed well, a mid-table side can be rebuilt into a promotion side
          across a few seasons without ever spending big.
        </p>

        <h2>Starting your first career</h2>
        <p>
          Pick a club at a level that matches how much difficulty you want. A Premier League side
          hands you a strong squad and an expectation of trophies, so the pressure arrives
          immediately. Starting further down gives you a weaker team but far more room to improve
          it, and promotion is a more forgiving first objective than a title race. Once you are in,
          look at your squad before you touch the transfer market: the fastest way to lose a season
          is to spend the budget on a position you were already strong in, then discover in November
          that you have one fit centre-half. Tactics, rotation and transfer strategy are covered
          properly in the <a href="/gaffer-guide.html">Gaffa strategy guide</a>.
        </p>

        <h2>Common questions</h2>
        <dl>
          <dt>Is Gaffa free?</dt>
          <dd>
            Yes. It is free to play with no account and no download, and it works on phones,
            tablets and desktop browsers.
          </dd>
          <dt>Does my save carry over?</dt>
          <dd>
            Your career is saved in your own browser&rsquo;s storage, so you can close the tab and
            pick it up later on the same device and browser. Clearing site data deletes it, and a
            save does not follow you to a different device.
          </dd>
          <dt>Are the clubs and players real?</dt>
          <dd>
            Squads are built from real clubs and real players. Player ratings are our own stylised
            numbers rather than official ones, so read them as tiers of quality.
          </dd>
          <dt>How long is a season?</dt>
          <dd>
            A full league campaign plus cups takes a while, but it is played in short bursts — a
            fixture at a time — and the save is there whenever you come back.
          </dd>
          <dt>Why is it called Gaffa?</dt>
          <dd>
            &ldquo;Gaffer&rdquo; is what an English dressing room calls the manager — the one who
            picks the team and carries the blame for it. Gaffa is that job rather than the word,
            but it is where the name comes from, and it is why a search for a gaffer game tends to
            land here. There is a longer piece on where the term came from in{' '}
            <a href="/what-is-a-gaffer-in-football.html">what a gaffer is in football</a>.
          </dd>
          <dt>Is this Football Manager?</dt>
          <dd>
            No. Gaffa is an unofficial fan-made browser game with no connection to Sports
            Interactive or SEGA. If you are researching the commercial series, see our
            page on <a href="/football-manager-26.html">Football Manager 26</a>.
          </dd>
        </dl>
      </section>

      <footer className="fm-about-foot">
        <nav>
          <a href="/">Home</a>
          <a href="/gaffer-guide.html">Gaffa guide</a>
          <a href="/football-terms.html">Football terms</a>
          <a href="/privacy.html">Privacy</a>
          <a href="/terms.html">Terms</a>
        </nav>
        <p>
          BALLKNW is an unofficial fan-made project, not affiliated with Sports Interactive, SEGA,
          EA Sports, FIFA, the Premier League, or any club or federation.
        </p>
      </footer>
    </>
  );
}

export default function Page() {
  return (
    <>
      {/* dangerouslySetInnerHTML is what Next.js itself prescribes for JSON-LD
          (docs/app/guides/json-ld): a native <script> is correct for structured
          data, and React would HTML-escape a text child and corrupt the JSON.
          Replacing `<` with its JSON unicode escape is what those docs ask for.
          It is belt-and-braces while GAFFA_JSONLD stays a module constant, but a
          literal `</script>` in any future value would otherwise close this tag
          early and turn the rest of the payload into markup. String.raw keeps
          the escape readable as the six characters it actually emits. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(GAFFA_JSONLD).replaceAll('<', String.raw`\u003c`),
        }}
      />
      <FootballManagerGame />
      <AboutGaffa />
    </>
  );
}
