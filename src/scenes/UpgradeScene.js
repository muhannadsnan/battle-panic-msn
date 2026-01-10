// Upgrade Scene - Unit and castle upgrades with proper unit icons
class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    create() {
        this.saveData = saveSystem.load();

        // Hide default cursor and create sword cursor
        this.input.setDefaultCursor('none');
        this.createSwordCursor();

        // Background
        this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x1a1a2e);

        // Title
        this.add.text(GAME_WIDTH / 2, 40, 'UPGRADES', {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // XP display (upgrades use XP, not gold)
        const xp = this.saveData.xp || 0;
        this.xpText = this.add.text(GAME_WIDTH / 2, 85, `⭐ XP: ${xp}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#44ddff'
        }).setOrigin(0.5);

        // Info text
        this.add.text(GAME_WIDTH / 2, 110, 'Earn 1 XP per 10 waves completed in battle', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);

        // Create upgrade panels
        this.createUnitUpgrades();
        this.createCastleUpgrades();

        // Back button
        this.createBackButton();
    }

    createUnitUpgrades() {
        this.add.text(GAME_WIDTH / 2, 130, 'UNIT UPGRADES', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        const unitTypes = ['PEASANT', 'ARCHER', 'KNIGHT', 'WIZARD', 'GIANT'];
        const startX = 110;
        const spacing = 170;
        const y = 250;

        this.upgradeCards = [];

        unitTypes.forEach((type, index) => {
            const card = this.createUnitCard(startX + (index * spacing), y, type);
            this.upgradeCards.push(card);
        });
    }

    createUnitCard(x, y, unitType) {
        const stats = UNIT_TYPES[unitType];
        const typeKey = unitType.toLowerCase();
        const upgradeData = this.saveData.upgrades[typeKey];

        const card = this.add.container(x, y);

        // Card background
        const isUnlocked = upgradeData.unlocked;
        const bgColor = isUnlocked ? 0x333344 : 0x222222;
        const bg = this.add.rectangle(0, 0, 150, 200, bgColor);
        bg.setStrokeStyle(3, isUnlocked ? stats.color : 0x444444);
        card.add(bg);

        // Unit icon container
        const iconContainer = this.add.container(0, -60);
        this.createUnitIcon(iconContainer, unitType, isUnlocked);
        card.add(iconContainer);

        // Unit name
        const name = this.add.text(0, -15, stats.name, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        card.add(name);

        // Level
        const levelText = this.add.text(0, 8, `Level ${upgradeData.level}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Stats preview with current -> next values
        const currentStats = this.getUpgradedStats(stats, upgradeData.level);
        const nextStats = this.getUpgradedStats(stats, upgradeData.level + 1);
        const isMaxLevel = upgradeData.level >= UPGRADE_CONFIG.maxLevel;

        // Stats layout - fixed positions for alignment
        const labelX = -55;
        const currentX = -5;
        const arrowX = 8;
        const nextX = 30;

        // HP line
        const hpContainer = this.add.container(0, 30);
        const hpLabel = this.add.text(labelX, 0, 'HP:', {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        hpContainer.add(hpLabel);

        const hpCurrent = this.add.text(currentX, 0, `${currentStats.health}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        hpContainer.add(hpCurrent);

        if (!isMaxLevel) {
            // Draw proper arrow using graphics
            const hpArrow = this.add.graphics();
            hpArrow.fillStyle(0x44ff44, 1);
            hpArrow.fillRect(arrowX, -2, 10, 4);
            hpArrow.fillTriangle(arrowX + 10, -5, arrowX + 10, 5, arrowX + 18, 0);
            hpContainer.add(hpArrow);
            const hpNext = this.add.text(nextX, 0, `${nextStats.health}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            hpContainer.add(hpNext);
        }
        card.add(hpContainer);

        // DMG line
        const dmgContainer = this.add.container(0, 48);
        const dmgLabel = this.add.text(labelX, 0, 'DMG:', {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        dmgContainer.add(dmgLabel);

        const dmgCurrent = this.add.text(currentX, 0, `${currentStats.damage}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        dmgContainer.add(dmgCurrent);

        if (!isMaxLevel) {
            // Draw proper arrow using graphics
            const dmgArrow = this.add.graphics();
            dmgArrow.fillStyle(0x44ff44, 1);
            dmgArrow.fillRect(arrowX, -2, 10, 4);
            dmgArrow.fillTriangle(arrowX + 10, -5, arrowX + 10, 5, arrowX + 18, 0);
            dmgContainer.add(dmgArrow);
            const dmgNext = this.add.text(nextX, 0, `${nextStats.damage}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            dmgContainer.add(dmgNext);
        }
        card.add(dmgContainer);

        const xp = this.saveData.xp || 0;

        if (isUnlocked) {
            // Upgrade button (uses XP)
            if (upgradeData.level < UPGRADE_CONFIG.maxLevel) {
                const cost = this.calculateUpgradeCost(typeKey, upgradeData.level);
                const upgradeBtn = this.createCardButton(0, 80, `Upgrade\n${cost} XP`, () => {
                    this.purchaseUpgrade(typeKey, cost);
                }, xp >= cost);
                card.add(upgradeBtn);
            } else {
                const maxText = this.add.text(0, 80, 'MAX LEVEL', {
                    fontSize: '16px',
                    fontFamily: 'Arial',
                    color: '#ffd700'
                }).setOrigin(0.5);
                card.add(maxText);
            }
        } else {
            // Unlock button (uses XP)
            const unlockCost = this.getUnlockCost(typeKey);
            const unlockBtn = this.createCardButton(0, 80, `Unlock\n${unlockCost} XP`, () => {
                this.unlockUnit(typeKey, unlockCost);
            }, xp >= unlockCost);
            card.add(unlockBtn);

            // Lock overlay
            const lockOverlay = this.add.rectangle(0, 0, 150, 200, 0x000000, 0.5);
            card.add(lockOverlay);

            const lockIcon = this.add.text(0, -60, '🔒', {
                fontSize: '30px'
            }).setOrigin(0.5);
            card.add(lockIcon);
        }

        return card;
    }

    createUnitIcon(container, unitType, isUnlocked) {
        const scale = 0.5;
        const alpha = isUnlocked ? 1 : 0.5;

        switch (unitType.toUpperCase()) {
            case 'PEASANT':
                this.createPeasantIcon(container, scale, alpha);
                break;
            case 'ARCHER':
                this.createArcherIcon(container, scale, alpha);
                break;
            case 'KNIGHT':
                this.createKnightIcon(container, scale, alpha);
                break;
            case 'WIZARD':
                this.createWizardIcon(container, scale, alpha);
                break;
            case 'GIANT':
                this.createGiantIcon(container, scale, alpha);
                break;
        }
    }

    createPeasantIcon(container, scale, alpha) {
        const s = scale * 1.2;
        // Tan body (tunic)
        const body = this.add.rectangle(0, 6 * s, 16 * s, 22 * s, 0xE8C87A);
        body.setAlpha(alpha);
        container.add(body);
        // Brown belt
        const belt = this.add.rectangle(0, 8 * s, 18 * s, 4 * s, 0x8B5A2B);
        belt.setAlpha(alpha);
        container.add(belt);
        // Head (square cartoony)
        const head = this.add.rectangle(0, -12 * s, 14 * s, 14 * s, 0xFFDBB4);
        head.setAlpha(alpha);
        container.add(head);
        // Hair (brown rectangle on top)
        const hair = this.add.rectangle(0, -20 * s, 14 * s, 6 * s, 0x5D4037);
        hair.setAlpha(alpha);
        container.add(hair);
        // Eyes
        const eye1 = this.add.rectangle(-3 * s, -12 * s, 3 * s, 3 * s, 0x000000);
        const eye2 = this.add.rectangle(3 * s, -12 * s, 3 * s, 3 * s, 0x000000);
        eye1.setAlpha(alpha);
        eye2.setAlpha(alpha);
        container.add(eye1);
        container.add(eye2);
        // Pitchfork handle
        const handle = this.add.rectangle(12 * s, -2 * s, 3 * s, 32 * s, 0x8B7355);
        handle.setAlpha(alpha);
        container.add(handle);
        // Pitchfork prongs (3 rectangles)
        const prong1 = this.add.rectangle(12 * s, -20 * s, 2 * s, 8 * s, 0x888888);
        const prong2 = this.add.rectangle(8 * s, -18 * s, 2 * s, 6 * s, 0x888888);
        const prong3 = this.add.rectangle(16 * s, -18 * s, 2 * s, 6 * s, 0x888888);
        prong1.setAlpha(alpha);
        prong2.setAlpha(alpha);
        prong3.setAlpha(alpha);
        container.add(prong1);
        container.add(prong2);
        container.add(prong3);
    }

    createArcherIcon(container, scale, alpha) {
        const s = scale * 1.2;
        // Green tunic body
        const body = this.add.rectangle(0, 6 * s, 14 * s, 20 * s, 0x4CC053);
        body.setAlpha(alpha);
        container.add(body);
        // Darker green belt
        const belt = this.add.rectangle(0, 8 * s, 16 * s, 4 * s, 0x2E7D32);
        belt.setAlpha(alpha);
        container.add(belt);
        // Head
        const head = this.add.rectangle(0, -10 * s, 12 * s, 12 * s, 0xFFDBB4);
        head.setAlpha(alpha);
        container.add(head);
        // Hood (rectangles forming hood shape)
        const hoodTop = this.add.rectangle(0, -20 * s, 16 * s, 8 * s, 0x2E7D32);
        const hoodLeft = this.add.rectangle(-6 * s, -14 * s, 4 * s, 6 * s, 0x2E7D32);
        const hoodRight = this.add.rectangle(6 * s, -14 * s, 4 * s, 6 * s, 0x2E7D32);
        hoodTop.setAlpha(alpha);
        hoodLeft.setAlpha(alpha);
        hoodRight.setAlpha(alpha);
        container.add(hoodTop);
        container.add(hoodLeft);
        container.add(hoodRight);
        // Eyes
        const eye1 = this.add.rectangle(-2 * s, -10 * s, 2 * s, 3 * s, 0x000000);
        const eye2 = this.add.rectangle(2 * s, -10 * s, 2 * s, 3 * s, 0x000000);
        eye1.setAlpha(alpha);
        eye2.setAlpha(alpha);
        container.add(eye1);
        container.add(eye2);
        // Bow (made of rectangles)
        const bowMain = this.add.rectangle(14 * s, 0, 3 * s, 28 * s, 0x8B4513);
        const bowTop = this.add.rectangle(12 * s, -12 * s, 6 * s, 3 * s, 0x8B4513);
        const bowBottom = this.add.rectangle(12 * s, 12 * s, 6 * s, 3 * s, 0x8B4513);
        bowMain.setAlpha(alpha);
        bowTop.setAlpha(alpha);
        bowBottom.setAlpha(alpha);
        container.add(bowMain);
        container.add(bowTop);
        container.add(bowBottom);
        // Bowstring
        const string = this.add.rectangle(10 * s, 0, 1 * s, 26 * s, 0xCCCCCC);
        string.setAlpha(alpha);
        container.add(string);
    }

    createKnightIcon(container, scale, alpha) {
        const s = scale * 1.2;
        // Blue armor body
        const body = this.add.rectangle(0, 6 * s, 18 * s, 24 * s, 0x55AAEE);
        body.setAlpha(alpha);
        container.add(body);
        // Armor detail (chest plate)
        const chestPlate = this.add.rectangle(0, 4 * s, 14 * s, 12 * s, 0x77CCFF);
        chestPlate.setAlpha(alpha);
        container.add(chestPlate);
        // Steel helmet
        const helmet = this.add.rectangle(0, -12 * s, 16 * s, 14 * s, 0x708090);
        helmet.setAlpha(alpha);
        container.add(helmet);
        // Helmet visor slit
        const visor = this.add.rectangle(0, -10 * s, 10 * s, 3 * s, 0x333333);
        visor.setAlpha(alpha);
        container.add(visor);
        // Red plume on helmet (stacked rectangles)
        const plume1 = this.add.rectangle(0, -22 * s, 4 * s, 8 * s, 0xFF4444);
        const plume2 = this.add.rectangle(0, -26 * s, 3 * s, 5 * s, 0xFF6666);
        plume1.setAlpha(alpha);
        plume2.setAlpha(alpha);
        container.add(plume1);
        container.add(plume2);
        // Shield (rectangle with cross)
        const shield = this.add.rectangle(-12 * s, 4 * s, 12 * s, 16 * s, 0x4169E1);
        shield.setStrokeStyle(2 * s, 0xFFD700);
        shield.setAlpha(alpha);
        container.add(shield);
        const crossV = this.add.rectangle(-12 * s, 4 * s, 2 * s, 12 * s, 0xFFD700);
        const crossH = this.add.rectangle(-12 * s, 4 * s, 8 * s, 2 * s, 0xFFD700);
        crossV.setAlpha(alpha);
        crossH.setAlpha(alpha);
        container.add(crossV);
        container.add(crossH);
        // Sword
        const swordBlade = this.add.rectangle(14 * s, -4 * s, 4 * s, 24 * s, 0xC0C0C0);
        const swordHilt = this.add.rectangle(14 * s, 10 * s, 10 * s, 3 * s, 0x8B4513);
        const swordHandle = this.add.rectangle(14 * s, 14 * s, 3 * s, 6 * s, 0x654321);
        swordBlade.setAlpha(alpha);
        swordHilt.setAlpha(alpha);
        swordHandle.setAlpha(alpha);
        container.add(swordBlade);
        container.add(swordHilt);
        container.add(swordHandle);
    }

    createWizardIcon(container, scale, alpha) {
        const s = scale * 1.2;
        // Purple robe body (wider at bottom for robe effect)
        const robeBottom = this.add.rectangle(0, 14 * s, 22 * s, 14 * s, 0xBB66FF);
        const robeTop = this.add.rectangle(0, 2 * s, 16 * s, 14 * s, 0xBB66FF);
        robeBottom.setAlpha(alpha);
        robeTop.setAlpha(alpha);
        container.add(robeBottom);
        container.add(robeTop);
        // Gold belt/sash
        const belt = this.add.rectangle(0, 6 * s, 18 * s, 3 * s, 0xFFD700);
        belt.setAlpha(alpha);
        container.add(belt);
        // Face
        const head = this.add.rectangle(0, -10 * s, 12 * s, 12 * s, 0xFFDBB4);
        head.setAlpha(alpha);
        container.add(head);
        // Eyes
        const eye1 = this.add.rectangle(-2 * s, -10 * s, 2 * s, 3 * s, 0x000000);
        const eye2 = this.add.rectangle(2 * s, -10 * s, 2 * s, 3 * s, 0x000000);
        eye1.setAlpha(alpha);
        eye2.setAlpha(alpha);
        container.add(eye1);
        container.add(eye2);
        // Wizard hat (stacked rectangles forming pointy hat)
        const hatBase = this.add.rectangle(0, -18 * s, 18 * s, 6 * s, 0x9932CC);
        const hatMid = this.add.rectangle(0, -24 * s, 12 * s, 8 * s, 0x9932CC);
        const hatTop = this.add.rectangle(0, -32 * s, 6 * s, 10 * s, 0x9932CC);
        const hatTip = this.add.rectangle(0, -38 * s, 3 * s, 6 * s, 0x9932CC);
        hatBase.setAlpha(alpha);
        hatMid.setAlpha(alpha);
        hatTop.setAlpha(alpha);
        hatTip.setAlpha(alpha);
        container.add(hatBase);
        container.add(hatMid);
        container.add(hatTop);
        container.add(hatTip);
        // Star on hat (made of rectangles)
        const starV = this.add.rectangle(0, -26 * s, 2 * s, 8 * s, 0xFFD700);
        const starH = this.add.rectangle(0, -26 * s, 8 * s, 2 * s, 0xFFD700);
        starV.setAlpha(alpha);
        starH.setAlpha(alpha);
        container.add(starV);
        container.add(starH);
        // Magic staff
        const staff = this.add.rectangle(14 * s, 0, 3 * s, 40 * s, 0x8B4513);
        staff.setAlpha(alpha);
        container.add(staff);
        // Orb on staff (square glowing orb)
        const orb = this.add.rectangle(14 * s, -22 * s, 10 * s, 10 * s, 0x00FFFF);
        const orbInner = this.add.rectangle(14 * s, -22 * s, 6 * s, 6 * s, 0xAAFFFF);
        orb.setAlpha(alpha);
        orbInner.setAlpha(alpha);
        container.add(orb);
        container.add(orbInner);
    }

    createGiantIcon(container, scale, alpha) {
        const s = scale * 1.0;
        // Large brown/orange body
        const body = this.add.rectangle(0, 8 * s, 26 * s, 32 * s, 0xEE9955);
        body.setAlpha(alpha);
        container.add(body);
        // Chest/belly detail
        const belly = this.add.rectangle(0, 12 * s, 18 * s, 20 * s, 0xFFAA66);
        belly.setAlpha(alpha);
        container.add(belly);
        // Brown loincloth
        const loincloth = this.add.rectangle(0, 22 * s, 22 * s, 6 * s, 0x8B4513);
        loincloth.setAlpha(alpha);
        container.add(loincloth);
        // Big square head
        const head = this.add.rectangle(0, -14 * s, 20 * s, 18 * s, 0xCD853F);
        head.setAlpha(alpha);
        container.add(head);
        // Angry brow
        const brow = this.add.rectangle(0, -20 * s, 18 * s, 5 * s, 0x8B6914);
        brow.setAlpha(alpha);
        container.add(brow);
        // Red angry eyes
        const eye1 = this.add.rectangle(-5 * s, -14 * s, 5 * s, 4 * s, 0xFF0000);
        const eye2 = this.add.rectangle(5 * s, -14 * s, 5 * s, 4 * s, 0xFF0000);
        eye1.setAlpha(alpha);
        eye2.setAlpha(alpha);
        container.add(eye1);
        container.add(eye2);
        // Angry mouth
        const mouth = this.add.rectangle(0, -6 * s, 10 * s, 4 * s, 0x330000);
        mouth.setAlpha(alpha);
        container.add(mouth);
        // Big club
        const clubHandle = this.add.rectangle(18 * s, 2 * s, 6 * s, 36 * s, 0x654321);
        clubHandle.setAlpha(alpha);
        container.add(clubHandle);
        // Club head (stacked rectangles for chunky look)
        const clubHead1 = this.add.rectangle(18 * s, -20 * s, 14 * s, 12 * s, 0x4A3728);
        const clubHead2 = this.add.rectangle(18 * s, -28 * s, 10 * s, 8 * s, 0x4A3728);
        clubHead1.setAlpha(alpha);
        clubHead2.setAlpha(alpha);
        container.add(clubHead1);
        container.add(clubHead2);
        // Spikes on club (small rectangles)
        const spike1 = this.add.rectangle(12 * s, -22 * s, 4 * s, 4 * s, 0x888888);
        const spike2 = this.add.rectangle(24 * s, -22 * s, 4 * s, 4 * s, 0x888888);
        const spike3 = this.add.rectangle(18 * s, -32 * s, 4 * s, 4 * s, 0x888888);
        spike1.setAlpha(alpha);
        spike2.setAlpha(alpha);
        spike3.setAlpha(alpha);
        container.add(spike1);
        container.add(spike2);
        container.add(spike3);
    }

    createCastleUpgrades() {
        this.add.text(GAME_WIDTH / 2, 380, 'CASTLE UPGRADES', {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);

        const upgrades = [
            { key: 'health', name: 'Castle Health', desc: '+20 HP per level', icon: '❤️' },
            { key: 'armor', name: 'Castle Armor', desc: '-5% damage taken', icon: '🛡️' },
            { key: 'goldIncome', name: 'Mining Speed', desc: '+25% mining speed', icon: '💰' }
        ];

        const startX = 250;
        const spacing = 200;
        const y = 490;

        upgrades.forEach((upgrade, index) => {
            this.createCastleUpgradeCard(startX + (index * spacing), y, upgrade);
        });
    }

    createCastleUpgradeCard(x, y, upgrade) {
        const level = this.saveData.castleUpgrades[upgrade.key];
        const card = this.add.container(x, y);
        const isMaxLevel = level >= UPGRADE_CONFIG.maxLevel;

        // Background
        const bg = this.add.rectangle(0, 0, 180, 100, 0x333344);
        bg.setStrokeStyle(2, 0x4169E1);
        card.add(bg);

        // Icon and name
        const header = this.add.text(0, -30, `${upgrade.icon} ${upgrade.name}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        card.add(header);

        // Level
        const levelText = this.add.text(0, -10, `Level ${level}/${UPGRADE_CONFIG.maxLevel}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Progression display: current -> next
        const currentBonus = this.getCastleBonus(upgrade.key, level);
        const nextBonus = this.getCastleBonus(upgrade.key, level + 1);

        const progressContainer = this.add.container(0, 8);
        const currentText = this.add.text(-15, 0, currentBonus, {
            fontSize: '14px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        progressContainer.add(currentText);

        if (!isMaxLevel) {
            // Draw a proper arrow using graphics
            const arrow = this.add.graphics();
            arrow.fillStyle(0x44ff44, 1);
            // Arrow shaft
            arrow.fillRect(0, -2, 12, 4);
            // Arrow head (triangle)
            arrow.fillTriangle(12, -6, 12, 6, 22, 0);
            progressContainer.add(arrow);

            const nextText = this.add.text(30, 0, nextBonus, {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            progressContainer.add(nextText);
        }
        card.add(progressContainer);

        // Upgrade button (uses XP)
        const xp = this.saveData.xp || 0;
        if (level < UPGRADE_CONFIG.maxLevel) {
            const cost = this.calculateCastleUpgradeCost(level);
            const btn = this.createCardButton(0, 38, `${cost} XP`, () => {
                this.purchaseCastleUpgrade(upgrade.key, cost);
            }, xp >= cost, 80, 25);
            card.add(btn);
        } else {
            const maxText = this.add.text(0, 38, 'MAX', {
                fontSize: '16px',
                fontFamily: 'Arial',
                color: '#ffd700'
            }).setOrigin(0.5);
            card.add(maxText);
        }
    }

    createCardButton(x, y, text, callback, enabled, width = 100, height = 35) {
        const container = this.add.container(x, y);

        // Enabled buttons are much brighter (green/gold) to show they're affordable
        const bgColor = enabled ? 0x44AA44 : 0x444444;
        const strokeColor = enabled ? 0x88FF88 : 0x555555;
        const bg = this.add.rectangle(0, 0, width, height, bgColor);
        bg.setStrokeStyle(enabled ? 3 : 2, strokeColor);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: enabled ? '#ffffff' : '#666666',
            align: 'center'
        }).setOrigin(0.5);
        container.add(label);

        if (enabled) {
            // Add a pulsing glow effect to show it's clickable
            this.tweens.add({
                targets: bg,
                alpha: 0.7,
                duration: 800,
                ease: 'Sine.easeInOut',
                yoyo: true,
                repeat: -1
            });

            bg.setInteractive({});

            bg.on('pointerover', () => {
                bg.setFillStyle(0x66CC66);
                bg.setAlpha(1);
            });

            bg.on('pointerout', () => {
                bg.setFillStyle(0x44AA44);
            });

            bg.on('pointerdown', () => {
                if (typeof audioManager !== 'undefined') {
                    audioManager.playClick();
                }
                callback();
            });
        }

        return container;
    }

    createBackButton() {
        const btn = this.add.container(80, GAME_HEIGHT - 40);

        const bg = this.add.rectangle(0, 0, 120, 40, 0x666666);
        bg.setStrokeStyle(2, 0x888888);
        bg.setInteractive({});
        btn.add(bg);

        const label = this.add.text(0, 0, '← Back', {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(label);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x888888);
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x666666);
        });

        bg.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            this.scene.start('MenuScene');
        });
    }

    getUpgradedStats(baseStats, level) {
        // Exponential upgrade bonuses:
        // HP bonus: +1, +2, +4, +8, +16... (cumulative: 2^(level-1) - 1)
        // DMG bonus: +2, +4, +8, +16, +32... (cumulative: 2^level - 2)
        const hpBonus = Math.pow(2, level - 1) - 1;
        const dmgBonus = Math.pow(2, level) - 2;
        return {
            health: baseStats.health + hpBonus,
            damage: baseStats.damage + dmgBonus
        };
    }

    getCastleBonus(upgradeKey, level) {
        // Returns formatted bonus string for castle upgrades
        const bonus = (level - 1); // Level 1 = 0 bonus, Level 2 = 1 bonus, etc.
        switch (upgradeKey) {
            case 'health':
                return `+${bonus * 20} HP`;
            case 'armor':
                return `-${bonus * 5}% DMG`;
            case 'goldIncome':
                return `+${bonus * 25}% SPD`;
            default:
                return '';
        }
    }

    calculateUpgradeCost(unitKey, currentLevel) {
        // XP costs: starts at 1, increases slowly
        // Level 1->2 = 1 XP, Level 2->3 = 2 XP, etc.
        return currentLevel;
    }

    calculateCastleUpgradeCost(currentLevel) {
        // XP costs: 1, 2, 3, 4, 5...
        return currentLevel;
    }

    getUnlockCost(unitKey) {
        // XP costs for unlocking units
        const costs = {
            knight: 2,
            wizard: 3,
            giant: 5
        };
        return costs[unitKey] || 1;
    }

    purchaseUpgrade(unitKey, cost) {
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.upgrades[unitKey].level++;
            saveSystem.save(this.saveData);
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            this.scene.restart();
        }
    }

    unlockUnit(unitKey, cost) {
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.upgrades[unitKey].unlocked = true;
            saveSystem.save(this.saveData);
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            this.scene.restart();
        }
    }

    purchaseCastleUpgrade(upgradeKey, cost) {
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.castleUpgrades[upgradeKey]++;
            saveSystem.save(this.saveData);
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            this.scene.restart();
        }
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

        // Follow mouse
        this.input.on('pointermove', (pointer) => {
            this.swordCursor.setPosition(pointer.x + 10, pointer.y + 15);
        });
    }

    update() {
        if (this.swordCursor) {
            const pointer = this.input.activePointer;
            this.swordCursor.setPosition(pointer.x + 10, pointer.y + 15);
        }
    }
}
