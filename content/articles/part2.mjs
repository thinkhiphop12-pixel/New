/* Articles 11–20 — the rest of the role explainers, then the platform guides. */

const PLATFORM_SWITCH = (current) => {
  const items = [
    ['free-football-manager', 'All free games'],
    ['best-football-manager-games-pc', 'PC &amp; Desktop'],
    ['best-football-manager-games-mac', 'Mac'],
    ['best-football-manager-games-android', 'Android'],
    ['best-football-manager-games-iphone', 'iPhone'],
    ['best-football-manager-games-steam-deck', 'Steam Deck'],
    ['best-football-manager-games-switch', 'Switch'],
  ];
  return `<div class="platform-switch">
      ${items.map(([slug, label]) => `<a href="/${slug}.html"${slug === current ? ' class="on"' : ''}>${label}</a>`).join('\n      ')}
    </div>`;
};

export default [
  {
    slug: 'what-is-a-holding-midfielder-in-football',
    title: 'What Is a Holding Midfielder in Football? The Role Explained',
    h1: 'What Is a Holding Midfielder?',
    linkText: 'What is a holding midfielder?',
    category: 'tactics',
    published: '2026-08-11',
    description: 'A holding midfielder screens the back four, wins the ball back and recycles possession. What the role does, and how it differs from a regista and a ball-winner.',
    keywords: 'holding midfielder, what is a holding midfielder, defensive midfielder role, makelele role, holding midfielder vs regista, number 6 football',
    standfirst: 'The unsung hero — the player who does the dirty work so everyone else can shine, and the one everyone notices when he\'s not there.',
    cardBlurb: 'The screen in front of the back four, and why the team collapses without one.',
    term: {
      name: 'Holding midfielder',
      description: 'A central midfielder who plays deep in front of the defence, screening the back four, breaking up opposition attacks and recycling possession simply to more creative teammates.',
    },
    answer: 'A <span class="term">holding midfielder</span> is a central midfielder who sits deep in front of the defence, protecting the back four, breaking up opposition attacks, and recycling possession. They\'re the shield, the screen, the player who makes the team defensively solid.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The holding midfielder doesn't go forward much. He stays deep, in the space between the midfield and the defence. When the opposition has the ball, he closes down passing lanes, intercepts passes, and makes tackles. When his team has the ball, he receives it from the defence and distributes it simply.</p>
<p>He's not flashy. He doesn't score many goals. He doesn't make many assists. But without him, the team falls apart.</p>`,
      },
      {
        id: 'does',
        h2: 'The three things a holding midfielder does',
        html: `<ol>
  <li><strong>Protects the defence</strong> — screens the back four, stops attacks before they develop</li>
  <li><strong>Wins the ball back</strong> — tackles, interceptions, pressing</li>
  <li><strong>Recycles possession</strong> — receives the ball from the defence and passes it to more creative players</li>
</ol>`,
      },
      {
        id: 'vs',
        h2: 'Holding midfielder vs defensive midfielder vs regista',
        html: `<p>These terms get used interchangeably and they are not the same thing.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Holding midfielder</th><th scope="col">Defensive midfielder</th><th scope="col">Regista</th></tr></thead>
    <tbody>
      <tr><th scope="row">Primary job</th><td>Protect the defence</td><td>Break up play</td><td>Distribute and dictate</td></tr>
      <tr><th scope="row">Passing range</th><td>Limited — keeps it simple</td><td>Limited — keeps it simple</td><td>Extensive — switches play</td></tr>
      <tr><th scope="row">Position</th><td>Deep, in front of defence</td><td>Deep, in front of defence</td><td>Deep, in front of defence</td></tr>
      <tr><th scope="row">The difference</th><td>More about positioning</td><td>More about tackling</td><td>More about passing</td></tr>
    </tbody>
  </table>
</div>
<p>If the deepest midfielder is the one your attacks are built through rather than protected by, you have a <a href="/what-is-a-regista-in-football.html">regista</a>, not a holder.</p>`,
      },
      {
        id: 'why',
        h2: 'Why teams use a holding midfielder',
        html: `<ul>
  <li><strong>Defensive solidity</strong> — the holding midfielder gives the defence extra protection</li>
  <li><strong>Balance</strong> — allows other midfielders to attack without leaving the defence exposed</li>
  <li><strong>Possession</strong> — provides a passing option for the defence under pressure</li>
</ul>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>The holding midfielder doesn't contribute much to the attack. You're effectively sacrificing an attacking player for a defensive one. That's fine if you have enough creativity elsewhere, but it can make the team predictable.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Claude Makélélé (the role is sometimes called the "Makélélé role"), N'Golo Kanté (though he's more of a ball-winner), Sergio Busquets, and more recently players like Rodri or Declan Rice.</p>`,
      },
    ],
    faq: [
      { q: 'What is a holding midfielder in football?', a: 'A central midfielder who sits deep in front of the back four, screening the defence, breaking up attacks and passing simply to keep possession ticking over.' },
      { q: 'What is the Makélélé role?', a: 'A nickname for the pure holding midfielder job, after Claude Makélélé at Real Madrid and Chelsea — a player whose entire function is to protect the defence and let everyone ahead of him attack.' },
      { q: 'What is the difference between a holding midfielder and a regista?', a: 'They stand in the same place. A holder is there to protect and recycle; a regista is there to create and dictate tempo. The job description changes with what the player does on the ball.' },
      { q: 'What number does a holding midfielder wear?', a: 'Traditionally the 6, which is why the position is often just called "the six" — though shirt numbers no longer map to positions reliably.' },
      { q: 'Do you need a holding midfielder in a 4-3-3?', a: 'Almost always. With two advanced midfielders and attacking full-backs, the single deepest player is the only cover in front of the centre-backs.' },
    ],
    related: ['what-is-a-regista-in-football', 'what-is-a-box-to-box-midfielder-in-football', 'what-is-a-4-3-3-formation'],
  },

  {
    slug: 'what-is-a-wing-back-in-football',
    title: 'What Is a Wing-Back in Football? The Role Explained',
    h1: 'What Is a Wing-Back?',
    linkText: 'What is a wing-back?',
    category: 'tactics',
    published: '2026-08-11',
    description: 'A wing-back covers the whole flank — attacking like a winger, defending like a full-back. What the role demands, and how it differs from a full-back.',
    keywords: 'wing back, what is a wing back, wing back vs full back, wing back role, wing back football, 3-5-2 wing back',
    standfirst: 'The most demanding position in football — part full-back, part winger, and responsible for covering the entire flank.',
    cardBlurb: 'The whole flank, both jobs, ninety minutes — football\'s hardest running job.',
    term: {
      name: 'Wing-back',
      description: 'A wide player in a back-three system who covers the entire flank, attacking as a winger in possession and dropping into the defensive line out of possession.',
    },
    answer: 'A <span class="term">wing-back</span> is a wide player who operates as both a defender and an attacker, covering the entire flank. They\'re the key to any system that uses three centre-backs, providing width, attacking threat, and defensive cover.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The wing-back starts in a defensive position but pushes high up the pitch when the team has the ball. They cross the ball into the box, they combine with the wide forwards, they even get into the penalty area to score.</p>
<p>When the team loses the ball, they sprint back to defend. They track the opposition's wide players, they block crosses, they make tackles. They do this repeatedly, for ninety minutes.</p>
<div class="callout">It's the most physically demanding role in football. The wing-back routinely covers more ground than anyone else on the pitch.</div>`,
      },
      {
        id: 'types',
        h2: 'The two types of wing-back',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Type</th><th scope="col">What they do</th></tr></thead>
    <tbody>
      <tr><th scope="row">Attacking</th><td>Pushes high, crosses the ball, creates chances — more of a winger who defends</td></tr>
      <tr><th scope="row">Defensive</th><td>Stays deeper, prioritises defending, still gets forward but more cautiously</td></tr>
    </tbody>
  </table>
</div>
<p>Most teams pick one of each: an attacking wing-back on the side they want to overload, and a more cautious one on the other.</p>`,
      },
      {
        id: 'vs',
        h2: 'Wing-back vs full-back',
        html: `<p>These get confused constantly, and they are not the same thing.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Full-back</th><th scope="col">Wing-back</th></tr></thead>
    <tbody>
      <tr><th scope="row">Primary job</th><td>Defend</td><td>Attack <em>and</em> defend</td></tr>
      <tr><th scope="row">Position</th><td>Deeper</td><td>Higher up the pitch</td></tr>
      <tr><th scope="row">Stamina required</th><td>High</td><td>Extremely high</td></tr>
      <tr><th scope="row">System</th><td>4-4-2, 4-3-3, 4-2-3-1</td><td>3-5-2, 3-4-3, 5-3-2</td></tr>
      <tr><th scope="row">Width</th><td>Provides some width</td><td>Provides <em>all</em> the width</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'why',
        h2: 'Why teams use wing-backs',
        html: `<ul>
  <li><strong>Width</strong> — wing-backs stretch the opposition defence without using a forward to do it</li>
  <li><strong>Overloads</strong> — they create numerical advantages in wide areas</li>
  <li><strong>Attacking threat</strong> — they can cross, shoot and score</li>
  <li><strong>Defensive cover</strong> — they drop in to make a back five when the team is under pressure</li>
</ul>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>The wing-back has to be an exceptional athlete. They cover more ground than anyone else and have to be effective at both ends of the pitch. If they're not fit enough or not good enough, the system fails.</p>
<p>They are also the first thing a good opponent attacks: pin the wing-back deep with a winger and a <a href="/what-is-a-3-5-2-formation.html">3-5-2</a> loses its entire attacking width.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Marcos Alonso under Antonio Conte at Chelsea, Achraf Hakimi, Alphonso Davies (though he's more of a full-back who attacks), and wing-backs in Serie A like Robin Gosens.</p>`,
      },
    ],
    faq: [
      { q: 'What is a wing-back in football?', a: 'A wide player who covers the entire flank — attacking like a winger when the team has the ball and dropping into the defensive line when it does not. The role exists mainly in back-three systems.' },
      { q: 'What is the difference between a wing-back and a full-back?', a: 'A full-back is primarily a defender in a back four. A wing-back plays higher, supplies all of the team\'s width, and is expected to attack as much as defend.' },
      { q: 'What attributes does a wing-back need?', a: 'Stamina above all, then pace, crossing and one-on-one defending. It is the position where fitness data most directly limits who can play it.' },
      { q: 'Which formations use wing-backs?', a: '3-5-2, 3-4-3 and 5-3-2 — any shape with three central defenders and no natural full-backs.' },
      { q: 'Can a winger play as a wing-back?', a: 'Often yes, and many are converted. The attacking side comes naturally; the question is always whether they will do the defensive half of the job for ninety minutes.' },
    ],
    related: ['what-is-a-3-5-2-formation', 'what-is-a-box-to-box-midfielder-in-football', 'what-is-a-4-3-3-formation'],
  },

  {
    slug: 'what-is-a-target-man-in-football',
    title: 'What Is a Target Man in Football? The Role Explained',
    h1: 'What Is a Target Man?',
    linkText: 'What is a target man?',
    category: 'tactics',
    published: '2026-08-11',
    description: 'A target man holds the ball up, wins headers and brings teammates into play. What the role does, and how it differs from a poacher and a complete striker.',
    keywords: 'target man, what is a target man, target man football, hold up play, target man vs poacher, striker roles explained',
    standfirst: 'The old-school striker — big, strong, good in the air, and the player everyone aims for when they need a goal.',
    cardBlurb: 'Hold-up play, headers, and why direct teams still need one.',
    term: {
      name: 'Target man',
      description: 'A striker who uses physical presence to hold the ball up, win aerial duels and bring teammates into play, acting as the focal point for direct passes and crosses.',
    },
    answer: 'A <span class="term">target man</span> is a striker who uses their physical presence to hold up the ball, bring teammates into play, and score goals — particularly from crosses and long balls. They\'re the focal point of the attack, the player everything goes through.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The target man plays with their back to goal. They receive long balls, chest them down, hold off defenders, and lay the ball off to teammates. They win headers, they occupy centre-backs, and they create space for others.</p>
<p>They're not the most mobile players. They're not going to run in behind the defence. But they're invaluable for teams that play direct football or need a focal point.</p>`,
      },
      {
        id: 'does',
        h2: 'The three things a target man does',
        html: `<ol>
  <li><strong>Holds the ball up</strong> — receives under pressure and keeps it until teammates arrive</li>
  <li><strong>Wins headers</strong> — competes for aerial balls at both ends of the pitch</li>
  <li><strong>Brings others into play</strong> — lays the ball off to runners and creates chances</li>
</ol>`,
      },
      {
        id: 'vs',
        h2: 'Target man vs poacher vs complete striker',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Target man</th><th scope="col">Poacher</th><th scope="col">Complete striker</th></tr></thead>
    <tbody>
      <tr><th scope="row">Primary skill</th><td>Physical presence</td><td>Finishing</td><td>Everything</td></tr>
      <tr><th scope="row">Movement</th><td>Limited — stays central</td><td>Intelligent — finds space in the box</td><td>All over the pitch</td></tr>
      <tr><th scope="row">Style</th><td>Hold-up play</td><td>Goalscoring</td><td>Build-up <em>and</em> goalscoring</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'why',
        h2: 'Why teams use a target man',
        html: `<ul>
  <li><strong>Direct football</strong> — the target man is the focal point for long balls</li>
  <li><strong>Aerial threat</strong> — crosses into the box have a better chance of being converted</li>
  <li><strong>Creating space</strong> — the target man occupies defenders, freeing up space for others</li>
</ul>
<p>He is also the standard answer to a <a href="/what-is-a-low-block-in-football.html">low block</a>, where dropping deep achieves nothing and someone has to attack the ball in a crowded box.</p>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>The target man doesn't contribute much to build-up play. They're not mobile, they're not technical, and they can be isolated against mobile defenders. Modern football has moved away from the traditional target man, preferring more mobile strikers.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Didier Drogba, Alan Shearer, Olivier Giroud, and more recently players like Erling Haaland (though he's more of a complete striker) or Harry Kane (who drops deep).</p>`,
      },
    ],
    faq: [
      { q: 'What is a target man in football?', a: 'A striker who uses physical strength and aerial ability to hold the ball up, win long passes and crosses, and bring teammates into the attack.' },
      { q: 'What is hold-up play?', a: 'Receiving the ball with your back to goal under pressure from a defender, keeping possession long enough for teammates to join the attack, then laying it off.' },
      { q: 'What is the difference between a target man and a poacher?', a: 'A target man is the focal point who links play and wins aerial duels. A poacher does almost nothing outside the penalty area and exists to finish chances inside it.' },
      { q: 'Is the target man out of date?', a: 'The pure version is rarer, because most teams want a striker who presses and runs in behind. But every side that plays direct football or needs a plan B still wants one on the bench.' },
      { q: 'What attributes does a target man need?', a: 'Height and strength, heading, first touch under pressure, and the composure to keep the ball with a centre-back on their back.' },
    ],
    related: ['what-is-route-one-football', 'what-is-a-number-10-in-football', 'what-is-a-4-4-2-formation'],
  },

  {
    slug: 'what-is-a-sweeper-keeper-in-football',
    title: 'What Is a Sweeper-Keeper in Football? The Role Explained',
    h1: 'What Is a Sweeper-Keeper?',
    linkText: 'What is a sweeper-keeper?',
    category: 'tactics',
    published: '2026-08-11',
    description: 'A sweeper-keeper leaves the box to clear through-balls and starts attacks with their feet. What the role does, and how it differs from a traditional goalkeeper.',
    keywords: 'sweeper keeper, what is a sweeper keeper, sweeper keeper meaning, neuer sweeper keeper, ball playing goalkeeper, goalkeeper roles',
    standfirst: 'The goalkeeper who\'s not just a goalkeeper — they\'re an extra defender, a sweeper, and sometimes even a playmaker.',
    cardBlurb: 'The keeper as an eleventh outfielder — and the risk that comes with it.',
    term: {
      name: 'Sweeper-keeper',
      description: 'A goalkeeper who regularly leaves the penalty area to intercept through-balls behind a high defensive line, and who is comfortable enough with the ball at their feet to take part in build-up play.',
    },
    answer: 'A <span class="term">sweeper-keeper</span> is a goalkeeper who regularly leaves their penalty area to clear through-balls, intercept passes, and act as an extra defender. They\'re comfortable with the ball at their feet and can even start attacks with their distribution.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The sweeper-keeper plays high up the pitch — sometimes almost at the edge of the centre circle when the team is dominating possession. When the opposition plays a through-ball, the sweeper-keeper rushes out to clear it before the striker can get there.</p>
<p>They're not just shot-stoppers. They're defenders. They read the game, anticipate danger, and intervene before it becomes a problem.</p>`,
      },
      {
        id: 'does',
        h2: 'The three things a sweeper-keeper does',
        html: `<ol>
  <li><strong>Sweeps behind the defence</strong> — clears through-balls, intercepts passes, stops attacks before they become chances</li>
  <li><strong>Plays with their feet</strong> — comfortable receiving back-passes and passing out under pressure</li>
  <li><strong>Starts attacks</strong> — quick, accurate distribution to launch counter-attacks</li>
</ol>`,
      },
      {
        id: 'vs',
        h2: 'Sweeper-keeper vs traditional goalkeeper',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Traditional goalkeeper</th><th scope="col">Sweeper-keeper</th></tr></thead>
    <tbody>
      <tr><th scope="row">Position</th><td>Stays on their line</td><td>Plays high up the pitch</td></tr>
      <tr><th scope="row">Primary skill</th><td>Shot-stopping</td><td>Shot-stopping <em>and</em> sweeping</td></tr>
      <tr><th scope="row">With the ball</th><td>Kicks it long</td><td>Passes it short</td></tr>
      <tr><th scope="row">Risk</th><td>Low</td><td>High</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'why',
        h2: 'Why teams use a sweeper-keeper',
        html: `<ul>
  <li><strong>High defensive line</strong> — the sweeper-keeper covers the space behind the defence, which is what makes a <a href="/what-is-a-high-press-in-football.html">high press</a> survivable</li>
  <li><strong>Possession football</strong> — the sweeper-keeper is an extra passing option, turning ten outfielders into eleven</li>
  <li><strong>Counter-attacks</strong> — quick distribution starts attacks before the opposition can reset</li>
</ul>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>The sweeper-keeper takes risks. If they misjudge a through-ball or misplace a pass, they leave an open goal. It's a high-risk, high-reward position, and the errors are the most visible in football.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Manuel Neuer is the gold standard — the player who defined the role. Ederson, Alisson, and more recently players like Marc-André ter Stegen.</p>`,
      },
    ],
    faq: [
      { q: 'What is a sweeper-keeper?', a: 'A goalkeeper who leaves the penalty area to intercept balls played in behind the defence, and who takes part in build-up play with the ball at their feet.' },
      { q: 'Why do teams use a sweeper-keeper?', a: 'Because a high defensive line leaves space behind it, and someone has to defend that space. The keeper is the only player already positioned to do it.' },
      { q: 'What is the risk of a sweeper-keeper?', a: 'Any misjudged rush or misplaced pass leaves an empty net. The role converts a few conceded goals into spectacular errors in exchange for stopping many more attacks earlier.' },
      { q: 'Who invented the sweeper-keeper role?', a: 'The modern version is credited to Manuel Neuer at Bayern Munich and Germany, though René Higuita and Edwin van der Sar played early versions of it.' },
      { q: 'What attributes does a sweeper-keeper need?', a: 'Rushing out and one-on-one judgement, acceleration, composure under pressure, and passing accuracy with both feet — on top of ordinary shot-stopping.' },
    ],
    related: ['what-is-a-high-press-in-football', 'what-is-tiki-taka-in-football', 'football-manager-26-player-roles-explained'],
  },

  {
    slug: 'what-is-a-box-to-box-midfielder-in-football',
    title: 'What Is a Box-to-Box Midfielder? The Role Explained',
    h1: 'What Is a Box-to-Box Midfielder?',
    linkText: 'What is a box-to-box midfielder?',
    category: 'tactics',
    published: '2026-08-11',
    description: 'A box-to-box midfielder contributes at both ends — tackling, passing, running and shooting. What the role does, and how it differs from a mezzala.',
    keywords: 'box to box midfielder, what is a box to box midfielder, box to box role, engine room midfielder, box to box vs mezzala',
    standfirst: 'The engine of the team — the player who runs everywhere, does everything, and never stops.',
    cardBlurb: 'The engine: defends, attacks, and covers the ground between.',
    term: {
      name: 'Box-to-box midfielder',
      description: 'A central midfielder who contributes to both defence and attack, covering the pitch from their own penalty area to the opposition\'s.',
    },
    answer: 'A <span class="term">box-to-box midfielder</span> is a central midfielder who contributes to both attack and defence, covering the entire pitch from their own penalty area to the opposition\'s. They tackle, they pass, they run, they shoot — they do it all.',
    sections: [
      {
        id: 'shape',
        h2: 'What it actually looks like',
        html: `<p>The box-to-box midfielder is everywhere. When the team defends, they're tracking back, making tackles, and breaking up play. When the team attacks, they're pushing forward, arriving in the box, and shooting.</p>
<p>They cover more ground than almost any other outfield player. They're the engine, the heart, the player who makes the team function.</p>`,
      },
      {
        id: 'does',
        h2: 'The three things a box-to-box midfielder does',
        html: `<ol>
  <li><strong>Defends</strong> — tackles, interceptions, tracking runners</li>
  <li><strong>Attacks</strong> — arrives in the box, shoots, creates chances</li>
  <li><strong>Transitions</strong> — links defence and attack and covers the ground between them</li>
</ol>`,
      },
      {
        id: 'vs',
        h2: 'Box-to-box midfielder vs mezzala',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">Box-to-box midfielder</th><th scope="col">Mezzala</th></tr></thead>
    <tbody>
      <tr><th scope="row">Position</th><td>Central</td><td>Wide, in the half-spaces</td></tr>
      <tr><th scope="row">Movement</th><td>Straight up and down</td><td>Diagonal, into wide areas</td></tr>
      <tr><th scope="row">Width</th><td>Stays central</td><td>Drifts wide</td></tr>
    </tbody>
  </table>
</div>
<p>The distinction is covered from the other side in <a href="/what-is-a-mezzala-in-football.html">what a mezzala is</a>.</p>`,
      },
      {
        id: 'why',
        h2: 'Why teams use a box-to-box midfielder',
        html: `<ul>
  <li><strong>Balance</strong> — one player contributing at both ends frees up a slot elsewhere</li>
  <li><strong>Energy</strong> — their work rate lifts the team and covers for less mobile teammates</li>
  <li><strong>Versatility</strong> — they can adapt to whatever the game turns into</li>
</ul>`,
      },
      {
        id: 'cost',
        h2: 'The trade-off',
        html: `<p>The box-to-box midfielder is not the best at any one thing. They're not the best tackler, not the best passer, not the best finisher. But they do everything to a good standard — and in a midfield three, that is usually worth more than a specialist.</p>`,
      },
      {
        id: 'examples',
        h2: 'Famous examples',
        html: `<p>Steven Gerrard, Frank Lampard, Patrick Vieira, and more recently players like Jude Bellingham or Nicolò Barella.</p>`,
      },
    ],
    faq: [
      { q: 'What is a box-to-box midfielder?', a: 'A central midfielder who defends in their own penalty area and attacks in the opposition\'s, covering the whole pitch rather than specialising at one end.' },
      { q: 'What is the difference between a box-to-box midfielder and a mezzala?', a: 'A mezzala is a box-to-box player who operates in the wide half-spaces rather than straight up and down the middle.' },
      { q: 'What attributes does a box-to-box midfielder need?', a: 'Stamina and work rate first, then a solid all-round set of passing, tackling, positioning and finishing. Being adequate at everything is the point of the role.' },
      { q: 'Is a box-to-box midfielder the same as a number 8?', a: 'Broadly yes. "Number 8" is the positional shorthand for the central midfielder between the holder and the number 10, and box-to-box is the most common way to play it.' },
      { q: 'Who is the best box-to-box midfielder of all time?', a: 'Steven Gerrard, Frank Lampard, Patrick Vieira and Bryan Robson are the usual names, with Jude Bellingham the modern benchmark.' },
    ],
    related: ['what-is-a-mezzala-in-football', 'what-is-a-holding-midfielder-in-football', 'what-is-a-4-3-3-formation'],
  },

  {
    slug: 'football-manager-26-vs-football-manager-26-mobile',
    title: 'Football Manager 26 vs Football Manager 26 Mobile — What\'s the Difference?',
    h1: 'Football Manager 26 vs FM26 Mobile',
    linkText: 'FM26 vs FM26 Mobile',
    category: 'fm',
    published: '2026-08-11',
    description: 'FM26 and FM26 Mobile share a name and a database but are different games. Match engine, depth, price and session length compared — and which to buy.',
    keywords: 'football manager 26 vs mobile, fm26 mobile, fm26 vs fm26 mobile, football manager mobile difference, fm mobile vs full game',
    standfirst: 'Two games, one name, completely different experiences — here\'s what you\'re actually getting with each one.',
    cardBlurb: 'Same name, same database, very different games.',
    answer: '<span class="term">Football Manager 26</span> is the full PC game — deep, detailed, and demanding. <span class="term">Football Manager 26 Mobile</span> is a scaled-down version for phones — quicker, simpler, and designed for touchscreens. They share the same name and the same database, but they\'re different games.',
    sections: [
      {
        id: 'full',
        h2: 'What the full version gives you',
        html: `<p>The full FM26 is the real deal. You're managing every aspect of the club — tactics, training, transfers, youth development, staff management, media interactions, and more. The match engine is 3D, the database is enormous, and the level of detail is obsessive.</p>
<p>It's the game for people who want to spend hours on a single save, agonising over every decision.</p>`,
      },
      {
        id: 'mobile',
        h2: 'What the mobile version gives you',
        html: `<p>FM26 Mobile is the same core idea but stripped down. The match engine is simpler, the database is smaller, and the management options are reduced. You can still sign players, pick tactics, and play matches, but it's faster and less detailed.</p>
<p>It's the game for people who want to play on the go, without the time commitment of the full version.</p>`,
      },
      {
        id: 'differences',
        h2: 'The key differences',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">FM26 (Full)</th><th scope="col">FM26 Mobile</th></tr></thead>
    <tbody>
      <tr><th scope="row">Platform</th><td>PC / Mac</td><td>Android / iOS</td></tr>
      <tr><th scope="row">Match engine</th><td>3D, full detail</td><td>Simplified 2D / text</td></tr>
      <tr><th scope="row">Database</th><td>Huge — thousands of players</td><td>Smaller — fewer leagues and players</td></tr>
      <tr><th scope="row">Management depth</th><td>Full — every detail</td><td>Reduced — core features only</td></tr>
      <tr><th scope="row">Session length</th><td>Hours per session</td><td>15–30 minutes per session</td></tr>
      <tr><th scope="row">Typical price</th><td>£40–£50</td><td>£10–£20</td></tr>
    </tbody>
  </table>
</div>
<p class="note">Prices are indicative and move with regional pricing, sales and storefront. Check the store before buying.</p>`,
      },
      {
        id: 'which',
        h2: 'Which one should you buy?',
        html: `<div class="tool">
  <h3>Buy the full version if</h3>
  <p>You want the complete Football Manager experience, you have time to invest, and you play on PC or Mac.</p>
</div>
<div class="tool">
  <h3>Buy the mobile version if</h3>
  <p>You want to play on your phone, you don't have hours to spare, and you want a quicker experience.</p>
</div>
<div class="tool">
  <h3>Buy neither yet if</h3>
  <p>You are not sure management games are for you. Play something free in a browser first — <a href="/gaffa/">Gaffa</a> takes about twenty minutes to find out.</p>
</div>`,
      },
      {
        id: 'saves',
        h2: 'Can you transfer saves between them?',
        html: `<p>No. They're separate games with separate save files. You can't start a save on mobile and continue it on PC.</p>`,
      },
    ],
    faq: [
      { q: 'What is the difference between Football Manager 26 and FM26 Mobile?', a: 'The full game is a deep PC and Mac management sim with a 3D match engine and every club department to run. FM26 Mobile is a phone game built on the same database with a simplified match engine and far fewer management options.' },
      { q: 'Can you transfer an FM26 save to FM26 Mobile?', a: 'No. They are separate games with separate save formats, and there is no cross-save between them.' },
      { q: 'Is FM26 Mobile worth it?', a: 'If you want to manage a club in short sessions on a phone, yes. If you want the full simulation with training, staff and media, you will find it thin.' },
      { q: 'How much does Football Manager 26 cost?', a: 'The full game is typically £40–£50 and the mobile version £10–£20, though regional pricing and sales change that regularly.' },
      { q: 'Does FM26 Mobile have the same database as the full game?', a: 'It is drawn from the same research but is smaller — fewer playable leagues and fewer players per club, to keep saves running on a phone.' },
    ],
    related: ['football-manager-26-touch-vs-full-game', 'is-football-manager-26-worth-buying', 'best-free-football-manager-games'],
  },

  {
    slug: 'football-manager-26-touch-vs-full-game',
    title: 'Football Manager 26 Touch vs Full Game — Which Should You Buy?',
    h1: 'FM26 Touch vs the Full Game',
    linkText: 'FM26 Touch vs full game',
    category: 'fm',
    published: '2026-08-11',
    description: 'FM26 Touch keeps the full match engine and database but strips the admin. How it compares to the full game on depth, platform and price — and who each suits.',
    keywords: 'fm26 touch, football manager 26 touch, fm touch vs full game, football manager touch switch, fm26 touch difference',
    standfirst: 'The middle child of the Football Manager family — not as deep as the full game, not as simple as mobile — and for some people, it\'s exactly right.',
    cardBlurb: 'Same match engine, none of the admin. Who Touch is actually for.',
    answer: '<span class="term">FM26 Touch</span> is a streamlined version of the full game, designed for tablets and Nintendo Switch. It sits between the full PC game and the mobile version — more depth than mobile, less complexity than full.',
    sections: [
      {
        id: 'touch',
        h2: 'What Touch gives you',
        html: `<p>Touch has the same match engine as the full game and the same database, but it strips out some of the more time-consuming elements. There are no team talks, no media interactions and no training schedules to write — you can focus on tactics, transfers, and matches.</p>
<p>It's the game for people who want the Football Manager experience without the admin.</p>`,
      },
      {
        id: 'full',
        h2: 'What the full game gives you',
        html: `<p>The full game has everything. Every detail, every interaction, every decision. You're managing training schedules, giving team talks, dealing with the media, handling player complaints, and more.</p>
<p>It's the game for people who want the complete experience — and the one where a save can run for a decade of in-game seasons.</p>`,
      },
      {
        id: 'differences',
        h2: 'The key differences',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col"></th><th scope="col">FM26 (Full)</th><th scope="col">FM26 Touch</th></tr></thead>
    <tbody>
      <tr><th scope="row">Platform</th><td>PC / Mac</td><td>Tablet / Nintendo Switch</td></tr>
      <tr><th scope="row">Match engine</th><td>3D, full detail</td><td>3D, same as full</td></tr>
      <tr><th scope="row">Database</th><td>Full</td><td>Full</td></tr>
      <tr><th scope="row">Management depth</th><td>Everything</td><td>Tactics, transfers, matches — simplified</td></tr>
      <tr><th scope="row">Time commitment</th><td>High</td><td>Medium</td></tr>
      <tr><th scope="row">Typical price</th><td>£40–£50</td><td>£20–£30</td></tr>
    </tbody>
  </table>
</div>
<p class="note">Prices are indicative and vary by storefront, region and sale.</p>`,
      },
      {
        id: 'which',
        h2: 'Which one should you buy?',
        html: `<ul>
  <li><strong>Buy the full version if</strong> you want the complete Football Manager experience and you play on PC or Mac</li>
  <li><strong>Buy Touch if</strong> you play on a tablet or Switch, you want the full match engine but less admin, or you want a quicker experience</li>
</ul>`,
      },
      {
        id: 'sweetspot',
        h2: 'The Touch sweet spot',
        html: `<p>Touch is ideal for players who love the tactical side of Football Manager but don't enjoy the admin. You can still build a team, pick a formation, and play matches — you just don't have to deal with the boring stuff.</p>
<p>It is also the version most likely to survive contact with real life. A Touch season fits into evenings; a full-game season expands to fill whatever time you have.</p>`,
      },
    ],
    faq: [
      { q: 'What is Football Manager 26 Touch?', a: 'A streamlined version of the full game for tablets and Nintendo Switch. It keeps the 3D match engine and the full database but removes team talks, media duties and training schedules.' },
      { q: 'Does FM26 Touch use the same match engine as the full game?', a: 'Yes. That is the main thing separating Touch from the mobile version, which uses a simplified engine.' },
      { q: 'Is FM26 Touch cheaper than the full game?', a: 'Usually, at roughly £20–£30 against £40–£50, though pricing varies by platform and region.' },
      { q: 'Can you play FM26 Touch on PC?', a: 'Touch has historically been sold for tablets and Switch. Availability changes year to year, so check the storefront for your platform before buying.' },
      { q: 'Should I buy Touch or the full game?', a: 'Buy Touch if you want tactics, transfers and matches without club admin, or if you play on Switch or a tablet. Buy the full game if you want to run every department of the club.' },
    ],
    related: ['football-manager-26-vs-football-manager-26-mobile', 'best-football-manager-games-switch', 'is-football-manager-26-worth-buying'],
  },

  {
    slug: 'best-football-manager-games-steam-deck',
    title: 'Best Football Manager Games for Steam Deck (2026)',
    h1: 'Best Football Manager Games for Steam Deck',
    linkText: 'Best FM games on Steam Deck',
    category: 'fm',
    published: '2026-08-11',
    description: 'The Steam Deck is a superb Football Manager machine. Which version to play, how the controls hold up, and the settings that save your battery.',
    keywords: 'football manager steam deck, fm26 steam deck, best football manager games steam deck, steam deck football manager settings',
    standfirst: 'The Steam Deck is the ultimate Football Manager machine — here\'s what to play on it and how to get the best experience.',
    cardBlurb: 'The full game in your hands — with the control and battery caveats.',
    topNav: PLATFORM_SWITCH('best-football-manager-games-steam-deck'),
    answer: '<span class="term">Football Manager 26</span> is the obvious choice for Steam Deck — it runs well, the controls work, and it\'s the full PC experience on a handheld. But there are other options too, depending on what you want.',
    sections: [
      {
        id: 'full',
        h2: 'Football Manager 26 (full)',
        html: `<p>The full FM26 runs on Steam Deck. It's the complete game, with all the depth and detail of the PC version. The controls take some getting used to — you're using the trackpads and buttons instead of a mouse — but once you adjust, it works well.</p>
<p>The interface was designed for a mouse and a large monitor, so expect to zoom in on some screens. Everything is reachable; some of it is fiddly.</p>`,
      },
      {
        id: 'touch',
        h2: 'Football Manager 26 Touch',
        html: `<p>Touch is a great option for Steam Deck. It's designed for touchscreens, which means the interface is more suited to the Deck's screen. It's also less demanding, so the battery lasts longer.</p>`,
      },
      {
        id: 'mobile',
        h2: 'Football Manager 26 Mobile',
        html: `<p>Mobile works on Steam Deck via an Android emulator, but it's not designed for the Deck. The interface is too simple and the experience feels limited compared to the full game. There is no good reason to choose it here.</p>`,
      },
      {
        id: 'others',
        h2: 'Other options',
        html: `<ul>
  <li><strong>Console versions</strong> — playable via emulation, but not officially supported and not worth the effort</li>
  <li><strong>Older versions</strong> — FM24 and FM25 run well on Steam Deck and are often much cheaper</li>
  <li><strong>Browser games</strong> — the Deck has a desktop mode and a browser, so <a href="/gaffa/">Gaffa</a> and other browser managers work with no install at all</li>
</ul>`,
      },
      {
        id: 'ranked',
        h2: 'Which one is best for Steam Deck?',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Game</th><th scope="col">Rating</th><th scope="col">Notes</th></tr></thead>
    <tbody>
      <tr><th scope="row">FM26 (Full)</th><td>★★★★★</td><td>The full experience, runs well, controls take getting used to</td></tr>
      <tr><th scope="row">FM26 Touch</th><td>★★★★☆</td><td>Designed for touch, simpler, better battery life</td></tr>
      <tr><th scope="row">FM26 Mobile</th><td>★★☆☆☆</td><td>Works, but feels limited on this hardware</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'tips',
        h2: 'Tips for playing FM on Steam Deck',
        html: `<ul>
  <li><strong>Use the trackpads</strong> — they work well as a mouse replacement, and the right one is the more precise of the two</li>
  <li><strong>Adjust the controls</strong> — customise the button mapping to suit how you navigate menus</li>
  <li><strong>Lower the graphics</strong> — the match engine runs fine, but dropping settings and capping the frame rate meaningfully extends battery life</li>
  <li><strong>Save often</strong> — handhelds sleep, crash and run out of charge, and an unsaved season is a long walk back</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'Does Football Manager 26 run on Steam Deck?', a: 'Yes. The full PC version runs on Steam Deck and plays well once you are used to navigating a mouse-designed interface with the trackpads.' },
      { q: 'Is FM26 Touch better than the full game on Steam Deck?', a: 'For interface and battery life, yes. For depth, no. Touch is the easier handheld experience; the full game is the complete one.' },
      { q: 'How do you improve Football Manager battery life on Steam Deck?', a: 'Lower the match-engine graphics settings, cap the frame rate, and reduce screen brightness. The 3D match is the main drain, so 2D commentary extends a session considerably.' },
      { q: 'Can you play Football Manager Mobile on Steam Deck?', a: 'Only through an Android emulator, and there is little point — the full game is right there and far deeper.' },
      { q: 'Do you need a keyboard for Football Manager on Steam Deck?', a: 'No, but searching for players is much faster with one. The on-screen keyboard works for occasional use.' },
    ],
    related: ['best-football-manager-games-mac', 'best-football-manager-games-switch', 'football-manager-26-touch-vs-full-game'],
  },

  {
    slug: 'best-football-manager-games-switch',
    title: 'Best Football Manager Games for Nintendo Switch (2026)',
    h1: 'Best Football Manager Games for Switch',
    linkText: 'Best FM games on Switch',
    category: 'fm',
    published: '2026-08-11',
    description: 'Football Manager 26 Touch is the pick on Nintendo Switch. What it includes, what it leaves out, and how to get the best out of it in handheld mode.',
    keywords: 'football manager switch, fm26 switch, football manager 26 touch switch, best football manager games nintendo switch',
    standfirst: 'The Switch is the perfect console for Football Manager on the go — here\'s what\'s available and what\'s worth your time.',
    cardBlurb: 'Touch is the pick — and realistically the only one worth buying.',
    topNav: PLATFORM_SWITCH('best-football-manager-games-switch'),
    answer: '<span class="term">Football Manager 26 Touch</span> is the Football Manager release to buy on Switch, and it is the best football management game on the platform by a distance.',
    sections: [
      {
        id: 'touch',
        h2: 'Football Manager 26 Touch',
        html: `<p>FM26 Touch is the Switch version of Football Manager. It has the same match engine as the full game and the same database, but it's streamlined — less admin, more focus on tactics and transfers.</p>
<p>It's the ideal game for playing on the go. The Switch's portability means you can play anywhere, and the Touch interface works well with the console's touchscreen.</p>`,
      },
      {
        id: 'has',
        h2: 'What it has — and what it doesn\'t',
        html: `<div class="tool">
  <h3>What you get</h3>
  <p>The 3D match engine, the full player database, and the parts of management most people actually enjoy: tactics, transfers and matchdays.</p>
</div>
<div class="tool">
  <h3>What you don't</h3>
  <p>Full-game depth — no detailed training schedules, no staff management to speak of, no media cycle. And no cross-save with the PC or mobile versions.</p>
</div>`,
      },
      {
        id: 'others',
        h2: 'Other options on Switch',
        html: `<p>There isn't much else. The Switch eShop has very few dedicated football management games, and none with a comparable database or match engine.</p>
<p>FM26 Mobile is not on the eShop — it is an Android and iOS release. If you want a second option, the Switch browser is limited, so the realistic alternative is playing something like <a href="/gaffa/">Gaffa</a> free in a browser on another device.</p>`,
      },
      {
        id: 'which',
        h2: 'Which one should you buy?',
        html: `<ul>
  <li><strong>Buy FM26 Touch</strong> if you want the Football Manager experience on Switch</li>
  <li><strong>Don't buy anything else</strong> — nothing on the platform competes with it</li>
</ul>`,
      },
      {
        id: 'tips',
        h2: 'Tips for playing FM on Switch',
        html: `<ul>
  <li><strong>Play in handheld mode</strong> — the Touch interface was built for a touchscreen and is much faster that way</li>
  <li><strong>Use the touchscreen</strong> — tapping through menus beats the stick-and-button navigation</li>
  <li><strong>Save often</strong> — and keep more than one save slot, so a corrupted file doesn't end a five-season career</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'Is Football Manager available on Nintendo Switch?', a: 'Yes — the Touch version, which keeps the 3D match engine and the full database but removes team talks, media work and training schedules.' },
      { q: 'Is the full Football Manager 26 on Switch?', a: 'No. The Switch release is Touch. The full game is a PC and Mac product.' },
      { q: 'Can you transfer a Switch save to PC?', a: 'No. There is no cross-save between the Switch version and the PC or mobile versions.' },
      { q: 'Is Football Manager good on Switch?', a: 'Very — it is the best football management game on the console, and handheld play suits the game\'s stop-start rhythm well.' },
      { q: 'Are there other football manager games on Switch?', a: 'Very few, and none with a comparable database or match engine. In practice Football Manager Touch is the only serious option.' },
    ],
    related: ['football-manager-26-touch-vs-full-game', 'best-football-manager-games-steam-deck', 'best-football-manager-games-mac'],
  },

  {
    slug: 'best-football-manager-games-mac',
    title: 'Best Football Manager Games for Mac (2026)',
    h1: 'Best Football Manager Games for Mac',
    linkText: 'Best FM games on Mac',
    category: 'fm',
    published: '2026-08-11',
    description: 'Mac users get the full Football Manager 26, which runs natively on Apple Silicon. The options ranked, plus browser games that need no install at all.',
    keywords: 'football manager mac, fm26 mac, best football manager games mac, football manager apple silicon, football manager macbook',
    standfirst: 'Mac users don\'t have to miss out — here are the best football management games for macOS.',
    cardBlurb: 'The full game runs natively on Apple Silicon — plus the no-install options.',
    topNav: PLATFORM_SWITCH('best-football-manager-games-mac'),
    answer: '<span class="term">Football Manager 26</span> is the best option for Mac — it\'s the full game, available on macOS, and it runs well on Apple Silicon. There are also lighter options like FM26 Touch and browser-based managers.',
    sections: [
      {
        id: 'full',
        h2: 'Football Manager 26 (full)',
        html: `<p>The full FM26 is available on Mac via Steam. It's the complete game — all the depth, all the detail, all the leagues — and it runs well on Apple Silicon machines as well as older Intel ones.</p>
<p>A large save with many playable leagues will still work an M-series MacBook hard, so expect fans and battery drain during long simulation runs.</p>`,
      },
      {
        id: 'touch',
        h2: 'Football Manager 26 Touch',
        html: `<p>Touch is the streamlined version — less admin, more focus on tactics and transfers. It is lighter on the machine, and a good fit if you want to play in shorter sessions.</p>`,
      },
      {
        id: 'others',
        h2: 'Other options',
        html: `<ul>
  <li><strong>Football Manager 26 Mobile</strong> — Apple Silicon Macs can run iOS apps, so the mobile version is playable, but it is the phone game, not the full one</li>
  <li><strong>Browser-based games</strong> — <a href="/gaffa/">Gaffa</a>, Top Eleven and others run in Safari with nothing to install and no storage used</li>
  <li><strong>Older versions</strong> — FM24 and FM25 run well on Mac and are usually much cheaper</li>
</ul>`,
      },
      {
        id: 'ranked',
        h2: 'Which one is best for Mac?',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Game</th><th scope="col">Rating</th><th scope="col">Notes</th></tr></thead>
    <tbody>
      <tr><th scope="row">FM26 (Full)</th><td>★★★★★</td><td>The full experience, runs well on Apple Silicon</td></tr>
      <tr><th scope="row">FM26 Touch</th><td>★★★★☆</td><td>Streamlined, less depth, lighter on the machine</td></tr>
      <tr><th scope="row">Browser games</th><td>★★★☆☆</td><td>Free, no install, but far shallower</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'tips',
        h2: 'Tips for playing FM on Mac',
        html: `<ul>
  <li><strong>Buy through Steam</strong> — it is the simplest way to install and update the game on macOS</li>
  <li><strong>Check the system requirements</strong> before buying, particularly on older Intel Macs</li>
  <li><strong>Load fewer leagues</strong> — the single biggest lever on save size, simulation speed and heat</li>
  <li><strong>Play in fullscreen</strong> — the interface is dense and benefits from every pixel</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'Does Football Manager 26 work on Mac?', a: 'Yes. The full game is available for macOS and runs on both Apple Silicon and Intel Macs, subject to the published system requirements.' },
      { q: 'Does Football Manager run well on Apple Silicon?', a: 'Yes — M-series Macs handle it comfortably. Large saves with many playable leagues are the main cause of slowdowns, not the chip.' },
      { q: 'Can you play Football Manager Mobile on a Mac?', a: 'On Apple Silicon Macs you can run the iOS version, but it is the simplified phone game rather than the full simulation.' },
      { q: 'What is the best free football manager game on Mac?', a: 'Browser games are the strongest free option because they need no install. Gaffa runs in Safari with no account and no download.' },
      { q: 'How do you speed up Football Manager on a MacBook?', a: 'Load fewer playable leagues, reduce the database size when starting a save, use 2D commentary instead of the 3D match, and keep the machine plugged in.' },
    ],
    related: ['best-football-manager-games-steam-deck', 'best-free-football-manager-games', 'is-football-manager-26-worth-buying'],
  },
];
