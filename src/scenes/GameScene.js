// Game Scene - Main gameplay (Survival Mode) with resource mining and multi-directional enemies
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    create() {
        // Resume audio context on first interaction
        if (typeof audioManager !== 'undefined') {
            audioManager.resume();
        }

        // Load save data
        this.saveData = saveSystem.load();

        // Initialize systems
        this.combatSystem = new CombatSystem(this);
        this.waveSystem = new WaveSystem(this);

        // Game state - resources
        this.gold = RESOURCE_CONFIG.startingGold;
        this.wood = RESOURCE_CONFIG.startingWood;
        this.isPaused = false;
        this.goldEarnedThisRun = 0;
        this.woodEarnedThisRun = 0;
        this.enemiesKilledThisRun = 0;

        // Create groups
        this.units = this.add.group();
        this.enemies = this.add.group();
        this.projectiles = this.add.group();

        // Create background
        this.createBackground();

        // Create resource mines
        this.createMines();

        // Create player castle only (survival mode)
        this.createCastle();

        // Create UI
        this.createUI();

        // Setup input
        this.setupInput();

        // Start resource mining
        this.startResourceMining();

        // Show game mode
        this.showSurvivalIntro();

        // Start background music
        if (typeof audioManager !== 'undefined') {
            audioManager.startMusic();
        }

        // Start first wave after delay
        this.time.delayedCall(3000, () => {
            this.waveSystem.startWave();
        });
    }

    createBackground() {
        // CARTOONY BATTLEFIELD - bright, colorful, and fun!

        // Sky gradient (top area) - bright blue
        this.add.rectangle(GAME_WIDTH / 2, 0, GAME_WIDTH, 120, 0x87CEEB).setOrigin(0.5, 0);
        this.add.rectangle(GAME_WIDTH / 2, 60, GAME_WIDTH, 60, 0x98D8EF, 0.5);

        // Base grass floor - BRIGHT green
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, GAME_WIDTH, GAME_HEIGHT - 60, 0x7EC850);

        // Grass texture - lighter patches for depth
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(100, GAME_HEIGHT);
            const w = Phaser.Math.Between(60, 140);
            const h = Phaser.Math.Between(40, 80);
            this.add.rectangle(x, y, w, h, 0x8BD860, 0.5);
        }

        // Darker grass patches for variety
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(100, GAME_HEIGHT);
            const w = Phaser.Math.Between(40, 90);
            const h = Phaser.Math.Between(25, 50);
            this.add.rectangle(x, y, w, h, 0x6AB840, 0.4);
        }

        // Cute path/dirt trail to castle
        for (let i = 0; i < 8; i++) {
            const x = 100 + i * 90;
            const y = 380 + Math.sin(i * 0.5) * 15;
            this.add.rectangle(x, y, 100, 40, 0xC4A574, 0.6);
            this.add.rectangle(x, y, 90, 30, 0xD4B584, 0.4);
        }

        // Scattered cartoon flowers
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(130, GAME_WIDTH - 50);
            const y = Phaser.Math.Between(100, GAME_HEIGHT - 30);
            this.createCartoonFlower(x, y);
        }

        // Cute cartoon rocks
        for (let i = 0; i < 15; i++) {
            const x = Phaser.Math.Between(150, GAME_WIDTH - 50);
            const y = Phaser.Math.Between(80, GAME_HEIGHT - 50);
            this.createCartoonRock(x, y, Phaser.Math.Between(0, 2));
        }

        // Small bushes for decoration
        for (let i = 0; i < 10; i++) {
            const x = Phaser.Math.Between(150, GAME_WIDTH - 80);
            const y = Phaser.Math.Between(100, GAME_HEIGHT - 50);
            this.createCartoonBush(x, y);
        }

        // Fluffy clouds (rectangles stacked)
        this.createCartoonCloud(200, 40);
        this.createCartoonCloud(500, 55);
        this.createCartoonCloud(750, 35);

        // Enemy spawn indicators
        this.createSpawnIndicators();
    }

    createCartoonFlower(x, y) {
        // Cute cartoon flower - bright colors!
        const flowerColors = [0xFF6B9D, 0xFFD93D, 0xFF8C42, 0xC490E4, 0x6BCB77];
        const color = Phaser.Math.RND.pick(flowerColors);

        // Stem
        this.add.rectangle(x, y + 6, 3, 12, 0x5DBB63);

        // Petals (small rectangles arranged)
        this.add.rectangle(x - 4, y - 2, 6, 6, color);
        this.add.rectangle(x + 4, y - 2, 6, 6, color);
        this.add.rectangle(x, y - 6, 6, 6, color);
        this.add.rectangle(x, y + 2, 6, 6, color);

        // Center (bright yellow)
        this.add.rectangle(x, y - 2, 5, 5, 0xFFE66D);
    }

    createCartoonRock(x, y, size) {
        // Cute cartoon rock - rounder look with highlights
        const s = 10 + size * 6;

        // Rock body (warm gray)
        this.add.rectangle(x, y, s, s * 0.75, 0x8899AA);
        // Inner lighter area
        this.add.rectangle(x, y - 1, s * 0.85, s * 0.6, 0x99AABB);
        // Highlight (cute shine)
        this.add.rectangle(x - s/4, y - s/5, s/3, s/4, 0xBBCCDD, 0.7);
        // Shadow underneath
        this.add.rectangle(x + 2, y + s/4, s * 0.8, s/5, 0x667788, 0.4);
    }

    createCartoonBush(x, y) {
        // Cute rounded bush - stacked rectangles
        const bushColor = 0x5DBB63;
        const lightColor = 0x7DD87D;

        // Main bush body
        this.add.rectangle(x, y, 28, 20, bushColor);
        this.add.rectangle(x - 10, y + 2, 18, 16, bushColor);
        this.add.rectangle(x + 10, y + 2, 18, 16, bushColor);

        // Highlights
        this.add.rectangle(x, y - 4, 20, 10, lightColor, 0.6);
        this.add.rectangle(x - 8, y - 2, 10, 8, lightColor, 0.5);

        // Cute berries sometimes
        if (Math.random() > 0.5) {
            this.add.rectangle(x + 6, y, 4, 4, 0xFF6B6B);
            this.add.rectangle(x - 4, y + 3, 4, 4, 0xFF6B6B);
        }
    }

    createCartoonCloud(x, y) {
        const cloud = this.add.container(x, y);

        // Fluffy cloud made of overlapping rectangles
        cloud.add(this.add.rectangle(-20, 0, 30, 20, 0xFFFFFF, 0.9));
        cloud.add(this.add.rectangle(0, -5, 40, 25, 0xFFFFFF, 0.9));
        cloud.add(this.add.rectangle(20, 0, 30, 20, 0xFFFFFF, 0.9));
        cloud.add(this.add.rectangle(35, 5, 20, 15, 0xFFFFFF, 0.8));

        // Highlights
        cloud.add(this.add.rectangle(-15, -8, 20, 8, 0xFFFFFF, 0.5));
        cloud.add(this.add.rectangle(10, -10, 25, 8, 0xFFFFFF, 0.5));

        // Gentle float animation
        this.tweens.add({
            targets: cloud,
            x: x + 25,
            y: y - 5,
            duration: 8000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    createPixelTree(x, y) {
        // Cartoony tree - bright and friendly
        // Trunk (warm brown)
        this.add.rectangle(x, y + 25, 16, 35, 0x8B6B4A);
        this.add.rectangle(x - 3, y + 25, 8, 32, 0x9B7B5A); // highlight

        // Foliage layers (bright greens, stacked rectangles)
        // Bottom layer
        this.add.rectangle(x, y + 5, 55, 18, 0x5DBB63);
        this.add.rectangle(x, y - 8, 48, 16, 0x5DBB63);
        // Middle layer
        this.add.rectangle(x, y - 20, 42, 14, 0x6DCC73);
        this.add.rectangle(x, y - 32, 34, 12, 0x6DCC73);
        // Top layer
        this.add.rectangle(x, y - 42, 26, 10, 0x7DD87D);
        this.add.rectangle(x, y - 50, 18, 8, 0x7DD87D);
        this.add.rectangle(x, y - 56, 10, 6, 0x8DE88D);

        // Highlight spots
        this.add.rectangle(x - 12, y - 5, 12, 8, 0x8DE88D, 0.6);
        this.add.rectangle(x + 8, y - 25, 10, 6, 0x8DE88D, 0.6);
    }

    createSpawnIndicators() {
        // No visible spawn indicators - enemies just appear from edges
    }

    createMines() {
        // Gold mine (top left area)
        this.goldMine = this.createInteractiveMine(
            RESOURCE_CONFIG.goldMineX,
            RESOURCE_CONFIG.goldMineY,
            'gold'
        );

        // Wood pile/lumber (bottom left area)
        this.woodMine = this.createInteractiveMine(
            RESOURCE_CONFIG.woodMineX,
            RESOURCE_CONFIG.woodMineY,
            'wood'
        );

        // Mining state
        this.goldMineProgress = 0;
        this.woodMineProgress = 0;
        this.miningTarget = 100; // Progress needed to collect

        // Create custom axe cursor
        this.createAxeCursor();
    }

    createAxeCursor() {
        // Custom axe cursor container - BIGGER axe
        this.axeCursor = this.add.container(0, 0);
        this.axeCursor.setDepth(2000); // Always on top
        this.axeCursor.setVisible(false);

        // Axe handle (bigger)
        this.axeCursor.add(this.add.rectangle(0, 20, 10, 50, 0xC4956A));
        this.axeCursor.add(this.add.rectangle(2, 20, 6, 46, 0xD4A57A));

        // Axe head (bigger)
        this.axeCursor.add(this.add.rectangle(-18, -4, 32, 22, 0x8899AA));
        this.axeCursor.add(this.add.rectangle(-26, -4, 14, 18, 0x7789AA));
        this.axeCursor.add(this.add.rectangle(-10, -10, 18, 8, 0xBBCCDD)); // shine

        // Track if we're over a mine
        this.isOverMine = false;
        this.axeChopPhase = 0;

        // Follow mouse
        this.input.on('pointermove', (pointer) => {
            if (this.isOverMine) {
                this.axeCursor.setPosition(pointer.x, pointer.y);
            }
        });
    }

    createInteractiveMine(x, y, type) {
        const container = this.add.container(x, y);
        const isGold = type === 'gold';
        const mainColor = isGold ? 0xFFD700 : 0x8B6B4A;

        // Larger interactive area (invisible rectangle)
        const hitArea = this.add.rectangle(0, 0, 100, 100, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        container.add(hitArea);

        // Glowing frame (shows when hovering)
        const glowRing = this.add.rectangle(0, 0, 105, 105, mainColor, 0);
        container.add(glowRing);
        container.glowRing = glowRing;

        if (isGold) {
            // CARTOONY GOLD MINE - Bright and inviting!
            // Cave entrance - warm brown rock
            container.add(this.add.rectangle(0, 10, 60, 50, 0x6B5A4A));
            container.add(this.add.rectangle(0, 12, 55, 45, 0x7B6A5A));

            // Cave hole (dark but not black)
            container.add(this.add.rectangle(0, 18, 40, 35, 0x2A2520));
            container.add(this.add.rectangle(0, 20, 35, 28, 0x3A3530));

            // Cute wooden frame
            container.add(this.add.rectangle(-22, 8, 8, 42, 0xB8956A));
            container.add(this.add.rectangle(-20, 8, 5, 40, 0xC8A57A)); // highlight
            container.add(this.add.rectangle(22, 8, 8, 42, 0xB8956A));
            container.add(this.add.rectangle(24, 8, 5, 40, 0xC8A57A));
            container.add(this.add.rectangle(0, -14, 52, 8, 0xB8956A));
            container.add(this.add.rectangle(0, -12, 48, 5, 0xC8A57A));

            // "GOLD" sign on top
            container.add(this.add.rectangle(0, -22, 36, 12, 0xD4A84B));
            container.add(this.add.rectangle(0, -22, 32, 8, 0xE4B85B));

            // Sparkly gold nuggets inside cave
            for (let i = 0; i < 6; i++) {
                const sparkle = this.add.rectangle(
                    Phaser.Math.Between(-14, 14),
                    Phaser.Math.Between(8, 28),
                    6, 6, 0xFFD700
                );
                container.add(sparkle);
                this.tweens.add({
                    targets: sparkle,
                    alpha: 0.4,
                    scaleX: 0.6,
                    scaleY: 0.6,
                    duration: 400 + Math.random() * 400,
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 400
                });
            }

            // Cute mining cart
            container.add(this.add.rectangle(36, 24, 26, 18, 0x6B7B8B));
            container.add(this.add.rectangle(36, 22, 22, 12, 0x7B8B9B)); // rim
            // Gold pile in cart
            container.add(this.add.rectangle(36, 16, 20, 10, 0xFFD700));
            container.add(this.add.rectangle(36, 13, 16, 5, 0xFFE855));
            container.add(this.add.rectangle(34, 11, 8, 4, 0xFFEE88)); // shine
            // Wheels
            container.add(this.add.rectangle(27, 35, 10, 10, 0x5A6A7A));
            container.add(this.add.rectangle(27, 35, 6, 6, 0x4A5A6A));
            container.add(this.add.rectangle(45, 35, 10, 10, 0x5A6A7A));
            container.add(this.add.rectangle(45, 35, 6, 6, 0x4A5A6A));
        } else {
            // CARTOONY WOOD PILE - Warm and cozy!
            // Big friendly tree stump
            container.add(this.add.rectangle(0, 22, 50, 24, 0x8B6B4A));
            container.add(this.add.rectangle(0, 18, 46, 18, 0x9B7B5A));
            container.add(this.add.rectangle(0, 14, 42, 10, 0xAB8B6A)); // top
            // Tree rings
            container.add(this.add.rectangle(0, 14, 28, 3, 0x7B5B3A));
            container.add(this.add.rectangle(0, 14, 3, 10, 0x7B5B3A));
            container.add(this.add.rectangle(0, 14, 16, 2, 0x6B4B2A));

            // Cute log pile (brighter browns)
            container.add(this.add.rectangle(-24, -10, 28, 14, 0xA87B5A));
            container.add(this.add.rectangle(-24, -10, 24, 10, 0xB88B6A)); // highlight
            container.add(this.add.rectangle(-36, -10, 8, 14, 0xD4A574)); // end grain

            container.add(this.add.rectangle(-20, 2, 26, 12, 0x9B6B4A));
            container.add(this.add.rectangle(-20, 2, 22, 8, 0xAB7B5A));
            container.add(this.add.rectangle(-32, 2, 8, 12, 0xC49564));

            container.add(this.add.rectangle(-28, 12, 22, 10, 0x8B5B3A));
            container.add(this.add.rectangle(-28, 12, 18, 7, 0x9B6B4A));
            container.add(this.add.rectangle(-38, 12, 6, 10, 0xB48554));

            // Cute axe stuck in stump
            container.add(this.add.rectangle(20, 4, 6, 36, 0xC4956A));
            container.add(this.add.rectangle(22, 4, 3, 34, 0xD4A57A)); // highlight
            // Axe head (shiny!)
            container.add(this.add.rectangle(30, -12, 18, 14, 0x8899AA));
            container.add(this.add.rectangle(35, -12, 8, 12, 0x7789AA)); // edge
            container.add(this.add.rectangle(27, -15, 10, 5, 0xAABBCC)); // shine
        }

        // No spinner - just axe cursor and glow

        // Label with instruction
        const label = this.add.text(0, 52, `HOVER TO MINE`, {
            fontSize: '11px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: isGold ? '#ffd700' : '#D4A574',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        container.add(label);

        // Hover events
        hitArea.on('pointerover', (pointer) => {
            container.isHovering = true;
            glowRing.setAlpha(0.3);
            this.tweens.add({
                targets: glowRing,
                alpha: 0.5,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 200
            });
            // Show axe cursor, hide default
            this.isOverMine = true;
            this.axeCursor.setVisible(true);
            this.axeCursor.setPosition(pointer.x, pointer.y);
            this.input.setDefaultCursor('none');
        });

        hitArea.on('pointerout', () => {
            container.isHovering = false;
            this.tweens.add({
                targets: glowRing,
                alpha: 0,
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
            // Hide axe cursor, restore default
            this.isOverMine = false;
            this.axeCursor.setVisible(false);
            this.axeChopPhase = 0;
            this.axeCursor.setAngle(0);
            this.input.setDefaultCursor('default');
        });

        container.isHovering = false;
        container.mineType = type;
        container.setDepth(100);
        return container;
    }


    createCastle() {
        // Castle always starts at level 1 each battle (upgrades are in-game only)
        this.castleLevel = 1;
        const playerHealth = CASTLE_CONFIG.playerHealth;

        this.playerCastle = new Castle(
            this,
            CASTLE_CONFIG.playerX,
            380,
            true,
            playerHealth
        );

        // Set castle level for display
        this.playerCastle.setLevel(this.castleLevel);

        // Create castle upgrade hover zone with spinner
        this.createCastleUpgradeZone();
    }

    createCastleUpgradeZone() {
        // Upgrade progress state
        this.castleUpgradeProgress = 0;
        this.castleUpgradeTarget = 100;
        this.castleUpgradeHovering = false;
        this.castleHoverStartTime = 0;
        this.castleHoverDelay = 250; // 250ms delay before progress starts

        // Create hover zone over castle
        this.castleUpgradeZone = this.add.container(CASTLE_CONFIG.playerX, 280);
        this.castleUpgradeZone.setDepth(150);

        // Hit area (invisible, covers castle)
        const hitArea = this.add.rectangle(0, 50, 140, 200, 0x000000, 0);
        hitArea.setInteractive({ useHandCursor: true });
        this.castleUpgradeZone.add(hitArea);

        // Spinner container (hidden by default, shown on hover)
        this.castleSpinnerContainer = this.add.container(0, -20);
        this.castleUpgradeZone.add(this.castleSpinnerContainer);
        this.castleSpinnerContainer.setVisible(false);

        // Spinner background
        const spinnerRadius = 28;
        this.castleSpinnerContainer.add(this.add.rectangle(0, 0, 64, 64, 0x2A3A4A, 0.85));
        this.castleSpinnerContainer.add(this.add.rectangle(0, 0, 58, 58, 0x3A4A5A, 0.9));

        // Graphics for spinner arc
        this.castleSpinnerGraphics = this.add.graphics();
        this.castleSpinnerContainer.add(this.castleSpinnerGraphics);
        this.castleSpinnerRadius = spinnerRadius;
        this.castleSpinnerY = 0; // Relative to spinner container

        // Center icon (up arrow)
        const arrowIcon = this.add.text(0, 0, '⬆', {
            fontSize: '20px'
        }).setOrigin(0.5);
        this.castleSpinnerContainer.add(arrowIcon);

        // Percentage text
        this.castleUpgradePercentText = this.add.text(0, 32, '0%', {
            fontSize: '13px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.castleSpinnerContainer.add(this.castleUpgradePercentText);

        // Cost/info text
        this.castleUpgradeCostText = this.add.text(0, 52, '', {
            fontSize: '11px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.castleSpinnerContainer.add(this.castleUpgradeCostText);

        // Hover events
        hitArea.on('pointerover', () => {
            this.castleUpgradeHovering = true;
            this.castleHoverStartTime = Date.now(); // Record when hover started
            this.castleSpinnerContainer.setVisible(true);
        });

        hitArea.on('pointerout', () => {
            this.castleUpgradeHovering = false;
            this.castleHoverStartTime = 0;
            // Keep visible if there's progress, otherwise hide
            if (this.castleUpgradeProgress <= 0) {
                this.castleSpinnerContainer.setVisible(false);
            }
        });

        // Initial update
        this.updateCastleUpgradeDisplay();
    }

    getCastleUpgradeCost(level) {
        return Math.floor(CASTLE_CONFIG.upgradeCostBase * Math.pow(CASTLE_CONFIG.upgradeCostMultiplier, level - 1));
    }

    updateCastleUpgrade(delta) {
        if (this.isPaused) return;

        const currentLevel = this.castleLevel || 1;

        // Check if at max level
        if (currentLevel >= CASTLE_CONFIG.maxLevel) {
            this.castleUpgradePercentText.setText('MAX');
            this.castleUpgradeCostText.setText('');
            return;
        }

        const cost = this.getCastleUpgradeCost(currentLevel);
        const canAfford = this.gold >= cost;

        // Update cost display
        this.castleUpgradeCostText.setText(`${cost}g Lv.${currentLevel + 1}`);
        this.castleUpgradeCostText.setStyle({ color: canAfford ? '#4ade80' : '#888888' });

        // Only progress if hovering AND can afford AND hover delay has passed
        if (this.castleUpgradeHovering && canAfford) {
            const hoverDuration = Date.now() - this.castleHoverStartTime;
            if (hoverDuration >= this.castleHoverDelay) {
                const progressPerFrame = (this.miningSpeed * delta) / 1000;
                this.castleUpgradeProgress += progressPerFrame;

                if (this.castleUpgradeProgress >= this.castleUpgradeTarget) {
                    this.castleUpgradeProgress = 0;
                    this.performCastleUpgrade();
                }
            }
        }
        // Progress persists when not hovering (no decay)

        // Draw spinner
        this.drawCastleSpinner();
    }

    drawCastleSpinner() {
        const graphics = this.castleSpinnerGraphics;
        const percent = Math.floor((this.castleUpgradeProgress / this.castleUpgradeTarget) * 100);

        graphics.clear();

        if (this.castleUpgradeProgress > 0) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (this.castleUpgradeProgress / this.castleUpgradeTarget) * Math.PI * 2;

            graphics.lineStyle(6, 0x4ade80, 1);
            graphics.beginPath();
            graphics.arc(0, this.castleSpinnerY, this.castleSpinnerRadius - 2, startAngle, endAngle, false);
            graphics.strokePath();

            // Glow when near completion
            if (percent >= 80) {
                graphics.lineStyle(10, 0x4ade80, 0.3);
                graphics.beginPath();
                graphics.arc(0, this.castleSpinnerY, this.castleSpinnerRadius + 3, startAngle, endAngle, false);
                graphics.strokePath();
            }

            // Keep spinner visible while there's progress
            this.castleSpinnerContainer.setVisible(true);
        } else if (!this.castleUpgradeHovering) {
            // Hide spinner when no progress and not hovering
            this.castleSpinnerContainer.setVisible(false);
        }

        this.castleUpgradePercentText.setText(`${percent}%`);

        // Pulse when hovering
        if (this.castleUpgradeHovering && percent > 0) {
            this.castleUpgradePercentText.setScale(1 + Math.sin(Date.now() / 100) * 0.1);
        } else {
            this.castleUpgradePercentText.setScale(1);
        }
    }

    performCastleUpgrade() {
        const currentLevel = this.castleLevel || 1;
        const cost = this.getCastleUpgradeCost(currentLevel);

        // Spend gold
        this.gold -= cost;
        this.resourceDisplay.subtractGold(cost);

        // Increase level (in-game only, resets each battle)
        this.castleLevel = currentLevel + 1;

        // Update castle display and health
        this.playerCastle.setLevel(this.castleLevel);
        // Add health bonus for upgrade
        const healthBonus = 25;
        this.playerCastle.maxHealth += healthBonus;
        this.playerCastle.currentHealth += healthBonus;
        this.playerCastle.updateHealthBar();

        // Update mining speed
        this.updateMiningSpeed();

        // Play sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playGold();
        }

        // Visual feedback
        if (this.castleLevel >= CASTLE_CONFIG.maxLevel) {
            this.showMessage(`Castle MAX LEVEL!`, '#ffd700');
        } else {
            this.showMessage(`Castle Lv.${this.castleLevel}!`, '#4ade80');
        }

        // Glow effect
        const glowColor = this.castleLevel >= CASTLE_CONFIG.maxLevel ? 0xffd700 : 0x4ade80;
        const glow = this.add.rectangle(this.playerCastle.x, this.playerCastle.y, 180, 220, glowColor, 0.3);
        this.tweens.add({
            targets: glow,
            scaleX: 1.5,
            scaleY: 1.5,
            alpha: 0,
            duration: 600,
            onComplete: () => glow.destroy()
        });
    }

    updateCastleUpgradeDisplay() {
        const level = this.castleLevel || 1;
        if (level >= CASTLE_CONFIG.maxLevel) {
            this.castleUpgradePercentText.setText('MAX');
            this.castleUpgradeCostText.setText('');
        }
    }

    updateMiningSpeed() {
        // Mining speed increases 15% per castle level
        // Base speed is slower (50 instead of 80)
        const level = this.castleLevel || 1;
        this.miningSpeed = 50 * (1 + (level - 1) * 0.15);
    }

    createUI() {
        // Wave display (bottom right, big and semi-transparent)
        this.waveDisplay = new WaveDisplay(this, GAME_WIDTH - 20, GAME_HEIGHT - 20);

        // Resource display (gold and wood) - center top
        this.resourceDisplay = new ResourceDisplay(this, GAME_WIDTH / 2, 30);
        this.resourceDisplay.setGold(this.gold);
        this.resourceDisplay.setWood(this.wood);

        // Keep goldDisplay for backwards compatibility
        this.goldDisplay = this.resourceDisplay;

        // Unit buttons panel
        this.createUnitButtons();

        // Pause button
        this.createPauseButton();

        // Music toggle button
        this.createMusicToggle();

        // Unit count display (top right area)
        this.createUnitCountDisplay();
    }

    createUnitCountDisplay() {
        // Container for unit counts - horizontal layout in top bar (shifted left for space)
        this.unitCountContainer = this.add.container(GAME_WIDTH - 380, 30);
        this.unitCountContainer.setDepth(900);

        // Unit count texts for each type - horizontal with mini icons
        this.unitCountTexts = {};
        const unitTypes = ['PEASANT', 'ARCHER', 'KNIGHT', 'WIZARD', 'GIANT'];
        const colorHex = {
            PEASANT: '#E8C87A',
            ARCHER: '#4CC053',
            KNIGHT: '#55AAEE',
            WIZARD: '#BB66FF',
            GIANT: '#EE9955'
        };

        unitTypes.forEach((type, index) => {
            const x = index * 48; // More spacing for bigger icons

            // Mini unit icon (offset down a bit since icons extend upward)
            const iconContainer = this.add.container(x, 5);
            this.createMiniUnitIcon(iconContainer, type);
            this.unitCountContainer.add(iconContainer);

            // Count text next to icon
            const countText = this.add.text(x + 16, 0, '0', {
                fontSize: '16px',
                fontFamily: 'Arial',
                fontStyle: 'bold',
                color: colorHex[type],
                stroke: '#000000',
                strokeThickness: 2
            }).setOrigin(0, 0.5);
            this.unitCountContainer.add(countText);
            this.unitCountTexts[type] = countText;
        });
    }

    createMiniUnitIcon(container, unitType) {
        // Bigger, more expressive mini icons
        switch (unitType) {
            case 'PEASANT':
                // Tan tunic body
                container.add(this.add.rectangle(0, 3, 8, 10, 0xE8C87A));
                // Head with skin tone
                container.add(this.add.rectangle(0, -6, 7, 7, 0xFFDBB4));
                // Brown hair
                container.add(this.add.rectangle(0, -10, 7, 3, 0x5D4037));
                // Eyes
                container.add(this.add.rectangle(-2, -6, 2, 2, 0x000000));
                container.add(this.add.rectangle(2, -6, 2, 2, 0x000000));
                // Pitchfork
                container.add(this.add.rectangle(6, -2, 2, 12, 0x8B7355));
                break;
            case 'ARCHER':
                // Green tunic
                container.add(this.add.rectangle(0, 3, 8, 10, 0x4CC053));
                // Hood
                container.add(this.add.rectangle(0, -5, 9, 8, 0x2E7D32));
                container.add(this.add.rectangle(0, -10, 5, 4, 0x1B5E20));
                // Face peek
                container.add(this.add.rectangle(0, -4, 5, 4, 0xFFDBB4));
                // Bow
                container.add(this.add.rectangle(7, 0, 2, 14, 0x8B4513));
                break;
            case 'KNIGHT':
                // Blue armor
                container.add(this.add.rectangle(0, 3, 10, 12, 0x55AAEE));
                // Steel helmet
                container.add(this.add.rectangle(0, -6, 9, 9, 0x708090));
                // Visor slit
                container.add(this.add.rectangle(0, -5, 6, 2, 0x333333));
                // Red plume
                container.add(this.add.rectangle(0, -12, 3, 5, 0xFF4444));
                // Shield
                container.add(this.add.rectangle(-6, 2, 4, 6, 0x4169E1));
                break;
            case 'WIZARD':
                // Purple robe
                container.add(this.add.rectangle(0, 4, 10, 12, 0xBB66FF));
                // Face
                container.add(this.add.rectangle(0, -4, 6, 6, 0xFFDBB4));
                // Pointy hat
                container.add(this.add.rectangle(0, -10, 10, 4, 0x9932CC));
                container.add(this.add.rectangle(0, -14, 6, 5, 0x9932CC));
                container.add(this.add.rectangle(0, -18, 3, 4, 0x9932CC));
                // Star on hat
                container.add(this.add.rectangle(0, -12, 4, 2, 0xFFD700));
                // Staff
                container.add(this.add.rectangle(7, 0, 2, 16, 0x8B4513));
                container.add(this.add.rectangle(7, -9, 5, 5, 0x00FFFF)); // Orb
                break;
            case 'GIANT':
                // Big orange body
                container.add(this.add.rectangle(0, 4, 12, 14, 0xEE9955));
                // Big head
                container.add(this.add.rectangle(0, -8, 11, 10, 0xCD853F));
                // Angry brow
                container.add(this.add.rectangle(0, -12, 10, 3, 0x664422));
                // Red eyes
                container.add(this.add.rectangle(-3, -7, 3, 2, 0xFF0000));
                container.add(this.add.rectangle(3, -7, 3, 2, 0xFF0000));
                // Club
                container.add(this.add.rectangle(8, -2, 4, 14, 0x654321));
                break;
        }
    }

    getAliveUnitCount() {
        let count = 0;
        this.units.getChildren().forEach(unit => {
            if (!unit.isDead) count++;
        });
        return count;
    }

    updateUnitCounts() {
        const counts = {
            PEASANT: 0,
            ARCHER: 0,
            KNIGHT: 0,
            WIZARD: 0,
            GIANT: 0
        };

        // Count each unit type
        this.units.getChildren().forEach(unit => {
            if (!unit.isDead) {
                const type = unit.unitType.toUpperCase();
                if (counts.hasOwnProperty(type)) {
                    counts[type]++;
                }
            }
        });

        // Update display
        for (const type in counts) {
            if (this.unitCountTexts[type]) {
                this.unitCountTexts[type].setText(counts[type].toString());
            }
        }
    }

    createUnitButtons() {
        this.unitButtons = [];

        // Vertical layout on FAR LEFT - NO panel background
        const panelX = 50;

        // Unit buttons - vertical layout, no panel boxes
        const startY = 70;
        const spacing = 95;
        const unitTypes = ['PEASANT', 'ARCHER', 'KNIGHT', 'WIZARD', 'GIANT'];
        const hotkeys = ['1', '2', '3', '4', '5'];

        unitTypes.forEach((type, index) => {
            const typeKey = type.toLowerCase();
            const upgradeData = this.saveData.upgrades[typeKey];
            const isUnlocked = upgradeData ? upgradeData.unlocked : false;

            const button = new UnitButton(
                this,
                panelX,
                startY + (index * spacing),
                type,
                hotkeys[index],
                isUnlocked
            );

            this.unitButtons.push(button);
        });
    }

    createPauseButton() {
        // Pause button - text only, no boxes
        this.pauseText = this.add.text(GAME_WIDTH - 30, 25, 'II', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(950);

        this.pauseText.setInteractive({ useHandCursor: true });
        this.pauseText.on('pointerdown', () => this.togglePause());
    }

    createMusicToggle() {
        // Music toggle - text only, no boxes
        this.musicIcon = this.add.text(GAME_WIDTH - 70, 25, '🎵', {
            fontSize: '20px'
        }).setOrigin(0.5).setDepth(950);

        this.musicIcon.setInteractive({ useHandCursor: true });
        this.musicIcon.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                const enabled = audioManager.toggleMusic();
                this.musicIcon.setAlpha(enabled ? 1 : 0.4);
            }
        });

        // Mute ALL toggle
        this.muteIcon = this.add.text(GAME_WIDTH - 110, 25, '🔊', {
            fontSize: '18px'
        }).setOrigin(0.5).setDepth(950);

        this.muteIcon.setInteractive({ useHandCursor: true });
        this.muteIcon.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                const muted = audioManager.toggleMuteAll();
                this.muteIcon.setText(muted ? '🔇' : '🔊');
                this.musicIcon.setAlpha(muted ? 0.3 : 1);
            }
        });
    }

    setupInput() {
        // Number keys for spawning units
        this.input.keyboard.on('keydown-ONE', () => this.spawnUnit('PEASANT'));
        this.input.keyboard.on('keydown-TWO', () => this.spawnUnit('ARCHER'));
        this.input.keyboard.on('keydown-THREE', () => this.spawnUnit('KNIGHT'));
        this.input.keyboard.on('keydown-FOUR', () => this.spawnUnit('WIZARD'));
        this.input.keyboard.on('keydown-FIVE', () => this.spawnUnit('GIANT'));

        // Pause
        this.input.keyboard.on('keydown-ESC', () => this.togglePause());
        this.input.keyboard.on('keydown-P', () => this.togglePause());

        // Right click to pause
        this.input.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.togglePause();
            }
        });

        // Music toggle
        this.input.keyboard.on('keydown-M', () => {
            if (typeof audioManager !== 'undefined') {
                const enabled = audioManager.toggleMusic();
                this.musicIcon.setAlpha(enabled ? 1 : 0.4);
            }
        });
    }

    startResourceMining() {
        // Mining is now manual via hovering - no automatic timers needed
        // Mining speed scales with castle level
        this.updateMiningSpeed();
    }

    updateMining(delta) {
        if (this.isPaused) return;

        const progressPerFrame = (this.miningSpeed * delta) / 1000;

        // Initialize partial resource trackers
        if (this.goldPartial === undefined) this.goldPartial = 0;
        if (this.woodPartial === undefined) this.woodPartial = 0;

        // Gold mining - add resources gradually as progress fills
        if (this.goldMine.isHovering) {
            const oldProgress = this.goldMineProgress;
            this.goldMineProgress += progressPerFrame;

            // Add partial gold based on progress increment
            const resourcePerProgress = RESOURCE_CONFIG.mineGoldAmount / this.miningTarget;
            this.goldPartial += progressPerFrame * resourcePerProgress;

            // Add whole gold units as they accumulate
            while (this.goldPartial >= 1) {
                this.goldPartial -= 1;
                this.gold += 1;
                this.resourceDisplay.setGold(this.gold);
            }

            if (this.goldMineProgress >= this.miningTarget) {
                this.goldMineProgress = 0;
                // Play sound and sparkle on complete
                if (typeof audioManager !== 'undefined') audioManager.playGold();
                this.showMineEffect(this.goldMine, 0xFFD700);
            }
        } else {
            // Slowly decay progress when not hovering
            this.goldMineProgress = Math.max(0, this.goldMineProgress - progressPerFrame * 0.3);
        }

        // Wood mining - add resources gradually as progress fills
        if (this.woodMine.isHovering) {
            const oldProgress = this.woodMineProgress;
            this.woodMineProgress += progressPerFrame;

            // Add partial wood based on progress increment
            const resourcePerProgress = RESOURCE_CONFIG.mineWoodAmount / this.miningTarget;
            this.woodPartial += progressPerFrame * resourcePerProgress;

            // Add whole wood units as they accumulate
            while (this.woodPartial >= 1) {
                this.woodPartial -= 1;
                this.wood += 1;
                this.resourceDisplay.setWood(this.wood);
            }

            if (this.woodMineProgress >= this.miningTarget) {
                this.woodMineProgress = 0;
                // Play sound and sparkle on complete
                if (typeof audioManager !== 'undefined') audioManager.playWood();
                this.showMineEffect(this.woodMine, 0x8B4513);
            }
        } else {
            this.woodMineProgress = Math.max(0, this.woodMineProgress - progressPerFrame * 0.3);
        }

        // Update spinner visuals
        this.drawMineSpinner(this.goldMine, this.goldMineProgress);
        this.drawMineSpinner(this.woodMine, this.woodMineProgress);

        // Animate axe cursor
        this.updateAxeCursor();
    }

    drawMineSpinner(mine, progress) {
        // No spinner - just glow effect on the resource when hovering
        if (mine.isHovering) {
            mine.glowRing.setAlpha(0.3 + Math.sin(Date.now() / 200) * 0.2);
        }
    }

    updateAxeCursor() {
        // Animate axe cursor with chopping motion when over mines
        if (!this.isOverMine || !this.axeCursor) return;

        this.axeChopPhase += 0.12;
        const cycle = this.axeChopPhase % 4;

        let angle;
        if (cycle < 1) {
            // Raised position
            angle = -30;
        } else if (cycle < 1.5) {
            // Quick swing down
            const swingProgress = (cycle - 1) * 2;
            angle = -30 + (swingProgress * 50);
        } else if (cycle < 2.5) {
            // Hold at chopped position
            angle = 20;
        } else {
            // Raise back up
            const raiseProgress = (cycle - 2.5) / 1.5;
            angle = 20 - (raiseProgress * 50);
        }

        this.axeCursor.setAngle(angle);
    }

    collectResource(type) {
        // Resources are now added gradually during mining
        // This function is kept for any other code that might call it
        if (type === 'gold') {
            this.addGold(RESOURCE_CONFIG.mineGoldAmount);
        } else {
            this.addWood(RESOURCE_CONFIG.mineWoodAmount);
        }
    }

    showMineEffect(mine, color) {
        // Just sparkle effect, no floating text - counter animates smoothly
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const sparkle = this.add.rectangle(
                mine.x + Math.cos(angle) * 20,
                mine.y + Math.sin(angle) * 20,
                6, 6,
                color
            ).setDepth(1000);

            this.tweens.add({
                targets: sparkle,
                x: mine.x + Math.cos(angle) * 50,
                y: mine.y + Math.sin(angle) * 50 - 20,
                alpha: 0,
                scaleX: 0,
                scaleY: 0,
                duration: 500,
                onComplete: () => sparkle.destroy()
            });
        }
    }

    showSurvivalIntro() {
        const introText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'SURVIVAL MODE', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ff6b6b',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000);

        const subText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, 'Defend your castle! Mine gold & wood to spawn units!', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: [introText, subText],
            alpha: 0,
            y: '-=30',
            duration: 2500,
            delay: 500,
            onComplete: () => {
                introText.destroy();
                subText.destroy();
            }
        });
    }

    update(time, delta) {
        if (this.isPaused) return;

        // Update manual mining
        this.updateMining(delta);

        // Update castle upgrade hover spinner
        this.updateCastleUpgrade(delta);

        // Update all units
        this.units.getChildren().forEach(unit => {
            if (unit.active) unit.update(time, delta);
        });

        // Update all enemies
        this.enemies.getChildren().forEach(enemy => {
            if (enemy.active) enemy.update(time, delta);
        });

        // Update all projectiles
        this.projectiles.getChildren().forEach(projectile => {
            if (projectile.active) projectile.update(time, delta);
        });

        // Update unit button states and hover-to-spawn progress
        this.updateUnitButtons(delta);

        // Update wave display
        const waveInfo = this.waveSystem.getWaveInfo();
        this.waveDisplay.setWave(waveInfo.currentWave, waveInfo.enemiesRemaining);

        // Update unit counts
        this.updateUnitCounts();
    }

    updateUnitButtons(delta) {
        const unitTypes = ['PEASANT', 'ARCHER', 'KNIGHT', 'WIZARD', 'GIANT'];

        this.unitButtons.forEach((button, index) => {
            const type = unitTypes[index];
            const stats = UNIT_TYPES[type];
            const canAfford = this.gold >= stats.goldCost && this.wood >= stats.woodCost;
            button.setEnabled(canAfford && button.isUnlocked);

            // Update hover-to-spawn progress
            button.updateSpawnProgress(delta);
        });

        // Update castle upgrade button affordability
        if (this.upgradeCostText) {
            this.updateUpgradeButton();
        }
    }

    spawnUnit(unitType) {
        if (this.isPaused) return;

        // Production throttle - 250ms between spawns
        const now = Date.now();
        if (this.lastSpawnTime && now - this.lastSpawnTime < 250) {
            return; // Too soon, skip spawn
        }

        const typeKey = unitType.toLowerCase();
        const upgradeData = this.saveData.upgrades[typeKey];

        // Check if unlocked
        if (!upgradeData || !upgradeData.unlocked) {
            this.showMessage('Unit locked!', '#ff4444');
            return;
        }

        const stats = UNIT_TYPES[unitType];
        if (!stats) return;

        // Check costs
        if (this.gold < stats.goldCost) {
            this.showMessage('Not enough gold!', '#ff4444');
            return;
        }
        if (this.wood < stats.woodCost) {
            this.showMessage('Not enough wood!', '#ff4444');
            return;
        }

        // Spend resources
        this.gold -= stats.goldCost;
        this.wood -= stats.woodCost;
        this.resourceDisplay.subtractGold(stats.goldCost);
        this.resourceDisplay.subtractWood(stats.woodCost);

        // Play spawn sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playSpawn();
        }

        // Spawn unit near castle
        const spawnY = Phaser.Math.Between(300, 460);
        const unit = new Unit(
            this,
            CASTLE_CONFIG.playerX + 80,
            spawnY,
            unitType,
            upgradeData.level
        );

        this.units.add(unit);
        this.lastSpawnTime = Date.now(); // Record spawn time for throttle
    }

    spawnEnemy(enemyType, direction = 'right') {
        let spawnX, spawnY;

        switch (direction) {
            case 'top':
                spawnX = Phaser.Math.Between(SPAWN_CONFIG.topSpawn.minX, SPAWN_CONFIG.topSpawn.maxX);
                spawnY = SPAWN_CONFIG.topSpawn.y;
                break;
            case 'bottom':
                spawnX = Phaser.Math.Between(SPAWN_CONFIG.bottomSpawn.minX, SPAWN_CONFIG.bottomSpawn.maxX);
                spawnY = SPAWN_CONFIG.bottomSpawn.y;
                break;
            case 'right':
            default:
                spawnX = SPAWN_CONFIG.rightSpawn.x;
                spawnY = Phaser.Math.Between(SPAWN_CONFIG.rightSpawn.minY, SPAWN_CONFIG.rightSpawn.maxY);
                break;
        }

        const enemy = new Enemy(
            this,
            spawnX,
            spawnY,
            enemyType,
            this.waveSystem.currentWave,
            direction
        );

        this.enemies.add(enemy);
    }

    addGold(amount) {
        this.gold += amount;
        this.goldEarnedThisRun += amount;
        this.resourceDisplay.addGold(amount);
    }

    addWood(amount) {
        this.wood += amount;
        this.woodEarnedThisRun += amount;
        this.resourceDisplay.addWood(amount);
    }

    onUnitDied(unit) {
        this.units.remove(unit, true);
    }

    onEnemyKilled(enemy) {
        this.enemiesKilledThisRun++;
        this.enemies.remove(enemy, true);
        this.waveSystem.onEnemyKilled();
    }

    onWaveStart(waveNumber, enemyCount) {
        this.waveDisplay.showWaveStart(waveNumber);
    }

    onWaveComplete(waveNumber, goldReward, woodReward) {
        this.addGold(goldReward);
        this.addWood(woodReward);
        this.waveDisplay.showWaveComplete(goldReward, woodReward);

        // Bonus message for milestone waves
        if (waveNumber % 5 === 0) {
            this.showMessage(`Wave ${waveNumber} complete! Bonus: +50g +30w`, '#ffd700');
            this.addGold(50);
            this.addWood(30);
        }

        // Schedule next wave
        this.waveSystem.scheduleNextWave();
    }

    onPlayerCastleDestroyed() {
        // Game Over
        this.gameOver(false);
    }

    gameOver(isVictory) {
        // Stop music
        if (typeof audioManager !== 'undefined') {
            audioManager.stopMusic();
        }

        // Stop all timers
        this.waveSystem.stopTimers();
        if (this.goldMineTimer) {
            this.goldMineTimer.remove();
        }
        if (this.woodMineTimer) {
            this.woodMineTimer.remove();
        }

        // Update save data
        const finalWave = this.waveSystem.currentWave;
        saveSystem.updateHighScore(finalWave, this.goldEarnedThisRun, this.enemiesKilledThisRun);

        // Show game over text
        const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'CASTLE DESTROYED!', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000);

        const waveText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `You survived ${finalWave} waves!`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        // Transition to game over scene
        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                wave: finalWave,
                goldEarned: this.goldEarnedThisRun,
                woodEarned: this.woodEarnedThisRun,
                enemiesKilled: this.enemiesKilledThisRun,
                isVictory: false
            });
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;

        if (typeof audioManager !== 'undefined') {
            audioManager.playClick();
        }

        if (this.isPaused) {
            this.pauseText.setText('▶');
            // Pause wave system timers
            this.waveSystem.pause();
            this.showPauseMenu();
        } else {
            this.pauseText.setText('II');
            // Resume wave system timers
            this.waveSystem.resume();
            this.hidePauseMenu();
        }
    }

    showPauseMenu() {
        this.pauseOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Modern panel - no border
        const bg = this.add.rectangle(0, 0, 300, 280, 0x0a1520, 0.95);
        this.pauseOverlay.add(bg);
        const inner = this.add.rectangle(0, 0, 296, 276, 0x1a2a3a, 0.9);
        this.pauseOverlay.add(inner);
        // Accent line at top
        this.pauseOverlay.add(this.add.rectangle(0, -130, 280, 4, 0x4a7aba, 0.8));

        const title = this.add.text(0, -105, 'PAUSED', {
            fontSize: '36px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseOverlay.add(title);

        // Wave info
        const waveInfo = this.add.text(0, -65, `Wave: ${this.waveSystem.currentWave}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        this.pauseOverlay.add(waveInfo);

        // Resource info
        const resourceInfo = this.add.text(0, -40, `Gold: ${this.gold} | Wood: ${this.wood}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffd700'
        }).setOrigin(0.5);
        this.pauseOverlay.add(resourceInfo);

        // Resume button
        const resumeBtn = this.createPauseMenuButton(0, 10, 'Resume', () => {
            this.togglePause();
        });
        this.pauseOverlay.add(resumeBtn);

        // Main Menu button
        const menuBtn = this.createPauseMenuButton(0, 60, 'Main Menu', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.stopMusic();
            }
            this.waveSystem.stopTimers();
            this.scene.start('MenuScene');
        });
        this.pauseOverlay.add(menuBtn);

        // Restart button
        const restartBtn = this.createPauseMenuButton(0, 110, 'Restart', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.stopMusic();
            }
            this.waveSystem.stopTimers();
            this.scene.restart();
        });
        this.pauseOverlay.add(restartBtn);

        this.pauseOverlay.setDepth(1000);
    }

    createPauseMenuButton(x, y, text, callback) {
        const container = this.add.container(x, y);

        // Modern button - no border
        const bg = this.add.rectangle(0, 0, 200, 42, 0x2a4a6a, 0.9);
        bg.setInteractive({ useHandCursor: true });
        container.add(bg);
        const inner = this.add.rectangle(0, 0, 196, 38, 0x3a5a7a, 0.8);
        container.add(inner);
        // Highlight at top
        container.add(this.add.rectangle(0, -14, 190, 4, 0x4a7aba, 0.4));

        const label = this.add.text(0, 0, text, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        bg.on('pointerover', () => {
            inner.setFillStyle(0x4a7aba, 0.9);
        });

        bg.on('pointerout', () => {
            inner.setFillStyle(0x3a5a7a, 0.8);
        });

        bg.on('pointerdown', callback);

        return container;
    }

    hidePauseMenu() {
        if (this.pauseOverlay) {
            this.pauseOverlay.destroy();
            this.pauseOverlay = null;
        }
    }

    showMessage(text, color = '#ffffff') {
        const message = this.add.text(GAME_WIDTH / 2, 150, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: message,
            y: 120,
            alpha: 0,
            duration: 1500,
            onComplete: () => message.destroy()
        });
    }
}
