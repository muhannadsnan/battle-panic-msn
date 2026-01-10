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
        this.unitsSpawnedThisRun = 0;
        this.gameStartTime = Date.now();

        // Kill stats per enemy type
        this.killStats = {
            goblin: 0,
            orc: 0,
            skeleton: 0,
            skeleton_archer: 0,
            troll: 0,
            dark_knight: 0,
            demon: 0,
            dragon: 0,
            spear_monster: 0
        };

        // Unit spawn counts per type
        this.unitCounts = {
            peasant: 0,
            archer: 0,
            knight: 0,
            wizard: 0,
            giant: 0
        };

        // Unit promotion levels (calculated from spawn counts)
        // Level 0: 0-9 spawns, Level 1: 10-19, Level 2: 20-29, etc up to Level 6
        this.unitPromotionLevels = {
            peasant: 0,
            archer: 0,
            knight: 0,
            wizard: 0,
            giant: 0
        };

        // Resource tracking
        this.goldCollectedThisRun = 0;
        this.woodCollectedThisRun = 0;
        this.goldSpentThisRun = 0;
        this.woodSpentThisRun = 0;

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

        // Base ground floor - Yellow/tan field (not green - orcs are green!)
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, GAME_WIDTH, GAME_HEIGHT - 60, 0xC4A860);

        // Ground texture - varied patches for depth (yellows, tans, light browns)
        const groundColors = [0xD4B870, 0xBFA058, 0xCCB068, 0xB89848, 0xDDC080];
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(100, GAME_HEIGHT);
            const w = Phaser.Math.Between(60, 140);
            const h = Phaser.Math.Between(40, 80);
            const color = Phaser.Math.RND.pick(groundColors);
            this.add.rectangle(x, y, w, h, color, 0.5);
        }

        // Darker patches for variety (warm browns)
        const darkGroundColors = [0xA08040, 0x907838, 0xB09050, 0x9A8545];
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, GAME_WIDTH);
            const y = Phaser.Math.Between(100, GAME_HEIGHT);
            const w = Phaser.Math.Between(40, 90);
            const h = Phaser.Math.Between(25, 50);
            const color = Phaser.Math.RND.pick(darkGroundColors);
            this.add.rectangle(x, y, w, h, color, 0.4);
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

        // Mining config
        this.miningTarget = 100; // Used for resource rate calculation

        // Hide default cursor and create custom cursors
        this.input.setDefaultCursor('none');
        this.createSwordCursor();
        this.createAxeCursor();
    }

    createSwordCursor() {
        this.swordCursor = this.add.container(0, 0);
        this.swordCursor.setDepth(2000);

        // Sword blade (silver/steel)
        const blade = this.add.rectangle(0, -20, 8, 40, 0xC0C0C0);
        blade.setStrokeStyle(1, 0x888888);
        this.swordCursor.add(blade);

        // Blade highlight
        this.swordCursor.add(this.add.rectangle(-1, -20, 3, 36, 0xE8E8E8));

        // Blade tip
        this.swordCursor.add(this.add.rectangle(0, -42, 6, 8, 0xD0D0D0));
        this.swordCursor.add(this.add.rectangle(0, -48, 4, 6, 0xE0E0E0));

        // Cross guard (gold)
        const guard = this.add.rectangle(0, 2, 24, 6, 0xFFD700);
        guard.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(guard);
        this.swordCursor.add(this.add.rectangle(-14, 4, 6, 4, 0xFFD700));
        this.swordCursor.add(this.add.rectangle(14, 4, 6, 4, 0xFFD700));

        // Handle (brown leather)
        this.swordCursor.add(this.add.rectangle(0, 16, 6, 20, 0x8B4513));
        for (let i = 0; i < 4; i++) {
            this.swordCursor.add(this.add.rectangle(0, 8 + i * 5, 7, 2, 0x654321));
        }

        // Pommel (gold)
        const pommel = this.add.rectangle(0, 28, 10, 8, 0xFFD700);
        pommel.setStrokeStyle(1, 0xDAA520);
        this.swordCursor.add(pommel);

        this.swordCursor.setAngle(-30);
        this.swordCursor.setScale(0.7);
    }

    createAxeCursor() {
        // Custom axe cursor container - pivots from bottom of handle
        this.axeCursor = this.add.container(0, 0);
        this.axeCursor.setDepth(2000); // Always on top
        this.axeCursor.setVisible(false);

        // Axe handle (offset so bottom is at 0,0 for pivot)
        this.axeCursor.add(this.add.rectangle(0, -25, 10, 50, 0xC4956A));
        this.axeCursor.add(this.add.rectangle(2, -25, 6, 46, 0xD4A57A));

        // Axe head (offset for bottom pivot)
        this.axeCursor.add(this.add.rectangle(-18, -49, 32, 22, 0x8899AA));
        this.axeCursor.add(this.add.rectangle(-26, -49, 14, 18, 0x7789AA));
        this.axeCursor.add(this.add.rectangle(-10, -55, 18, 8, 0xBBCCDD)); // shine

        // Track if we're over a mine
        this.isOverMine = false;
        this.axeChopPhase = 0;

        // Follow mouse
        this.input.on('pointermove', (pointer) => {
            // Update sword cursor position
            if (this.swordCursor) {
                this.swordCursor.setPosition(pointer.x + 10, pointer.y + 15);
            }
            // Update axe cursor position when over mine
            if (this.isOverMine && this.axeCursor) {
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
        hitArea.setInteractive({});
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
            fontSize: '15px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: isGold ? '#ffd700' : '#D4A574',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        container.add(label);
        container.mineLabel = label;  // Store reference to hide when mining

        // Hover events
        hitArea.on('pointerover', (pointer) => {
            container.isHovering = true;
            container.mineLabel.setVisible(false);  // Hide label when mining
            glowRing.setAlpha(0.3);
            this.tweens.add({
                targets: glowRing,
                alpha: 0.5,
                scaleX: 1.08,
                scaleY: 1.08,
                duration: 200
            });
            // Show axe cursor, hide sword cursor
            this.isOverMine = true;
            this.axeCursor.setVisible(true);
            this.axeCursor.setPosition(pointer.x, pointer.y);
            this.swordCursor.setVisible(false);
        });

        hitArea.on('pointerout', () => {
            container.isHovering = false;
            container.mineLabel.setVisible(true);  // Show label when not mining
            this.tweens.add({
                targets: glowRing,
                alpha: 0,
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
            // Hide axe cursor, show sword cursor
            this.isOverMine = false;
            this.axeCursor.setVisible(false);
            this.axeChopPhase = 0;
            this.axeCursor.setAngle(0);
            this.swordCursor.setVisible(true);
        });

        container.isHovering = false;
        container.mineType = type;
        container.setDepth(100);
        return container;
    }


    createCastle() {
        // Castle always starts at level 1 each battle (in-game upgrades)
        this.castleLevel = 1;

        // Apply PERMANENT upgrades from XP upgrades menu
        const castleUpgrades = this.saveData.castleUpgrades || { health: 1, armor: 1, goldIncome: 1 };

        // Health upgrade: +20 HP per level (level 1 = base, level 2 = +20, etc.)
        const permanentHealthBonus = (castleUpgrades.health - 1) * 20;
        const playerHealth = CASTLE_CONFIG.playerHealth + permanentHealthBonus;

        this.playerCastle = new Castle(
            this,
            CASTLE_CONFIG.playerX,
            380,
            true,
            playerHealth
        );

        // Store armor level for damage reduction (applied in Castle.takeDamage)
        this.playerCastle.armorLevel = castleUpgrades.armor || 1;

        // Store gold income bonus for mining
        this.goldIncomeLevel = castleUpgrades.goldIncome || 1;

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
        hitArea.setInteractive({});
        this.castleUpgradeZone.add(hitArea);

        // Spinner container (hidden by default, shown on hover)
        // Positioned below castle health bar (health bar is at y ~250)
        this.castleSpinnerContainer = this.add.container(0, 80);
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
            fontSize: '15px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.castleSpinnerContainer.add(this.castleUpgradePercentText);

        // Cost/info text (always visible, outside spinner container)
        this.castleUpgradeCostText = this.add.text(0, 170, '', {
            fontSize: '26px',  // Same as resources
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#888888',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        this.castleUpgradeZone.add(this.castleUpgradeCostText);

        // Glow effect for cost text (shown when affordable)
        this.castleCostGlow = this.add.text(0, 170, '', {
            fontSize: '26px',  // Same as resources
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80',
            stroke: '#4ade80',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);
        this.castleUpgradeZone.add(this.castleCostGlow);
        // Bring cost text in front of glow
        this.castleUpgradeZone.bringToTop(this.castleUpgradeCostText);

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
        const multiplier = Math.pow(CASTLE_CONFIG.upgradeCostMultiplier, level - 1);
        return {
            gold: Math.floor(CASTLE_CONFIG.upgradeGoldBase * multiplier),
            wood: Math.floor(CASTLE_CONFIG.upgradeWoodBase * multiplier)
        };
    }

    updateCastleUpgrade(delta) {
        if (this.isPaused) return;

        const currentLevel = this.castleLevel || 1;
        const isMaxLevel = currentLevel >= CASTLE_CONFIG.maxLevel;

        // At max level, allow repair instead of upgrade
        const cost = isMaxLevel
            ? this.getCastleUpgradeCost(CASTLE_CONFIG.maxLevel - 1)  // Same cost as level 10 upgrade
            : this.getCastleUpgradeCost(currentLevel);
        const canAfford = this.gold >= cost.gold && this.wood >= cost.wood;

        // Update cost display
        const costText = isMaxLevel
            ? `${cost.gold}g ${cost.wood}w REPAIR`
            : `${cost.gold}g ${cost.wood}w
Lv.${currentLevel + 1}`;

        this.castleUpgradeCostText.setText(costText);
        this.castleCostGlow.setText(costText);

        // Update colors and glow based on affordability
        if (canAfford) {
            this.castleUpgradeCostText.setStyle({ color: '#4ade80' });
            this.castleCostGlow.setAlpha(0.8);
        } else {
            this.castleUpgradeCostText.setStyle({ color: '#888888' });
            this.castleCostGlow.setAlpha(0);
        }

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
        const isMaxLevel = currentLevel >= CASTLE_CONFIG.maxLevel;

        // Cost depends on whether upgrading or repairing
        const cost = isMaxLevel
            ? this.getCastleUpgradeCost(CASTLE_CONFIG.maxLevel - 1)
            : this.getCastleUpgradeCost(currentLevel);

        // Spend gold and wood
        this.gold -= cost.gold;
        this.wood -= cost.wood;
        this.goldSpentThisRun += cost.gold;
        this.woodSpentThisRun += cost.wood;
        this.resourceDisplay.subtractGold(cost.gold);
        this.resourceDisplay.subtractWood(cost.wood);

        if (isMaxLevel) {
            // REPAIR: Restore castle and fence HP to full (no level increase)
            this.playerCastle.currentHealth = this.playerCastle.maxHealth;
            this.playerCastle.updateHealthBar();

            // Also repair fence if it exists
            if (this.playerCastle.hasFence) {
                this.playerCastle.fenceCurrentHealth = this.playerCastle.fenceMaxHealth;
                this.playerCastle.updateFenceHealthBar();
            }

            // Play sound
            if (typeof audioManager !== 'undefined') {
                audioManager.playGold();
            }

            // Visual feedback
            this.showMessage(`Castle REPAIRED!`, '#4ade80');

            // Green glow effect
            const glow = this.add.rectangle(this.playerCastle.x, this.playerCastle.y, 180, 220, 0x4ade80, 0.3);
            this.tweens.add({
                targets: glow,
                scaleX: 1.5,
                scaleY: 1.5,
                alpha: 0,
                duration: 600,
                onComplete: () => glow.destroy()
            });
        } else {
            // UPGRADE: Increase level
            this.castleLevel = currentLevel + 1;

            // Update castle display and stats (setLevel handles health bonus)
            this.playerCastle.setLevel(this.castleLevel);

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
    }

    updateCastleUpgradeDisplay() {
        const level = this.castleLevel || 1;
        const isMaxLevel = level >= CASTLE_CONFIG.maxLevel;
        const cost = isMaxLevel
            ? this.getCastleUpgradeCost(CASTLE_CONFIG.maxLevel - 1)
            : this.getCastleUpgradeCost(level);

        const costText = isMaxLevel
            ? `${cost.gold}g ${cost.wood}w REPAIR`
            : `${cost.gold}g ${cost.wood}w
Lv.${level + 1}`;

        this.castleUpgradeCostText.setText(costText);
        this.castleCostGlow.setText(costText);

        // Check affordability
        const canAfford = this.gold >= cost.gold && this.wood >= cost.wood;
        if (canAfford) {
            this.castleUpgradeCostText.setStyle({ color: '#4ade80' });
            this.castleCostGlow.setAlpha(0.8);
        } else {
            this.castleUpgradeCostText.setStyle({ color: '#888888' });
            this.castleCostGlow.setAlpha(0);
        }
    }

    updateMiningSpeed() {
        // Mining speed increases 10% per castle level
        const level = this.castleLevel || 1;
        // Gold Income upgrade adds +10% mining speed per level
        const goldIncomeLevel = this.goldIncomeLevel || 1;
        const goldIncomeBonus = 1 + (goldIncomeLevel - 1) * 0.1;
        this.miningSpeed = 50 * (1 + (level - 1) * 0.1) * goldIncomeBonus;
    }

    createUI() {
        // Wave display (bottom right corner, always on top)
        this.waveDisplay = new WaveDisplay(this, GAME_WIDTH - 10, GAME_HEIGHT - 10);

        // Resource display (gold and wood) - center top
        this.resourceDisplay = new ResourceDisplay(this, 150, 30);  // Adjusted right
        this.resourceDisplay.setGold(this.gold);
        this.resourceDisplay.setWood(this.wood);

        // Keep goldDisplay for backwards compatibility
        this.goldDisplay = this.resourceDisplay;

        // Rank display (top left corner)
        this.createRankBadge();

        // Unit buttons panel
        this.createUnitButtons();

        // Pause button
        this.createPauseButton();

        // Music toggle button
        this.createMusicToggle();

        // Unit count display (top right area)
        this.createUnitCountDisplay();
    }

    createRankBadge() {
        const rankInfo = saveSystem.getRankInfo(this.saveData);

        // Container for rank badge - above wave count, no background
        this.rankBadge = this.add.container(GAME_WIDTH - 10, GAME_HEIGHT - 60);  // Higher above wave
        this.rankBadge.setDepth(900);

        // Rank icon and full name with grade - no background, with opacity
        this.rankText = this.add.text(0, 0, `${rankInfo.rank.icon} ${rankInfo.rank.fullName}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: rankInfo.rank.color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0.5).setAlpha(0.8);  // Right-aligned, less opacity
        this.rankBadge.add(this.rankText);
    }

    createUnitCountDisplay() {
        // Container for unit counts - horizontal layout in top bar (shifted left for space)
        this.unitCountContainer = this.add.container(GAME_WIDTH - 500, 35);  // More space between elements
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
            const x = index * 70; // More space between counts

            // Mini unit icon (offset down a bit since icons extend upward) - x2 scale
            const iconContainer = this.add.container(x, 8);
            iconContainer.setScale(2);  // x2 larger icons
            this.createMiniUnitIcon(iconContainer, type);
            this.unitCountContainer.add(iconContainer);

            // Count text next to icon
            const countText = this.add.text(x + 22, 0, '0', {
                fontSize: '26px',  // Same as resources
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
        const startY = 60;  // Full height bar
        const spacing = 120;  // No margins between buttons
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
        // Pause button - larger touch target for iPad
        const pauseX = GAME_WIDTH - 35;
        const pauseY = 30;

        // Invisible touch target (50x50 for iPad)
        this.pauseHitArea = this.add.rectangle(pauseX, pauseY, 50, 50, 0x000000, 0)
            .setInteractive({})
            .setDepth(950);

        this.pauseText = this.add.text(pauseX, pauseY, 'II', {
            fontSize: '30px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(951);

        this.pauseHitArea.on('pointerdown', () => this.togglePause());
    }

    createMusicToggle() {
        // Music toggle - larger touch targets for iPad
        const musicX = GAME_WIDTH - 90;
        const volumeX = GAME_WIDTH - 145;
        const iconY = 30;

        // Music icon with 50x50 touch target
        this.musicHitArea = this.add.rectangle(musicX, iconY, 50, 50, 0x000000, 0)
            .setInteractive({})
            .setDepth(950);

        this.musicIcon = this.add.text(musicX, iconY, '🎵', {
            fontSize: '28px'
        }).setOrigin(0.5).setDepth(951);

        this.musicHitArea.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                const enabled = audioManager.toggleMusic();
                this.musicIcon.setAlpha(enabled ? 1 : 0.4);
            }
        });

        // Sound volume toggle: 100% -> 25% -> mute -> 100%
        this.volumeState = 0; // 0=100%, 1=25%, 2=mute

        this.volumeHitArea = this.add.rectangle(volumeX, iconY, 50, 50, 0x000000, 0)
            .setInteractive({})
            .setDepth(950);

        this.muteIcon = this.add.text(volumeX, iconY, '🔊', {
            fontSize: '28px'
        }).setOrigin(0.5).setDepth(951);

        this.volumeHitArea.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                this.volumeState = (this.volumeState + 1) % 3;
                const volumes = [1.0, 0.25, 0];
                const icons = ['🔊', '🔉', '🔇'];
                const volume = volumes[this.volumeState];
                audioManager.setMasterVolume(volume);
                this.muteIcon.setText(icons[this.volumeState]);
                this.musicIcon.setAlpha(volume > 0 ? 1 : 0.3);
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
        const soundTickInterval = 200; // Play sound every 200ms while hovering

        // Initialize trackers
        if (this.goldPartial === undefined) this.goldPartial = 0;
        if (this.woodPartial === undefined) this.woodPartial = 0;
        if (this.lastGoldSoundTime === undefined) this.lastGoldSoundTime = 0;
        if (this.lastWoodSoundTime === undefined) this.lastWoodSoundTime = 0;
        if (this.lastGoldRateDisplayTime === undefined) this.lastGoldRateDisplayTime = 0;
        if (this.lastWoodRateDisplayTime === undefined) this.lastWoodRateDisplayTime = 0;

        const now = Date.now();
        const rateDisplayInterval = 1500; // Show rate every 1.5 seconds

        // Gold mining
        if (this.goldMine.isHovering) {
            // Play tick sound at fixed interval
            if (now - this.lastGoldSoundTime >= soundTickInterval) {
                this.lastGoldSoundTime = now;
                if (typeof audioManager !== 'undefined') audioManager.playGold();
            }

            // Add partial gold based on mining speed
            const resourcePerSecond = RESOURCE_CONFIG.mineGoldAmount / (this.miningTarget / this.miningSpeed);
            this.goldPartial += (resourcePerSecond * delta) / 1000;

            // Add whole gold units as they accumulate
            while (this.goldPartial >= 1) {
                this.goldPartial -= 1;
                this.gold += 1;
                this.goldCollectedThisRun += 1;
                this.resourceDisplay.setGold(this.gold);
            }

            // Show mining rate every 3 seconds
            if (now - this.lastGoldRateDisplayTime >= rateDisplayInterval) {
                this.lastGoldRateDisplayTime = now;
                this.showMiningRate(this.goldMine.x, this.goldMine.y - 40, resourcePerSecond, '#ffd700');
            }
        }

        // Wood mining
        if (this.woodMine.isHovering) {
            // Play tick sound at fixed interval
            if (now - this.lastWoodSoundTime >= soundTickInterval) {
                this.lastWoodSoundTime = now;
                if (typeof audioManager !== 'undefined') audioManager.playWood();
            }

            // Add partial wood based on mining speed
            const resourcePerSecond = RESOURCE_CONFIG.mineWoodAmount / (this.miningTarget / this.miningSpeed);
            this.woodPartial += (resourcePerSecond * delta) / 1000;

            // Add whole wood units as they accumulate
            while (this.woodPartial >= 1) {
                this.woodPartial -= 1;
                this.wood += 1;
                this.woodCollectedThisRun += 1;
                this.resourceDisplay.setWood(this.wood);
            }

            // Show mining rate every 3 seconds
            if (now - this.lastWoodRateDisplayTime >= rateDisplayInterval) {
                this.lastWoodRateDisplayTime = now;
                this.showMiningRate(this.woodMine.x, this.woodMine.y - 40, resourcePerSecond, '#cd853f');
            }
        }

        // Update glow effect on mines
        if (this.goldMine.isHovering) {
            this.goldMine.glowRing.setAlpha(0.3 + Math.sin(Date.now() / 200) * 0.2);
        }
        if (this.woodMine.isHovering) {
            this.woodMine.glowRing.setAlpha(0.3 + Math.sin(Date.now() / 200) * 0.2);
        }

        // Animate axe cursor
        this.updateAxeCursor();
    }

    updateAxeCursor() {
        // Animate axe cursor with chopping motion when over mines (2x faster)
        if (!this.isOverMine || !this.axeCursor) return;

        this.axeChopPhase += 0.24;
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

        // Update castle (shoots arrows at enemies)
        if (this.playerCastle && !this.playerCastle.isDead) {
            this.playerCastle.update(time, delta);
        }

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

            // Cost increases with promotion level to balance spam
            const promotionLevel = this.getPromotionLevel(type);
            const costMultiplier = this.getPromotionCostMultiplier(promotionLevel);
            const totalGoldCost = Math.ceil(stats.goldCost * costMultiplier);
            const totalWoodCost = Math.ceil(stats.woodCost * costMultiplier);

            const canAfford = this.gold >= totalGoldCost && this.wood >= totalWoodCost;
            button.setEnabled(canAfford && button.isUnlocked);

            // Update displayed costs based on promotion
            button.updateCosts(totalGoldCost, totalWoodCost);

            // Update affordable count display (pass multiplier for accurate count)
            button.updateAffordableCount(this.gold, this.wood, costMultiplier);

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

        // Get promotion bonus for this unit type
        const promotionLevel = this.getPromotionLevel(unitType);
        const promotionBonus = this.getPromotionBonus(promotionLevel);

        // Cost increases with promotion level, at max (level 6) spawn 2 units
        const costMultiplier = this.getPromotionCostMultiplier(promotionLevel);
        const unitsToSpawn = promotionLevel >= 6 ? 2 : 1;
        const totalGoldCost = Math.ceil(stats.goldCost * costMultiplier);
        const totalWoodCost = Math.ceil(stats.woodCost * costMultiplier);

        // Check costs (including double cost for max promotion)
        if (this.gold < totalGoldCost) {
            this.showMessage('Not enough gold!', '#ff4444');
            return;
        }
        if (this.wood < totalWoodCost) {
            this.showMessage('Not enough wood!', '#ff4444');
            return;
        }

        // Spend resources
        this.gold -= totalGoldCost;
        this.wood -= totalWoodCost;
        this.goldSpentThisRun += totalGoldCost;
        this.woodSpentThisRun += totalWoodCost;
        this.resourceDisplay.subtractGold(totalGoldCost);
        this.resourceDisplay.subtractWood(totalWoodCost);

        // Play spawn sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playSpawn();
        }

        for (let i = 0; i < unitsToSpawn; i++) {
            // Spawn unit near castle (slightly offset Y for multiple units)
            const spawnY = Phaser.Math.Between(300, 460) + (i * 30);
            const unit = new Unit(
                this,
                CASTLE_CONFIG.playerX + 80 + (i * 20),
                spawnY,
                unitType,
                upgradeData.level,
                promotionBonus,
                promotionLevel
            );

            this.units.add(unit);
            this.unitsSpawnedThisRun++;

            // Track unit type count and check for promotion
            const unitKey = unitType.toLowerCase();
            if (this.unitCounts[unitKey] !== undefined) {
                this.unitCounts[unitKey]++;
                // Check if this spawn triggered a promotion
                this.checkPromotion(unitType);
            }
        }

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

        // Track kill by enemy type
        const enemyType = enemy.enemyType ? enemy.enemyType.toLowerCase() : 'goblin';
        if (this.killStats[enemyType] !== undefined) {
            this.killStats[enemyType]++;
        }

        this.enemies.remove(enemy, true);
        this.waveSystem.onEnemyKilled();
    }

    onWaveStart(waveNumber, enemyCount) {
        this.waveDisplay.showWaveStart(waveNumber);
    }

    onWaveComplete(waveNumber, goldReward, woodReward) {
        this.addGold(goldReward);
        this.addWood(woodReward);
        this.waveDisplay.showWaveComplete(waveNumber, goldReward, woodReward);

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
        // Stop music and play defeat sound
        if (typeof audioManager !== 'undefined') {
            audioManager.stopMusic();
            audioManager.playDefeat();
        }

        // Stop all timers
        this.waveSystem.stopTimers();
        if (this.goldMineTimer) {
            this.goldMineTimer.remove();
        }
        if (this.woodMineTimer) {
            this.woodMineTimer.remove();
        }

        // Update save data with detailed stats
        const finalWave = this.waveSystem.currentWave;
        const survivalTime = Math.floor((Date.now() - this.gameStartTime) / 1000);
        saveSystem.updateHighScore(
            finalWave,
            this.goldEarnedThisRun,
            this.enemiesKilledThisRun,
            this.killStats,
            {
                survivalTime,
                unitsSpawned: this.unitsSpawnedThisRun,
                unitCounts: this.unitCounts,
                goldCollected: this.goldCollectedThisRun,
                woodCollected: this.woodCollectedThisRun,
                goldSpent: this.goldSpentThisRun,
                woodSpent: this.woodSpentThisRun
            }
        );

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
            // Pause music
            if (typeof audioManager !== 'undefined') {
                audioManager.pauseMusic();
            }
            this.showPauseMenu();
        } else {
            this.pauseText.setText('II');
            // Resume wave system timers
            this.waveSystem.resume();
            // Resume music
            if (typeof audioManager !== 'undefined') {
                audioManager.resumeMusic();
            }
            this.hidePauseMenu();
        }
    }

    showPauseMenu() {
        this.pauseOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);

        // Full screen clickable area for right-click to resume
        const fullScreenHit = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.01);
        fullScreenHit.setInteractive();
        fullScreenHit.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.togglePause();
            }
        });
        this.pauseOverlay.add(fullScreenHit);

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

        // Sound controls
        const soundLabel = this.add.text(-60, -40, 'Sound:', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        this.pauseOverlay.add(soundLabel);

        // Music toggle button
        const musicBtn = this.add.text(10, -40, '🎵', {
            fontSize: '28px'
        }).setOrigin(0.5).setInteractive({});
        musicBtn.setAlpha(typeof audioManager !== 'undefined' && audioManager.musicEnabled ? 1 : 0.4);
        musicBtn.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                const enabled = audioManager.toggleMusic();
                musicBtn.setAlpha(enabled ? 1 : 0.4);
            }
        });
        this.pauseOverlay.add(musicBtn);

        // Volume toggle button
        const volumeIcons = ['🔊', '🔉', '🔇'];
        const volumeBtn = this.add.text(60, -40, volumeIcons[this.volumeState || 0], {
            fontSize: '28px'
        }).setOrigin(0.5).setInteractive({});
        volumeBtn.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                this.volumeState = (this.volumeState + 1) % 3;
                const volumes = [1.0, 0.25, 0];
                audioManager.setMasterVolume(volumes[this.volumeState]);
                volumeBtn.setText(volumeIcons[this.volumeState]);
                musicBtn.setAlpha(volumes[this.volumeState] > 0 ? 1 : 0.3);
                // Also update the top bar icons
                if (this.muteIcon) this.muteIcon.setText(volumeIcons[this.volumeState]);
                if (this.musicIcon) this.musicIcon.setAlpha(volumes[this.volumeState] > 0 ? 1 : 0.3);
            }
        });
        this.pauseOverlay.add(volumeBtn);

        // Resume button
        const resumeBtn = this.createPauseMenuButton(0, 10, 'Resume', () => {
            this.togglePause();
        });
        this.pauseOverlay.add(resumeBtn);

        // Main Menu button
        const menuBtn = this.createPauseMenuButton(0, 60, 'Main Menu', () => {
            this.showConfirmDialog('Return to Main Menu?', () => {
                if (typeof audioManager !== 'undefined') {
                    audioManager.stopMusic();
                }
                this.waveSystem.stopTimers();
                this.scene.start('MenuScene');
            });
        });
        this.pauseOverlay.add(menuBtn);

        // Restart button
        const restartBtn = this.createPauseMenuButton(0, 110, 'Restart', () => {
            this.showConfirmDialog('Restart the battle?', () => {
                if (typeof audioManager !== 'undefined') {
                    audioManager.stopMusic();
                }
                this.waveSystem.stopTimers();
                this.scene.restart();
            });
        });
        this.pauseOverlay.add(restartBtn);

        this.pauseOverlay.setDepth(1000);
    }

    createPauseMenuButton(x, y, text, callback) {
        const container = this.add.container(x, y);

        // Modern button - no border
        const bg = this.add.rectangle(0, 0, 200, 42, 0x2a4a6a, 0.9);
        bg.setInteractive({});
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

    showConfirmDialog(message, onConfirm) {
        // Create confirmation overlay
        const confirmOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        confirmOverlay.setDepth(1100);

        // Background
        const bg = this.add.rectangle(0, 0, 300, 150, 0x1a1a2e, 0.95);
        confirmOverlay.add(bg);

        // Border
        const border = this.add.rectangle(0, 0, 304, 154, 0x4a7aba, 0.8);
        border.setStrokeStyle(2, 0x4a7aba);
        confirmOverlay.add(border);
        confirmOverlay.sendToBack(border);

        // Message
        const msgText = this.add.text(0, -35, message, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        confirmOverlay.add(msgText);

        // Yes button
        const yesBtn = this.add.rectangle(-60, 30, 90, 36, 0x4ade80, 0.9);
        yesBtn.setInteractive({});
        confirmOverlay.add(yesBtn);
        const yesText = this.add.text(-60, 30, 'Yes', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#000000'
        }).setOrigin(0.5);
        confirmOverlay.add(yesText);

        // No button
        const noBtn = this.add.rectangle(60, 30, 90, 36, 0xef4444, 0.9);
        noBtn.setInteractive({});
        confirmOverlay.add(noBtn);
        const noText = this.add.text(60, 30, 'No', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        confirmOverlay.add(noText);

        // Button hover effects
        yesBtn.on('pointerover', () => yesBtn.setFillStyle(0x22c55e, 1));
        yesBtn.on('pointerout', () => yesBtn.setFillStyle(0x4ade80, 0.9));
        noBtn.on('pointerover', () => noBtn.setFillStyle(0xdc2626, 1));
        noBtn.on('pointerout', () => noBtn.setFillStyle(0xef4444, 0.9));

        // Button actions
        yesBtn.on('pointerdown', () => {
            confirmOverlay.destroy();
            onConfirm();
        });

        noBtn.on('pointerdown', () => {
            confirmOverlay.destroy();
        });
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

    showMiningRate(x, y, rate, color) {
        const rateText = this.add.text(x, y, `${rate.toFixed(1)}/s`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        this.tweens.add({
            targets: rateText,
            y: y - 20,
            alpha: 0,
            duration: 2000,
            onComplete: () => rateText.destroy()
        });
    }

    // Unit Promotion System
    // Thresholds: 10, 20, 30, 50, 80, 120 spawns for levels 1-6
    // Bonuses: Lv1=+10%, Lv2=+20%, Lv3=+30%, Lv4=+40%, Lv5=+50%, Lv6=+50% (total 200%)
    getPromotionLevel(unitType) {
        const typeKey = unitType.toLowerCase();
        const spawnCount = this.unitCounts[typeKey] || 0;

        // Promotion thresholds - harder after level 3
        // Level 1-3: every 10 spawns (10, 20, 30)
        // Level 4-6: 50, 80, 120 spawns
        const thresholds = [0, 10, 20, 30, 50, 80, 120];

        for (let level = 6; level >= 1; level--) {
            if (spawnCount >= thresholds[level]) {
                return level;
            }
        }
        return 0;
    }

    getPromotionBonus(promotionLevel) {
        // Returns multiplier: 1.0, 1.1, 1.3, 1.6, 2.0, 2.5, 3.0
        const bonuses = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.5];
        let totalBonus = 0;
        for (let i = 1; i <= promotionLevel; i++) {
            totalBonus += bonuses[i];
        }
        return 1 + totalBonus;
    }

    getPromotionCostMultiplier(promotionLevel) {
        // Cost increases with promotion to balance peasant spam
        // Silver (1-3): +33% per level -> 133%, 166%, 200%
        // Gold (4-6): +66% per level -> 266%, 333%, 400%
        if (promotionLevel <= 0) return 1;
        if (promotionLevel <= 3) {
            return 1 + (promotionLevel * 0.33);
        } else {
            // Gold levels: continue from 200% with +66% per level
            return 2 + ((promotionLevel - 3) * 0.67);
        }
    }

    getPromotionBadgeInfo(promotionLevel) {
        // Returns {color: 'silver'|'gold', signs: 1-3}
        if (promotionLevel <= 0) return null;
        if (promotionLevel <= 3) {
            return { color: 'silver', signs: promotionLevel };
        } else {
            return { color: 'gold', signs: promotionLevel - 3 };
        }
    }

    checkPromotion(unitType) {
        const typeKey = unitType.toLowerCase();
        const oldLevel = this.unitPromotionLevels[typeKey];
        const newLevel = this.getPromotionLevel(unitType);

        if (newLevel > oldLevel) {
            this.unitPromotionLevels[typeKey] = newLevel;
            this.showPromotionNotification(unitType, newLevel);
            // Update the unit button badge
            this.updateUnitButtonBadge(unitType, newLevel);
            return true;
        }
        return false;
    }

    showPromotionNotification(unitType, level) {
        const badgeInfo = this.getPromotionBadgeInfo(level);
        const unitName = UNIT_TYPES[unitType].name;
        const color = badgeInfo.color === 'gold' ? '#ffd700' : '#c0c0c0';
        const signs = '▲'.repeat(badgeInfo.signs);  // Triangle chevrons

        const message = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50,
            `${unitName} PROMOTED!`, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1100);

        const badge = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, signs, {
            fontSize: '28px',
            color: color,
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(1100);

        const bonus = Math.round((this.getPromotionBonus(level) - 1) * 100);
        const bonusText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40,
            `+${bonus}% Stats!`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#4ade80',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(1100);

        // Play sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playGold();
        }

        // Animate out
        this.tweens.add({
            targets: [message, badge, bonusText],
            y: '-=30',
            alpha: 0,
            duration: 2000,
            delay: 1000,
            onComplete: () => {
                message.destroy();
                badge.destroy();
                bonusText.destroy();
            }
        });
    }

    updateUnitButtonBadge(unitType, level) {
        // Find the unit button and update its badge
        const typeKey = unitType.toLowerCase();
        const buttonIndex = ['peasant', 'archer', 'knight', 'wizard', 'giant'].indexOf(typeKey);
        if (buttonIndex >= 0 && this.unitButtons && this.unitButtons[buttonIndex]) {
            this.unitButtons[buttonIndex].setPromotionLevel(level);
        }
    }
}
