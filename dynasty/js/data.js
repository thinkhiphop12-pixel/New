// ==================== GAME CONSTANTS & DATA ====================

const TEAM_NAMES = [
    "Dynamo Thunderstrike", "FC Ironforge", "Athletic Brewmasters",
    "Real Pizzeria", "Sporting Couch Potatoes", "Inter Naptime",
    "Borussia Dönerburg", "AS Espresso", "Olympique Baguette",
    "FC Schnitzelheim", "Bayern Bratwurst", "Atlético Siesta",
    "Juventus Gelato", "Manchester Drizzle", "Liverpool Scousers",
    "Chelsea Pensioners", "Arsenal Cannoneers", "Tottenham Bottlers"
];

const FIRST_NAMES = [
    "Marco", "Luca", "Stefan", "Andreas", "Michael", "Thomas", "David",
    "Kevin", "Patrick", "Daniel", "Tobias", "Christian", "Sebastian",
    "Alexander", "Markus", "Jan", "Felix", "Julian", "Florian", "Maximilian",
    "Carlos", "Juan", "Pedro", "Miguel", "Roberto", "Francesco", "Giovanni",
    "Pierre", "Jean", "Antoine", "James", "Oliver", "Harry", "George"
];

const LAST_NAMES = [
    "Müller", "Schmidt", "Schneider", "Fischer", "Weber", "Meyer",
    "Wagner", "Becker", "Schulz", "Hoffmann", "Koch", "Richter",
    "García", "Rodríguez", "Martínez", "Rossi", "Russo", "Ferrari",
    "Dupont", "Martin", "Bernard", "Smith", "Johnson", "Williams",
    "Brown", "Jones", "Wilson", "Taylor", "Davies", "Evans"
];

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

// Training configurations
const TRAINING_CONFIG = {
    basic: { cost: 20000, strengthGain: 3, energyCost: 10 },
    intensive: { cost: 60000, strengthGain: 6, energyCost: 20 },
    elite: { cost: 150000, strengthGain: 10, energyCost: 25 }
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

// Relegated teams get replaced by these
const PROMOTION_TEAMS = [
    "FC Kebabistan", "Dynamo Disco", "Real Sofa Madrid", "Inter Napping",
    "Borussia Mönchengladbach 2", "AS Grandma's Kitchen", "Olympique Croissant",
    "FC Currywurst", "Bayern Lederhosen", "Atlético Paella", "Juventus Pasta",
    "Manchester Raincoats", "Liverpool Dockworkers", "Chelsea Tractors",
    "Arsenal Canaries", "Tottenham Roosters", "AC Espresso Shot",
    "Sporting Procrastinators", "Benfica Bacalhau", "Porto Portwine"
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
        TEAM_NAMES, FIRST_NAMES, LAST_NAMES, SPONSOR_NAMES,
        SPONSOR_TYPES, SPONSOR_BASE_VALUES, TRAINING_CONFIG,
        STADIUM_EXPANSIONS, POSITION_COUNTS
    };
}
