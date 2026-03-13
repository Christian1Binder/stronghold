import Phaser from 'phaser';

const BUILDING_DATA = {
    'wall': { cost: 10, costRes: 'stone' },
    'tower': { cost: 40, costRes: 'stone' },
    'Vorratslager': { cost: 10, costRes: 'wood' },
    'Holzfällerhütte': { cost: 5, costRes: 'wood', produces: 'wood', amount: 5 },
    'Steinbruch': { cost: 20, costRes: 'wood', produces: 'stone', amount: 3 },
    'Ochsenjoch': { cost: 5, costRes: 'wood' },
    'Eisenmine': { cost: 20, costRes: 'wood', produces: 'iron', amount: 2 },
    'Pechgrube': { cost: 20, costRes: 'wood' },
    'Marktplatz': { cost: 25, costRes: 'wood' },
    'Jägerstand': { cost: 5, costRes: 'wood', produces: 'food', amount: 4 },
    'Obstgarten': { cost: 5, costRes: 'wood', produces: 'food', amount: 2 },
    'Käserei': { cost: 10, costRes: 'wood', produces: 'food', amount: 3 },
    'Getreidefarm': { cost: 15, costRes: 'wood' },
    'Hopfenfarm': { cost: 15, costRes: 'wood' },
    'Hütte': { cost: 6, costRes: 'wood' },
    'Kapelle': { cost: 10, costRes: 'stone' },
    'Kirche': { cost: 50, costRes: 'stone' },
    'Kathedrale': { cost: 100, costRes: 'stone' },
    'Apotheke': { cost: 20, costRes: 'wood' },
    'Brunnen': { cost: 20, costRes: 'stone' },
    'Wassertrog': { cost: 5, costRes: 'wood' },
    'Galgen': { cost: 10, costRes: 'wood', produces: 'moral', amount: -1 },
    'Senkgrube': { cost: 10, costRes: 'wood' },
    'Pranger': { cost: 5, costRes: 'wood', produces: 'moral', amount: -1 },
    'Köpfe': { cost: 5, costRes: 'wood' },
    'Scheiterhaufen': { cost: 10, costRes: 'wood' },
    'Verließ': { cost: 20, costRes: 'stone' },
    'Streckbank': { cost: 10, costRes: 'wood' },
    'Käfig': { cost: 5, costRes: 'iron' },
    'Hackblock': { cost: 5, costRes: 'wood' },
    'Hexenstuhl': { cost: 10, costRes: 'wood' },
    'Maibaum': { cost: 10, costRes: 'wood', produces: 'moral', amount: 1 },
    'Tanzbär': { cost: 15, costRes: 'wood', produces: 'moral', amount: 1 },
    'Gemeindegarten': { cost: 15, costRes: 'wood', produces: 'moral', amount: 1 },
    'Stadtgarten': { cost: 20, costRes: 'wood', produces: 'moral', amount: 2 },
    'Statue': { cost: 30, costRes: 'stone', produces: 'moral', amount: 3 },
    'Gebetsstelle': { cost: 10, costRes: 'stone', produces: 'moral', amount: 1 },
    'KlTeich': { cost: 10, costRes: 'wood' },
    'GrTeich': { cost: 20, costRes: 'wood' },
    'Flaggen': { cost: 5, costRes: 'wood' },
    'Schmiede': { cost: 20, costRes: 'wood' },
    'Pfeilmacherei': { cost: 20, costRes: 'wood' },
    'Pikenmacherei': { cost: 20, costRes: 'wood' },
    'Gerberei': { cost: 20, costRes: 'wood' },
    'Rüstungsschmiede': { cost: 20, costRes: 'wood' },
    'Kornspeicher': { cost: 5, costRes: 'wood' },
    'Mühle': { cost: 20, costRes: 'wood' },
    'Bäckerei': { cost: 10, costRes: 'wood' },
    'Brauerei': { cost: 10, costRes: 'wood' },
    'Schenke': { cost: 20, costRes: 'wood' },
};

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.tileSize = 64;
        this.mapCols = 15; // Adjusted to fit screen nicely with the menu
        this.mapRows = 12;
    }

    preload() {
        let g = this.make.graphics({x: 0, y: 0, add: false});

        // Grass
        g.fillStyle(0x3e8a35);
        g.fillRect(0, 0, this.tileSize, this.tileSize);
        g.fillStyle(0x357a2c, 0.5);
        for(let i=0; i<10; i++) {
            g.fillCircle(Math.random() * this.tileSize, Math.random() * this.tileSize, Math.random() * 3 + 1);
        }
        g.generateTexture('grass', this.tileSize, this.tileSize);

        // Wall
        g.clear();
        g.fillStyle(0x888888);
        g.lineStyle(2, 0x444444);
        g.fillRect(2, 2, this.tileSize-4, this.tileSize-4);
        g.strokeRect(2, 2, this.tileSize-4, this.tileSize-4);
        g.lineStyle(1, 0x555555);
        g.beginPath();
        g.moveTo(2, this.tileSize/2); g.lineTo(this.tileSize-2, this.tileSize/2);
        g.moveTo(this.tileSize/2, 2); g.lineTo(this.tileSize/2, this.tileSize/2);
        g.moveTo(this.tileSize/4, this.tileSize/2); g.lineTo(this.tileSize/4, this.tileSize-2);
        g.moveTo(this.tileSize*0.75, this.tileSize/2); g.lineTo(this.tileSize*0.75, this.tileSize-2);
        g.strokePath();
        g.generateTexture('wall', this.tileSize, this.tileSize);

        // Tower
        g.clear();
        g.fillStyle(0x999999);
        g.fillRect(4, 4, this.tileSize-8, this.tileSize-8);
        g.fillStyle(0x666666);
        g.fillRect(8, 8, this.tileSize-16, this.tileSize-16);
        g.fillStyle(0x333333);
        g.fillRect(4, 4, 10, 10);
        g.fillRect(this.tileSize-14, 4, 10, 10);
        g.fillRect(4, this.tileSize-14, 10, 10);
        g.fillRect(this.tileSize-14, this.tileSize-14, 10, 10);
        g.generateTexture('tower', this.tileSize, this.tileSize);

        // Keep
        g.clear();
        let keepSize = this.tileSize * 3;
        g.fillStyle(0x777777);
        g.fillRect(10, 10, keepSize-20, keepSize-20);
        g.fillStyle(0x555555);
        g.fillRect(20, 20, keepSize-40, keepSize-40);
        g.fillStyle(0x222222);
        g.fillRect(keepSize/2 - 20, keepSize-20, 40, 10);
        g.fillStyle(0x444444);
        g.fillCircle(15, 15, 15);
        g.fillCircle(keepSize-15, 15, 15);
        g.fillCircle(15, keepSize-15, 15);
        g.fillCircle(keepSize-15, keepSize-15, 15);
        g.generateTexture('keep', keepSize, keepSize);

        // Unit
        g.clear();
        g.fillStyle(0x3366ff);
        g.fillCircle(this.tileSize/2, this.tileSize/2, this.tileSize/4);
        g.fillStyle(0xffdbac);
        g.fillCircle(this.tileSize/2, this.tileSize/2 - 4, this.tileSize/6);
        g.generateTexture('unit', this.tileSize, this.tileSize);

    }

    create() {
        this.buildings = [];
        this.economyTimer = 0;

        // Generate placeholder text textures for buildings (since we can't easily draw text to graphics in preload)
        for (const [key, data] of Object.entries(BUILDING_DATA)) {
            if (['wall', 'tower'].includes(key)) continue;

            // create a render texture
            let rt = this.add.renderTexture(0, 0, this.tileSize, this.tileSize);

            let bg = this.add.graphics();
            if (data.costRes === 'wood') bg.fillStyle(0x5c4033); else bg.fillStyle(0x7a7a7a);
            bg.fillRect(4, 4, this.tileSize-8, this.tileSize-8);
            bg.lineStyle(2, 0x000000);
            bg.strokeRect(4, 4, this.tileSize-8, this.tileSize-8);

            let text = this.add.text(this.tileSize/2, this.tileSize/2, key.substring(0, 3).toUpperCase(), {
                font: '14px Arial', fill: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0.5);

            rt.draw([bg, text]);
            rt.saveTexture(key);

            bg.destroy();
            text.destroy();
            rt.destroy();
        }

        // Draw Map
        for(let y = 0; y < this.mapRows; y++) {
            for(let x = 0; x < this.mapCols; x++) {
                this.add.image(x * this.tileSize + this.tileSize/2, y * this.tileSize + this.tileSize/2, 'grass');
            }
        }

        let keepCenterCol = Math.floor(this.mapCols / 2);
        let keepCenterRow = Math.floor(this.mapRows / 2);
        this.add.image(
            keepCenterCol * this.tileSize + this.tileSize/2,
            keepCenterRow * this.tileSize + this.tileSize/2,
            'keep'
        );

        for(let dy=-1; dy<=1; dy++) {
            for(let dx=-1; dx<=1; dx++) {
                this.buildings.push({col: keepCenterCol+dx, row: keepCenterRow+dy, type: 'keep'});
            }
        }

        this.unit = this.add.sprite((keepCenterCol - 3) * this.tileSize + this.tileSize/2, keepCenterRow * this.tileSize + this.tileSize/2, 'unit');
        this.unit.target = null;
        this.unit.speed = 120;

        this.input.on('pointerdown', (pointer) => {
            let col = Math.floor(pointer.x / this.tileSize);
            let row = Math.floor(pointer.y / this.tileSize);
            let mode = window.currentBuildMode || 'unit';

            let isOccupied = this.buildings.some(b => b.col === col && b.row === row);

            if (mode === 'unit') {
                this.unit.target = {
                    x: col * this.tileSize + this.tileSize/2,
                    y: row * this.tileSize + this.tileSize/2
                };
            } else if (!isOccupied && BUILDING_DATA[mode]) {
                let xPos = col * this.tileSize + this.tileSize/2;
                let yPos = row * this.tileSize + this.tileSize/2;

                let bData = BUILDING_DATA[mode];
                let costElement = document.getElementById(`res-${bData.costRes}-val`);

                if (costElement) {
                    let currentVal = parseInt(costElement.innerText);
                    if (currentVal >= bData.cost) {
                        costElement.innerText = currentVal - bData.cost;
                        this.add.image(xPos, yPos, mode);
                        this.buildings.push({col, row, type: mode});
                    } else {
                        console.log("Not enough resources!");
                    }
                }
            }
        });
    }

    update(time, delta) {
        // Unit Movement
        if (this.unit.target) {
            let dx = this.unit.target.x - this.unit.x;
            let dy = this.unit.target.y - this.unit.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < 2) {
                this.unit.x = this.unit.target.x;
                this.unit.y = this.unit.target.y;
                this.unit.target = null;
            } else {
                let moveDist = (this.unit.speed * delta) / 1000;
                if (moveDist > dist) moveDist = dist;
                this.unit.x += (dx / dist) * moveDist;
                this.unit.y += (dy / dist) * moveDist;
            }
        }

        // Economy Loop (Tick every 2 seconds)
        this.economyTimer += delta;
        if (this.economyTimer > 2000) {
            this.economyTimer = 0;
            this.processEconomyTick();
        }
    }

    processEconomyTick() {
        let generated = { wood: 0, stone: 0, iron: 0, food: 0, moral: 0 };

        // Calculate total production from buildings
        for (let b of this.buildings) {
            let bData = BUILDING_DATA[b.type];
            if (bData && bData.produces) {
                generated[bData.produces] += bData.amount;
            }
        }

        // Apply generated resources to UI
        if (generated.wood > 0) {
            let el = document.getElementById('res-wood-val');
            el.innerText = parseInt(el.innerText) + generated.wood;
        }
        if (generated.stone > 0) {
            let el = document.getElementById('res-stone-val');
            el.innerText = parseInt(el.innerText) + generated.stone;
        }
        if (generated.iron > 0) {
            let el = document.getElementById('res-iron-val');
            el.innerText = parseInt(el.innerText) + generated.iron;
        }
        if (generated.food > 0) {
            let el = document.getElementById('res-food-val');
            el.innerText = parseInt(el.innerText) + generated.food;
        }
        if (generated.moral > 0) {
            let el = document.getElementById('res-moral-val');
            let currentMoral = parseInt(el.innerText);
            if (currentMoral < 100) {
                el.innerText = Math.min(100, currentMoral + generated.moral);
            }
        }
    }
}

const config = {
    type: Phaser.AUTO,
    width: 64 * 15,
    height: 64 * 12,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [MainScene]
};

const game = new Phaser.Game(config);