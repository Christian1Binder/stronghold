import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.tileSize = 64;
        this.mapCols = 20;
        this.mapRows = 15;
    }

    preload() {
        // Generate textures for visuals
        let g = this.make.graphics({x: 0, y: 0, add: false});

        // Basic Grass Tile
        g.fillStyle(0x3e8a35); // Lighter green base
        g.fillRect(0, 0, this.tileSize, this.tileSize);
        // Add some noise/detail to grass
        g.fillStyle(0x357a2c, 0.5); // Darker speckles
        for(let i=0; i<10; i++) {
            g.fillCircle(Math.random() * this.tileSize, Math.random() * this.tileSize, Math.random() * 3 + 1);
        }
        g.generateTexture('grass', this.tileSize, this.tileSize);

        // Wall Tile (Stone)
        g.clear();
        g.fillStyle(0x888888);
        g.lineStyle(2, 0x444444);
        g.fillRect(2, 2, this.tileSize-4, this.tileSize-4);
        g.strokeRect(2, 2, this.tileSize-4, this.tileSize-4);
        // Add brick pattern
        g.lineStyle(1, 0x555555);
        g.beginPath();
        g.moveTo(2, this.tileSize/2); g.lineTo(this.tileSize-2, this.tileSize/2);
        g.moveTo(this.tileSize/2, 2); g.lineTo(this.tileSize/2, this.tileSize/2);
        g.moveTo(this.tileSize/4, this.tileSize/2); g.lineTo(this.tileSize/4, this.tileSize-2);
        g.moveTo(this.tileSize*0.75, this.tileSize/2); g.lineTo(this.tileSize*0.75, this.tileSize-2);
        g.strokePath();
        g.generateTexture('wall', this.tileSize, this.tileSize);

        // Tower Tile (Stone)
        g.clear();
        g.fillStyle(0x999999);
        g.fillRect(4, 4, this.tileSize-8, this.tileSize-8);
        g.fillStyle(0x666666);
        g.fillRect(8, 8, this.tileSize-16, this.tileSize-16); // inner roof
        g.fillStyle(0x333333); // crenellations
        g.fillRect(4, 4, 10, 10);
        g.fillRect(this.tileSize-14, 4, 10, 10);
        g.fillRect(4, this.tileSize-14, 10, 10);
        g.fillRect(this.tileSize-14, this.tileSize-14, 10, 10);
        g.generateTexture('tower', this.tileSize, this.tileSize);

        // House Tile (Wood/Thatch)
        g.clear();
        g.fillStyle(0x5c4033); // wood base
        g.fillRect(6, 6, this.tileSize-12, this.tileSize-12);
        g.fillStyle(0xdaa520); // straw/thatch roof
        g.beginPath();
        g.moveTo(this.tileSize/2, 10);
        g.lineTo(this.tileSize-10, this.tileSize-10);
        g.lineTo(10, this.tileSize-10);
        g.closePath();
        g.fillPath();
        g.generateTexture('house', this.tileSize, this.tileSize);

        // Main Castle/Keep (Large)
        g.clear();
        let keepSize = this.tileSize * 3;
        g.fillStyle(0x777777); // stone
        g.fillRect(10, 10, keepSize-20, keepSize-20);
        g.fillStyle(0x555555);
        g.fillRect(20, 20, keepSize-40, keepSize-40); // roof level
        g.fillStyle(0x222222);
        g.fillRect(keepSize/2 - 20, keepSize-20, 40, 10); // gate

        // towers on keep corners
        g.fillStyle(0x444444);
        g.fillCircle(15, 15, 15);
        g.fillCircle(keepSize-15, 15, 15);
        g.fillCircle(15, keepSize-15, 15);
        g.fillCircle(keepSize-15, keepSize-15, 15);

        g.generateTexture('keep', keepSize, keepSize);

        // Unit Sprite (Blue Player Soldier)
        g.clear();
        g.fillStyle(0x3366ff); // blue tunic
        g.fillCircle(this.tileSize/2, this.tileSize/2, this.tileSize/4);
        g.fillStyle(0xffdbac); // head/skin
        g.fillCircle(this.tileSize/2, this.tileSize/2 - 4, this.tileSize/6);
        g.generateTexture('unit', this.tileSize, this.tileSize);
    }

    create() {
        // Draw basic grid map
        this.buildings = []; // Store building data

        for(let y = 0; y < this.mapRows; y++) {
            for(let x = 0; x < this.mapCols; x++) {
                this.add.image(x * this.tileSize + this.tileSize/2, y * this.tileSize + this.tileSize/2, 'grass');
            }
        }

        // Place central keep
        let keepCenterCol = Math.floor(this.mapCols / 2);
        let keepCenterRow = Math.floor(this.mapRows / 2);

        this.add.image(
            keepCenterCol * this.tileSize + this.tileSize/2,
            keepCenterRow * this.tileSize + this.tileSize/2,
            'keep'
        );

        // Mark tiles under keep as occupied
        for(let dy=-1; dy<=1; dy++) {
            for(let dx=-1; dx<=1; dx++) {
                this.buildings.push({col: keepCenterCol+dx, row: keepCenterRow+dy, type: 'keep'});
            }
        }

        // Create a mock unit
        this.unit = this.add.sprite((keepCenterCol - 3) * this.tileSize + this.tileSize/2, keepCenterRow * this.tileSize + this.tileSize/2, 'unit');
        this.unit.target = null;
        this.unit.speed = 120; // slightly faster

        // Input handler for interactions
        this.input.on('pointerdown', (pointer) => {
            let col = Math.floor(pointer.x / this.tileSize);
            let row = Math.floor(pointer.y / this.tileSize);

            let mode = window.currentBuildMode || 'wall';

            // Check if tile is already occupied
            let isOccupied = this.buildings.some(b => b.col === col && b.row === row);

            if (mode === 'unit') {
                // Command unit to move
                this.unit.target = {
                    x: col * this.tileSize + this.tileSize/2,
                    y: row * this.tileSize + this.tileSize/2
                };
            } else if (!isOccupied) {
                // Build mode
                let xPos = col * this.tileSize + this.tileSize/2;
                let yPos = row * this.tileSize + this.tileSize/2;

                let cost = 0;
                let costElement = null;

                if (mode === 'wall') {
                    cost = 10;
                    costElement = document.getElementById('res-stone-val');
                } else if (mode === 'tower') {
                    cost = 40;
                    costElement = document.getElementById('res-stone-val');
                } else if (mode === 'house') {
                    cost = 25;
                    costElement = document.getElementById('res-wood-val');
                }

                // Simple client-side economy update
                if (costElement) {
                    let currentVal = parseInt(costElement.innerText);
                    if (currentVal >= cost) {
                        costElement.innerText = currentVal - cost;

                        let spriteKey = mode;
                        this.add.image(xPos, yPos, spriteKey);
                        this.buildings.push({col, row, type: mode});
                    } else {
                        // insufficient funds visual feedback
                        console.log("Not enough resources!");
                    }
                }
            }
        });
    }

    update(time, delta) {
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
    }
}

const config = {
    type: Phaser.AUTO,
    width: 64 * 20,
    height: 64 * 15,
    parent: 'game-container',
    backgroundColor: '#000000',
    scene: [MainScene]
};

const game = new Phaser.Game(config);