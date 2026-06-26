// ==================== GAME CONSTANTS & DATA ====================

// Top-flight clubs for the 18-team league. Real club names, used the same
// descriptive/parody way as the rest of the site's games (see terms.html) —
// not affiliated with or endorsed by any of these clubs.
const TEAM_NAMES = [
    "Arsenal", "Liverpool", "Manchester City", "Manchester United",
    "Chelsea", "Tottenham Hotspur", "Real Madrid", "FC Barcelona",
    "Bayern Munich", "Borussia Dortmund", "Juventus", "AC Milan",
    "Inter Milan", "Paris Saint-Germain", "Ajax", "Porto", "Benfica", "Celtic"
];

// Relative budget multiplier reflecting real-world club prestige/spending
// power. Anything not listed (e.g. promoted clubs) defaults to 1.
const TEAM_BUDGET_TIER = {
    "Manchester City": 1.6, "Real Madrid": 1.6, "Paris Saint-Germain": 1.5,
    "FC Barcelona": 1.4, "Bayern Munich": 1.4, "Chelsea": 1.3,
    "Manchester United": 1.3, "Liverpool": 1.3, "Arsenal": 1.2,
    "Juventus": 1.15, "Tottenham Hotspur": 1.1, "Inter Milan": 1.1,
    "Borussia Dortmund": 1.05, "AC Milan": 1.05,
    "Benfica": 0.9, "Porto": 0.9, "Ajax": 0.85, "Celtic": 0.8
};

const SPONSOR_NAMES = [
    "TechCorp Industries", "Mega Burger Co.", "Flash Energy Drinks",
    "AutoMax Motors", "Global Airlines", "PizzaWorld", "ByteStream Gaming",
    "FitLife Supplements", "QuickBank Financial", "GreenLeaf Organics",
    "SportsMax Betting", "CloudNine Hosting", "BrewMaster Beer",
    "ElectroMart", "TravelEasy Holidays", "FashionForward", "MobileMax",
    "InsureAll", "CryptoTrade", "StreamFlix Entertainment",
    "RocketFuel Energy", "DigiBank Plus", "FreshFoods Market", "SpeedyNet ISP"
];

// Sponsor types: shirt + 4 stadium stands
const SPONSOR_TYPES = ["shirt", "north", "south", "east", "west"];

// Base sponsor values per type (per season)
const SPONSOR_BASE_VALUES = {
    shirt: 400000,
    north: 150000,
    south: 150000,
    east: 120000,
    west: 120000
};

// Training configurations. strengthGain is the BASE gain — the actual gain is
// scaled down by diminishing returns (higher-rated/older players improve less)
// in processTrainingEffects(), so training can't be spammed to max out a squad.
const TRAINING_CONFIG = {
    basic: { cost: 20000, strengthGain: 3, energyCost: 10 },
    intensive: { cost: 60000, strengthGain: 6, energyCost: 20 },
    elite: { cost: 150000, strengthGain: 10, energyCost: 25 }
};

// Recovery / rest configurations — a paid way to get tired players match-fit
// faster than passive bench recovery (which gives +25 energy / +10 condition).
// Resting a player sits them out of the match for that round.
const REST_CONFIG = {
    physio: { cost: 20000, energyGain: 40, conditionGain: 20 },
    spa: { cost: 45000, energyGain: 55, conditionGain: 30 },
    retreat: { cost: 80000, energyGain: 70, conditionGain: 45 }
};

// Stadium expansion options
const STADIUM_EXPANSIONS = {
    1000: 500000,
    2500: 1100000,
    5000: 2000000,
    10000: 3500000
};

// Position distribution for squad generation
const POSITION_COUNTS = { GK: 2, DEF: 5, MID: 5, FWD: 4 };

// Relegated teams get replaced by these — also real clubs, one tier down
// in global recognition, so a promoted side still feels like a real team.
const PROMOTION_TEAMS = [
    "Newcastle United", "Aston Villa", "West Ham United", "Everton",
    "Leicester City", "Wolverhampton Wanderers", "Sevilla", "Valencia",
    "Atalanta", "Napoli", "AS Roma", "Lyon", "Marseille",
    "Eintracht Frankfurt", "RB Leipzig", "Feyenoord", "PSV Eindhoven",
    "Sporting CP", "Fenerbahçe", "Galatasaray"
];

// Random events - some good, some bad, some just funny
const RANDOM_EVENTS = [
    // Positive events
    { type: "positive", title: "🎰 Lucky Lottery", message: "Your kit man won the lottery and donated his winnings to the club!", effect: { budget: 500000 } },
    { type: "positive", title: "📺 TV Deal Bonus", message: "Your last match was so entertaining, the TV company sent a bonus!", effect: { budget: 200000 } },
    { type: "positive", title: "🍕 Pizza Party", message: "The team had a pizza party! Everyone feels refreshed.", effect: { energyAll: 15 } },
    { type: "positive", title: "🏆 Award Winner", message: "Your star player won 'Mustache of the Month'. Team morale soars!", effect: { energyAll: 10 } },
    { type: "positive", title: "🎪 Circus in Town", message: "Players attended the circus. The juggling improved their coordination!", effect: { strengthRandom: 3 } },
    { type: "positive", title: "☕ Coffee Machine", message: "New espresso machine in the locker room. Everyone's buzzing!", effect: { energyAll: 20 } },
    { type: "positive", title: "🦸 Superhero Film", message: "Team watched a superhero movie. They feel invincible!", effect: { conditionAll: 15 } },
    { type: "positive", title: "💰 Mysterious Benefactor", message: "An anonymous fan donated a suitcase of cash at reception!", effect: { budget: 750000 } },
    
    // Negative events
    { type: "negative", title: "🦨 Skunk Invasion", message: "A family of skunks invaded the locker room. Training canceled!", effect: { energyAll: -10 } },
    { type: "negative", title: "🌧️ Flooded Pitch", message: "The pitch flooded. Expensive drainage repairs needed.", effect: { budget: -150000 } },
    { type: "negative", title: "🍔 Food Poisoning", message: "The post-match burgers were dodgy. Half the team is ill!", effect: { conditionAll: -20 } },
    { type: "negative", title: "🎸 Noise Complaint", message: "Players formed a band. Neighbors complained. Fine issued.", effect: { budget: -50000 } },
    { type: "negative", title: "🦅 Bird Attack", message: "Seagulls attacked during training! Several players traumatized.", effect: { energyAll: -15 } },
    { type: "negative", title: "📱 Social Media Scandal", message: "A player's embarrassing tweet went viral. PR damage control needed.", effect: { budget: -100000 } },
    { type: "negative", title: "🚽 Plumbing Disaster", message: "Stadium toilets exploded. Repairs and compensation needed.", effect: { budget: -200000 } },
    { type: "negative", title: "🎮 Gaming Addiction", message: "Players discovered a new video game. Nobody slept properly.", effect: { energyAll: -20 } },
    
    // Neutral/funny events
    { type: "neutral", title: "👽 UFO Sighting", message: "Players claim they saw a UFO during training. Media goes crazy!", effect: { budget: 50000 } },
    { type: "neutral", title: "🐐 Pitch Invader", message: "A goat ran onto the pitch and ate the corner flags. Bizarre!", effect: {} },
    { type: "neutral", title: "🎭 Mistaken Identity", message: "Your goalkeeper was mistaken for a famous actor. Free publicity!", effect: { budget: 25000 } },
    { type: "neutral", title: "🧦 Missing Socks", message: "The entire stock of left socks has vanished. Mystery unsolved.", effect: { budget: -10000 } },
    { type: "neutral", title: "🦆 Duck Adoption", message: "The team adopted a duck as mascot. Fans love it!", effect: { budget: 30000 } },
    { type: "neutral", title: "🎪 Clown Visit", message: "A clown showed up claiming to be the new assistant coach. Security was called.", effect: {} },
    { type: "neutral", title: "🍝 Pasta Debate", message: "Heated argument about the best pasta shape. Team bonding exercise!", effect: { energyAll: 5 } },
    { type: "neutral", title: "🐈 Cat in Stadium", message: "A cat has been living under the stands. Players named it 'Sir Meowington'.", effect: {} }
];

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        TEAM_NAMES, TEAM_BUDGET_TIER, PROMOTION_TEAMS, SPONSOR_NAMES,
        SPONSOR_TYPES, SPONSOR_BASE_VALUES, TRAINING_CONFIG, REST_CONFIG,
        STADIUM_EXPANSIONS, POSITION_COUNTS
    };
}
