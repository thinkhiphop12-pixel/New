// ==================== TRAINING SYSTEM ====================

// Select training type
function selectTrainingType(type) {
    if (!TRAINING_CONFIG[type]) {
        showNotification('Invalid training type!', true);
        return false;
    }
    
    gameState.selectedTrainingType = type;
    updateTrainingCostDisplay();
    return true;
}

// Toggle player in training queue
function togglePlayerTraining(playerId) {
    const index = gameState.trainingQueue.indexOf(playerId);
    
    if (index > -1) {
        gameState.trainingQueue.splice(index, 1);
    } else {
        // Check if player is already in training or resting
        const player = getPlayerTeam().players.find(p => p.id === playerId);
        if (player && player.inTraining) {
            showNotification('Player already scheduled for training!', true);
            return false;
        }
        if (player && player.inRest) {
            showNotification('Player is in recovery — can\'t also train!', true);
            return false;
        }
        gameState.trainingQueue.push(playerId);
    }
    
    updateTrainingCostDisplay();
    return true;
}

// Calculate total training cost
function calculateTrainingCost() {
    if (!gameState.selectedTrainingType) return 0;
    const config = TRAINING_CONFIG[gameState.selectedTrainingType];
    return config.cost * gameState.trainingQueue.length;
}

// Update training cost display
function updateTrainingCostDisplay() {
    const cost = calculateTrainingCost();
    const costEl = document.getElementById('trainingCost');
    const btnEl = document.getElementById('sendToTraining');
    
    if (costEl) costEl.textContent = cost.toLocaleString();
    if (btnEl) btnEl.disabled = cost === 0 || cost > gameState.budget;
}

// Send players to training
function sendToTraining() {
    if (!gameState.selectedTrainingType) {
        showNotification('Please select a training type!', true);
        return false;
    }
    
    const config = TRAINING_CONFIG[gameState.selectedTrainingType];
    const totalCost = calculateTrainingCost();
    
    if (totalCost > gameState.budget) {
        showNotification('Not enough budget!', true);
        return false;
    }
    
    if (gameState.trainingQueue.length === 0) {
        showNotification('No players selected for training!', true);
        return false;
    }
    
    // Deduct cost
    gameState.budget -= totalCost;
    
    // Mark players for training
    const team = getPlayerTeam();
    gameState.trainingQueue.forEach(playerId => {
        const player = team.players.find(p => p.id === playerId);
        if (player) {
            player.inTraining = true;
            player.trainingBonus = config.strengthGain;
            player.trainingEnergyCost = config.energyCost;
        }
    });
    
    showNotification(`${gameState.trainingQueue.length} players sent to ${gameState.selectedTrainingType} training!`);
    
    // Clear queue
    gameState.trainingQueue = [];
    updateTrainingCostDisplay();
    
    return true;
}

// Actual strength gained from a training session, given a base gain.
// Diminishing returns: the higher a player's strength and the older they are,
// the less they improve — so you can't grind an average full-back up to 90.
function effectiveTrainingGain(player, baseGain) {
    const s = player.strength;
    // Headroom shrinks steeply above ~75 rated
    let headroom;
    if (s < 65) headroom = 1.0;
    else if (s < 72) headroom = 0.7;
    else if (s < 78) headroom = 0.45;
    else if (s < 83) headroom = 0.28;
    else if (s < 87) headroom = 0.15;
    else headroom = 0.06;
    // Age curve — prospects develop, veterans barely move
    const a = player.age;
    const ageFactor = a <= 21 ? 1.2 : a <= 26 ? 1.0 : a <= 30 ? 0.65 : a <= 33 ? 0.35 : 0.15;
    // Cap: youth grow toward their hidden potential, seniors hit a soft 90 ceiling
    const cap = (player.isYouth && player.potential) ? player.potential : 90;
    const allowed = Math.max(0, cap - s);
    // A hired Head Coach raises the gain; no coach slightly reduces it.
    const coachMult = typeof coachingMultiplier === 'function' ? coachingMultiplier() : 1;
    const gain = baseGain * headroom * ageFactor * coachMult;
    return Math.min(Math.round(gain), allowed);
}

// Process training effects (called at end of round)
function processTrainingEffects() {
    const team = getPlayerTeam();

    team.players.forEach(player => {
        if (player.inTraining) {
            // Apply diminished strength gain (base gain stored in trainingBonus)
            const gain = effectiveTrainingGain(player, player.trainingBonus);
            player.strength = Math.min(99, player.strength + gain);
            player.lastTrainingGain = gain;

            // Deduct energy cost
            player.energy = Math.max(30, player.energy - player.trainingEnergyCost);

            // Reset training flags
            player.inTraining = false;
            player.trainingBonus = 0;
            player.trainingEnergyCost = 0;
        }
    });
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        selectTrainingType, togglePlayerTraining, calculateTrainingCost,
        updateTrainingCostDisplay, sendToTraining, processTrainingEffects,
        effectiveTrainingGain
    };
}
