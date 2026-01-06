// Boot Scene - Initial loading and setup
class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Show loading text
        const loadingText = this.add.text(
            GAME_WIDTH / 2,
            GAME_HEIGHT / 2,
            'Loading...',
            {
                fontSize: '32px',
                fontFamily: 'Arial',
                color: '#ffffff'
            }
        ).setOrigin(0.5);

        // We're using shapes instead of images, so minimal loading needed
        // If you add images later, load them here
    }

    create() {
        // Initialize save system
        this.gameData = saveSystem.load();

        // Transition to preload scene
        this.scene.start('PreloadScene');
    }
}
