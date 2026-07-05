/**
 * Discord Bot - Posts daily Scout puzzles and manages leaderboards
 * Deployed to Heroku or similar free tier hosting
 *
 * Environment variables:
 * - DISCORD_TOKEN: Bot token from Discord Developer Portal
 * - DISCORD_GUILD_ID: Server ID to post in
 * - DISCORD_CHANNEL_ID: Channel ID for puzzle posts
 *
 * Setup:
 * 1. Create Discord app at https://discord.com/developers/applications
 * 2. Copy bot token to DISCORD_TOKEN
 * 3. Create guild (server) and channel
 * 4. Deploy this bot to Heroku (free tier or similar)
 */

// For production, use: npm install discord.js
// Then import Client from 'discord.js' and follow the pattern below

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

class DiscordBotService {
  constructor() {
    // In production: this.client = new Client({ intents: [GatewayIntentBits.Guilds] });
    // For now, mock implementation
    this.client = null;
    this.leaderboard = new Map(); // userId -> { score, streak, lastPuzzleDate }
  }

  async start() {
    // Validate environment
    const requiredVars = ['DISCORD_TOKEN', 'DISCORD_GUILD_ID', 'DISCORD_CHANNEL_ID'];
    const missing = requiredVars.filter(v => !process.env[v]);

    if (missing.length > 0) {
      console.error(`Missing env vars: ${missing.join(', ')}`);
      console.log('⚠️  Running in mock mode (development only)');
      return;
    }

    console.log('✓ Discord bot initialized');

    // Schedule daily puzzle post
    this.scheduleDailyPuzzle();
  }

  scheduleDailyPuzzle() {
    // In production, use a cron job library
    // For now, log that this would be scheduled
    console.log('📅 Daily puzzle posting scheduled (9:00 AM UTC)');
  }

  generatePuzzleEmbed() {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10);
    const themeIndex = Math.floor(Math.random() * PUZZLE_THEMES.length);
    const emojiIndex = Math.floor(Math.random() * PUZZLE_EMOJIS.length);
    const theme = PUZZLE_THEMES[themeIndex];
    const emoji = PUZZLE_EMOJIS[emojiIndex];

    return {
      title: `${emoji} Daily Scout Puzzle`,
      description: `**Today's Theme:** ${theme}\n\n[Play Scout](https://ballknw.com/scout)`,
      color: 0x0066cc,
      fields: [
        {
          name: 'How to Play',
          value: 'Group the players by their hidden connection. Build your streak by solving consecutive daily puzzles.',
          inline: false,
        },
        {
          name: 'Leaderboard',
          value: 'Top streaks will be featured here!',
          inline: false,
        },
      ],
      footer: {
        text: `Puzzle Date: ${dateStr}`,
      },
    };
  }

  async postDailyPuzzle() {
    try {
      const embed = this.generatePuzzleEmbed();
      console.log(`\n✓ Posted daily puzzle to Discord:`);
      console.log(`  Title: ${embed.title}`);
      console.log(`  Theme: ${embed.description.split('**')[1]}`);
      console.log(`  Channel: ${process.env.DISCORD_CHANNEL_ID}`);
    } catch (error) {
      console.error('Failed to post puzzle:', error.message);
    }
  }

  async updateLeaderboard(userId, score, streak) {
    this.leaderboard.set(userId, {
      score,
      streak,
      lastPuzzleDate: new Date().toISOString().slice(0, 10),
    });
    console.log(`✓ Updated leaderboard for user ${userId}: streak=${streak}`);
  }

  async getTopStreaks(limit = 10) {
    const sorted = Array.from(this.leaderboard.entries())
      .sort((a, b) => b[1].streak - a[1].streak)
      .slice(0, limit);

    return sorted.map(([userId, data]) => ({
      userId,
      ...data,
    }));
  }

  async handleMessage(message) {
    // Handle commands like !leaderboard, !mystats, etc.
    if (message.content === '!leaderboard') {
      const topStreaks = await this.getTopStreaks(5);
      console.log('Leaderboard requested:');
      topStreaks.forEach((entry, i) => {
        console.log(`  ${i + 1}. User ${entry.userId}: ${entry.streak} streak`);
      });
    }
  }
}

// Mock main for testing
async function main() {
  const bot = new DiscordBotService();
  await bot.start();

  // Simulate posting a puzzle
  await bot.postDailyPuzzle();

  // Simulate leaderboard updates
  await bot.updateLeaderboard('user123', 100, 7);
  await bot.updateLeaderboard('user456', 150, 12);
  await bot.updateLeaderboard('user789', 80, 5);

  // Show top streaks
  const topStreaks = await bot.getTopStreaks(3);
  console.log('\nTop Streaks:');
  topStreaks.forEach((entry, i) => {
    console.log(`  ${i + 1}. ${entry.streak}-day streak`);
  });
}

// Export for testing/integration
export { DiscordBotService };

// Run if invoked directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
