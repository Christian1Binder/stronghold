import test from 'node:test';
import assert from 'node:assert/strict';

import {
    TRADE_LOT_SIZE,
    createInitialEconomyState,
    economyTick,
    getTradePrice,
    recalculatePopulation,
    runAutomation,
    setAutomationRule,
    trade
} from './economy.js';

test('manual buying uses a five-unit lot and raises market pressure', () => {
    const state = createInitialEconomyState();
    const startingWood = state.resources.wood;
    const startingGold = state.resources.gold;
    const unitPrice = getTradePrice(state, 'wood', 'buy');

    const result = trade(state, 'wood', 'buy');

    assert.equal(result.success, true);
    assert.equal(result.quantity, TRADE_LOT_SIZE);
    assert.equal(state.resources.wood, startingWood + TRADE_LOT_SIZE);
    assert.equal(state.resources.gold, startingGold - unitPrice * TRADE_LOT_SIZE);
    assert.ok(state.marketPressure.wood > 0);
});

test('selling is limited to complete lots and lowers market pressure', () => {
    const state = createInitialEconomyState();
    state.resources.iron = 7;

    const result = trade(state, 'iron', 'sell', 3);

    assert.equal(result.success, true);
    assert.equal(result.quantity, TRADE_LOT_SIZE);
    assert.equal(state.resources.iron, 2);
    assert.ok(state.marketPressure.iron < 0);
});

test('automatic purchasing respects the configured gold reserve', () => {
    const state = createInitialEconomyState();
    state.resources.food = 0;
    state.resources.gold = 130;
    state.automationGoldReserve = 100;
    setAutomationRule(state, 'food', { enabled: true, min: 80, max: 240 });

    const events = runAutomation(state);

    assert.equal(events.length, 0);
    assert.equal(state.resources.gold, 130);
    assert.equal(state.resources.food, 0);
});

test('automatic market buys below minimum and sells above maximum', () => {
    const buyer = createInitialEconomyState();
    buyer.resources.food = 0;
    buyer.resources.gold = 1000;
    setAutomationRule(buyer, 'food', { enabled: true, min: 80, max: 240 });
    const buyEvents = runAutomation(buyer);

    assert.equal(buyEvents.length, 1);
    assert.equal(buyEvents[0].result.action, 'buy');
    assert.equal(buyer.resources.food, 20);

    const seller = createInitialEconomyState();
    seller.resources.wood = 300;
    setAutomationRule(seller, 'wood', { enabled: true, min: 50, max: 250 });
    const sellEvents = runAutomation(seller);

    assert.equal(sellEvents.length, 1);
    assert.equal(sellEvents[0].result.action, 'sell');
    assert.equal(seller.resources.wood, 280);
});

test('production buildings only run when enough workers are available', () => {
    const state = createInitialEconomyState();
    state.population.current = 1;
    state.buildingCounts.market = 0;
    state.buildingCounts.woodcutter = 2;
    state.resources.wood = 0;
    recalculatePopulation(state);

    assert.equal(state.activeBuildings.woodcutter, 1);
    assert.equal(state.population.employed, 1);

    for (let i = 0; i < 6; i++) economyTick(state, 10);
    assert.equal(state.resources.wood, 16);
});

test('hunger and high taxes reduce popularity', () => {
    const state = createInitialEconomyState();
    state.resources.food = 0;
    state.taxLevel = 3;
    const before = state.popularity;

    economyTick(state, 10);

    assert.ok(state.popularity < before);
});
