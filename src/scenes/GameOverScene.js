// Game Over Scene - Shows results after losing/winning
class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.resultData = data || {
            wave: 0,
            goldEarned: 0,
            enemiesKilled: 0,
            isVictory: false
        };
    }

    create() {
        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        // Background
        this.add.rectangle(width / 2, height / 2, width, height, 0x1a1a2e);

        // Particles effect
        this.createParticles();

        // Title
        const title = this.resultData.isVictory ? 'VICTORY!' : 'GAME OVER';
        const titleColor = this.resultData.isVictory ? '#ffd700' : '#ff4444';

        const titleText = this.add.text(width / 2, 80, title, {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Animate title
        this.tweens.add({
            targets: titleText,
            scale: 1.1,
            duration: 1000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Stats panel
        this.createStatsPanel(width / 2, height / 2 - 30);

        // Buttons
        this.createButton(width / 2 - 120, height - 100, 'Play Again', () => {
            this.scene.start('GameScene');
        });

        this.createButton(width / 2 + 120, height - 100, 'Main Menu', () => {
            this.scene.start('MenuScene');
        });

        // Tip
        const tips = [
            'Tip: Reach wave 10 to earn 1 XP for upgrades!',
            'Tip: Knights are great tanks for protecting archers!',
            'Tip: Wizards deal splash damage to groups!',
            'Tip: Use XP in the Upgrades menu to unlock units!',
            'Tip: Giants can soak up a lot of damage!'
        ];
        const randomTip = tips[Math.floor(Math.random() * tips.length)];

        this.add.text(width / 2, height - 30, randomTip, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
    }

    createParticles() {
        // Create floating particles
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(0, GAME_HEIGHT);
            const size = Phaser.Math.Between(2, 6);
            const color = this.resultData.isVictory ? 0xffd700 : 0xff4444;

            const particle = this.add.circle(x, y, size, color, 0.3);

            this.tweens.add({
                targets: particle,
                y: y - Phaser.Math.Between(50, 150),
                alpha: 0,
                duration: Phaser.Math.Between(2000, 4000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000)
            });
        }
    }

    createStatsPanel(x, y) {
        const panel = this.add.container(x, y);

        // Background
        const bg = this.add.rectangle(0, 0, 400, 260, 0x000000, 0.8);
        bg.setStrokeStyle(3, 0x4169E1);
        panel.add(bg);

        // Title
        const statsTitle = this.add.text(0, -105, 'BATTLE RESULTS', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        panel.add(statsTitle);

        // Wave reached
        const waveText = this.add.text(0, -60, `Wave Reached: ${this.resultData.wave}`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#4169E1'
        }).setOrigin(0.5);
        panel.add(waveText);

        // XP earned (1 per 10 waves)
        const xpEarned = Math.floor(this.resultData.wave / 10);
        const xpText = this.add.text(0, -15, `⭐ XP Earned: +${xpEarned}`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#44ddff'
        }).setOrigin(0.5);
        panel.add(xpText);

        if (xpEarned > 0) {
            this.tweens.add({
                targets: xpText,
                scale: 1.1,
                duration: 300,
                yoyo: true,
                repeat: 2
            });
        }

        // Enemies killed
        const killsText = this.add.text(0, 25, `Enemies Killed: ${this.resultData.enemiesKilled}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ff6b6b'
        }).setOrigin(0.5);
        panel.add(killsText);

        // Gold earned (in-game only, doesn't persist)
        const goldText = this.add.text(0, 55, `Gold Earned: ${this.resultData.goldEarned}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffd700'
        }).setOrigin(0.5);
        panel.add(goldText);

        // High score indicator
        const saveData = saveSystem.load();
        if (this.resultData.wave >= saveData.highestWave) {
            const newRecord = this.add.text(0, 95, '★ NEW RECORD! ★', {
                fontSize: '20px',
                fontFamily: 'Arial',
                color: '#ffd700'
            }).setOrigin(0.5);
            panel.add(newRecord);

            this.tweens.add({
                targets: newRecord,
                scale: 1.2,
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        } else {
            const bestText = this.add.text(0, 95, `Best: Wave ${saveData.highestWave}`, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5);
            panel.add(bestText);
        }

        // Show total XP
        const totalXp = saveData.xp || 0;
        const totalXpText = this.add.text(0, 115, `Total XP: ${totalXp}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        panel.add(totalXpText);
    }

    createButton(x, y, text, callback) {
        const button = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 200, 50, 0x4169E1);
        bg.setStrokeStyle(3, 0x6495ED);
        button.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        button.add(label);

        bg.setInteractive({ useHandCursor: true });

        bg.on('pointerover', () => {
            bg.setFillStyle(0x5179F1);
            bg.setStrokeStyle(3, 0xffffff);
            this.tweens.add({
                targets: button,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x4169E1);
            bg.setStrokeStyle(3, 0x6495ED);
            this.tweens.add({
                targets: button,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            this.tweens.add({
                targets: button,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 50,
                yoyo: true,
                onComplete: callback
            });
        });

        return button;
    }
}
