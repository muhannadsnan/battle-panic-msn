// Preload Scene - Asset loading with progress bar
class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: 'PreloadScene' });
    }

    preload() {
        // Create loading bar
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Title
        this.add.text(width / 2, height / 2 - 100, 'BATTLE PANIC', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(width / 2, height / 2 - 50, 'Castle Defense', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Progress bar background
        const progressBarBg = this.add.rectangle(width / 2, height / 2 + 50, 400, 30, 0x333333);
        progressBarBg.setStrokeStyle(2, 0x666666);

        // Progress bar fill
        const progressBar = this.add.rectangle(width / 2 - 195, height / 2 + 50, 0, 24, 0x4169E1);
        progressBar.setOrigin(0, 0.5);

        // Loading text
        const loadingText = this.add.text(width / 2, height / 2 + 100, 'Loading...', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Progress tracking
        this.load.on('progress', (value) => {
            progressBar.width = 390 * value;
            loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
        });

        this.load.on('complete', () => {
            loadingText.setText('Ready!');
        });

        // Game uses procedural graphics by default
        // Asset loading is disabled until assets are added
        // See assets/ASSETS.txt for instructions on adding sprite assets
    }

    create() {
        // Set flag for procedural graphics (no sprite assets loaded)
        this.registry.set('useProceduralGraphics', true);

        // Short delay before going to menu
        this.time.delayedCall(500, () => {
            this.scene.start('MenuScene');
        });
    }
}
