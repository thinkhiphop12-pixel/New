// ==================== RECOVERY / REST SYSTEM ====================
// A paid alternative to passive bench recovery: assign tired players to a
// recovery programme to get them match-fit faster. A resting player sits out
// the upcoming match (handled in processPlayerTeamRound) and gets a bigger
// energy/condition boost than benching alone. Mirrors the training system.

// Select recovery type
function selectRestType(type) {
    if (!REST_CONFIG[type]) {
        showNotification('Invalid recovery type!', true);
        return false;
    }
    gameState.selectedRestType = type;
    updateRestCostDisplay();
    return true;
}

// Toggle a player in/out of the recovery queue
function togglePlayerRest(playerId) {
    const index = gameState.restQueue.indexOf(playerId);

    if (index > -1) {
        gameState.restQueue.splice(index, 1);
    } else {
        const player = getPlayerTeam().players.find(p => p.id === playerId);
        if (player && player.inTraining) {
            showNotification('Player is already in training — can\'t also rest!', true);
            return false;
        }
        if (player && player.inRest) {
            showNotification('Player already scheduled for recovery!', true);
            return false;
        }
        gameState.restQueue.push(playerId);
        // Resting a player means they sit out — drop them from the lineup.
        const lineupIdx = gameState.selectedLineup.indexOf(playerId);
        if (lineupIdx > -1) gameState.selectedLineup.splice(lineupIdx, 1);
    }

    updateRestCostDisplay();
    return true;
}

// Calculate total recovery cost
function calculateRestCost() {
    if (!gameState.selectedRestType) return 0;
    const config = REST_CONFIG[gameState.selectedRestType];
    return config.cost * gameState.restQueue.length;
}

// Update recovery cost display
function updateRestCostDisplay() {
    const cost = calculateRestCost();
    const costEl = document.getElementById('restCost');
    const btnEl = document.getElementById('sendToRest');

    if (costEl) costEl.textContent = cost.toLocaleString();
    if (btnEl) btnEl.disabled = gameState.restQueue.length === 0 || !gameState.selectedRestType || cost > gameState.budget;
}

// Send players to recovery
function sendToRest() {
    if (!gameState.selectedRestType) {
        showNotification('Please select a recovery type!', true);
        return false;
    }

    const config = REST_CONFIG[gameState.selectedRestType];
    const totalCost = calculateRestCost();

    if (totalCost > gameState.budget) {
        showNotification('Not enough budget!', true);
        return false;
    }

    if (gameState.restQueue.length === 0) {
        showNotification('No players selected for recovery!', true);
        return false;
    }

    gameState.budget -= totalCost;

    const team = getPlayerTeam();
    gameState.restQueue.forEach(playerId => {
        const player = team.players.find(p => p.id === playerId);
        if (player) {
            player.inRest = true;
            player.restType = gameState.selectedRestType;
        }
    });

    showNotification(`${gameState.restQueue.length} player(s) sent to ${gameState.selectedRestType} recovery!`);

    gameState.restQueue = [];
    updateRestCostDisplay();
    return true;
}

// Process recovery effects (called at end of round, before passive recovery).
// Resting players take their programme's boost instead of normal bench recovery.
function processRestEffects() {
    const team = getPlayerTeam();

    const physioMult = typeof physioMultiplier === 'function' ? physioMultiplier() : 1;
    team.players.forEach(player => {
        if (player.inRest) {
            const config = REST_CONFIG[player.restType] || REST_CONFIG.physio;
            player.energy = Math.min(100, player.energy + Math.round(config.energyGain * physioMult));
            player.condition = Math.min(100, player.condition + Math.round(config.conditionGain * physioMult));
            player.inRest = false;
            player.restType = null;
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        selectRestType, togglePlayerRest, calculateRestCost,
        updateRestCostDisplay, sendToRest, processRestEffects
    };
}
