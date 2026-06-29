// ==================== SPONSOR SYSTEM ====================

// Get display name for sponsor type
function getSponsorTypeName(type) {
    const names = {
        shirt: '👕 Shirt Sponsor',
        north: '🏟️ North Stand',
        south: '🏟️ South Stand',
        east: '🏟️ East Stand',
        west: '🏟️ West Stand'
    };
    return names[type] || type;
}

// Generate sponsor offers
function generateSponsorOffers() {
    gameState.sponsorOffers = [];
    const usedNames = new Set();
    
    // Get currently used sponsor names
    Object.values(gameState.sponsors).forEach(s => {
        if (s) usedNames.add(s.name);
    });
    
    // Generate 6 random offers
    for (let i = 0; i < 6; i++) {
        const type = SPONSOR_TYPES[Math.floor(Math.random() * SPONSOR_TYPES.length)];
        
        let name;
        do {
            name = SPONSOR_NAMES[Math.floor(Math.random() * SPONSOR_NAMES.length)];
        } while (usedNames.has(name));
        usedNames.add(name);
        
        const baseAmount = SPONSOR_BASE_VALUES[type];
        const duration = 1 + Math.floor(Math.random() * 3);
        
        gameState.sponsorOffers.push({
            id: generateId(),
            name: name,
            type: type,
            amount: baseAmount + Math.floor(Math.random() * baseAmount * 0.5),
            duration: duration,
            roundsRemaining: null
        });
    }
}

// Accept a sponsor offer
function acceptSponsor(sponsorId) {
    const offer = gameState.sponsorOffers.find(s => s.id === sponsorId);
    if (!offer) return false;
    
    // Check if slot is available
    if (gameState.sponsors[offer.type]) {
        showNotification(`${getSponsorTypeName(offer.type)} slot already filled!`, true);
        return false;
    }
    
    // Pay signing bonus immediately (25% of annual value)
    const signingBonus = Math.floor(offer.amount * 0.25);
    gameState.budget += signingBonus;
    
    // Set contract duration in rounds
    offer.roundsRemaining = offer.duration * 34;
    
    // Assign sponsor to slot
    gameState.sponsors[offer.type] = offer;
    
    // Remove from offers
    gameState.sponsorOffers = gameState.sponsorOffers.filter(s => s.id !== sponsorId);
    
    showNotification(`Signed ${offer.name} as ${offer.type} sponsor! Signing bonus: €${signingBonus.toLocaleString()}`);
    return true;
}

// Process sponsor payments and expirations (called each round)
function processSponsorPayments() {
    let totalIncome = 0;
    const breakdown = {};
    
    SPONSOR_TYPES.forEach(type => {
        const sponsor = gameState.sponsors[type];
        if (sponsor) {
            // Calculate per-round payment
            const payment = Math.floor(sponsor.amount / 34);
            totalIncome += payment;
            breakdown[getSponsorTypeName(type)] = payment;
            
            // Decrement remaining rounds
            sponsor.roundsRemaining--;
            
            // Check for expiration
            if (sponsor.roundsRemaining <= 0) {
                showNotification(`${sponsor.name} (${type}) sponsorship has ended!`);
                gameState.sponsors[type] = null;
            }
        }
    });
    
    return { totalIncome, breakdown };
}

// Calculate total sponsor income per round
function calculateSponsorIncome() {
    let total = 0;
    SPONSOR_TYPES.forEach(type => {
        const sponsor = gameState.sponsors[type];
        if (sponsor) {
            total += Math.floor(sponsor.amount / 34);
        }
    });
    return total;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getSponsorTypeName, generateSponsorOffers, acceptSponsor,
        processSponsorPayments, calculateSponsorIncome
    };
}
