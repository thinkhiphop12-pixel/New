/* Articles 41–50 — how football works, on the pitch and off it. */

export default [
  {
    slug: 'what-is-expected-goals-xg-in-football',
    title: 'What Is Expected Goals (xG) in Football? The Stat Explained',
    h1: 'What Is Expected Goals (xG)?',
    linkText: 'What is xG?',
    category: 'football',
    published: '2026-08-11',
    description: 'Expected goals measures the quality of a chance, not the result. How xG is calculated, what the values mean, why it matters — and what it cannot tell you.',
    keywords: 'expected goals, what is xg, xg football, xg meaning, expected goals explained, how is xg calculated',
    standfirst: 'The most important stat in modern football — and the one that\'s most misunderstood.',
    cardBlurb: 'What the number means, how it is built, and where it misleads.',
    term: {
      name: 'Expected goals (xG)',
      description: 'A statistical measure of chance quality that assigns each shot the probability of being scored, based on factors such as distance, angle, body part and the type of pass that created it.',
    },
    answer: '<span class="term">Expected goals (xG)</span> is a statistical measure of the quality of a chance. It assigns a probability to every shot based on factors like distance, angle, and the type of assist. A shot with an xG of 0.3 would be scored roughly 30% of the time.',
    sections: [
      {
        id: 'calculated',
        h2: 'How xG is calculated',
        html: `<p>An xG model is trained on hundreds of thousands of historical shots. For any new shot, it asks: of all the shots that looked like this one, what share went in? The main inputs are:</p>
<ul>
  <li><strong>Distance from goal</strong> — the single strongest factor</li>
  <li><strong>Angle</strong> — central shots are worth far more than shots from wide</li>
  <li><strong>Type of assist</strong> — through-balls, cut-backs and crosses create very different chances</li>
  <li><strong>Body part</strong> — headers are converted less often than shots with the foot</li>
  <li><strong>Type of play</strong> — open play, set piece, counter-attack, penalty</li>
</ul>
<p class="note">Different providers use different models and inputs, so the same match can carry slightly different xG figures depending on where you read it.</p>`,
      },
      {
        id: 'values',
        h2: 'What the values mean',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">xG value</th><th scope="col">Meaning</th></tr></thead>
    <tbody>
      <tr><th scope="row">0.01–0.10</th><td>Very low quality — a speculative effort, rarely scored</td></tr>
      <tr><th scope="row">0.10–0.25</th><td>Low quality — scored occasionally</td></tr>
      <tr><th scope="row">0.25–0.50</th><td>Medium quality — a real chance</td></tr>
      <tr><th scope="row">0.50–0.80</th><td>High quality — more likely to be scored than not</td></tr>
      <tr><th scope="row">0.80+</th><td>Very high quality — close to a certainty; a penalty sits around 0.76–0.79</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'vs',
        h2: 'xG vs actual goals',
        html: `<p>If a team's xG is consistently higher than its goals, it is underperforming its chances. If it scores more than its xG suggests, it is overperforming — which tends not to last.</p>
<p>Over one match, the gap is meaningless. Over ten or twenty, it becomes one of the better indicators of whether results are about to change direction.</p>`,
      },
      {
        id: 'why',
        h2: 'Why xG matters',
        html: `<ul>
  <li><strong>Performance evaluation</strong> — it separates how a team played from how the scoreline finished</li>
  <li><strong>Player evaluation</strong> — it distinguishes a striker who gets into good positions from one who scores spectacular one-offs</li>
  <li><strong>Tactical analysis</strong> — it shows where chances are created and conceded, not just how many</li>
  <li><strong>Recruitment</strong> — shot quality is far more repeatable season to season than conversion rate</li>
</ul>`,
      },
      {
        id: 'limits',
        h2: 'The limitations',
        html: `<p>xG doesn't tell you everything. Most public models do not know where the defenders and the goalkeeper were, how much pressure the shooter was under, or what the game state was. It says nothing about the passes that never became shots, which is where a lot of good football lives.</p>
<div class="callout">Use xG as evidence about <strong>chance quality over a run of matches</strong>. Using it to declare who deserved to win a single game is the most common way people misuse it.</div>`,
      },
    ],
    faq: [
      { q: 'What is xG in football?', a: 'Expected goals — a measure of chance quality that gives each shot the probability of being scored based on where and how it was taken.' },
      { q: 'How is xG calculated?', a: 'A model trained on large numbers of historical shots estimates the scoring probability of a new shot from features like distance, angle, body part, assist type and phase of play.' },
      { q: 'What is a good xG for a match?', a: 'Around 1.5 expected goals is a typical team total. Anything above 2.5 usually means a side created several high-quality chances rather than many speculative ones.' },
      { q: 'What is the xG of a penalty?', a: 'Roughly 0.76 to 0.79 in most models, reflecting the long-run conversion rate of penalties in professional football.' },
      { q: 'Is xG reliable?', a: 'Over a run of matches, yes — it predicts future scoring better than past goals do. Over a single match it is a description of chance quality, not a verdict on who deserved to win.' },
    ],
    related: ['football-manager-26-data-and-analytics', 'how-to-get-into-football-analytics', 'what-is-a-low-block-in-football'],
    cta: {
      h3: 'See the numbers in a season',
      p: 'Gaffa gives you a full season of matches, chances and results to pick apart. Free, in your browser, nothing to install.',
    },
  },

  {
    slug: 'what-is-route-one-football',
    title: 'What Is \'Route One\' in Football? The Direct Style Explained',
    h1: 'What Is Route One Football?',
    linkText: 'What is route one?',
    category: 'football',
    published: '2026-08-11',
    description: 'Route one football means bypassing midfield with long balls to a target man. How it works, why it is effective, and where it falls down.',
    keywords: 'route one football, what is route one, direct football, long ball football, route one meaning',
    standfirst: 'The most direct way to play — long balls, big strikers, and no messing about.',
    cardBlurb: 'Long balls, second balls, and why it still wins matches.',
    term: {
      name: 'Route one',
      description: 'A direct style of play in which the ball is moved forward quickly with long passes from defence to attack, bypassing midfield build-up.',
    },
    answer: '<span class="term">Route one</span> is a direct style of football where the team plays long balls from defence to attack, bypassing the midfield. It\'s the opposite of possession football — get the ball forward as quickly as possible and win the game closer to the opposition goal.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The goalkeeper kicks it long. The centre-back clears it forward. The target man wins the header, knocks it down, and the team attacks from there.</p>
<p>It's not pretty. It's not sophisticated. But it can be effective, especially against teams that are not set up for it — and it removes the part of the pitch where a technically better opponent would have beaten you.</p>`,
      },
      {
        id: 'components',
        h2: 'The key components',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Component</th><th scope="col">What it means</th></tr></thead>
    <tbody>
      <tr><th scope="row">Long balls</th><td>Passes of 30 yards or more, usually from defence straight into the final third</td></tr>
      <tr><th scope="row">Target man</th><td>A big, strong striker who wins the first header — <a href="/what-is-a-target-man-in-football.html">the role explained</a></td></tr>
      <tr><th scope="row">Second ball</th><td>Winning the knockdown, which is where the move actually starts</td></tr>
      <tr><th scope="row">Directness</th><td>Getting the ball forward as quickly as possible, every time</td></tr>
    </tbody>
  </table>
</div>
<p>The second ball is the part people miss. Route one is not really about the long pass — it is about having three players arriving where the knockdown lands.</p>`,
      },
      {
        id: 'vs',
        h2: 'Route one vs possession football',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Route one</th><th scope="col">Possession football</th></tr></thead>
    <tbody>
      <tr><th scope="row">Passes</th><td>Long</td><td>Short</td></tr>
      <tr><th scope="row">Tempo</th><td>Fast and vertical</td><td>Controlled</td></tr>
      <tr><th scope="row">Style</th><td>Direct</td><td>Patient</td></tr>
      <tr><th scope="row">Turnovers</th><td>Frequent, but a long way from your goal</td><td>Rare, but dangerous when they happen</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'why',
        h2: 'Why teams use route one',
        html: `<ul>
  <li><strong>It works with the right players</strong> — a strong striker and quick runners is all it needs</li>
  <li><strong>It's simple to coach</strong> — far less complex than a possession structure</li>
  <li><strong>It suits underdogs</strong> — it removes midfield, and midfield is where better teams win games</li>
  <li><strong>It creates set pieces</strong> — long balls produce throw-ins, corners and free-kicks in dangerous areas</li>
</ul>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>Route one is predictable. If the opposition has centre-backs who win headers and a midfield that picks up second balls, you have no plan B, and possession returns to them immediately every time.</p>
<p>It also concedes the ball constantly, which is only survivable if your defensive shape is well organised — which is why the best direct teams are also very well drilled without the ball.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Traditional English football, Sam Allardyce's teams, and — in a version nobody calls route one — almost every side in the world in the last five minutes of a match they are losing.</p>`,
      },
    ],
    faq: [
      { q: 'What does route one mean in football?', a: 'Playing the ball forward directly with long passes from defence to attack, skipping midfield build-up entirely.' },
      { q: 'Is route one football effective?', a: 'It can be, particularly for underdogs. It removes midfield, where better teams usually win, and produces set pieces in dangerous areas.' },
      { q: 'What is the second ball?', a: 'The loose ball after a long pass is headed or challenged for. Winning it is what turns a long punt into an actual attack, which is why direct teams pack players around the target man.' },
      { q: 'Why is route one criticised?', a: 'Because it is predictable and cedes possession, and because it looks crude compared with build-up play. Both criticisms are about aesthetics as much as results.' },
      { q: 'What players do you need for route one?', a: 'A target man who wins headers, runners to attack the knockdowns, and defenders and a goalkeeper who can hit an accurate long pass.' },
    ],
    related: ['what-is-a-target-man-in-football', 'what-is-a-low-block-in-football', 'what-is-tiki-taka-in-football'],
  },

  {
    slug: 'what-is-total-football',
    title: 'What Is Total Football? The Philosophy Explained',
    h1: 'What Is Total Football?',
    linkText: 'What is Total Football?',
    category: 'football',
    published: '2026-08-11',
    description: 'Total Football is the philosophy where any outfield player can take over any role. Where it came from, the principles behind it, and its influence today.',
    keywords: 'total football, what is total football, cruyff total football, rinus michels, totaalvoetbal, dutch total football',
    standfirst: 'The beautiful game at its most beautiful — and the philosophy that changed football forever.',
    cardBlurb: 'The Dutch idea that positions are roles, not places.',
    term: {
      name: 'Total Football',
      description: 'A tactical philosophy, developed at Ajax and the Netherlands national team in the 1970s, in which any outfield player can take over the role of any other, with the team keeping its shape while individuals interchange positions.',
    },
    answer: '<span class="term">Total Football</span> is a tactical philosophy where any outfield player can take over the role of any other player. The team keeps its shape, but the players filling each position change constantly, which makes it almost impossible to mark.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>A defender pushes forward to become a midfielder. A midfielder drops back to take his place. A winger moves inside to become a striker while the striker drifts wide. Positions are roles that need filling, not places that belong to people.</p>
<p>The system requires exceptional intelligence, fitness and technique. Every player has to understand every position well enough to occupy it convincingly, and to know when to go and when to stay.</p>`,
      },
      {
        id: 'principles',
        h2: 'The principles',
        html: `<ol>
  <li><strong>Positional interchange</strong> — players swap positions continuously, but the shape stays intact</li>
  <li><strong>Pressing</strong> — win the ball back high and immediately</li>
  <li><strong>Space</strong> — make the pitch big in possession and small without it</li>
  <li><strong>Mobility</strong> — constant movement, on and off the ball</li>
  <li><strong>Intelligence</strong> — players read situations rather than following instructions</li>
</ol>
<div class="callout">The often-missed half of Total Football is the defending. Compressing space and pressing high were as central to it as the interchanging, and both went on to define modern football.</div>`,
      },
      {
        id: 'vs',
        h2: 'Total Football vs modern possession football',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Total Football</th><th scope="col">Modern possession football</th></tr></thead>
    <tbody>
      <tr><th scope="row">Positional interchange</th><td>Constant and near-total</td><td>Structured and limited</td></tr>
      <tr><th scope="row">Pressing</th><td>High and aggressive</td><td>High but more organised around triggers</td></tr>
      <tr><th scope="row">Philosophy</th><td>Fluid, player-led</td><td>Positional, coach-led</td></tr>
    </tbody>
  </table>
</div>
<p>Modern positional play is in many ways the opposite instinct — players hold zones so that the structure creates the space. Both descend from the same Dutch root.</p>`,
      },
      {
        id: 'why',
        h2: 'Why it mattered',
        html: `<p>Total Football changed what a team was allowed to look like. It showed that positions could be fluid, that pressing could be a system rather than an act of desperation, and that intelligence could beat athleticism.</p>
<p>Its descendants include <a href="/what-is-tiki-taka-in-football.html">tiki-taka</a>, modern positional play, and essentially every elite European side that presses and builds from the back.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>The Netherlands side of the 1970s under Rinus Michels, with Johan Cruyff as its on-pitch intelligence, and the Ajax team that won three consecutive European Cups. Its influence runs directly through Cruyff's Barcelona to Guardiola's.</p>`,
      },
    ],
    faq: [
      { q: 'What is Total Football?', a: 'A philosophy in which any outfield player can take over any other player\'s role. The team\'s shape stays constant while the individuals occupying each position rotate freely.' },
      { q: 'Who invented Total Football?', a: 'It is credited to Rinus Michels at Ajax and the Netherlands in the late 1960s and 1970s, with Johan Cruyff as the player who interpreted and later taught it.' },
      { q: 'Is Total Football still played today?', a: 'Not in its pure form. Its principles — pressing, space manipulation, technically complete players — are everywhere, but modern teams use more structured positional systems.' },
      { q: 'What is the difference between Total Football and tiki-taka?', a: 'Total Football is about interchanging positions; tiki-taka is about short passing and possession. Tiki-taka is one descendant of Total Football rather than the same idea.' },
      { q: 'Why is Total Football so celebrated if it won no World Cup?', a: 'Because its influence outlived its results. The Netherlands lost the 1974 final, but the ideas reshaped how football has been coached ever since.' },
    ],
    related: ['what-is-tiki-taka-in-football', 'what-is-a-high-press-in-football', 'what-is-a-number-10-in-football'],
  },

  {
    slug: 'what-is-a-derby-in-football',
    title: 'What Is a \'Derby\' in Football? The Rivalry Explained',
    h1: 'What Is a Derby in Football?',
    linkText: 'What is a derby?',
    category: 'football',
    published: '2026-08-11',
    description: 'A derby is a match between rivals — usually local. What defines one, the different types of rivalry, and why form so often counts for nothing.',
    keywords: 'football derby, what is a derby, derby meaning football, el clasico, old firm, merseyside derby',
    standfirst: 'Some matches mean more than three points — here\'s why derbies are different.',
    cardBlurb: 'Why the fixture list has matches that ignore the table.',
    term: {
      name: 'Derby',
      description: 'A match between two rival clubs, most often from the same city or region, carrying significance beyond the points at stake because of geography, history or competition.',
    },
    answer: 'A <span class="term">derby</span> is a match between two rival clubs, usually local ones. It isn\'t just about football — it\'s about pride, history and bragging rights, which is why derbies are the most intense and least predictable matches in the calendar.',
    sections: [
      {
        id: 'defines',
        h2: 'What makes a derby',
        html: `<p>A derby is defined by some combination of:</p>
<ul>
  <li><strong>Geography</strong> — clubs from the same city or region, whose supporters live and work together</li>
  <li><strong>History</strong> — decades of results, grievances and specific matches everyone still argues about</li>
  <li><strong>Competition</strong> — both clubs chasing the same honours, or the same players</li>
  <li><strong>Identity</strong> — class, religion, politics or region attached to one club and not the other</li>
</ul>`,
      },
      {
        id: 'types',
        h2: 'Types of derby',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Type</th><th scope="col">Example</th></tr></thead>
    <tbody>
      <tr><th scope="row">City derby</th><td>Manchester United v Manchester City; AC Milan v Inter Milan</td></tr>
      <tr><th scope="row">Cross-town rivalry</th><td>Liverpool v Everton — the Merseyside derby</td></tr>
      <tr><th scope="row">National rivalry</th><td>Barcelona v Real Madrid — El Clásico, a rivalry of regions rather than a local derby</td></tr>
      <tr><th scope="row">Sectarian or political</th><td>Celtic v Rangers — the Old Firm</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'different',
        h2: 'Why derbies are different',
        html: `<ul>
  <li><strong>Intensity</strong> — players raise their level, and so do the tackles</li>
  <li><strong>Unpredictability</strong> — league position stops being a useful guide</li>
  <li><strong>Atmosphere</strong> — the crowd is louder, closer and more invested</li>
  <li><strong>Consequences</strong> — the result is remembered long after equivalent points elsewhere are forgotten</li>
</ul>`,
      },
      {
        id: 'famous',
        h2: 'Famous derbies',
        html: `<ul>
  <li><strong>El Clásico</strong> — Barcelona v Real Madrid</li>
  <li><strong>The Old Firm</strong> — Celtic v Rangers</li>
  <li><strong>The Merseyside derby</strong> — Liverpool v Everton</li>
  <li><strong>Derby della Madonnina</strong> — AC Milan v Inter Milan</li>
  <li><strong>Superclásico</strong> — Boca Juniors v River Plate</li>
  <li><strong>Der Klassiker</strong> — Bayern Munich v Borussia Dortmund</li>
</ul>`,
      },
      {
        id: 'effect',
        h2: 'The derby effect',
        html: `<p>Derbies are unpredictable, and the reasons are not mystical. Both sides play with higher intensity and more caution, matches are tighter, more cards are shown, and tight matches are decided by single moments rather than by the better team.</p>
<p>Which is why "form goes out of the window" is roughly true — not because form stops existing, but because the sample shrinks to one moment.</p>`,
      },
    ],
    faq: [
      { q: 'What is a derby in football?', a: 'A match between two rival clubs, usually from the same city or region, that carries significance beyond the points because of geography, history or identity.' },
      { q: 'Why is it called a derby?', a: 'The most common explanation traces it to the Derby, the English horse race, and to local Shrovetide football in Derby itself. Either way the word came to mean a fixture between close rivals.' },
      { q: 'Is El Clásico a derby?', a: 'It is usually called one, though strictly it is a national rivalry between clubs from different cities rather than a local derby.' },
      { q: 'What is the biggest derby in football?', a: 'There is no settled answer. The Old Firm, El Clásico, the Superclásico and the Milan derby all have a claim, depending on whether you weight history, intensity or global audience.' },
      { q: 'Does form matter in a derby?', a: 'Less than usual. Derbies tend to be tighter and more cautious, which shrinks the margin and lets single moments decide matches that form would otherwise predict.' },
    ],
    related: ['what-is-the-transfer-window-in-football', 'what-is-a-low-block-in-football', 'what-does-a-sporting-director-do'],
  },

  {
    slug: 'what-is-the-transfer-window-in-football',
    title: 'What Is the Transfer Window in Football? The System Explained',
    h1: 'What Is the Transfer Window?',
    linkText: 'What is the transfer window?',
    category: 'football',
    published: '2026-08-11',
    description: 'The transfer window is the period when clubs can register new players. How the two windows work, the key terms, deadline day and the exceptions.',
    keywords: 'transfer window, what is the transfer window, transfer deadline day, football transfer rules, january transfer window',
    standfirst: 'The two periods of the year when clubs can buy and sell players — and the most chaotic time in football.',
    cardBlurb: 'How the two windows work, and what actually happens inside them.',
    term: {
      name: 'Transfer window',
      description: 'A defined period during which football clubs may register players signed from other clubs. Outside these periods registrations are generally not permitted, subject to limited exceptions.',
    },
    answer: 'The <span class="term">transfer window</span> is a designated period during which football clubs can register new players. Outside these windows, transfers cannot normally be registered. There are two each season: a longer summer window and a shorter mid-season one.',
    sections: [
      {
        id: 'windows',
        h2: 'The two windows',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Window</th><th scope="col">Roughly when</th><th scope="col">What happens</th></tr></thead>
    <tbody>
      <tr><th scope="row">Summer</th><td>June to early September in Europe</td><td>The main window — most business is done here</td></tr>
      <tr><th scope="row">Mid-season</th><td>January in Europe</td><td>Shorter and smaller — corrections, injuries and panic</td></tr>
    </tbody>
  </table>
</div>
<p class="note">Exact dates are set by each national association within limits agreed with FIFA, so they differ by country and change year to year. Leagues outside the European calendar run their windows at different times entirely.</p>`,
      },
      {
        id: 'why',
        h2: 'Why transfer windows exist',
        html: `<p>Windows were introduced to create stability and competitive fairness. Without them, clubs could reshape squads at any point in a season, which meant a title race could be decided by a signing made in April.</p>
<p>They also give clubs a predictable planning cycle: assess, budget, recruit, integrate — rather than reacting continuously.</p>`,
      },
      {
        id: 'happens',
        h2: 'What happens in a window',
        html: `<ol>
  <li><strong>Clubs negotiate</strong> — buying and selling clubs agree a fee and its structure</li>
  <li><strong>Personal terms</strong> — the player and the buying club agree wages, length and clauses</li>
  <li><strong>Medical</strong> — the buying club checks the player's fitness before completing</li>
  <li><strong>Registration</strong> — paperwork is filed before the deadline, which is the part that actually matters</li>
</ol>`,
      },
      {
        id: 'terms',
        h2: 'Key terms',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Term</th><th scope="col">Meaning</th></tr></thead>
    <tbody>
      <tr><th scope="row">Transfer fee</th><td>The money paid to the selling club, often staged over several years</td></tr>
      <tr><th scope="row">Free transfer</th><td>A move with no fee, because the player's contract has expired</td></tr>
      <tr><th scope="row">Pre-contract</th><td>An agreement signed while a contract is still running but close to expiry</td></tr>
      <tr><th scope="row">Loan</th><td>A temporary move — see <a href="/how-does-the-loan-system-work-in-football.html">how loans work</a></td></tr>
      <tr><th scope="row">Sell-on clause</th><td>A share of a future sale owed back to the selling club</td></tr>
      <tr><th scope="row">Deadline day</th><td>The final day of the window, and the most chaotic day in the calendar</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'deadline',
        h2: 'Deadline day',
        html: `<p>Deadline day is the last day of the window. Clubs rush to complete deals they have been circling for weeks, selling clubs discover their leverage has vanished, and everything is settled in the final hours because nobody wants to move first.</p>
<p>It is also where the worst decisions get made, for the same reason: a squad problem that has existed since June gets solved in ninety minutes by whoever is available.</p>`,
      },
      {
        id: 'exceptions',
        h2: 'The exceptions',
        html: `<p>Free agents — players without a club — can generally be signed outside the window, which is why released players still find clubs in October. Some competitions also allow emergency signings in specific circumstances, most commonly goalkeeper cover.</p>`,
      },
    ],
    faq: [
      { q: 'What is the transfer window in football?', a: 'The period during which clubs are allowed to register players signed from other clubs. There are normally two per season: a long summer window and a shorter mid-season one.' },
      { q: 'When is the January transfer window?', a: 'It runs through January in most European leagues, with exact opening and closing dates set by each national association.' },
      { q: 'Can clubs sign players outside the transfer window?', a: 'Free agents can usually be signed at any time, and some competitions permit emergency signings — most often goalkeeper cover — under defined circumstances.' },
      { q: 'What is deadline day?', a: 'The final day of a transfer window, when clubs rush to complete outstanding deals before registration closes. It produces both the biggest transfers and the worst ones.' },
      { q: 'Why do transfer windows exist?', a: 'To create competitive stability. Without them, squads could be reshaped at any point in a season, and title races could be decided by signings made in the final weeks.' },
    ],
    related: ['how-does-the-loan-system-work-in-football', 'what-does-a-sporting-director-do', 'football-manager-26-transfer-strategies-for-small-clubs'],
  },

  {
    slug: 'how-does-the-loan-system-work-in-football',
    title: 'What Is the Loan System in Football? How It Works',
    h1: 'How the Loan System Works',
    linkText: 'How football loans work',
    category: 'football',
    published: '2026-08-11',
    description: 'How football loans work: why clubs lend and borrow players, the types of loan deal, who pays the wages, and the risks on both sides.',
    keywords: 'football loan system, how do football loans work, loan with option to buy, obligation to buy, football loan rules',
    standfirst: 'The loan system is how young players get game time — and how clubs get players without buying them.',
    cardBlurb: 'Who pays, who benefits, and where loan deals go wrong.',
    term: {
      name: 'Loan (football)',
      description: 'A temporary transfer in which a player joins another club for a fixed period while their registration remains with their parent club.',
    },
    answer: 'A <span class="term">loan</span> lets a player temporarily join another club. The parent club keeps the player\'s registration and contract; the borrowing club gets their services for an agreed period, usually contributing to their wages.',
    sections: [
      {
        id: 'how',
        h2: 'How loans work',
        html: `<ol>
  <li><strong>The clubs agree terms</strong> — length, wage split, any loan fee, and whether the player can face his parent club</li>
  <li><strong>The player agrees</strong> — he cannot be forced to move</li>
  <li><strong>Conditions are set</strong> — playing-time clauses, recall options, buy options</li>
  <li><strong>He joins</strong> — and is registered with the borrowing club for that period</li>
</ol>`,
      },
      {
        id: 'why',
        h2: 'Why clubs loan players',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Reason</th><th scope="col">Which club benefits</th></tr></thead>
    <tbody>
      <tr><th scope="row">Game time for a young player</th><td>The parent club — development it cannot provide itself</td></tr>
      <tr><th scope="row">Covering injuries</th><td>The borrowing club — quality without a permanent commitment</td></tr>
      <tr><th scope="row">Reducing the wage bill</th><td>The parent club — someone else pays part of the salary</td></tr>
      <tr><th scope="row">Try before you buy</th><td>The borrowing club — assess a player before committing a fee</td></tr>
      <tr><th scope="row">Rebuilding value</th><td>Both — a player playing regularly is worth more than one who is not</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'types',
        h2: 'Types of loan',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Type</th><th scope="col">Meaning</th></tr></thead>
    <tbody>
      <tr><th scope="row">Season-long</th><td>The player stays for the full season</td></tr>
      <tr><th scope="row">Short-term</th><td>A few months, often until the next window</td></tr>
      <tr><th scope="row">Emergency</th><td>Short cover, most commonly for goalkeepers, where competition rules allow it</td></tr>
      <tr><th scope="row">With option to buy</th><td>The borrowing club may buy at an agreed price at the end</td></tr>
      <tr><th scope="row">With obligation to buy</th><td>The borrowing club must buy, usually once agreed conditions are met</td></tr>
    </tbody>
  </table>
</div>
<p class="note">Competitions cap how many players a club may loan in or out, and those limits differ by country and have tightened in recent years.</p>`,
      },
      {
        id: 'wages',
        h2: 'Who pays the wages?',
        html: `<p>It is negotiated, not fixed. A loan of a young prospect to a smaller club often sees the parent club pay most of the salary, because the point is development. A loan of an established player to a wealthy club usually sees the borrower pay all of it, plus a loan fee.</p>`,
      },
      {
        id: 'risks',
        h2: 'The risks',
        html: `<ul>
  <li><strong>Injury</strong> — the player gets hurt away from his parent club's control</li>
  <li><strong>No minutes</strong> — the borrowing club's plans change and the player sits, which is worse than not going</li>
  <li><strong>Development stalls</strong> — the wrong level, either too high or too low, teaches him nothing</li>
  <li><strong>Attachment</strong> — a successful loan can make the player harder to reintegrate, not easier</li>
</ul>
<p>Which is why the playing-time agreement matters more than the destination's name.</p>`,
      },
    ],
    faq: [
      { q: 'How does a loan work in football?', a: 'A player joins another club temporarily while his contract and registration stay with his parent club. The two clubs agree the length, the wage split and any conditions.' },
      { q: 'Who pays a loan player\'s wages?', a: 'It is negotiated. Parent clubs often subsidise loans of young players to smaller clubs; borrowing clubs usually pay in full, and sometimes a loan fee too, for established players.' },
      { q: 'What is a loan with an obligation to buy?', a: 'A deal where the borrowing club must complete a permanent transfer at the end, usually once agreed conditions such as appearances or survival are met.' },
      { q: 'Can a loan player play against his parent club?', a: 'Only if the loan agreement allows it. Many deals explicitly prevent it, which is why loanees sometimes miss specific fixtures.' },
      { q: 'Why do clubs loan out young players?', a: 'For competitive game time they cannot provide themselves. Playing regularly at a lower level develops a young player far faster than training with a stronger squad.' },
    ],
    related: ['what-is-the-transfer-window-in-football', 'football-manager-26-how-to-develop-youth-players', 'what-does-a-sporting-director-do'],
  },

  {
    slug: 'what-does-a-football-scout-do',
    title: 'What Does a Football Scout Do? The Job Explained',
    h1: 'What Does a Football Scout Do?',
    linkText: 'What does a scout do?',
    category: 'football',
    published: '2026-08-11',
    description: 'What a football scout actually does day to day — watching matches, writing reports, the types of scouting role, and how data changed the job.',
    keywords: 'football scout, what does a football scout do, scouting job football, talent scout football, opposition scout',
    standfirst: 'The people who find the next big thing — and the unsung heroes of every successful club.',
    cardBlurb: 'The job behind every good signing, and what the reports contain.',
    answer: 'A <span class="term">football scout</span> identifies and evaluates players for their club. They watch matches live and on video, assess players against a defined profile, and write the reports that recruitment decisions are built on.',
    sections: [
      {
        id: 'does',
        h2: 'What scouts actually do',
        html: `<ul>
  <li><strong>Watch matches</strong> — live where possible, on video far more often than people assume</li>
  <li><strong>Assess players</strong> — technical, tactical, physical and mental, against the club's requirements</li>
  <li><strong>Write reports</strong> — structured, comparable, and specific enough to act on</li>
  <li><strong>Recommend or reject</strong> — the rejections matter as much as the recommendations</li>
  <li><strong>Maintain a network</strong> — agents, coaches, other scouts, and people at clubs</li>
</ul>`,
      },
      {
        id: 'types',
        h2: 'Types of scout',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Type</th><th scope="col">What they do</th></tr></thead>
    <tbody>
      <tr><th scope="row">Talent scout</th><td>Finds young players with potential, often at academy and youth-international level</td></tr>
      <tr><th scope="row">First-team scout</th><td>Assesses senior targets for immediate recruitment</td></tr>
      <tr><th scope="row">Opposition scout</th><td>Analyses upcoming opponents rather than potential signings</td></tr>
      <tr><th scope="row">Data scout</th><td>Uses statistical models to shortlist players for human scouts to watch</td></tr>
      <tr><th scope="row">Regional scout</th><td>Covers a defined territory and knows its clubs, agents and calendars</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'look',
        h2: 'What scouts look for',
        html: `<p>A good report is never a verdict on whether a player is good. It is an assessment of whether this player, at this price, fits this club, in this system, at this moment.</p>
<ul>
  <li><strong>Technical</strong> — first touch, passing, finishing, use of both feet</li>
  <li><strong>Tactical</strong> — positioning, decisions, what he does in the eighty minutes without the ball</li>
  <li><strong>Physical</strong> — pace, strength, stamina, and whether they will hold up at a higher level</li>
  <li><strong>Mental</strong> — attitude, reaction to mistakes, behaviour when the team is losing</li>
  <li><strong>Context</strong> — the standard of opposition, the role he plays, the quality around him</li>
</ul>`,
      },
      {
        id: 'data',
        h2: 'How data changed the job',
        html: `<p>Data has not replaced scouts; it has changed where they start. Models now narrow thousands of players to a shortlist, and the scout's job is to answer the questions data cannot: why is he doing that, is it coached or instinctive, and will it survive a move to a harder league?</p>
<p>The clubs that do this well use both. Neither the spreadsheet nor the eye is sufficient alone — which is roughly the argument in our <a href="/how-to-get-into-football-analytics.html">football analytics guide</a>.</p>`,
      },
      {
        id: 'reality',
        h2: 'The reality of the job',
        html: `<p>It is a lot of travel, a lot of cold evenings at grounds most people have never heard of, and a lot of watching players who turn out not to be good enough. The pay at the lower levels is poor, and much of the work is part-time or freelance.</p>
<p>It is also one of the few jobs in football where being right about someone before anyone else is the entire point.</p>`,
      },
    ],
    faq: [
      { q: 'What does a football scout do?', a: 'They watch and assess players — live and on video — against their club\'s specific requirements, then write reports that inform recruitment decisions.' },
      { q: 'What is the difference between a scout and an analyst?', a: 'A scout evaluates players by watching them; an analyst works primarily with data and video to identify patterns. Modern clubs use both, and the roles increasingly overlap.' },
      { q: 'Do scouts watch players live or on video?', a: 'Both, but video does more of the work than people expect. Live viewing is used to answer specific questions — physicality, attitude, behaviour off the ball — that video captures poorly.' },
      { q: 'What is an opposition scout?', a: 'A scout who analyses upcoming opponents rather than transfer targets, producing the report a coaching staff uses to prepare for a specific match.' },
      { q: 'How many times does a scout watch a player before recommending him?', a: 'Usually several, across different opponents and conditions. One good performance tells you very little about a player.' },
    ],
    related: ['how-to-become-a-football-scout', 'what-does-a-sporting-director-do', 'football-manager-26-staff-roles-explained'],
  },

  {
    slug: 'what-does-a-sporting-director-do',
    title: 'What Does a Sporting Director Do? The Job Explained',
    h1: 'What Does a Sporting Director Do?',
    linkText: 'What does a sporting director do?',
    category: 'football',
    published: '2026-08-11',
    description: 'The sporting director runs a club\'s football operations — recruitment, contracts, strategy and staff. How the job works and how it differs from the manager\'s.',
    keywords: 'sporting director, what does a sporting director do, director of football, sporting director vs manager, football club structure',
    standfirst: 'The person who runs the football side of the club — and the most powerful person you\'ve never heard of.',
    cardBlurb: 'The job between the boardroom and the dugout.',
    term: {
      name: 'Sporting director',
      description: 'The executive responsible for a football club\'s football operations, including recruitment strategy, contract negotiation, player development and the appointment of coaching staff.',
    },
    answer: 'A <span class="term">sporting director</span> is responsible for a club\'s football operations. They oversee recruitment, player development, contracts and long-term football strategy, and act as the link between the board and the head coach.',
    sections: [
      {
        id: 'does',
        h2: 'What a sporting director actually does',
        html: `<ul>
  <li><strong>Recruitment</strong> — sets the strategy, runs the scouting department, signs off targets</li>
  <li><strong>Contracts</strong> — negotiates with players and agents, and manages the wage structure</li>
  <li><strong>Player development</strong> — oversees the academy and the pathway into the first team</li>
  <li><strong>Staff</strong> — appoints and manages coaches and football staff, including the head coach</li>
  <li><strong>Strategy</strong> — defines the football identity the club recruits and coaches towards</li>
  <li><strong>Board liaison</strong> — reconciles football ambition with what the club can afford</li>
</ul>`,
      },
      {
        id: 'titles',
        h2: 'Sporting director vs director of football',
        html: `<p>The titles are used interchangeably, and the actual scope varies more by club than by name.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Sporting director</th><th scope="col">Director of football</th></tr></thead>
    <tbody>
      <tr><th scope="row">Typical scope</th><td>Football operations</td><td>Football operations plus wider club strategy</td></tr>
      <tr><th scope="row">Emphasis</th><td>Recruitment and development</td><td>Long-term club direction</td></tr>
    </tbody>
  </table>
</div>
<p>In practice, ask what the job controls rather than what it is called.</p>`,
      },
      {
        id: 'vs',
        h2: 'Sporting director vs manager',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Sporting director</th><th scope="col">Manager / head coach</th></tr></thead>
    <tbody>
      <tr><th scope="row">Responsibility</th><td>Club-wide football operations</td><td>The first team</td></tr>
      <tr><th scope="row">Focus</th><td>Recruitment, development, strategy</td><td>Tactics, training, matchday</td></tr>
      <tr><th scope="row">Time horizon</th><td>Years</td><td>The next match</td></tr>
      <tr><th scope="row">Tenure</th><td>Usually outlasts several head coaches</td><td>Usually short</td></tr>
    </tbody>
  </table>
</div>
<p>This split is why the British "manager" — who controlled recruitment as well as coaching — has largely disappeared at elite level. More on that job in <a href="/what-does-a-football-manager-do.html">what a football manager does</a>.</p>`,
      },
      {
        id: 'why',
        h2: 'Why clubs use sporting directors',
        html: `<ul>
  <li><strong>Continuity</strong> — the strategy survives a change of head coach, which happens every eighteen months on average</li>
  <li><strong>Specialisation</strong> — recruitment and contract negotiation are full-time jobs, not evening work for a coach</li>
  <li><strong>Efficiency</strong> — the coach coaches, and someone else handles everything that isn't coaching</li>
  <li><strong>Discipline</strong> — a separate signatory on transfers is a check against panic buying</li>
</ul>`,
      },
      {
        id: 'friction',
        h2: 'Where it goes wrong',
        html: `<p>The model fails in one specific way: when nobody has actually agreed who decides. If the head coach believes he picks the signings and the sporting director believes the same, the club buys players nobody wanted for a system nobody agreed on.</p>
<div class="callout">The successful versions of this structure all share one thing — an explicit, written division of authority over recruitment, agreed before anyone is hired.</div>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Monchi at Sevilla and Roma, Luis Campos at Monaco, Lille and Paris Saint-Germain, and Michael Edwards at Liverpool — where the recruitment structure outlasted and outperformed several transfer cycles.</p>`,
      },
    ],
    faq: [
      { q: 'What does a sporting director do?', a: 'They run a club\'s football operations: recruitment strategy, contract negotiations, the academy pathway, football staff appointments, and the long-term football direction of the club.' },
      { q: 'What is the difference between a sporting director and a manager?', a: 'The sporting director owns club-wide football strategy over a period of years; the head coach owns the first team and the next match. The sporting director usually outlasts several coaches.' },
      { q: 'Is a director of football the same as a sporting director?', a: 'Broadly, yes — the titles are used interchangeably, though director of football sometimes carries wider strategic responsibility. Scope varies by club more than by title.' },
      { q: 'Why do clubs have a sporting director?', a: 'For continuity and specialisation. Head coaches change frequently, and a club that rebuilds its recruitment strategy each time wastes money and years.' },
      { q: 'Who does the sporting director report to?', a: 'The board or chief executive. They sit between ownership and the football side, translating budget into strategy and strategy into signings.' },
    ],
    related: ['what-does-a-football-scout-do', 'what-is-the-transfer-window-in-football', 'how-to-become-a-football-scout'],
  },

  {
    slug: 'how-to-become-a-football-scout',
    title: 'How to Become a Football Scout — The Real Career Path',
    h1: 'How to Become a Football Scout',
    linkText: 'How to become a scout',
    category: 'football',
    published: '2026-08-11',
    description: 'The realistic routes into football scouting — where to start, what qualifications exist, how to build a portfolio of reports, and what the job actually pays.',
    keywords: 'how to become a football scout, football scouting career, scouting qualifications, fa talent id course, scout jobs football',
    standfirst: 'The dream job for football fans — here\'s how to actually become a scout.',
    cardBlurb: 'The routes in, the qualifications, and the honest version of the job.',
    answer: 'Becoming a <span class="term">football scout</span> takes football knowledge, written evidence that you can assess players, and a network. There is no single route in — most people arrive from playing, coaching, or grassroots scouting they did unpaid for years first.',
    sections: [
      {
        id: 'paths',
        h2: 'The common paths',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Path</th><th scope="col">How it works</th></tr></thead>
    <tbody>
      <tr><th scope="row">Former player</th><td>Playing background plus a network, moving into scouting after retiring</td></tr>
      <tr><th scope="row">Coach to scout</th><td>Coaching at academy or non-league level, then transitioning across</td></tr>
      <tr><th scope="row">Grassroots up</th><td>Unpaid or part-time scouting at amateur and youth level, building a reputation</td></tr>
      <tr><th scope="row">Data route</th><td>Analytics or data skills first, entering through a club's recruitment analysis team</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'steps',
        h2: 'The steps',
        html: `<ol>
  <li><strong>Learn the game properly</strong> — roles, systems, and what each position actually requires</li>
  <li><strong>Watch deliberately</strong> — one player for a whole match, not the ball</li>
  <li><strong>Write reports</strong> — consistently, in a fixed format, whether or not anyone has asked for them</li>
  <li><strong>Start where you can</strong> — non-league, youth football, academy games</li>
  <li><strong>Build a network</strong> — other scouts, coaches, and people already inside clubs</li>
  <li><strong>Consider a qualification</strong> — useful for credibility and structure, not a guarantee</li>
  <li><strong>Apply, repeatedly</strong> — most entry roles are part-time and poorly advertised</li>
</ol>`,
      },
      {
        id: 'portfolio',
        h2: 'The portfolio is the application',
        html: `<p>Nobody hires a scout on enthusiasm. What gets you a first conversation is twenty well-written reports on players a club can go and check for themselves.</p>
<div class="tool">
  <h3>Pick a defined brief</h3>
  <p>"Left-sided centre-backs under 21 in the fourth tier" is a portfolio. "Good players I saw" is not.</p>
</div>
<div class="tool">
  <h3>Use one consistent format</h3>
  <p>Technical, tactical, physical, mental, context, verdict. Comparable reports are the whole point of the job.</p>
</div>
<div class="tool">
  <h3>Be willing to be wrong in writing</h3>
  <p>A confident recommendation you can be judged on is worth more than five hedged ones.</p>
</div>`,
      },
      {
        id: 'quals',
        h2: 'Qualifications',
        html: `<p>Scouting courses exist and are worth considering, though they are rarely a formal requirement. In England the best known is the FA's talent identification programme; other national associations run equivalents, and several universities and private providers offer recruitment-analysis courses.</p>
<p class="note">Check what a course actually includes before paying. The useful ones teach a reporting framework and give you match assignments; the rest sell a certificate.</p>`,
      },
      {
        id: 'reality',
        h2: 'The reality',
        html: `<p>Scouting is not glamorous. It is travel, long evenings, and a great deal of watching players who are not good enough. Entry-level work is often part-time, expenses-only or freelance, and full-time positions are scarce and competitive.</p>
<p>The people who last do it because they enjoy the watching itself — not because of where it might lead.</p>`,
      },
      {
        id: 'tips',
        h2: 'Tips from working scouts',
        html: `<ul>
  <li><strong>Be patient</strong> — reputations take years, and the first paid role is the hardest</li>
  <li><strong>Watch a player more than once</strong> — one match tells you almost nothing</li>
  <li><strong>Be honest</strong> — overhyping a player once costs you the credibility you needed</li>
  <li><strong>Stay current</strong> — the game changes, and so should what you look for</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'How do you become a football scout?', a: 'Learn the game deeply, write consistent match reports on a defined brief, start at grassroots or non-league level, build a network inside the game, and apply for part-time roles as they appear.' },
      { q: 'Do you need qualifications to be a football scout?', a: 'Not formally, though scouting and talent-identification courses help with credibility and give you a reporting framework. A portfolio of reports matters more than a certificate.' },
      { q: 'How much do football scouts earn?', a: 'Entry-level scouting is often part-time, freelance or expenses-only. Full-time roles at professional clubs pay a modest professional salary, with senior recruitment positions paying considerably more.' },
      { q: 'Can you become a scout without playing professionally?', a: 'Yes. Many scouts never played at a high level. Judgement, written communication and persistence matter more than a playing career.' },
      { q: 'What should a scouting report include?', a: 'Technical, tactical, physical and mental assessment, the context of the match and opposition, and a clear verdict with a recommendation you are prepared to be judged on.' },
    ],
    related: ['what-does-a-football-scout-do', 'how-to-get-into-football-analytics', 'what-does-a-sporting-director-do'],
  },

  {
    slug: 'how-to-get-into-football-analytics',
    title: 'How to Get Into Football Analytics — The Career Path Explained',
    h1: 'How to Get Into Football Analytics',
    linkText: 'Getting into football analytics',
    category: 'football',
    published: '2026-08-11',
    description: 'How to build a career in football analytics — the skills that matter, how to build a public portfolio with free data, and where analysts actually work.',
    keywords: 'football analytics career, how to get into football analytics, football data analyst, statsbomb data, football data science jobs',
    standfirst: 'The new frontier of football — using data to make better decisions, and the career path for the data-driven generation.',
    cardBlurb: 'Skills, portfolio, and where the jobs actually are.',
    answer: 'Getting into <span class="term">football analytics</span> takes three things: real data skills, genuine football understanding, and public work that proves both. It is a small, competitive field, and almost everyone in it got their first role off the back of something they published for free.',
    sections: [
      {
        id: 'does',
        h2: 'What football analysts do',
        html: `<ul>
  <li><strong>Collect and clean data</strong> — match event data, tracking data, physical data, scouting inputs</li>
  <li><strong>Analyse it</strong> — find patterns that survive scrutiny rather than patterns that look good</li>
  <li><strong>Build models</strong> — recruitment shortlists, chance-quality models, injury risk, opposition profiling</li>
  <li><strong>Communicate</strong> — turn a model into one slide a coach can act on before Saturday</li>
</ul>
<p>The last one is where most technically strong candidates fail.</p>`,
      },
      {
        id: 'skills',
        h2: 'The key skills',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Skill</th><th scope="col">Why it matters</th></tr></thead>
    <tbody>
      <tr><th scope="row">Data analysis</th><td>The core of the job — cleaning, joining and interrogating messy data</td></tr>
      <tr><th scope="row">Statistics</th><td>Knowing what a result means, and when it means nothing</td></tr>
      <tr><th scope="row">Programming</th><td>Python or R, plus SQL. Spreadsheets stop scaling quickly</td></tr>
      <tr><th scope="row">Football knowledge</th><td>Without it you will answer questions nobody asked</td></tr>
      <tr><th scope="row">Communication</th><td>Coaches act on clarity, not on notebooks</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'portfolio',
        h2: 'Build a portfolio with public data',
        html: `<p>There is more free football data available than most people realise, and every recognised name in the field started by publishing analysis with it.</p>
<ol>
  <li><strong>Pick a real question</strong> — narrow and answerable, not "who is the best player"</li>
  <li><strong>Use open data</strong> — free event data sets, public league results, published xG figures</li>
  <li><strong>Show your working</strong> — code in a public repository, methodology in plain English</li>
  <li><strong>Write for a coach, not a conference</strong> — the conclusion first, the method underneath</li>
  <li><strong>Publish consistently</strong> — one piece a month for a year beats one excellent piece</li>
</ol>`,
      },
      {
        id: 'where',
        h2: 'Where analysts work',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Employer</th><th scope="col">What the work looks like</th></tr></thead>
    <tbody>
      <tr><th scope="row">Clubs</th><td>Recruitment analysis, performance analysis, opposition profiling</td></tr>
      <tr><th scope="row">Data companies</th><td>Building and selling the data and models clubs use</td></tr>
      <tr><th scope="row">Media</th><td>Analysis and visualisation for a public audience</td></tr>
      <tr><th scope="row">Betting</th><td>Modelling markets — the best-paid route, and the least football-shaped</td></tr>
      <tr><th scope="row">Agencies and federations</th><td>Player representation, national-team recruitment and development</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'paths',
        h2: 'The common routes in',
        html: `<ul>
  <li><strong>From data</strong> — a data science or engineering job elsewhere, then a move across</li>
  <li><strong>From sports science</strong> — physical and performance data, expanding into event data</li>
  <li><strong>From football</strong> — coaching or analysis experience, adding technical skills</li>
  <li><strong>From academia</strong> — statistics or computer science research, applied to football problems</li>
</ul>
<p>The data route is the most common, because the technical skills take longer to acquire than the football knowledge.</p>`,
      },
      {
        id: 'realistic',
        h2: 'Being realistic about it',
        html: `<p>Analytics roles at clubs are few, applications are many, and salaries are frequently below what the same skills earn outside football. The people who get in are usually the ones who were doing the work publicly, for free, before anyone paid them.</p>
<div class="callout">The most reliable route in is not an application. It is a body of public work good enough that someone in the industry sends you a message about it.</div>`,
      },
    ],
    faq: [
      { q: 'How do you get into football analytics?', a: 'Learn Python or R and SQL, build genuine football understanding, and publish analysis using open data until your public work is good enough to get noticed.' },
      { q: 'What programming language should a football analyst learn?', a: 'Python is the most widely used, with R common in statistics-heavy work. SQL is essential for either, because most club data lives in databases.' },
      { q: 'Do you need a degree for football analytics?', a: 'Not necessarily. A quantitative degree helps, but a strong public portfolio of applied analysis carries more weight with most hiring managers in the field.' },
      { q: 'Where can you get free football data?', a: 'Several providers publish open event data sets for research and education, and public results and xG data are widely available. Read the licence before publishing anything built on them.' },
      { q: 'Is football analytics well paid?', a: 'Club roles often pay less than equivalent data jobs outside sport. Betting and data-provider roles pay considerably better; people take club jobs for the football, not the salary.' },
    ],
    related: ['what-is-expected-goals-xg-in-football', 'how-to-become-a-football-scout', 'football-manager-26-data-and-analytics'],
  },
];
