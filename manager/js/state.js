// ==================== GAME STATE MANAGEMENT ====================

// Initialize default game state
function createInitialState() {
    return {
        playerTeamIndex: 0,
        round: 1,
        season: 1,
        budget: 5000000,
        weeklyIncome: 0,
        lastIncomeBreakdown: {},
        teams: [],
        transferMarket: [],
        sponsors: {
            shirt: null,
            north: null,
            south: null,
            east: null,
            west: null
        },
        sponsorOffers: [],
        stadium: {
            capacity: 15000,
            ticketPrice: 25
        },
        kit: {
            primary: '#ff0000',
            secondary: '#ffffff'
        },
        fixtures: [],
        selectedLineup: [],
        trainingQueue: [],
        selectedTrainingType: null,
        messageLog: [] // New: stores all notifications
    };
}

// Global game state
let gameState = createInitialState();

// Reset game state
function resetGameState() {
    gameState = createInitialState();
}

// Get current player team
function getPlayerTeam() {
    return gameState.teams[gameState.playerTeamIndex];
}

// Get league position for a team
function getLeaguePosition(teamIndex) {
    const sorted = [...gameState.teams].sort((a, b) => {
        if (b.stats.points !== a.stats.points) return b.stats.points - a.stats.points;
        const gdA = a.stats.goalsFor - a.stats.goalsAgainst;
        const gdB = b.stats.goalsFor - b.stats.goalsAgainst;
        if (gdB !== gdA) return gdB - gdA;
        return b.stats.goalsFor - a.stats.goalsFor;
    });
    return sorted.findIndex(t => t === gameState.teams[teamIndex]) + 1;
}

// ==================== SAVE/LOAD SYSTEM ====================

function saveGame() {
    const saveData = JSON.stringify(gameState, null, 2);
    const blob = new Blob([saveData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `rfm-save-s${gameState.season}r${gameState.round}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    showNotification('Game saved successfully!');
}

function loadGame(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const loadedState = JSON.parse(e.target.result);
            gameState = loadedState;
            
            document.getElementById('introScreen').classList.add('hidden');
            document.getElementById('gameContainer').style.display = 'block';
            
            updateAllUI();
            showNotification('Game loaded successfully!');
        } catch (error) {
            showNotification('Error loading save file!', true);
            console.error(error);
        }
    };
    reader.readAsText(file);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        gameState, createInitialState, resetGameState, getPlayerTeam,
        getLeaguePosition, saveGame, loadGame
    };
}
