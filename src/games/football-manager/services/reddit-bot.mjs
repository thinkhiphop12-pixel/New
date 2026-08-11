/**
 * Reddit Bot - Posts daily Scout puzzle to football subreddits
 * Scheduled to run daily via GitHub Actions
 *
 * Environment variables:
 * - REDDIT_CLIENT_ID: OAuth client ID from Reddit app
 * - REDDIT_CLIENT_SECRET: OAuth client secret
 * - REDDIT_USERNAME: Account username
 * - REDDIT_PASSWORD: Account password
 * - REDDIT_USER_AGENT: Custom user agent string
 */

// For actual deployment, use this with Node.js reddit API library
// npm install snoowrap
// Then import Snoowrap and follow the pattern below

const SUBREDDITS = ['football', 'FootballManager', 'Fantasy_Football'];
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

const PUZZLE_EMOJIS = ['⚽', '🎯', '🏆', '🎪', '🎨'];

async function getRedditClient() {
  // This is a stub showing the pattern. In production, use snoowrap:
  // const Snoowrap = require('snoowrap');
  // return new Snoowrap({
  //   userAgent: process.env.REDDIT_USER_AGENT,
  //   clientId: process.env.REDDIT_CLIENT_ID,
  //   clientSecret: process.env.REDDIT_CLIENT_SECRET,
  //   username: process.env.REDDIT_USERNAME,
  //   password: process.env.REDDIT_PASSWORD,
  // });

  return {
    getSubreddit: (name) => ({
      submit: async (options) => {
        console.log(`[MOCK] Posted to r/${name}:`, {
          title: options.title,
          url: options.url,
          timestamp: new Date().toISOString(),
        });
        return { url: `https://reddit.com/r/${name}/comments/mock` };
      },
    }),
  };
}

function generatePostContent() {
  const today = new Date();
  const dateStr = today.toISOString().slice(0, 10);
  const themeIndex = Math.floor(Math.random() * PUZZLE_THEMES.length);
  const emojiIndex = Math.floor(Math.random() * PUZZLE_EMOJIS.length);
  const theme = PUZZLE_THEMES[themeIndex];
  const emoji = PUZZLE_EMOJIS[emojiIndex];

  const title = `${emoji} Daily Scout Puzzle - ${theme} (${dateStr})`;
  const url = 'https://www.ballknw.com/scout';

  return { title, url, theme, dateStr };
}

async function postToReddit(client, subreddit, content) {
  try {
    const sub = client.getSubreddit(subreddit);
    const result = await sub.submit({
      title: content.title,
      url: content.url,
    });

    console.log(`✓ Posted to r/${subreddit}: ${result.url}`);
    return { success: true, subreddit, url: result.url };
  } catch (error) {
    console.error(`✗ Failed to post to r/${subreddit}:`, error.message);
    return { success: false, subreddit, error: error.message };
  }
}

async function main() {
  // Validate environment variables
  const requiredVars = [
    'REDDIT_CLIENT_ID',
    'REDDIT_CLIENT_SECRET',
    'REDDIT_USERNAME',
    'REDDIT_PASSWORD',
    'REDDIT_USER_AGENT',
  ];

  const missing = requiredVars.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error(`Missing environment variables: ${missing.join(', ')}`);
    console.log('⚠️  Running in mock mode (no actual posts)');
  }

  try {
    // Get Reddit API client
    const reddit = await getRedditClient();

    // Generate today's puzzle content
    const content = generatePostContent();
    console.log(`📅 Today's puzzle: ${content.theme}`);

    // Post to each subreddit
    const results = [];
    for (const subreddit of SUBREDDITS) {
      const result = await postToReddit(reddit, subreddit, content);
      results.push(result);
    }

    // Summary
    const successful = results.filter(r => r.success).length;
    console.log(`\n✓ Successfully posted to ${successful}/${SUBREDDITS.length} subreddits`);

    // Log failures
    const failed = results.filter(r => !r.success);
    if (failed.length > 0) {
      console.error('\nFailed posts:');
      for (const f of failed) {
        console.error(`  - r/${f.subreddit}: ${f.error}`);
      }
      process.exit(1);
    }
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
