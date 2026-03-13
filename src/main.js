import Phaser from 'phaser';

class MainScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MainScene' });
        this.tileSize = 64;
        this.mapCols = 20;
        this.mapRows = 15;
    }

    preload() {
        // We'll generate a simple texture for the grass and wall instead of loading an image
        let g = this.make.graphics({x: 0, y: 0, add: false});
        g.fillStyle(0x3ea135);
        g.fillRect(0, 0, this.tileSize, this.tileSize);
        g.generateTexture('grass', this.tileSize, this.tileSize);

        g.clear();
        g.fillStyle(0x888888);
        g.lineStyle(2, 0x000000);
        g.fillRect(0, 0, this.tileSize, this.tileSize);
        g.strokeRect(0, 0, this.tileSize, this.tileSize);
        g.generateTexture('wall', this.tileSize, this.tileSize);

        g.clear();
        g.fillStyle(0xff0000);
        g.fillCircle(this.tileSize/2, this.tileSize/2, this.tileSize/3);
        g.generateTexture('unit', this.tileSize, this.tileSize);
    }

    create() {
        // Draw basic grid map
        this.walls = [];
        for(let y = 0; y < this.mapRows; y++) {
            for(let x = 0; x < this.mapCols; x++) {
                this.add.image(x * this.tileSize + this.tileSize/2, y * this.tileSize + this.tileSize/2, 'grass');
            }
        }

        // Draw grid lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x2e7527, 0.5);
        for(let x = 0; x <= this.mapCols; x++) {
            grid.moveTo(x * this.tileSize, 0);
            grid.lineTo(x * this.tileSize, this.mapRows * this.tileSize);
        }
        for(let y = 0; y <= this.mapRows; y++) {
            grid.moveTo(0, y * this.tileSize);
            grid.lineTo(this.mapCols * this.tileSize, y * this.tileSize);
        }
        grid.strokePath();

        // Create a mock unit
        this.unit = this.add.sprite(3 * this.tileSize + this.tileSize/2, 3 * this.tileSize + this.tileSize/2, 'unit');
        this.unit.target = null;
        this.unit.speed = 100;

        // Input handler for building walls or moving units
        this.input.on('pointerdown', (pointer) => {
            let col = Math.floor(pointer.x / this.tileSize);
            let row = Math.floor(pointer.y / this.tileSize);

            // Simple click to move logic, shift-click to build a wall
            if (pointer.event.shiftKey) {
                // Build wall
                let wallX = col * this.tileSize + this.tileSize/2;
                let wallY = row * this.tileSize + this.tileSize/2;
                this.add.image(wallX, wallY, 'wall');
                this.walls.push({col, row});
            } else {
                // Move unit
                this.unit.target = {
                    x: col * this.tileSize + this.tileSize/2,
                    y: row * this.tileSize + this.tileSize/2
                };
            }
        });

        // Instructions
        this.add.text(10, 10, 'Click to move unit\nShift+Click to place walls', {
            font: '16px Arial',
            fill: '#ffffff',
            backgroundColor: '#00000088',
            padding: { x: 5, y: 5 }
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