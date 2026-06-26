// ==================== MAIN GAME CONTROLLER ====================

// Initialize new game
function initGame() {
    generateTeams();
    populateTeamSelect();
    setupEventListeners();
}

// Populate team selection grid
function populateTeamSelect() {
    const container = document.getElementById('teamSelect');
    if (!container) return;
    
    container.innerHTML = '';
    
    gameState.teams.forEach((team, index) => {
        const div = document.createElement('div');
        div.className = 'team-option';
        div.textContent = team.name;
        div.onclick = () => selectTeam(index);
        container.appendChild(div);
    });
}

// Handle team selection
function selectTeam(index) {
    document.querySelectorAll('.team-option').forEach((el, i) => {
        el.classList.toggle('selected', i === index);
    });
    gameState.playerTeamIndex = index;
    document.getElementById('startGame').disabled = false;
}

// Start new game
function startGame() {
    // Set kit colors from picker
    gameState.kit.primary = document.getElementById('primaryColor').value;
    gameState.kit.secondary = document.getElementById('secondaryColor').value;
    
    // Boost player team
    boostPlayerTeam();
    
    // Update all player values
    updateAllPlayerValues();
    
    // Auto-select lineup
    autoSelectLineup();
    
    // Generate fixtures, sponsors, market
    generateFixtures();
    generateSponsorOffers();
    generateTransferMarket();
    
    // Show game screen
    document.getElementById('introScreen').classList.add('hidden');
    document.getElementById('gameContainer').style.display = 'block';
    
    updateAllUI();
}

// End current round
function endRound() {
    // Check if season is over first
    if (isSeasonOver()) {
        showSeasonEndModal();
        return;
    }
    
    // Validate lineup
    if (!isLineupValid()) {
        showNotification('You need 11 players in the lineup!', true);
        return;
    }
    
    // Show match modal
    const modal = document.getElementById('matchModal');
    modal.classList.add('active');
    document.getElementById('matchRound').textContent = gameState.round;
    document.getElementById('matchAnimation').classList.add('active');
    document.getElementById('matchResults').style.display = 'none';
    
    // Simulate after delay for dramatic effect
    setTimeout(() => {
        // Process all matches
        const { playerMatch, results } = processRoundMatches();
        
        // Process player team effects
        processPlayerTeamRound(playerMatch);
        
        // Hide animation, show results
        document.getElementById('matchAnimation').classList.remove('active');
        document.getElementById('matchResults').style.display = 'block';
        
        // Display player's match result
        if (playerMatch) {
            const { homeTeam, awayTeam, result } = playerMatch;
            
            document.getElementById('homeTeam').textContent = homeTeam.name;
            document.getElementById('awayTeam').textContent = awayTeam.name;
            document.getElementById('matchScore').textContent = `${result.homeGoals} - ${result.awayGoals}`;
            
            document.getElementById('homeTeam').classList.toggle('winner', result.homeGoals > result.awayGoals);
            document.getElementById('awayTeam').classList.toggle('winner', result.awayGoals > result.homeGoals);
        }
        
        // Display other results
        const otherResults = results.filter(r => 
            r.homeTeam !== getPlayerTeam() && r.awayTeam !== getPlayerTeam()
        );
        
        let otherHtml = '<div style="display: grid; gap: 6px;">';
        otherResults.forEach(r => {
            otherHtml += `<div style="background: var(--bg-dark); padding: 8px 12px; border-radius: 4px; font-size: 16px;">
                <span style="color: ${r.result.homeGoals > r.result.awayGoals ? 'var(--accent-green)' : 'var(--text-primary)'}">${r.homeTeam.name}</span>
                <span style="color: var(--accent-gold); margin: 0 8px;">${r.result.homeGoals} - ${r.result.awayGoals}</span>
                <span style="color: ${r.result.awayGoals > r.result.homeGoals ? 'var(--accent-green)' : 'var(--text-primary)'}">${r.awayTeam.name}</span>
            </div>`;
        });
        otherHtml += '</div>';
        document.getElementById('otherResults').innerHTML = otherHtml;
        
        // Display income summary
        let incomeHtml = '<div style="display: grid; gap: 4px;">';
        Object.entries(gameState.lastIncomeBreakdown).forEach(([key, value]) => {
            incomeHtml += `<div style="display: flex; justify-content: space-between;">
                <span>${key}</span>
                <span style="color: var(--accent-green);">+€${value.toLocaleString()}</span>
            </div>`;
        });
        incomeHtml += `<div style="display: flex; justify-content: space-between; border-top: 1px solid var(--border-color); padding-top: 8px; margin-top: 8px;">
            <strong>Total Income</strong>
            <strong style="color: var(--accent-green);">+€${gameState.weeklyIncome.toLocaleString()}</strong>
        </div></div>`;
        incomeHtml += `<p style="margin-top: 16px;">📊 New League Position: <strong style="color: var(--accent-gold);">${getLeaguePosition(gameState.playerTeamIndex)}</strong></p>`;
        
        // Show random event if one occurred
        if (gameState.lastRandomEvent) {
            const evt = gameState.lastRandomEvent;
            const evtColor = evt.type === 'positive' ? 'var(--accent-green)' : (evt.type === 'negative' ? 'var(--accent-red)' : 'var(--accent-gold)');
            incomeHtml += `<div style="margin-top: 16px; padding: 12px; background: var(--bg-dark); border-radius: 8px; border-left: 4px solid ${evtColor};">
                <strong style="color: ${evtColor};">${evt.title}</strong>
                <p style="margin-top: 4px; color: var(--text-secondary);">${evt.message}</p>
            </div>`;
            gameState.lastRandomEvent = null; // Clear after showing
        }
        
        document.getElementById('summaryContent').innerHTML = incomeHtml;
        
        // Advance round
        gameState.round++;
        
    }, 1800);
}

// Show season end modal
function showSeasonEndModal() {
    const seasonResult = processEndOfSeason();
    
    const modal = document.getElementById('seasonEndModal');
    if (!modal) {
        createSeasonEndModal();
    }
    
    // Populate season end content
    let positionClass = seasonResult.playerPosition <= 4 ? 'top' : (seasonResult.playerPosition >= 16 ? 'low' : 'mid');
    let positionMessage = '';
    if (seasonResult.playerPosition === 1) positionMessage = '🏆 CHAMPIONS! Incredible season!';
    else if (seasonResult.playerPosition <= 4) positionMessage = '🌟 Qualified for Europe! Great job!';
    else if (seasonResult.playerPosition <= 10) positionMessage = '👍 Solid mid-table finish.';
    else if (seasonResult.playerPosition <= 14) positionMessage = '😅 Survived! Room for improvement.';
    else positionMessage = '😰 Narrowly avoided the drop!';
    
    let html = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2 style="font-family: 'Press Start 2P', cursive; font-size: 16px; color: var(--accent-gold); margin-bottom: 20px;">
                SEASON ${gameState.season - 1} COMPLETE!
            </h2>
            <div style="font-size: 80px; margin: 20px 0;">
                ${seasonResult.playerPosition === 1 ? '🏆' : (seasonResult.playerPosition <= 4 ? '🥈' : '⚽')}
            </div>
            <p style="font-size: 28px; color: var(--accent-green); margin-bottom: 10px;">
                Final Position: <span class="position-badge ${positionClass}" style="font-size: 20px; padding: 10px 16px;">${seasonResult.playerPosition}</span>
            </p>
            <p style="color: var(--text-secondary); font-size: 20px;">${positionMessage}</p>
        </div>
        
        <div style="display: grid; gap: 16px; margin-bottom: 20px;">
            <div style="background: var(--bg-card); padding: 16px; border-radius: 8px;">
                <h4 style="color: var(--accent-gold); margin-bottom: 8px;">💰 Prize Money</h4>
                <p style="font-size: 24px; color: var(--accent-green);">€${seasonResult.prizeMoney.toLocaleString()}</p>
            </div>
            
            <div style="background: var(--bg-card); padding: 16px; border-radius: 8px;">
                <h4 style="color: var(--accent-red); margin-bottom: 8px;">📉 Relegated Teams</h4>
                <p style="color: var(--text-secondary);">${seasonResult.relegatedTeams.join(', ')}</p>
                <p style="color: var(--text-secondary); margin-top: 8px; font-size: 14px;">New teams have been promoted to replace them!</p>
            </div>
            
            <div style="background: var(--bg-card); padding: 16px; border-radius: 8px;">
                <h4 style="color: var(--accent-blue); margin-bottom: 8px;">🔄 Season Updates</h4>
                <ul style="color: var(--text-secondary); margin-left: 20px;">
                    <li>All players aged +1 year</li>
                    <li>Energy & condition refreshed</li>
                    <li>New fixtures generated</li>
                    <li>Transfer market refreshed</li>
                </ul>
            </div>
        </div>
    `;
    
    document.getElementById('seasonEndContent').innerHTML = html;
    document.getElementById('seasonEndModal').classList.add('active');
}

// Create season end modal if it doesn't exist
function createSeasonEndModal() {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.id = 'seasonEndModal';
    modal.innerHTML = `
        <div class="modal" style="max-width: 600px;">
            <div id="seasonEndContent"></div>
            <div class="btn-group" style="justify-content: center; margin-top: 20px;">
                <button class="btn gold" style="font-size: 18px; padding: 16px 40px;" onclick="closeSeasonEndModal()">
                    START SEASON ${gameState.season}
                </button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

// Close season end modal
function closeSeasonEndModal() {
    document.getElementById('seasonEndModal').classList.remove('active');
    
    // Auto-select new lineup (old one cleared due to possible retirements)
    autoSelectLineup();
    
    updateAllUI();
    showNotification(`Season ${gameState.season} has begun! Good luck!`);
}

// Close match modal and update UI
function closeMatchModal() {
    document.getElementById('matchModal').classList.remove('active');
    updateAllUI();
    
    // Check if season just ended
    if (isSeasonOver()) {
        setTimeout(() => showSeasonEndModal(), 500);
    }
}

// Setup all event listeners
function setupEventListeners() {
    // File load listeners
    document.getElementById('loadFileInput')?.addEventListener('change', (e) => {
        if (e.target.files[0]) loadGame(e.target.files[0]);
    });
    
    document.getElementById('loadGameInput')?.addEventListener('change', (e) => {
        if (e.target.files[0]) loadGame(e.target.files[0]);
    });
    
    // Start game button
    document.getElementById('startGame')?.addEventListener('click', startGame);
    
    // Navigation tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${tab.dataset.panel}`)?.classList.add('active');
        });
    });
    
    // Training type selection
    document.querySelectorAll('.training-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.training-option').forEach(o => o.classList.remove('selected'));
            option.classList.add('selected');
            selectTrainingType(option.dataset.type);
        });
    });
    
    // Send to training button
    document.getElementById('sendToTraining')?.addEventListener('click', () => {
        sendToTraining();
        updateAllUI();
    });
    
    // Ticket price slider
    document.getElementById('ticketPrice')?.addEventListener('input', (e) => {
        setTicketPrice(parseInt(e.target.value));
        document.getElementById('ticketPriceValue').textContent = e.target.value;
        updateStadiumProjections();
    });
    
    // End round button
    document.getElementById('endRoundBtn')?.addEventListener('click', endRound);
}

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', initGame);

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        initGame, populateTeamSelect, selectTeam, startGame,
        endRound, closeMatchModal, setupEventListeners
    };
}
