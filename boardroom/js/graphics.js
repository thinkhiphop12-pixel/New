// ==================== GRAPHICS RENDERING ====================

// Get contrasting text color for a background
function getContrastColor(hexcolor) {
    const r = parseInt(hexcolor.slice(1, 3), 16);
    const g = parseInt(hexcolor.slice(3, 5), 16);
    const b = parseInt(hexcolor.slice(5, 7), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Render kit display (home and away)
function renderKitDisplay() {
    const container = document.getElementById('kitDisplay');
    if (!container) return;
    
    const sponsor = gameState.sponsors.shirt;
    const sponsorText = sponsor ? sponsor.name.split(' ')[0] : '';
    const primary = gameState.kit.primary;
    const secondary = gameState.kit.secondary;
    
    container.innerHTML = `
        <div class="kit-container">
            <div class="kit-label">HOME KIT</div>
            <svg class="kit-svg" viewBox="0 0 100 130">
                <!-- Shirt body -->
                <path d="M20 35 L20 100 L80 100 L80 35 L65 25 L55 30 L45 30 L35 25 Z" 
                      fill="${primary}" stroke="#000" stroke-width="2"/>
                <!-- Left sleeve -->
                <path d="M20 35 L5 50 L5 70 L20 65 Z" fill="${primary}" stroke="#000" stroke-width="2"/>
                <!-- Right sleeve -->
                <path d="M80 35 L95 50 L95 70 L80 65 Z" fill="${primary}" stroke="#000" stroke-width="2"/>
                <!-- Collar -->
                <path d="M35 25 L45 30 L50 28 L55 30 L65 25 L55 20 L45 20 Z" 
                      fill="${secondary}" stroke="#000" stroke-width="1"/>
                <!-- Center stripe -->
                <rect x="45" y="35" width="10" height="65" fill="${secondary}" opacity="0.9"/>
                <!-- Sponsor text -->
                <text x="50" y="65" text-anchor="middle" font-size="8" font-family="Arial" 
                      fill="${getContrastColor(primary)}" font-weight="bold">${sponsorText}</text>
                <!-- Shorts -->
                <path d="M25 102 L25 125 L45 125 L50 110 L55 125 L75 125 L75 102 Z" 
                      fill="${secondary}" stroke="#000" stroke-width="2"/>
            </svg>
        </div>
        <div class="kit-container">
            <div class="kit-label">AWAY KIT</div>
            <svg class="kit-svg" viewBox="0 0 100 130">
                <!-- Shirt body (colors swapped) -->
                <path d="M20 35 L20 100 L80 100 L80 35 L65 25 L55 30 L45 30 L35 25 Z" 
                      fill="${secondary}" stroke="#000" stroke-width="2"/>
                <!-- Left sleeve -->
                <path d="M20 35 L5 50 L5 70 L20 65 Z" fill="${secondary}" stroke="#000" stroke-width="2"/>
                <!-- Right sleeve -->
                <path d="M80 35 L95 50 L95 70 L80 65 Z" fill="${secondary}" stroke="#000" stroke-width="2"/>
                <!-- Collar -->
                <path d="M35 25 L45 30 L50 28 L55 30 L65 25 L55 20 L45 20 Z" 
                      fill="${primary}" stroke="#000" stroke-width="1"/>
                <!-- Center stripe -->
                <rect x="45" y="35" width="10" height="65" fill="${primary}" opacity="0.9"/>
                <!-- Sponsor text -->
                <text x="50" y="65" text-anchor="middle" font-size="8" font-family="Arial" 
                      fill="${getContrastColor(secondary)}" font-weight="bold">${sponsorText}</text>
                <!-- Shorts -->
                <path d="M25 102 L25 125 L45 125 L50 110 L55 125 L75 125 L75 102 Z" 
                      fill="${primary}" stroke="#000" stroke-width="2"/>
            </svg>
        </div>
    `;
}

// Update stadium graphics to show sponsors
function updateStadiumGraphics() {
    const stands = ['north', 'south', 'east', 'west'];
    
    stands.forEach(stand => {
        const sponsor = gameState.sponsors[stand];
        
        // Update all stadium stand elements (there might be multiple views)
        const elements = document.querySelectorAll(`[id^="stand-${stand}"], [id^="stand2-${stand}"]`);
        
        elements.forEach(el => {
            if (sponsor) {
                // Show sponsor name (first 2 words max)
                el.textContent = sponsor.name.split(' ').slice(0, 2).join(' ');
                el.classList.add('sponsored');
            } else {
                el.textContent = stand.toUpperCase();
                el.classList.remove('sponsored');
            }
        });
    });
}

// Render income breakdown
function renderIncomeBreakdown() {
    const container = document.getElementById('incomeBreakdown');
    if (!container) return;
    
    let html = '';
    
    // Sponsor income
    SPONSOR_TYPES.forEach(type => {
        const sponsor = gameState.sponsors[type];
        if (sponsor) {
            const payment = Math.floor(sponsor.amount / 34);
            html += `<div class="income-item">
                <span>${getSponsorTypeName(type)}</span>
                <span>€${payment.toLocaleString()}</span>
            </div>`;
        }
    });
    
    // Estimated match day income
    const matchRevenue = calculateProjectedRevenue();
    html += `<div class="income-item">
        <span>🎫 Match Day (home)</span>
        <span>~€${matchRevenue.toLocaleString()}</span>
    </div>`;
    
    // Total (estimated per round average)
    const sponsorIncome = calculateSponsorIncome();
    const avgIncome = sponsorIncome + Math.floor(matchRevenue / 2); // Half are home games
    
    html += `<div class="income-item" style="border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px;">
        <strong>Avg per Round</strong>
        <strong style="color: var(--accent-green);">€${avgIncome.toLocaleString()}</strong>
    </div>`;
    
    container.innerHTML = html;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        getContrastColor, renderKitDisplay, updateStadiumGraphics, renderIncomeBreakdown
    };
}
