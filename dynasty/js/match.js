// ==================== MATCH SIMULATION ====================

// Generate all fixtures for the season
function generateFixtures() {
    gameState.fixtures = [];
    
    // Simple round-robin scheduling
    for (let round = 0; round < 34; round++) {
        const roundFixtures = [];
        
        for (let i = 0; i < 9; i++) {
            const home = (round + i) % 18;
            const away = (round + 17 - i) % 18;
            
            if (home !== away) {
                roundFixtures.push({
                    home: home,
                    away: away,
                    homeGoals: null,
                    awayGoals: null,
                    played: false
                });
            }
        }
        
        gameState.fixtures.push(roundFixtures);
    }
}

// Calculate effective team strength for a match
function calculateTeamStrength(team, isPlayerTeam = false) {
    let players;
    
    if (isPlayerTeam) {
        // Use selected lineup
        players = team.players.filter(p => gameState.selectedLineup.includes(p.id));
    } else {
        // AI teams use their best 11
        players = [...team.players]
            .sort((a, b) => b.strength - a.strength)
            .slice(0, 11);
    }
    
    // Fill in if fewer than 11 players
    while (players.length < 11) {
        const avgStrength = players.reduce((sum, p) => sum + p.strength, 0) / players.length || 30;
        players.push({ strength: avgStrength * 0.5, energy: 50, condition: 50 });
    }
    
    // Calculate total effective strength with BALANCED energy/condition impact
    const totalStrength = players.reduce((sum, p) => {
        // More forgiving curve - energy and condition have reduced impact
        const energyFactor = 0.7 + (p.energy / 100) * 0.3;      // Range: 0.7 - 1.0
        const conditionFactor = 0.8 + (p.condition / 100) * 0.2; // Range: 0.8 - 1.0
        return sum + (p.strength * energyFactor * conditionFactor);
    }, 0);
    
    return totalStrength / 11;
}

// Simulate a single match
function simulateMatch(homeTeam, awayTeam, homeIsPlayer, awayIsPlayer) {
    const homeStrength = calculateTeamStrength(homeTeam, homeIsPlayer);
    const awayStrength = calculateTeamStrength(awayTeam, awayIsPlayer);
    
    // Home advantage (10% boost)
    const adjustedHomeStrength = homeStrength * 1.1;
    
    // Calculate goal probability
    const totalStrength = adjustedHomeStrength + awayStrength;
    const homeGoalChance = adjustedHomeStrength / totalStrength;
    
    let homeGoals = 0;
    let awayGoals = 0;
    
    // Simulate goal-scoring opportunities (8-16 chances per match)
    const chances = 8 + Math.floor(Math.random() * 8);
    
    for (let i = 0; i < chances; i++) {
        const rand = Math.random();
        if (rand < homeGoalChance * 0.28) {
            homeGoals++;
        } else if (rand > 1 - (1 - homeGoalChance) * 0.28) {
            awayGoals++;
        }
    }
    
    // Small chance for upset (8%)
    if (Math.random() < 0.08) {
        const temp = homeGoals;
        homeGoals = Math.max(0, awayGoals + Math.floor(Math.random() * 2));
        awayGoals = Math.max(0, temp - Math.floor(Math.random() * 2));
    }
    
    return { homeGoals, awayGoals };
}

// Process all matches for the current round
function processRoundMatches() {
    const roundIndex = gameState.round - 1;
    const fixtures = gameState.fixtures[roundIndex];
    const playerTeamIdx = gameState.playerTeamIndex;
    
    let playerMatch = null;
    const results = [];
    
    fixtures.forEach(fixture => {
        const homeTeam = gameState.teams[fixture.home];
        const awayTeam = gameState.teams[fixture.away];
        
        const homeIsPlayer = fixture.home === playerTeamIdx;
        const awayIsPlayer = fixture.away === playerTeamIdx;
        
        // Simulate the match
        const result = simulateMatch(homeTeam, awayTeam, homeIsPlayer, awayIsPlayer);
        
        // Record result
        fixture.homeGoals = result.homeGoals;
        fixture.awayGoals = result.awayGoals;
        fixture.played = true;
        
        // Update team stats
        homeTeam.stats.played++;
        awayTeam.stats.played++;
        homeTeam.stats.goalsFor += result.homeGoals;
        homeTeam.stats.goalsAgainst += result.awayGoals;
        awayTeam.stats.goalsFor += result.awayGoals;
        awayTeam.stats.goalsAgainst += result.homeGoals;
        
        // Update points
        if (result.homeGoals > result.awayGoals) {
            homeTeam.stats.won++;
            homeTeam.stats.points += 3;
            awayTeam.stats.lost++;
        } else if (result.homeGoals < result.awayGoals) {
            awayTeam.stats.won++;
            awayTeam.stats.points += 3;
            homeTeam.stats.lost++;
        } else {
            homeTeam.stats.drawn++;
            awayTeam.stats.drawn++;
            homeTeam.stats.points++;
            awayTeam.stats.points++;
        }
        
        // Track player's match
        if (homeIsPlayer || awayIsPlayer) {
            playerMatch = {
                fixture,
                homeTeam,
                awayTeam,
                result,
                homeIsPlayer
            };
        }
        
        results.push({ homeTeam, awayTeam, result });
    });
    
    return { playerMatch, results };
}

// Process player team effects after round
function processPlayerTeamRound(playerMatch) {
    const team = getPlayerTeam();
    
    // Calculate income
    let income = 0;
    const breakdown = {};
    
    // Sponsor payments
    const sponsorResult = processSponsorPayments();
    income += sponsorResult.totalIncome;
    Object.assign(breakdown, sponsorResult.breakdown);
    
    // Match day revenue (home games only)
    if (playerMatch && playerMatch.homeIsPlayer) {
        const price = gameState.stadium.ticketPrice;
        const capacity = gameState.stadium.capacity;
        const attendanceRate = Math.max(0.4, 1 - (price - 15) * 0.008);
        const attendance = Math.floor(capacity * attendanceRate);
        const matchRevenue = attendance * price;
        income += matchRevenue;
        breakdown['🎫 Match Day'] = matchRevenue;
    }
    
    gameState.budget += income;
    gameState.weeklyIncome = income;
    gameState.lastIncomeBreakdown = breakdown;
    
    // Process training effects
    processTrainingEffects();
    
    // Update player stats with BALANCED energy drain
    team.players.forEach(player => {
        if (gameState.selectedLineup.includes(player.id)) {
            // REDUCED energy drain: 8-15 instead of 15-25
            const energyDrain = 8 + Math.floor(Math.random() * 7);
            player.energy = Math.max(25, player.energy - energyDrain);
            
            // Small chance of strength improvement from match play
            if (Math.random() < 0.2) {
                player.strength = Math.min(99, player.strength + 1);
            }
            
            // Youth players can grow faster
            if (player.isYouth && player.potential && Math.random() < 0.3) {
                if (player.strength < player.potential) {
                    player.strength = Math.min(player.potential, player.strength + 1);
                }
            }
            
            // Injury risk only if condition is low
            if (player.condition < 50 && Math.random() > (player.condition / 80)) {
                const injurySeverity = 10 + Math.floor(Math.random() * 20);
                player.condition = Math.max(20, player.condition - injurySeverity);
                showNotification(`${player.name} picked up an injury!`, true);
            }
        } else {
            // REST RECOVERY - generous recovery for benched players
            player.energy = Math.min(100, player.energy + 25);
            player.condition = Math.min(100, player.condition + 10);
        }
        
        // Age-based natural condition recovery
        if (player.age < 25) {
            player.condition = Math.min(100, player.condition + 3);
        } else if (player.age > 30) {
            player.condition = Math.min(100, player.condition + 1);
        } else {
            player.condition = Math.min(100, player.condition + 2);
        }
        
        // Update player value
        player.value = calculatePlayerValue(player);
    });
    
    // Occasionally generate new sponsor offers
    if (Math.random() < 0.15) {
        generateSponsorOffers();
    }
    
    // Youth player chance (every other round, 10% chance)
    if (gameState.round % 2 === 0 && Math.random() < 0.10) {
        const youth = tryGenerateYouthPlayer();
        if (youth) {
            showNotification(`🌟 Youth prospect ${youth.name} (${youth.position}, ${youth.age}yo) has joined from the academy!`);
        }
    }
    
    // Half-season youth boost (round 17, 40% chance)
    if (gameState.round === 17 && Math.random() < 0.40) {
        const youth = tryGenerateYouthPlayer();
        if (youth) {
            showNotification(`🎓 Academy graduate ${youth.name} (${youth.position}, ${youth.age}yo) is ready for the first team!`);
        }
    }
    
    // Random event chance (8% per round)
    if (Math.random() < 0.08) {
        triggerRandomEvent();
    }
}

// Trigger a random event
function triggerRandomEvent() {
    const event = RANDOM_EVENTS[Math.floor(Math.random() * RANDOM_EVENTS.length)];
    const team = getPlayerTeam();
    
    // Apply effects
    if (event.effect.budget) {
        gameState.budget += event.effect.budget;
    }
    
    if (event.effect.energyAll) {
        team.players.forEach(p => {
            p.energy = Math.max(10, Math.min(100, p.energy + event.effect.energyAll));
        });
    }
    
    if (event.effect.conditionAll) {
        team.players.forEach(p => {
            p.condition = Math.max(10, Math.min(100, p.condition + event.effect.conditionAll));
        });
    }
    
    if (event.effect.strengthRandom) {
        // Apply to random player
        const player = team.players[Math.floor(Math.random() * team.players.length)];
        player.strength = Math.min(99, player.strength + event.effect.strengthRandom);
        event.message += ` ${player.name} benefited most!`;
    }
    
    // Store event for display
    gameState.lastRandomEvent = event;
    
    // Show notification with appropriate color
    const isError = event.type === 'negative';
    showNotification(`${event.title}: ${event.message}`, isError);
}

// Process end of season
function processEndOfSeason() {
    // Get final standings
    const standings = [...gameState.teams].sort((a, b) => {
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
        const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
        const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.stats.goalsFor - a.stats.goalsFor;
    });
    
    const playerPosition = standings.findIndex(t => t === getPlayerTeam()) + 1;
    
    // Check if player is relegated
    const isPlayerRelegated = playerPosition >= 17;
    
    // Determine relegated teams (bottom 2, but not player)
    const relegatedTeams = [];
    for (let i = standings.length - 1; i >= 0 && relegatedTeams.length < 2; i--) {
        if (!standings[i].isPlayer) {
            relegatedTeams.push(standings[i]);
        }
    }
    
    // Generate promoted teams
    const shuffledPromotionTeams = [...PROMOTION_TEAMS].sort(() => Math.random() - 0.5);
    const usedNames = new Set(gameState.teams.map(t => t.name));
    
    relegatedTeams.forEach((relegatedTeam, idx) => {
        // Find unused promotion team name
        let newName = shuffledPromotionTeams.find(n => !usedNames.has(n)) || `FC Newcomer ${gameState.season + 1}-${idx + 1}`;
        usedNames.add(newName);
        
        // Replace relegated team
        const teamIndex = gameState.teams.indexOf(relegatedTeam);
        gameState.teams[teamIndex] = {
            name: newName,
            players: generateSquad(),
            stats: { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 },
            budget: 2000000 + Math.floor(Math.random() * 3000000),
            isPlayer: false
        };
    });
    
    // Season prize money based on position
    let prizeMoney = 0;
    if (playerPosition === 1) prizeMoney = 5000000;
    else if (playerPosition === 2) prizeMoney = 3000000;
    else if (playerPosition === 3) prizeMoney = 2000000;
    else if (playerPosition <= 6) prizeMoney = 1000000;
    else if (playerPosition <= 10) prizeMoney = 500000;
    else prizeMoney = 250000;
    
    gameState.budget += prizeMoney;
    
    // Age all players
    ageAllPlayers();
    
    // Refresh all players for new season
    refreshAllPlayers();
    
    // Reset all team stats
    gameState.teams.forEach(team => {
        team.stats = { played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 };
    });
    
    // Generate new fixtures
    generateFixtures();
    
    // Generate new sponsor offers
    generateSponsorOffers();
    
    // Refresh transfer market
    generateTransferMarket();
    
    // Clear lineup (players may have retired)
    gameState.selectedLineup = [];
    
    // Advance season
    gameState.season++;
    gameState.round = 1;
    
    // Update player values
    updateAllPlayerValues();
    
    return {
        playerPosition,
        isPlayerRelegated,
        relegatedTeams: relegatedTeams.map(t => t.name),
        prizeMoney
    };
}

// Check if season is over
function isSeasonOver() {
    return gameState.round > 34;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateFixtures, calculateTeamStrength, simulateMatch,
        processRoundMatches, processPlayerTeamRound, triggerRandomEvent,
        processEndOfSeason, isSeasonOver
    };
}
