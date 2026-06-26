// ==================== BACKROOM STAFF SYSTEM ====================
// Borrowed from OpenFootManager's staff model, simplified for Boardroom.
// A Head Coach multiplies the strength a player gains in training; a Physio
// multiplies energy/condition recovery and cuts injury risk. Both draw a wage
// each round, so quality staff are a real budget decision.

const STAFF_FIRST_NAMES = ['Carlo', 'Diego', 'Marcelo', 'Jürgen', 'Pep', 'José',
    'Antonio', 'Unai', 'Thomas', 'Zinedine', 'Roberto', 'Hansi', 'Mauricio',
    'Ange', 'Xabi', 'Arsène', 'Rafa', 'Luis', 'Frank', 'Gareth'];
const STAFF_LAST_NAMES = ['Moreno', 'Bianchi', 'Vogts', 'Lindholm', 'Costa',
    'Romano', 'Keller', 'Sørensen', 'Dubois', 'Almeida', 'Novak', 'Petrov',
    'Hughes', 'Larsson', 'Ferreira', 'Marchetti', 'Bauer', 'Ibarra', 'Kovač', 'Walsh'];

// Quality tiers a generated staff member can fall into, with a wage band.
function randomStaffName() {
    const f = STAFF_FIRST_NAMES[Math.floor(Math.random() * STAFF_FIRST_NAMES.length)];
    const l = STAFF_LAST_NAMES[Math.floor(Math.random() * STAFF_LAST_NAMES.length)];
    return `${f} ${l}`;
}

// Wage scales steeply with quality so an elite specialist is a commitment.
function staffWageFor(quality) {
    return Math.round((8000 + Math.pow(quality / 100, 2) * 90000) / 1000) * 1000;
}

function generateStaffMember(role) {
    const quality = 45 + Math.floor(Math.random() * 50); // 45–94
    return {
        id: generateId(),
        name: randomStaffName(),
        role: role, // 'coach' | 'physio'
        quality: quality,
        wage: staffWageFor(quality)
    };
}

// Refresh the pool of hireable free-agent staff.
function generateStaffMarket() {
    gameState.staffMarket = [];
    for (let i = 0; i < 3; i++) gameState.staffMarket.push(generateStaffMember('coach'));
    for (let i = 0; i < 3; i++) gameState.staffMarket.push(generateStaffMember('physio'));
}

// Training multiplier from the hired coach: 0.9 (none) → 0.9–1.4 by quality.
function coachingMultiplier() {
    const coach = gameState.staff && gameState.staff.coach;
    if (!coach) return 0.9;
    return 0.9 + (coach.quality / 100) * 0.5;
}

// Recovery multiplier from the hired physio: 1.0 (none) → 1.0–1.4 by quality.
function physioMultiplier() {
    const physio = gameState.staff && gameState.staff.physio;
    if (!physio) return 1.0;
    return 1.0 + (physio.quality / 100) * 0.4;
}

// Total staff wages per round (an expense in processPlayerTeamRound).
function totalStaffWages() {
    let total = 0;
    if (gameState.staff.coach) total += gameState.staff.coach.wage;
    if (gameState.staff.physio) total += gameState.staff.physio.wage;
    return total;
}

function hireStaff(staffId) {
    const member = gameState.staffMarket.find(s => s.id === staffId);
    if (!member) return false;
    // Releasing the incumbent (if any) returns them to the market.
    const current = gameState.staff[member.role];
    if (current) gameState.staffMarket.push(current);
    gameState.staff[member.role] = member;
    gameState.staffMarket = gameState.staffMarket.filter(s => s.id !== staffId);
    showNotification(`Hired ${member.name} as ${member.role === 'coach' ? 'Head Coach' : 'Physio'} (€${member.wage.toLocaleString()}/round).`);
    return true;
}

function releaseStaff(role) {
    const member = gameState.staff[role];
    if (!member) return false;
    gameState.staffMarket.push(member);
    gameState.staff[role] = null;
    showNotification(`Released ${member.name}.`);
    return true;
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateStaffMarket, generateStaffMember, coachingMultiplier,
        physioMultiplier, totalStaffWages, hireStaff, releaseStaff, staffWageFor
    };
}
