// ==================== UI UPDATES ====================

// Show notification and log it
function showNotification(message, isError = false) {
    const container = document.getElementById('notificationContainer');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `notification ${isError ? 'error' : ''}`;
    notification.textContent = message;
    container.appendChild(notification);
    
    setTimeout(() => notification.remove(), 3500);
    
    // Add to message log
    const logEntry = {
        message: message,
        isError: isError,
        season: gameState.season,
        round: gameState.round,
        timestamp: Date.now()
    };
    
    gameState.messageLog.unshift(logEntry); // Add to front
    
    // Keep only last 100 messages
    if (gameState.messageLog.length > 100) {
        gameState.messageLog = gameState.messageLog.slice(0, 100);
    }
    
    // Update ticker display
    updateMessageTicker();
}

// Update message ticker on overview page
function updateMessageTicker() {
    const ticker = document.getElementById('messageTicker');
    if (!ticker) return;
    
    if (gameState.messageLog.length === 0) {
        ticker.innerHTML = '<p style="color: var(--text-secondary); text-align: center;">No messages yet...</p>';
        return;
    }
    
    let html = '';
    gameState.messageLog.forEach((entry, idx) => {
        const bgColor = entry.isError ? 'rgba(255, 68, 68, 0.1)' : (idx === 0 ? 'rgba(0, 255, 136, 0.1)' : 'transparent');
        const borderColor = entry.isError ? 'var(--accent-red)' : 'var(--accent-green)';
        
        html += `<div class="ticker-message" style="
            padding: 10px 12px;
            margin-bottom: 8px;
            background: ${bgColor};
            border-left: 3px solid ${borderColor};
            border-radius: 0 4px 4px 0;
            ${idx === 0 ? 'animation: tickerPulse 0.5s ease;' : ''}
        ">
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 10px;">
                <span style="flex: 1; color: ${entry.isError ? 'var(--accent-red)' : 'var(--text-primary)'};">${entry.message}</span>
                <span style="color: var(--text-secondary); font-size: 14px; white-space: nowrap;">S${entry.season} R${entry.round}</span>
            </div>
        </div>`;
    });
    
    ticker.innerHTML = html;
}

// Table sorting state
const tableSortState = {};

// Make a table sortable
function makeTableSortable(tableId, dataFetcher, renderer) {
    tableSortState[tableId] = {
        column: null,
        direction: 'asc',
        dataFetcher: dataFetcher,
        renderer: renderer
    };
}

// Sort table by column
function sortTable(tableId, columnKey, columnIndex) {
    const state = tableSortState[tableId];
    if (!state) return;
    
    // Toggle direction if same column, otherwise default to desc for numbers, asc for strings
    if (state.column === columnKey) {
        state.direction = state.direction === 'asc' ? 'desc' : 'asc';
    } else {
        state.column = columnKey;
        state.direction = 'desc'; // Default to descending for new column
    }
    
    // Update header indicators
    const table = document.getElementById(tableId);
    if (table) {
        table.querySelectorAll('th').forEach((th, idx) => {
            th.classList.remove('sort-asc', 'sort-desc');
            if (idx === columnIndex) {
                th.classList.add(state.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        });
    }
    
    // Re-render the table
    if (state.renderer) {
        state.renderer();
    }
}

// Get sorted data for a table
function getSortedData(tableId, data, columns) {
    const state = tableSortState[tableId];
    if (!state || !state.column) return data;
    
    const colConfig = columns.find(c => c.key === state.column);
    if (!colConfig) return data;
    
    return [...data].sort((a, b) => {
        let valA = colConfig.getValue ? colConfig.getValue(a) : a[state.column];
        let valB = colConfig.getValue ? colConfig.getValue(b) : b[state.column];
        
        // Handle strings vs numbers
        if (typeof valA === 'string') {
            valA = valA.toLowerCase();
            valB = valB.toLowerCase();
            const cmp = valA.localeCompare(valB);
            return state.direction === 'asc' ? cmp : -cmp;
        } else {
            const cmp = valA - valB;
            return state.direction === 'asc' ? cmp : -cmp;
        }
    });
}

// Update header stats
function updateHeaderStats() {
    const team = getPlayerTeam();
    
    document.getElementById('teamName').textContent = team.name;
    document.getElementById('currentSeason').textContent = gameState.season;
    document.getElementById('currentRound').textContent = gameState.round;
    document.getElementById('budget').textContent = gameState.budget.toLocaleString();
    document.getElementById('weeklyIncome').textContent = gameState.weeklyIncome.toLocaleString();
    document.getElementById('leaguePos').textContent = getLeaguePosition(gameState.playerTeamIndex);
}

// Update squad table
function updateSquadTable() {
    const team = getPlayerTeam();
    const tbody = document.querySelector('#squadTable tbody');
    const thead = document.querySelector('#squadTable thead');
    if (!tbody || !thead) return;
    
    // Define sortable columns
    const columns = [
        { key: 'index', label: '#', getValue: (p, i) => i },
        { key: 'name', label: 'NAME', getValue: p => p.name },
        { key: 'position', label: 'POS', getValue: p => p.position },
        { key: 'age', label: 'AGE', getValue: p => p.age },
        { key: 'energy', label: 'ENERGY', getValue: p => p.energy },
        { key: 'condition', label: 'COND', getValue: p => p.condition },
        { key: 'strength', label: 'STR', getValue: p => p.strength },
        { key: 'value', label: 'VALUE', getValue: p => p.value },
        { key: 'status', label: 'STATUS', getValue: p => gameState.selectedLineup.includes(p.id) ? 1 : 0 }
    ];
    
    // Update header with sort indicators
    thead.innerHTML = `<tr>${columns.map((col, idx) => 
        `<th class="sortable" onclick="sortTable('squadTable', '${col.key}', ${idx})" style="cursor: pointer;">
            ${col.label} <span class="sort-indicator"></span>
        </th>`
    ).join('')}</tr>`;
    
    // Get base sorted data (default by position)
    let sorted;
    const state = tableSortState['squadTable'];
    if (state && state.column) {
        sorted = getSortedData('squadTable', team.players, columns);
    } else {
        // Default sort by position
        const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
        sorted = [...team.players].sort((a, b) => posOrder[a.position] - posOrder[b.position]);
    }
    
    let html = '';
    sorted.forEach((player, i) => {
        const inLineup = gameState.selectedLineup.includes(player.id);
        const status = player.inTraining ? '🏃 Training' : (inLineup ? '⚽ Starting' : '🪑 Bench');
        const youthBadge = player.isYouth ? '<span style="color: var(--accent-gold); margin-left: 4px;">⭐</span>' : '';
        
        html += `<tr style="${inLineup ? 'background: rgba(0, 255, 136, 0.08);' : ''}">
            <td>${i + 1}</td>
            <td>${player.name}${youthBadge}</td>
            <td>${player.position}</td>
            <td>${player.age}</td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill energy ${player.energy < 50 ? 'low' : ''}" style="width: ${player.energy}%"></div>
                </div>
                <small>${player.energy}%</small>
            </td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill condition ${player.condition < 50 ? 'low' : ''}" style="width: ${player.condition}%"></div>
                </div>
                <small>${player.condition}%</small>
            </td>
            <td>
                <div class="progress-bar">
                    <div class="progress-fill strength" style="width: ${player.strength}%"></div>
                </div>
                <small>${player.strength}</small>
            </td>
            <td>€${player.value.toLocaleString()}</td>
            <td>${status}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Initialize squad table sorting
makeTableSortable('squadTable', () => getPlayerTeam().players, updateSquadTable);

// Update lineup selection panel
function updateLineupPanel() {
    const team = getPlayerTeam();
    const container = document.getElementById('lineupSelection');
    if (!container) return;
    
    const posOrder = { GK: 0, DEF: 1, MID: 2, FWD: 3 };
    const sorted = [...team.players].sort((a, b) => posOrder[a.position] - posOrder[b.position]);
    
    let html = `<p style="color: var(--accent-gold); margin-bottom: 16px;">Selected: ${gameState.selectedLineup.length}/11</p>`;
    html += '<table class="data-table"><thead><tr><th>✓</th><th>NAME</th><th>POS</th><th>ENERGY</th><th>COND</th><th>STR</th><th>RATING</th></tr></thead><tbody>';
    
    sorted.forEach(player => {
        const inLineup = gameState.selectedLineup.includes(player.id);
        const rating = calculatePlayerRating(player);
        const energyColor = player.energy < 50 ? 'var(--accent-red)' : (player.energy < 70 ? 'var(--accent-gold)' : 'var(--accent-green)');
        
        html += `<tr style="${inLineup ? 'background: rgba(0, 255, 136, 0.1);' : ''}">
            <td>
                <input type="checkbox" ${inLineup ? 'checked' : ''} ${player.inTraining ? 'disabled' : ''} 
                    onchange="toggleLineup('${player.id}'); updateAllUI();" style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td style="color: ${energyColor}">${player.energy}%</td>
            <td>${player.condition}%</td>
            <td>${player.strength}</td>
            <td style="color: var(--accent-gold);">${rating}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
}

// Update transfer market
function updateTransferMarket() {
    // Available players
    const marketBody = document.querySelector('#marketTable tbody');
    if (marketBody) {
        let html = '';
        gameState.transferMarket.forEach(player => {
            html += `<tr>
                <td>${player.name}</td>
                <td>${player.position}</td>
                <td>${player.age}</td>
                <td>${player.strength}</td>
                <td>€${player.askingPrice.toLocaleString()}</td>
                <td><button class="btn small" onclick="buyPlayer('${player.id}'); updateAllUI();" 
                    ${gameState.budget < player.askingPrice ? 'disabled' : ''}>BUY</button></td>
            </tr>`;
        });
        marketBody.innerHTML = html || '<tr><td colspan="6" style="text-align: center;">No players available</td></tr>';
    }
    
    // Sellable players
    const team = getPlayerTeam();
    const sellBody = document.querySelector('#sellTable tbody');
    if (sellBody) {
        let html = '';
        team.players.forEach(player => {
            const sellPrice = Math.floor(player.value * 0.8);
            html += `<tr>
                <td>${player.name}</td>
                <td>${player.position}</td>
                <td>${player.strength}</td>
                <td>€${sellPrice.toLocaleString()}</td>
                <td><button class="btn small danger" onclick="sellPlayer('${player.id}'); updateAllUI();">SELL</button></td>
            </tr>`;
        });
        sellBody.innerHTML = html;
    }
}

// Update training panel
function updateTrainingPanel() {
    const team = getPlayerTeam();
    const container = document.getElementById('trainingPlayerList');
    if (!container) return;
    
    let html = '<table class="data-table"><thead><tr><th>✓</th><th>NAME</th><th>POS</th><th>STR</th><th>ENERGY</th><th>STATUS</th></tr></thead><tbody>';
    
    team.players.forEach(player => {
        const inQueue = gameState.trainingQueue.includes(player.id);
        html += `<tr>
            <td>
                <input type="checkbox" ${inQueue ? 'checked' : ''} ${player.inTraining ? 'disabled' : ''} 
                    onchange="togglePlayerTraining('${player.id}'); updateAllUI();" style="width: 18px; height: 18px; cursor: pointer;">
            </td>
            <td>${player.name}</td>
            <td>${player.position}</td>
            <td>${player.strength}</td>
            <td>${player.energy}%</td>
            <td>${player.inTraining ? '🏃 Scheduled' : 'Available'}</td>
        </tr>`;
    });
    
    html += '</tbody></table>';
    container.innerHTML = html;
    
    updateTrainingCostDisplay();
}

// Update sponsors panel
function updateSponsorsPanel() {
    // Shirt sponsor section
    const shirtSection = document.getElementById('shirtSponsorSection');
    if (shirtSection) {
        const sponsor = gameState.sponsors.shirt;
        if (sponsor) {
            shirtSection.innerHTML = `<div class="card sponsor-card active">
                <div class="card-title">👕 ${sponsor.name}</div>
                <div class="card-value">€${sponsor.amount.toLocaleString()}/season</div>
                <div class="sponsor-duration">${sponsor.roundsRemaining} rounds remaining</div>
            </div>`;
        } else {
            shirtSection.innerHTML = `<div class="card sponsor-card">
                <div class="card-title">👕 No Shirt Sponsor</div>
                <p style="color: var(--text-secondary);">Accept an offer below</p>
            </div>`;
        }
    }
    
    // Stadium sponsors section
    const stadiumSection = document.getElementById('stadiumSponsorsSection');
    if (stadiumSection) {
        let html = '';
        ['north', 'south', 'east', 'west'].forEach(stand => {
            const sponsor = gameState.sponsors[stand];
            const standName = stand.charAt(0).toUpperCase() + stand.slice(1);
            
            if (sponsor) {
                html += `<div class="card sponsor-card active">
                    <div class="card-title">🏟️ ${standName}: ${sponsor.name}</div>
                    <div class="card-value">€${sponsor.amount.toLocaleString()}/season</div>
                    <div class="sponsor-duration">${sponsor.roundsRemaining} rounds remaining</div>
                </div>`;
            } else {
                html += `<div class="card sponsor-card">
                    <div class="card-title">🏟️ ${standName} Stand</div>
                    <p style="color: var(--text-secondary);">No sponsor</p>
                </div>`;
            }
        });
        stadiumSection.innerHTML = html;
    }
    
    // Available offers
    const offersContainer = document.getElementById('sponsorOffers');
    if (offersContainer) {
        let html = '';
        gameState.sponsorOffers.forEach(offer => {
            const canAccept = !gameState.sponsors[offer.type];
            const signingBonus = Math.floor(offer.amount * 0.25);
            
            html += `<div class="card sponsor-card">
                <div class="card-title">${getSponsorTypeName(offer.type)}</div>
                <p style="font-size: 20px; margin-bottom: 8px;">${offer.name}</p>
                <div class="card-value">€${offer.amount.toLocaleString()}/season</div>
                <p style="color: var(--accent-green);">Signing bonus: €${signingBonus.toLocaleString()}</p>
                <div class="sponsor-duration">${offer.duration} season${offer.duration > 1 ? 's' : ''}</div>
                <button class="btn gold" style="margin-top: 12px;" 
                    onclick="acceptSponsor('${offer.id}'); updateAllUI();" ${canAccept ? '' : 'disabled'}>
                    ${canAccept ? 'ACCEPT' : 'SLOT FILLED'}
                </button>
            </div>`;
        });
        offersContainer.innerHTML = html || '<p style="color: var(--text-secondary);">No offers available. Check back next round!</p>';
    }
}

// Update league table
function updateLeagueTable() {
    const tbody = document.querySelector('#leagueTable tbody');
    const thead = document.querySelector('#leagueTable thead');
    if (!tbody || !thead) return;
    
    // Define sortable columns
    const columns = [
        { key: 'position', label: 'POS', getValue: t => getLeaguePosition(gameState.teams.indexOf(t)) },
        { key: 'name', label: 'TEAM', getValue: t => t.name },
        { key: 'played', label: 'P', getValue: t => t.stats.played },
        { key: 'won', label: 'W', getValue: t => t.stats.won },
        { key: 'drawn', label: 'D', getValue: t => t.stats.drawn },
        { key: 'lost', label: 'L', getValue: t => t.stats.lost },
        { key: 'goalsFor', label: 'GF', getValue: t => t.stats.goalsFor },
        { key: 'goalsAgainst', label: 'GA', getValue: t => t.stats.goalsAgainst },
        { key: 'goalDiff', label: 'GD', getValue: t => t.stats.goalsFor - t.stats.goalsAgainst },
        { key: 'points', label: 'PTS', getValue: t => t.stats.points }
    ];
    
    // Update header with sort indicators
    thead.innerHTML = `<tr>${columns.map((col, idx) => 
        `<th class="sortable" onclick="sortTable('leagueTable', '${col.key}', ${idx})" style="cursor: pointer;">
            ${col.label} <span class="sort-indicator"></span>
        </th>`
    ).join('')}</tr>`;
    
    // Default sort by points/GD/GF (standard league sorting)
    let sorted;
    const state = tableSortState['leagueTable'];
    if (state && state.column) {
        sorted = getSortedData('leagueTable', gameState.teams, columns);
    } else {
        sorted = [...gameState.teams].sort((a, b) => {
            if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
            const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
            const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
            if (gdB !== gdA) return gdB - gdA;
            return b.stats.goalsFor - a.stats.goalsFor;
        });
    }
    
    let html = '';
    sorted.forEach((team, i) => {
        // Calculate actual position based on points (for display)
        const actualSorted = [...gameState.teams].sort((a, b) => {
            if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
            const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
            const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
            if (gdB !== gdA) return gdB - gdA;
            return b.stats.goalsFor - a.stats.goalsFor;
        });
        const pos = actualSorted.indexOf(team) + 1;
        const gd = team.stats.goalsFor - team.stats.goalsAgainst;
        const isPlayer = team === getPlayerTeam();
        
        let posClass = 'mid';
        if (pos <= 4) posClass = 'top';
        else if (pos >= 16) posClass = 'low';
        
        html += `<tr class="${isPlayer ? 'player-team' : ''}">
            <td><span class="position-badge ${posClass}">${pos}</span></td>
            <td>${team.name}</td>
            <td>${team.stats.played}</td>
            <td>${team.stats.won}</td>
            <td>${team.stats.drawn}</td>
            <td>${team.stats.lost}</td>
            <td>${team.stats.goalsFor}</td>
            <td>${team.stats.goalsAgainst}</td>
            <td>${gd > 0 ? '+' : ''}${gd}</td>
            <td style="font-weight: bold;">${team.stats.points}</td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
}

// Initialize league table sorting
makeTableSortable('leagueTable', () => gameState.teams, updateLeagueTable);

// Update fixtures panel
function updateFixturesPanel() {
    const container = document.getElementById('fixturesList');
    if (!container) return;
    
    const playerTeamIdx = gameState.playerTeamIndex;
    
    // Show nearby rounds
    const start = Math.max(0, gameState.round - 2);
    const end = Math.min(34, gameState.round + 5);
    
    let html = '';
    
    for (let roundIndex = start; roundIndex < end; roundIndex++) {
        const round = gameState.fixtures[roundIndex];
        if (!round) continue;
        
        const roundNum = roundIndex + 1;
        const isCurrentRound = roundNum === gameState.round;
        const isPast = roundNum < gameState.round;
        
        html += `<div style="margin-bottom: 16px; padding: 16px; background: var(--bg-card); border-radius: 8px; 
            ${isCurrentRound ? 'border: 2px solid var(--accent-green);' : ''}">
            <h3 style="color: ${isCurrentRound ? 'var(--accent-green)' : (isPast ? 'var(--text-secondary)' : 'var(--accent-gold)')}; 
                margin-bottom: 12px; font-size: 16px;">
                Round ${roundNum} ${isCurrentRound ? '◀ NEXT' : ''}
            </h3>
            <div style="display: grid; gap: 6px;">`;
        
        round.forEach(fixture => {
            const homeTeam = gameState.teams[fixture.home];
            const awayTeam = gameState.teams[fixture.away];
            const isPlayerMatch = fixture.home === playerTeamIdx || fixture.away === playerTeamIdx;
            
            html += `<div style="background: var(--bg-dark); padding: 8px 12px; border-radius: 4px; font-size: 16px; 
                ${isPlayerMatch ? 'border-left: 3px solid var(--accent-green);' : ''}">
                <span style="color: ${fixture.played && fixture.homeGoals > fixture.awayGoals ? 'var(--accent-green)' : 'var(--text-primary)'}">
                    ${homeTeam.name}
                </span>
                <span style="color: var(--accent-gold); margin: 0 8px;">
                    ${fixture.played ? `${fixture.homeGoals} - ${fixture.awayGoals}` : 'vs'}
                </span>
                <span style="color: ${fixture.played && fixture.awayGoals > fixture.homeGoals ? 'var(--accent-green)' : 'var(--text-primary)'}">
                    ${awayTeam.name}
                </span>
            </div>`;
        });
        
        html += '</div></div>';
    }
    
    container.innerHTML = html;
}

// Update all UI elements
function updateAllUI() {
    updateHeaderStats();
    renderKitDisplay();
    updateStadiumGraphics();
    renderIncomeBreakdown();
    updateSquadTable();
    updateLineupPanel();
    updateTransferMarket();
    updateTrainingPanel();
    updateSponsorsPanel();
    updateStadiumProjections();
    updateLeagueTable();
    updateFixturesPanel();
    updateMessageTicker();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        showNotification, updateHeaderStats, updateSquadTable, updateLineupPanel,
        updateTransferMarket, updateTrainingPanel, updateSponsorsPanel,
        updateLeagueTable, updateFixturesPanel, updateAllUI
    };
}
