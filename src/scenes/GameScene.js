// Game Scene - Main gameplay (Survival Mode) with resource mining and multi-directional enemies
class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameScene' });
    }

    init(data) {
        // Receive hero selection from HeroSelectScene
        this.heroKey = data?.heroKey || 'DRUID';  // Default to Druid if not selected
        this.hero = HERO_TYPES[this.heroKey];
    }

    create() {
        // Check session validity before starting game (logged-in users only)
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn()) {
            if (!supabaseClient.hasValidLocalSession()) {
                // Session wasn't validated in MenuScene - validate now
                this.validateSessionAndStart();
                return;
            }
        }

        // Session valid or guest - proceed with game
        this.initializeGame();
    }

    // Validate session and start game if valid
    async validateSessionAndStart() {
        try {
            const validation = await supabaseClient.validateSession();

            if (validation.valid || validation.canAutoTakeover) {
                // Session valid or can auto-takeover - start game
                if (validation.canAutoTakeover) {
                    await supabaseClient.takeoverSession();
                }
                this.initializeGame();
            } else if (validation.reason === 'session_conflict') {
                // Show conflict dialog
                const choice = await SessionUI.showConflictDialog(this);
                if (choice === 'takeover') {
                    await supabaseClient.takeoverSession();
                    this.initializeGame();
                } else {
                    // Return to menu
                    this.scene.start('MenuScene');
                }
            } else {
                // Unknown state - return to menu
                this.scene.start('MenuScene');
            }
        } catch (error) {
            console.error('Session validation error in GameScene:', error);
            // On error, let them play anyway
            this.initializeGame();
        }
    }

    // Initialize game (extracted from create)
    initializeGame() {
        this.gameInitialized = true; // Flag for update() guard

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
        this.activeInteraction = null; // Prevents multi-touch exploitation (iPad)
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
            horseman: 0
        };

        // Unit promotion levels (calculated from spawn counts)
        // Level 0: 0-9 spawns, Level 1: 10-19, Level 2: 20-29, etc up to Level 6
        this.unitPromotionLevels = {
            peasant: 0,
            archer: 0,
            horseman: 0
        };

        // Track first spawn of each unit type this battle (for research cost)
        this.firstSpawnDone = {
            peasant: false,
            archer: false,
            horseman: false
        };

        // Reinforcements system
        this.reinforcementTimer = 0; // Current progress (0 to 120000ms = 2 min)
        this.reinforcementCooldown = 120000; // 2 minutes in ms
        this.reinforcementReady = false;

        // Castle emergency (one-time per battle when HP < 25%)
        this.castleEmergencyUsed = false;
        this.castleEmergencyActive = false;

        // Hero ability state (unlocks at wave 20, recharges every 2 minutes)
        this.heroAbilityUnlocked = false;
        this.heroAbilityReady = false;
        this.heroAbilityActive = false;  // For Warlord's timed buff
        this.heroAbilityTimer = 0;
        this.heroAbilityCooldown = 120000;  // 2 minutes in ms

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

        // Create hero portrait below castle
        this.createHeroPortrait();

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

        // Periodic session validation (check every 30s if another device took over)
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn()) {
            this.sessionCheckTimer = this.time.addEvent({
                delay: 30000,
                callback: this.checkSessionStillValid,
                callbackScope: this,
                loop: true
            });
        }
    }

    // Check if session is still valid (called periodically)
    async checkSessionStillValid() {
        if (!supabaseClient.isLoggedIn() || !supabaseClient.hasValidLocalSession()) return;

        const validation = await supabaseClient.validateSession();

        if (validation.reason === 'session_conflict' || validation.reason === 'session_expired') {
            // Another device took over - pause game and show expired dialog
            if (this.sessionCheckTimer) {
                this.sessionCheckTimer.remove();
            }
            this.isPaused = true;

            console.log('Session taken over by another device during game');
            await SessionUI.showExpiredDialog(this);

            // Log out and return to menu
            await supabaseClient.logout();
            sessionStorage.removeItem('battlePanicSessionId');
            this.scene.start('MenuScene');
        }
    }

    // Sync to cloud and validate session after battle ends
    async syncAndValidateAfterBattle() {
        try {
            // First sync the battle results to cloud
            const syncResult = await saveSystem.uploadToCloud();
            if (syncResult.success) {
                console.log('Auto-synced to cloud after battle');
            }

            // Then validate session
            const validation = await supabaseClient.validateSession();
            if (validation.reason === 'session_conflict' || validation.reason === 'session_expired') {
                console.log('Session taken over during battle');
                // Don't interrupt game over screen, just log out silently
                // User will see login screen when they return to menu
                await supabaseClient.logout();
                sessionStorage.removeItem('battlePanicSessionId');
            }
        } catch (err) {
            console.warn('Post-battle sync/validation failed:', err);
        }
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

        // Large interactive area for iPad touch (invisible rectangle)
        const hitArea = this.add.rectangle(0, 0, 200, 200, 0x000000, 0);
        hitArea.setInteractive({});
        container.add(hitArea);

        // Glowing frame (shows when hovering) - matches larger hit area
        const glowRing = this.add.rectangle(0, 0, 210, 210, mainColor, 0);
        container.add(glowRing);
        container.glowRing = glowRing;

        if (isGold) {
            // GOLD ORE PILE - rocky pile with gold veins and nuggets
            // Base rocks (gray stone)
            container.add(this.add.rectangle(0, 30, 80, 25, 0x555566));
            container.add(this.add.rectangle(-20, 28, 30, 20, 0x666677));
            container.add(this.add.rectangle(22, 26, 28, 22, 0x5A5A6B));
            container.add(this.add.rectangle(0, 35, 70, 15, 0x4A4A5B));

            // Middle layer rocks
            container.add(this.add.rectangle(-15, 15, 35, 25, 0x606071));
            container.add(this.add.rectangle(18, 12, 32, 28, 0x555566));
            container.add(this.add.rectangle(0, 18, 28, 22, 0x6A6A7B));

            // Top rocks
            container.add(this.add.rectangle(-8, -2, 26, 22, 0x5A5A6B));
            container.add(this.add.rectangle(12, 0, 24, 20, 0x606071));
            container.add(this.add.rectangle(0, -12, 20, 16, 0x666677));

            // Gold veins on rocks (bright gold streaks)
            container.add(this.add.rectangle(-18, 22, 18, 4, 0xFFD700));
            container.add(this.add.rectangle(20, 18, 14, 3, 0xDAA520));
            container.add(this.add.rectangle(-5, 8, 12, 4, 0xFFE855));
            container.add(this.add.rectangle(15, -2, 10, 3, 0xFFD700));
            container.add(this.add.rectangle(-12, -5, 8, 4, 0xDAA520));

            // Gold nuggets scattered on pile
            const nuggetPositions = [
                {x: -25, y: 20, s: 10}, {x: -8, y: 25, s: 8}, {x: 28, y: 22, s: 9},
                {x: -18, y: 5, s: 11}, {x: 8, y: 8, s: 10}, {x: 22, y: 3, s: 8},
                {x: -5, y: -8, s: 9}, {x: 10, y: -5, s: 7}, {x: -15, y: 12, s: 8}
            ];
            nuggetPositions.forEach((nug) => {
                // Nugget body
                container.add(this.add.rectangle(nug.x, nug.y, nug.s, nug.s * 0.8, 0xFFD700));
                // Nugget highlight
                container.add(this.add.rectangle(nug.x - 2, nug.y - 2, nug.s * 0.4, nug.s * 0.4, 0xFFE855));
            });

            // Sparkle effects on gold
            for (let i = 0; i < 5; i++) {
                const sparkle = this.add.rectangle(
                    Phaser.Math.Between(-30, 30),
                    Phaser.Math.Between(-15, 25),
                    4, 4, 0xFFFFFF
                );
                container.add(sparkle);
                this.tweens.add({
                    targets: sparkle,
                    alpha: 0,
                    scaleX: 2,
                    scaleY: 2,
                    duration: 600 + Math.random() * 400,
                    yoyo: true,
                    repeat: -1,
                    delay: Math.random() * 600
                });
            }

        } else {
            // STYLIZED TREE with lumber!
            // Tree trunk
            container.add(this.add.rectangle(0, 25, 24, 50, 0x6B4423));
            container.add(this.add.rectangle(-4, 25, 8, 48, 0x7B5433)); // highlight
            container.add(this.add.rectangle(0, 48, 32, 8, 0x5B3413)); // base/roots

            // Tree foliage (layered for depth) - bright green
            container.add(this.add.rectangle(0, -15, 60, 30, 0x2D8B2D));
            container.add(this.add.rectangle(0, -12, 54, 24, 0x3DA83D));
            container.add(this.add.rectangle(0, -30, 48, 26, 0x2D8B2D));
            container.add(this.add.rectangle(0, -28, 42, 20, 0x4DB84D));
            container.add(this.add.rectangle(0, -42, 32, 20, 0x3DA83D));
            container.add(this.add.rectangle(0, -40, 26, 14, 0x5DC85D));
            container.add(this.add.rectangle(0, -52, 18, 14, 0x4DB84D));
            container.add(this.add.rectangle(0, -50, 12, 10, 0x6DD86D));

            // Leaf highlights
            container.add(this.add.rectangle(-15, -20, 10, 8, 0x6DE86D, 0.7));
            container.add(this.add.rectangle(10, -35, 8, 6, 0x7DF87D, 0.7));

            // Stacked logs beside tree
            // Bottom logs
            container.add(this.add.rectangle(-35, 35, 30, 12, 0x8B5A3A));
            container.add(this.add.rectangle(-35, 35, 26, 8, 0x9B6A4A));
            container.add(this.add.rectangle(-48, 35, 6, 12, 0xC49564)); // end

            container.add(this.add.rectangle(-32, 22, 28, 11, 0x7B4A2A));
            container.add(this.add.rectangle(-32, 22, 24, 7, 0x8B5A3A));
            container.add(this.add.rectangle(-44, 22, 6, 11, 0xB48554)); // end

            container.add(this.add.rectangle(-30, 10, 24, 10, 0x6B3A1A));
            container.add(this.add.rectangle(-30, 10, 20, 6, 0x7B4A2A));
            container.add(this.add.rectangle(-40, 10, 6, 10, 0xA47544)); // end
        }

        // No spinner - just axe cursor and glow

        // Label with instruction
        // Gold mine: label below (y: 52), Wood mine: label above (y: -55) since it's near screen bottom
        const labelY = isGold ? 52 : -55;
        const label = this.add.text(0, labelY, `HOVER TO MINE`, {
            fontSize: '15px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: isGold ? '#ffd700' : '#D4A574',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        container.add(label);
        container.mineLabel = label;  // Store reference to hide when mining

        // Hover events - with single interaction lock (prevents multi-touch on iPad)
        hitArea.on('pointerover', (pointer) => {
            // Block if another interaction is active
            if (this.activeInteraction && this.activeInteraction !== container) return;
            this.activeInteraction = container;
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
            // Release interaction lock
            if (this.activeInteraction === container) {
                this.activeInteraction = null;
            }
        });

        container.isHovering = false;
        container.mineType = type;
        container.setDepth(100);
        container.setScale(1.5);  // 1.5x scale for iPad touch
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

        // Store health upgrade level for wave HP bonus
        this.castleHealthLevel = castleUpgrades.health || 1;

        // Store gold income bonus for mining
        this.goldIncomeLevel = castleUpgrades.goldIncome || 1;

        // Set castle level for display
        this.playerCastle.setLevel(this.castleLevel);

        // Create castle upgrade hover zone with spinner
        this.createCastleUpgradeZone();
    }

    createHeroPortrait() {
        const heroX = CASTLE_CONFIG.playerX;
        const heroY = 530;  // Below castle

        // Hero portrait container
        this.heroPortraitContainer = this.add.container(heroX, heroY);
        this.heroPortraitContainer.setDepth(100);

        // Portrait background (frame) - make it a circle for ability button look
        const frameBg = this.add.circle(0, 0, 35, 0x1a1a2e);
        frameBg.setStrokeStyle(3, this.hero.color);
        this.heroPortraitContainer.add(frameBg);
        this.heroPortraitBg = frameBg;

        // Draw pixel art hero portrait
        const heroArt = this.add.graphics();
        this.drawPixelArtHero(heroArt, this.heroKey, 0, 0, 48);
        this.heroPortraitContainer.add(heroArt);

        // Pie timer spinner overlay (on top of hero art)
        this.heroAbilitySpinner = this.add.graphics();
        this.heroPortraitContainer.add(this.heroAbilitySpinner);

        // Lock icon (shown until ability unlocks at wave 20) - bottom-right corner, larger for mobile
        this.heroAbilityLock = this.add.text(22, 22, '🔒', {
            fontSize: '28px'
        }).setOrigin(0.5);
        this.heroPortraitContainer.add(this.heroAbilityLock);

        // Hero name below portrait
        const nameText = this.add.text(0, 50, this.hero.name, {
            fontSize: '12px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.heroPortraitContainer.add(nameText);

        // Make interactive for ability activation
        frameBg.setInteractive({ useHandCursor: true });

        frameBg.on('pointerdown', () => {
            this.activateHeroAbility();
        });

        frameBg.on('pointerover', () => {
            if (this.heroAbilityReady) {
                frameBg.setFillStyle(0x2a3a4a);
            }
        });

        frameBg.on('pointerout', () => {
            frameBg.setFillStyle(0x1a1a2e);
        });
    }

    // Draw pixel-art hero portrait
    drawPixelArtHero(graphics, heroKey, centerX, centerY, size) {
        const px = size / 16;  // Pixel size for 16x16 grid
        const startX = centerX - size / 2;
        const startY = centerY - size / 2;

        // Helper to draw a pixel
        const drawPx = (x, y, color) => {
            graphics.fillStyle(color, 1);
            graphics.fillRect(startX + x * px, startY + y * px, px, px);
        };

        if (heroKey === 'DRUID') {
            // Druid - Green hooded nature mage with leafy details
            const skinColor = 0xd4a574;      // Tan skin
            const hoodColor = 0x228B22;       // Forest green hood
            const hoodDark = 0x1a6b1a;        // Darker green for shadow
            const hoodLight = 0x32cd32;       // Lighter green highlight
            const eyeColor = 0x00ff00;        // Glowing green eyes
            const beardColor = 0x654321;      // Brown beard
            const leafColor = 0x90ee90;       // Light green for leaves

            // Hood top (rows 1-3)
            [5,6,7,8,9,10].forEach(x => drawPx(x, 1, hoodColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 2, hoodColor));
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 3, hoodColor));

            // Hood sides and face area (rows 4-7)
            [2,3,4].forEach(x => drawPx(x, 4, hoodColor));
            [11,12,13].forEach(x => drawPx(x, 4, hoodColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 4, hoodDark)); // Shadow under hood

            [2,3].forEach(x => drawPx(x, 5, hoodColor));
            [12,13].forEach(x => drawPx(x, 5, hoodColor));
            [4,5].forEach(x => drawPx(x, 5, hoodDark));
            [10,11].forEach(x => drawPx(x, 5, hoodDark));
            [6,7,8,9].forEach(x => drawPx(x, 5, skinColor)); // Forehead

            [2,3].forEach(x => drawPx(x, 6, hoodColor));
            [12,13].forEach(x => drawPx(x, 6, hoodColor));
            [4].forEach(x => drawPx(x, 6, hoodDark));
            [11].forEach(x => drawPx(x, 6, hoodDark));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 6, skinColor)); // Face
            drawPx(6, 6, eyeColor); // Left eye
            drawPx(9, 6, eyeColor); // Right eye

            // Face and hood (rows 7-9)
            [2,3].forEach(x => drawPx(x, 7, hoodColor));
            [12,13].forEach(x => drawPx(x, 7, hoodColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 7, skinColor));

            [2,3].forEach(x => drawPx(x, 8, hoodColor));
            [12,13].forEach(x => drawPx(x, 8, hoodColor));
            [4,5].forEach(x => drawPx(x, 8, skinColor));
            [10,11].forEach(x => drawPx(x, 8, skinColor));
            [6,7,8,9].forEach(x => drawPx(x, 8, beardColor)); // Beard

            // Beard and robe (rows 9-11)
            [3,4].forEach(x => drawPx(x, 9, hoodColor));
            [11,12].forEach(x => drawPx(x, 9, hoodColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 9, beardColor));

            [4,5].forEach(x => drawPx(x, 10, hoodColor));
            [10,11].forEach(x => drawPx(x, 10, hoodColor));
            [6,7,8,9].forEach(x => drawPx(x, 10, beardColor));

            // Robe/shoulders (rows 11-14)
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 11, hoodColor));
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 12, hoodColor));
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 13, hoodColor));
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 14, hoodColor));

            // Leaf decorations
            drawPx(4, 3, leafColor);
            drawPx(11, 3, leafColor);
            drawPx(3, 11, leafColor);
            drawPx(12, 11, leafColor);
            drawPx(7, 12, hoodLight);
            drawPx(8, 12, hoodLight);

        } else if (heroKey === 'WARLORD') {
            // Warlord - Red armored warrior with helmet
            const skinColor = 0xd4a574;       // Tan skin
            const helmetColor = 0xb22222;     // Firebrick red
            const helmetDark = 0x8b0000;      // Dark red shadow
            const helmetLight = 0xff4444;     // Light red highlight
            const steelColor = 0x808080;      // Gray steel
            const steelLight = 0xc0c0c0;      // Light steel
            const eyeColor = 0x000000;        // Dark eyes
            const scarColor = 0x8b4513;       // Scar

            // Helmet crest (rows 0-2)
            [7,8].forEach(x => drawPx(x, 0, helmetLight));
            [6,7,8,9].forEach(x => drawPx(x, 1, helmetColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 2, helmetColor));

            // Helmet main (rows 3-5)
            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 3, helmetColor));
            [2,3].forEach(x => drawPx(x, 3, helmetDark));
            [12,13].forEach(x => drawPx(x, 3, helmetDark));

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 4, helmetColor));
            drawPx(3, 4, steelColor); // Steel band
            drawPx(12, 4, steelColor);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 5, helmetColor));
            [4,5,6].forEach(x => drawPx(x, 5, steelColor)); // Eye slit frame
            [9,10,11].forEach(x => drawPx(x, 5, steelColor));

            // Face through helmet visor (rows 6-8)
            [2,3].forEach(x => drawPx(x, 6, helmetColor));
            [12,13].forEach(x => drawPx(x, 6, helmetColor));
            [4].forEach(x => drawPx(x, 6, steelColor));
            [11].forEach(x => drawPx(x, 6, steelColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 6, skinColor)); // Face visible
            drawPx(6, 6, eyeColor); // Left eye
            drawPx(9, 6, eyeColor); // Right eye

            [2,3].forEach(x => drawPx(x, 7, helmetColor));
            [12,13].forEach(x => drawPx(x, 7, helmetColor));
            [4].forEach(x => drawPx(x, 7, steelColor));
            [11].forEach(x => drawPx(x, 7, steelColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 7, skinColor));
            drawPx(10, 7, scarColor); // Battle scar

            [2,3].forEach(x => drawPx(x, 8, helmetColor));
            [12,13].forEach(x => drawPx(x, 8, helmetColor));
            [4,5].forEach(x => drawPx(x, 8, steelColor));
            [10,11].forEach(x => drawPx(x, 8, steelColor));
            [6,7,8,9].forEach(x => drawPx(x, 8, skinColor));

            // Chin guard (rows 9-10)
            [3,4,5].forEach(x => drawPx(x, 9, steelColor));
            [10,11,12].forEach(x => drawPx(x, 9, steelColor));
            [6,7,8,9].forEach(x => drawPx(x, 9, helmetDark));

            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 10, steelColor));

            // Armor shoulders (rows 11-14)
            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 11, helmetColor));
            drawPx(4, 11, steelLight); // Shoulder plate shine
            drawPx(11, 11, steelLight);

            [1,2,3,4].forEach(x => drawPx(x, 12, helmetColor));
            [11,12,13,14].forEach(x => drawPx(x, 12, helmetColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 12, helmetDark)); // Chest

            [1,2,3].forEach(x => drawPx(x, 13, helmetColor));
            [12,13,14].forEach(x => drawPx(x, 13, helmetColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 13, helmetDark));
            drawPx(7, 13, steelColor); // Belt buckle
            drawPx(8, 13, steelColor);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 14, helmetDark));

        } else if (heroKey === 'ALCHEMIST') {
            // Alchemist - Gold-robed scholar with goggles
            const skinColor = 0xd4a574;       // Tan skin
            const robeColor = 0xffd700;       // Gold
            const robeDark = 0xdaa520;        // Darker gold
            const robeLight = 0xffec8b;       // Light gold
            const goggleColor = 0x4169e1;     // Royal blue goggles
            const goggleFrame = 0x696969;     // Gray frame
            const hairColor = 0x2f2f2f;       // Dark hair
            const potionColor = 0x00ff7f;     // Green potion glow

            // Hair/head top (rows 1-3)
            [6,7,8,9].forEach(x => drawPx(x, 1, hairColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 2, hairColor));
            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 3, hairColor));

            // Forehead and goggles (rows 4-6)
            [3,4].forEach(x => drawPx(x, 4, hairColor));
            [11,12].forEach(x => drawPx(x, 4, hairColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 4, skinColor));

            [3].forEach(x => drawPx(x, 5, hairColor));
            [12].forEach(x => drawPx(x, 5, hairColor));
            [4,5].forEach(x => drawPx(x, 5, goggleFrame)); // Goggle frame left
            [10,11].forEach(x => drawPx(x, 5, goggleFrame)); // Goggle frame right
            [6,7,8,9].forEach(x => drawPx(x, 5, skinColor));

            [3].forEach(x => drawPx(x, 6, hairColor));
            [12].forEach(x => drawPx(x, 6, hairColor));
            [4].forEach(x => drawPx(x, 6, goggleFrame));
            [5,6].forEach(x => drawPx(x, 6, goggleColor)); // Left goggle lens
            [7,8].forEach(x => drawPx(x, 6, goggleFrame)); // Bridge
            [9,10].forEach(x => drawPx(x, 6, goggleColor)); // Right goggle lens
            [11].forEach(x => drawPx(x, 6, goggleFrame));

            // Lower face (rows 7-9)
            [3,4].forEach(x => drawPx(x, 7, skinColor));
            [11,12].forEach(x => drawPx(x, 7, skinColor));
            [5,6,7,8,9,10].forEach(x => drawPx(x, 7, skinColor));

            [4,5,6,7,8,9,10,11].forEach(x => drawPx(x, 8, skinColor));
            drawPx(7, 8, 0xcc8866); // Nose shadow

            [5,6,7,8,9,10].forEach(x => drawPx(x, 9, skinColor));
            drawPx(6, 9, 0x000000); // Slight smile
            drawPx(9, 9, 0x000000);

            // Collar and robe (rows 10-14)
            [4,5].forEach(x => drawPx(x, 10, robeColor));
            [10,11].forEach(x => drawPx(x, 10, robeColor));
            [6,7,8,9].forEach(x => drawPx(x, 10, skinColor)); // Neck

            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 11, robeColor));
            drawPx(7, 11, robeDark); // Collar V
            drawPx(8, 11, robeDark);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 12, robeColor));
            drawPx(6, 12, robeLight); // Highlight
            drawPx(9, 12, robeLight);

            [2,3,4,5,6,7,8,9,10,11,12,13].forEach(x => drawPx(x, 13, robeColor));
            drawPx(4, 13, potionColor); // Potion vial glow
            drawPx(11, 13, potionColor);

            [3,4,5,6,7,8,9,10,11,12].forEach(x => drawPx(x, 14, robeDark));

            // Goggle shine
            drawPx(5, 6, 0x87ceeb); // Light reflection
            drawPx(9, 6, 0x87ceeb);
        }
    }

    activateHeroAbility() {
        // Check if ability is unlocked and ready
        if (!this.heroAbilityUnlocked || !this.heroAbilityReady) {
            // Just shake the icon instead of showing message repeatedly
            if (this.heroPortraitContainer && !this.heroPortraitShaking) {
                this.heroPortraitShaking = true;
                this.tweens.add({
                    targets: this.heroPortraitContainer,
                    x: this.heroPortraitContainer.x + 5,
                    duration: 50,
                    yoyo: true,
                    repeat: 3,
                    onComplete: () => {
                        this.heroPortraitShaking = false;
                    }
                });
            }
            return;
        }

        // Different abilities for different heroes
        if (this.heroKey === 'WARLORD') {
            // Warlord: instant buff to all units
            this.activateWarlordAbility();
        } else {
            // Druid/Alchemist: click-to-target ability
            this.startAbilityTargeting();
        }
    }

    startAbilityTargeting() {
        // Enter targeting mode
        this.heroAbilityTargeting = true;
        this.showMessage('Click on the battlefield to use ' + this.hero.abilityName, '#ffaa00');

        // Change cursor style
        this.input.setDefaultCursor('crosshair');

        // Listen for click
        this.input.once('pointerdown', (pointer) => {
            if (this.heroAbilityTargeting) {
                this.executeTargetedAbility(pointer.x, pointer.y);
            }
        });
    }

    executeTargetedAbility(x, y) {
        this.heroAbilityTargeting = false;
        this.heroAbilityReady = false;
        this.heroAbilityTimer = 0;  // Reset cooldown timer
        this.input.setDefaultCursor('default');
        this.stopHeroAbilityGlow();  // Stop glow during cooldown

        // Create visual effect and deal damage
        this.createHeroAbilityEffect(x, y);

        // Play sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playHeroAbility();
        }

        this.showMessage(this.hero.abilityName + '!', '#ffaa00');
    }

    createHeroAbilityEffect(x, y) {
        const radius = this.hero.abilityRadius;

        // Blue circle effect - visible and clear
        const circle = this.add.circle(x, y, radius, 0x4488ff, 0.4);
        circle.setDepth(1600);
        circle.setStrokeStyle(4, 0x66aaff, 1);

        // Pulse effect then fade
        this.tweens.add({
            targets: circle,
            alpha: 0.6,
            duration: 150,
            yoyo: true,
            repeat: 1,
            onComplete: () => {
                this.tweens.add({
                    targets: circle,
                    alpha: 0,
                    duration: 300,
                    onComplete: () => circle.destroy()
                });
            }
        });

        // Blue particles
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const particle = this.add.circle(x + Math.cos(angle) * radius * 0.7, y + Math.sin(angle) * radius * 0.7, 6, 0x66aaff);
            particle.setDepth(1601);

            this.tweens.add({
                targets: particle,
                alpha: 0,
                scale: 0.3,
                duration: 400,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Deal damage to enemies in radius
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (!enemy.active || enemy.isDead) return;

                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance <= radius) {
                    enemy.takeDamage(this.hero.abilityDamage);
                }
            });
        }
    }

    activateWarlordAbility() {
        this.heroAbilityReady = false;
        this.heroAbilityTimer = 0;  // Reset cooldown timer
        this.heroAbilityActive = true;
        this.stopHeroAbilityGlow();  // Stop glow during cooldown

        // Visual effect - red pulse on all units
        this.units.getChildren().forEach(unit => {
            if (!unit.active || unit.isDead) return;

            // Flash effect
            const flash = this.add.circle(unit.x, unit.y, 20, 0xff4444, 0.6);
            flash.setDepth(1500);
            this.tweens.add({
                targets: flash,
                scale: 2,
                alpha: 0,
                duration: 300,
                onComplete: () => flash.destroy()
            });
        });

        // Play sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playHeroAbility();
        }

        this.showMessage('BATTLE CHARGE! +50% Speed, +25% Damage for 8s', '#ff4444');

        // End ability after duration
        this.time.delayedCall(this.hero.abilityDuration, () => {
            this.heroAbilityActive = false;
            this.showMessage('Battle Charge ended', '#aaaaaa');
        });
    }

    checkHeroAbilityUnlock() {
        // Check if we should unlock the ability
        if (!this.heroAbilityUnlocked) {
            const waveInfo = this.waveSystem.getWaveInfo();
            if (waveInfo.currentWave >= this.hero.abilityWave) {
                this.heroAbilityUnlocked = true;
                this.heroAbilityReady = true;
                this.heroAbilityTimer = this.heroAbilityCooldown;  // Start ready

                // Hide lock icon
                if (this.heroAbilityLock) {
                    this.heroAbilityLock.setVisible(false);
                }

                this.showMessage(this.hero.abilityName + ' UNLOCKED!', '#ffaa00');
                this.startHeroAbilityGlow();
            }
        }
    }

    updateHeroAbilityTimer(delta) {
        // Skip if not unlocked
        if (!this.heroAbilityUnlocked) return;

        // Update timer if not ready
        if (!this.heroAbilityReady) {
            this.heroAbilityTimer += delta;

            if (this.heroAbilityTimer >= this.heroAbilityCooldown) {
                this.heroAbilityTimer = this.heroAbilityCooldown;
                this.heroAbilityReady = true;
                this.startHeroAbilityGlow();
            }
        }

        // Update visual spinner
        this.drawHeroAbilitySpinner();
    }

    drawHeroAbilitySpinner() {
        if (!this.heroAbilitySpinner) return;

        const graphics = this.heroAbilitySpinner;
        graphics.clear();

        // Don't show spinner until ability is unlocked
        if (!this.heroAbilityUnlocked) return;

        const progress = this.heroAbilityTimer / this.heroAbilityCooldown;
        const radius = 33;  // Match hero portrait circle

        // Pie timer effect: draw remaining cooldown as a filled pie slice
        // When charging: dark overlay shrinks from full circle to nothing
        if (progress < 1) {
            const remainingProgress = 1 - progress;
            const startAngle = -Math.PI / 2;  // Start from top
            const endAngle = startAngle + remainingProgress * Math.PI * 2;

            // Draw dark overlay pie slice (remaining cooldown)
            graphics.fillStyle(0x000000, 0.6);
            graphics.beginPath();
            graphics.moveTo(0, 0);
            graphics.arc(0, 0, radius, startAngle, endAngle, false);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    startHeroAbilityGlow() {
        if (!this.heroPortraitContainer) return;

        // Create glow effect behind the hero portrait
        if (this.heroAbilityGlow) {
            this.heroAbilityGlow.destroy();
        }

        this.heroAbilityGlow = this.add.graphics();
        this.heroAbilityGlow.setPosition(this.heroPortraitContainer.x, this.heroPortraitContainer.y);
        this.heroAbilityGlow.setDepth(99);  // Just behind the portrait

        // Draw glow circle
        this.heroAbilityGlow.fillStyle(this.hero.color, 0.5);
        this.heroAbilityGlow.fillCircle(0, 0, 45);

        // Pulsing animation
        this.tweens.add({
            targets: this.heroAbilityGlow,
            alpha: 0.2,
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    stopHeroAbilityGlow() {
        if (this.heroAbilityGlow) {
            this.tweens.killTweensOf(this.heroAbilityGlow);
            this.heroAbilityGlow.destroy();
            this.heroAbilityGlow = null;
        }
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
        // Position updated dynamically based on castle scale
        this.castleSpinnerContainer = this.add.container(0, -150);
        this.castleUpgradeZone.add(this.castleSpinnerContainer);
        this.castleSpinnerContainer.setVisible(false);
        this.updateCastleSpinnerPosition(); // Set initial position

        // Spinner background - circular
        const spinnerRadius = 28;
        this.castleSpinnerContainer.add(this.add.circle(0, 0, 32, 0x2A3A4A, 0.85));
        this.castleSpinnerContainer.add(this.add.circle(0, 0, 29, 0x3A4A5A, 0.9));

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

        // Hover events - with single interaction lock
        hitArea.on('pointerover', () => {
            // Block if another interaction is active
            if (this.activeInteraction && this.activeInteraction !== 'castle') return;

            // Don't show spinner if at max level and no repair needed
            const currentLevel = this.castleLevel || 1;
            const effectiveMaxLevel = this.getEffectiveMaxCastleLevel();
            const isMaxLevel = currentLevel >= effectiveMaxLevel;
            if (isMaxLevel && !this.needsRepair()) return;

            this.activeInteraction = 'castle';
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
            // Release interaction lock
            if (this.activeInteraction === 'castle') {
                this.activeInteraction = null;
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

    getCastleUpgradeTime(level) {
        // Formula: (level/10) + 5 seconds
        return ((level / 10) + 5) * 1000; // Convert to ms
    }

    getEffectiveMaxCastleLevel() {
        // Castle extension upgrade adds +5 max level per upgrade level
        const castleExtension = this.saveData.specialUpgrades?.castleExtension || 0;
        return CASTLE_CONFIG.maxLevel + (castleExtension * 5);
    }

    needsRepair() {
        // Check if castle or fence needs repair
        const castle = this.playerCastle;
        if (!castle) return false;

        const castleNeedsFix = castle.currentHealth < castle.maxHealth;
        const fenceMax = castle.fenceMaxHealth || 0;
        const fenceHP = castle.fenceCurrentHealth || 0;
        const fenceNeedsFix = fenceMax > 0 && fenceHP < fenceMax;

        return castleNeedsFix || fenceNeedsFix;
    }

    canRepair() {
        // Can't repair if castle emergency was used (no repair for rest of battle)
        if (this.castleEmergencyUsed) return false;

        // Can't repair if enemies are too close to castle (prevents fence exploit)
        if (!this.enemies) return true;

        const castleX = this.playerCastle.x;
        const fenceX = castleX + 150; // Fence position

        for (const enemy of this.enemies.getChildren()) {
            if (enemy.active && !enemy.isDead && enemy.x < fenceX + 50) {
                // Enemy is at or past where fence would be
                return false;
            }
        }
        return true;
    }

    getRepairCost() {
        // Tiered repair cost based on damage state (at max level)
        const castle = this.playerCastle;
        if (!castle) return { gold: 30, wood: 50 };

        const castleHP = castle.currentHealth;
        const fenceHP = castle.fenceCurrentHealth || 0;
        const fenceMax = castle.fenceMaxHealth || 0;
        const fenceDestroyed = fenceMax > 0 && fenceHP <= 0;
        const fenceDamaged = fenceMax > 0 && fenceHP < fenceMax && fenceHP > 0;

        // Castle HP under 50 → expensive repair
        if (castleHP < 50) {
            return { gold: 200, wood: 150 };
        }
        // Fence destroyed → medium repair
        if (fenceDestroyed) {
            return { gold: 100, wood: 100 };
        }
        // Only fence damaged → cheap repair
        if (fenceDamaged) {
            return { gold: 30, wood: 50 };
        }
        // Everything full - no repair needed
        return { gold: 0, wood: 0 };
    }

    updateCastleSpinnerPosition() {
        // Calculate castle scale based on level (matches Castle.setLevel logic)
        // Visual scaling capped at level 20
        const level = this.castleLevel || 1;
        const visualLevel = Math.min(level, 20);
        const minScale = 0.6;
        const maxScale = 1.4;
        const scaleProgress = (visualLevel - 1) / 19; // 19 = 20 - 1
        const castleScale = minScale + (maxScale - minScale) * scaleProgress;

        // Spinner should be right above the castle (closer positioning)
        const baseTopY = -80;
        const scaledTopY = baseTopY * castleScale;
        const spinnerY = scaledTopY - 10; // Small padding above castle

        if (this.castleSpinnerContainer) {
            this.castleSpinnerContainer.setY(spinnerY);
        }
    }

    updateCastleUpgrade(delta) {
        if (this.isPaused) return;

        const currentLevel = this.castleLevel || 1;
        const effectiveMaxLevel = this.getEffectiveMaxCastleLevel();
        const isMaxLevel = currentLevel >= effectiveMaxLevel;
        const needsRepair = isMaxLevel && this.needsRepair();
        const repairBlocked = isMaxLevel && needsRepair && !this.canRepair();

        // At max level with no damage, hide repair option
        if (isMaxLevel && !needsRepair) {
            this.castleUpgradeCostText.setText('MAX');
            this.castleCostGlow.setText('MAX');
            this.castleUpgradeCostText.setStyle({ color: '#ffd700' });
            this.castleCostGlow.setAlpha(0);
            this.drawCastleSpinner();
            return;
        }

        // Repair blocked - enemies too close
        if (repairBlocked) {
            this.castleUpgradeCostText.setText('CLEAR ENEMIES');
            this.castleCostGlow.setText('CLEAR ENEMIES');
            this.castleUpgradeCostText.setStyle({ color: '#ff6666' });
            this.castleCostGlow.setAlpha(0);
            this.drawCastleSpinner();
            return;
        }

        // At max level, allow repair with tiered cost based on damage
        const cost = isMaxLevel
            ? this.getRepairCost()
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
                // Castle upgrade: 5 seconds base, +10% per level
                const upgradeTime = this.getCastleUpgradeTime(currentLevel);
                const progressPerFrame = (this.castleUpgradeTarget / upgradeTime) * delta;
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
        const progress = this.castleUpgradeProgress / this.castleUpgradeTarget;

        graphics.clear();

        // Pie timer effect: dark overlay shrinks clockwise as progress fills
        if (progress < 1) {
            const remainingProgress = 1 - progress;
            const startAngle = -Math.PI / 2;  // Start from top
            const endAngle = startAngle - remainingProgress * Math.PI * 2;  // Go clockwise (negative)

            // Draw dark overlay pie slice (remaining progress)
            graphics.fillStyle(0x000000, 0.6);
            graphics.beginPath();
            graphics.moveTo(0, this.castleSpinnerY);
            graphics.arc(0, this.castleSpinnerY, this.castleSpinnerRadius, startAngle, endAngle, true);  // true = anticlockwise draw
            graphics.closePath();
            graphics.fillPath();
        }

        if (this.castleUpgradeProgress > 0) {
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
        const effectiveMaxLevel = this.getEffectiveMaxCastleLevel();
        const isMaxLevel = currentLevel >= effectiveMaxLevel;

        // Can't repair if enemies are too close (prevents fence exploit)
        if (isMaxLevel && !this.canRepair()) {
            this.showMessage('Clear enemies first!', '#ff6666');
            return;
        }

        // Cost depends on whether upgrading or repairing
        const cost = isMaxLevel
            ? this.getRepairCost()
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

            // Repair or recreate fence if level >= 3
            if (this.playerCastle.level >= 3) {
                if (this.playerCastle.hasFence && this.playerCastle.fenceContainer) {
                    // Fence exists - just restore HP
                    this.playerCastle.fenceCurrentHealth = this.playerCastle.fenceMaxHealth;
                    this.playerCastle.updateFenceHealthBar();
                } else {
                    // Fence was destroyed - recreate it
                    // HP progression: 100-500 for levels 3-10, +100 per level beyond 10
                    const fenceHPTable = { 3: 100, 4: 150, 5: 200, 6: 275, 7: 325, 8: 400, 9: 450, 10: 500 };
                    const level = this.playerCastle.level;
                    const baseFenceHP = level <= 10 ? (fenceHPTable[level] || 500) : 500;
                    const extraFenceHP = level > 10 ? (level - 10) * 100 : 0;
                    this.playerCastle.hasFence = true;
                    this.playerCastle.fenceMaxHealth = baseFenceHP + extraFenceHP;
                    this.playerCastle.fenceCurrentHealth = this.playerCastle.fenceMaxHealth;
                    this.playerCastle.createFence();
                }
            }

            // Play sound
            if (typeof audioManager !== 'undefined') {
                audioManager.playCastleUpgrade();
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

            // Update spinner position for new castle size
            this.updateCastleSpinnerPosition();

            // Update mining speed
            this.updateMiningSpeed();

            // Play upgrade sound
            if (typeof audioManager !== 'undefined') {
                audioManager.playCastleUpgrade();
            }

            // Visual feedback
            if (this.castleLevel >= effectiveMaxLevel) {
                this.showMessage(`Castle MAX LEVEL!`, '#ffd700');
            } else {
                this.showMessage(`Castle Lv.${this.castleLevel}!`, '#4ade80');
            }

            // Glow effect
            const glowColor = this.castleLevel >= effectiveMaxLevel ? 0xffd700 : 0x4ade80;
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
        const effectiveMaxLevel = this.getEffectiveMaxCastleLevel();
        const isMaxLevel = level >= effectiveMaxLevel;
        const needsRepair = isMaxLevel && this.needsRepair();

        // At max level with no damage, show MAX
        if (isMaxLevel && !needsRepair) {
            this.castleUpgradeCostText.setText('MAX');
            this.castleCostGlow.setText('MAX');
            this.castleUpgradeCostText.setStyle({ color: '#ffd700' });
            this.castleCostGlow.setAlpha(0);
            return;
        }

        const cost = isMaxLevel
            ? this.getRepairCost()
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
        // Mining speed increases 25% per castle level (in-game upgrade)
        const level = this.castleLevel || 1;
        // Gold Income XP upgrade adds +10% mining speed per level
        const goldIncomeLevel = this.goldIncomeLevel || 1;
        const goldIncomeBonus = 1 + (goldIncomeLevel - 1) * 0.1;
        this.miningSpeed = 50 * (1 + (level - 1) * 0.25) * goldIncomeBonus;
    }

    createUI() {
        // Wave display (bottom right corner, always on top)
        this.waveDisplay = new WaveDisplay(this, GAME_WIDTH - 10, GAME_HEIGHT - 10);
        // Show rank next to wave count
        const rankInfo = saveSystem.getRankInfo(this.saveData);
        this.waveDisplay.setRank(rankInfo);

        // Resource display (gold and wood) - center top
        this.resourceDisplay = new ResourceDisplay(this, 150, 30);  // Top bar
        this.resourceDisplay.setGold(this.gold);
        this.resourceDisplay.setWood(this.wood);

        // Keep goldDisplay for backwards compatibility
        this.goldDisplay = this.resourceDisplay;

        // Unit buttons panel
        this.createUnitButtons();

        // Reinforcements button (if unlocked)
        this.createReinforcementButton();

        // Pause button
        this.createPauseButton();

        // Music toggle button
        this.createMusicToggle();

        // Unit count display (top right area)
        this.createUnitCountDisplay();
    }

    createUnitCountDisplay() {
        // Container for unit counts - horizontal layout in top bar (shifted left for space)
        this.unitCountContainer = this.add.container(GAME_WIDTH - 500, 35);  // More space between elements
        this.unitCountContainer.setDepth(900);

        // Unit count texts for each type - horizontal with mini icons
        this.unitCountTexts = {};
        const unitTypes = ['PEASANT', 'ARCHER', 'HORSEMAN'];
        const colorHex = {
            PEASANT: '#E8C87A',
            ARCHER: '#4CC053',
            HORSEMAN: '#8B6914'
        };

        unitTypes.forEach((type, index) => {
            const x = index * 95; // Spread out more

            // Mini unit icon (offset down a bit since icons extend upward) - x2 scale
            const iconContainer = this.add.container(x, 8);
            iconContainer.setScale(2);  // x2 larger icons
            this.createMiniUnitIcon(iconContainer, type);
            this.unitCountContainer.add(iconContainer);

            // Count text next to icon
            const countText = this.add.text(x + 24, 0, '0', {
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
        // Simple iconic mini icons
        switch (unitType) {
            case 'PEASANT':
                // Simple sword icon
                container.add(this.add.rectangle(0, -2, 4, 16, 0xC0C0C0)); // blade
                container.add(this.add.rectangle(0, -10, 3, 4, 0xD0D0D0)); // tip
                container.add(this.add.rectangle(0, 6, 10, 3, 0xFFD700)); // crossguard
                container.add(this.add.rectangle(0, 10, 3, 6, 0x8B4513)); // handle
                break;
            case 'ARCHER':
                // Improved bow with arrow - cleaner pixel art style
                // Bow limbs (curved shape using multiple pieces)
                container.add(this.add.rectangle(-6, -10, 3, 5, 0x6B3A0A)); // top limb outer
                container.add(this.add.rectangle(-8, -6, 3, 4, 0x7B4A1A));  // top limb curve
                container.add(this.add.rectangle(-9, -2, 3, 4, 0x8B5A2A));  // top limb inner
                container.add(this.add.rectangle(-9, 2, 3, 4, 0x8B5A2A));   // bottom limb inner
                container.add(this.add.rectangle(-8, 6, 3, 4, 0x7B4A1A));   // bottom limb curve
                container.add(this.add.rectangle(-6, 10, 3, 5, 0x6B3A0A));  // bottom limb outer
                // Bow grip (center, darker)
                container.add(this.add.rectangle(-9, 0, 4, 3, 0x4B2A0A));
                // Bowstring (taut)
                container.add(this.add.rectangle(-4, 0, 2, 22, 0xCCBBAA));
                // Arrow shaft
                container.add(this.add.rectangle(5, 0, 18, 2, 0x9B7B5B));
                container.add(this.add.rectangle(5, -1, 16, 1, 0xAB8B6B)); // highlight
                // Arrow fletching (feathers at back)
                container.add(this.add.rectangle(-4, -2, 4, 2, 0x228B22)); // green feather top
                container.add(this.add.rectangle(-4, 2, 4, 2, 0x228B22));  // green feather bottom
                // Arrowhead (sharp triangular)
                container.add(this.add.rectangle(14, 0, 5, 3, 0xA0A0A0));  // head base
                container.add(this.add.rectangle(17, 0, 3, 2, 0xC0C0C0));  // head tip
                break;
            case 'HORSEMAN':
                // Horse head profile facing right
                container.add(this.add.rectangle(-3, 5, 6, 10, 0x8B4513).setAngle(15)); // neck
                container.add(this.add.rectangle(2, -2, 12, 7, 0x8B4513)); // head
                container.add(this.add.rectangle(9, 0, 5, 5, 0x7B3503)); // snout
                container.add(this.add.rectangle(1, -6, 5, 4, 0x8B4513)); // forehead
                container.add(this.add.rectangle(-2, -9, 3, 6, 0x7B3503)); // ear
                container.add(this.add.rectangle(3, -2, 2, 2, 0x000000)); // eye
                container.add(this.add.rectangle(-6, -2, 4, 10, 0x3B2503)); // mane
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
            HORSEMAN: 0
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
        
        // Message queue for showing one message at a time
        this.messageQueue = [];
        this.isShowingMessage = false;

        // Full height unit bar background (opaque)
        const unitBarBg = this.add.rectangle(50, GAME_HEIGHT / 2, 120, GAME_HEIGHT, 0x1a2a3a);
        unitBarBg.setDepth(850);

        // Vertical layout on FAR LEFT
        const panelX = 50;

        // Unit buttons - vertical layout, no panel boxes
        const startY = 60;  // Full height bar
        const spacing = 120;  // No margins between buttons
        const unitTypes = ['PEASANT', 'ARCHER', 'HORSEMAN'];
        const hotkeys = ['1', '2', '3'];

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

    createReinforcementButton() {
        // Only create if reinforcements upgrade is unlocked
        if (!this.saveData.specialUpgrades?.reinforcements) {
            this.reinforcementButton = null;
            return;
        }

        // Position at the bottom of the screen
        const panelX = 50;
        const buttonY = 540; // All the way to bottom

        const buttonWidth = 110;
        const buttonHeight = 100;

        // Container for the button
        this.reinforcementButtonContainer = this.add.container(panelX, buttonY);
        this.reinforcementButtonContainer.setDepth(900);

        // Background
        const background = this.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2a3a4a, 0.85);
        this.reinforcementButtonContainer.add(background);

        // Inner area
        const innerBg = this.add.rectangle(0, 0, buttonWidth - 10, buttonHeight - 15, 0x3a4a5a, 0.7);
        this.reinforcementButtonContainer.add(innerBg);

        // Spinner graphics for timer progress
        this.reinforcementSpinner = this.add.graphics();
        this.reinforcementButtonContainer.add(this.reinforcementSpinner);

        // Pixel art reinforcement icon (soldiers/shield)
        const iconGraphics = this.add.graphics();
        this.drawReinforcementIcon(iconGraphics, 0, 0, 60);
        this.reinforcementButtonContainer.add(iconGraphics);

        // Tooltip (shown on hover)
        this.reinforcementTooltip = this.add.container(0, -70);
        this.reinforcementTooltip.setDepth(1000);
        this.reinforcementTooltip.setVisible(false);

        const tooltipBg = this.add.rectangle(0, 0, 100, 28, 0x1a1a2e, 0.95);
        tooltipBg.setStrokeStyle(2, 0x4a6a8a);
        this.reinforcementTooltip.add(tooltipBg);

        const tooltipText = this.add.text(0, 0, 'Reinforce', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.reinforcementTooltip.add(tooltipText);

        this.reinforcementButtonContainer.add(this.reinforcementTooltip);

        // Make interactive
        background.setInteractive({});

        background.on('pointerdown', () => {
            if (this.reinforcementReady) {
                this.spawnReinforcements();
            } else {
                this.showMessage('Reinforcements charging...', '#ffaa00');
            }
        });

        background.on('pointerover', () => {
            this.reinforcementTooltip.setVisible(true);
            if (this.reinforcementReady) {
                innerBg.setFillStyle(0x4a6a8a, 0.85);
            }
        });

        background.on('pointerout', () => {
            this.reinforcementTooltip.setVisible(false);
            innerBg.setFillStyle(0x3a4a5a, 0.7);
        });

        this.reinforcementButton = {
            container: this.reinforcementButtonContainer,
            background,
            innerBg,
            iconGraphics
        };
    }

    // Draw pixel-art reinforcement icon (group of soldiers)
    drawReinforcementIcon(graphics, centerX, centerY, size) {
        const px = size / 12;  // Pixel size for 12x12 grid
        const startX = centerX - size / 2;
        const startY = centerY - size / 2;

        // Helper to draw a pixel
        const drawPx = (x, y, color) => {
            graphics.fillStyle(color, 1);
            graphics.fillRect(startX + x * px, startY + y * px, px, px);
        };

        // Colors
        const helmetColor = 0x808080;    // Steel helmet
        const helmetLight = 0xc0c0c0;    // Helmet shine
        const skinColor = 0xd4a574;      // Skin
        const armorColor = 0x4169e1;     // Blue armor
        const armorDark = 0x2a4a9a;      // Dark blue
        const shieldColor = 0xdaa520;    // Gold shield
        const swordColor = 0xc0c0c0;     // Sword

        // Left soldier (smaller, background)
        // Helmet
        drawPx(1, 2, helmetColor);
        drawPx(2, 2, helmetLight);
        drawPx(1, 3, helmetColor);
        drawPx(2, 3, helmetColor);
        // Face
        drawPx(1, 4, skinColor);
        drawPx(2, 4, skinColor);
        // Body
        drawPx(1, 5, armorDark);
        drawPx(2, 5, armorDark);
        drawPx(1, 6, armorDark);
        drawPx(2, 6, armorDark);

        // Center soldier (main, larger)
        // Helmet
        [4,5,6,7].forEach(x => drawPx(x, 0, helmetColor));
        [4,5,6,7].forEach(x => drawPx(x, 1, helmetColor));
        drawPx(5, 0, helmetLight);
        drawPx(6, 0, helmetLight);
        // Face
        [4,5,6,7].forEach(x => drawPx(x, 2, skinColor));
        drawPx(5, 2, 0x000000); // Eyes
        drawPx(6, 2, 0x000000);
        [4,5,6,7].forEach(x => drawPx(x, 3, skinColor));
        // Armor body
        [3,4,5,6,7,8].forEach(x => drawPx(x, 4, armorColor));
        [3,4,5,6,7,8].forEach(x => drawPx(x, 5, armorColor));
        [4,5,6,7].forEach(x => drawPx(x, 6, armorColor));
        [4,5,6,7].forEach(x => drawPx(x, 7, armorDark));
        // Shield (left side)
        drawPx(2, 4, shieldColor);
        drawPx(2, 5, shieldColor);
        drawPx(3, 4, shieldColor);
        drawPx(3, 5, shieldColor);
        // Sword (right side)
        drawPx(8, 3, swordColor);
        drawPx(9, 2, swordColor);
        drawPx(9, 3, swordColor);

        // Right soldier (smaller, background)
        // Helmet
        drawPx(9, 2, helmetColor);
        drawPx(10, 2, helmetLight);
        drawPx(9, 3, helmetColor);
        drawPx(10, 3, helmetColor);
        // Face
        drawPx(9, 4, skinColor);
        drawPx(10, 4, skinColor);
        // Body
        drawPx(9, 5, armorDark);
        drawPx(10, 5, armorDark);
        drawPx(9, 6, armorDark);
        drawPx(10, 6, armorDark);

        // Legs for all
        [1,2].forEach(x => drawPx(x, 7, 0x4a3728));
        [4,5,6,7].forEach(x => drawPx(x, 8, 0x4a3728));
        [9,10].forEach(x => drawPx(x, 7, 0x4a3728));
    }

    createHeroAbilityButton() {
        // Position to the right of wood resource (resource display is at x=150)
        const buttonX = 320;
        const buttonY = 30;
        const buttonSize = 50;

        // Container for the button
        this.heroAbilityButtonContainer = this.add.container(buttonX, buttonY);
        this.heroAbilityButtonContainer.setDepth(900);

        // Background circle
        const background = this.add.circle(0, 0, buttonSize / 2, 0x2a3a4a, 0.9);
        background.setStrokeStyle(3, this.hero.color);
        this.heroAbilityButtonContainer.add(background);

        // Inner circle (hero color)
        this.heroAbilityInnerBg = this.add.circle(0, 0, buttonSize / 2 - 5, 0x3a4a5a, 0.7);
        this.heroAbilityButtonContainer.add(this.heroAbilityInnerBg);

        // Spinner graphics for timer progress
        this.heroAbilitySpinner = this.add.graphics();
        this.heroAbilityButtonContainer.add(this.heroAbilitySpinner);

        // Hero pixel art icon (smaller version)
        const heroIcon = this.add.graphics();
        this.drawPixelArtHero(heroIcon, this.heroKey, 0, 0, 32);
        this.heroAbilityButtonContainer.add(heroIcon);

        // Lock icon (shown until wave 20) - bottom-right corner
        this.heroAbilityLock = this.add.text(15, 15, '🔒', {
            fontSize: '12px'
        }).setOrigin(0.5);
        this.heroAbilityButtonContainer.add(this.heroAbilityLock);

        // Make interactive
        background.setInteractive({ useHandCursor: true });

        background.on('pointerdown', () => {
            this.activateHeroAbility();
        });

        background.on('pointerover', () => {
            if (this.heroAbilityReady) {
                this.heroAbilityInnerBg.setFillStyle(0x4a6a8a, 0.9);
            }
        });

        background.on('pointerout', () => {
            this.heroAbilityInnerBg.setFillStyle(0x3a4a5a, 0.7);
        });

        this.heroAbilityButton = {
            container: this.heroAbilityButtonContainer,
            background,
            heroIcon
        };
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
        if (!this.gameInitialized || this.isPaused) return;

        // Update manual mining
        this.updateMining(delta);

        // Update castle upgrade hover spinner
        this.updateCastleUpgrade(delta);

        // Update castle (shoots arrows at enemies)
        if (this.playerCastle && !this.playerCastle.isDead) {
            this.playerCastle.update(time, delta);
            // Check for castle emergency trigger (HP < 25%)
            this.checkCastleEmergency();
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

        // Update reinforcement timer
        this.updateReinforcementTimer(delta);

        // Check hero ability unlock (wave 20)
        this.checkHeroAbilityUnlock();

        // Update hero ability timer
        this.updateHeroAbilityTimer(delta);

        // Update wave display
        const waveInfo = this.waveSystem.getWaveInfo();
        this.waveDisplay.setWave(waveInfo.currentWave, waveInfo.enemiesRemaining);

        // Update unit counts
        this.updateUnitCounts();
    }

    updateUnitButtons(delta) {
        const unitTypes = ['PEASANT', 'ARCHER', 'HORSEMAN'];

        // Check if research cost applies (rank 4+: Knight rank and above)
        const rankInfo = saveSystem.getRankInfo(this.saveData);
        const isAdvancedRank = ['Knight', 'Commander', 'General', 'Champion', 'Legend'].includes(rankInfo.rank.name);

        this.unitButtons.forEach((button, index) => {
            const type = unitTypes[index];
            const stats = UNIT_TYPES[type];
            const typeKey = type.toLowerCase();

            // Cost increases with promotion level
            // Gold tier (4+) spawns 2 units - cost reflects both units (unless Elite Mastery unlocked)
            const promotionLevel = this.getPromotionLevel(type);
            const costMultiplier = this.getPromotionCostMultiplier(promotionLevel);
            const unitsToSpawn = promotionLevel >= 4 ? 2 : 1;
            const hasEliteDiscount = this.saveData.specialUpgrades?.eliteDiscount || false;
            const costUnits = (hasEliteDiscount && unitsToSpawn === 2) ? 1 : unitsToSpawn;
            let totalGoldCost = Math.ceil(stats.goldCost * costMultiplier * costUnits);
            let totalWoodCost = Math.ceil(stats.woodCost * costMultiplier * costUnits);

            // Apply research cost for first spawn (rank 4+ only)
            const isFirstSpawn = !this.firstSpawnDone[typeKey];
            if (isAdvancedRank && isFirstSpawn) {
                totalGoldCost *= 2;
                totalWoodCost *= 2;
            }

            // Apply production cost reduction from special upgrade
            const costReduction = 1 - (this.saveData.specialUpgrades?.productionCost || 0) * 0.05;
            totalGoldCost = Math.ceil(totalGoldCost * costReduction);
            totalWoodCost = Math.ceil(totalWoodCost * costReduction);

            // Apply Alchemist hero cost reduction (-5%)
            if (this.hero?.unitCostReduction) {
                totalGoldCost = Math.ceil(totalGoldCost * (1 - this.hero.unitCostReduction));
                totalWoodCost = Math.ceil(totalWoodCost * (1 - this.hero.unitCostReduction));
            }

            const canAfford = this.gold >= totalGoldCost && this.wood >= totalWoodCost;
            button.setEnabled(canAfford && button.isUnlocked);

            // Update displayed costs based on promotion (includes double spawn cost)
            button.updateCosts(totalGoldCost, totalWoodCost);

            // Update affordable count display (costs already include multiplier)
            button.updateAffordableCount(this.gold, this.wood, 1);

            // Update hover-to-spawn progress
            button.updateSpawnProgress(delta);
        });

        // Update castle upgrade button affordability
        if (this.upgradeCostText) {
            this.updateUpgradeButton();
        }
    }

    updateReinforcementTimer(delta) {
        // Skip if reinforcements not unlocked
        if (!this.reinforcementButton) return;

        // Update timer
        if (!this.reinforcementReady) {
            this.reinforcementTimer += delta;

            if (this.reinforcementTimer >= this.reinforcementCooldown) {
                this.reinforcementTimer = this.reinforcementCooldown;
                this.reinforcementReady = true;
                // Start glowing effect on button
                this.startReinforcementGlow();
            }
        }

        // Update visual
        this.drawReinforcementSpinner();
    }

    drawReinforcementSpinner() {
        if (!this.reinforcementSpinner) return;

        const graphics = this.reinforcementSpinner;
        graphics.clear();

        const progress = this.reinforcementTimer / this.reinforcementCooldown;
        const radius = 38;
        const centerY = -10;

        // Pie timer effect: dark overlay shrinks as timer fills
        if (progress < 1) {
            const remainingProgress = 1 - progress;
            const startAngle = -Math.PI / 2;  // Start from top
            const endAngle = startAngle + remainingProgress * Math.PI * 2;

            // Draw dark overlay pie slice (remaining cooldown)
            graphics.fillStyle(0x000000, 0.6);
            graphics.beginPath();
            graphics.moveTo(0, centerY);
            graphics.arc(0, centerY, radius, startAngle, endAngle, false);
            graphics.closePath();
            graphics.fillPath();
        }
    }

    startReinforcementGlow() {
        if (!this.reinforcementButtonContainer) return;

        // Create glow effect behind the button
        if (this.reinforcementGlow) {
            this.reinforcementGlow.destroy();
        }

        this.reinforcementGlow = this.add.graphics();
        this.reinforcementGlow.setPosition(this.reinforcementButtonContainer.x, this.reinforcementButtonContainer.y);
        this.reinforcementGlow.setDepth(899); // Behind button

        // Draw glow rectangle
        this.reinforcementGlow.fillStyle(0x4ade80, 0.4);
        this.reinforcementGlow.fillRoundedRect(-60, -55, 120, 110, 10);

        // Pulsing animation
        this.tweens.add({
            targets: this.reinforcementGlow,
            alpha: { from: 0.8, to: 0.3 },
            duration: 600,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });
    }

    stopReinforcementGlow() {
        if (this.reinforcementGlow) {
            this.tweens.killTweensOf(this.reinforcementGlow);
            this.reinforcementGlow.destroy();
            this.reinforcementGlow = null;
        }
    }

    spawnReinforcements() {
        if (!this.reinforcementReady) return;

        // Get reinforcement level (1-5)
        const reinfLevel = this.saveData.specialUpgrades?.reinforcements || 0;
        if (reinfLevel <= 0) return;

        // Unit counts per level:
        // Lv1: 5P + 3A + 1H
        // Lv2: 6P + 4A + 2H
        // Lv3: 7P + 5A + 3H
        // Lv4: 8P + 6A + 4H
        // Lv5: 10P + 8A + 5H
        const unitCounts = {
            1: { peasant: 5, archer: 3, horseman: 1 },
            2: { peasant: 6, archer: 4, horseman: 2 },
            3: { peasant: 7, archer: 5, horseman: 3 },
            4: { peasant: 8, archer: 6, horseman: 4 },
            5: { peasant: 10, archer: 8, horseman: 5 }
        };

        const counts = unitCounts[reinfLevel] || unitCounts[1];

        // Spawn units at promotion level 0
        for (let i = 0; i < counts.peasant; i++) {
            this.spawnReinforcementUnit('PEASANT', 0);
        }
        for (let i = 0; i < counts.archer; i++) {
            this.spawnReinforcementUnit('ARCHER', 0);
        }
        for (let i = 0; i < counts.horseman; i++) {
            this.spawnReinforcementUnit('HORSEMAN', 0);
        }

        // Reset timer and stop glow
        this.reinforcementTimer = 0;
        this.reinforcementReady = false;
        this.stopReinforcementGlow();

        // Audio feedback - war horn for reinforcements
        if (typeof audioManager !== 'undefined') {
            audioManager.playReinforcement();
        }
    }

    spawnReinforcementUnit(unitType, forcedPromotionLevel) {
        // Get upgrade data for stats bonuses
        const typeKey = unitType.toLowerCase();
        const upgradeData = this.saveData.upgrades[typeKey];
        const upgradeLevel = upgradeData ? upgradeData.level : 1;

        // Calculate spawn position near castle
        const spawnX = CASTLE_CONFIG.playerX + 100 + Math.random() * 80;
        const spawnY = 280 + (Math.random() - 0.5) * 300;

        // Calculate promotion bonus from promotion level
        const promotionBonus = this.getPromotionBonus(forcedPromotionLevel);

        // Create unit with forced promotion level (bypasses spawn count)
        const unit = new Unit(this, spawnX, spawnY, unitType, upgradeLevel, promotionBonus, forcedPromotionLevel);
        this.units.add(unit);

        // Visual spawn effect
        const flash = this.add.circle(spawnX, spawnY, 20, 0x4ade80, 0.5);
        this.tweens.add({
            targets: flash,
            scaleX: 2,
            scaleY: 2,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });
    }

    checkCastleEmergency() {
        // Skip if not unlocked
        if (!this.saveData.specialUpgrades?.castleEmergency) return;

        // Skip if already used this battle
        if (this.castleEmergencyUsed) return;

        // Check if castle HP is below 25%
        const castle = this.playerCastle;
        if (!castle || castle.isDead) return;

        const hpPercent = castle.currentHealth / castle.maxHealth;
        if (hpPercent >= 0.25) return;

        // Trigger castle emergency!
        this.castleEmergencyUsed = true;
        this.castleEmergencyActive = true;

        // Big warning message
        this.showMessage('💥 CASTLE EMERGENCY! 💥', '#ff3300');

        // Play dramatic sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playMagic();
        }

        // Screen flash effect
        const flash = this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xff3300, 0.4);
        flash.setDepth(2000);
        this.tweens.add({
            targets: flash,
            alpha: 0,
            duration: 300,
            onComplete: () => flash.destroy()
        });

        // Launch explosives for 5 seconds (10 waves of explosions)
        for (let i = 0; i < 10; i++) {
            this.time.delayedCall(i * 500, () => {
                this.launchCastleExplosive();
            });
        }

        // End emergency mode after 5 seconds
        this.time.delayedCall(5000, () => {
            this.castleEmergencyActive = false;
            this.showMessage('Emergency Over - No Repair Available', '#ff9900');
        });
    }

    launchCastleExplosive() {
        if (!this.playerCastle || this.playerCastle.isDead) return;

        // Pick random target area on the battlefield
        const targetX = Phaser.Math.Between(400, GAME_WIDTH - 50);
        const targetY = Phaser.Math.Between(100, GAME_HEIGHT - 100);

        // Create explosive projectile from castle
        const explosive = this.add.circle(this.playerCastle.x, this.playerCastle.y, 8, 0xff6600);
        explosive.setDepth(1500);

        // Add glow effect
        const glow = this.add.circle(this.playerCastle.x, this.playerCastle.y, 12, 0xffff00, 0.5);
        glow.setDepth(1499);

        // Animate to target
        this.tweens.add({
            targets: [explosive, glow],
            x: targetX,
            y: targetY,
            duration: 400,
            ease: 'Quad.easeIn',
            onComplete: () => {
                explosive.destroy();
                glow.destroy();
                this.createExplosion(targetX, targetY);
            }
        });

        // Play launch sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playArrow(0.6);
        }
    }

    createExplosion(x, y) {
        const explosionRadius = 150;

        // Visual explosion effect
        const explosion = this.add.circle(x, y, 10, 0xff4400);
        explosion.setDepth(1600);

        // Expanding ring
        this.tweens.add({
            targets: explosion,
            scaleX: explosionRadius / 10,
            scaleY: explosionRadius / 10,
            alpha: 0,
            duration: 400,
            ease: 'Quad.easeOut',
            onComplete: () => explosion.destroy()
        });

        // Fire particles
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const particle = this.add.circle(x, y, 4, 0xffaa00);
            particle.setDepth(1601);

            this.tweens.add({
                targets: particle,
                x: x + Math.cos(angle) * explosionRadius * 0.8,
                y: y + Math.sin(angle) * explosionRadius * 0.8,
                alpha: 0,
                scale: 0.3,
                duration: 350,
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Play explosion sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playMagic();
        }

        // Kill all enemies in radius
        if (this.enemies) {
            this.enemies.getChildren().forEach(enemy => {
                if (!enemy.active || enemy.isDead) return;

                const distance = Phaser.Math.Distance.Between(x, y, enemy.x, enemy.y);
                if (distance <= explosionRadius) {
                    // Instant kill - deal massive damage
                    enemy.takeDamage(9999);
                }
            });
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

        // Cost increases with promotion level
        // Gold tier (4+) spawns 2 units - cost reflects both units (unless Elite Mastery unlocked)
        const costMultiplier = this.getPromotionCostMultiplier(promotionLevel);
        const unitsToSpawn = promotionLevel >= 4 ? 2 : 1;
        const hasEliteDiscount = this.saveData.specialUpgrades?.eliteDiscount || false;
        const costUnits = (hasEliteDiscount && unitsToSpawn === 2) ? 1 : unitsToSpawn;
        let totalGoldCost = Math.ceil(stats.goldCost * costMultiplier * costUnits);
        let totalWoodCost = Math.ceil(stats.woodCost * costMultiplier * costUnits);

        // Research cost: first unit of each type costs double for rank 4+ (Knight and above)
        const rankInfo = saveSystem.getRankInfo(this.saveData);
        const isAdvancedRank = ['Knight', 'Commander', 'General', 'Champion', 'Legend'].includes(rankInfo.rank.name);
        const isFirstSpawn = !this.firstSpawnDone[typeKey];
        const applyResearchCost = isAdvancedRank && isFirstSpawn;

        if (applyResearchCost) {
            totalGoldCost *= 2;
            totalWoodCost *= 2;
        }

        // Apply production cost reduction from special upgrade
        const costReduction = 1 - (this.saveData.specialUpgrades?.productionCost || 0) * 0.05;
        totalGoldCost = Math.ceil(totalGoldCost * costReduction);
        totalWoodCost = Math.ceil(totalWoodCost * costReduction);

        // Apply Alchemist hero cost reduction (-5%)
        if (this.hero?.unitCostReduction) {
            totalGoldCost = Math.ceil(totalGoldCost * (1 - this.hero.unitCostReduction));
            totalWoodCost = Math.ceil(totalWoodCost * (1 - this.hero.unitCostReduction));
        }

        // Check costs (includes double spawn cost)
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

        // Show research cost tip on first spawn
        if (applyResearchCost) {
            this.firstSpawnDone[typeKey] = true;
            const tips = [
                'Research cost paid! Future spawns are cheaper.',
                'First unit deployed! R&D costs covered.'
            ];
            this.showMessage(tips[Math.floor(Math.random() * tips.length)], '#ffaa00');
        }

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
                spawnX = SPAWN_CONFIG.topSpawn.x;
                spawnY = SPAWN_CONFIG.topSpawn.y;
                break;
            case 'bottom':
                spawnX = SPAWN_CONFIG.bottomSpawn.x;
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
        // Check if there's a tip for this wave
        const tip = this.getWaveTip(waveNumber);

        // Skip tips for experienced players (Knight and above)
        const rankInfo = saveSystem.getRankInfo(this.saveData);
        const experiencedRanks = ['Knight', 'Commander', 'General', 'Champion', 'Legend', 'Immortal'];
        const isExperienced = experiencedRanks.includes(rankInfo.rank.name);

        if (tip && !isExperienced) {
            this.showWaveTip(tip, waveNumber, () => {
                this.waveDisplay.showWaveStart(waveNumber);
            });
        } else {
            this.waveDisplay.showWaveStart(waveNumber);
        }
    }

    // Wave tips for challenging waves
    createEnemyPreview(enemyType) {
        const container = this.add.container(0, 0);

        switch(enemyType) {
            case 'SKELETON_ARCHER':
                this.createPreviewSkeletonArcher(container);
                break;
            case 'TROLL':
                this.createPreviewTroll(container);
                break;
            case 'DRAGON':
                this.createPreviewDragon(container);
                break;
            case 'DARK_KNIGHT':
                this.createPreviewDarkKnight(container);
                break;
            case 'DEMON':
                this.createPreviewDemon(container);
                break;
            default:
                // Fallback - generic enemy shape
                container.add(this.add.rectangle(0, 0, 30, 40, 0x666666));
                container.add(this.add.rectangle(0, -25, 20, 20, 0x888888));
        }

        return container;
    }

    createPreviewSkeletonArcher(container) {
        // Shadow
        container.add(this.add.rectangle(0, 34, 16, 5, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-3, 22, 5, 18, 0xEEEEEE));
        container.add(this.add.rectangle(3, 22, 5, 18, 0xEEEEEE));
        container.add(this.add.rectangle(-4, 32, 7, 4, 0xDDDDDD));
        container.add(this.add.rectangle(4, 32, 7, 4, 0xDDDDDD));
        // Ribcage
        container.add(this.add.rectangle(0, 6, 16, 18, 0xEEEEEE));
        container.add(this.add.rectangle(0, 4, 14, 4, 0xDDDDDD));
        container.add(this.add.rectangle(0, 10, 12, 4, 0xDDDDDD));
        // Hood and cloak
        container.add(this.add.rectangle(0, 4, 20, 20, 0x333344));
        container.add(this.add.rectangle(0, 2, 18, 16, 0x444455));
        container.add(this.add.rectangle(0, -8, 24, 18, 0x333344));
        container.add(this.add.rectangle(0, -14, 22, 14, 0x444455));
        container.add(this.add.rectangle(0, -20, 18, 10, 0x555566));
        // Skull
        container.add(this.add.rectangle(0, -10, 18, 16, 0xEEEEEE));
        container.add(this.add.rectangle(0, -8, 14, 12, 0xFFFFFF));
        // Eyes
        container.add(this.add.rectangle(-5, -12, 8, 8, 0x111111));
        container.add(this.add.rectangle(5, -12, 8, 8, 0x111111));
        container.add(this.add.rectangle(-4, -11, 5, 5, 0x44FF44));
        container.add(this.add.rectangle(6, -11, 5, 5, 0x44FF44));
        // Bow
        container.add(this.add.rectangle(-18, -14, 5, 10, 0x554433));
        container.add(this.add.rectangle(-20, -6, 5, 8, 0x665544));
        container.add(this.add.rectangle(-18, 2, 5, 10, 0x554433));
        container.add(this.add.rectangle(-20, 10, 5, 8, 0x665544));
        container.add(this.add.rectangle(-18, 18, 5, 10, 0x554433));
        container.add(this.add.rectangle(-14, 2, 2, 36, 0x888888));
    }

    createPreviewTroll(container) {
        const s = 1.3;
        // Shadow
        container.add(this.add.rectangle(0, 46 * s, 36 * s, 8, 0x000000, 0.2));
        // Legs
        container.add(this.add.rectangle(-10 * s, 34 * s, 14 * s, 20 * s, 0x558866));
        container.add(this.add.rectangle(10 * s, 34 * s, 14 * s, 20 * s, 0x558866));
        container.add(this.add.rectangle(-11 * s, 46 * s, 18 * s, 8 * s, 0x447755));
        container.add(this.add.rectangle(11 * s, 46 * s, 18 * s, 8 * s, 0x447755));
        // Body
        container.add(this.add.rectangle(0, 10 * s, 34 * s, 38 * s, 0x669977));
        container.add(this.add.rectangle(0, 12 * s, 30 * s, 32 * s, 0x77AA88));
        container.add(this.add.rectangle(0, 16 * s, 28 * s, 26 * s, 0x88BB99));
        // Arms
        container.add(this.add.rectangle(-24 * s, 10 * s, 14 * s, 30 * s, 0x669977));
        container.add(this.add.rectangle(24 * s, 10 * s, 14 * s, 30 * s, 0x669977));
        container.add(this.add.rectangle(-24 * s, 28 * s, 16 * s, 12 * s, 0x77AA88));
        container.add(this.add.rectangle(24 * s, 28 * s, 16 * s, 12 * s, 0x77AA88));
        // Head
        container.add(this.add.rectangle(0, -18 * s, 30 * s, 26 * s, 0x669977));
        container.add(this.add.rectangle(0, -16 * s, 26 * s, 20 * s, 0x77AA88));
        // Warts
        container.add(this.add.rectangle(-10 * s, -26 * s, 6 * s, 6 * s, 0x88BB99));
        container.add(this.add.rectangle(12 * s, -16 * s, 5 * s, 5 * s, 0x88BB99));
        // Eyes
        container.add(this.add.rectangle(-8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        container.add(this.add.rectangle(8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        container.add(this.add.rectangle(-7 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        container.add(this.add.rectangle(9 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        // Nose
        container.add(this.add.rectangle(0, -10 * s, 14 * s, 12 * s, 0x558866));
        container.add(this.add.rectangle(-3 * s, -6 * s, 4 * s, 4 * s, 0x336644));
        container.add(this.add.rectangle(3 * s, -6 * s, 4 * s, 4 * s, 0x336644));
        // Mouth
        container.add(this.add.rectangle(0, -2 * s, 16 * s, 8 * s, 0x336644));
        container.add(this.add.rectangle(-5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));
        container.add(this.add.rectangle(5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));
        // Club
        container.add(this.add.rectangle(-30 * s, 24 * s, 8 * s, 38 * s, 0x8B6633));
        container.add(this.add.rectangle(-30 * s, 48 * s, 18 * s, 20 * s, 0x6B5533));
    }

    createPreviewDragon(container) {
        const s = 0.9;
        // Wings (bat-like)
        container.add(this.add.rectangle(-32 * s, -8 * s, 8 * s, 50 * s, 0x8B0000));
        container.add(this.add.rectangle(-44 * s, -20 * s, 6 * s, 36 * s, 0xA01010));
        container.add(this.add.rectangle(-54 * s, -28 * s, 5 * s, 28 * s, 0xB02020));
        container.add(this.add.rectangle(-38 * s, -4 * s, 18 * s, 40 * s, 0x660000, 0.7));
        container.add(this.add.rectangle(-50 * s, -16 * s, 14 * s, 30 * s, 0x550000, 0.6));
        container.add(this.add.rectangle(32 * s, -8 * s, 8 * s, 50 * s, 0x8B0000));
        container.add(this.add.rectangle(44 * s, -20 * s, 6 * s, 36 * s, 0xA01010));
        container.add(this.add.rectangle(54 * s, -28 * s, 5 * s, 28 * s, 0xB02020));
        container.add(this.add.rectangle(38 * s, -4 * s, 18 * s, 40 * s, 0x660000, 0.7));
        container.add(this.add.rectangle(50 * s, -16 * s, 14 * s, 30 * s, 0x550000, 0.6));
        // Tail (curving)
        container.add(this.add.rectangle(0, 38 * s, 14 * s, 16 * s, 0xCC2200));
        container.add(this.add.rectangle(4 * s, 50 * s, 12 * s, 14 * s, 0xBB1100));
        container.add(this.add.rectangle(10 * s, 60 * s, 10 * s, 12 * s, 0xAA0000));
        container.add(this.add.rectangle(18 * s, 68 * s, 8 * s, 10 * s, 0x990000));
        container.add(this.add.rectangle(26 * s, 72 * s, 12 * s, 6 * s, 0x442200));
        // Legs
        container.add(this.add.rectangle(-12 * s, 32 * s, 12 * s, 20 * s, 0xAA1100));
        container.add(this.add.rectangle(12 * s, 32 * s, 12 * s, 20 * s, 0xBB2200));
        container.add(this.add.rectangle(-14 * s, 44 * s, 14 * s, 10 * s, 0x991100));
        container.add(this.add.rectangle(14 * s, 44 * s, 14 * s, 10 * s, 0xAA2200));
        // Body
        container.add(this.add.rectangle(0, 10 * s, 40 * s, 36 * s, 0xCC2200));
        container.add(this.add.rectangle(2 * s, 10 * s, 34 * s, 30 * s, 0xDD3311));
        // Belly scales
        container.add(this.add.rectangle(0, 8 * s, 24 * s, 6 * s, 0xDD8844));
        container.add(this.add.rectangle(0, 16 * s, 26 * s, 6 * s, 0xCC7733));
        container.add(this.add.rectangle(0, 24 * s, 24 * s, 6 * s, 0xDD8844));
        // Neck
        container.add(this.add.rectangle(0, -14 * s, 18 * s, 28 * s, 0xCC2200));
        container.add(this.add.rectangle(2 * s, -12 * s, 14 * s, 24 * s, 0xDD3311));
        // Dorsal spikes
        for (let i = 0; i < 5; i++) {
            const y = (-28 + i * 12) * s;
            const spikeH = (10 - i) * s;
            container.add(this.add.rectangle(0, y - spikeH/2, 6 * s, spikeH, 0x772200));
        }
        // Head
        container.add(this.add.rectangle(0, -38 * s, 28 * s, 22 * s, 0xCC2200));
        container.add(this.add.rectangle(2 * s, -36 * s, 22 * s, 16 * s, 0xDD3311));
        // Snout
        container.add(this.add.rectangle(0, -50 * s, 18 * s, 12 * s, 0xBB1100));
        container.add(this.add.rectangle(0, -52 * s, 14 * s, 6 * s, 0xCC2200));
        // Nostrils
        container.add(this.add.rectangle(-4 * s, -54 * s, 4 * s, 3 * s, 0x220000));
        container.add(this.add.rectangle(4 * s, -54 * s, 4 * s, 3 * s, 0x220000));
        // Horns (curved)
        container.add(this.add.rectangle(-12 * s, -48 * s, 6 * s, 12 * s, 0x332211));
        container.add(this.add.rectangle(-14 * s, -58 * s, 5 * s, 10 * s, 0x443322));
        container.add(this.add.rectangle(-16 * s, -66 * s, 4 * s, 8 * s, 0x554433));
        container.add(this.add.rectangle(12 * s, -48 * s, 6 * s, 12 * s, 0x332211));
        container.add(this.add.rectangle(14 * s, -58 * s, 5 * s, 10 * s, 0x443322));
        container.add(this.add.rectangle(16 * s, -66 * s, 4 * s, 8 * s, 0x554433));
        // Eyes (glowing)
        container.add(this.add.rectangle(-8 * s, -40 * s, 10 * s, 8 * s, 0x110000));
        container.add(this.add.rectangle(8 * s, -40 * s, 10 * s, 8 * s, 0x110000));
        container.add(this.add.rectangle(-8 * s, -40 * s, 8 * s, 6 * s, 0xFFAA00));
        container.add(this.add.rectangle(8 * s, -40 * s, 8 * s, 6 * s, 0xFFAA00));
        container.add(this.add.rectangle(-8 * s, -40 * s, 3 * s, 5 * s, 0x000000));
        container.add(this.add.rectangle(8 * s, -40 * s, 3 * s, 5 * s, 0x000000));
        // Fangs
        container.add(this.add.rectangle(-4 * s, -42 * s, 2 * s, 4 * s, 0xFFFFEE));
        container.add(this.add.rectangle(4 * s, -42 * s, 2 * s, 4 * s, 0xFFFFEE));
    }

    createPreviewDarkKnight(container) {
        // Shadow
        container.add(this.add.rectangle(0, 40, 30, 6, 0x000000, 0.2));
        // Cape
        container.add(this.add.rectangle(0, 22, 34, 36, 0x660022));
        container.add(this.add.rectangle(0, 24, 30, 30, 0x880033));
        // Legs
        container.add(this.add.rectangle(-6, 26, 10, 18, 0x333344));
        container.add(this.add.rectangle(6, 26, 10, 18, 0x333344));
        container.add(this.add.rectangle(-7, 36, 12, 6, 0x222233));
        container.add(this.add.rectangle(7, 36, 12, 6, 0x222233));
        // Body
        container.add(this.add.rectangle(0, 6, 26, 28, 0x333344));
        container.add(this.add.rectangle(0, 8, 22, 22, 0x444455));
        container.add(this.add.rectangle(0, 4, 12, 12, 0xAA0022));
        container.add(this.add.rectangle(0, 4, 8, 8, 0xCC0033));
        // Arms
        container.add(this.add.rectangle(-16, 6, 8, 18, 0x333344));
        container.add(this.add.rectangle(16, 6, 8, 18, 0x333344));
        // Helmet
        container.add(this.add.rectangle(0, -18, 24, 22, 0x333344));
        container.add(this.add.rectangle(0, -16, 20, 18, 0x444455));
        container.add(this.add.rectangle(0, -16, 18, 8, 0x111122));
        container.add(this.add.rectangle(-5, -16, 8, 5, 0xFF2222));
        container.add(this.add.rectangle(5, -16, 8, 5, 0xFF2222));
        // Horns
        container.add(this.add.rectangle(-12, -28, 6, 12, 0x333344));
        container.add(this.add.rectangle(-12, -36, 5, 10, 0x444455));
        container.add(this.add.rectangle(-12, -42, 4, 8, 0x555566));
        container.add(this.add.rectangle(12, -28, 6, 12, 0x333344));
        container.add(this.add.rectangle(12, -36, 5, 10, 0x444455));
        container.add(this.add.rectangle(12, -42, 4, 8, 0x555566));
        // Sword
        container.add(this.add.rectangle(-22, -4, 6, 36, 0x444466));
        container.add(this.add.rectangle(-22, -20, 8, 4, 0xFF0044));
        container.add(this.add.rectangle(-22, 16, 16, 6, 0x333344));
    }

    createPreviewDemon(container) {
        const s = 1.2;
        // Shadow
        container.add(this.add.rectangle(0, 42 * s, 40 * s, 8, 0x000000, 0.2));
        // Wings
        container.add(this.add.rectangle(-32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        container.add(this.add.rectangle(-42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        container.add(this.add.rectangle(-50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        container.add(this.add.rectangle(32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        container.add(this.add.rectangle(42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        container.add(this.add.rectangle(50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        // Tail
        container.add(this.add.rectangle(14 * s, 28 * s, 18 * s, 8 * s, 0xBB3344));
        container.add(this.add.rectangle(26 * s, 26 * s, 14 * s, 7 * s, 0xCC4455));
        container.add(this.add.rectangle(36 * s, 24 * s, 12 * s, 8 * s, 0x661122));
        // Legs
        container.add(this.add.rectangle(-8 * s, 30 * s, 12 * s, 18 * s, 0xBB3344));
        container.add(this.add.rectangle(8 * s, 30 * s, 12 * s, 18 * s, 0xBB3344));
        container.add(this.add.rectangle(-9 * s, 40 * s, 14 * s, 6 * s, 0x441122));
        container.add(this.add.rectangle(9 * s, 40 * s, 14 * s, 6 * s, 0x441122));
        // Body
        container.add(this.add.rectangle(0, 6 * s, 30 * s, 34 * s, 0xCC3344));
        container.add(this.add.rectangle(0, 8 * s, 26 * s, 28 * s, 0xDD4455));
        container.add(this.add.rectangle(-5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        container.add(this.add.rectangle(5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        // Arms
        container.add(this.add.rectangle(-20 * s, 6 * s, 12 * s, 24 * s, 0xCC3344));
        container.add(this.add.rectangle(20 * s, 6 * s, 12 * s, 24 * s, 0xCC3344));
        container.add(this.add.rectangle(-22 * s, 22 * s, 10 * s, 8 * s, 0xDD4455));
        container.add(this.add.rectangle(22 * s, 22 * s, 10 * s, 8 * s, 0xDD4455));
        // Head
        container.add(this.add.rectangle(0, -18 * s, 28 * s, 26 * s, 0xCC3344));
        container.add(this.add.rectangle(0, -16 * s, 24 * s, 20 * s, 0xDD4455));
        // Horns
        container.add(this.add.rectangle(-12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        container.add(this.add.rectangle(-14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        container.add(this.add.rectangle(-16 * s, -50 * s, 6 * s, 10 * s, 0x663344));
        container.add(this.add.rectangle(12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        container.add(this.add.rectangle(14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        container.add(this.add.rectangle(16 * s, -50 * s, 6 * s, 10 * s, 0x663344));
        // Eyes
        container.add(this.add.rectangle(-7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        container.add(this.add.rectangle(7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        container.add(this.add.rectangle(-6 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        container.add(this.add.rectangle(8 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        // Mouth
        container.add(this.add.rectangle(0, -8 * s, 16 * s, 8 * s, 0x661122));
        container.add(this.add.rectangle(-6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));
        container.add(this.add.rectangle(6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));
    }

    getWaveTip(waveNumber) {
        const tips = {
            6: {
                enemyType: 'SKELETON_ARCHER',
                title: 'RANGED ENEMIES!',
                message: 'Skeleton Archers are coming!\nPosition tanks in front to protect your ranged units.',
                suggestion: 'Consider: Horsemen as fast frontline'
            },
            8: {
                enemyType: 'TROLL',
                title: 'TROLLS INCOMING!',
                message: 'Trolls hit HARD and have high HP!\nPeasants will die in one hit.',
                suggestion: 'Consider: Horsemen can charge and survive'
            },
            10: {
                enemyType: 'DRAGON',
                title: 'BOSS WAVE!',
                message: 'A DRAGON is coming!\nRing of fire damages groups of units!',
                suggestion: 'Consider: Spread units out, use Horsemen to tank'
            },
            12: {
                enemyType: 'DARK_KNIGHT',
                title: 'DARK KNIGHTS!',
                message: 'Armored enemies with high damage!\nThey will shred weak units.',
                suggestion: 'Consider: Multiple Archers for ranged damage'
            },
            18: {
                enemyType: 'DEMON',
                title: 'DEMONS APPROACH!',
                message: 'Demons are brutal! High HP and damage.\nYou need a balanced army.',
                suggestion: 'Consider: Mix Horsemen, Archers, promoted units'
            },
            20: {
                enemyType: 'DRAGON',
                title: 'SECOND DRAGON!',
                message: 'Another Dragon boss!\nRing of fire hits harder now.',
                suggestion: 'Consider: Spread army, avoid clustering'
            },
            30: {
                enemyType: 'DRAGON',
                title: 'THIRD DRAGON!',
                message: 'Powerful Dragon with devastating ring of fire!\nThis will be a tough fight.',
                suggestion: 'Consider: Keep units spread, use promoted tanks'
            }
        };

        return tips[waveNumber] || null;
    }

    showWaveTip(tip, waveNumber, onClose) {
        // Pause the game
        if (!this.isPaused) {
            this.isPaused = true;
            this.waveSystem.pause();
            if (typeof audioManager !== 'undefined') {
                audioManager.pauseMusic();
            }
        }

        // Fixed 3 second display time for all players
        const minDisplayTime = 3000;

        // Create tip overlay
        const tipOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        tipOverlay.setDepth(1100);

        // Dark background
        const bg = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.85);
        tipOverlay.add(bg);

        // Tip panel
        const panel = this.add.rectangle(0, 0, 500, 320, 0x1a2a3a, 0.95);
        panel.setStrokeStyle(3, 0xffaa00);
        tipOverlay.add(panel);

        // Create actual enemy preview instead of emoji
        const enemyPreview = this.createEnemyPreview(tip.enemyType);
        enemyPreview.setPosition(0, -100);
        enemyPreview.setScale(1.5);
        tipOverlay.add(enemyPreview);

        // Title
        const title = this.add.text(0, -60, tip.title, {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);
        tipOverlay.add(title);

        // Message
        const message = this.add.text(0, 10, tip.message, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        tipOverlay.add(message);

        // Suggestion
        const suggestion = this.add.text(0, 80, tip.suggestion, {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'italic',
            color: '#44ff44'
        }).setOrigin(0.5);
        tipOverlay.add(suggestion);

        // Continue button (disabled initially)
        const continueBtn = this.add.container(0, 130);
        tipOverlay.add(continueBtn);

        const btnBg = this.add.rectangle(0, 0, 200, 45, 0x333333);
        btnBg.setStrokeStyle(2, 0x555555);
        continueBtn.add(btnBg);

        const btnText = this.add.text(0, 0, 'Please wait...', {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#666666'
        }).setOrigin(0.5);
        continueBtn.add(btnText);

        // Countdown timer
        let timeRemaining = Math.ceil(minDisplayTime / 1000);
        btnText.setText(`Wait ${timeRemaining}s...`);

        const countdownTimer = this.time.addEvent({
            delay: 1000,
            repeat: timeRemaining - 1,
            callback: () => {
                timeRemaining--;
                if (timeRemaining > 0) {
                    btnText.setText(`Wait ${timeRemaining}s...`);
                } else {
                    // Enable the button
                    btnBg.setFillStyle(0x44aa44);
                    btnBg.setStrokeStyle(2, 0x66cc66);
                    btnText.setText('CONTINUE');
                    btnText.setColor('#ffffff');
                    btnBg.setInteractive({ useHandCursor: true });

                    btnBg.on('pointerover', () => {
                        btnBg.setFillStyle(0x55bb55);
                    });
                    btnBg.on('pointerout', () => {
                        btnBg.setFillStyle(0x44aa44);
                    });
                    btnBg.on('pointerdown', () => {
                        // Close tip and resume
                        tipOverlay.destroy();
                        this.isPaused = false;
                        this.waveSystem.resume();
                        if (typeof audioManager !== 'undefined') {
                            audioManager.resumeMusic();
                        }
                        if (onClose) onClose();
                    });
                }
            }
        });

        this.currentTipOverlay = tipOverlay;
    }

    onWaveComplete(waveNumber, goldReward, woodReward) {
        this.addGold(goldReward);
        this.addWood(woodReward);
        this.waveDisplay.showWaveComplete(waveNumber, goldReward, woodReward);

        // Castle gains HP per wave only if Castle Health upgrade is level 2+
        // Level 1 = no wave HP bonus, Level 2+ = +20 HP per wave
        if (this.castleHealthLevel >= 2) {
            const hpGain = 20;
            this.playerCastle.waveHealthBonus += hpGain;
            this.playerCastle.maxHealth += hpGain;
            this.playerCastle.currentHealth += hpGain;
            this.playerCastle.updateHealthBar();
        }

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
        const saveResult = saveSystem.updateHighScore(
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
        const xpEarned = saveResult.xpEarned || 0;

        // Auto-sync to cloud and validate session if logged in
        if (supabaseClient && supabaseClient.isLoggedIn()) {
            this.syncAndValidateAfterBattle();
        }

        // Show dark overlay
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.2)
            .setDepth(999);

        // Show game over text
        const gameOverText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 50, 'CASTLE DESTROYED!', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000).setAlpha(0.5);

        const waveText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, `You survived ${finalWave} waves!`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000).setAlpha(0.5);

        // Transition to game over scene
        this.time.delayedCall(2500, () => {
            this.scene.start('GameOverScene', {
                wave: finalWave,
                goldEarned: this.goldEarnedThisRun,
                woodEarned: this.woodEarnedThisRun,
                enemiesKilled: this.enemiesKilledThisRun,
                xpEarned: xpEarned,
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

        // Darker transparent overlay
        const fullScreenHit = this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.2);
        fullScreenHit.setInteractive();
        fullScreenHit.on('pointerdown', (pointer) => {
            if (pointer.rightButtonDown()) {
                this.togglePause();
            }
        });
        this.pauseOverlay.add(fullScreenHit);

        // Clean panel with proper padding
        const bg = this.add.rectangle(0, 10, 300, 310, 0x1a2a3a, 0.95);
        this.pauseOverlay.add(bg);

        const title = this.add.text(0, -95, 'PAUSED', {
            fontSize: '36px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.pauseOverlay.add(title);

        // Sound controls - centered
        const musicBtn = this.add.text(-30, -50, '🎵', {
            fontSize: '32px'
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
        const volumeBtn = this.add.text(30, -50, volumeIcons[this.volumeState || 0], {
            fontSize: '32px'
        }).setOrigin(0.5).setInteractive({});
        volumeBtn.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                this.volumeState = (this.volumeState + 1) % 3;
                const volumes = [1.0, 0.25, 0];
                audioManager.setMasterVolume(volumes[this.volumeState]);
                volumeBtn.setText(volumeIcons[this.volumeState]);
                musicBtn.setAlpha(volumes[this.volumeState] > 0 ? 1 : 0.3);
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

        // Clean button - single background
        const bg = this.add.rectangle(0, 0, 200, 42, 0x3a5a7a, 0.9);
        bg.setInteractive({});
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x4a7aba, 1);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x3a5a7a, 0.9);
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
        // Add to queue and process
        this.messageQueue.push({ text, color });
        this.processMessageQueue();
    }
    
    processMessageQueue() {
        // If already showing a message or queue is empty, return
        if (this.isShowingMessage || this.messageQueue.length === 0) return;
        
        this.isShowingMessage = true;
        const { text, color } = this.messageQueue.shift();
        
        // Create container for message box (higher position)
        const container = this.add.container(GAME_WIDTH / 2, 90);
        container.setDepth(1000);

        // Create text first to measure it
        const message = this.add.text(0, 0, text, {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Create rounded background box with padding
        const padding = { x: 20, y: 12 };
        const boxWidth = message.width + padding.x * 2;
        const boxHeight = message.height + padding.y * 2;

        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);

        // Add subtle border
        bg.lineStyle(2, Phaser.Display.Color.HexStringToColor(color).color, 0.5);
        bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 12);

        container.add(bg);
        container.add(message);

        // Pop-in animation
        container.setScale(0.8);
        container.setAlpha(0);

        this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 0.6,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stay visible then destroy (25% shorter = 2400ms)
                this.time.delayedCall(2400, () => {
                    container.destroy();
                    this.isShowingMessage = false;
                    // Process next message in queue
                    this.processMessageQueue();
                });
            }
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
            y: y - 40,  // 2x farther for mobile visibility
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

        let calculatedLevel = 0;
        for (let level = 6; level >= 1; level--) {
            if (spawnCount >= thresholds[level]) {
                calculatedLevel = level;
                break;
            }
        }

        // Apply promotion skip from special upgrades
        // Each skip level sets a minimum promotion level
        const skipKey = `${typeKey}PromoSkip`;
        const skipLevel = this.saveData.specialUpgrades?.[skipKey] || 0;
        return Math.max(calculatedLevel, skipLevel);
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
        // Returns {color: 'silver'|'gold', signs: 1-3, isStar: bool}
        if (promotionLevel <= 0) return null;
        if (promotionLevel <= 3) {
            return { color: 'silver', signs: promotionLevel, isStar: promotionLevel === 3 };
        } else {
            return { color: 'gold', signs: promotionLevel - 3, isStar: promotionLevel === 6 };
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
        const isGold = badgeInfo.color === 'gold';
        const color = isGold ? '#ffd700' : '#c0c0c0';
        const borderColor = isGold ? 0xffd700 : 0xc0c0c0;
        // Level 3 and 6 show a star, others show chevrons
        const signs = badgeInfo.isStar ? '★' : '▲'.repeat(badgeInfo.signs);

        // Create container for promotion box
        const container = this.add.container(GAME_WIDTH / 2, 100);
        container.setDepth(1100);

        // Create text elements first to measure
        const message = this.add.text(0, -25, `${unitName} PROMOTED!`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const badge = this.add.text(0, 8, signs, {
            fontSize: '24px',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        const bonus = Math.round((this.getPromotionBonus(level) - 1) * 100);
        const bonusText = this.add.text(0, 38, `+${bonus}% Stats!`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Calculate box dimensions
        const padding = { x: 30, y: 20 };
        const boxWidth = Math.max(message.width, bonusText.width) + padding.x * 2;
        const boxHeight = 110;

        // Create rounded background
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.75);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 16);
        bg.lineStyle(3, borderColor, 0.8);
        bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 16);

        container.add(bg);
        container.add(message);
        container.add(badge);
        container.add(bonusText);

        // Play promotion fanfare sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playPromotion();
        }

        // Pop-in animation
        container.setScale(0);
        container.setAlpha(0);

        this.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 0.7,
            duration: 250,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stay visible then destroy instantly (shorter time)
                this.time.delayedCall(2400, () => container.destroy());
            }
        });
    }

    updateUnitButtonBadge(unitType, level) {
        // Find the unit button and update its badge
        const typeKey = unitType.toLowerCase();
        const buttonIndex = ['peasant', 'archer', 'horseman'].indexOf(typeKey);
        if (buttonIndex >= 0 && this.unitButtons && this.unitButtons[buttonIndex]) {
            this.unitButtons[buttonIndex].setPromotionLevel(level);
        }
    }
}
