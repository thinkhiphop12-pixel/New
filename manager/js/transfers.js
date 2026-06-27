// ==================== TRANSFER SYSTEM ====================

// Generate transfer market players
function generateTransferMarket() {
    gameState.transferMarket = [];
    
    for (let i = 0; i < 10; i++) {
        const positions = ['GK', 'DEF', 'MID', 'FWD'];
        const player = generatePlayer(positions[Math.floor(Math.random() * positions.length)]);
        player.value = calculatePlayerValue(player);
        // Asking price is 10-50% above value
        player.askingPrice = Math.floor(player.value * (1.1 + Math.random() * 0.4));
        gameState.transferMarket.push(player);
    }
}

// Buy a player from the transfer market
function buyPlayer(playerId) {
    const player = gameState.transferMarket.find(p => p.id === playerId);
    if (!player) {
        showNotification('Player not found!', true);
        return false;
    }
    
    if (gameState.budget < player.askingPrice) {
        showNotification('Not enough budget!', true);
        return false;
    }
    
    const price = player.askingPrice;
    gameState.budget -= price;
    
    // Remove asking price and add to squad
    delete player.askingPrice;
    getPlayerTeam().players.push(player);
    
    // Remove from market
    gameState.transferMarket = gameState.transferMarket.filter(p => p.id !== playerId);
    
    showNotification(`Signed ${player.name} for €${price.toLocaleString()}!`);
    return true;
}

// Sell a player from the squad
function sellPlayer(playerId) {
    const team = getPlayerTeam();
    const player = team.players.find(p => p.id === playerId);
    
    if (!player) {
        showNotification('Player not found!', true);
        return false;
    }
    
    if (team.players.length <= 14) {
        showNotification('Cannot sell - minimum squad size is 14!', true);
        return false;
    }
    
    // Sell price is 70-90% of value
    const sellPrice = Math.floor(player.value * (0.7 + Math.random() * 0.2));
    gameState.budget += sellPrice;
    
    // Remove from squad
    team.players = team.players.filter(p => p.id !== playerId);
    
    // Remove from lineup if selected
    gameState.selectedLineup = gameState.selectedLineup.filter(id => id !== playerId);
    
    showNotification(`Sold ${player.name} for €${sellPrice.toLocaleString()}!`);
    return true;
}

// Refresh transfer market (costs money)
function refreshMarket() {
    const refreshCost = 100000;
    
    if (gameState.budget < refreshCost) {
        showNotification('Not enough budget to refresh market!', true);
        return false;
    }
    
    gameState.budget -= refreshCost;
    generateTransferMarket();
    showNotification('Transfer market refreshed!');
    return true;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateTransferMarket, buyPlayer, sellPlayer, refreshMarket
    };
}
