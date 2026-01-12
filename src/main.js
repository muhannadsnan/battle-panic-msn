// Main Entry Point - Phaser Game Configuration
const config = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent: 'game-container',
    backgroundColor: '#1a1a2e',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scene: [
        BootScene,
        PreloadScene,
        MenuScene,
        AuthScene,
        GameScene,
        UpgradeScene,
        GameOverScene
    ],
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    input: {
        activePointers: 3,  // Support multi-touch
        touch: {
            capture: true   // Capture touch events
        }
    },
    render: {
        pixelArt: false,
        antialias: true
    }
};

// Create the game instance
const game = new Phaser.Game(config);

// Handle window focus/blur for pausing
window.addEventListener('blur', () => {
    if (game.scene.isActive('GameScene')) {
        const gameScene = game.scene.getScene('GameScene');
        if (gameScene && !gameScene.isPaused) {
            // Could auto-pause here if desired
            // gameScene.togglePause();
        }
    }
});

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// Log game start
console.log('Battle Panic Clone loaded successfully!');
console.log('Controls: 1-5 to spawn units, ESC/P to pause');
