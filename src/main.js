import Phaser from 'phaser';
import {
    BUILDING_DEFS,
    RESOURCE_DEFS,
    TRADE_LOT_SIZE,
    addBuilding,
    canAfford,
    createInitialEconomyState,
    economyTick,
    formatCost,
    getTradePrice,
    hydrateEconomyState,
    recalculatePopulation,
    refundBuilding,
    setAutomationRule,
    spendCost,
    trade
} from './economy.js';

const SAVE_KEY = 'stronghold-burgwirtschaft-v2';
const MAP_COLS = 18;
const MAP_ROWS = 11;
const TILE_SIZE = 64;

const STARTER_PLACEMENTS = [
    { id: 'keep', type: 'keep', col: 8, row: 5, size: 3, core: true },
    { id: 'stockpile', type: 'stockpile', col: 11, row: 6, size: 1, core: true },
    { id: 'granary', type: 'granary', col: 5, row: 6, size: 1, core: true },
    { id: 'market', type: 'market', col: 11, row: 4, size: 1, core: false },
    { id: 'house', type: 'house', col: 4, row: 3, size: 1, core: false }
];

const runtime = loadRuntime();
window.strongholdGame = runtime;

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.tileSize = TILE_SIZE;
        this.mapCols = MAP_COLS;
        this.mapRows = MAP_ROWS;
        this.occupied = new Map();
        this.placementSprites = new Map();
    }

    preload() {
        const g = this.make.graphics({ x: 0, y: 0, add: false });
        const tile = this.tileSize;

        g.fillStyle(0x658744);
        g.fillRect(0, 0, tile, tile);
        g.fillStyle(0x5b7c3d, 0.55);
        for (let i = 0; i < 14; i++) {
            const x = (i * 17 + 11) % tile;
            const y = (i * 29 + 7) % tile;
            g.fillCircle(x, y, (i % 3) + 1);
        }
        g.lineStyle(1, 0x2e4a29, 0.13);
        g.strokeRect(0, 0, tile, tile);
        g.generateTexture('grass', tile, tile);

        this.makeWallTexture(g);
        this.makeTowerTexture(g);
        this.makeHouseTexture(g);
        this.makeWorkBuildingTexture(g, 'woodcutter', 0x72482a, 0x3e6e35, 'logs');
        this.makeWorkBuildingTexture(g, 'appleFarm', 0xb58b43, 0x789f3d, 'trees');
        this.makeWorkBuildingTexture(g, 'quarry', 0x817c70, 0xb6b1a4, 'rocks');
        this.makeWorkBuildingTexture(g, 'ironMine', 0x504c48, 0x2f3135, 'mine');
        this.makeWorkBuildingTexture(g, 'market', 0xb9853f, 0xe0c163, 'market');
        this.makeWorkBuildingTexture(g, 'stockpile', 0x65432b, 0xb07a42, 'crates');
        this.makeWorkBuildingTexture(g, 'granary', 0x8a5d2b, 0xd1a441, 'grain');
        this.makeKeepTexture(g);
        this.makeUnitTexture(g);
        g.destroy();
    }

    makeWallTexture(g) {
        const t = this.tileSize;
        g.clear();
        g.fillStyle(0x8b8a82);
        g.fillRect(3, 16, t - 6, 36);
        g.lineStyle(2, 0x474843);
        g.strokeRect(3, 16, t - 6, 36);
        g.lineStyle(1, 0x5d5e58);
        g.lineBetween(3, 34, t - 3, 34);
        for (let x = 17; x < t; x += 22) g.lineBetween(x, 16, x, 34);
        for (let x = 8; x < t; x += 22) g.lineBetween(x, 34, x, 52);
        g.generateTexture('wall', t, t);
    }

    makeTowerTexture(g) {
        const t = this.tileSize;
        g.clear();
        g.fillStyle(0x77776f);
        g.fillCircle(t / 2, t / 2, 27);
        g.lineStyle(3, 0x3f403c);
        g.strokeCircle(t / 2, t / 2, 27);
        g.fillStyle(0x4d4d49);
        g.fillCircle(t / 2, t / 2, 15);
        g.fillStyle(0xb0afa5);
        [[10, 10], [44, 10], [10, 44], [44, 44]].forEach(([x, y]) => g.fillRect(x, y, 10, 10));
        g.generateTexture('tower', t, t);
    }

    makeHouseTexture(g) {
        const t = this.tileSize;
        g.clear();
        g.fillStyle(0x69472f);
        g.fillRect(10, 22, 44, 34);
        g.fillStyle(0xc89a3a);
        g.beginPath();
        g.moveTo(5, 27);
        g.lineTo(t / 2, 7);
        g.lineTo(t - 5, 27);
        g.closePath();
        g.fillPath();
        g.fillStyle(0x2d2118);
        g.fillRect(27, 38, 11, 18);
        g.generateTexture('house', t, t);
    }

    makeWorkBuildingTexture(g, key, baseColor, accentColor, detail) {
        const t = this.tileSize;
        g.clear();
        g.fillStyle(baseColor);
        g.fillRect(7, 15, 50, 42);
        g.lineStyle(2, 0x2d241d);
        g.strokeRect(7, 15, 50, 42);
        g.fillStyle(accentColor);

        if (detail === 'logs') {
            for (let y = 22; y <= 44; y += 11) g.fillRoundedRect(14, y, 37, 8, 3);
            g.fillStyle(0x2b241d);
            g.fillRect(44, 8, 6, 20);
        } else if (detail === 'trees') {
            g.fillStyle(0x5a3b20);
            g.fillRect(29, 26, 6, 28);
            g.fillStyle(accentColor);
            g.fillCircle(22, 24, 11);
            g.fillCircle(40, 23, 13);
            g.fillStyle(0xb53327);
            g.fillCircle(22, 22, 3);
            g.fillCircle(42, 19, 3);
        } else if (detail === 'rocks') {
            g.fillTriangle(11, 50, 26, 20, 38, 50);
            g.fillTriangle(29, 50, 46, 25, 57, 50);
        } else if (detail === 'mine') {
            g.fillStyle(0x18191a);
            g.fillRoundedRect(18, 25, 28, 32, 10);
            g.lineStyle(4, accentColor);
            g.strokeRoundedRect(18, 25, 28, 32, 10);
        } else if (detail === 'market') {
            g.fillStyle(0x9d2d2d);
            g.fillRect(7, 9, 50, 13);
            g.fillStyle(0xe8d5a0);
            for (let x = 9; x < 56; x += 16) g.fillRect(x, 9, 8, 13);
            g.fillStyle(accentColor);
            g.fillRect(14, 35, 36, 12);
        } else if (detail === 'crates') {
            g.fillStyle(accentColor);
            g.fillRect(12, 29, 19, 20);
            g.fillRect(34, 23, 18, 26);
            g.lineStyle(2, 0x51321f);
            g.strokeRect(12, 29, 19, 20);
            g.strokeRect(34, 23, 18, 26);
        } else if (detail === 'grain') {
            g.fillStyle(0xd0b16c);
            g.fillEllipse(22, 38, 17, 27);
            g.fillEllipse(42, 38, 17, 27);
            g.fillStyle(accentColor);
            g.fillRect(8, 14, 48, 9);
        }
        g.generateTexture(key, t, t);
    }

    makeKeepTexture(g) {
        const size = this.tileSize * 3;
        g.clear();
        g.fillStyle(0x797971);
        g.fillRect(15, 22, size - 30, size - 35);
        g.lineStyle(5, 0x3f403c);
        g.strokeRect(15, 22, size - 30, size - 35);
        g.fillStyle(0x555650);
        g.fillRect(34, 42, size - 68, size - 74);
        g.fillStyle(0x292a28);
        g.fillRoundedRect(size / 2 - 20, size - 58, 40, 43, 18);
        g.fillStyle(0xaaa99f);
        [[8, 12], [size - 42, 12], [8, size - 45], [size - 42, size - 45]].forEach(([x, y]) => {
            g.fillRect(x, y, 34, 34);
            g.lineStyle(3, 0x474843);
            g.strokeRect(x, y, 34, 34);
        });
        for (let x = 23; x < size - 23; x += 30) g.fillRect(x, 12, 17, 18);
        g.generateTexture('keep', size, size);
    }

    makeUnitTexture(g) {
        const t = this.tileSize;
        g.clear();
        g.fillStyle(0x172035, 0.3);
        g.fillEllipse(t / 2, 51, 29, 11);
        g.fillStyle(0x244e8a);
        g.fillCircle(t / 2, 37, 14);
        g.fillStyle(0xe0b78e);
        g.fillCircle(t / 2, 22, 9);
        g.fillStyle(0x6b7177);
        g.fillTriangle(20, 20, 44, 20, 32, 7);
        g.lineStyle(3, 0xd5d5ce);
        g.lineBetween(45, 24, 49, 50);
        g.generateTexture('unit', t, t);
    }

    create() {
        runtime.scene = this;
        this.drawTerrain();
        this.hoverOutline = this.add.graphics().setDepth(20);
        this.rebuildPlacements();

        const unitPosition = runtime.unitPosition || { col: 5, row: 5 };
        this.unit = this.add.sprite(
            unitPosition.col * this.tileSize + this.tileSize / 2,
            unitPosition.row * this.tileSize + this.tileSize / 2,
            'unit'
        ).setDepth(12);
        this.unit.target = null;
        this.unit.speed = 165;

        this.input.on('pointermove', pointer => this.drawHover(pointer));
        this.input.on('pointerout', () => this.hoverOutline.clear());
        this.input.on('pointerdown', pointer => this.handleMapClick(pointer));
        syncUI();
    }

    drawTerrain() {
        for (let row = 0; row < this.mapRows; row++) {
            for (let col = 0; col < this.mapCols; col++) {
                const grass = this.add.image(
                    col * this.tileSize + this.tileSize / 2,
                    row * this.tileSize + this.tileSize / 2,
                    'grass'
                );
                const tint = (col + row * 3) % 5;
                if (tint === 0) grass.setTint(0x91a96c);
                if (tint === 3) grass.setTint(0x78985a);
            }
        }
    }

    rebuildPlacements() {
        this.occupied.clear();
        this.placementSprites.clear();
        const counts = {
            keep: 0,
            stockpile: 0,
            granary: 0,
            market: 0,
            house: 0,
            woodcutter: 0,
            appleFarm: 0,
            quarry: 0,
            ironMine: 0,
            wall: 0,
            tower: 0
        };

        for (const placement of runtime.placements) {
            counts[placement.type] = (counts[placement.type] || 0) + 1;
            this.placeSprite(placement);
            this.markOccupied(placement);
        }

        runtime.state.buildingCounts = counts;
        recalculatePopulation(runtime.state);
    }

    placeSprite(placement) {
        const size = placement.size || 1;
        const image = this.add.image(
            placement.col * this.tileSize + this.tileSize / 2,
            placement.row * this.tileSize + this.tileSize / 2,
            placement.type
        ).setDepth(size > 1 ? 6 : 5);
        this.placementSprites.set(placement.id, image);
    }

    markOccupied(placement) {
        const radius = Math.floor((placement.size || 1) / 2);
        for (let dy = -radius; dy <= radius; dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
                this.occupied.set(`${placement.col + dx}:${placement.row + dy}`, placement.id);
            }
        }
    }

    drawHover(pointer) {
        const col = Math.floor(pointer.x / this.tileSize);
        const row = Math.floor(pointer.y / this.tileSize);
        this.hoverOutline.clear();
        if (!this.inBounds(col, row)) return;

        const occupied = this.occupied.has(`${col}:${row}`);
        let color = 0xe8c76b;
        if (runtime.mode === 'demolish') color = occupied ? 0xdb5a45 : 0x8d463b;
        else if (runtime.mode !== 'unit' && runtime.mode !== 'inspect') color = occupied ? 0xc64a3b : 0x89c56b;
        this.hoverOutline.lineStyle(4, color, 0.9);
        this.hoverOutline.strokeRect(col * this.tileSize + 2, row * this.tileSize + 2, this.tileSize - 4, this.tileSize - 4);
    }

    handleMapClick(pointer) {
        const col = Math.floor(pointer.x / this.tileSize);
        const row = Math.floor(pointer.y / this.tileSize);
        if (!this.inBounds(col, row)) return;
        const key = `${col}:${row}`;

        if (runtime.mode === 'unit' || runtime.mode === 'inspect') {
            if (runtime.mode === 'inspect' && this.occupied.has(key)) {
                const placement = runtime.placements.find(item => item.id === this.occupied.get(key));
                if (placement) {
                    const label = BUILDING_DEFS[placement.type]?.label || coreLabel(placement.type);
                    announce(`${label} ausgewählt.`, 'neutral');
                    return;
                }
            }
            this.unit.target = {
                x: col * this.tileSize + this.tileSize / 2,
                y: row * this.tileSize + this.tileSize / 2
            };
            return;
        }

        if (runtime.mode === 'demolish') {
            this.demolishAt(key);
            return;
        }

        this.constructAt(runtime.mode, col, row);
    }

    constructAt(type, col, row) {
        const def = BUILDING_DEFS[type];
        if (!def) return;
        if (this.occupied.has(`${col}:${row}`)) {
            announce('Dieser Bauplatz ist bereits belegt.', 'warning');
            return;
        }
        if (def.unique && (runtime.state.buildingCounts[type] || 0) > 0) {
            announce(`${def.label} kann nur einmal gebaut werden.`, 'warning');
            return;
        }
        if (!canAfford(runtime.state, def.cost)) {
            announce(`Es fehlen Rohstoffe: ${formatCost(def.cost)}.`, 'warning');
            return;
        }

        spendCost(runtime.state, def.cost);
        const placement = {
            id: `${type}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            type,
            col,
            row,
            size: 1,
            core: false
        };
        runtime.placements.push(placement);
        addBuilding(runtime.state, type);
        this.placeSprite(placement);
        this.markOccupied(placement);
        announce(`${def.label} errichtet.`, 'success');
        addLog(`${def.label} wurde fertiggestellt.`);
        saveRuntime();
        syncUI();
    }

    demolishAt(key) {
        const placementId = this.occupied.get(key);
        const placement = runtime.placements.find(item => item.id === placementId);
        if (!placement) {
            announce('Hier steht kein Gebäude.', 'warning');
            return;
        }
        if (placement.core) {
            announce(`${coreLabel(placement.type)} gehört zum Burgkern und kann nicht abgerissen werden.`, 'warning');
            return;
        }

        const refund = refundBuilding(runtime.state, placement.type);
        runtime.placements = runtime.placements.filter(item => item.id !== placement.id);
        this.placementSprites.get(placement.id)?.destroy();
        this.placementSprites.delete(placement.id);
        for (const [tileKey, id] of this.occupied.entries()) {
            if (id === placement.id) this.occupied.delete(tileKey);
        }
        const refundText = formatCost(refund);
        const label = BUILDING_DEFS[placement.type]?.label || placement.type;
        announce(`${label} abgerissen · ${refundText} zurückerhalten.`, 'success');
        addLog(`${label} wurde abgerissen.`);
        saveRuntime();
        syncUI();
    }

    inBounds(col, row) {
        return col >= 0 && row >= 0 && col < this.mapCols && row < this.mapRows;
    }

    update(_time, delta) {
        if (!this.unit?.target || runtime.speed === 0) return;
        const dx = this.unit.target.x - this.unit.x;
        const dy = this.unit.target.y - this.unit.y;
        const distance = Math.hypot(dx, dy);
        if (distance < 2) {
            this.unit.setPosition(this.unit.target.x, this.unit.target.y);
            this.unit.target = null;
            return;
        }
        const travel = Math.min(distance, this.unit.speed * runtime.speed * delta / 1000);
        this.unit.x += (dx / distance) * travel;
        this.unit.y += (dy / distance) * travel;
    }
}

setupUI();

const game = new Phaser.Game({
    type: Phaser.AUTO,
    width: MAP_COLS * TILE_SIZE,
    height: MAP_ROWS * TILE_SIZE,
    parent: 'game-container',
    backgroundColor: '#2b3d24',
    pixelArt: false,
    antialias: true,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [MainScene]
});

window.addEventListener('beforeunload', saveRuntime);
window.addEventListener('resize', () => game.scale.refresh());

let saveCounter = 0;
setInterval(() => {
    if (runtime.speed === 0) return;
    const events = economyTick(runtime.state, runtime.speed);
    handleEconomyEvents(events);
    syncUI();
    saveCounter += 1;
    if (saveCounter >= 5) {
        saveCounter = 0;
        saveRuntime();
    }
}, 1000);

function setupUI() {
    buildCatalog();
    buildMarketRows();
    bindTabs();

    document.querySelectorAll('[data-speed]').forEach(button => {
        button.addEventListener('click', () => {
            runtime.speed = Number(button.dataset.speed);
            syncUI();
        });
    });

    document.getElementById('ration-select').addEventListener('change', event => {
        runtime.state.ration = event.target.value;
        addLog(`Rationen auf „${event.target.selectedOptions[0].textContent}“ gesetzt.`);
        saveRuntime();
        syncUI();
    });

    document.getElementById('tax-select').addEventListener('change', event => {
        runtime.state.taxLevel = Number(event.target.value);
        addLog(`Steuerstufe auf „${event.target.selectedOptions[0].textContent}“ gesetzt.`);
        saveRuntime();
        syncUI();
    });

    document.getElementById('gold-reserve').addEventListener('change', event => {
        runtime.state.automationGoldReserve = Math.max(0, Math.round(Number(event.target.value) || 0));
        saveRuntime();
        syncUI();
    });

    document.getElementById('market-list').addEventListener('click', event => {
        const button = event.target.closest('[data-trade]');
        if (!button) return;
        const result = trade(runtime.state, button.dataset.resource, button.dataset.trade, 1, 'manual');
        if (!result.success) {
            announce(result.reason, 'warning');
        } else {
            const verb = result.action === 'buy' ? 'gekauft' : 'verkauft';
            announce(`${result.quantity} ${RESOURCE_DEFS[result.resource].label} ${verb}.`, 'success');
            addLog(tradeMessage(result));
        }
        saveRuntime();
        syncUI();
    });

    document.getElementById('market-list').addEventListener('change', event => {
        const row = event.target.closest('[data-market-resource]');
        if (!row) return;
        const resource = row.dataset.marketResource;
        const enabled = row.querySelector('[data-auto-enabled]').checked;
        const min = row.querySelector('[data-auto-min]').value;
        const max = row.querySelector('[data-auto-max]').value;
        setAutomationRule(runtime.state, resource, { enabled, min, max });
        saveRuntime();
        syncUI();
    });

    document.addEventListener('keydown', event => {
        if (event.target.matches('input, select, textarea')) return;
        if (event.key === ' ') {
            event.preventDefault();
            runtime.speed = runtime.speed === 0 ? 1 : 0;
            syncUI();
        }
        if (event.key.toLowerCase() === 'm') activateTab('market');
        if (event.key.toLowerCase() === 'b') activateTab('build');
    });

    addLog('Der Burgherr erwartet eine florierende Wirtschaft.');
    addLog('Markt geöffnet: Handel in 5er-Losen, Automatik optional.');
    syncUI();
}

function buildCatalog() {
    const economyList = document.getElementById('economy-buildings');
    const defenseList = document.getElementById('defense-buildings');

    for (const [type, def] of Object.entries(BUILDING_DEFS)) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'build-card';
        button.dataset.build = type;
        button.innerHTML = `
            <span class="build-card__title">${def.label}</span>
            <span class="build-card__description">${def.description}</span>
            <span class="build-card__cost">${formatCost(def.cost)}</span>
        `;
        button.addEventListener('click', () => selectMode(type));
        (def.category === 'defense' ? defenseList : economyList).appendChild(button);
    }

    document.querySelectorAll('[data-mode]').forEach(button => {
        button.addEventListener('click', () => selectMode(button.dataset.mode));
    });
}

function buildMarketRows() {
    const list = document.getElementById('market-list');
    for (const [resource, def] of Object.entries(RESOURCE_DEFS)) {
        const row = document.createElement('article');
        row.className = 'market-row';
        row.dataset.marketResource = resource;
        row.innerHTML = `
            <div class="market-row__heading">
                <span class="resource-dot" style="--resource-color:${def.color}"></span>
                <strong>${def.label}</strong>
                <span class="market-stock"><span data-market-stock>0</span> auf Lager</span>
            </div>
            <div class="market-price-line">
                <span data-buy-price>Kauf</span>
                <span data-pressure class="price-trend">stabil</span>
                <span data-sell-price>Verkauf</span>
            </div>
            <div class="trade-actions">
                <button type="button" data-trade="sell" data-resource="${resource}">−${TRADE_LOT_SIZE} verkaufen</button>
                <button type="button" data-trade="buy" data-resource="${resource}">+${TRADE_LOT_SIZE} kaufen</button>
            </div>
            <div class="automation-rule">
                <label class="switch-label">
                    <input type="checkbox" data-auto-enabled>
                    <span>Auto</span>
                </label>
                <label>Unter <input inputmode="numeric" type="number" min="0" step="5" data-auto-min></label>
                <label>Über <input inputmode="numeric" type="number" min="5" step="5" data-auto-max></label>
            </div>
        `;
        list.appendChild(row);
    }
}

function bindTabs() {
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', () => activateTab(button.dataset.tab));
    });
}

function activateTab(name) {
    document.querySelectorAll('[data-tab]').forEach(button => {
        const active = button.dataset.tab === name;
        button.classList.toggle('active', active);
        button.setAttribute('aria-selected', active ? 'true' : 'false');
    });
    document.querySelectorAll('[data-panel]').forEach(panel => {
        panel.hidden = panel.dataset.panel !== name;
    });
    runtime.activeTab = name;
}

function selectMode(mode) {
    runtime.mode = mode;
    document.querySelectorAll('[data-build], [data-mode]').forEach(button => {
        const value = button.dataset.build || button.dataset.mode;
        button.classList.toggle('active', value === mode);
    });
    const label = BUILDING_DEFS[mode]?.label || ({ inspect: 'Auswahl', unit: 'Befehl', demolish: 'Abriss' }[mode]);
    document.getElementById('selected-mode').textContent = label || 'Auswahl';
    announce(mode === 'demolish' ? 'Wählt ein Gebäude zum Abreißen.' : `${label} ausgewählt.`, 'neutral');
}

function syncUI() {
    const { state } = runtime;
    const round = value => Math.max(0, Math.floor(value));
    for (const resource of Object.keys(RESOURCE_DEFS)) {
        setText(`res-${resource}-val`, round(state.resources[resource]));
    }
    setText('res-gold-val', round(state.resources.gold));
    setText('population-value', `${state.population.current}/${state.population.capacity}`);
    setText('popularity-value', `${Math.round(state.popularity)}%`);

    const popularityMeter = document.getElementById('popularity-meter');
    popularityMeter.style.setProperty('--meter-value', `${state.popularity}%`);
    popularityMeter.classList.toggle('danger', state.popularity < 35);

    document.querySelectorAll('[data-speed]').forEach(button => {
        button.classList.toggle('active', Number(button.dataset.speed) === runtime.speed);
    });

    document.querySelectorAll('[data-build]').forEach(button => {
        const type = button.dataset.build;
        const def = BUILDING_DEFS[type];
        const uniqueBlocked = def.unique && (state.buildingCounts[type] || 0) > 0;
        button.classList.toggle('unaffordable', !canAfford(state, def.cost));
        button.classList.toggle('unique-built', uniqueBlocked);
        button.disabled = uniqueBlocked;
        button.title = uniqueBlocked ? 'Bereits gebaut' : def.description;
    });

    const marketAvailable = (state.buildingCounts.market || 0) > 0;
    document.getElementById('market-unavailable').hidden = marketAvailable;
    document.getElementById('market-list').classList.toggle('disabled', !marketAvailable);

    for (const resource of Object.keys(RESOURCE_DEFS)) {
        const row = document.querySelector(`[data-market-resource="${resource}"]`);
        const buy = getTradePrice(state, resource, 'buy') * TRADE_LOT_SIZE;
        const sell = getTradePrice(state, resource, 'sell') * TRADE_LOT_SIZE;
        row.querySelector('[data-market-stock]').textContent = round(state.resources[resource]);
        row.querySelector('[data-buy-price]').textContent = `Kauf ${buy} Gold`;
        row.querySelector('[data-sell-price]').textContent = `Verkauf ${sell} Gold`;
        const trend = pressureLabel(state.marketPressure[resource]);
        const trendElement = row.querySelector('[data-pressure]');
        trendElement.textContent = trend.label;
        trendElement.dataset.trend = trend.direction;
        row.querySelectorAll('[data-trade]').forEach(button => button.disabled = !marketAvailable);

        const rule = state.automation[resource];
        const enabledInput = row.querySelector('[data-auto-enabled]');
        const minInput = row.querySelector('[data-auto-min]');
        const maxInput = row.querySelector('[data-auto-max]');
        enabledInput.checked = rule.enabled;
        if (document.activeElement !== minInput) minInput.value = rule.min;
        if (document.activeElement !== maxInput) maxInput.value = rule.max;
        enabledInput.disabled = !marketAvailable;
        minInput.disabled = !marketAvailable;
        maxInput.disabled = !marketAvailable;
    }

    const goldReserve = document.getElementById('gold-reserve');
    if (document.activeElement !== goldReserve) goldReserve.value = state.automationGoldReserve;

    setText('realm-population', `${state.population.current} von ${state.population.capacity}`);
    setText('realm-workers', `${state.population.employed} beschäftigt · ${state.population.idle} frei`);
    setText('realm-popularity', `${Math.round(state.popularity)}%`);
    setText('realm-food', `${round(state.resources.food)} Vorrat`);
    document.getElementById('ration-select').value = state.ration;
    document.getElementById('tax-select').value = String(state.taxLevel);
    renderProduction();
}

function renderProduction() {
    const list = document.getElementById('production-list');
    const rows = Object.entries(BUILDING_DEFS)
        .filter(([, def]) => def.production)
        .map(([type, def]) => {
            const total = runtime.state.buildingCounts[type] || 0;
            const active = runtime.state.activeBuildings[type] || 0;
            const output = active * def.production.perMinute;
            const status = total === 0 ? 'nicht gebaut' : `${active}/${total} besetzt`;
            return `<li><span>${def.label}<small>${status}</small></span><strong>+${output}/min</strong></li>`;
        });
    list.innerHTML = rows.join('');
}

function handleEconomyEvents(events) {
    for (const event of events) {
        if (event.type === 'trade') {
            addLog(tradeMessage(event.result));
            announce(`Automarkt: ${event.result.quantity} ${RESOURCE_DEFS[event.result.resource].label} ${event.result.action === 'buy' ? 'gekauft' : 'verkauft'}.`, 'success');
        } else if (event.message) {
            addLog(event.message);
        }
    }
}

function tradeMessage(result) {
    const verb = result.action === 'buy' ? 'gekauft' : 'verkauft';
    const prefix = result.source === 'auto' ? 'Automarkt' : 'Markt';
    return `${prefix}: ${result.quantity} ${RESOURCE_DEFS[result.resource].label} für ${result.gold} Gold ${verb}.`;
}

function pressureLabel(value) {
    if (value > 0.08) return { label: '▲ teuer', direction: 'up' };
    if (value < -0.08) return { label: '▼ günstig', direction: 'down' };
    return { label: '● stabil', direction: 'flat' };
}

function announce(message, tone = 'neutral') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.dataset.tone = tone;
    toast.classList.add('visible');
    clearTimeout(runtime.toastTimer);
    runtime.toastTimer = setTimeout(() => toast.classList.remove('visible'), 2600);
}

function addLog(message) {
    const log = document.getElementById('event-log');
    const item = document.createElement('li');
    item.textContent = message;
    log.prepend(item);
    while (log.children.length > 6) log.lastElementChild.remove();
}

function loadRuntime() {
    let saved = null;
    try {
        saved = JSON.parse(localStorage.getItem(SAVE_KEY));
    } catch {
        saved = null;
    }

    return {
        state: saved?.economy ? hydrateEconomyState(saved.economy) : createInitialEconomyState(),
        placements: Array.isArray(saved?.placements) && saved.placements.length
            ? saved.placements
            : structuredClone(STARTER_PLACEMENTS),
        unitPosition: saved?.unitPosition || null,
        mode: 'inspect',
        speed: 1,
        activeTab: 'build',
        scene: null,
        toastTimer: null
    };
}

function saveRuntime() {
    if (runtime.scene?.unit) {
        runtime.unitPosition = {
            col: runtime.scene.unit.x / TILE_SIZE - 0.5,
            row: runtime.scene.unit.y / TILE_SIZE - 0.5
        };
    }
    const payload = {
        version: 2,
        economy: runtime.state,
        placements: runtime.placements,
        unitPosition: runtime.unitPosition,
        savedAt: new Date().toISOString()
    };
    try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
    } catch {
        announce('Der Spielstand konnte nicht lokal gespeichert werden.', 'warning');
    }
}

function coreLabel(type) {
    return ({ keep: 'Bergfried', stockpile: 'Vorratslager', granary: 'Kornspeicher' })[type] || type;
}

function setText(id, value) {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
}
