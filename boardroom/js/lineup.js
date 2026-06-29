// ==================== LINEUP MANAGEMENT ====================

// Max players per position in a starting XI. Exactly one goalkeeper is allowed
// (and required) — this is what stops the old exploit of fielding two keepers to
// quietly rest two outfielders. Outfield caps are loose enough for any sensible
// shape (4-4-2, 3-5-2, 4-3-3, 5-3-2, …) but block nonsense lineups.
const LINEUP_POSITION_LIMITS = { GK: 1, DEF: 5, MID: 5, FWD: 4 };

// Count how many of each position are currently in the starting XI
function getLineupPositionCounts() {
    const team = getPlayerTeam();
    const counts = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    gameState.selectedLineup.forEach(id => {
        const p = team.players.find(pl => pl.id === id);
        if (p) counts[p.position] = (counts[p.position] || 0) + 1;
    });
    return counts;
}

// Toggle a player in/out of the starting lineup
function toggleLineup(playerId) {
    const index = gameState.selectedLineup.indexOf(playerId);

    if (index > -1) {
        // Remove from lineup
        gameState.selectedLineup.splice(index, 1);
        return true;
    }

    if (gameState.selectedLineup.length >= 11) {
        showNotification('Maximum 11 players in lineup!', true);
        return false;
    }

    // Position-limit check (e.g. only one goalkeeper)
    const team = getPlayerTeam();
    const player = team.players.find(p => p.id === playerId);
    if (player) {
        if (player.inRest) {
            showNotification(`${player.name} is in recovery and can't be selected this round.`, true);
            return false;
        }
        const limit = LINEUP_POSITION_LIMITS[player.position];
        const counts = getLineupPositionCounts();
        if (limit && counts[player.position] >= limit) {
            showNotification(player.position === 'GK'
                ? 'You can only start one goalkeeper!'
                : `Maximum ${limit} ${player.position} players in the lineup!`, true);
            return false;
        }
    }

    gameState.selectedLineup.push(playerId);
    return true;
}

// Calculate player's effective match rating
function calculatePlayerRating(player) {
    const energyFactor = 0.7 + (player.energy / 100) * 0.3;
    const conditionFactor = 0.8 + (player.condition / 100) * 0.2;
    return Math.floor(player.strength * energyFactor * conditionFactor);
}

// Auto-select best 11 based on overall rating
function autoSelectLineup() {
    const team = getPlayerTeam();
    
    // Sort by overall rating
    const sorted = [...team.players].sort((a, b) => {
        return calculatePlayerRating(b) - calculatePlayerRating(a);
    });
    
    gameState.selectedLineup = [];
    const needed = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
    
    Object.entries(needed).forEach(([pos, count]) => {
        const posPlayers = sorted.filter(p => 
            p.position === pos && !gameState.selectedLineup.includes(p.id)
        );
        for (let i = 0; i < count && i < posPlayers.length; i++) {
            gameState.selectedLineup.push(posPlayers[i].id);
        }
    });
    
    showNotification('Best XI selected based on overall rating!');
    return true;
}

// Auto-select freshest 11 (prioritize energy)
function autoSelectFreshXI() {
    const team = getPlayerTeam();
    
    // Sort by energy, then strength
    const sorted = [...team.players].sort((a, b) => {
        if (Math.abs(a.energy - b.energy) > 10) {
            return b.energy - a.energy;
        }
        return b.strength - a.strength;
    });
    
    gameState.selectedLineup = [];
    const needed = { GK: 1, DEF: 4, MID: 4, FWD: 2 };
    
    Object.entries(needed).forEach(([pos, count]) => {
        const posPlayers = sorted.filter(p => 
            p.position === pos && !gameState.selectedLineup.includes(p.id)
        );
        for (let i = 0; i < count && i < posPlayers.length; i++) {
            gameState.selectedLineup.push(posPlayers[i].id);
        }
    });
    
    showNotification('Freshest XI selected to conserve energy!');
    return true;
}

// Return a human-readable reason the lineup is invalid, or null if it's fine.
function getLineupError() {
    if (gameState.selectedLineup.length !== 11) {
        return 'You need exactly 11 players in the lineup!';
    }
    const counts = getLineupPositionCounts();
    if (counts.GK !== 1) {
        return 'You must start exactly one goalkeeper!';
    }
    return null;
}

// Check if lineup is valid (11 players, exactly one keeper)
function isLineupValid() {
    return getLineupError() === null;
}

// Get lineup players
function getLineupPlayers() {
    const team = getPlayerTeam();
    return team.players.filter(p => gameState.selectedLineup.includes(p.id));
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        toggleLineup, calculatePlayerRating, autoSelectLineup,
        autoSelectFreshXI, isLineupValid, getLineupError,
        getLineupPositionCounts, getLineupPlayers
    };
}
