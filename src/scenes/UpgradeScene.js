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
        this.add.text(GAME_WIDTH / 2, 35, 'UPGRADES', {
            fontSize: '40px',
            fontFamily: 'Arial',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // XP display
        const xp = this.saveData.xp || 0;
        this.xpText = this.add.text(GAME_WIDTH / 2, 70, `⭐ XP: ${xp}`, {
            fontSize: '28px',
            fontFamily: 'Arial',
            color: '#44ddff'
        }).setOrigin(0.5);

        // Setup horizontal slider
        this.setupSlider();

        // Back button
        this.createBackButton();
    }

    setupSlider() {
        // Card configuration
        this.cardWidth = 280;
        this.cardSpacing = 20;
        this.currentCardIndex = 0;

        // Create all cards data
        this.allCards = [
            { type: 'unit', unitType: 'PEASANT' },
            { type: 'unit', unitType: 'ARCHER' },
            { type: 'unit', unitType: 'HORSEMAN' },
            { type: 'castle', upgrade: { key: 'health', name: 'Castle Health', desc: '+20 HP, +20/wave at L2+', icon: '❤️' } },
            { type: 'castle', upgrade: { key: 'armor', name: 'Castle Armor', desc: '-5% damage taken', icon: '🛡️' } },
            { type: 'castle', upgrade: { key: 'goldIncome', name: 'Mining Speed', desc: '+10% mining speed', icon: '💰' } },
            { type: 'special' }
        ];
        this.totalCards = this.allCards.length;

        // Create slider container
        this.sliderContainer = this.add.container(0, 0);

        // Create cards
        this.cardContainers = [];
        this.allCards.forEach((cardData, index) => {
            const x = GAME_WIDTH / 2 + index * (this.cardWidth + this.cardSpacing);
            const y = 310;
            let card;

            if (cardData.type === 'unit') {
                card = this.createUnitCard(x, y, cardData.unitType);
            } else if (cardData.type === 'castle') {
                card = this.createCastleUpgradeCard(x, y, cardData.upgrade);
            } else if (cardData.type === 'special') {
                card = this.createSpecialUpgradeCard(x, y);
            }

            this.cardContainers.push(card);
            this.sliderContainer.add(card);
        });

        // Create navigation dots
        this.createNavigationDots();

        // Setup drag/swipe
        this.setupDrag();

        // Position slider to show first card
        this.slideToCard(0, false);
    }

    createNavigationDots() {
        this.dots = [];
        const dotSpacing = 20;
        const startX = GAME_WIDTH / 2 - (this.totalCards - 1) * dotSpacing / 2;
        const y = GAME_HEIGHT - 40;

        for (let i = 0; i < this.totalCards; i++) {
            const dot = this.add.circle(startX + i * dotSpacing, y, 6, i === 0 ? 0xffd700 : 0x555555);
            dot.setInteractive({ useHandCursor: true });
            dot.on('pointerdown', () => this.slideToCard(i));
            this.dots.push(dot);
        }

        // Card label below dots
        this.cardLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 15, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        this.updateCardLabel();
    }

    updateCardLabel() {
        const labels = ['Peasant', 'Archer', 'Horseman', 'Health', 'Armor', 'Mining', 'Special'];
        this.cardLabel.setText(labels[this.currentCardIndex]);
    }

    updateDots() {
        this.dots.forEach((dot, i) => {
            dot.setFillStyle(i === this.currentCardIndex ? 0xffd700 : 0x555555);
        });
        this.updateCardLabel();
    }

    setupDrag() {
        // Create invisible drag zone
        const dragZone = this.add.rectangle(GAME_WIDTH / 2, 310, GAME_WIDTH, 450, 0x000000, 0);
        dragZone.setInteractive({ draggable: true });

        let startX = 0;
        let startContainerX = 0;

        dragZone.on('dragstart', (pointer) => {
            startX = pointer.x;
            startContainerX = this.sliderContainer.x;
        });

        dragZone.on('drag', (pointer) => {
            const deltaX = pointer.x - startX;
            this.sliderContainer.x = startContainerX + deltaX;
        });

        dragZone.on('dragend', (pointer) => {
            const deltaX = pointer.x - startX;
            const threshold = 50;

            if (deltaX < -threshold && this.currentCardIndex < this.totalCards - 1) {
                // Swipe left - next card
                this.slideToCard(this.currentCardIndex + 1);
            } else if (deltaX > threshold && this.currentCardIndex > 0) {
                // Swipe right - previous card
                this.slideToCard(this.currentCardIndex - 1);
            } else {
                // Snap back
                this.slideToCard(this.currentCardIndex);
            }
        });
    }

    slideToCard(index, animate = true) {
        this.currentCardIndex = index;
        const targetX = -index * (this.cardWidth + this.cardSpacing);

        if (animate) {
            this.tweens.add({
                targets: this.sliderContainer,
                x: targetX,
                duration: 200,
                ease: 'Power2'
            });
        } else {
            this.sliderContainer.x = targetX;
        }

        this.updateDots();
    }

    createUnitCard(x, y, unitType) {
        const stats = UNIT_TYPES[unitType];
        const typeKey = unitType.toLowerCase();
        const upgradeData = this.saveData.upgrades[typeKey];

        const card = this.add.container(x, y);

        // Card background - sized for slider
        const isUnlocked = upgradeData.unlocked;
        const bgColor = isUnlocked ? 0x333344 : 0x222222;
        const bg = this.add.rectangle(0, 0, 260, 380, bgColor);
        bg.setStrokeStyle(3, isUnlocked ? stats.color : 0x444444);
        card.add(bg);

        // Unit icon container - positioned higher
        const iconContainer = this.add.container(0, -60);
        this.createUnitIcon(iconContainer, unitType, isUnlocked);
        card.add(iconContainer);

        // Unit name - larger font
        const name = this.add.text(0, 10, stats.name, {
            fontSize: '20px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add(name);

        // Level - larger font
        const levelText = this.add.text(0, 32, `Level ${upgradeData.level}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Stats preview with current -> next values
        const currentStats = this.getUpgradedStats(stats, upgradeData.level);
        const nextStats = this.getUpgradedStats(stats, upgradeData.level + 1);
        const isMaxLevel = upgradeData.level >= UPGRADE_CONFIG.maxLevel;

        // Stats layout - fixed positions for alignment (larger)
        const labelX = -70;
        const currentX = -10;
        const arrowX = 5;
        const nextX = 32;

        // HP line - larger font
        const hpContainer = this.add.container(0, 58);
        const hpLabel = this.add.text(labelX, 0, 'HP:', {
            fontSize: '18px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        hpContainer.add(hpLabel);

        const hpCurrent = this.add.text(currentX, 0, `${currentStats.health}`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        hpContainer.add(hpCurrent);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const hpArrow = this.add.graphics();
            hpArrow.lineStyle(2, 0x44ff44, 1);
            hpArrow.moveTo(arrowX, -5);
            hpArrow.lineTo(arrowX + 6, 0);
            hpArrow.lineTo(arrowX, 5);
            hpArrow.moveTo(arrowX + 8, -5);
            hpArrow.lineTo(arrowX + 14, 0);
            hpArrow.lineTo(arrowX + 8, 5);
            hpArrow.strokePath();
            hpContainer.add(hpArrow);
            const hpNext = this.add.text(nextX, 0, `${nextStats.health}`, {
                fontSize: '18px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            hpContainer.add(hpNext);
        }
        card.add(hpContainer);

        // DMG line - larger font
        const dmgContainer = this.add.container(0, 82);
        const dmgLabel = this.add.text(labelX, 0, 'DMG:', {
            fontSize: '18px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        dmgContainer.add(dmgLabel);

        const dmgCurrent = this.add.text(currentX, 0, `${currentStats.damage}`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        dmgContainer.add(dmgCurrent);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const dmgArrow = this.add.graphics();
            dmgArrow.lineStyle(2, 0x44ff44, 1);
            dmgArrow.moveTo(arrowX, -5);
            dmgArrow.lineTo(arrowX + 6, 0);
            dmgArrow.lineTo(arrowX, 5);
            dmgArrow.moveTo(arrowX + 8, -5);
            dmgArrow.lineTo(arrowX + 14, 0);
            dmgArrow.lineTo(arrowX + 8, 5);
            dmgArrow.strokePath();
            dmgContainer.add(dmgArrow);
            const dmgNext = this.add.text(nextX, 0, `${nextStats.damage}`, {
                fontSize: '18px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            dmgContainer.add(dmgNext);
        }
        card.add(dmgContainer);

        const xp = this.saveData.xp || 0;

        if (isUnlocked) {
            // Upgrade button
            if (upgradeData.level < UPGRADE_CONFIG.maxLevel) {
                const cost = this.calculateUpgradeCost(typeKey, upgradeData.level);
                const upgradeBtn = this.createCardButton(0, 145, `Upgrade\n${cost} XP`, () => {
                    this.purchaseUpgrade(typeKey, cost);
                }, xp >= cost);
                card.add(upgradeBtn);
            } else {
                const maxText = this.add.text(0, 145, 'MAX LEVEL', {
                    fontSize: '22px',
                    fontFamily: 'Arial',
                    color: '#ffd700',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                card.add(maxText);
            }
        } else {
            // Unlock button
            const unlockCost = this.getUnlockCost(typeKey);
            const unlockBtn = this.createCardButton(0, 145, `Unlock\n${unlockCost} XP`, () => {
                this.unlockUnit(typeKey, unlockCost);
            }, xp >= unlockCost);
            card.add(unlockBtn);

            // Lock overlay - match card size
            const lockOverlay = this.add.rectangle(0, 0, 260, 380, 0x000000, 0.5);
            card.add(lockOverlay);

            const lockIcon = this.add.text(0, -60, '🔒', {
                fontSize: '50px'
            }).setOrigin(0.5);
            card.add(lockIcon);
        }

        return card;
    }

    createUnitIcon(container, unitType, isUnlocked) {
        const scale = 1.0; // Matches in-game unit scale
        const alpha = isUnlocked ? 1 : 0.5;

        switch (unitType.toUpperCase()) {
            case 'PEASANT':
                this.createPeasantIcon(container, scale, alpha);
                break;
            case 'ARCHER':
                this.createArcherIcon(container, scale, alpha);
                break;
            case 'HORSEMAN':
                this.createHorsemanIcon(container, scale, alpha);
                break;
        }
    }

    createPeasantIcon(container, scale, alpha) {
        // SIMPLE SWORD ICON
        const s = scale;

        // Blade
        const blade = this.add.rectangle(0, -8 * s, 8 * s, 36 * s, 0xC0C0C0);
        blade.setAlpha(alpha);
        container.add(blade);
        const bladeShine = this.add.rectangle(1 * s, -8 * s, 4 * s, 32 * s, 0xE8E8E8);
        bladeShine.setAlpha(alpha);
        container.add(bladeShine);
        // Blade tip
        const tip = this.add.rectangle(0, -28 * s, 6 * s, 8 * s, 0xD0D0D0);
        tip.setAlpha(alpha);
        container.add(tip);
        // Cross guard (gold)
        const crossguard = this.add.rectangle(0, 12 * s, 24 * s, 6 * s, 0xFFD700);
        crossguard.setAlpha(alpha);
        container.add(crossguard);
        const crossguardHighlight = this.add.rectangle(0, 12 * s, 20 * s, 4 * s, 0xFFEE44);
        crossguardHighlight.setAlpha(alpha);
        container.add(crossguardHighlight);
        // Handle (brown leather)
        const handle = this.add.rectangle(0, 22 * s, 6 * s, 14 * s, 0x8B4513);
        handle.setAlpha(alpha);
        container.add(handle);
        const wrap1 = this.add.rectangle(0, 20 * s, 4 * s, 3 * s, 0x6B3503);
        wrap1.setAlpha(alpha);
        container.add(wrap1);
        const wrap2 = this.add.rectangle(0, 24 * s, 4 * s, 3 * s, 0x6B3503);
        wrap2.setAlpha(alpha);
        container.add(wrap2);
        // Pommel (gold)
        const pommel = this.add.rectangle(0, 30 * s, 8 * s, 6 * s, 0xFFD700);
        pommel.setAlpha(alpha);
        container.add(pommel);
    }

    createArcherIcon(container, scale, alpha) {
        // BOW & ARROW - arrow points RIGHT
        const s = scale;

        // Bow on left side
        const bow1 = this.add.rectangle(-12 * s, -16 * s, 6 * s, 12 * s, 0x8B4513);
        bow1.setAngle(20);
        bow1.setAlpha(alpha);
        container.add(bow1);
        const bow2 = this.add.rectangle(-16 * s, -6 * s, 6 * s, 14 * s, 0x8B4513);
        bow2.setAngle(10);
        bow2.setAlpha(alpha);
        container.add(bow2);
        const bow3 = this.add.rectangle(-18 * s, 0, 6 * s, 10 * s, 0x9B5523);
        bow3.setAlpha(alpha);
        container.add(bow3);
        const bow4 = this.add.rectangle(-16 * s, 6 * s, 6 * s, 14 * s, 0x8B4513);
        bow4.setAngle(-10);
        bow4.setAlpha(alpha);
        container.add(bow4);
        const bow5 = this.add.rectangle(-12 * s, 16 * s, 6 * s, 12 * s, 0x8B4513);
        bow5.setAngle(-20);
        bow5.setAlpha(alpha);
        container.add(bow5);
        // Bowstring
        const bowstring = this.add.rectangle(-6 * s, 0, 3 * s, 44 * s, 0xEEDDCC);
        bowstring.setAlpha(alpha);
        container.add(bowstring);
        // Arrow pointing right
        const arrow = this.add.rectangle(8 * s, 0, 36 * s, 4 * s, 0x8B6B4A);
        arrow.setAlpha(alpha);
        container.add(arrow);
        // Arrowhead on right
        const arrowhead = this.add.rectangle(28 * s, 0, 10 * s, 10 * s, 0xC0C0C0);
        arrowhead.setAngle(45);
        arrowhead.setAlpha(alpha);
        container.add(arrowhead);
    }

    createHorsemanIcon(container, scale, alpha) {
        // HORSE HEAD PROFILE - facing right
        const s = scale;

        // Neck
        const neck = this.add.rectangle(-6 * s, 12 * s, 14 * s, 22 * s, 0x8B4513);
        neck.setAngle(20);
        neck.setAlpha(alpha);
        container.add(neck);
        // Head
        const head = this.add.rectangle(6 * s, -4 * s, 24 * s, 16 * s, 0x8B4513);
        head.setAlpha(alpha);
        container.add(head);
        // Snout
        const snout = this.add.rectangle(18 * s, 0, 12 * s, 12 * s, 0x7B3503);
        snout.setAlpha(alpha);
        container.add(snout);
        // Forehead
        const forehead = this.add.rectangle(2 * s, -12 * s, 12 * s, 10 * s, 0x8B4513);
        forehead.setAlpha(alpha);
        container.add(forehead);
        // Ear
        const ear = this.add.rectangle(-4 * s, -20 * s, 8 * s, 14 * s, 0x7B3503);
        ear.setAlpha(alpha);
        container.add(ear);
        // Eye
        const eye = this.add.rectangle(8 * s, -4 * s, 5 * s, 5 * s, 0x000000);
        eye.setAlpha(alpha);
        container.add(eye);
        // Mane
        const mane = this.add.rectangle(-14 * s, -4 * s, 10 * s, 24 * s, 0x3B2503);
        mane.setAlpha(alpha);
        container.add(mane);
    }

    createCastleUpgradeCard(x, y, upgrade) {
        const level = this.saveData.castleUpgrades[upgrade.key];
        const card = this.add.container(x, y);
        const isMaxLevel = level >= UPGRADE_CONFIG.maxLevel;

        // Background - sized for slider (same as unit cards)
        const bg = this.add.rectangle(0, 0, 260, 380, 0x333344);
        bg.setStrokeStyle(2, 0x4169E1);
        card.add(bg);

        // Large icon at top
        const iconText = this.add.text(0, -110, upgrade.icon, {
            fontSize: '70px'
        }).setOrigin(0.5);
        card.add(iconText);

        // Name
        const header = this.add.text(0, -30, upgrade.name, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add(header);

        // Level
        const levelText = this.add.text(0, 5, `Level ${level}/${UPGRADE_CONFIG.maxLevel}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Description
        const desc = this.add.text(0, 35, upgrade.desc, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        card.add(desc);

        // Progression display: current -> next
        const currentBonus = this.getCastleBonus(upgrade.key, level);
        const nextBonus = this.getCastleBonus(upgrade.key, level + 1);

        const progressContainer = this.add.container(0, 75);
        const currentText = this.add.text(-15, 0, currentBonus, {
            fontSize: '20px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        progressContainer.add(currentText);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const arrow = this.add.graphics();
            arrow.lineStyle(2, 0x44ff44, 1);
            arrow.moveTo(2, -6);
            arrow.lineTo(9, 0);
            arrow.lineTo(2, 6);
            arrow.moveTo(12, -6);
            arrow.lineTo(19, 0);
            arrow.lineTo(12, 6);
            arrow.strokePath();
            progressContainer.add(arrow);

            const nextText = this.add.text(28, 0, nextBonus, {
                fontSize: '20px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            progressContainer.add(nextText);
        }
        card.add(progressContainer);

        // Upgrade button
        const xp = this.saveData.xp || 0;
        if (level < UPGRADE_CONFIG.maxLevel) {
            const cost = this.calculateCastleUpgradeCost(level, upgrade.key);
            const btn = this.createCardButton(0, 140, `${cost} XP`, () => {
                this.purchaseCastleUpgrade(upgrade.key, cost);
            }, xp >= cost, 150, 55);
            card.add(btn);
        } else {
            const maxText = this.add.text(0, 140, 'MAX', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#ffd700',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        }

        return card;
    }

    createSpecialUpgradeCard(x, y) {
        const card = this.add.container(x, y);

        // Check if already unlocked
        const specialUpgrades = this.saveData.specialUpgrades || {};
        const hasEliteDiscount = specialUpgrades.eliteDiscount || false;

        // Check requirements: all units must be level 5+
        const peasantLevel = this.saveData.upgrades.peasant.level;
        const archerLevel = this.saveData.upgrades.archer.level;
        const horsemanLevel = this.saveData.upgrades.horseman.level;
        const horsemanUnlocked = this.saveData.upgrades.horseman.unlocked;
        const allUnitsLevel5 = peasantLevel >= 5 && archerLevel >= 5 && horsemanUnlocked && horsemanLevel >= 5;

        const xp = this.saveData.xp || 0;
        const eliteDiscountCost = 15;

        // Background - sized for slider with gold border
        const bg = this.add.rectangle(0, 0, 260, 380, hasEliteDiscount ? 0x2a4a2a : 0x2a2a3a);
        bg.setStrokeStyle(3, hasEliteDiscount ? 0x88ff88 : 0xffd700);
        card.add(bg);

        // Crown icon at top
        const iconText = this.add.text(0, -120, '👑', {
            fontSize: '60px'
        }).setOrigin(0.5);
        card.add(iconText);

        // Title
        const cardTitle = this.add.text(0, -50, 'ELITE\nMASTERY', {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#ffd700',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        // Description
        const desc = this.add.text(0, 15, 'Gold tier units\nspawn 2 for 1!', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (hasEliteDiscount) {
            // Already unlocked
            const unlockedText = this.add.text(0, 80, '✓ UNLOCKED', {
                fontSize: '24px',
                fontFamily: 'Arial',
                color: '#88ff88',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(unlockedText);
        } else if (!allUnitsLevel5) {
            // Requirements not met
            const reqTitle = this.add.text(0, 60, 'Requirements:', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffaa00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(reqTitle);

            const peasantStatus = peasantLevel >= 5 ? '✓' : '✗';
            const archerStatus = archerLevel >= 5 ? '✓' : '✗';
            const horsemanStatus = (horsemanUnlocked && horsemanLevel >= 5) ? '✓' : '✗';
            const peasantColor = peasantLevel >= 5 ? '#88ff88' : '#ff8888';
            const archerColor = archerLevel >= 5 ? '#88ff88' : '#ff8888';
            const horsemanColor = (horsemanUnlocked && horsemanLevel >= 5) ? '#88ff88' : '#ff8888';

            const req1 = this.add.text(0, 85, `${peasantStatus} Peasant L${peasantLevel}/5`, {
                fontSize: '14px', fontFamily: 'Arial', color: peasantColor
            }).setOrigin(0.5);
            const req2 = this.add.text(0, 105, `${archerStatus} Archer L${archerLevel}/5`, {
                fontSize: '14px', fontFamily: 'Arial', color: archerColor
            }).setOrigin(0.5);
            const req3 = this.add.text(0, 125, `${horsemanStatus} Horseman ${horsemanUnlocked ? 'L' + horsemanLevel + '/5' : '🔒'}`, {
                fontSize: '14px', fontFamily: 'Arial', color: horsemanColor
            }).setOrigin(0.5);
            card.add(req1);
            card.add(req2);
            card.add(req3);
        } else {
            // Can purchase
            const canAfford = xp >= eliteDiscountCost;
            const btn = this.createCardButton(0, 100, `Unlock\n${eliteDiscountCost} XP`, () => {
                this.purchaseEliteDiscount(eliteDiscountCost);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    purchaseEliteDiscount(cost) {
        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades.eliteDiscount = true;
            saveSystem.save(this.saveData);

            // Refresh scene
            this.scene.restart();
        }
    }

    createCardButton(x, y, text, callback, enabled, width = 150, height = 55) {
        const container = this.add.container(x, y);

        // Enabled buttons are much brighter (green/gold) to show they're affordable
        const bgColor = enabled ? 0x44AA44 : 0x444444;
        const strokeColor = enabled ? 0x88FF88 : 0x555555;
        const bg = this.add.rectangle(0, 0, width, height, bgColor);
        bg.setStrokeStyle(enabled ? 3 : 2, strokeColor);
        container.add(bg);

        const label = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
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
        // Popping close button in top-left corner (outside panel style)
        const btn = this.add.container(35, 35);

        // Background circle that pops out
        const bg = this.add.circle(0, 0, 28, 0x442222);
        bg.setStrokeStyle(3, 0xff4444);
        bg.setInteractive({ useHandCursor: true });
        btn.add(bg);

        const label = this.add.text(0, 0, '✕', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff6666'
        }).setOrigin(0.5);
        btn.add(label);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x663333);
            label.setColor('#ff8888');
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x442222);
            label.setColor('#ff6666');
        });

        bg.on('pointerdown', () => {
            if (typeof audioManager !== 'undefined') {
                audioManager.playClick();
            }
            this.scene.start('MenuScene');
        });

        btn.setDepth(100);
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
                return `+${bonus * 10}% SPD`;
            default:
                return '';
        }
    }

    calculateUpgradeCost(unitKey, currentLevel) {
        // XP costs: starts at 1, increases slowly
        // Level 1->2 = 1 XP, Level 2->3 = 2 XP, etc.
        return currentLevel;
    }

    calculateCastleUpgradeCost(currentLevel, upgradeKey = null) {
        // XP costs: 1, 2, 3, 4, 5...
        let cost = currentLevel;

        // Mining speed costs 2x to slow early game progression
        if (upgradeKey === 'goldIncome') {
            cost = cost * 2;
        }

        return cost;
    }

    getUnlockCost(unitKey) {
        // XP costs for unlocking units
        const costs = {
            horseman: 2
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
