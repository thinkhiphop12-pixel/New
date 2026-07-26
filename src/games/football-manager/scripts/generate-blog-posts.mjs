/**
 * Generates blog posts about the Scout daily puzzles
 * Creates a post for each day going back 30 days
 * Output: public/blog/[date].html
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BLOG_OUT = join(__dirname, '..', 'public', 'blog');
const GAMEDATA = join(__dirname, '..', 'public', 'data', 'gamedata.json');

const gamedata = JSON.parse(readFileSync(GAMEDATA, 'utf8'));

// Sample football facts and puzzle commentary
const PUZZLE_THEMES = [
  'Players from the same club',
  'Players with the same nationality',
  'Players in the same position',
  'Top scorers this season',
  'Young talents to watch',
  'Veteran players',
  'Players with high pace ratings',
  'Defensive stalwarts',
  'Creative midfielders',
  'Goal-scoring forwards',
  'Overrated vs underrated',
  'Best defenders in the league',
  'Most valuable squads',
  'International stars',
  'Championship winners',
  'Rising stars',
  'Perfect partnerships',
  'Fan favorites',
  'Transfer targets',
  'Hidden gems in lower divisions',
];

const FOOTBALL_FACTS = [
  'Did you know? The average professional footballer runs about 10 km per match.',
  'Fun fact: Goal-line technology has been used in elite football for over a decade.',
  'Stat: The Premier League has over 440 million fans worldwide.',
  'Trivia: Football was first codified in England in 1863.',
  'Did you know? A football pitch can vary in size, but must be between 100-130 yards long.',
  'Fun fact: The record for the fastest goal in professional football is 2.17 seconds.',
  'Stat: There are over 200 national football associations worldwide.',
  'Trivia: The first World Cup was held in Uruguay in 1930.',
  'Did you know? Youth development programs are crucial for finding future stars.',
];

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function generateBlogPost(date) {
  const dateStr = date.toISOString().slice(0, 10);
  const dateObj = new Date(date);
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateFormatted = dateObj.toLocaleDateString('en-US', options);

  const themeIndex = Math.floor(Math.random() * PUZZLE_THEMES.length);
  const factIndex = Math.floor(Math.random() * FOOTBALL_FACTS.length);
  const theme = PUZZLE_THEMES[themeIndex];
  const fact = FOOTBALL_FACTS[factIndex];

  // Pick 4 random players for example
  const randomPlayers = [];
  for (let i = 0; i < 4; i++) {
    const player = gamedata.players[Math.floor(Math.random() * gamedata.players.length)];
    randomPlayers.push(player);
  }
  const playerList = randomPlayers.map(p => escapeHtml(p.name)).join(', ');

  const title = `Scout Puzzle: ${theme} - ${dateStr}`;
  const description = `Today's Scout puzzle theme: ${theme}. Guess the connection between these players. Play daily and build your streak.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)} - Ball KnW</title>
  <meta name="description" content="${escapeHtml(description)}">
  <meta property="og:title" content="${escapeHtml(title)}">
  <meta property="og:description" content="${escapeHtml(description)}">
  <meta property="og:type" content="article">
  <meta property="og:url" content="https://ballknw.com/blog/${dateStr}.html">
  <meta property="article:published_time" content="${date.toISOString()}">
  <link rel="canonical" href="https://ballknw.com/blog/${dateStr}.html">

  <!-- Schema.org Article markup -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": "${escapeHtml(title)}",
    "description": "${escapeHtml(description)}",
    "datePublished": "${date.toISOString()}",
    "author": {
      "@type": "Organization",
      "name": "Ball KnW"
    }
  }
  </script>

  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.8; color: #333; background: #fafafa; }
    .container { max-width: 700px; margin: 0 auto; padding: 2rem; }
    .article { background: white; border-radius: 8px; padding: 2rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { font-size: 1.8rem; margin: 1rem 0; color: #222; }
    .meta { color: #666; font-size: 0.9rem; margin-bottom: 2rem; }
    h2 { font-size: 1.3rem; margin: 1.5rem 0 0.5rem 0; color: #222; }
    p { margin: 1rem 0; }
    .cta { background: #0066cc; color: white; padding: 1rem; border-radius: 8px; text-align: center; margin: 2rem 0; text-decoration: none; display: inline-block; width: 100%; }
    .cta:hover { background: #0052a3; }
    .back-link { color: #0066cc; text-decoration: none; margin-bottom: 1rem; display: inline-block; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <article class="article">
      <a href="/blog" class="back-link">← Back to Scout Blog</a>
      <h1>${escapeHtml(title)}</h1>
      <div class="meta">Published on ${dateFormatted}</div>

      <h2>Today's Theme: ${escapeHtml(theme)}</h2>
      <p>
        Can you spot the connection? Today's Scout puzzle features players who share something in common.
        The category is: <strong>${escapeHtml(theme)}</strong>.
        Try to figure out which players group together and climb the global leaderboard!
      </p>

      <h2>Example Players</h2>
      <p>
        Here are some players you might encounter in football manager games:
        ${playerList}.
        Each has unique attributes and market value. In our Gaffa game, you can manage entire teams like these players.
      </p>

      <h2>Scout Challenge</h2>
      <p>
        Scout is a daily puzzle game where you group players by a hidden category.
        Build your streak by solving consecutive daily puzzles.
        No account needed—just play and share your results!
      </p>

      <p><strong>${fact}</strong></p>

      <h2>Why Football Trivia Matters</h2>
      <p>
        Understanding player attributes, club structures, and football history
        makes games like Gaffa and Scout even more enjoyable.
        Whether you're managing a team or solving daily puzzles, knowledge is power!
      </p>

      <a href="/scout" class="cta">Play Scout Today</a>
    </article>
  </div>
</body>
</html>`;

  return { path: `${BLOG_OUT}/${dateStr}.html`, html };
}

// Generate blog index
function generateBlogIndex(posts) {
  const postList = posts
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .map(p => {
      const dateStr = p.date.toISOString().slice(0, 10);
      const dateObj = new Date(p.date);
      const options = { year: 'numeric', month: 'short', day: 'numeric' };
      const dateFmt = dateObj.toLocaleDateString('en-US', options);
      return `<li><a href="/blog/${dateStr}.html">${dateStr} Scout Puzzle</a> — ${dateFmt}</li>`;
    })
    .join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Scout Puzzle Blog - Ball KnW</title>
  <meta name="description" content="Read about daily Scout puzzles, tips, and football facts.">
  <meta property="og:title" content="Scout Puzzle Blog - Ball KnW">
  <meta property="og:description" content="Daily Scout puzzle commentary and football insights.">
  <link rel="canonical" href="https://ballknw.com/blog/index.html">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 700px; margin: 0 auto; padding: 2rem; }
    h1 { margin: 1rem 0; font-size: 2rem; }
    .post-list { list-style: none; }
    .post-list li { padding: 0.75rem 0; border-bottom: 1px solid #eee; }
    .post-list a { color: #0066cc; text-decoration: none; }
    .post-list a:hover { text-decoration: underline; }
    .back-link { color: #0066cc; text-decoration: none; }
    .back-link:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/" class="back-link">← Back to Ball KnW</a>
    <h1>Scout Puzzle Blog</h1>
    <p>Explore daily Scout puzzles, football insights, and tips to build your streak.</p>

    <h2>Recent Puzzles</h2>
    <ul class="post-list">
      ${postList}
    </ul>

    <div style="margin-top: 2rem; padding: 1rem; background: #f0f0f0; border-radius: 8px;">
      <p><strong>Play Scout Now:</strong> Solve the daily puzzle and build your streak. No account needed.</p>
      <a href="/scout" style="color: #0066cc; text-decoration: none;">Play Scout →</a>
    </div>
  </div>
</body>
</html>`;

  return { path: `${BLOG_OUT}/index.html`, html };
}

// Main
mkdirSync(BLOG_OUT, { recursive: true });

const posts = [];
const today = new Date();
today.setHours(0, 0, 0, 0);

// Generate 30 days of blog posts
for (let i = 0; i < 30; i++) {
  const date = new Date(today);
  date.setDate(date.getDate() - i);
  const post = generateBlogPost(date);
  writeFileSync(post.path, post.html, 'utf8');
  posts.push({ date, path: post.path });
}

// Generate blog index
const indexPost = generateBlogIndex(posts);
writeFileSync(indexPost.path, indexPost.html, 'utf8');

console.log(`✓ Generated ${posts.length} blog posts + index`);
