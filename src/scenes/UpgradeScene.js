// Upgrade Scene - Unit and castle upgrades with proper unit icons
class UpgradeScene extends Phaser.Scene {
    constructor() {
        super({ key: 'UpgradeScene' });
    }

    create(data) {
        this.saveData = saveSystem.load();
        this.sessionValid = true; // Assume valid, will be updated by validation
        this.upgradeThrottled = false; // Throttle for upgrade clicks
        this.startCardIndex = data?.startCardIndex || 0; // Remember card position on restart

        // Validate session for logged-in users
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn()) {
            this.validateSession();
        }

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
            { type: 'castleExtension' },
            { type: 'castle', upgrade: { key: 'armor', name: 'Castle Armor', desc: '-5% damage taken', icon: '🛡️' } },
            { type: 'castle', upgrade: { key: 'goldIncome', name: 'Mining Speed', desc: '+10% mining speed', icon: '💰' } },
            { type: 'special' },
            { type: 'horsemanShield' },
            // New multi-level special upgrades
            { type: 'productionSpeed' },
            { type: 'productionCost' },
            { type: 'unitSpeed' },
            { type: 'reinforcements' },
            { type: 'peasantPromoSkip' },
            { type: 'archerPromoSkip' },
            { type: 'horsemanPromoSkip' },
            { type: 'castleEmergency' },
            { type: 'smarterUnits' }
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
            } else if (cardData.type === 'horsemanShield') {
                card = this.createHorsemanShieldCard(x, y);
            } else if (cardData.type === 'productionSpeed') {
                card = this.createMultiLevelCard(x, y, 'productionSpeed', '⚡', 'PRODUCTION\nSPEED', '-5% spawn time', 10, 3);
            } else if (cardData.type === 'productionCost') {
                card = this.createMultiLevelCard(x, y, 'productionCost', '💎', 'PRODUCTION\nCOST', '-5% unit cost', 10, 3);
            } else if (cardData.type === 'unitSpeed') {
                card = this.createMultiLevelCard(x, y, 'unitSpeed', '🏃', 'UNIT\nSPEED', '+5% movement', 10, 3);
            } else if (cardData.type === 'reinforcements') {
                card = this.createReinforcementsCard(x, y);
            } else if (cardData.type === 'peasantPromoSkip') {
                card = this.createPromoSkipCard(x, y, 'peasant', '🗡️', 0xD4A855);
            } else if (cardData.type === 'archerPromoSkip') {
                card = this.createPromoSkipCard(x, y, 'archer', '🏹', 0x228B22);
            } else if (cardData.type === 'horsemanPromoSkip') {
                card = this.createPromoSkipCard(x, y, 'horseman', '🐴', 0x8B4513);
            } else if (cardData.type === 'castleExtension') {
                card = this.createCastleExtensionCard(x, y);
            } else if (cardData.type === 'castleEmergency') {
                card = this.createCastleEmergencyCard(x, y);
            } else if (cardData.type === 'smarterUnits') {
                card = this.createSmarterUnitsCard(x, y);
            }

            // Store card index on the container for button validation
            card.cardIndex = index;
            this.cardContainers.push(card);
            this.sliderContainer.add(card);
        });

        // Create navigation dots
        this.createNavigationDots();

        // Setup drag/swipe
        this.setupDrag();

        // Position slider to show starting card (or first if no previous position)
        this.slideToCard(this.startCardIndex, false);
    }

    createNavigationDots() {
        this.dots = [];
        const dotSpacing = 20;
        const dotSize = 10;
        const y = GAME_HEIGHT - 50;
        const startX = GAME_WIDTH / 2 - (this.totalCards - 1) * dotSpacing / 2;

        // Horizontal dots at bottom
        for (let i = 0; i < this.totalCards; i++) {
            const dot = this.add.circle(startX + i * dotSpacing, y, dotSize / 2, i === 0 ? 0xffd700 : 0x444444);
            dot.setStrokeStyle(1, i === 0 ? 0xffee88 : 0x666666);
            dot.setInteractive({ useHandCursor: true });
            dot.on('pointerdown', () => this.slideToCard(i));
            dot.on('pointerover', () => {
                if (i !== this.currentCardIndex) {
                    dot.setFillStyle(0x666666);
                }
            });
            dot.on('pointerout', () => {
                if (i !== this.currentCardIndex) {
                    dot.setFillStyle(0x444444);
                }
            });
            this.dots.push(dot);
        }

        // Left arrow - visible button
        this.leftArrow = this.add.text(40, GAME_HEIGHT / 2, '‹', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.6).setDepth(100);
        this.leftArrow.setInteractive({ useHandCursor: true });
        this.leftArrow.on('pointerdown', () => {
            if (this.currentCardIndex > 0) {
                if (typeof audioManager !== 'undefined') audioManager.playClick();
                this.slideToCard(this.currentCardIndex - 1);
            }
        });
        this.leftArrow.on('pointerover', () => this.leftArrow.setAlpha(1));
        this.leftArrow.on('pointerout', () => this.leftArrow.setAlpha(0.6));

        // Right arrow - visible button
        this.rightArrow = this.add.text(GAME_WIDTH - 40, GAME_HEIGHT / 2, '›', {
            fontSize: '80px',
            fontFamily: 'Arial',
            color: '#ffffff'
        }).setOrigin(0.5).setAlpha(0.6).setDepth(100);
        this.rightArrow.setInteractive({ useHandCursor: true });
        this.rightArrow.on('pointerdown', () => {
            if (this.currentCardIndex < this.totalCards - 1) {
                if (typeof audioManager !== 'undefined') audioManager.playClick();
                this.slideToCard(this.currentCardIndex + 1);
            }
        });
        this.rightArrow.on('pointerover', () => this.rightArrow.setAlpha(1));
        this.rightArrow.on('pointerout', () => this.rightArrow.setAlpha(0.6));

        // Card label at bottom (above dots)
        this.cardLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 75, '', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#888888'
        }).setOrigin(0.5);
        this.updateCardLabel();
    }

    updateCardLabel() {
        const labels = [
            'Peasant', 'Archer', 'Horseman', 'Health', 'Armor', 'Mining', 'Special', 'Shield',
            'Prod Speed', 'Prod Cost', 'Unit Speed', 'Reinforce', 'Reinf Lvl',
            'Peasant Skip', 'Archer Skip', 'Horse Skip', 'Castle Ext', 'Emergency', 'Tactics'
        ];
        this.cardLabel.setText(labels[this.currentCardIndex] || '');
    }

    updateDots() {
        this.dots.forEach((pill, i) => {
            pill.setFillStyle(i === this.currentCardIndex ? 0xffd700 : 0x444444);
            pill.setStrokeStyle(1, i === this.currentCardIndex ? 0xffee88 : 0x666666);
        });
        this.updateCardLabel();
    }

    setupDrag() {
        // Simplified swipe - move 3 cards at a time
        let startX = 0;
        let startTime = 0;
        let isDragging = false;
        let hasMoved = false;
        const swipeThreshold = 50; // Minimum pixels to trigger swipe
        const cardsPerSwipe = 3;   // Move 3 cards at a time

        this.input.on('pointerdown', (pointer) => {
            // Only start drag if in the slider area (y between 100 and 520)
            if (pointer.y < 100 || pointer.y > 520) return;

            // Don't start drag if clicking on arrow areas (left 70px or right 80px)
            if (pointer.x < 70 || pointer.x > GAME_WIDTH - 80) return;

            startX = pointer.x;
            startTime = Date.now();
            isDragging = true;
            hasMoved = false;
        });

        this.input.on('pointermove', (pointer) => {
            if (!isDragging) return;

            const deltaX = pointer.x - startX;

            // Only mark as moved after passing threshold (allows button clicks)
            if (Math.abs(deltaX) > 10) {
                hasMoved = true;
            }
        });

        this.input.on('pointerup', (pointer) => {
            if (!isDragging) return;
            isDragging = false;

            // If we didn't actually drag, don't process (allow button click)
            if (!hasMoved) return;

            const deltaX = pointer.x - startX;
            const elapsed = Date.now() - startTime;

            // Determine swipe direction and move 3 cards
            let targetIndex = this.currentCardIndex;

            if (Math.abs(deltaX) > swipeThreshold || (elapsed < 300 && Math.abs(deltaX) > 30)) {
                // Swipe detected
                if (deltaX < 0) {
                    // Swipe left - go forward 3 cards
                    targetIndex = Math.min(this.currentCardIndex + cardsPerSwipe, this.totalCards - 1);
                } else {
                    // Swipe right - go back 3 cards
                    targetIndex = Math.max(this.currentCardIndex - cardsPerSwipe, 0);
                }
            }

            this.slideToCard(targetIndex);
        });
    }

    slideToCard(index, animate = true) {
        this.currentCardIndex = Phaser.Math.Clamp(index, 0, this.totalCards - 1);
        const targetX = -this.currentCardIndex * (this.cardWidth + this.cardSpacing);

        if (animate) {
            // Smooth animation with consistent timing
            this.tweens.killTweensOf(this.sliderContainer);
            this.tweens.add({
                targets: this.sliderContainer,
                x: targetX,
                duration: 350,
                ease: 'Cubic.easeOut'
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
        // PEASANT - Clean angular farmer with sword (larger scale for upgrade cards)
        const s = scale * 1.5;

        // Shadow
        const shadow = this.add.rectangle(0, 36 * s, 30 * s, 6 * s, 0x000000, 0.3);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Legs
        const leftLeg = this.add.rectangle(-6 * s, 24 * s, 9 * s, 21 * s, 0x7A5230);
        leftLeg.setAlpha(alpha);
        container.add(leftLeg);
        const rightLeg = this.add.rectangle(6 * s, 24 * s, 9 * s, 21 * s, 0x8A6240);
        rightLeg.setAlpha(alpha);
        container.add(rightLeg);
        // Boots
        const leftBoot = this.add.rectangle(-6 * s, 33 * s, 12 * s, 9 * s, 0x4A3020);
        leftBoot.setAlpha(alpha);
        container.add(leftBoot);
        const rightBoot = this.add.rectangle(6 * s, 33 * s, 12 * s, 9 * s, 0x5A4030);
        rightBoot.setAlpha(alpha);
        container.add(rightBoot);

        // Body - tan tunic
        const body = this.add.rectangle(0, 6 * s, 27 * s, 27 * s, 0xD4A855);
        body.setAlpha(alpha);
        container.add(body);
        const bodyHighlight = this.add.rectangle(0, 6 * s, 21 * s, 21 * s, 0xE4B865);
        bodyHighlight.setAlpha(alpha);
        container.add(bodyHighlight);
        // Belt
        const belt = this.add.rectangle(0, 16 * s, 30 * s, 6 * s, 0x6B4423);
        belt.setAlpha(alpha);
        container.add(belt);
        const buckle = this.add.rectangle(0, 16 * s, 7 * s, 7 * s, 0xD4A020);
        buckle.setAlpha(alpha);
        container.add(buckle);

        // Arms
        const leftArm = this.add.rectangle(-16 * s, 6 * s, 9 * s, 18 * s, 0xE4B865);
        leftArm.setAlpha(alpha);
        container.add(leftArm);
        const rightArm = this.add.rectangle(16 * s, 6 * s, 9 * s, 18 * s, 0xD4A855);
        rightArm.setAlpha(alpha);
        container.add(rightArm);
        // Hands
        const leftHand = this.add.rectangle(-16 * s, 18 * s, 9 * s, 9 * s, 0xF5CBA7);
        leftHand.setAlpha(alpha);
        container.add(leftHand);
        const rightHand = this.add.rectangle(16 * s, 18 * s, 9 * s, 9 * s, 0xF5CBA7);
        rightHand.setAlpha(alpha);
        container.add(rightHand);

        // Head
        const head = this.add.rectangle(0, -18 * s, 27 * s, 27 * s, 0xF5CBA7);
        head.setAlpha(alpha);
        container.add(head);
        const headHighlight = this.add.rectangle(1 * s, -18 * s, 21 * s, 21 * s, 0xFFDDBB);
        headHighlight.setAlpha(alpha);
        container.add(headHighlight);
        // Hair - brown
        const hair = this.add.rectangle(0, -33 * s, 30 * s, 15 * s, 0x8B5A2B);
        hair.setAlpha(alpha);
        container.add(hair);
        const hairLeft = this.add.rectangle(-7 * s, -30 * s, 9 * s, 9 * s, 0x7B4A1B);
        hairLeft.setAlpha(alpha);
        container.add(hairLeft);
        const hairRight = this.add.rectangle(7 * s, -30 * s, 9 * s, 9 * s, 0x9B6A3B);
        hairRight.setAlpha(alpha);
        container.add(hairRight);
        // Eyes
        const leftEye = this.add.rectangle(-6 * s, -18 * s, 6 * s, 6 * s, 0x3A2010);
        leftEye.setAlpha(alpha);
        container.add(leftEye);
        const rightEye = this.add.rectangle(6 * s, -18 * s, 6 * s, 6 * s, 0x3A2010);
        rightEye.setAlpha(alpha);
        container.add(rightEye);

        // Sword (held at right side)
        const blade = this.add.rectangle(27 * s, -6 * s, 7 * s, 36 * s, 0xC0C0C0);
        blade.setAlpha(alpha);
        container.add(blade);
        const bladeShine = this.add.rectangle(28 * s, -6 * s, 3 * s, 30 * s, 0xE8E8E8);
        bladeShine.setAlpha(alpha);
        container.add(bladeShine);
        const crossguard = this.add.rectangle(27 * s, 15 * s, 18 * s, 6 * s, 0xD4A020);
        crossguard.setAlpha(alpha);
        container.add(crossguard);
        const hilt = this.add.rectangle(27 * s, 22 * s, 6 * s, 12 * s, 0x6B4423);
        hilt.setAlpha(alpha);
        container.add(hilt);
    }

    createArcherIcon(container, scale, alpha) {
        // ARCHER - Hooded ranger with bow (larger scale for upgrade cards)
        const s = scale * 1.5;

        // Shadow
        const shadow = this.add.rectangle(0, 33 * s, 27 * s, 6 * s, 0x000000, 0.3);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Legs - green
        const leftLeg = this.add.rectangle(-6 * s, 21 * s, 9 * s, 18 * s, 0x2D5A30);
        leftLeg.setAlpha(alpha);
        container.add(leftLeg);
        const rightLeg = this.add.rectangle(6 * s, 21 * s, 9 * s, 18 * s, 0x3D6A40);
        rightLeg.setAlpha(alpha);
        container.add(rightLeg);
        // Boots
        const leftBoot = this.add.rectangle(-6 * s, 30 * s, 12 * s, 9 * s, 0x5A3A20);
        leftBoot.setAlpha(alpha);
        container.add(leftBoot);
        const rightBoot = this.add.rectangle(6 * s, 30 * s, 12 * s, 9 * s, 0x6A4A30);
        rightBoot.setAlpha(alpha);
        container.add(rightBoot);

        // Body - forest green tunic
        const body = this.add.rectangle(0, 3 * s, 24 * s, 24 * s, 0x2E7D32);
        body.setAlpha(alpha);
        container.add(body);
        const bodyHighlight = this.add.rectangle(0, 3 * s, 18 * s, 18 * s, 0x43A047);
        bodyHighlight.setAlpha(alpha);
        container.add(bodyHighlight);
        // Belt
        const belt = this.add.rectangle(0, 12 * s, 27 * s, 4 * s, 0x5D4037);
        belt.setAlpha(alpha);
        container.add(belt);

        // Arms
        const leftArm = this.add.rectangle(-15 * s, 3 * s, 7 * s, 18 * s, 0x43A047);
        leftArm.setAlpha(alpha);
        container.add(leftArm);
        const rightArm = this.add.rectangle(15 * s, 3 * s, 7 * s, 18 * s, 0x2E7D32);
        rightArm.setAlpha(alpha);
        container.add(rightArm);
        // Hands
        const leftHand = this.add.rectangle(-15 * s, 15 * s, 7 * s, 7 * s, 0xF5CBA7);
        leftHand.setAlpha(alpha);
        container.add(leftHand);
        const rightHand = this.add.rectangle(15 * s, 15 * s, 7 * s, 7 * s, 0xF5CBA7);
        rightHand.setAlpha(alpha);
        container.add(rightHand);

        // Hood
        const hood = this.add.rectangle(0, -15 * s, 30 * s, 24 * s, 0x1B5E20);
        hood.setAlpha(alpha);
        container.add(hood);
        const hoodMid = this.add.rectangle(0, -27 * s, 21 * s, 12 * s, 0x2E7D32);
        hoodMid.setAlpha(alpha);
        container.add(hoodMid);
        const hoodTop = this.add.rectangle(0, -33 * s, 12 * s, 9 * s, 0x388E3C);
        hoodTop.setAlpha(alpha);
        container.add(hoodTop);

        // Face under hood
        const face = this.add.rectangle(0, -9 * s, 18 * s, 15 * s, 0xF5CBA7);
        face.setAlpha(alpha);
        container.add(face);
        // Eyes - green
        const leftEye = this.add.rectangle(-4 * s, -9 * s, 4 * s, 4 * s, 0x2E7D32);
        leftEye.setAlpha(alpha);
        container.add(leftEye);
        const rightEye = this.add.rectangle(4 * s, -9 * s, 4 * s, 4 * s, 0x2E7D32);
        rightEye.setAlpha(alpha);
        container.add(rightEye);

        // Bow (held at right side)
        const bowTop = this.add.rectangle(25 * s, -18 * s, 6 * s, 15 * s, 0x795548);
        bowTop.setAlpha(alpha);
        container.add(bowTop);
        const bowMid = this.add.rectangle(27 * s, -6 * s, 6 * s, 9 * s, 0x8D6E63);
        bowMid.setAlpha(alpha);
        container.add(bowMid);
        const bowGrip = this.add.rectangle(28 * s, 3 * s, 7 * s, 9 * s, 0x8D6E63);
        bowGrip.setAlpha(alpha);
        container.add(bowGrip);
        const bowMid2 = this.add.rectangle(27 * s, 12 * s, 6 * s, 9 * s, 0x8D6E63);
        bowMid2.setAlpha(alpha);
        container.add(bowMid2);
        const bowBottom = this.add.rectangle(25 * s, 21 * s, 6 * s, 15 * s, 0x795548);
        bowBottom.setAlpha(alpha);
        container.add(bowBottom);
        // String
        const string = this.add.rectangle(21 * s, 0, 3 * s, 45 * s, 0xE0E0E0);
        string.setAlpha(alpha);
        container.add(string);

        // Quiver on back
        const quiver = this.add.rectangle(-21 * s, 0, 9 * s, 27 * s, 0x6D5047);
        quiver.setAlpha(alpha);
        container.add(quiver);
        const arrow1 = this.add.rectangle(-21 * s, -12 * s, 3 * s, 9 * s, 0xE53935);
        arrow1.setAlpha(alpha);
        container.add(arrow1);
        const arrow2 = this.add.rectangle(-18 * s, -12 * s, 3 * s, 9 * s, 0xFDD835);
        arrow2.setAlpha(alpha);
        container.add(arrow2);
    }

    createHorsemanIcon(container, scale, alpha) {
        // HORSEMAN - Mounted cavalry with rider (larger scale for upgrade cards)
        const s = scale * 1.2;

        // Shadow
        const shadow = this.add.rectangle(0, 42 * s, 54 * s, 6 * s, 0x000000, 0.3);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Horse legs
        const backLeftLeg = this.add.rectangle(-15 * s, 30 * s, 9 * s, 21 * s, 0x6D4C30);
        backLeftLeg.setAlpha(alpha);
        container.add(backLeftLeg);
        const frontLeftLeg = this.add.rectangle(15 * s, 30 * s, 9 * s, 21 * s, 0x7D5C40);
        frontLeftLeg.setAlpha(alpha);
        container.add(frontLeftLeg);
        // Hooves
        const backHoof = this.add.rectangle(-15 * s, 39 * s, 9 * s, 6 * s, 0x3D2C10);
        backHoof.setAlpha(alpha);
        container.add(backHoof);
        const frontHoof = this.add.rectangle(15 * s, 39 * s, 9 * s, 6 * s, 0x4D3C20);
        frontHoof.setAlpha(alpha);
        container.add(frontHoof);

        // Horse body - brown
        const horseBody = this.add.rectangle(0, 15 * s, 51 * s, 27 * s, 0x8B5A2B);
        horseBody.setAlpha(alpha);
        container.add(horseBody);
        const horseHighlight = this.add.rectangle(0, 12 * s, 42 * s, 21 * s, 0x9B6A3B);
        horseHighlight.setAlpha(alpha);
        container.add(horseHighlight);

        // Horse tail
        const tail = this.add.rectangle(-27 * s, 18 * s, 6 * s, 18 * s, 0x3D2C10);
        tail.setAlpha(alpha);
        container.add(tail);

        // Horse neck and head
        const neck = this.add.rectangle(24 * s, 3 * s, 15 * s, 24 * s, 0x8B5A2B);
        neck.setAlpha(alpha);
        container.add(neck);
        const head = this.add.rectangle(36 * s, -6 * s, 21 * s, 15 * s, 0x9B6A3B);
        head.setAlpha(alpha);
        container.add(head);
        const snout = this.add.rectangle(45 * s, -3 * s, 12 * s, 12 * s, 0x8B5A2B);
        snout.setAlpha(alpha);
        container.add(snout);
        // Horse ear
        const ear = this.add.rectangle(33 * s, -18 * s, 6 * s, 12 * s, 0x7B4A1B);
        ear.setAlpha(alpha);
        container.add(ear);
        // Horse eye
        const horseEye = this.add.rectangle(36 * s, -6 * s, 4 * s, 4 * s, 0x000000);
        horseEye.setAlpha(alpha);
        container.add(horseEye);
        // Mane
        const mane = this.add.rectangle(21 * s, -6 * s, 6 * s, 18 * s, 0x3D2C10);
        mane.setAlpha(alpha);
        container.add(mane);

        // Saddle
        const saddle = this.add.rectangle(0, 3 * s, 24 * s, 15 * s, 0x5D4037);
        saddle.setAlpha(alpha);
        container.add(saddle);
        const saddleTop = this.add.rectangle(0, 0, 18 * s, 9 * s, 0x6D5047);
        saddleTop.setAlpha(alpha);
        container.add(saddleTop);

        // Rider body - blue armor
        const riderBody = this.add.rectangle(0, -18 * s, 21 * s, 24 * s, 0x1565C0);
        riderBody.setAlpha(alpha);
        container.add(riderBody);
        const riderHighlight = this.add.rectangle(0, -15 * s, 15 * s, 18 * s, 0x1E88E5);
        riderHighlight.setAlpha(alpha);
        container.add(riderHighlight);

        // Rider arms
        const leftArm = this.add.rectangle(-12 * s, -12 * s, 6 * s, 15 * s, 0xF5CBA7);
        leftArm.setAlpha(alpha);
        container.add(leftArm);
        const rightArm = this.add.rectangle(12 * s, -12 * s, 6 * s, 15 * s, 0xF5CBA7);
        rightArm.setAlpha(alpha);
        container.add(rightArm);

        // Rider head with helmet
        const riderHead = this.add.rectangle(0, -36 * s, 18 * s, 18 * s, 0xF5CBA7);
        riderHead.setAlpha(alpha);
        container.add(riderHead);
        const helmet = this.add.rectangle(0, -45 * s, 21 * s, 15 * s, 0x607D8B);
        helmet.setAlpha(alpha);
        container.add(helmet);
        const helmetHighlight = this.add.rectangle(0, -42 * s, 15 * s, 9 * s, 0x78909C);
        helmetHighlight.setAlpha(alpha);
        container.add(helmetHighlight);
        // Eyes
        const riderLeftEye = this.add.rectangle(-3 * s, -36 * s, 4 * s, 4 * s, 0x263238);
        riderLeftEye.setAlpha(alpha);
        container.add(riderLeftEye);
        const riderRightEye = this.add.rectangle(6 * s, -36 * s, 4 * s, 4 * s, 0x263238);
        riderRightEye.setAlpha(alpha);
        container.add(riderRightEye);

        // Sword (held at right)
        const blade = this.add.rectangle(24 * s, -27 * s, 6 * s, 33 * s, 0xC0C0C0);
        blade.setAlpha(alpha);
        container.add(blade);
        const bladeShine = this.add.rectangle(25 * s, -27 * s, 3 * s, 27 * s, 0xE0E0E0);
        bladeShine.setAlpha(alpha);
        container.add(bladeShine);
        const crossguard = this.add.rectangle(24 * s, -9 * s, 15 * s, 6 * s, 0xD4A020);
        crossguard.setAlpha(alpha);
        container.add(crossguard);
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

        // Check requirements: all units must be level 6+
        const peasantLevel = this.saveData.upgrades.peasant.level;
        const archerLevel = this.saveData.upgrades.archer.level;
        const horsemanLevel = this.saveData.upgrades.horseman.level;
        const horsemanUnlocked = this.saveData.upgrades.horseman.unlocked;
        const allUnitsLevel6 = peasantLevel >= 6 && archerLevel >= 6 && horsemanUnlocked && horsemanLevel >= 6;

        const xp = this.saveData.xp || 0;
        const eliteDiscountCost = 50;

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
        const cardTitle = this.add.text(0, -50, 'HALF PRICE\nGOLD TIER', {
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
        } else if (!allUnitsLevel6) {
            // Requirements not met
            const reqTitle = this.add.text(0, 60, 'Requirements:', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffaa00',
                fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(reqTitle);

            const peasantStatus = peasantLevel >= 6 ? '✓' : '✗';
            const archerStatus = archerLevel >= 6 ? '✓' : '✗';
            const horsemanStatus = (horsemanUnlocked && horsemanLevel >= 6) ? '✓' : '✗';
            const peasantColor = peasantLevel >= 6 ? '#88ff88' : '#ff8888';
            const archerColor = archerLevel >= 6 ? '#88ff88' : '#ff8888';
            const horsemanColor = (horsemanUnlocked && horsemanLevel >= 6) ? '#88ff88' : '#ff8888';

            const req1 = this.add.text(0, 85, `${peasantStatus} Peasant L${peasantLevel}/6`, {
                fontSize: '14px', fontFamily: 'Arial', color: peasantColor
            }).setOrigin(0.5);
            const req2 = this.add.text(0, 105, `${archerStatus} Archer L${archerLevel}/6`, {
                fontSize: '14px', fontFamily: 'Arial', color: archerColor
            }).setOrigin(0.5);
            const req3 = this.add.text(0, 125, `${horsemanStatus} Horseman ${horsemanUnlocked ? 'L' + horsemanLevel + '/6' : '🔒'}`, {
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

    createHorsemanShieldCard(x, y) {
        const card = this.add.container(x, y);

        const specialUpgrades = this.saveData.specialUpgrades || {};
        const currentLevel = specialUpgrades.horsemanShield || 0;
        const maxLevel = 5;
        const isMaxLevel = currentLevel >= maxLevel;

        // Check requirements: horseman must be unlocked
        const horsemanUnlocked = this.saveData.upgrades.horseman.unlocked;

        const xp = this.saveData.xp || 0;
        // Cost: 10, 20, 30, 40, 50 XP per level
        const costs = [10, 20, 30, 40, 50];
        const cost = costs[currentLevel] || 50;

        // Background - sized for slider with blue/steel border
        const bg = this.add.rectangle(0, 0, 260, 380, isMaxLevel ? 0x2a4a4a : 0x2a3a4a);
        bg.setStrokeStyle(3, isMaxLevel ? 0x88ffff : 0x4488ff);
        card.add(bg);

        // Shield icon at top
        const iconText = this.add.text(0, -120, '🛡️', {
            fontSize: '60px'
        }).setOrigin(0.5);
        card.add(iconText);

        // Title
        const cardTitle = this.add.text(0, -55, 'HORSEMAN\nSHIELD', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#4488ff',
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        // Level display
        const levelText = this.add.text(0, 0, `Level ${currentLevel}/${maxLevel}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        card.add(levelText);

        // Current bonus
        const bonusPercent = currentLevel * 10;
        const bonusText = this.add.text(0, 30, `Damage reduction: ${bonusPercent}%`, {
            fontSize: '16px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(0.5);
        card.add(bonusText);

        // Description
        const desc = this.add.text(0, 60, '+10% per level\n(visual shield added)', {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa', align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (isMaxLevel) {
            const maxText = this.add.text(0, 120, 'MAX LEVEL', {
                fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        } else if (!horsemanUnlocked) {
            // Requirements not met
            const reqTitle = this.add.text(0, 100, 'Requirements:', {
                fontSize: '14px', fontFamily: 'Arial', color: '#ffaa00', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(reqTitle);

            const req1 = this.add.text(0, 125, '✗ Unlock Horseman first', {
                fontSize: '14px', fontFamily: 'Arial', color: '#ff8888'
            }).setOrigin(0.5);
            card.add(req1);
        } else {
            // Can purchase
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 120, `Upgrade\n${cost} XP`, () => {
                this.purchaseHorsemanShield(cost);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    purchaseHorsemanShield(cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const currentLevel = this.saveData.specialUpgrades?.horsemanShield || 0;
        if (currentLevel >= 5) return;

        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades.horsemanShield = currentLevel + 1;
            saveSystem.save(this.saveData);
            this.syncToCloud();

            // Show notification and refresh scene (staying at current card)
            this.showUpgradeNotification(`Horseman Shield → Level ${currentLevel + 1}`);
        }
    }

    // Generic multi-level upgrade card
    createCastleExtensionCard(x, y) {
        const card = this.add.container(x, y);
        const specialUpgrades = this.saveData.specialUpgrades || {};
        const currentLevel = specialUpgrades.castleExtension || 0;
        const maxLevel = 10;
        const costPerLevel = 5;
        const isMaxLevel = currentLevel >= maxLevel;
        const xp = this.saveData.xp || 0;
        const cost = costPerLevel * (currentLevel + 1);

        // Check if castle health is level 5+ (required to unlock)
        const castleHealthLevel = this.saveData.castleUpgrades?.health || 1;
        const isLocked = castleHealthLevel < 5;

        // Background
        const bgColor = isLocked ? 0x1a1a2a : (isMaxLevel ? 0x2a4a2a : 0x2a2a4a);
        const borderColor = isLocked ? 0x444466 : (isMaxLevel ? 0x88ff88 : 0x6688ff);
        const bg = this.add.rectangle(0, 0, 260, 380, bgColor);
        bg.setStrokeStyle(3, borderColor);
        card.add(bg);

        // Icon
        const iconText = this.add.text(0, -120, '🏰', { fontSize: '60px' }).setOrigin(0.5);
        if (isLocked) iconText.setAlpha(0.5);
        card.add(iconText);

        // Title
        const cardTitle = this.add.text(0, -50, 'CASTLE\nEXTENSION', {
            fontSize: '22px', fontFamily: 'Arial', color: isLocked ? '#666688' : '#6688ff',
            fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        if (isLocked) {
            // Lock icon
            const lockIcon = this.add.text(0, 20, '🔒', { fontSize: '40px' }).setOrigin(0.5);
            card.add(lockIcon);

            // Requirement text
            const reqText = this.add.text(0, 80, 'Requires:\nCastle Health Lv.5', {
                fontSize: '16px', fontFamily: 'Arial', color: '#ff8888',
                align: 'center'
            }).setOrigin(0.5);
            card.add(reqText);

            // Current castle health
            const currentText = this.add.text(0, 130, `Current: Lv.${castleHealthLevel}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#888888'
            }).setOrigin(0.5);
            card.add(currentText);
        } else {
            // Level display
            const levelText = this.add.text(0, 0, `Level ${currentLevel}/${maxLevel}`, {
                fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
            }).setOrigin(0.5);
            card.add(levelText);

            // Current bonus
            const bonusLevels = currentLevel * 5;
            const bonusText = this.add.text(0, 30, `Current: +${bonusLevels} max levels`, {
                fontSize: '16px', fontFamily: 'Arial', color: '#88ff88'
            }).setOrigin(0.5);
            card.add(bonusText);

            // Description
            const desc = this.add.text(0, 60, '+5 max castle level per upgrade', {
                fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
            }).setOrigin(0.5);
            card.add(desc);

            if (isMaxLevel) {
                const maxText = this.add.text(0, 120, 'MAX LEVEL', {
                    fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
                }).setOrigin(0.5);
                card.add(maxText);
            } else {
                const canAfford = xp >= cost;
                const btn = this.createCardButton(0, 120, `Upgrade\n${cost} XP`, () => {
                    this.purchaseMultiLevelUpgrade('castleExtension', cost, maxLevel);
                }, canAfford, 150, 55);
                card.add(btn);
            }
        }

        return card;
    }

    createMultiLevelCard(x, y, upgradeKey, icon, title, description, maxLevel, costPerLevel) {
        const card = this.add.container(x, y);
        const specialUpgrades = this.saveData.specialUpgrades || {};
        const currentLevel = specialUpgrades[upgradeKey] || 0;
        const isMaxLevel = currentLevel >= maxLevel;
        const xp = this.saveData.xp || 0;
        const cost = costPerLevel * (currentLevel + 1); // Cost increases with level

        // Background
        const bgColor = isMaxLevel ? 0x2a4a2a : 0x2a2a4a;
        const borderColor = isMaxLevel ? 0x88ff88 : 0x6688ff;
        const bg = this.add.rectangle(0, 0, 260, 380, bgColor);
        bg.setStrokeStyle(3, borderColor);
        card.add(bg);

        // Icon
        const iconText = this.add.text(0, -120, icon, { fontSize: '60px' }).setOrigin(0.5);
        card.add(iconText);

        // Title
        const cardTitle = this.add.text(0, -50, title, {
            fontSize: '22px', fontFamily: 'Arial', color: '#6688ff',
            fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        // Level display
        const levelText = this.add.text(0, 0, `Level ${currentLevel}/${maxLevel}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        card.add(levelText);

        // Current bonus
        const bonusPercent = currentLevel * 5;
        const bonusText = this.add.text(0, 30, `Current: ${bonusPercent}%`, {
            fontSize: '16px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(0.5);
        card.add(bonusText);

        // Description
        const desc = this.add.text(0, 60, description + ' per level', {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(desc);

        if (isMaxLevel) {
            const maxText = this.add.text(0, 120, 'MAX LEVEL', {
                fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        } else {
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 120, `Upgrade\n${cost} XP`, () => {
                this.purchaseMultiLevelUpgrade(upgradeKey, cost, maxLevel);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    purchaseMultiLevelUpgrade(upgradeKey, cost, maxLevel) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const currentLevel = this.saveData.specialUpgrades?.[upgradeKey] || 0;
        if (currentLevel >= maxLevel) return;

        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades[upgradeKey] = currentLevel + 1;
            saveSystem.save(this.saveData);
            this.syncToCloud();

            // Format upgrade name for notification
            const names = {
                productionSpeed: 'Production Speed',
                productionCost: 'Production Cost',
                unitSpeed: 'Unit Speed',
                reinforcementLevel: 'Reinforcement Level',
                peasantPromoSkip: 'Peasant Promo Skip',
                archerPromoSkip: 'Archer Promo Skip',
                horsemanPromoSkip: 'Horseman Promo Skip',
                castleExtension: 'Castle Extension',
                smarterUnits: 'Smarter Units'
            };
            const name = names[upgradeKey] || upgradeKey;
            this.showUpgradeNotification(`${name} → Level ${currentLevel + 1}`);
        }
    }

    // Reinforcements 5-level card
    createReinforcementsCard(x, y) {
        const card = this.add.container(x, y);
        const specialUpgrades = this.saveData.specialUpgrades || {};
        const currentLevel = specialUpgrades.reinforcements || 0;
        const maxLevel = 5;
        const isMaxLevel = currentLevel >= maxLevel;
        const xp = this.saveData.xp || 0;
        // Cost: 15, 25, 35, 45, 55 XP per level
        const costs = [15, 25, 35, 45, 55];
        const cost = costs[currentLevel] || 55;

        // Background
        const bg = this.add.rectangle(0, 0, 260, 380, isMaxLevel ? 0x2a4a2a : 0x3a2a3a);
        bg.setStrokeStyle(3, isMaxLevel ? 0x88ff88 : 0xff88ff);
        card.add(bg);

        // Icon
        const iconText = this.add.text(0, -120, '🎖️', { fontSize: '60px' }).setOrigin(0.5);
        card.add(iconText);

        // Title
        const cardTitle = this.add.text(0, -55, 'REINFORCE-\nMENTS', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ff88ff',
            fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        // Level display
        const levelText = this.add.text(0, 0, `Level ${currentLevel}/${maxLevel}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        card.add(levelText);

        // Level benefits description
        const levelDescs = [
            'Not unlocked',
            'Lv1: 5P + 3A + 1H',
            'Lv2: 6P + 4A + 2H',
            'Lv3: 7P + 5A + 3H',
            'Lv4: 8P + 6A + 4H',
            'Lv5: 10P + 8A + 5H'
        ];
        const currentDesc = levelDescs[currentLevel] || levelDescs[0];
        const nextDesc = currentLevel < maxLevel ? levelDescs[currentLevel + 1] : '';

        const desc = this.add.text(0, 35, `Current: ${currentDesc}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#88ff88', align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (nextDesc) {
            const nextText = this.add.text(0, 60, `Next: ${nextDesc}`, {
                fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa', align: 'center'
            }).setOrigin(0.5);
            card.add(nextText);
        }

        const timerText = this.add.text(0, 85, '2-min cooldown in battle', {
            fontSize: '12px', fontFamily: 'Arial', color: '#888888', align: 'center'
        }).setOrigin(0.5);
        card.add(timerText);

        if (isMaxLevel) {
            const maxText = this.add.text(0, 120, 'MAX LEVEL', {
                fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        } else {
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 120, `Upgrade\n${cost} XP`, () => {
                this.purchaseReinforcements(cost);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    purchaseReinforcements(cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const currentLevel = this.saveData.specialUpgrades?.reinforcements || 0;
        if (currentLevel >= 5) return;

        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades.reinforcements = currentLevel + 1;
            saveSystem.save(this.saveData);
            this.syncToCloud();
            this.showUpgradeNotification(`Reinforcements → Level ${currentLevel + 1}`);
        }
    }

    // Promotion Skip card
    createPromoSkipCard(x, y, unitType, icon, unitColor) {
        const card = this.add.container(x, y);
        const specialUpgrades = this.saveData.specialUpgrades || {};
        const upgradeKey = `${unitType}PromoSkip`;
        const currentLevel = specialUpgrades[upgradeKey] || 0;
        const maxLevel = 5;
        const isMaxLevel = currentLevel >= maxLevel;
        const xp = this.saveData.xp || 0;
        const baseCost = unitType === 'horseman' ? 10 : 8;
        const cost = baseCost * (currentLevel + 1);

        // Check if unit is unlocked (horseman check)
        const unitUnlocked = unitType !== 'horseman' || this.saveData.upgrades?.horseman?.unlocked;

        // Background
        const bg = this.add.rectangle(0, 0, 260, 380, isMaxLevel ? 0x2a4a2a : 0x3a3a2a);
        bg.setStrokeStyle(3, isMaxLevel ? 0x88ff88 : unitColor);
        card.add(bg);

        // Icon
        const iconText = this.add.text(0, -120, icon, { fontSize: '60px' }).setOrigin(0.5);
        card.add(iconText);

        // Title
        const unitName = unitType.charAt(0).toUpperCase() + unitType.slice(1);
        const cardTitle = this.add.text(0, -50, `${unitName.toUpperCase()}\nPROMO SKIP`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#' + unitColor.toString(16).padStart(6, '0'),
            fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(cardTitle);

        // Level display
        const levelText = this.add.text(0, 0, `Skip ${currentLevel}/${maxLevel} tiers`, {
            fontSize: '18px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        card.add(levelText);

        // Current effect
        const startTier = currentLevel + 1;
        const effectText = this.add.text(0, 35, `Start at Tier ${startTier}`, {
            fontSize: '16px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(0.5);
        card.add(effectText);

        // Description
        const desc = this.add.text(0, 65, 'Skip lowest promotion\ntiers for new units', {
            fontSize: '12px', fontFamily: 'Arial', color: '#aaaaaa', align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (!unitUnlocked) {
            const reqText = this.add.text(0, 120, '⚠️ Unlock Horseman first', {
                fontSize: '12px', fontFamily: 'Arial', color: '#ff8888'
            }).setOrigin(0.5);
            card.add(reqText);
        } else if (isMaxLevel) {
            const maxText = this.add.text(0, 120, 'MAX LEVEL', {
                fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        } else {
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 120, `Upgrade\n${cost} XP`, () => {
                this.purchaseMultiLevelUpgrade(upgradeKey, cost, maxLevel);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    createCastleEmergencyCard(x, y) {
        const card = this.add.container(x, y);
        const xp = this.saveData.xp || 0;
        const isPurchased = this.saveData.specialUpgrades?.castleEmergency || false;
        const cost = 30; // XP cost

        // Background - red/orange theme for emergency
        const bg = this.add.rectangle(0, 0, 260, 380, 0x3a1a1a);
        bg.setStrokeStyle(3, isPurchased ? 0xffd700 : 0xff4400);
        card.add(bg);

        // Icon
        const icon = this.add.text(0, -120, '💥', { fontSize: '60px' }).setOrigin(0.5);
        card.add(icon);

        // Title
        const title = this.add.text(0, -50, 'CASTLE\nEMERGENCY', {
            fontSize: '22px', fontFamily: 'Arial', color: '#ff4444', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(title);

        // Description
        const desc = this.add.text(0, 25, 'When castle HP < 25%:\nExplosives rain for 5s\nkilling ALL monsters!\n\n⚠️ No castle repair after', {
            fontSize: '13px', fontFamily: 'Arial', color: '#cccccc', align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (isPurchased) {
            const owned = this.add.text(0, 110, '✓ UNLOCKED', {
                fontSize: '24px', fontFamily: 'Arial', color: '#88ff88', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(owned);
        } else {
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 110, `Unlock\n${cost} XP`, () => {
                this.purchaseCastleEmergency(cost);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        return card;
    }

    purchaseCastleEmergency(cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades.castleEmergency = true;
            saveSystem.save(this.saveData);
            this.syncToCloud();

            this.showUpgradeNotification('Castle Emergency Unlocked!');
        }
    }

    createSmarterUnitsCard(x, y) {
        const card = this.add.container(x, y);
        const xp = this.saveData.xp || 0;
        const currentLevel = this.saveData.specialUpgrades?.smarterUnits || 0;
        const maxLevel = 5;
        const costPerLevel = 20; // Premium upgrade - 20 XP per level
        const cost = costPerLevel;
        const isMaxLevel = currentLevel >= maxLevel;
        const hasAnyLevel = currentLevel > 0;

        // Background - blue/purple tactical theme
        const bg = this.add.rectangle(0, 0, 260, 380, 0x2a2a4a);
        bg.setStrokeStyle(3, isMaxLevel ? 0x88ff88 : 0x6666ff);
        card.add(bg);

        // Icon
        const icon = this.add.text(0, -120, '🧠', { fontSize: '60px' }).setOrigin(0.5);
        card.add(icon);

        // Title
        const title = this.add.text(0, -50, 'SMARTER\nUNITS', {
            fontSize: '22px', fontFamily: 'Arial', color: '#8888ff', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        card.add(title);

        // Level descriptions
        const levelDescs = [
            'Lv1: Castle group',
            'Lv2: + Top group',
            'Lv3: + Bottom group',
            'Lv4: + Middle group',
            'Lv5: + Front group'
        ];
        const nextDesc = currentLevel < maxLevel ? levelDescs[currentLevel] : 'All groups active';

        // Level indicator
        const levelText = this.add.text(0, -5, `Level ${currentLevel}/${maxLevel}`, {
            fontSize: '20px', fontFamily: 'Arial', color: '#ffffff'
        }).setOrigin(0.5);
        card.add(levelText);

        // Description
        const desc = this.add.text(0, 30, `Units form defense groups\n${nextDesc}`, {
            fontSize: '14px', fontFamily: 'Arial', color: '#aaaaaa', align: 'center'
        }).setOrigin(0.5);
        card.add(desc);

        if (isMaxLevel) {
            const maxText = this.add.text(0, 85, 'MAX LEVEL', {
                fontSize: '24px', fontFamily: 'Arial', color: '#ffd700', fontStyle: 'bold'
            }).setOrigin(0.5);
            card.add(maxText);
        } else {
            const canAfford = xp >= cost;
            const btn = this.createCardButton(0, 85, `Upgrade\n${cost} XP`, () => {
                this.purchaseMultiLevelUpgrade('smarterUnits', cost, maxLevel);
            }, canAfford, 150, 55);
            card.add(btn);
        }

        // Show toggle hint if player owns any level
        if (hasAnyLevel) {
            const toggleHint = this.add.text(0, 150, '⚙️ Toggle in Settings', {
                fontSize: '12px', fontFamily: 'Arial', color: '#888888', align: 'center'
            }).setOrigin(0.5);
            card.add(toggleHint);
        }

        return card;
    }

    purchaseEliteDiscount(cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        if (this.saveData.xp >= cost) {
            this.saveData.xp -= cost;
            if (!this.saveData.specialUpgrades) {
                this.saveData.specialUpgrades = {};
            }
            this.saveData.specialUpgrades.eliteDiscount = true;
            saveSystem.save(this.saveData);
            this.syncToCloud();

            this.showUpgradeNotification('Half Price Gold Tier Unlocked!');
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
                // Allow click if this button's card is visible (within 1 card of center)
                const parentCard = container.parentContainer;
                if (parentCard && parentCard.cardIndex !== undefined) {
                    const diff = Math.abs(parentCard.cardIndex - this.currentCardIndex);
                    if (diff > 1) {
                        // Card is too far from center - ignore click
                        return;
                    }
                }

                // Track which card and button was clicked for glow effect
                this.lastClickedCard = parentCard;
                this.lastClickedButton = container;
                
                // Hide button during glow period
                container.setVisible(false);

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
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.upgrades[unitKey].level++;
            saveSystem.save(this.saveData);
            this.syncToCloud();
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            const newLevel = this.saveData.upgrades[unitKey].level;
            this.showUpgradeNotification(`${unitKey.charAt(0).toUpperCase() + unitKey.slice(1)} → Level ${newLevel}`);
        }
    }

    unlockUnit(unitKey, cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.upgrades[unitKey].unlocked = true;
            saveSystem.save(this.saveData);
            this.syncToCloud();
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            this.showUpgradeNotification(`${unitKey.charAt(0).toUpperCase() + unitKey.slice(1)} Unlocked!`);
        }
    }

    purchaseCastleUpgrade(upgradeKey, cost) {
        if (!this.sessionValid) {
            this.showSessionError();
            return;
        }
        if (this.upgradeThrottled) return;
        const xp = this.saveData.xp || 0;
        if (xp >= cost) {
            this.saveData.xp = xp - cost;
            this.saveData.castleUpgrades[upgradeKey]++;
            saveSystem.save(this.saveData);
            this.syncToCloud();
            if (typeof audioManager !== 'undefined') {
                audioManager.playSpawn();
            }
            const newLevel = this.saveData.castleUpgrades[upgradeKey];
            const names = { health: 'Castle Health', armor: 'Castle Armor', goldIncome: 'Mining Speed' };
            this.showUpgradeNotification(`${names[upgradeKey]} → Level ${newLevel}`);
        }
    }

    // Show upgrade success notification (green popup) with card glow and throttle
    showUpgradeNotification(message) {
        // Enable throttle to prevent multiple clicks
        this.upgradeThrottled = true;

        // Get clicked card and add glow effect (use lastClickedCard if available)
        const currentCard = this.lastClickedCard || this.cardContainers[this.currentCardIndex];
        if (currentCard) {
            // Create glow effect around the card
            const glow = this.add.graphics();
            glow.lineStyle(8, 0x44FF44, 0.8);
            glow.strokeRoundedRect(-140, -200, 280, 400, 12);
            currentCard.add(glow);

            // Animate glow pulsing, show button again when done
            this.tweens.add({
                targets: glow,
                alpha: { from: 0.8, to: 0.3 },
                duration: 400,
                yoyo: true,
                repeat: 2,
                onComplete: () => {
                    // Show button again when glow finishes
                    if (this.lastClickedButton) {
                        this.lastClickedButton.setVisible(true);
                    }
                }
            });
        }

        const container = this.add.container(GAME_WIDTH / 2, 120);
        container.setDepth(9999);

        // Background
        const bg = this.add.rectangle(0, 0, 300, 60, 0x228B22, 0.95);
        bg.setStrokeStyle(3, 0x44FF44);
        container.add(bg);

        // Text
        const text = this.add.text(0, 0, message, {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(text);

        // Animate in
        container.setScale(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Restart scene after 2 second throttle, staying at current card
        this.time.delayedCall(2000, () => {
            this.scene.restart({ startCardIndex: this.currentCardIndex });
        });
    }

    // Validate session before allowing purchases
    async validateSession() {
        try {
            const validation = await supabaseClient.validateSession();
            
            if (!validation.valid) {
                this.sessionValid = false;
                
                if (validation.reason === 'session_conflict') {
                    const choice = await SessionUI.showConflictDialog(this);
                    if (choice === 'takeover') {
                        await supabaseClient.takeoverSession();
                        this.sessionValid = true;
                        // Reload data from cloud after takeover
                        const result = await saveSystem.syncWithCloud();
                        if (result.success) {
                            this.saveData = result.data;
                            this.scene.restart();
                        }
                    }
                } else if (validation.reason === 'session_expired') {
                    await SessionUI.showExpiredDialog(this);
                    this.scene.start('MenuScene');
                }
            }
        } catch (error) {
            console.error('Session validation error:', error);
            // Fail open - allow purchases on error
            this.sessionValid = true;
        }
    }
    
    // Show error when trying to purchase with invalid session
    showSessionError() {
        const errorText = this.add.text(GAME_WIDTH / 2, 100, 'Session invalid - please refresh', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ff6b6b'
        }).setOrigin(0.5).setDepth(1000);
        
        this.time.delayedCall(2000, () => errorText.destroy());
    }
    
    // Sync current save to cloud after purchases
    syncToCloud() {
        if (typeof supabaseClient !== 'undefined' && supabaseClient.isLoggedIn()) {
            supabaseClient.saveToCloud(this.saveData).then(result => {
                if (result.success) {
                    console.log('Purchase synced to cloud');
                }
            }).catch(err => console.warn('Cloud sync failed:', err));
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
