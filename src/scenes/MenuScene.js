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

        // Ground at bottom
        this.add.rectangle(width / 2, height - 40, width, 80, 0x2d4a2d); // Dark grass
        this.add.rectangle(width / 2, height - 15, width, 30, 0x3d5a3d); // Lighter grass top
        // Ground texture details
        for (let i = 0; i < 30; i++) {
            const gx = Phaser.Math.Between(0, width);
            this.add.rectangle(gx, height - 30 + Phaser.Math.Between(-10, 10), 3, 8, 0x4a6a4a, 0.5);
        }

        // Add battlefield characters - enemies on left, units on right
        this.createBattlefieldDisplay();

        // Add some decorative stars (fewer, only in top area)
        for (let i = 0; i < 12; i++) {
            const x = Phaser.Math.Between(0, width);
            const y = Phaser.Math.Between(0, 200);
            const size = Phaser.Math.Between(2, 4);
            const star = this.add.circle(x, y, size, 0xffffff, 0.2);

            this.tweens.add({
                targets: star,
                alpha: 0.6,
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

        // Tips button
        this.createSmallButton(width / 2, 480, 'TIPS & INFO', () => {
            this.showTipsPanel();
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

        // Settings gear icon (top left corner)
        this.createSettingsGear(40, 40);
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
        const text = this.add.text(20, -8, '25 XP', {
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

        const message = this.add.text(0, 0, 'After your $2 donation, click below\nto receive your 25 XP!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        dialog.add(message);

        // Claim XP button
        const claimText = this.add.text(0, 60, 'CLAIM 25 XP', {
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
            saveSystem.addXP(25);
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

    createSettingsGear(x, y) {
        const container = this.add.container(x, y);

        // Simple Minecraft-like 2D gear
        // Gear body - simple gray circle
        const gearBody = this.add.circle(0, 0, 16, 0x888888);
        container.add(gearBody);

        // Simple square teeth - 8 teeth, no fancy effects
        for (let i = 0; i < 8; i++) {
            const angle = (i * 45) * Math.PI / 180;
            const toothX = Math.cos(angle) * 18;
            const toothY = Math.sin(angle) * 18;
            const tooth = this.add.rectangle(toothX, toothY, 10, 8, 0x888888);
            tooth.setAngle(i * 45);
            container.add(tooth);
        }

        // Center hole - simple dark circle
        const hole = this.add.circle(0, 0, 6, 0x333333);
        container.add(hole);

        // Hit area
        const hitArea = this.add.circle(0, 0, 28, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Simple hover effect - just brighten
        hitArea.on('pointerover', () => {
            gearBody.setFillStyle(0xaaaaaa);
            container.list.forEach(child => {
                if (child !== hitArea && child !== hole) {
                    if (child.setFillStyle) child.setFillStyle(0xaaaaaa);
                }
            });
        });

        hitArea.on('pointerout', () => {
            gearBody.setFillStyle(0x888888);
            container.list.forEach(child => {
                if (child !== hitArea && child !== hole) {
                    if (child.setFillStyle) child.setFillStyle(0x888888);
                }
            });
        });

        hitArea.on('pointerdown', () => {
            this.showSettingsPanel();
        });

        return container;
    }

    createBattlefieldDisplay() {
        // LEFT SIDE - ENEMIES (facing right)

        // Far layer - small goblins (dark, distant)
        this.createGoblin(60, 420, 0.5, 0.3);
        this.createGoblin(100, 400, 0.4, 0.25);
        this.createGoblin(40, 380, 0.45, 0.28);

        // Mid layer - orc and skeleton
        this.createOrc(130, 460, 0.7, 0.6);
        this.createSkeleton(70, 480, 0.65, 0.55);

        // Near layer - large troll
        this.createTroll(160, 520, 1.0, 1.0);

        // RIGHT SIDE - PLAYER UNITS (facing left)

        // Far layer - small peasants (dark, distant)
        this.createPeasant(GAME_WIDTH - 60, 420, 0.5, 0.3, true);
        this.createPeasant(GAME_WIDTH - 100, 405, 0.45, 0.28, true);
        this.createPeasant(GAME_WIDTH - 45, 390, 0.4, 0.25, true);

        // Mid layer - archer and knight
        this.createArcher(GAME_WIDTH - 140, 460, 0.7, 0.6, true);
        this.createKnight(GAME_WIDTH - 80, 475, 0.7, 0.6, true);

        // Near layer - large giant
        this.createGiant(GAME_WIDTH - 170, 510, 1.0, 1.0, true);
    }

    // Enemy sprites
    createGoblin(x, y, scale, alpha) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        container.setAlpha(alpha);

        // Body (green)
        container.add(this.add.rectangle(0, 0, 20, 25, 0x32CD32));
        // Head
        container.add(this.add.rectangle(0, -18, 16, 14, 0x32CD32));
        // Eyes
        container.add(this.add.rectangle(-4, -20, 4, 4, 0xff0000));
        container.add(this.add.rectangle(4, -20, 4, 4, 0xff0000));
        // Ears (pointy)
        container.add(this.add.rectangle(-10, -22, 6, 8, 0x32CD32));
        container.add(this.add.rectangle(10, -22, 6, 8, 0x32CD32));
        // Legs
        container.add(this.add.rectangle(-5, 18, 6, 12, 0x228B22));
        container.add(this.add.rectangle(5, 18, 6, 12, 0x228B22));

        // Idle animation
        this.tweens.add({
            targets: container,
            y: y - 3,
            duration: 800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createOrc(x, y, scale, alpha) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        container.setAlpha(alpha);

        // Body (dark green, bulky)
        container.add(this.add.rectangle(0, 0, 30, 35, 0x556B2F));
        // Head
        container.add(this.add.rectangle(0, -24, 22, 18, 0x556B2F));
        // Eyes
        container.add(this.add.rectangle(-5, -26, 5, 5, 0xff4444));
        container.add(this.add.rectangle(5, -26, 5, 5, 0xff4444));
        // Tusks
        container.add(this.add.rectangle(-8, -18, 4, 8, 0xfffff0));
        container.add(this.add.rectangle(8, -18, 4, 8, 0xfffff0));
        // Arms
        container.add(this.add.rectangle(-18, 0, 10, 25, 0x4a5a2f));
        container.add(this.add.rectangle(18, 0, 10, 25, 0x4a5a2f));
        // Legs
        container.add(this.add.rectangle(-8, 24, 10, 16, 0x3a4a1f));
        container.add(this.add.rectangle(8, 24, 10, 16, 0x3a4a1f));

        this.tweens.add({
            targets: container,
            y: y - 4,
            duration: 1000 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createSkeleton(x, y, scale, alpha) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        container.setAlpha(alpha);

        // Body (bone white)
        container.add(this.add.rectangle(0, 0, 18, 28, 0xD3D3D3));
        // Ribcage lines
        container.add(this.add.rectangle(0, -5, 14, 3, 0x888888));
        container.add(this.add.rectangle(0, 0, 14, 3, 0x888888));
        container.add(this.add.rectangle(0, 5, 14, 3, 0x888888));
        // Head (skull)
        container.add(this.add.rectangle(0, -20, 16, 16, 0xE8E8E8));
        // Eye sockets
        container.add(this.add.rectangle(-4, -22, 5, 5, 0x222222));
        container.add(this.add.rectangle(4, -22, 5, 5, 0x222222));
        // Jaw
        container.add(this.add.rectangle(0, -14, 10, 4, 0xcccccc));
        // Arms
        container.add(this.add.rectangle(-12, 0, 6, 20, 0xC0C0C0));
        container.add(this.add.rectangle(12, 0, 6, 20, 0xC0C0C0));
        // Legs
        container.add(this.add.rectangle(-5, 20, 6, 14, 0xB0B0B0));
        container.add(this.add.rectangle(5, 20, 6, 14, 0xB0B0B0));

        this.tweens.add({
            targets: container,
            y: y - 3,
            duration: 900 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createTroll(x, y, scale, alpha) {
        const container = this.add.container(x, y);
        container.setScale(scale);
        container.setAlpha(alpha);

        // Body (large, dark teal)
        container.add(this.add.rectangle(0, 0, 45, 55, 0x2F4F4F));
        // Head
        container.add(this.add.rectangle(0, -38, 30, 26, 0x2F4F4F));
        // Eyes
        container.add(this.add.rectangle(-8, -40, 7, 7, 0xffff00));
        container.add(this.add.rectangle(8, -40, 7, 7, 0xffff00));
        // Nose
        container.add(this.add.rectangle(0, -34, 10, 8, 0x3a5a5a));
        // Mouth
        container.add(this.add.rectangle(0, -26, 16, 6, 0x1a3a3a));
        // Arms (huge)
        container.add(this.add.rectangle(-28, 5, 16, 40, 0x264040));
        container.add(this.add.rectangle(28, 5, 16, 40, 0x264040));
        // Fists
        container.add(this.add.rectangle(-28, 30, 18, 16, 0x2F4F4F));
        container.add(this.add.rectangle(28, 30, 18, 16, 0x2F4F4F));
        // Legs
        container.add(this.add.rectangle(-12, 38, 14, 22, 0x1F3F3F));
        container.add(this.add.rectangle(12, 38, 14, 22, 0x1F3F3F));

        this.tweens.add({
            targets: container,
            y: y - 5,
            duration: 1200 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    // Player unit sprites
    createPeasant(x, y, scale, alpha, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);
        container.setAlpha(alpha);

        // Body (brown tunic)
        container.add(this.add.rectangle(0, 0, 18, 24, 0x8B4513));
        // Head
        container.add(this.add.rectangle(0, -16, 14, 14, 0xDEB887));
        // Eyes
        container.add(this.add.rectangle(-3, -17, 3, 3, 0x000000));
        container.add(this.add.rectangle(3, -17, 3, 3, 0x000000));
        // Hair
        container.add(this.add.rectangle(0, -24, 14, 6, 0x654321));
        // Arms
        container.add(this.add.rectangle(-11, 0, 6, 18, 0xDEB887));
        container.add(this.add.rectangle(11, 0, 6, 18, 0xDEB887));
        // Legs
        container.add(this.add.rectangle(-4, 18, 6, 12, 0x654321));
        container.add(this.add.rectangle(4, 18, 6, 12, 0x654321));

        this.tweens.add({
            targets: container,
            y: y - 3,
            duration: 800 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createArcher(x, y, scale, alpha, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);
        container.setAlpha(alpha);

        // Body (green tunic)
        container.add(this.add.rectangle(0, 0, 18, 26, 0x228B22));
        // Hood
        container.add(this.add.rectangle(0, -16, 16, 16, 0x1a6b1a));
        // Face
        container.add(this.add.rectangle(0, -14, 12, 10, 0xDEB887));
        // Eyes
        container.add(this.add.rectangle(-3, -15, 3, 3, 0x000000));
        container.add(this.add.rectangle(3, -15, 3, 3, 0x000000));
        // Bow (on side)
        container.add(this.add.rectangle(14, -5, 4, 30, 0x8B4513));
        // Quiver
        container.add(this.add.rectangle(-10, 0, 6, 20, 0x654321));
        // Legs
        container.add(this.add.rectangle(-4, 18, 6, 12, 0x1a5a1a));
        container.add(this.add.rectangle(4, 18, 6, 12, 0x1a5a1a));

        this.tweens.add({
            targets: container,
            y: y - 3,
            duration: 850 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createKnight(x, y, scale, alpha, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);
        container.setAlpha(alpha);

        // Body (blue armor)
        container.add(this.add.rectangle(0, 0, 24, 30, 0x4169E1));
        // Armor highlight
        container.add(this.add.rectangle(-4, 0, 8, 26, 0x5179F1));
        // Helmet
        container.add(this.add.rectangle(0, -20, 20, 18, 0x4a4a5a));
        // Visor
        container.add(this.add.rectangle(0, -18, 14, 6, 0x222222));
        // Plume
        container.add(this.add.rectangle(0, -32, 6, 10, 0xff4444));
        // Shield (on arm)
        container.add(this.add.rectangle(-16, 0, 10, 22, 0x4169E1));
        container.add(this.add.rectangle(-16, 0, 6, 18, 0x6189F1));
        // Sword arm
        container.add(this.add.rectangle(14, 0, 8, 24, 0x4a4a5a));
        // Legs
        container.add(this.add.rectangle(-6, 22, 8, 14, 0x3a3a4a));
        container.add(this.add.rectangle(6, 22, 8, 14, 0x3a3a4a));

        this.tweens.add({
            targets: container,
            y: y - 4,
            duration: 950 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    createGiant(x, y, scale, alpha, flipX = false) {
        const container = this.add.container(x, y);
        container.setScale(flipX ? -scale : scale, scale);
        container.setAlpha(alpha);

        // Body (large, dark red/brown)
        container.add(this.add.rectangle(0, 0, 50, 60, 0x8B0000));
        // Chest
        container.add(this.add.rectangle(0, -5, 40, 30, 0x9B1010));
        // Head
        container.add(this.add.rectangle(0, -42, 28, 24, 0xCD853F));
        // Eyes
        container.add(this.add.rectangle(-7, -44, 6, 6, 0x000000));
        container.add(this.add.rectangle(7, -44, 6, 6, 0x000000));
        // Angry brow
        container.add(this.add.rectangle(-7, -50, 10, 4, 0x8B4513));
        container.add(this.add.rectangle(7, -50, 10, 4, 0x8B4513));
        // Mouth
        container.add(this.add.rectangle(0, -36, 14, 6, 0x5a3a2a));
        // Arms (huge)
        container.add(this.add.rectangle(-32, 0, 18, 45, 0xCD853F));
        container.add(this.add.rectangle(32, 0, 18, 45, 0xCD853F));
        // Fists
        container.add(this.add.rectangle(-32, 28, 20, 18, 0xDEB887));
        container.add(this.add.rectangle(32, 28, 20, 18, 0xDEB887));
        // Belt
        container.add(this.add.rectangle(0, 20, 46, 8, 0x654321));
        // Legs
        container.add(this.add.rectangle(-14, 42, 16, 26, 0x6B0000));
        container.add(this.add.rectangle(14, 42, 16, 26, 0x6B0000));
        // Feet
        container.add(this.add.rectangle(-14, 58, 20, 10, 0x4a2a1a));
        container.add(this.add.rectangle(14, 58, 20, 10, 0x4a2a1a));

        this.tweens.add({
            targets: container,
            y: y - 6,
            duration: 1100 + Math.random() * 400,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        return container;
    }

    showSettingsPanel() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
        overlay.setInteractive(); // Block clicks behind
        dialog.add(overlay);

        // Panel background
        const panel = this.add.rectangle(0, 0, 320, 280, 0x2a2a3e);
        panel.setStrokeStyle(3, 0x4169E1);
        dialog.add(panel);

        // Title
        const title = this.add.text(0, -100, 'ACCOUNT', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        // User status
        const statusText = this.add.text(0, -60, 'Guest Account', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        dialog.add(statusText);

        // Logout button (placeholder - greyed out)
        const logoutBtn = this.createSettingsButton(0, -15, 'Sign In / Sign Up', 0x333333, () => {
            // Placeholder - will be implemented with auth
        }, true); // disabled
        dialog.add(logoutBtn);

        // Coming soon label for sign in
        const comingSoon = this.add.text(0, -35, 'Coming Soon', {
            fontSize: '12px',
            fontFamily: 'Arial',
            fontStyle: 'italic',
            color: '#ffaa00'
        }).setOrigin(0.5);
        dialog.add(comingSoon);

        // Delete Account / Reset Progress button
        const deleteBtn = this.createSettingsButton(0, 45, 'Delete Account', 0x8B0000, () => {
            this.confirmDeleteAccount(dialog);
        }, false);
        dialog.add(deleteBtn);

        // Warning text
        const warning = this.add.text(0, 80, 'Resets all progress to Rank 0', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#ff6666'
        }).setOrigin(0.5);
        dialog.add(warning);

        // Close button
        const closeBtn = this.add.text(0, 115, 'Close', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        dialog.add(closeBtn);

        closeBtn.on('pointerover', () => closeBtn.setColor('#ffffff'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#888888'));
        closeBtn.on('pointerdown', () => dialog.destroy());

        dialog.setDepth(1000);
        this.settingsDialog = dialog;
    }

    createSettingsButton(x, y, text, bgColor, callback, disabled = false) {
        const container = this.add.container(x, y);

        const bg = this.add.rectangle(0, 0, 200, 40, bgColor);
        bg.setStrokeStyle(2, disabled ? 0x444444 : 0x666666);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: disabled ? '#555555' : '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        if (!disabled) {
            bg.setInteractive({ useHandCursor: true });

            bg.on('pointerover', () => {
                bg.setFillStyle(bgColor + 0x222222);
                this.tweens.add({
                    targets: container,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 100
                });
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(bgColor);
                this.tweens.add({
                    targets: container,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 100
                });
            });

            bg.on('pointerdown', callback);
        }

        return container;
    }

    confirmDeleteAccount(parentDialog) {
        parentDialog.destroy();

        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
        overlay.setInteractive();
        dialog.add(overlay);

        const panel = this.add.rectangle(0, 0, 350, 220, 0x2a2a3e);
        panel.setStrokeStyle(3, 0x8B0000);
        dialog.add(panel);

        const title = this.add.text(0, -70, 'DELETE ACCOUNT?', {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        dialog.add(title);

        const warning = this.add.text(0, -25, 'This will reset:\n• All upgrades and XP\n• Current stats and rank (back to Recruit I)', {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        dialog.add(warning);

        const preserved = this.add.text(0, 30, 'Legacy achievements will be preserved:\n• Highest wave ever  • Total games played', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#44ff44',
            align: 'center'
        }).setOrigin(0.5);
        dialog.add(preserved);

        // Delete button
        const deleteBtn = this.add.text(-70, 80, 'DELETE', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        deleteBtn.setInteractive({ useHandCursor: true });
        dialog.add(deleteBtn);

        deleteBtn.on('pointerover', () => deleteBtn.setColor('#ff6666'));
        deleteBtn.on('pointerout', () => deleteBtn.setColor('#ff4444'));
        deleteBtn.on('pointerdown', () => {
            saveSystem.resetAccount();
            dialog.destroy();
            this.scene.restart();
        });

        // Cancel button
        const cancelBtn = this.add.text(70, 80, 'CANCEL', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        cancelBtn.setInteractive({ useHandCursor: true });
        dialog.add(cancelBtn);

        cancelBtn.on('pointerover', () => cancelBtn.setColor('#66ff66'));
        cancelBtn.on('pointerout', () => cancelBtn.setColor('#44ff44'));
        cancelBtn.on('pointerdown', () => {
            dialog.destroy();
        });

        dialog.setDepth(1001);
    }

    showTipsPanel() {
        const dialog = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Overlay
        const overlay = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.9);
        overlay.setInteractive();
        dialog.add(overlay);

        // Panel background
        const panel = this.add.rectangle(0, 0, 700, 500, 0x1a1a2e);
        panel.setStrokeStyle(3, 0x4169E1);
        dialog.add(panel);

        // Title
        const title = this.add.text(0, -220, 'TIPS & INFO', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
        dialog.add(title);

        // Tips pages content
        const tipsPages = [
            {
                title: 'CONTROLS',
                tips: [
                    { icon: '🎮', text: 'Hover over unit buttons to spawn units' },
                    { icon: '⏸️', text: 'Press ESC or P to pause the game' },
                    { icon: '🔇', text: 'Press M to toggle music on/off' },
                    { icon: '🖱️', text: 'Right-click anywhere to pause' },
                    { icon: '⛏️', text: 'Hover over gold/wood mines to collect resources' }
                ]
            },
            {
                title: 'GAMEPLAY BASICS',
                tips: [
                    { icon: '🏰', text: 'Defend your castle from waves of enemies' },
                    { icon: '⚔️', text: 'Spawn units using gold and wood resources' },
                    { icon: '💰', text: 'Earn resources by killing enemies and completing waves' },
                    { icon: '🎯', text: 'Units automatically attack nearby enemies' },
                    { icon: '🛡️', text: 'Position tanks (Knights, Giants) in front to protect ranged units' }
                ]
            },
            {
                title: 'UNIT PROMOTION',
                tips: [
                    { icon: '⭐', text: 'Spawning the same unit type promotes it!' },
                    { icon: '🥈', text: 'Silver tier (1-3): +10% HP/DMG per level' },
                    { icon: '🥇', text: 'Gold tier (4-6): +10% HP/DMG per level' },
                    { icon: '👥', text: 'Gold tier (level 4+) spawns TWO units at once!' },
                    { icon: '💎', text: 'Higher promotion = higher cost (balanced)' }
                ]
            },
            {
                title: 'CASTLE & MINING',
                tips: [
                    { icon: '🏰', text: 'Upgrade castle in-game by hovering over it' },
                    { icon: '🔨', text: 'Castle level 3+ builds a defensive fence' },
                    { icon: '⛏️', text: 'Castle upgrades increase mining speed by 25%/level' },
                    { icon: '❤️', text: 'Castle Health XP upgrade gives +20 HP per wave (level 2+)' },
                    { icon: '🛡️', text: 'Castle Armor reduces incoming damage' }
                ]
            },
            {
                title: 'ENEMIES & BOSSES',
                tips: [
                    { icon: '👺', text: 'Goblins (Wave 1+): Fast but weak' },
                    { icon: '👹', text: 'Orcs (Wave 2+): Stronger melee fighters' },
                    { icon: '💀', text: 'Skeletons (Wave 4+): Medium threat' },
                    { icon: '🏹', text: 'Skeleton Archers (Wave 6+): Ranged enemies!' },
                    { icon: '🐉', text: 'DRAGON BOSS every 10 waves - very dangerous!' }
                ]
            },
            {
                title: 'MORE ENEMIES',
                tips: [
                    { icon: '🗡️', text: 'Spear Monsters (Wave 7+): Throw big spears' },
                    { icon: '🧌', text: 'Trolls (Wave 8+): High HP tanks' },
                    { icon: '⚫', text: 'Dark Knights (Wave 12+): Strong armored foes' },
                    { icon: '😈', text: 'Demons (Wave 18+): Very powerful enemies' },
                    { icon: '⚠️', text: 'Enemies get stronger each wave!' }
                ]
            },
            {
                title: 'XP & RANKINGS',
                tips: [
                    { icon: '✨', text: 'Earn XP by reaching wave milestones (max 3/game)' },
                    { icon: '📊', text: 'Recruit earns XP every 3 waves' },
                    { icon: '📈', text: 'Higher ranks need more waves per XP' },
                    { icon: '🎖️', text: 'Ranks: Recruit → Soldier → Warrior → Knight → ...' },
                    { icon: '👑', text: 'Each rank has 3 grades (I, II, III)' }
                ]
            },
            {
                title: 'UPGRADES & XP',
                tips: [
                    { icon: '⬆️', text: 'Spend XP in Upgrades menu for permanent boosts' },
                    { icon: '🔓', text: 'Unlock Knight (2 XP), Wizard (3 XP), Giant (5 XP)' },
                    { icon: '💪', text: 'Unit upgrades increase base HP and damage' },
                    { icon: '🔄', text: 'Reset upgrades costs 2 XP fee (refunds spent XP)' },
                    { icon: '⛏️', text: 'Mining Speed upgrade increases rate by 10%/level' }
                ]
            }
        ];

        // Current page tracking
        let currentPage = 0;

        // Page content container
        const pageContainer = this.add.container(0, 20);
        dialog.add(pageContainer);

        // Page indicator
        const pageIndicator = this.add.text(0, 210, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        dialog.add(pageIndicator);

        // Function to render current page
        const renderPage = () => {
            pageContainer.removeAll(true);

            const page = tipsPages[currentPage];

            // Page title
            const pageTitle = this.add.text(0, -160, page.title, {
                fontSize: '24px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: '#ffd700',
                stroke: '#000000',
                strokeThickness: 3
            }).setOrigin(0.5);
            pageContainer.add(pageTitle);

            // Tips list
            page.tips.forEach((tip, index) => {
                const y = -100 + index * 50;

                const tipText = this.add.text(-300, y, `${tip.icon}  ${tip.text}`, {
                    fontSize: '18px',
                    fontFamily: 'Arial',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 1
                }).setOrigin(0, 0.5);
                pageContainer.add(tipText);
            });

            // Update page indicator
            pageIndicator.setText(`Page ${currentPage + 1} of ${tipsPages.length}`);
        };

        // Navigation buttons
        const prevBtn = this.add.text(-280, 210, '< PREV', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        prevBtn.setInteractive({ useHandCursor: true });
        dialog.add(prevBtn);

        prevBtn.on('pointerover', () => prevBtn.setColor('#6495ED'));
        prevBtn.on('pointerout', () => prevBtn.setColor('#4169E1'));
        prevBtn.on('pointerdown', () => {
            currentPage = (currentPage - 1 + tipsPages.length) % tipsPages.length;
            renderPage();
        });

        const nextBtn = this.add.text(280, 210, 'NEXT >', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4169E1',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        nextBtn.setInteractive({ useHandCursor: true });
        dialog.add(nextBtn);

        nextBtn.on('pointerover', () => nextBtn.setColor('#6495ED'));
        nextBtn.on('pointerout', () => nextBtn.setColor('#4169E1'));
        nextBtn.on('pointerdown', () => {
            currentPage = (currentPage + 1) % tipsPages.length;
            renderPage();
        });

        // Close button
        const closeBtn = this.add.text(320, -220, 'X', {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        closeBtn.setInteractive({ useHandCursor: true });
        dialog.add(closeBtn);

        closeBtn.on('pointerover', () => closeBtn.setColor('#ff6666'));
        closeBtn.on('pointerout', () => closeBtn.setColor('#ff4444'));
        closeBtn.on('pointerdown', () => dialog.destroy());

        // Render first page
        renderPage();

        dialog.setDepth(1000);
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
