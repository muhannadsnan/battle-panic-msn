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

        // Hide default cursor and create sword cursor
        this.input.setDefaultCursor('none');
        this.createSwordCursor();

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

        // Version (more visible)
        this.add.text(width / 2, height - 12, 'v1.2.0', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#666666',
            stroke: '#000000',
            strokeThickness: 2
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
        const bg = this.add.rectangle(0, 0, 400, 300, 0x000000, 0.8);
        bg.setStrokeStyle(3, 0x4169E1);
        panel.add(bg);

        // Title
        const statsTitle = this.add.text(0, -125, 'BATTLE RESULTS', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        panel.add(statsTitle);

        // Wave reached
        const waveText = this.add.text(0, -85, `Wave Reached: ${this.resultData.wave}`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#4169E1'
        }).setOrigin(0.5);
        panel.add(waveText);

        // XP Stars display
        const starsEarned = this.resultData.wave >= 30 ? 3 :
                           this.resultData.wave >= 20 ? 2 :
                           this.resultData.wave >= 10 ? 1 : 0;

        this.createStarDisplay(panel, 0, -40, starsEarned);

        // XP earned text
        const xpEarned = Math.floor(this.resultData.wave / 10);
        const xpText = this.add.text(0, 5, `XP Earned: +${xpEarned}`, {
            fontSize: '18px',
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
        const killsText = this.add.text(0, 35, `Enemies Killed: ${this.resultData.enemiesKilled}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ff6b6b'
        }).setOrigin(0.5);
        panel.add(killsText);

        // Gold earned (in-game only, doesn't persist)
        const goldText = this.add.text(0, 65, `Gold Earned: ${this.resultData.goldEarned}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffd700'
        }).setOrigin(0.5);
        panel.add(goldText);

        // High score indicator
        const saveData = saveSystem.load();
        if (this.resultData.wave >= saveData.highestWave) {
            const newRecord = this.add.text(0, 100, '★ NEW RECORD! ★', {
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
            const bestText = this.add.text(0, 100, `Best: Wave ${saveData.highestWave}`, {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#888888'
            }).setOrigin(0.5);
            panel.add(bestText);
        }

        // Show total XP
        const totalXp = saveData.xp || 0;
        const totalXpText = this.add.text(0, 125, `Total XP: ${totalXp}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        panel.add(totalXpText);
    }

    createStarDisplay(panel, x, y, earnedCount) {
        const starSpacing = 70;
        const stars = [];

        for (let i = 0; i < 3; i++) {
            const starX = x + (i - 1) * starSpacing;
            const isEarned = i < earnedCount;
            const star = this.createStar(starX, y, isEarned);
            panel.add(star);
            stars.push(star);

            // Animate earned stars with delay
            if (isEarned) {
                star.setScale(0);
                this.tweens.add({
                    targets: star,
                    scale: 1,
                    duration: 500,
                    delay: 400 + i * 350,
                    ease: 'Back.easeOut',
                    onStart: () => {
                        if (typeof audioManager !== 'undefined') {
                            audioManager.playSpawn();
                        }
                    }
                });

                // Gentle glow pulse for earned stars
                this.tweens.add({
                    targets: star,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    duration: 1000,
                    delay: 900 + i * 350,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
            }
        }

        // Add milestone labels below stars
        const milestones = ['Wave 10', 'Wave 20', 'Wave 30'];
        for (let i = 0; i < 3; i++) {
            const labelX = x + (i - 1) * starSpacing;
            const isEarned = i < earnedCount;
            const label = this.add.text(labelX, y + 32, milestones[i], {
                fontSize: '11px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: isEarned ? '#ffd700' : '#555555'
            }).setOrigin(0.5);
            panel.add(label);
        }
    }

    createStar(x, y, isEarned) {
        const container = this.add.container(x, y);
        const graphics = this.add.graphics();

        const size = 22; // Star radius
        const innerSize = size * 0.4; // Inner radius for star points

        // Colors
        const fillColor = isEarned ? 0xffd700 : 0x3a3a3a;
        const borderColor = isEarned ? 0xb8860b : 0x222222;
        const highlightColor = isEarned ? 0xffec80 : 0x4a4a4a;

        // Calculate star points (5-pointed star)
        const points = [];
        for (let i = 0; i < 10; i++) {
            const radius = i % 2 === 0 ? size : innerSize;
            const angle = (i * Math.PI / 5) - Math.PI / 2; // Start from top
            points.push({
                x: Math.cos(angle) * radius,
                y: Math.sin(angle) * radius
            });
        }

        // Draw outer glow for earned stars
        if (isEarned) {
            graphics.fillStyle(0xffd700, 0.2);
            graphics.fillCircle(0, 0, size + 12);
            graphics.fillStyle(0xffd700, 0.1);
            graphics.fillCircle(0, 0, size + 20);
        }

        // Draw border (slightly larger star behind)
        graphics.fillStyle(borderColor, 1);
        graphics.beginPath();
        graphics.moveTo(points[0].x * 1.15, points[0].y * 1.15);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x * 1.15, points[i].y * 1.15);
        }
        graphics.closePath();
        graphics.fillPath();

        // Draw main star
        graphics.fillStyle(fillColor, 1);
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.fillPath();

        // Draw inner highlight (smaller star offset up-left)
        if (isEarned) {
            graphics.fillStyle(highlightColor, 0.6);
            graphics.beginPath();
            const highlightScale = 0.5;
            const offsetX = -3;
            const offsetY = -3;
            graphics.moveTo(points[0].x * highlightScale + offsetX, points[0].y * highlightScale + offsetY);
            for (let i = 1; i < points.length; i++) {
                graphics.lineTo(points[i].x * highlightScale + offsetX, points[i].y * highlightScale + offsetY);
            }
            graphics.closePath();
            graphics.fillPath();
        }

        container.add(graphics);
        return container;
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

    createSwordCursor() {
        this.swordCursor = this.add.container(0, 0);
        this.swordCursor.setDepth(2000);

        // Sword blade
        const blade = this.add.rectangle(0, -20, 8, 40, 0xC0C0C0);
        blade.setStrokeStyle(1, 0x888888);
        this.swordCursor.add(blade);
        this.swordCursor.add(this.add.rectangle(-1, -20, 3, 36, 0xE8E8E8));
        this.swordCursor.add(this.add.rectangle(0, -42, 6, 8, 0xD0D0D0));
        this.swordCursor.add(this.add.rectangle(0, -48, 4, 6, 0xE0E0E0));

        // Cross guard
        const guard = this.add.rectangle(0, 2, 24, 6, 0xFFD700);
        guard.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(guard);
        this.swordCursor.add(this.add.rectangle(-14, 4, 6, 4, 0xFFD700));
        this.swordCursor.add(this.add.rectangle(14, 4, 6, 4, 0xFFD700));

        // Handle
        this.swordCursor.add(this.add.rectangle(0, 16, 6, 20, 0x8B4513));
        for (let i = 0; i < 4; i++) {
            this.swordCursor.add(this.add.rectangle(0, 8 + i * 5, 7, 2, 0x654321));
        }

        // Pommel
        const pommel = this.add.rectangle(0, 28, 10, 8, 0xFFD700);
        pommel.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(pommel);

        this.swordCursor.setAngle(-30);
        this.swordCursor.setScale(0.8);

        // Follow mouse - offset to align sword tip with cursor
        this.input.on('pointermove', (pointer) => {
            this.swordCursor.setPosition(pointer.x + 20, pointer.y + 35);
        });
    }

    update() {
        if (this.swordCursor) {
            const pointer = this.input.activePointer;
            this.swordCursor.setPosition(pointer.x + 20, pointer.y + 35);
        }
    }
}
