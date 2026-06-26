// ==================== LINEUP MANAGEMENT ====================

// Toggle a player in/out of the starting lineup
function toggleLineup(playerId) {
    const index = gameState.selectedLineup.indexOf(playerId);
    
    if (index > -1) {
        // Remove from lineup
        gameState.selectedLineup.splice(index, 1);
    } else if (gameState.selectedLineup.length < 11) {
        // Add to lineup
        gameState.selectedLineup.push(playerId);
    } else {
        showNotification('Maximum 11 players in lineup!', true);
        return false;
    }
    
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

// Check if lineup is valid (has 11 players)
function isLineupValid() {
    return gameState.selectedLineup.length === 11;
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
        autoSelectFreshXI, isLineupValid, getLineupPlayers
    };
}
