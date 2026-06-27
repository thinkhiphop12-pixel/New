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
        // Check if player is already in training
        const player = getPlayerTeam().players.find(p => p.id === playerId);
        if (player && player.inTraining) {
            showNotification('Player already scheduled for training!', true);
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

// Process training effects (called at end of round)
function processTrainingEffects() {
    const team = getPlayerTeam();
    
    team.players.forEach(player => {
        if (player.inTraining) {
            // Apply strength bonus
            player.strength = Math.min(99, player.strength + player.trainingBonus);
            
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
        updateTrainingCostDisplay, sendToTraining, processTrainingEffects
    };
}
