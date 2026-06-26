// ==================== PLAYER & TEAM GENERATION ====================

// Generate a unique ID
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Calculate player market value
function calculatePlayerValue(player) {
    const baseValue = player.strength * 50000;
    const ageFactor = player.age < 26 ? 1.3 : player.age < 30 ? 1 : 0.7;
    return Math.floor(baseValue * ageFactor);
}

// Position label (GK/DEF/MID/FWD) -> real player pool (GK/DF/MF/FW)
const POSITION_TO_POOL = { GK: 'GK', DEF: 'DF', MID: 'MF', FWD: 'FW' };

// Direct references to the pools loaded from realplayers.js. These are
// declared with `const` there, so they're lexical globals, not window
// properties — can't be looked up via window[`REAL_PLAYERS_${...}`].
const REAL_PLAYER_POOLS = {
    GK: REAL_PLAYERS_GK, DF: REAL_PLAYERS_DF, MF: REAL_PLAYERS_MF, FW: REAL_PLAYERS_FW
};

// Tracks names already handed out in the current game so two squads
// never end up with the same real player.
function getUsedNames() {
    if (!gameState.usedPlayerNames) gameState.usedPlayerNames = [];
    return gameState.usedPlayerNames;
}

// Pull a real player (name + rating) from the pool for this position,
// preferring one not already used elsewhere in this game. When clubName
// is given, draw from that club's actual FIFA 10 roster first (so e.g.
// Real Madrid fields players who were really at Real Madrid); fall back
// to the flat cross-club pool once the club's own bucket runs short.
function drawRealPlayer(position, clubName) {
    const bucket = POSITION_TO_POOL[position] === 'DF' ? 'DEF'
        : POSITION_TO_POOL[position] === 'MF' ? 'MID'
        : POSITION_TO_POOL[position] === 'FW' ? 'FWD' : 'GK';
    const clubRoster = clubName && typeof REAL_CLUB_ROSTERS !== 'undefined' ? REAL_CLUB_ROSTERS[clubName] : null;
    const clubPool = clubRoster ? clubRoster[bucket] || [] : [];
    const flatPool = REAL_PLAYER_POOLS[POSITION_TO_POOL[position] || 'MF'] || [];
    const used = getUsedNames();

    for (let attempt = 0; attempt < 8; attempt++) {
        if (clubPool.length === 0) break;
        const candidate = clubPool[Math.floor(Math.random() * clubPool.length)];
        if (!used.includes(candidate.n)) {
            used.push(candidate.n);
            return candidate;
        }
    }
    if (flatPool.length === 0) return { n: 'Unknown Player', o: 50 };
    for (let attempt = 0; attempt < 8; attempt++) {
        const candidate = flatPool[Math.floor(Math.random() * flatPool.length)];
        if (!used.includes(candidate.n)) {
            used.push(candidate.n);
            return candidate;
        }
    }
    // Both pools exhausted (extremely unlikely) — allow a repeat rather than fail.
    return (clubPool.length ? clubPool : flatPool)[Math.floor(Math.random() * (clubPool.length || flatPool.length))];
}

// Generate a single player
function generatePlayer(position, clubName) {
    const age = 18 + Math.floor(Math.random() * 17);
    const real = drawRealPlayer(position, clubName);
    const baseStrength = Math.max(40, Math.min(90, real.o + Math.floor(Math.random() * 7) - 3));
    const ageFactor = age < 28 ? 1 : 1 - (age - 28) * 0.03;

    const player = {
        id: generateId(),
        name: real.n,
        position: position,
        age: age,
        energy: 85 + Math.floor(Math.random() * 15), // Start with good energy
        condition: 80 + Math.floor(Math.random() * 20),
        strength: Math.floor(baseStrength * ageFactor),
        value: 0,
        inTraining: false,
        trainingBonus: 0,
        trainingEnergyCost: 0
    };

    player.value = calculatePlayerValue(player);
    return player;
}

// Generate a full squad
function generateSquad(clubName) {
    const squad = [];

    Object.entries(POSITION_COUNTS).forEach(([pos, count]) => {
        for (let i = 0; i < count; i++) {
            squad.push(generatePlayer(pos, clubName));
        }
    });

    return squad;
}

// Generate all teams for the league
function generateTeams() {
    gameState.teams = [];
    const shuffledNames = [...TEAM_NAMES].sort(() => Math.random() - 0.5);

    for (let i = 0; i < 18; i++) {
        const tier = TEAM_BUDGET_TIER[shuffledNames[i]] || 1;
        const team = {
            name: shuffledNames[i],
            players: generateSquad(shuffledNames[i]),
            stats: {
                played: 0,
                won: 0,
                drawn: 0,
                lost: 0,
                goalsFor: 0,
                goalsAgainst: 0,
                points: 0
            },
            budget: Math.floor((3000000 + Math.floor(Math.random() * 7000000)) * tier),
            isPlayer: false
        };
        gameState.teams.push(team);
    }
}

// Boost player team at game start
function boostPlayerTeam() {
    const playerTeam = getPlayerTeam();
    playerTeam.isPlayer = true;
    
    // New-manager bounce — small, since squads now carry real-world-informed
    // ratings and a big flat boost would make the real club strengths meaningless.
    playerTeam.players.forEach(p => {
        p.strength = Math.min(99, p.strength + 4);
        p.energy = 90 + Math.floor(Math.random() * 10);
        p.value = calculatePlayerValue(p);
    });
}

// Update all player values in all teams
function updateAllPlayerValues() {
    gameState.teams.forEach(team => {
        team.players.forEach(p => {
            p.value = calculatePlayerValue(p);
        });
    });
}

// Age all players by 1 year
function ageAllPlayers() {
    gameState.teams.forEach(team => {
        team.players.forEach(player => {
            player.age++;
            
            // Retire very old players (randomly, higher chance with age)
            if (player.age > 34 && Math.random() < (player.age - 34) * 0.3) {
                player.retired = true;
            }
            
            // Strength decline for older players
            if (player.age > 32) {
                player.strength = Math.max(30, player.strength - Math.floor(Math.random() * 3));
            }
        });
        
        // Remove retired players
        const retiredPlayers = team.players.filter(p => p.retired);
        retiredPlayers.forEach(p => {
            if (team.isPlayer) {
                showNotification(`${p.name} (${p.age}) has retired from football. Thanks for the memories!`);
            }
        });
        team.players = team.players.filter(p => !p.retired);
    });
}

// Reset energy and condition for new season
function refreshAllPlayers() {
    gameState.teams.forEach(team => {
        team.players.forEach(player => {
            player.energy = 85 + Math.floor(Math.random() * 15);
            player.condition = 80 + Math.floor(Math.random() * 20);
            player.inTraining = false;
            player.trainingBonus = 0;
            player.trainingEnergyCost = 0;
        });
    });
}

// Generate a youth player (younger, cheaper, potential to grow)
function generateYouthPlayer(position) {
    const age = 16 + Math.floor(Math.random() * 3); // 16-18 years old
    const baseStrength = 25 + Math.floor(Math.random() * 25); // Lower base but potential
    const real = drawRealPlayer(position);

    const player = {
        id: generateId(),
        name: real.n,
        position: position,
        age: age,
        energy: 95 + Math.floor(Math.random() * 5), // Youth = lots of energy!
        condition: 90 + Math.floor(Math.random() * 10),
        strength: baseStrength,
        potential: baseStrength + 20 + Math.floor(Math.random() * 30), // Hidden potential
        value: 0,
        inTraining: false,
        trainingBonus: 0,
        trainingEnergyCost: 0,
        isYouth: true
    };
    
    player.value = calculatePlayerValue(player);
    return player;
}

// Try to generate a youth player for player team (called periodically)
function tryGenerateYouthPlayer() {
    const team = getPlayerTeam();
    
    // Max squad size check
    if (team.players.length >= 25) {
        return null;
    }
    
    // Random position weighted towards midfield/forward
    const positions = ['GK', 'DEF', 'DEF', 'MID', 'MID', 'MID', 'FWD', 'FWD'];
    const position = positions[Math.floor(Math.random() * positions.length)];
    
    const youthPlayer = generateYouthPlayer(position);
    team.players.push(youthPlayer);
    
    return youthPlayer;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateId, calculatePlayerValue, generatePlayer,
        generateSquad, generateTeams, boostPlayerTeam, updateAllPlayerValues,
        ageAllPlayers, refreshAllPlayers, generateYouthPlayer, tryGenerateYouthPlayer
    };
}
