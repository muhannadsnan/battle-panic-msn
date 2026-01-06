// Menu Scene - Main menu
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        // Background gradient effect
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Add some decorative elements
        for (let i = 0; i < 20; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, height);
            const size = Phaser.Math.Between(2, 5);
            const star = this.add.circle(x, y, size, 0xffffff, 0.3);

            this.tweens.add({
                targets: star,
                alpha: 0.8,
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1
            });
        }

        // Title
        const title = this.add.text(width / 2, 100, 'BATTLE PANIC', {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: title,
            y: 110,
            duration: 2000,
            ease: 'Sine.easeInOut',
            yoyo: true,
            repeat: -1
        });

        // Subtitle
        this.add.text(width / 2, 170, 'Defend Your Castle!', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Load save data for stats display
        const saveData = saveSystem.load();

        // Stats display
        this.add.text(width / 2, 220, `Highest Wave: ${saveData.highestWave}  |  Total Gold: ${saveData.totalGoldEarned}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);

        // Play button
        this.createButton(width / 2, 320, 'PLAY', () => {
            this.scene.start('GameScene');
        });

        // Upgrades button
        this.createButton(width / 2, 400, 'UPGRADES', () => {
            this.scene.start('UpgradeScene');
        });

        // Reset button (smaller)
        this.createSmallButton(width / 2, 480, 'Reset Progress', () => {
            this.confirmReset();
        });

        // Instructions
        this.add.text(width / 2, 550, 'Press 1-5 to spawn units  |  Defend your castle from waves of enemies!', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#666666'
        }).setOrigin(0.5);

        // Version
        this.add.text(10, height - 20, 'v1.0.0', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#444444'
        });
    }

    createButton(x, y, text, callback) {
        // Text-only button, no boxes
        const label = this.add.text(x, y, text, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        label.setInteractive({ useHandCursor: true });

        label.on('pointerover', () => {
            label.setColor('#6495ED');
            this.tweens.add({
                targets: label,
                scaleX: 1.1,
                scaleY: 1.1,
                duration: 100
            });
        });

        label.on('pointerout', () => {
            label.setColor('#4169E1');
            this.tweens.add({
                targets: label,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        label.on('pointerdown', () => {
            this.tweens.add({
                targets: label,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return label;
    }

    createSmallButton(x, y, text, callback) {
        // Text-only small button, no boxes
        const label = this.add.text(x, y, text, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        label.setInteractive({ useHandCursor: true });

        label.on('pointerover', () => {
            label.setColor('#ffffff');
        });

        label.on('pointerout', () => {
            label.setColor('#888888');
        });

        label.on('pointerdown', callback);

        return label;
    }

    confirmReset() {
        // Create confirmation dialog - minimal, no boxes
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Dark overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
        dialog.add(overlay);

        const title = this.add.text(0, -40, 'Reset Progress?', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const message = this.add.text(0, 10, 'This will delete all save data!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        dialog.add(message);

        // Yes text button
        const yesText = this.add.text(-60, 60, 'YES', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        yesText.setInteractive({ useHandCursor: true });
        dialog.add(yesText);

        yesText.on('pointerdown', () => {
            saveSystem.reset();
            this.scene.restart();
        });

        // No text button
        const noText = this.add.text(60, 60, 'NO', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        noText.setInteractive({ useHandCursor: true });
        dialog.add(noText);

        noText.on('pointerdown', () => {
            dialog.destroy();
        });

        dialog.setDepth(1000);
    }
}
