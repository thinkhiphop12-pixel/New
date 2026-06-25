// ==================== STADIUM MANAGEMENT ====================

// Calculate expected attendance based on ticket price
function calculateExpectedAttendance() {
    const price = gameState.stadium.ticketPrice;
    const capacity = gameState.stadium.capacity;
    
    // Higher prices = lower attendance rate (min 40%)
    const attendanceRate = Math.max(0.4, 1 - (price - 15) * 0.008);
    return Math.floor(capacity * attendanceRate);
}

// Calculate projected match day revenue
function calculateProjectedRevenue() {
    const attendance = calculateExpectedAttendance();
    return attendance * gameState.stadium.ticketPrice;
}

// Set ticket price
function setTicketPrice(price) {
    if (price < 10 || price > 100) {
        showNotification('Ticket price must be between €10 and €100!', true);
        return false;
    }
    
    gameState.stadium.ticketPrice = price;
    return true;
}

// Expand stadium capacity
function expandStadium(seats) {
    const cost = STADIUM_EXPANSIONS[seats];
    
    if (!cost) {
        showNotification('Invalid expansion option!', true);
        return false;
    }
    
    if (gameState.budget < cost) {
        showNotification('Not enough budget for stadium expansion!', true);
        return false;
    }
    
    gameState.budget -= cost;
    gameState.stadium.capacity += seats;
    
    showNotification(`Stadium expanded by ${seats.toLocaleString()} seats!`);
    return true;
}

// Update stadium projections display
function updateStadiumProjections() {
    const attendanceEl = document.getElementById('expectedAttendance');
    const revenueEl = document.getElementById('projectedRevenue');
    const capacityEl = document.getElementById('currentCapacity');
    
    if (attendanceEl) {
        attendanceEl.textContent = calculateExpectedAttendance().toLocaleString();
    }
    if (revenueEl) {
        revenueEl.textContent = calculateProjectedRevenue().toLocaleString();
    }
    if (capacityEl) {
        capacityEl.textContent = gameState.stadium.capacity.toLocaleString();
    }
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateExpectedAttendance, calculateProjectedRevenue,
        setTicketPrice, expandStadium, updateStadiumProjections
    };
}
