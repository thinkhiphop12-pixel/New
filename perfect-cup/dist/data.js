/**
 * Perfect Cup data layer — loads squads & cards, exposes simple getters.
 */
const FAMILY = {
    Argentina: 'south_america', Brazil: 'south_america', Uruguay: 'south_america',
    France: 'europe', Germany: 'europe', Italy: 'europe', Spain: 'europe',
    England: 'europe', Netherlands: 'europe', Portugal: 'europe', Belgium: 'europe',
    Croatia: 'europe', Poland: 'europe', Japan: 'asia', 'South Korea': 'asia',
    USA: 'north_america', Mexico: 'north_america', Morocco: 'africa', Senegal: 'africa',
};
const FLAGS = {
    Argentina: '🇦🇷', Brazil: '🇧🇷', France: '🇫🇷', Germany: '🇩🇪', Italy: '🇮🇹',
    Spain: '🇪🇸', England: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', Netherlands: '🇳🇱', Portugal: '🇵🇹', Belgium: '🇧🇪',
    Croatia: '🇭🇷', Uruguay: '🇺🇾', Mexico: '🇲🇽', USA: '🇺🇸', Japan: '🇯🇵',
    'South Korea': '🇰🇷', Morocco: '🇲🇦', Senegal: '🇸🇳',
};
let squadsCache = [];
let cardsCache = new Map();
function familyFor(country) {
    return FAMILY[country] ?? country.toLowerCase().replace(/\s+/g, '_');
}
function flagFor(country) {
    return FLAGS[country] ?? '🏳️';
}
function toPosition(p) {
    const fam = p.p?.[0] ?? '';
    if (fam === 'GK' || p.sp === 'GK')
        return 'GK';
    if (fam === 'DF' || /CB|RB|LB|DF|WB/.test(p.sp))
        return 'DEF';
    if (fam === 'MF' || /CM|DM|AM|LM|RM|MF|CDM|CAM/.test(p.sp))
        return 'MID';
    return 'FWD';
}
function tierFromPct(pct) {
    if (pct >= 0.75)
        return 'legendary';
    if (pct >= 0.5)
        return 'strong';
    if (pct >= 0.25)
        return 'medium';
    return 'weak';
}
function indexSquadsAndCards(squads, cards) {
    squadsCache = squads;
    cardsCache.clear();
    for (const card of cards) {
        const list = cardsCache.get(card.squadId) ?? [];
        list.push(card);
        cardsCache.set(card.squadId, list);
    }
}
/** Build squads + cards from raw players.json shape. */
function buildFromPlayers(raw) {
    const weights = raw.squad_weights;
    const vals = Object.values(weights);
    const minW = Math.min(...vals);
    const maxW = Math.max(...vals);
    const range = maxW - minW || 1;
    const bySquad = {};
    for (const p of raw.players) {
        const id = `${p.country}|${p.year}`;
        (bySquad[id] || (bySquad[id] = [])).push(p);
    }
    const squads = [];
    const cards = [];
    for (const [id, players] of Object.entries(bySquad)) {
        const [countryName, yearStr] = id.split('|');
        const weight = weights[id] ?? 1;
        const strengthPct = (weight - minW) / range;
        const avg = players.reduce((s, p) => s + p.o, 0) / players.length;
        squads.push({
            id,
            countryName,
            tournamentYear: parseInt(yearStr, 10),
            flag: flagFor(countryName),
            strength: Math.round(avg),
            strengthPct,
            tier: tierFromPct(strengthPct),
            countryFamilyId: familyFor(countryName),
            eligible: true,
            weight,
        });
        const squadCards = players
            .sort((a, b) => b.o - a.o)
            .slice(0, 18)
            .map(p => ({
            id: `${id}|${p.n}`,
            personKey: p.n,
            squadId: id,
            name: p.n,
            position: toPosition(p),
            rating: p.o,
        }));
        cards.push(...squadCards);
    }
    squads.sort((a, b) => b.weight - a.weight);
    return { squads, cards };
}
/**
 * Load squad & card data. Tries pre-built squads.json first, falls back to players.json.
 */
export async function loadData(squadsUrl = '../data/squads.json', playersUrl = '../data/players.json') {
    try {
        const res = await fetch(squadsUrl);
        if (res.ok) {
            const data = await res.json();
            indexSquadsAndCards(data.squads ?? [], data.cards ?? []);
            return { squads: squadsCache, cardsBySquad: cardsCache };
        }
    }
    catch {
        // fall through to players.json
    }
    const res = await fetch(playersUrl);
    if (!res.ok)
        throw new Error(`Failed to load data: ${res.status}`);
    const raw = await res.json();
    const built = buildFromPlayers(raw);
    indexSquadsAndCards(built.squads, built.cards);
    return { squads: squadsCache, cardsBySquad: cardsCache };
}
export function getAllSquads() {
    return squadsCache;
}
export function getSquad(id) {
    return squadsCache.find(s => s.id === id);
}
export function getSquadCards(squadId) {
    return cardsCache.get(squadId) ?? [];
}
