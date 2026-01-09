// Menu Scene - Main menu
class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const width = GAME_WIDTH;
        const height = GAME_HEIGHT;

        // Hide default cursor
        this.input.setDefaultCursor('none');

        // Create sword cursor
        this.createSwordCursor();

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
        const rankInfo = saveSystem.getRankInfo(saveData);

        // Rank display
        this.createRankDisplay(width / 2, 250, rankInfo);

        // Stats display - under subtitle in white
        this.add.text(width / 2, 200, `Highest Wave: ${saveData.highestWave}`, {
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        // Play button
        this.createButton(width / 2, 360, 'PLAY', () => {
            this.scene.start('GameScene');
        });

        // Upgrades button
        this.createButton(width / 2, 430, 'UPGRADES', () => {
            this.scene.start('UpgradeScene');
        });

        // Reset upgrades button (at bottom)
        this.createSmallButton(width / 2, height - 15, 'Reset Upgrades (2 XP)', () => {
            this.confirmResetUpgrades();
        });

        // Buy XP button (bottom left)
        this.createBuyXPButton(100, height - 60);

        // Buy me a coffee button (bottom right)
        this.createCoffeeButton(width - 100, height - 60);

        // Version (top right corner)
        this.add.text(width - 10, 15, GAME_VERSION, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#666666',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0);
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

        label.setInteractive({});

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
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        label.setInteractive({});

        label.on('pointerover', () => {
            label.setColor('#ffffff');
        });

        label.on('pointerout', () => {
            label.setColor('#888888');
        });

        label.on('pointerdown', callback);

        return label;
    }

    createCoffeeButton(x, y) {
        const container = this.add.container(x, y);

        // Background with warm coffee color
        const bg = this.add.rectangle(0, 0, 180, 70, 0x8B4513);
        bg.setStrokeStyle(3, 0xFFD700);
        container.add(bg);

        // Coffee cup icon (made of shapes)
        const cupBody = this.add.rectangle(-55, 5, 30, 35, 0xFFFFFF);
        container.add(cupBody);
        const cupHandle = this.add.rectangle(-35, 5, 10, 15, 0x8B4513);
        cupHandle.setStrokeStyle(3, 0xFFFFFF);
        container.add(cupHandle);
        // Coffee inside
        const coffee = this.add.rectangle(-55, 10, 24, 20, 0x4A2C2A);
        container.add(coffee);
        // Steam (three wavy lines represented as small rectangles)
        const steam1 = this.add.rectangle(-60, -18, 3, 8, 0xFFFFFF, 0.6);
        const steam2 = this.add.rectangle(-55, -20, 3, 10, 0xFFFFFF, 0.6);
        const steam3 = this.add.rectangle(-50, -18, 3, 8, 0xFFFFFF, 0.6);
        container.add(steam1);
        container.add(steam2);
        container.add(steam3);

        // Animate steam
        this.tweens.add({
            targets: [steam1, steam2, steam3],
            y: '-=5',
            alpha: 0,
            duration: 1500,
            ease: 'Sine.easeOut',
            yoyo: true,
            repeat: -1
        });

        // Text
        const text = this.add.text(15, -8, 'Buy me a', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#FFD700'
        }).setOrigin(0.5);
        container.add(text);

        const text2 = this.add.text(15, 10, 'COFFEE', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        container.add(text2);

        // Make interactive
        bg.setInteractive({});

        bg.on('pointerover', () => {
            bg.setFillStyle(0xA0522D);
            this.tweens.add({
                targets: container,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 100
            });
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x8B4513);
            this.tweens.add({
                targets: container,
                scaleX: 1,
                scaleY: 1,
                duration: 100
            });
        });

        bg.on('pointerdown', () => {
            window.open('https://www.buymeacoffee.com/masterassassin', '_blank');
        });

        return container;
    }

    createBuyXPButton(x, y) {
        // "Coming Soon" label above button
        this.add.text(x, y - 52, 'Coming Soon', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'italic',
            color: '#ffaa00'
        }).setOrigin(0.5);

        const container = this.add.container(x, y);

        // Background - greyed out (disabled)
        const bg = this.add.rectangle(0, 0, 160, 60, 0x333333);
        bg.setStrokeStyle(3, 0x555555);
        container.add(bg);

        // Star icon for XP (dimmed)
        const star = this.add.text(-50, 0, '⭐', {
            fontSize: '32px'
        }).setOrigin(0.5);
        star.setAlpha(0.4);
        container.add(star);

        // Text (dimmed)
        const text = this.add.text(20, -8, '10 XP', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#666666'
        }).setOrigin(0.5);
        container.add(text);

        const text2 = this.add.text(20, 14, 'for $2', {
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#555555'
        }).setOrigin(0.5);
        container.add(text2);

        // No interactivity - button is disabled

        return container;
    }

    showXPPurchaseInfo() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
        dialog.add(overlay);

        const title = this.add.text(0, -50, 'Thanks for Supporting!', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44DDFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const message = this.add.text(0, 0, 'After your $2 donation, click below\nto receive your 10 XP!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        dialog.add(message);

        // Claim XP button
        const claimText = this.add.text(0, 60, 'CLAIM 10 XP', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44FF44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        claimText.setInteractive({});
        dialog.add(claimText);

        claimText.on('pointerdown', () => {
            saveSystem.addXP(10);
            dialog.destroy();
            this.scene.restart();
        });

        // Cancel button
        const cancelText = this.add.text(0, 100, 'Cancel', {
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        cancelText.setInteractive({});
        dialog.add(cancelText);

        cancelText.on('pointerdown', () => {
            dialog.destroy();
        });

        dialog.setDepth(1000);
    }

    confirmResetUpgrades() {
        const saveData = saveSystem.load();
        const spentXP = saveSystem.calculateSpentXP(saveData);
        const currentXP = saveData.xp || 0;
        const totalXP = currentXP + spentXP;

        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8);
        dialog.add(overlay);

        const title = this.add.text(0, -60, 'Reset Upgrades?', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const info = this.add.text(0, -10, `This will reset all upgrades to default.\nYou have ${spentXP} XP in upgrades.\nCost: 2 XP fee\nYou'll get back: ${Math.max(0, spentXP - 2)} XP`, {
            fontSize: '21px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        dialog.add(info);

        const canReset = totalXP >= 2;

        // Yes button
        const yesText = this.add.text(-60, 70, 'RESET', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: canReset ? '#ffaa00' : '#666666',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        if (canReset) {
            yesText.setInteractive({});
            yesText.on('pointerdown', () => {
                const result = saveSystem.resetUpgrades();
                if (result.success) {
                    dialog.destroy();
                    this.scene.restart();
                }
            });
        }
        dialog.add(yesText);

        // No button
        const noText = this.add.text(60, 70, 'CANCEL', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        noText.setInteractive({});
        dialog.add(noText);

        noText.on('pointerdown', () => {
            dialog.destroy();
        });

        if (!canReset) {
            const warning = this.add.text(0, 110, 'Need at least 2 XP total to reset!', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ff4444'
            }).setOrigin(0.5);
            dialog.add(warning);
        }

        dialog.setDepth(1000);
    }

    createRankDisplay(x, y, rankInfo) {
        const container = this.add.container(x, y);

        // Rank icon and full name with grade (e.g., "⚔️ Soldier II")
        const rankText = this.add.text(0, 0, `${rankInfo.rank.icon} ${rankInfo.rank.fullName}`, {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: rankInfo.rank.color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(rankText);

        // Score display
        const scoreText = this.add.text(0, 20, `Score: ${rankInfo.score}`, {
            fontSize: '13px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        container.add(scoreText);

        // Progress bar background
        const barWidth = 160;
        const barHeight = 10;
        const barBg = this.add.rectangle(0, 38, barWidth, barHeight, 0x333333);
        barBg.setStrokeStyle(1, 0x555555);
        container.add(barBg);

        // Progress bar fill
        const fillWidth = barWidth * rankInfo.progress;
        if (fillWidth > 0) {
            const barFill = this.add.rectangle(
                -barWidth / 2 + fillWidth / 2,
                38,
                fillWidth,
                barHeight - 2,
                Phaser.Display.Color.HexStringToColor(rankInfo.rank.color).color
            );
            container.add(barFill);
        }

        // Progress text - shows next grade or next rank
        if (rankInfo.isMaxGrade) {
            const maxText = this.add.text(0, 54, '⚡ MAX RANK ⚡', {
                fontSize: '13px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffd700'
            }).setOrigin(0.5);
            container.add(maxText);
        } else {
            // Determine what's next (next grade or next rank tier)
            const nextLabel = rankInfo.rank.grade < 3
                ? `${rankInfo.rank.name} ${['II', 'III'][rankInfo.rank.grade - 1]}`
                : rankInfo.nextRank.name + ' I';
            const progressText = this.add.text(0, 54, `${rankInfo.pointsToNext} pts to ${nextLabel}`, {
                fontSize: '13px',
                fontFamily: 'Arial',
                color: '#666666'
            }).setOrigin(0.5);
            container.add(progressText);
        }

        return container;
    }

    createSwordCursor() {
        this.swordCursor = this.add.container(0, 0);

        // Sword blade (silver/steel)
        const blade = this.add.rectangle(0, -20, 8, 40, 0xC0C0C0);
        blade.setStrokeStyle(1, 0x888888);
        this.swordCursor.add(blade);

        // Blade highlight
        const highlight = this.add.rectangle(-1, -20, 3, 36, 0xE8E8E8);
        this.swordCursor.add(highlight);

        // Blade tip
        const tip = this.add.rectangle(0, -42, 6, 8, 0xD0D0D0);
        this.swordCursor.add(tip);
        const tipPoint = this.add.rectangle(0, -48, 4, 6, 0xE0E0E0);
        this.swordCursor.add(tipPoint);

        // Cross guard (gold)
        const guard = this.add.rectangle(0, 2, 24, 6, 0xFFD700);
        guard.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(guard);

        // Guard ends (curved look with rectangles)
        const guardLeft = this.add.rectangle(-14, 4, 6, 4, 0xFFD700);
        const guardRight = this.add.rectangle(14, 4, 6, 4, 0xFFD700);
        this.swordCursor.add(guardLeft);
        this.swordCursor.add(guardRight);

        // Handle (brown leather wrap)
        const handle = this.add.rectangle(0, 16, 6, 20, 0x8B4513);
        this.swordCursor.add(handle);

        // Handle wrap lines
        for (let i = 0; i < 4; i++) {
            const wrap = this.add.rectangle(0, 8 + i * 5, 7, 2, 0x654321);
            this.swordCursor.add(wrap);
        }

        // Pommel (gold ball at bottom)
        const pommel = this.add.rectangle(0, 28, 10, 8, 0xFFD700);
        pommel.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(pommel);

        // Slight tilt for style
        this.swordCursor.setAngle(-30);
        this.swordCursor.setDepth(2000);
        this.swordCursor.setScale(0.8);

        // Subtle idle animation
        this.tweens.add({
            targets: this.swordCursor,
            angle: -25,
            duration: 1500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    update() {
        // Update sword cursor position - tip points at cursor
        if (this.swordCursor) {
            const pointer = this.input.activePointer;
            // Offset to align sword tip with actual cursor position
            // Sword tip is at y=-48 (scaled 0.8 = -38.4), rotated -30 degrees
            this.swordCursor.x = pointer.x + 20;
            this.swordCursor.y = pointer.y + 35;
        }
    }
}
