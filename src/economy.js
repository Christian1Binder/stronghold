export const TRADE_LOT_SIZE = 5;

export const RESOURCE_DEFS = {
    wood: {
        label: 'Holz',
        shortLabel: 'Holz',
        baseBuy: 8,
        baseSell: 4,
        color: '#8f5b32'
    },
    stone: {
        label: 'Stein',
        shortLabel: 'Stein',
        baseBuy: 14,
        baseSell: 7,
        color: '#9ca3a8'
    },
    iron: {
        label: 'Eisen',
        shortLabel: 'Eisen',
        baseBuy: 32,
        baseSell: 16,
        color: '#61727c'
    },
    food: {
        label: 'Nahrung',
        shortLabel: 'Nahrung',
        baseBuy: 9,
        baseSell: 4,
        color: '#d3a72f'
    }
};

export const BUILDING_DEFS = {
    house: {
        label: 'Hütte',
        description: 'Schafft Wohnraum für 8 Bürger.',
        category: 'economy',
        cost: { wood: 35 },
        populationCapacity: 8,
        workers: 0,
        production: null
    },
    woodcutter: {
        label: 'Holzfällerhütte',
        description: 'Erzeugt 16 Holz pro Minute.',
        category: 'economy',
        cost: { wood: 25 },
        workers: 1,
        production: { resource: 'wood', perMinute: 16 },
        priority: 2
    },
    appleFarm: {
        label: 'Apfelgarten',
        description: 'Erzeugt 24 Nahrung pro Minute.',
        category: 'economy',
        cost: { wood: 30 },
        workers: 1,
        production: { resource: 'food', perMinute: 24 },
        priority: 1
    },
    quarry: {
        label: 'Steinbruch',
        description: 'Erzeugt 10 Stein pro Minute.',
        category: 'economy',
        cost: { wood: 40 },
        workers: 2,
        production: { resource: 'stone', perMinute: 10 },
        priority: 3
    },
    ironMine: {
        label: 'Eisenmine',
        description: 'Erzeugt 5 Eisen pro Minute.',
        category: 'economy',
        cost: { wood: 55 },
        workers: 2,
        production: { resource: 'iron', perMinute: 5 },
        priority: 4
    },
    market: {
        label: 'Marktplatz',
        description: 'Ermöglicht Handel und automatische Handelsaufträge.',
        category: 'economy',
        cost: { wood: 60 },
        workers: 1,
        production: null,
        unique: true
    },
    wall: {
        label: 'Mauer',
        description: 'Ein einzelnes, solides Mauersegment.',
        category: 'defense',
        cost: { stone: 5 },
        workers: 0,
        production: null
    },
    tower: {
        label: 'Wachturm',
        description: 'Stärkt die Verteidigung des Burgbereichs.',
        category: 'defense',
        cost: { stone: 35 },
        workers: 0,
        production: null
    }
};

const DEFAULT_AUTOMATION = {
    wood: { enabled: false, min: 50, max: 250 },
    stone: { enabled: false, min: 30, max: 160 },
    iron: { enabled: false, min: 10, max: 80 },
    food: { enabled: false, min: 80, max: 240 }
};

export function createInitialEconomyState() {
    return {
        version: 2,
        resources: {
            wood: 160,
            stone: 80,
            iron: 20,
            food: 140,
            gold: 500
        },
        resourceFractions: {
            wood: 0,
            stone: 0,
            iron: 0,
            food: 0,
            gold: 0
        },
        buildingCounts: {
            keep: 1,
            stockpile: 1,
            granary: 1,
            market: 1,
            house: 1,
            woodcutter: 0,
            appleFarm: 0,
            quarry: 0,
            ironMine: 0,
            wall: 0,
            tower: 0
        },
        activeBuildings: {},
        population: {
            current: 8,
            capacity: 16,
            employed: 1,
            idle: 7,
            arrivalProgress: 0
        },
        popularity: 70,
        ration: 'normal',
        taxLevel: 0,
        marketPressure: {
            wood: 0,
            stone: 0,
            iron: 0,
            food: 0
        },
        automation: structuredClone(DEFAULT_AUTOMATION),
        automationGoldReserve: 100,
        automationTimer: 0,
        lastTrade: null,
        elapsedSeconds: 0
    };
}

export function hydrateEconomyState(saved) {
    const fresh = createInitialEconomyState();
    if (!saved || typeof saved !== 'object') return fresh;

    const next = {
        ...fresh,
        ...saved,
        resources: { ...fresh.resources, ...(saved.resources || {}) },
        resourceFractions: { ...fresh.resourceFractions, ...(saved.resourceFractions || {}) },
        buildingCounts: { ...fresh.buildingCounts, ...(saved.buildingCounts || {}) },
        population: { ...fresh.population, ...(saved.population || {}) },
        marketPressure: { ...fresh.marketPressure, ...(saved.marketPressure || {}) },
        automation: {}
    };

    for (const key of Object.keys(RESOURCE_DEFS)) {
        next.automation[key] = {
            ...DEFAULT_AUTOMATION[key],
            ...(saved.automation?.[key] || {})
        };
        next.resources[key] = Math.max(0, Number(next.resources[key]) || 0);
        next.marketPressure[key] = clamp(Number(next.marketPressure[key]) || 0, -0.35, 0.65);
    }

    next.resources.gold = Math.max(0, Number(next.resources.gold) || 0);
    next.popularity = clamp(Number(next.popularity) || 50, 0, 100);
    next.taxLevel = clamp(Math.round(Number(next.taxLevel) || 0), -1, 3);
    next.ration = ['half', 'normal', 'double'].includes(next.ration) ? next.ration : 'normal';
    next.version = 2;
    recalculatePopulation(next);
    return next;
}

export function formatCost(cost) {
    return Object.entries(cost)
        .map(([resource, amount]) => `${amount} ${RESOURCE_DEFS[resource]?.shortLabel || resource}`)
        .join(' · ');
}

export function canAfford(state, cost) {
    return Object.entries(cost).every(([resource, amount]) => (state.resources[resource] || 0) >= amount);
}

export function spendCost(state, cost) {
    if (!canAfford(state, cost)) return false;
    for (const [resource, amount] of Object.entries(cost)) {
        state.resources[resource] -= amount;
    }
    return true;
}

export function refundBuilding(state, type, factor = 0.5) {
    const def = BUILDING_DEFS[type];
    if (!def) return {};

    const refund = {};
    for (const [resource, amount] of Object.entries(def.cost)) {
        const returned = Math.max(1, Math.floor(amount * factor));
        state.resources[resource] += returned;
        refund[resource] = returned;
    }
    removeBuilding(state, type);
    return refund;
}

export function addBuilding(state, type) {
    state.buildingCounts[type] = (state.buildingCounts[type] || 0) + 1;
    recalculatePopulation(state);
}

export function removeBuilding(state, type) {
    state.buildingCounts[type] = Math.max(0, (state.buildingCounts[type] || 0) - 1);
    recalculatePopulation(state);
}

export function getTradePrice(state, resource, action) {
    const def = RESOURCE_DEFS[resource];
    if (!def) return 0;
    const pressure = clamp(state.marketPressure[resource] || 0, -0.35, 0.65);
    const base = action === 'buy' ? def.baseBuy : def.baseSell;
    return Math.max(1, Math.round(base * (1 + pressure)));
}

export function trade(state, resource, action, requestedLots = 1, source = 'manual') {
    if (!RESOURCE_DEFS[resource]) return { success: false, reason: 'Unbekannte Ware.' };
    if ((state.buildingCounts.market || 0) < 1) {
        return { success: false, reason: 'Baut zuerst einen Marktplatz.' };
    }

    const price = getTradePrice(state, resource, action);
    const requested = Math.max(0, Math.floor(Number(requestedLots) || 0));
    if (requested < 1) return { success: false, reason: 'Der Handelsauftrag ist leer.' };
    let lots = requested;

    if (action === 'buy') {
        lots = Math.min(lots, Math.floor(state.resources.gold / (price * TRADE_LOT_SIZE)));
        if (lots < 1) return { success: false, reason: 'Nicht genug Gold.' };
        const quantity = lots * TRADE_LOT_SIZE;
        const gold = price * quantity;
        state.resources.gold -= gold;
        state.resources[resource] += quantity;
        state.marketPressure[resource] = clamp(state.marketPressure[resource] + 0.035 * lots, -0.35, 0.65);
        state.lastTrade = { action, resource, quantity, gold, source, at: state.elapsedSeconds };
        return { success: true, action, resource, quantity, gold, lots, source };
    }

    if (action === 'sell') {
        lots = Math.min(lots, Math.floor(state.resources[resource] / TRADE_LOT_SIZE));
        if (lots < 1) return { success: false, reason: `Mindestens ${TRADE_LOT_SIZE} Einheiten werden benötigt.` };
        const quantity = lots * TRADE_LOT_SIZE;
        const gold = price * quantity;
        state.resources[resource] -= quantity;
        state.resources.gold += gold;
        state.marketPressure[resource] = clamp(state.marketPressure[resource] - 0.03 * lots, -0.35, 0.65);
        state.lastTrade = { action, resource, quantity, gold, source, at: state.elapsedSeconds };
        return { success: true, action, resource, quantity, gold, lots, source };
    }

    return { success: false, reason: 'Ungültiger Handelsauftrag.' };
}

export function setAutomationRule(state, resource, patch) {
    if (!RESOURCE_DEFS[resource]) return;
    const current = state.automation[resource];
    const next = { ...current, ...patch };
    next.min = Math.max(0, Math.round(Number(next.min) || 0));
    next.max = Math.max(next.min + TRADE_LOT_SIZE, Math.round(Number(next.max) || 0));
    next.enabled = Boolean(next.enabled);
    state.automation[resource] = next;
}

export function economyTick(state, seconds = 1) {
    const dt = clamp(Number(seconds) || 0, 0, 10);
    if (dt <= 0) return [];

    state.elapsedSeconds += dt;
    const events = [];
    recalculatePopulation(state);

    for (const [type, activeCount] of Object.entries(state.activeBuildings)) {
        const def = BUILDING_DEFS[type];
        if (!def?.production || activeCount < 1) continue;
        addFractionalResource(
            state,
            def.production.resource,
            (def.production.perMinute / 60) * activeCount * dt
        );
    }

    const rationMultipliers = { half: 0.55, normal: 1, double: 1.55 };
    const rationPopularity = { half: -10, normal: 0, double: 10 };
    const ration = rationMultipliers[state.ration] || 1;
    const requestedFood = state.population.current * 0.035 * ration * dt;
    const foodTaken = Math.min(state.resources.food, requestedFood);
    state.resources.food -= foodTaken;

    const fedRatio = requestedFood > 0 ? foodTaken / requestedFood : 1;
    const taxPenalty = state.taxLevel * 7;
    const employmentBonus = state.population.idle > 0 ? 2 : 0;
    const targetPopularity = clamp(
        58 + rationPopularity[state.ration] - taxPenalty + employmentBonus - (1 - fedRatio) * 55,
        0,
        100
    );
    const popularitySmoothing = Math.min(1, dt / 18);
    state.popularity += (targetPopularity - state.popularity) * popularitySmoothing;

    if (state.taxLevel > 0) {
        addFractionalResource(state, 'gold', state.population.current * state.taxLevel * 0.014 * dt);
    } else if (state.taxLevel < 0) {
        const bribe = Math.min(state.resources.gold, state.population.current * 0.01 * dt);
        state.resources.gold -= bribe;
    }

    if (state.popularity >= 60 && state.resources.food >= 10 && state.population.current < state.population.capacity) {
        state.population.arrivalProgress += dt / 30;
        while (state.population.arrivalProgress >= 1 && state.population.current < state.population.capacity) {
            state.population.current += 1;
            state.population.arrivalProgress -= 1;
            events.push({ type: 'population', message: 'Ein neuer Bürger ist in die Burg gezogen.' });
        }
    } else if (state.popularity < 25 && state.population.current > 2) {
        state.population.arrivalProgress -= dt / 35;
        if (state.population.arrivalProgress <= -1) {
            state.population.current -= 1;
            state.population.arrivalProgress = 0;
            events.push({ type: 'population', message: 'Ein Bürger hat die Burg verlassen.' });
        }
    } else {
        state.population.arrivalProgress *= Math.pow(0.98, dt);
    }

    for (const resource of Object.keys(RESOURCE_DEFS)) {
        state.marketPressure[resource] *= Math.pow(0.992, dt);
    }

    state.automationTimer += dt;
    if (state.automationTimer >= 5) {
        state.automationTimer %= 5;
        events.push(...runAutomation(state));
    }

    recalculatePopulation(state);
    return events;
}

export function runAutomation(state) {
    const events = [];
    if ((state.buildingCounts.market || 0) < 1) return events;

    for (const resource of Object.keys(RESOURCE_DEFS)) {
        const rule = state.automation[resource];
        if (!rule?.enabled) continue;
        const stock = state.resources[resource];

        if (stock < rule.min && state.resources.gold > state.automationGoldReserve) {
            const missing = rule.min - stock;
            const desiredLots = Math.min(4, Math.ceil(missing / TRADE_LOT_SIZE));
            const price = getTradePrice(state, resource, 'buy');
            const affordableGold = Math.max(0, state.resources.gold - state.automationGoldReserve);
            const affordableLots = Math.floor(affordableGold / (price * TRADE_LOT_SIZE));
            if (affordableLots > 0) {
                const result = trade(state, resource, 'buy', Math.min(desiredLots, affordableLots), 'auto');
                if (result.success) events.push({ type: 'trade', result });
            }
        } else if (stock > rule.max) {
            const surplus = stock - rule.max;
            const desiredLots = Math.min(4, Math.floor(surplus / TRADE_LOT_SIZE));
            if (desiredLots > 0) {
                const result = trade(state, resource, 'sell', desiredLots, 'auto');
                if (result.success) events.push({ type: 'trade', result });
            }
        }
    }

    return events;
}

export function recalculatePopulation(state) {
    const houses = state.buildingCounts.house || 0;
    state.population.capacity = 8 + houses * 8;
    state.population.current = clamp(Math.round(state.population.current), 0, state.population.capacity);

    let available = state.population.current;
    const active = {};
    const staffedTypes = Object.entries(BUILDING_DEFS)
        .filter(([, def]) => def.workers > 0)
        .sort((a, b) => (a[1].priority ?? 99) - (b[1].priority ?? 99));

    for (const [type, def] of staffedTypes) {
        const total = state.buildingCounts[type] || 0;
        const possible = def.workers > 0 ? Math.floor(available / def.workers) : total;
        const running = Math.min(total, possible);
        active[type] = running;
        available -= running * def.workers;
    }

    state.activeBuildings = active;
    state.population.idle = Math.max(0, available);
    state.population.employed = state.population.current - state.population.idle;
}

function addFractionalResource(state, resource, amount) {
    const total = (state.resourceFractions[resource] || 0) + amount;
    const whole = Math.floor(total + 1e-9);
    state.resourceFractions[resource] = total - whole;
    state.resources[resource] = (state.resources[resource] || 0) + whole;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}
