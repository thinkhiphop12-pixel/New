/* Articles 31–40 — the rest of the FM26 how-to set. */

export default [
  {
    slug: 'football-manager-26-team-instructions-explained',
    title: 'Football Manager 26 — Team and Player Instructions Explained',
    h1: 'FM26: Team and Player Instructions',
    linkText: 'FM26 instructions explained',
    category: 'fm',
    published: '2026-08-11',
    description: 'What every Football Manager 26 team instruction actually does, when to use it, and how player instructions fine-tune a tactic without breaking it.',
    keywords: 'fm26 team instructions, football manager 26 instructions, fm player instructions, fm26 tactics settings, football manager tempo',
    standfirst: 'Instructions are how you tell your players what to do — here\'s what each one means and when to use it.',
    cardBlurb: 'What each instruction really does — and why fewer is better.',
    answer: '<span class="term">Team instructions</span> define how your whole side plays. <span class="term">Player instructions</span> fine-tune how individuals behave within that system. The skill is using them together, and using as few as possible.',
    sections: [
      {
        id: 'categories',
        h2: 'The three categories',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Category</th><th scope="col">Examples</th></tr></thead>
    <tbody>
      <tr><th scope="row">In possession</th><td>Shorter passing, higher tempo, work ball into box, play out of defence</td></tr>
      <tr><th scope="row">In transition</th><td>Counter-press, counter-attack, distribute to full-backs, regroup</td></tr>
      <tr><th scope="row">Out of possession</th><td>Higher defensive line, press more often, prevent short goalkeeper distribution</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'key',
        h2: 'Key team instructions explained',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Instruction</th><th scope="col">What it does</th><th scope="col">When to use it</th></tr></thead>
    <tbody>
      <tr><th scope="row">Shorter passing</th><td>Players pass short and safe</td><td>Possession football, technical squads</td></tr>
      <tr><th scope="row">More direct passing</th><td>Players look forward earlier and longer</td><td>Counter-attacking, or with a target man</td></tr>
      <tr><th scope="row">Higher tempo</th><td>The ball moves quicker</td><td>To overwhelm a disorganised opponent</td></tr>
      <tr><th scope="row">Lower tempo</th><td>The ball moves slower and more deliberately</td><td>To control a game or protect a lead</td></tr>
      <tr><th scope="row">Work ball into box</th><td>Fewer long shots, more patient build-up</td><td>When you have creators and no long-range threat</td></tr>
      <tr><th scope="row">Counter-press</th><td>Press immediately after losing possession</td><td>High-intensity systems with the fitness for it</td></tr>
      <tr><th scope="row">Counter-attack</th><td>Attack quickly after winning the ball</td><td>When you have pace ahead of the ball</td></tr>
      <tr><th scope="row">Higher defensive line</th><td>Defenders push up to compress the pitch</td><td>With a sweeper-keeper and quick centre-backs</td></tr>
      <tr><th scope="row">Lower defensive line</th><td>Defenders sit deeper</td><td>Against pace, or to protect a lead</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'player',
        h2: 'Player instructions',
        html: `<p>Player instructions are specific to each role and position, and they exist to adjust what a role already does — not to rebuild it.</p>
<ul>
  <li><strong>Take more risks</strong> — the player attempts more ambitious passes</li>
  <li><strong>Shoot more often</strong> — useful for a genuine long-range threat, damaging for anyone else</li>
  <li><strong>Cross more often</strong> — for a wide player with a target to aim at</li>
  <li><strong>Hold position</strong> — stops a midfielder drifting out of the shape</li>
  <li><strong>Get further forward</strong> — pushes a midfielder into the box late</li>
</ul>`,
      },
      {
        id: 'combining',
        h2: 'Instructions that contradict each other',
        html: `<p>Most broken tactics are broken because two instructions are pulling in opposite directions.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Combination</th><th scope="col">Why it fails</th></tr></thead>
    <tbody>
      <tr><th scope="row">Shorter passing + higher tempo + direct</th><td>Asks players to be patient and rushed at once; turnovers rise</td></tr>
      <tr><th scope="row">Counter-attack + work ball into box</th><td>One says break at speed, the other says wait for support</td></tr>
      <tr><th scope="row">High line + drop deeper on the same side</th><td>Splits the defensive line and opens the space between it</td></tr>
      <tr><th scope="row">Everyone told to get forward</th><td>Nobody is left to cover the counter</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'using',
        h2: 'How to use instructions effectively',
        html: `<ul>
  <li><strong>Start simple</strong> — pick a mentality and a shape, and add instructions only where the default is wrong</li>
  <li><strong>Change one thing at a time</strong> — otherwise you cannot tell what worked</li>
  <li><strong>Match instructions to players</strong> — telling a poor crosser to cross more does not improve the crosses</li>
  <li><strong>Be consistent</strong> — instructions should reinforce each other, not fight</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'What is the difference between team and player instructions in FM?', a: 'Team instructions set how the whole side plays. Player instructions adjust one individual within that system, and only in ways their role does not already cover.' },
      { q: 'How many team instructions should you use?', a: 'As few as possible. Each one narrows what players will do; a well-chosen mentality and set of roles already covers most of what people add manually.' },
      { q: 'What does "work ball into box" do?', a: 'It discourages long shots and asks the team to build patiently until a higher-quality chance appears. It helps sides with creators and hurts sides with a genuine long-range threat.' },
      { q: 'What is the difference between counter-press and counter-attack?', a: 'Counter-press is what you do without the ball, immediately after losing it. Counter-attack is what you do with it, immediately after winning it back.' },
      { q: 'Why did my tactic get worse after adding instructions?', a: 'Usually because two of them contradict each other — asking for patient short passing and a high tempo at the same time, for example. Remove them all and re-add one at a time.' },
    ],
    related: ['football-manager-26-best-tactics', 'football-manager-26-player-roles-explained', 'what-is-a-high-press-in-football'],
  },

  {
    slug: 'football-manager-26-how-to-build-a-winning-squad',
    title: 'Football Manager 26 — How to Build a Winning Squad',
    h1: 'FM26: How to Build a Winning Squad',
    linkText: 'FM26 squad building',
    category: 'fm',
    published: '2026-08-11',
    description: 'Squad building in Football Manager 26 — how to audit what you have, recruit to a plan, keep the balance right and avoid the classic transfer mistakes.',
    keywords: 'fm26 squad building, football manager 26 squad, fm26 recruitment, football manager transfers guide, fm26 team building',
    standfirst: 'Tactics are important, but players win games — here\'s how to build a squad that can compete at the highest level.',
    cardBlurb: 'Audit, plan, recruit, integrate — squad building that survives three seasons.',
    answer: 'Building a winning squad in <span class="term">FM26</span> comes down to three things: knowing exactly what your squad lacks, recruiting to a plan instead of to opportunity, and keeping the balance of age, quality and personality right as you go.',
    sections: [
      {
        id: 'process',
        h2: 'The squad-building process',
        html: `<ol>
  <li><strong>Audit what you have</strong> — position by position, first choice and cover</li>
  <li><strong>Set a budget</strong> — transfer and, more importantly, wage headroom</li>
  <li><strong>Identify targets</strong> — two or three per position, at different price points</li>
  <li><strong>Sign players</strong> — negotiate, and walk away when the wage demand breaks your structure</li>
  <li><strong>Integrate them</strong> — new signings need minutes and time to settle</li>
  <li><strong>Develop the squad</strong> — training and game time improve what you already own</li>
</ol>`,
      },
      {
        id: 'principles',
        h2: 'The key principles',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Principle</th><th scope="col">Why it matters</th></tr></thead>
    <tbody>
      <tr><th scope="row">Balance</th><td>A squad needs a spread of ages so it does not decline all at once</td></tr>
      <tr><th scope="row">Depth</th><td>Injuries and suspensions are certain; cover for every position is not optional</td></tr>
      <tr><th scope="row">Quality over quantity</th><td>Fewer, better players beat a bloated squad of adequate ones</td></tr>
      <tr><th scope="row">Tactical fit</th><td>A great player in the wrong role is worse than a good one in the right role</td></tr>
      <tr><th scope="row">Personality</th><td>Determination and professionalism drive both development and dressing-room morale</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'recruitment',
        h2: 'Recruitment strategy',
        html: `<ul>
  <li><strong>Scout before you need to</strong> — a shortlist built in advance beats a panic search in August</li>
  <li><strong>Recruit to positions, not to bargains</strong> — a cheap winger you do not need is not a bargain</li>
  <li><strong>Buy young where you can</strong> — resale value is a real part of the return</li>
  <li><strong>Know your wage ceiling</strong> — and hold it, even for a player you want badly</li>
</ul>`,
      },
      {
        id: 'mistakes',
        h2: 'The classic mistakes',
        html: `<div class="tool">
  <h3>Squad bloat</h3>
  <p>Thirty-five senior players means twenty unhappy ones. Every signing should have a clear place in the pecking order.</p>
</div>
<div class="tool">
  <h3>Signing names, not needs</h3>
  <p>A brilliant player who duplicates your best position adds nothing and costs a wage slot you will need later.</p>
</div>
<div class="tool">
  <h3>Breaking the wage structure</h3>
  <p>One outsized contract triggers a wave of unhappiness and renegotiations across the squad.</p>
</div>
<div class="tool">
  <h3>Rebuilding all at once</h3>
  <p>Six new starters have no understanding of each other. Three windows of three signings beats one window of nine.</p>
</div>`,
      },
      {
        id: 'management',
        h2: 'Squad management',
        html: `<ul>
  <li><strong>Keep players happy</strong> — play them, talk to them, deal with complaints before they spread</li>
  <li><strong>Give youth a route in</strong> — a visible pathway keeps your best young players from asking to leave</li>
  <li><strong>Sell at the right time</strong> — peak value, not peak sentiment</li>
  <li><strong>Build a culture</strong> — hierarchy, leaders and the right personalities compound over seasons</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'How do you build a good squad in Football Manager 26?', a: 'Audit your squad position by position, recruit against the gaps you find rather than against opportunity, keep the age profile balanced and give new signings time to settle.' },
      { q: 'How big should an FM squad be?', a: 'Around eighteen to twenty-two senior players plus promising youngsters. Beyond that you cannot give everyone enough minutes and unhappiness spreads.' },
      { q: 'Should you rebuild a squad in one window?', a: 'No. Large simultaneous rebuilds tank cohesion and results. Three or four targeted signings per window is far more effective.' },
      { q: 'Does player personality matter in FM?', a: 'Yes, considerably. Determination and professionalism affect how quickly a player develops and how they influence younger squad members.' },
      { q: 'What is the most common squad-building mistake?', a: 'Breaking the wage structure for one signing. It triggers contract demands across the squad and constrains every window that follows.' },
    ],
    related: ['football-manager-26-how-to-make-money', 'football-manager-26-player-morale', 'football-manager-26-transfer-strategies-for-small-clubs'],
  },

  {
    slug: 'football-manager-26-get-the-best-from-your-star-player',
    title: 'Football Manager 26 — How to Get the Best Out of Your Star Player',
    h1: 'FM26: Getting the Best From Your Star Player',
    linkText: 'FM26 star players',
    category: 'fm',
    published: '2026-08-11',
    description: 'How to get a star player performing in Football Manager 26 — position, role, morale, workload — and why over-relying on one player is a trap.',
    keywords: 'fm26 star player, football manager best player performance, fm26 player morale, fm26 player form, football manager key player',
    standfirst: 'Your star player can win you games on their own — here\'s how to make sure they perform at their best.',
    cardBlurb: 'Position, role, morale, workload — and the trap of one-man teams.',
    answer: 'Getting the best from a star player in <span class="term">FM26</span> means playing them in their strongest position and role, building the side so the ball reaches them, keeping their morale high, and managing their workload so they are fresh when it matters.',
    sections: [
      {
        id: 'steps',
        h2: 'The five steps',
        html: `<ol>
  <li><strong>Play them in their best position</strong> — check position familiarity, not just the position they can technically fill</li>
  <li><strong>Give them the right role</strong> — match the role's key attributes to theirs</li>
  <li><strong>Build the team around them</strong> — the ball has to get to them in the areas they are dangerous</li>
  <li><strong>Keep them happy</strong> — morale is a direct performance input</li>
  <li><strong>Protect them</strong> — do not play them exhausted, and rest them in fixtures that do not matter</li>
</ol>`,
      },
      {
        id: 'happiness',
        h2: 'Player happiness',
        html: `<p>A happy player performs better. Keep your best player happy by playing them regularly, backing them publicly in press conferences, handling contract demands before they become grievances, and dealing with complaints quickly rather than hoping they fade.</p>
<p>The full picture on morale and unrest is in the <a href="/football-manager-26-player-morale.html">player morale guide</a>.</p>`,
      },
      {
        id: 'motivation',
        h2: 'Motivation',
        html: `<div class="tool">
  <h3>Give them responsibility</h3>
  <p>Captaincy, penalties, free-kicks and a place in the social hierarchy all raise a senior player's standing and their morale with it.</p>
</div>
<div class="tool">
  <h3>Praise and criticise deliberately</h3>
  <p>Both work, and both stop working if overused. Match the intervention to the player's personality — some respond to a challenge, others collapse under it.</p>
</div>
<div class="tool">
  <h3>Set targets they can hit</h3>
  <p>Achievable but demanding goals raise performance. Impossible ones just create a player who feels set up to fail.</p>
</div>`,
      },
      {
        id: 'workload',
        h2: 'Workload and fitness',
        html: `<p>The fastest way to lose a star player for two months is to play them at 70% condition in a cup tie in December. Rotate them out of the fixtures that do not matter, watch their match sharpness after injuries, and substitute them once a game is won.</p>
<p>Sharpness and condition are different things: a rested player who has not played is fresh but blunt, which is its own problem before a big match.</p>`,
      },
      {
        id: 'reliance',
        h2: 'The risk of over-reliance',
        html: `<p>Don't build a team that only functions when one player is on the pitch. If your star gets injured, suspended or loses form, the season should not end with them.</p>
<div class="callout">A useful test: look at your results in the matches your best player missed. If the drop-off is severe, the problem is the squad, not the player.</div>`,
      },
    ],
    faq: [
      { q: 'How do you improve a player\'s form in Football Manager?', a: 'Play them in their strongest position and role, keep their morale and condition high, and give them fixtures they can succeed in. Form usually recovers with a couple of comfortable matches.' },
      { q: 'Does morale actually affect performance in FM?', a: 'Yes. Morale is a direct input into match performance, and low morale spreads through a dressing room if the cause is not addressed.' },
      { q: 'Should you make your best player captain?', a: 'Only if they have the leadership and influence for it. Giving the armband to a poor leader with a bad personality can hurt the dressing room more than it helps the individual.' },
      { q: 'How do you stop your star player asking to leave?', a: 'Meet contract expectations before they expire, keep them starting, sign players that show ambition, and avoid promising things you cannot deliver in transfer talks.' },
      { q: 'Is it bad to rely on one player in FM?', a: 'Yes. Injuries and suspensions are certain over a season, and a squad that only functions with one player on the pitch will drop points every time they are missing.' },
    ],
    related: ['football-manager-26-player-morale', 'football-manager-26-how-to-build-a-winning-squad', 'football-manager-26-player-roles-explained'],
  },

  {
    slug: 'football-manager-26-first-season-guide',
    title: 'Football Manager 26 — How to Survive Your First Season',
    h1: 'FM26: Surviving Your First Season',
    linkText: 'FM26 first season guide',
    category: 'fm',
    published: '2026-08-11',
    description: 'A first-season survival guide for Football Manager 26 — what to do in the first month, what to leave alone, and how to keep your job when results go bad.',
    keywords: 'fm26 first season, football manager 26 beginners guide, fm26 tips for beginners, how to start football manager 26',
    standfirst: 'Your first season in FM26 can be brutal — here\'s how to avoid relegation, keep your job, and build for the future.',
    cardBlurb: 'The first month, the first window, and how not to get sacked.',
    answer: 'Surviving a first season in <span class="term">FM26</span> is about being realistic, staying organised and not doing too much. Learn the squad you inherited, pick a simple tactic, sign only what you need, and give it time.',
    sections: [
      {
        id: 'guide',
        h2: 'The survival guide',
        html: `<ol>
  <li><strong>Assess your squad</strong> — know your best eleven before you change anything</li>
  <li><strong>Pick a simple tactic</strong> — a familiar shape with sensible roles beats a complicated one</li>
  <li><strong>Set realistic targets</strong> — survival first; trophies are a later problem</li>
  <li><strong>Manage expectations</strong> — with the board, the press and the players</li>
  <li><strong>Be patient</strong> — most first seasons are won in the second half</li>
</ol>`,
      },
      {
        id: 'month',
        h2: 'The first month',
        html: `<p>The first month decides how the rest of the season feels. Use it to work out who your best players actually are, identify the one or two positions that are genuinely weak, set up your tactic and let the squad train it, and get the staff you need in place.</p>
<p>Delegate everything you do not want to micromanage. Your assistant can run training and pick opposition instructions perfectly well in season one.</p>`,
      },
      {
        id: 'window',
        h2: 'The first transfer window',
        html: `<p>Don't overhaul the squad. The players you inherited know the club and the league, and cohesion is worth more in the short term than raw ability. Sign for the positions that are genuinely short, add a free-transfer squad player or two for depth, and keep the wage bill intact.</p>
<p>If you are at a small club with no money, the <a href="/football-manager-26-transfer-strategies-for-small-clubs.html">small-club transfer strategies</a> are the ones to read first.</p>`,
      },
      {
        id: 'decisions',
        h2: 'Key decisions',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Area</th><th scope="col">Safe first-season choice</th></tr></thead>
    <tbody>
      <tr><th scope="row">Tactics</th><td>4-4-2 or 4-2-3-1, balanced mentality, few instructions</td></tr>
      <tr><th scope="row">Transfers</th><td>Two or three targeted signings, no wage-structure breaks</td></tr>
      <tr><th scope="row">Training</th><td>Delegate to your assistant; focus on fitness and cohesion</td></tr>
      <tr><th scope="row">Team talks</th><td>Calm and encouraging by default; save the strong stuff for when it counts</td></tr>
      <tr><th scope="row">Press</th><td>Back your players publicly, never criticise them in the media</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'wrong',
        h2: 'When things go wrong',
        html: `<p>You will lose games. You will have bad runs. Stay calm, don't panic, and stick to the plan — overreacting is what turns a bad month into a sacking.</p>
<p>If you genuinely need to change something, change one thing: a role, a defensive line, one player. Wholesale tactical changes mid-run reset tactical familiarity and make the next five matches worse before they get better.</p>`,
      },
    ],
    faq: [
      { q: 'How do you avoid getting sacked in Football Manager?', a: 'Meet the board\'s stated expectations rather than your own ambitions, avoid long losing runs by keeping tactics stable, and manage press and player relationships so the dressing room stays behind you.' },
      { q: 'Should you change tactics in your first season?', a: 'Only carefully. A settled, simple tactic your squad understands is usually worth more than a better tactic they have not trained. Change one element at a time.' },
      { q: 'What club should you start with in FM26?', a: 'For a first save, a mid-table club in a league you know, with a reasonable budget and modest expectations. Bottom-division rebuilds are more fun once you know the game.' },
      { q: 'How many players should you sign in your first window?', a: 'Two or three, for positions that are genuinely weak. Large first-window rebuilds damage cohesion and rarely improve results immediately.' },
      { q: 'Should you delegate training in FM26?', a: 'In your first season, yes. A good assistant manager handles training competently and frees you to focus on tactics, transfers and matchdays.' },
    ],
    related: ['football-manager-26-best-tactics', 'football-manager-26-board-expectations', 'football-manager-26-staff-roles-explained'],
  },

  {
    slug: 'football-manager-26-data-and-analytics',
    title: 'Football Manager 26 — How to Use Data and Analytics to Win',
    h1: 'FM26: Using Data and Analytics',
    linkText: 'FM26 data and analytics',
    category: 'fm',
    published: '2026-08-11',
    description: 'Football Manager 26 gives you more data than any manager could use. Which numbers actually change decisions, and how to read match and opposition reports.',
    keywords: 'fm26 data analytics, football manager 26 stats, fm26 xg, football manager data hub, fm26 opposition report',
    standfirst: 'Data is changing football — here\'s how to use FM26\'s analytics to gain an edge over the opposition.',
    cardBlurb: 'Which numbers change decisions, and which just look impressive.',
    answer: '<span class="term">FM26</span> has extensive analytics, but most of it is noise until you know what question you are asking. The numbers worth acting on are chance quality, where chances are created and conceded, and how individual players compare to their position\'s benchmarks.',
    sections: [
      {
        id: 'sources',
        h2: 'The key data sources',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Source</th><th scope="col">What it tells you</th></tr></thead>
    <tbody>
      <tr><th scope="row">Match stats</th><td>Who performed, and whether the result matched the performance</td></tr>
      <tr><th scope="row">Player reports</th><td>Individual strengths and weaknesses against positional benchmarks</td></tr>
      <tr><th scope="row">Opposition reports</th><td>How the next opponent plays and who makes them work</td></tr>
      <tr><th scope="row">Team comparison</th><td>Where you sit against the division on the metrics you care about</td></tr>
      <tr><th scope="row">Performance analysis</th><td>Whether your tactic is producing the football you designed</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'xg',
        h2: 'Start with expected goals',
        html: `<p>The single most useful number in the game is expected goals. It tells you whether you are creating good chances or merely a lot of shots, and whether the chances you concede are dangerous or harmless.</p>
<p>Compare your xG with your actual goals over ten matches, not one. Consistently outperforming it means finishing that will regress; consistently underperforming it usually means a striker problem or a chance-quality problem. The full explainer: <a href="/what-is-expected-goals-xg-in-football.html">what expected goals actually measures</a>.</p>`,
      },
      {
        id: 'match',
        h2: 'How to use match data',
        html: `<p>After each match, look past the scoreline. Who created, who wasted, where did the chances come from, and where were you opened up?</p>
<p>Use it to make substitutions, adjust the next match's plan, set training focus and, when a pattern repeats across several games, change the tactic. One match is an anecdote; five is evidence.</p>`,
      },
      {
        id: 'opposition',
        h2: 'How to use opposition reports',
        html: `<p>Before each match the report tells you the opponent's likely shape, key players, strengths and weaknesses, and recent form. The useful application is narrow and specific:</p>
<ul>
  <li>Pick the shape that outnumbers them where they are strongest</li>
  <li>Set opposition instructions on the one or two players who actually make them play</li>
  <li>Attack the flank their weakest defender occupies</li>
  <li>Adjust your defensive line for their pace, not their reputation</li>
</ul>`,
      },
      {
        id: 'traps',
        h2: 'Data traps to avoid',
        html: `<div class="tool">
  <h3>Small samples</h3>
  <p>Three matches of anything is noise. Wait for ten before concluding a player or a tactic is broken.</p>
</div>
<div class="tool">
  <h3>Average rating as a verdict</h3>
  <p>Ratings reward visible actions. A defender who positions well enough to never make a tackle is not underperforming.</p>
</div>
<div class="tool">
  <h3>Totals instead of rates</h3>
  <p>Compare per-90 numbers. Season totals mostly measure who played the most minutes.</p>
</div>`,
      },
    ],
    faq: [
      { q: 'How do you use xG in Football Manager?', a: 'Compare your expected goals with your actual goals over roughly ten matches. A large gap either way points at finishing or chance quality rather than luck.' },
      { q: 'What data matters most in FM26?', a: 'Chance quality for and against, where chances are created and conceded, and per-90 comparisons against positional benchmarks. Most other numbers describe rather than decide.' },
      { q: 'Are opposition instructions worth setting?', a: 'Yes, but narrowly. Targeting the one or two players who genuinely make an opponent play is far more effective than blanket instructions across the whole team.' },
      { q: 'Is average match rating a good measure of a player?', a: 'Only partly. Ratings favour visible actions like goals, assists and tackles, and undervalue positioning and decision-making that prevents problems from ever happening.' },
      { q: 'How many matches before you judge a tactic on data?', a: 'About ten. Anything shorter is dominated by variance, especially in a league where results swing on single chances.' },
    ],
    related: ['what-is-expected-goals-xg-in-football', 'football-manager-26-best-tactics', 'how-to-get-into-football-analytics'],
  },

  {
    slug: 'football-manager-26-staff-roles-explained',
    title: 'Football Manager 26 — Staff Roles Explained (Assistant, Coach, Scout)',
    h1: 'FM26: Staff Roles Explained',
    linkText: 'FM26 staff roles',
    category: 'fm',
    published: '2026-08-11',
    description: 'Who does what on a Football Manager 26 backroom staff — assistant manager, coaches, scouts, physios, analysts and head of youth development, and who to hire first.',
    keywords: 'fm26 staff, football manager 26 coaches, fm26 assistant manager, football manager scouts, fm26 backroom staff',
    standfirst: 'You can\'t do everything yourself — here\'s what your staff do and how to hire the right ones.',
    cardBlurb: 'Who to hire first, and what each member of staff actually changes.',
    answer: 'Your staff in <span class="term">FM26</span> handle the work you cannot do personally. The assistant manager, coaches and scouts have the largest effect on results and development — hire the best you can afford, in that order.',
    sections: [
      {
        id: 'roles',
        h2: 'The key staff roles',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Role</th><th scope="col">What they do</th></tr></thead>
    <tbody>
      <tr><th scope="row">Assistant manager</th><td>Match advice, team talks and training when delegated, player feedback</td></tr>
      <tr><th scope="row">Coaches</th><td>Train players and drive attribute development</td></tr>
      <tr><th scope="row">Scouts</th><td>Find players and produce recruitment reports</td></tr>
      <tr><th scope="row">Physios</th><td>Treat injuries and reduce how often they happen</td></tr>
      <tr><th scope="row">Data analysts</th><td>Supply match and opposition analysis</td></tr>
      <tr><th scope="row">Head of youth development</th><td>Shapes the quality and profile of your youth intake</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'assistant',
        h2: 'Assistant manager',
        html: `<p>Your assistant is the most important hire. They give advice during matches, handle team talks and training if you delegate them, and provide feedback on players you have not watched closely.</p>
<p>Hire for man management, tactical knowledge and judging player ability. A weak assistant giving confident bad advice is worse than no assistant at all.</p>`,
      },
      {
        id: 'coaches',
        h2: 'Coaches',
        html: `<p>Coaches train players, and the quality and number of them decide how quickly attributes improve. Specialists beat generalists.</p>
<ul>
  <li><strong>Goalkeeping coaches</strong> — shot-stopping and handling</li>
  <li><strong>Fitness coaches</strong> — physical attributes and injury resistance</li>
  <li><strong>Tactical coaches</strong> — mental attributes and tactical understanding</li>
  <li><strong>Technical coaches</strong> — ball skills and finishing</li>
</ul>
<p>Check the coaching workload screen: too few coaches for the squad size dilutes everything they do.</p>`,
      },
      {
        id: 'scouts',
        h2: 'Scouts',
        html: `<p>Scouts find players, and the two attributes that matter are judging player ability and judging player potential. A scout with weak judgement produces confident reports about the wrong players.</p>
<p>Assign them by region rather than by one-off searches — standing assignments in South America, Eastern Europe and Africa build the knowledge that surfaces cheap talent. The real-world version of the job is covered in <a href="/what-does-a-football-scout-do.html">what a football scout does</a>.</p>`,
      },
      {
        id: 'order',
        h2: 'Who to hire first',
        html: `<ol>
  <li><strong>Assistant manager</strong> — affects everything, every week</li>
  <li><strong>Coaches</strong> — until the workload screen is comfortable across all categories</li>
  <li><strong>Head of youth development</strong> — the earlier they arrive, the sooner intakes improve</li>
  <li><strong>Scouts</strong> — enough to cover the markets you actually buy from</li>
  <li><strong>Physios and analysts</strong> — worthwhile, but the smallest marginal gain of the five</li>
</ol>`,
      },
    ],
    faq: [
      { q: 'Which staff should you hire first in Football Manager 26?', a: 'The assistant manager, then coaches until your coaching workload is covered, then a head of youth development, then scouts for the markets you buy from.' },
      { q: 'What attributes matter for coaches in FM?', a: 'The coaching attributes in their specialism, plus determination and discipline. Match the coach to the category you want improved rather than hiring the highest overall reputation.' },
      { q: 'How many coaches do you need in FM26?', a: 'Enough that the coaching workload screen shows no category understaffed for your squad size — usually five to eight at a professional club.' },
      { q: 'Does the head of youth development matter?', a: 'A great deal. Their judgement and preferred playing style shape the quality and profile of every youth intake while they are at the club.' },
      { q: 'Should you delegate team talks to your assistant?', a: 'If their man management is strong, it is a reasonable delegation and costs you very little. If it is weak, do team talks yourself.' },
    ],
    related: ['football-manager-26-how-to-develop-youth-players', 'what-does-a-football-scout-do', 'football-manager-26-first-season-guide'],
  },

  {
    slug: 'football-manager-26-board-expectations',
    title: 'Football Manager 26 — Board Expectations and Club Vision Explained',
    h1: 'FM26: Board Expectations and Club Vision',
    linkText: 'FM26 board expectations',
    category: 'fm',
    published: '2026-08-11',
    description: 'How board expectations and club vision work in Football Manager 26 — what the board actually judges you on, and how to keep your job while rebuilding.',
    keywords: 'fm26 board expectations, football manager club vision, fm26 board confidence, football manager 26 job security',
    standfirst: 'The board sets the targets — here\'s how to manage their expectations and keep your job.',
    cardBlurb: 'What the board actually judges, and how to keep them onside.',
    answer: 'The board in <span class="term">FM26</span> judges you against explicit season expectations and a longer-term club vision. Meeting the first keeps your job; aligning with the second gets you backing, budget and patience.',
    sections: [
      {
        id: 'expectations',
        h2: 'Board expectations',
        html: `<p>The board sets expectations at the start of each season. They usually cover league position, cup performance, European qualification where relevant, financial targets, and sometimes youth development.</p>
<p>These are the targets you are actually assessed against — not your own ambitions, and not the fans' hopes. A manager who finishes eighth when asked for mid-table is safe; one who finishes fourth when the board expected the title is not.</p>`,
      },
      {
        id: 'managing',
        h2: 'Managing expectations',
        html: `<ul>
  <li><strong>Be realistic in transfer and contract talks</strong> — do not promise European qualification to sign a player</li>
  <li><strong>Communicate early</strong> — request a lowered expectation before the season, not after a bad run</li>
  <li><strong>Deliver the stated target</strong> — exceeding it is nice; missing it is what gets you sacked</li>
</ul>`,
      },
      {
        id: 'vision',
        h2: 'Club vision',
        html: `<p>The club vision is the long-term plan, and it is usually more specific than people expect. It might cover playing style, youth development, financial management, and the kind of players the club wants to sign.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Vision area</th><th scope="col">What it asks of you</th></tr></thead>
    <tbody>
      <tr><th scope="row">Playing style</th><td>Play the football the club wants to be known for</td></tr>
      <tr><th scope="row">Youth development</th><td>Sign young players and give academy graduates minutes</td></tr>
      <tr><th scope="row">Financial</th><td>Turn a profit, reduce debt, or stay inside a wage ceiling</td></tr>
      <tr><th scope="row">Squad building</th><td>Sign domestically, or sign for the future rather than now</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'aligning',
        h2: 'Aligning with the vision',
        html: `<p>Your decisions should visibly serve the vision. If it is youth development, promote academy players and give them competitive minutes. If it is possession football, sign technical players and set up to keep the ball.</p>
<p>Alignment is not cosmetic: it feeds directly into board confidence, which decides your budget, your facility upgrades and how long you get when results dip.</p>`,
      },
      {
        id: 'wrong',
        h2: 'When things go wrong',
        html: `<p>If you miss expectations you will be under pressure, and the sequence is predictable: a warning, a period of grace, then a sacking. What buys time is everything other than results — board confidence built by meeting vision objectives, a healthy financial position, and supporters who are on side.</p>
<div class="callout">A rebuild survives on <strong>credit earned before it starts</strong>. Hit the board's objectives in season one so you have room to be bad in season two.</div>`,
      },
    ],
    faq: [
      { q: 'What do the board judge you on in Football Manager?', a: 'The explicit season expectations they set — league position, cup runs, financial targets — plus how well your decisions serve the longer-term club vision.' },
      { q: 'How do you avoid being sacked in FM26?', a: 'Meet the stated expectations rather than your own ambitions, keep board confidence high by serving the club vision, and avoid long losing runs by keeping your tactics stable.' },
      { q: 'What is the club vision in Football Manager?', a: 'A set of long-term objectives covering playing style, youth development, finances and recruitment policy. Meeting them raises board confidence even when results are mixed.' },
      { q: 'Can you negotiate board expectations?', a: 'You can request changes to objectives, and boards will sometimes agree — particularly before a season starts or after significant squad changes.' },
      { q: 'Does board confidence affect your transfer budget?', a: 'Yes. Confidence influences budget, facility upgrade approvals and how much patience you are given when results are poor.' },
    ],
    related: ['football-manager-26-first-season-guide', 'football-manager-26-how-to-make-money', 'football-manager-26-build-a-dynasty'],
  },

  {
    slug: 'football-manager-26-player-morale',
    title: 'Football Manager 26 — How to Handle Player Complaints and Morale',
    h1: 'FM26: Player Complaints and Morale',
    linkText: 'FM26 player morale',
    category: 'fm',
    published: '2026-08-11',
    description: 'How to manage morale and dressing-room unrest in Football Manager 26 — the common complaints, how to answer each one, and how team talks actually work.',
    keywords: 'fm26 morale, football manager player complaints, fm26 dressing room, football manager team talks, fm26 unhappy players',
    standfirst: 'Player morale is everything — here\'s how to keep your squad happy and avoid dressing room unrest.',
    cardBlurb: 'Complaints, team talks, and stopping unrest before it spreads.',
    answer: 'Handling complaints in <span class="term">FM26</span> is about answering them early and honestly. Morale feeds directly into performance, and one unresolved grievance spreads through a dressing room faster than any result.',
    sections: [
      {
        id: 'complaints',
        h2: 'Common complaints and how to answer them',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Complaint</th><th scope="col">How to handle it</th></tr></thead>
    <tbody>
      <tr><th scope="row">Not playing enough</th><td>Give them minutes, agree a realistic playing-time promise, or loan them out</td></tr>
      <tr><th scope="row">Wants a new contract</th><td>Negotiate if they have earned it; say no clearly if they have not</td></tr>
      <tr><th scope="row">Wants to join a bigger club</th><td>Sell at the right price rather than keeping an unhappy player on principle</td></tr>
      <tr><th scope="row">Unhappy with training</th><td>Check the workload, and talk to them rather than ignoring it</td></tr>
      <tr><th scope="row">Fallen out with a teammate</th><td>Mediate, separate them in mentoring groups, or sell one of them</td></tr>
      <tr><th scope="row">Transfer request refused</th><td>Explain the decision honestly; expect a morale hit and manage it</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'morale',
        h2: 'Morale management',
        html: `<p>Morale affects performance directly. High morale produces better matches; low morale produces exactly the results that lower morale further, which is what makes bad runs so hard to break.</p>
<ul>
  <li><strong>Win games</strong> — nothing else works nearly as well</li>
  <li><strong>Praise accurately</strong> — for genuinely good performances, not routinely</li>
  <li><strong>Criticise sparingly</strong> — and privately, matched to the player's personality</li>
  <li><strong>Handle complaints quickly</strong> — before other players get involved</li>
  <li><strong>Use your leaders</strong> — influential players can settle a dressing room you cannot reach directly</li>
</ul>`,
      },
      {
        id: 'talks',
        h2: 'Team talks',
        html: `<p>Team talks before, during and after matches move morale in both directions. The tone matters more than the words, and the right tone depends on the match situation and the personalities in front of you.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Moment</th><th scope="col">Usual safe approach</th></tr></thead>
    <tbody>
      <tr><th scope="row">Before the match</th><td>Calm and encouraging; assertive only when clearly favoured</td></tr>
      <tr><th scope="row">Half time, winning</th><td>Praise, then a warning against complacency</td></tr>
      <tr><th scope="row">Half time, losing</th><td>Encourage rather than berate unless the performance is genuinely poor</td></tr>
      <tr><th scope="row">After the match</th><td>Honest — praise a good performance in defeat, criticise a poor one in victory</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'unhappy',
        h2: 'The unhappy player',
        html: `<p>Deal with an unhappy player immediately. Speak to them, understand the specific grievance, and either fix it or explain clearly why you will not.</p>
<p>What you must not do is nothing. Unresolved unhappiness recruits teammates, and a dressing-room-wide grievance costs far more than the one concession that would have prevented it.</p>`,
      },
      {
        id: 'prevention',
        h2: 'Preventing unrest in the first place',
        html: `<ul>
  <li><strong>Keep the squad small enough</strong> — fewer players means fewer people with nothing to do</li>
  <li><strong>Set squad status honestly</strong> — do not promise a starting role to someone who will not get one</li>
  <li><strong>Protect the wage structure</strong> — one outsized contract triggers a wave of demands</li>
  <li><strong>Sign good personalities</strong> — professionalism and determination spread as surely as their opposites</li>
</ul>`,
      },
    ],
    faq: [
      { q: 'How do you raise morale in Football Manager 26?', a: 'Win matches, praise genuinely good performances, handle complaints quickly, and use influential senior players to settle the dressing room. Results matter more than any interaction.' },
      { q: 'What do you do with an unhappy player in FM?', a: 'Speak to them, identify the specific grievance, and either resolve it or explain honestly why you cannot. Ignoring it lets the unhappiness spread to teammates.' },
      { q: 'Do team talks actually matter in FM26?', a: 'Yes. They move morale before, during and after matches, and the right tone depends on the scoreline, the opponent and the personalities in the squad.' },
      { q: 'How do you stop players demanding new contracts?', a: 'Keep a coherent wage structure, renew good players before their demands escalate, and avoid one-off outsized deals that reset everyone else\'s expectations.' },
      { q: 'Does squad size affect morale?', a: 'Yes. Large squads produce players with no realistic route to minutes, and those players are the most common source of dressing-room unrest.' },
    ],
    related: ['football-manager-26-get-the-best-from-your-star-player', 'football-manager-26-how-to-build-a-winning-squad', 'football-manager-26-first-season-guide'],
  },

  {
    slug: 'football-manager-26-transfer-strategies-for-small-clubs',
    title: 'Football Manager 26 — Transfer Strategies for Small Clubs',
    h1: 'FM26: Transfer Strategies for Small Clubs',
    linkText: 'FM26 small-club transfers',
    category: 'fm',
    published: '2026-08-11',
    description: 'How to compete in Football Manager 26 without money — free transfers, loans, undervalued markets and the player-trading cycle that funds everything else.',
    keywords: 'fm26 small club, football manager low budget, fm26 free transfers, fm26 bargains, football manager lower league tactics',
    standfirst: 'Small clubs have small budgets — here\'s how to compete without spending big.',
    cardBlurb: 'No money, no problem: free transfers, loans and undervalued markets.',
    answer: 'Small clubs in <span class="term">FM26</span> cannot win on money, so they have to win on information and patience: scout markets bigger clubs ignore, use free transfers and loans, and fund everything through developing and selling players.',
    sections: [
      {
        id: 'strategy',
        h2: 'The small-club strategy',
        html: `<ol>
  <li><strong>Scout widely</strong> — your edge is finding players other clubs have not looked at</li>
  <li><strong>Buy cheap, sell expensive</strong> — trading is your only reliable income growth</li>
  <li><strong>Use the loan market</strong> — quality without a transfer fee</li>
  <li><strong>Develop youth</strong> — the cheapest squad players you will ever have</li>
  <li><strong>Be patient</strong> — three seasons of this compounds; one season of it does not</li>
</ol>`,
      },
      {
        id: 'bargains',
        h2: 'Where to find bargains',
        html: `<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Source</th><th scope="col">Why it works</th></tr></thead>
    <tbody>
      <tr><th scope="row">Free transfers</th><td>No fee, so the whole budget goes into wages you control</td></tr>
      <tr><th scope="row">Expiring contracts</th><td>Pre-contract agreements six months out, at no cost</td></tr>
      <tr><th scope="row">Released players</th><td>Bigger clubs discard useful squad players every summer</td></tr>
      <tr><th scope="row">Lower divisions</th><td>Consistently undervalued relative to the step up they can make</td></tr>
      <tr><th scope="row">Less-watched leagues</th><td>Scandinavian, Eastern European and South American markets price low</td></tr>
    </tbody>
  </table>
</div>`,
      },
      {
        id: 'loans',
        h2: 'The loan market',
        html: `<p>Loans are the small club's best tool. You get a player who is better than anything you could buy, usually with the parent club paying part of the wage, and you carry no long-term risk.</p>
<p>The trade-offs are real: loan players leave, they do not build squad continuity, and a squad built on them collapses every summer. Use them for the two or three positions you cannot otherwise fill, not for half the team.</p>`,
      },
      {
        id: 'trading',
        h2: 'Player trading',
        html: `<p>Buy young players with potential, develop them, sell them at peak value, and reinvest a portion. Done consistently, this is the only mechanism that moves a small club up a level without an owner takeover.</p>
<p>The discipline is in selling. Every squad has a player you do not want to lose whose sale would fund three better ones — and the club that sells him is the club that grows. See also <a href="/football-manager-26-how-to-make-money.html">how to make money as a club</a>.</p>`,
      },
      {
        id: 'wages',
        h2: 'The wage trap',
        html: `<p>A free transfer is not free. The fee is zero and the wage is forever, and small-club budgets are wage-constrained rather than fee-constrained.</p>
<div class="callout">Before signing any free agent, ask what the wage represents as a share of your total bill. A player on 15% of your wage budget has to be one of your best three, or he is a problem you signed on purpose.</div>`,
      },
    ],
    faq: [
      { q: 'How do you sign good players with no budget in FM?', a: 'Free transfers, pre-contract agreements, loans, and buying from lower divisions and less-watched leagues. Your advantage is scouting information, not money.' },
      { q: 'Are loans worth it for small clubs in Football Manager?', a: 'For two or three positions, yes — you get quality without a fee and often with subsidised wages. Building most of a squad on loans leaves you rebuilding every summer.' },
      { q: 'When should a small club sell its best player?', a: 'When the fee funds several improvements and the player is at peak value with a couple of years left on the contract. Keeping him one season too long usually costs more than it gains.' },
      { q: 'What is a pre-contract agreement?', a: 'An agreement to sign a player whose contract expires within six months, at no transfer fee. It is the single most valuable tool available to a club with no money.' },
      { q: 'Why do free transfers still hurt a small club?', a: 'Because the constraint is the wage bill, not the fee. A free agent on high wages consumes budget every week for the length of the contract.' },
    ],
    related: ['football-manager-26-how-to-make-money', 'football-manager-26-best-wonderkids-on-a-budget', 'how-does-the-loan-system-work-in-football'],
  },

  {
    slug: 'football-manager-26-build-a-dynasty',
    title: 'Football Manager 26 — How to Build a Dynasty Over 10 Seasons',
    h1: 'FM26: Building a Dynasty',
    linkText: 'FM26 dynasty guide',
    category: 'fm',
    published: '2026-08-11',
    description: 'A ten-season plan for Football Manager 26 — establishing an identity, building a recruitment pipeline, and turning one good season into a decade of them.',
    keywords: 'fm26 dynasty, football manager long term save, fm26 10 season plan, football manager club rebuild, fm26 youth academy dynasty',
    standfirst: 'One season is just the beginning — here\'s how to build a club that dominates for a decade.',
    cardBlurb: 'A ten-season plan: identity, pipeline, infrastructure, patience.',
    answer: 'Building a dynasty in <span class="term">FM26</span> takes long-term planning, sustainable finances and a clear identity. The clubs that dominate for a decade are the ones that build a system rather than a squad.',
    sections: [
      {
        id: 'blueprint',
        h2: 'The dynasty blueprint',
        html: `<ol>
  <li><strong>Establish a playing style</strong> — pick one and recruit to it for years, not months</li>
  <li><strong>Build a recruitment system</strong> — the same scouting markets, the same player profile, every window</li>
  <li><strong>Develop youth</strong> — a production line, not occasional lucky intakes</li>
  <li><strong>Manage finances</strong> — never let the wage bill outrun income</li>
  <li><strong>Invest in infrastructure</strong> — facilities compound over a decade in a way signings never do</li>
  <li><strong>Create a winning culture</strong> — leaders, professionalism, and a hierarchy that survives transfers</li>
</ol>`,
      },
      {
        id: 'phase1',
        h2: 'Years 1–3: establish',
        html: `<ul>
  <li>Learn the squad and cut what does not fit</li>
  <li>Settle on a tactical identity and train it properly</li>
  <li>Sign three or four players who match it exactly</li>
  <li>Get facilities and staff upgrades approved while expectations are low</li>
  <li>Survive, stabilise, and build board confidence</li>
</ul>`,
      },
      {
        id: 'phase2',
        h2: 'Years 4–6: compete',
        html: `<ul>
  <li>Challenge for trophies with a squad that now fits the system</li>
  <li>Promote the first academy graduates into real roles</li>
  <li>Fund improvements through selling, not through the board</li>
  <li>Push facilities to the level where intakes improve noticeably</li>
  <li>Qualify for Europe and let the reputation increase do the recruiting</li>
</ul>`,
      },
      {
        id: 'phase3',
        h2: 'Years 7–10: dominate',
        html: `<ul>
  <li>Win consistently rather than occasionally</li>
  <li>Replace ageing stars from inside the club before they decline</li>
  <li>Run a self-funding transfer model where sales cover signings</li>
  <li>Hold the identity even when a big-money signing would break it</li>
</ul>
<p>Long saves fail in this phase more often than the first: a dominant squad ages simultaneously, and the manager who does not sell before the decline spends years rebuilding.</p>`,
      },
      {
        id: 'longevity',
        h2: 'The key to longevity',
        html: `<p>Patience, and a squad that renews itself continuously rather than in emergencies. Sell a year early rather than a year late, keep one or two academy players coming through every season, and resist the signings that would win this year at the cost of the next three.</p>
<div class="callout">A dynasty is a <strong>replacement pipeline</strong>, not a great eleven. The eleven ages; the pipeline is what keeps producing the next one.</div>`,
      },
    ],
    faq: [
      { q: 'How do you build a long-term save in Football Manager?', a: 'Pick a playing identity and recruit to it consistently, invest in facilities and youth early, keep the wage bill sustainable, and replace ageing players before they decline rather than after.' },
      { q: 'How long does it take to build a dynasty in FM?', a: 'Realistically six to ten seasons. The first three are about stability and infrastructure; sustained dominance comes once the youth and recruitment pipelines are producing.' },
      { q: 'Why do long Football Manager saves fall apart?', a: 'Usually because a squad ages together. A team built in one or two windows declines in one or two windows unless it is renewed continuously.' },
      { q: 'Are facilities worth investing in?', a: 'Over a long save, yes — training and youth facilities affect every player you develop for as long as you stay, which no single signing can match.' },
      { q: 'Should you stay at one club for a dynasty save?', a: 'That is the point of the format. Staying is what lets facility investment, youth intakes and club culture compound in your favour.' },
    ],
    related: ['football-manager-26-how-to-develop-youth-players', 'football-manager-26-board-expectations', 'football-manager-26-how-to-make-money'],
  },
  {
    slug: 'football-manager-26-how-to',
    title: 'FM26 How-To: Load Tactics, Go on Holiday, Editor & More',
    h1: 'FM26 How-To Guide',
    linkText: 'FM26 how-to guide',
    category: 'fm',
    published: '2026-08-12',
    description: 'How to load tactics in FM26, go on holiday, use the in-game editor, update the game, clear the cache, and whether your PC can run it.',
    keywords: 'how to load tactics fm26, how to import tactics fm26, how to go on holiday fm26, fm26 in game editor, how to update fm26, can my pc run fm26, how to clear cache fm26',
    standfirst: 'The things people actually get stuck on in Football Manager 26 — loading tactics, going on holiday, the editor, updates, and whether your machine can handle it.',
    cardBlurb: 'Tactics files, holiday, the editors, updates and system requirements.',
    answer: 'Most <span class="term">FM26</span> friction comes down to four things: tactic files go in <strong>Documents/Sports Interactive/Football Manager 26/tactics</strong>, holiday sits on your <strong>manager profile</strong> rather than the continue button, the <strong>in-game editor is a paid add-on</strong>, and updates apply <strong>automatically</strong> through Steam, Epic or Game Pass.',
    sections: [
      {
        id: 'tactics',
        h2: 'Loading and importing tactics',
        tocLabel: 'Loading and importing tactics',
        html: `<p>Downloaded tactics are <code>.fmf</code> files, and FM only sees them if they are in the right folder. The steps:</p>
<ol>
  <li>Find <strong>Documents/Sports Interactive/Football Manager 26/tactics</strong>. If there is no <code>tactics</code> folder inside the Football Manager 26 folder, create one with exactly that name.</li>
  <li>If your download is a <code>.rar</code> or <code>.zip</code>, extract it first. The <code>.fmf</code> file itself has to sit in the folder — an archive will not be read.</li>
  <li>If the game was already running, quit and restart it. FM reads that folder at launch.</li>
  <li>In your save, open the <strong>Tactics</strong> screen, press the <strong>+</strong> icon, and choose <strong>Load Tactic</strong>.</li>
</ol>
<p>If it still does not appear, the usual cause is a nested folder — a <code>tactics/my-tactic/tactic.fmf</code> path instead of <code>tactics/tactic.fmf</code>. The file has to be directly inside <code>tactics</code>.</p>
<p>Worth saying: a downloaded tactic is built around someone else's squad, and stops working the moment your players do not fit it. Building your own takes an afternoon and survives contact with your actual team.</p>`,
      },
      {
        id: 'holiday',
        h2: 'Going on holiday',
        html: `<p>Holiday is not on the continue button, which is why people hunt for it. It lives on <strong>your own manager profile</strong> — open your profile and look for the holiday action there.</p>
<p>You then set two things:</p>
<ul>
  <li><strong>How long</strong> — a few days, until a fixture, or a whole season</li>
  <li><strong>What your assistant handles</strong> — team selection, transfers, contracts, press</li>
</ul>
<p>The game simulates that period and applies your delegation settings to anything that comes up. It is the fastest way to skip pre-season or run out a season you have already lost, but note that anything you have delegated genuinely gets decided without you — including transfers, if you leave that on.</p>
<p class="note">FM26 rebuilt its interface on a new engine, and the exact placement of this option has shifted between patches. If it is not where you expect, check your manager profile screen first, then the calendar.</p>`,
      },
      {
        id: 'editor',
        h2: 'The in-game and pre-game editors',
        html: `<p>These are two different tools and only one of them costs money.</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Editor</th><th scope="col">Cost</th><th scope="col">What it does</th></tr></thead>
    <tbody>
      <tr><th scope="row">Pre-game editor</th><td>Free download</td><td>Edits the database before you start a save — clubs, players, competition rules</td></tr>
      <tr><th scope="row">In-game editor</th><td>Paid add-on</td><td>Changes things live inside a running save — attributes, morale, finances, moving players between clubs</td></tr>
    </tbody>
  </table>
</div>
<p>The in-game editor is bought separately on Steam or the Epic Games Store. It is <strong>not</strong> included with the base game, and not included with Game Pass — which catches out a lot of people playing through the subscription.</p>`,
      },
      {
        id: 'updates',
        h2: 'Updating the game and clearing the cache',
        html: `<p>There is nothing to do manually for updates. Steam, Epic, Game Pass and the console stores all patch FM26 automatically. If you think you are stuck on an old build, quit fully so the launcher can finish, then check the version number on the main menu.</p>
<p>FM26 has been patched heavily since launch — one update alone carried over 300 fixes, and later ones reworked international management. If you stopped playing early on, you are almost certainly several versions behind.</p>
<p>As for the cache: FM26 does not have the <strong>Clear Cache</strong> button that older versions kept in Preferences. If new graphics, faces or a skin are not showing up, fully quit and restart the game — that is effectively what the old button forced. Reloading the skin from Preferences is worth trying first for skin-only problems.</p>`,
      },
      {
        id: 'specs',
        h2: 'Can your PC or laptop run FM26?',
        html: `<p>FM26 is heavier than the versions before it. The headline numbers:</p>
<div class="tbl-wrap">
  <table class="data nowrap-first">
    <thead><tr><th scope="col">Requirement</th><th scope="col">Detail</th></tr></thead>
    <tbody>
      <tr><th scope="row">Operating system</th><td>64-bit Windows 10 (22H2) or Windows 11 (23H2)</td></tr>
      <tr><th scope="row">Processor</th><td>64-bit required — 32-bit systems cannot run it at all</td></tr>
      <tr><th scope="row">Storage</th><td>Around 20 GB, roughly three times what FM24 needed</td></tr>
      <tr><th scope="row">RAM</th><td>Runs on less, but 16 GB is the practical target for large databases</td></tr>
    </tbody>
  </table>
</div>
<p>The honest version: FM is limited by <strong>processor and memory, not graphics</strong>. A modest laptop will run it perfectly well with two or three playable leagues. What kills performance is loading a dozen nations with a large database — that is a RAM and CPU problem, and no graphics card fixes it.</p>
<p>If your machine is borderline, load fewer leagues before you consider new hardware. Requirements are occasionally revised, so check the current official figures before buying.</p>`,
      },
    ],
    faq: [
      { q: 'How do you load tactics in FM26?', a: 'Put the .fmf file in Documents/Sports Interactive/Football Manager 26/tactics, creating the folder if needed, extract any archive first, restart the game, then Tactics screen → + → Load Tactic.' },
      { q: 'How do you go on holiday in FM26?', a: 'It is on your manager profile, not the continue button. Set the duration and what your assistant handles while you are away.' },
      { q: 'Is the FM26 in-game editor free?', a: 'No — it is a paid add-on on Steam or Epic, and it is not included with Game Pass. The pre-game editor is a separate free download.' },
      { q: 'How do you update FM26?', a: 'You do not. Steam, Epic, Game Pass and the console stores patch it automatically. Quit fully and let the launcher finish if it seems stuck.' },
      { q: 'How do you clear the cache in FM26?', a: 'There is no Clear Cache button any more. Fully quit and restart the game, which does the same job.' },
      { q: 'Can my PC run FM26?', a: 'You need 64-bit Windows 10 22H2 or Windows 11 23H2 and about 20 GB of storage. Performance depends on CPU and RAM rather than graphics — load fewer leagues before you consider upgrading.' },
    ],
    related: ['football-manager-26-best-tactics', 'football-manager-26-first-season-guide', 'football-manager-26-player-roles-explained'],
  },
];
