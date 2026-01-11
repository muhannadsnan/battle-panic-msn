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
        this.add.text(GAME_WIDTH / 2, 135, 'UNIT UPGRADES', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const unitTypes = ['PEASANT', 'ARCHER', 'HORSEMAN'];
        const startX = 195;
        const spacing = 250;
        const y = 265;

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

        // Card background - larger to fit bigger icons
        const isUnlocked = upgradeData.unlocked;
        const bgColor = isUnlocked ? 0x333344 : 0x222222;
        const bg = this.add.rectangle(0, 0, 160, 220, bgColor);
        bg.setStrokeStyle(3, isUnlocked ? stats.color : 0x444444);
        card.add(bg);

        // Unit icon container - positioned higher for larger icon
        const iconContainer = this.add.container(0, -50);
        this.createUnitIcon(iconContainer, unitType, isUnlocked);
        card.add(iconContainer);

        // Unit name
        const name = this.add.text(0, 10, stats.name, {
            fontSize: '15px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add(name);

        // Level
        const levelText = this.add.text(0, 28, `Level ${upgradeData.level}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Stats preview with current -> next values
        const currentStats = this.getUpgradedStats(stats, upgradeData.level);
        const nextStats = this.getUpgradedStats(stats, upgradeData.level + 1);
        const isMaxLevel = upgradeData.level >= UPGRADE_CONFIG.maxLevel;

        // Stats layout - fixed positions for alignment
        const labelX = -58;
        const currentX = -8;
        const arrowX = 5;
        const nextX = 27;

        // HP line
        const hpContainer = this.add.container(0, 48);
        const hpLabel = this.add.text(labelX, 0, 'HP:', {
            fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        hpContainer.add(hpLabel);

        const hpCurrent = this.add.text(currentX, 0, `${currentStats.health}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        hpContainer.add(hpCurrent);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const hpArrow = this.add.graphics();
            hpArrow.lineStyle(2, 0x44ff44, 1);
            hpArrow.moveTo(arrowX, -4);
            hpArrow.lineTo(arrowX + 5, 0);
            hpArrow.lineTo(arrowX, 4);
            hpArrow.moveTo(arrowX + 7, -4);
            hpArrow.lineTo(arrowX + 12, 0);
            hpArrow.lineTo(arrowX + 7, 4);
            hpArrow.strokePath();
            hpContainer.add(hpArrow);
            const hpNext = this.add.text(nextX, 0, `${nextStats.health}`, {
                fontSize: '13px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            hpContainer.add(hpNext);
        }
        card.add(hpContainer);

        // DMG line
        const dmgContainer = this.add.container(0, 65);
        const dmgLabel = this.add.text(labelX, 0, 'DMG:', {
            fontSize: '13px', fontFamily: 'Arial', color: '#aaaaaa'
        }).setOrigin(0, 0.5);
        dmgContainer.add(dmgLabel);

        const dmgCurrent = this.add.text(currentX, 0, `${currentStats.damage}`, {
            fontSize: '13px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        dmgContainer.add(dmgCurrent);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const dmgArrow = this.add.graphics();
            dmgArrow.lineStyle(2, 0x44ff44, 1);
            dmgArrow.moveTo(arrowX, -4);
            dmgArrow.lineTo(arrowX + 5, 0);
            dmgArrow.lineTo(arrowX, 4);
            dmgArrow.moveTo(arrowX + 7, -4);
            dmgArrow.lineTo(arrowX + 12, 0);
            dmgArrow.lineTo(arrowX + 7, 4);
            dmgArrow.strokePath();
            dmgContainer.add(dmgArrow);
            const dmgNext = this.add.text(nextX, 0, `${nextStats.damage}`, {
                fontSize: '13px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            dmgContainer.add(dmgNext);
        }
        card.add(dmgContainer);

        const xp = this.saveData.xp || 0;

        if (isUnlocked) {
            // Upgrade button (uses XP)
            if (upgradeData.level < UPGRADE_CONFIG.maxLevel) {
                const cost = this.calculateUpgradeCost(typeKey, upgradeData.level);
                const upgradeBtn = this.createCardButton(0, 92, `Upgrade\n${cost} XP`, () => {
                    this.purchaseUpgrade(typeKey, cost);
                }, xp >= cost);
                card.add(upgradeBtn);
            } else {
                const maxText = this.add.text(0, 92, 'MAX LEVEL', {
                    fontSize: '14px',
                    fontFamily: 'Arial',
                    color: '#ffd700',
                    fontStyle: 'bold'
                }).setOrigin(0.5);
                card.add(maxText);
            }
        } else {
            // Unlock button (uses XP)
            const unlockCost = this.getUnlockCost(typeKey);
            const unlockBtn = this.createCardButton(0, 92, `Unlock\n${unlockCost} XP`, () => {
                this.unlockUnit(typeKey, unlockCost);
            }, xp >= unlockCost);
            card.add(unlockBtn);

            // Lock overlay
            const lockOverlay = this.add.rectangle(0, 0, 160, 220, 0x000000, 0.5);
            card.add(lockOverlay);

            const lockIcon = this.add.text(0, -50, '🔒', {
                fontSize: '36px'
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
        // EXACT copy of Unit.js createPeasant - cartoony peasant friendly farmer style
        const s = scale;

        // Shadow
        const shadow = this.add.rectangle(0, 30 * s, 24 * s, 6 * s, 0x000000, 0.2);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Legs
        const leftLeg = this.add.rectangle(-6 * s, 22 * s, 10 * s, 14 * s, 0x6B4423);
        leftLeg.setAlpha(alpha);
        container.add(leftLeg);
        const leftShoe = this.add.rectangle(-7 * s, 28 * s, 12 * s, 6 * s, 0x4A3020);
        leftShoe.setAlpha(alpha);
        container.add(leftShoe);
        const rightLeg = this.add.rectangle(6 * s, 22 * s, 10 * s, 14 * s, 0x6B4423);
        rightLeg.setAlpha(alpha);
        container.add(rightLeg);
        const rightShoe = this.add.rectangle(7 * s, 28 * s, 12 * s, 6 * s, 0x4A3020);
        rightShoe.setAlpha(alpha);
        container.add(rightShoe);

        // Body - puffy tunic
        const body = this.add.rectangle(0, 6 * s, 22 * s, 22 * s, 0xE8C87A);
        body.setAlpha(alpha);
        container.add(body);
        const bodyHighlight = this.add.rectangle(0, 8 * s, 18 * s, 16 * s, 0xF5D88A);
        bodyHighlight.setAlpha(alpha);
        container.add(bodyHighlight);
        const bodyShade = this.add.rectangle(-8 * s, 6 * s, 4 * s, 18 * s, 0xD4B060);
        bodyShade.setAlpha(alpha);
        container.add(bodyShade);

        // Belt with buckle
        const belt = this.add.rectangle(0, 14 * s, 24 * s, 5 * s, 0x8B5A2B);
        belt.setAlpha(alpha);
        container.add(belt);
        const buckle = this.add.rectangle(0, 14 * s, 6 * s, 6 * s, 0xFFD700);
        buckle.setAlpha(alpha);
        container.add(buckle);

        // Arms
        const leftArm = this.add.rectangle(-14 * s, 4 * s, 8 * s, 14 * s, 0xFFCBA4);
        leftArm.setAlpha(alpha);
        container.add(leftArm);
        const leftHand = this.add.rectangle(-14 * s, 12 * s, 10 * s, 8 * s, 0xFFDDBB);
        leftHand.setAlpha(alpha);
        container.add(leftHand);
        const rightArm = this.add.rectangle(14 * s, 4 * s, 8 * s, 14 * s, 0xFFCBA4);
        rightArm.setAlpha(alpha);
        container.add(rightArm);
        const rightHand = this.add.rectangle(14 * s, 12 * s, 10 * s, 8 * s, 0xFFDDBB);
        rightHand.setAlpha(alpha);
        container.add(rightHand);

        // BIG cartoony head
        const head = this.add.rectangle(0, -14 * s, 26 * s, 24 * s, 0xFFCBA4);
        head.setAlpha(alpha);
        container.add(head);
        const headHighlight = this.add.rectangle(0, -12 * s, 22 * s, 18 * s, 0xFFDDBB);
        headHighlight.setAlpha(alpha);
        container.add(headHighlight);
        const headShade = this.add.rectangle(-10 * s, -14 * s, 4 * s, 20 * s, 0xE8B090);
        headShade.setAlpha(alpha);
        container.add(headShade);

        // Messy hair
        const hair1 = this.add.rectangle(0, -26 * s, 28 * s, 10 * s, 0x8B6914);
        hair1.setAlpha(alpha);
        container.add(hair1);
        const hair2 = this.add.rectangle(-8 * s, -24 * s, 8 * s, 8 * s, 0x8B6914);
        hair2.setAlpha(alpha);
        container.add(hair2);
        const hair3 = this.add.rectangle(8 * s, -24 * s, 8 * s, 8 * s, 0x8B6914);
        hair3.setAlpha(alpha);
        container.add(hair3);
        const hairTuft = this.add.rectangle(-4 * s, -30 * s, 6 * s, 6 * s, 0x9B7924);
        hairTuft.setAlpha(alpha);
        container.add(hairTuft);

        // BIG cute eyes
        const eyeWhiteL = this.add.rectangle(-6 * s, -14 * s, 10 * s, 12 * s, 0xFFFFFF);
        eyeWhiteL.setAlpha(alpha);
        container.add(eyeWhiteL);
        const eyeWhiteR = this.add.rectangle(6 * s, -14 * s, 10 * s, 12 * s, 0xFFFFFF);
        eyeWhiteR.setAlpha(alpha);
        container.add(eyeWhiteR);
        const pupilL = this.add.rectangle(-5 * s, -13 * s, 6 * s, 8 * s, 0x4A3020);
        pupilL.setAlpha(alpha);
        container.add(pupilL);
        const pupilR = this.add.rectangle(7 * s, -13 * s, 6 * s, 8 * s, 0x4A3020);
        pupilR.setAlpha(alpha);
        container.add(pupilR);
        const shineL = this.add.rectangle(-6 * s, -15 * s, 3 * s, 3 * s, 0xFFFFFF);
        shineL.setAlpha(alpha);
        container.add(shineL);
        const shineR = this.add.rectangle(6 * s, -15 * s, 3 * s, 3 * s, 0xFFFFFF);
        shineR.setAlpha(alpha);
        container.add(shineR);

        // Happy mouth
        const mouth = this.add.rectangle(0, -4 * s, 8 * s, 4 * s, 0xE08080);
        mouth.setAlpha(alpha);
        container.add(mouth);
        const mouthInner = this.add.rectangle(0, -3 * s, 6 * s, 2 * s, 0xC06060);
        mouthInner.setAlpha(alpha);
        container.add(mouthInner);

        // Rosy cheeks
        const cheekL = this.add.rectangle(-10 * s, -8 * s, 6 * s, 4 * s, 0xFFAAAA, 0.5 * alpha);
        container.add(cheekL);
        const cheekR = this.add.rectangle(10 * s, -8 * s, 6 * s, 4 * s, 0xFFAAAA, 0.5 * alpha);
        container.add(cheekR);

        // Pitchfork weapon
        const handle = this.add.rectangle(20 * s, 0, 5 * s, 36 * s, 0xC49A4A);
        handle.setAlpha(alpha);
        container.add(handle);
        const handleHighlight = this.add.rectangle(20 * s, 2 * s, 3 * s, 32 * s, 0xD4AA5A);
        handleHighlight.setAlpha(alpha);
        container.add(handleHighlight);
        const prong1 = this.add.rectangle(20 * s, -18 * s, 4 * s, 10 * s, 0x88AACC);
        prong1.setAlpha(alpha);
        container.add(prong1);
        const prong2 = this.add.rectangle(14 * s, -16 * s, 4 * s, 8 * s, 0x88AACC);
        prong2.setAlpha(alpha);
        container.add(prong2);
        const prong3 = this.add.rectangle(26 * s, -16 * s, 4 * s, 8 * s, 0x88AACC);
        prong3.setAlpha(alpha);
        container.add(prong3);
        const crossbar = this.add.rectangle(20 * s, -12 * s, 16 * s, 4 * s, 0x99BBDD);
        crossbar.setAlpha(alpha);
        container.add(crossbar);
    }

    createArcherIcon(container, scale, alpha) {
        // EXACT copy of Unit.js createArcher - cartoony cool ranger style
        const s = scale;

        // Shadow
        const shadow = this.add.rectangle(0, 28 * s, 22 * s, 5 * s, 0x000000, 0.2);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Legs with boots
        const leftLeg = this.add.rectangle(-5 * s, 20 * s, 8 * s, 14 * s, 0x2E5A2E);
        leftLeg.setAlpha(alpha);
        container.add(leftLeg);
        const leftBoot = this.add.rectangle(-6 * s, 26 * s, 10 * s, 6 * s, 0x5A3A20);
        leftBoot.setAlpha(alpha);
        container.add(leftBoot);
        const rightLeg = this.add.rectangle(5 * s, 20 * s, 8 * s, 14 * s, 0x2E5A2E);
        rightLeg.setAlpha(alpha);
        container.add(rightLeg);
        const rightBoot = this.add.rectangle(6 * s, 26 * s, 10 * s, 6 * s, 0x5A3A20);
        rightBoot.setAlpha(alpha);
        container.add(rightBoot);

        // Body - sleek tunic
        const body = this.add.rectangle(0, 4 * s, 18 * s, 20 * s, 0x3CB043);
        body.setAlpha(alpha);
        container.add(body);
        const bodyHighlight = this.add.rectangle(0, 6 * s, 14 * s, 14 * s, 0x4CC053);
        bodyHighlight.setAlpha(alpha);
        container.add(bodyHighlight);
        const bodyShade = this.add.rectangle(-6 * s, 4 * s, 4 * s, 16 * s, 0x2A9030);
        bodyShade.setAlpha(alpha);
        container.add(bodyShade);
        const belt = this.add.rectangle(0, 12 * s, 20 * s, 4 * s, 0x6B4423);
        belt.setAlpha(alpha);
        container.add(belt);

        // Quiver on back
        const quiver = this.add.rectangle(-14 * s, 2 * s, 8 * s, 20 * s, 0x6B4423);
        quiver.setAlpha(alpha);
        container.add(quiver);
        const quiverInner = this.add.rectangle(-14 * s, 0, 6 * s, 16 * s, 0x7B5433);
        quiverInner.setAlpha(alpha);
        container.add(quiverInner);
        const arrow1 = this.add.rectangle(-14 * s, -10 * s, 3 * s, 6 * s, 0xFF6666);
        arrow1.setAlpha(alpha);
        container.add(arrow1);
        const arrow2 = this.add.rectangle(-12 * s, -10 * s, 3 * s, 6 * s, 0x66FF66);
        arrow2.setAlpha(alpha);
        container.add(arrow2);

        // Arms
        const leftArm = this.add.rectangle(-12 * s, 2 * s, 6 * s, 12 * s, 0xFFCBA4);
        leftArm.setAlpha(alpha);
        container.add(leftArm);
        const rightArm = this.add.rectangle(12 * s, 2 * s, 6 * s, 12 * s, 0xFFCBA4);
        rightArm.setAlpha(alpha);
        container.add(rightArm);

        // Cool hood/cape
        const hood1 = this.add.rectangle(0, -4 * s, 22 * s, 14 * s, 0x228B22);
        hood1.setAlpha(alpha);
        container.add(hood1);
        const hood2 = this.add.rectangle(0, -10 * s, 20 * s, 10 * s, 0x228B22);
        hood2.setAlpha(alpha);
        container.add(hood2);
        const hood3 = this.add.rectangle(0, -16 * s, 16 * s, 8 * s, 0x2A9B32);
        hood3.setAlpha(alpha);
        container.add(hood3);
        const hood4 = this.add.rectangle(0, -20 * s, 10 * s, 6 * s, 0x2A9B32);
        hood4.setAlpha(alpha);
        container.add(hood4);

        // Face under hood
        const face = this.add.rectangle(0, -6 * s, 16 * s, 14 * s, 0xFFCBA4);
        face.setAlpha(alpha);
        container.add(face);
        const faceHighlight = this.add.rectangle(0, -5 * s, 14 * s, 10 * s, 0xFFDDBB);
        faceHighlight.setAlpha(alpha);
        container.add(faceHighlight);

        // Determined eyes
        const eyeWhiteL = this.add.rectangle(-4 * s, -8 * s, 8 * s, 8 * s, 0xFFFFFF);
        eyeWhiteL.setAlpha(alpha);
        container.add(eyeWhiteL);
        const eyeWhiteR = this.add.rectangle(4 * s, -8 * s, 8 * s, 8 * s, 0xFFFFFF);
        eyeWhiteR.setAlpha(alpha);
        container.add(eyeWhiteR);
        const irisL = this.add.rectangle(-3 * s, -7 * s, 5 * s, 6 * s, 0x228B22);
        irisL.setAlpha(alpha);
        container.add(irisL);
        const irisR = this.add.rectangle(5 * s, -7 * s, 5 * s, 6 * s, 0x228B22);
        irisR.setAlpha(alpha);
        container.add(irisR);
        const pupilL = this.add.rectangle(-4 * s, -8 * s, 3 * s, 3 * s, 0x000000);
        pupilL.setAlpha(alpha);
        container.add(pupilL);
        const pupilR = this.add.rectangle(4 * s, -8 * s, 3 * s, 3 * s, 0x000000);
        pupilR.setAlpha(alpha);
        container.add(pupilR);
        const shineL = this.add.rectangle(-5 * s, -10 * s, 2 * s, 2 * s, 0xFFFFFF);
        shineL.setAlpha(alpha);
        container.add(shineL);
        const smirk = this.add.rectangle(2 * s, -1 * s, 6 * s, 2 * s, 0xCC8888);
        smirk.setAlpha(alpha);
        container.add(smirk);

        // Cool bow
        const bow1 = this.add.rectangle(18 * s, -12 * s, 5 * s, 8 * s, 0x8B5A33);
        bow1.setAlpha(alpha);
        container.add(bow1);
        const bow2 = this.add.rectangle(20 * s, -6 * s, 5 * s, 6 * s, 0x9B6A43);
        bow2.setAlpha(alpha);
        container.add(bow2);
        const bow3 = this.add.rectangle(22 * s, 0, 5 * s, 8 * s, 0x9B6A43);
        bow3.setAlpha(alpha);
        container.add(bow3);
        const bow4 = this.add.rectangle(20 * s, 6 * s, 5 * s, 6 * s, 0x9B6A43);
        bow4.setAlpha(alpha);
        container.add(bow4);
        const bow5 = this.add.rectangle(18 * s, 12 * s, 5 * s, 8 * s, 0x8B5A33);
        bow5.setAlpha(alpha);
        container.add(bow5);
        const bowstring = this.add.rectangle(16 * s, 0, 2 * s, 28 * s, 0xDDDDDD);
        bowstring.setAlpha(alpha);
        container.add(bowstring);
    }

    createHorsemanIcon(container, scale, alpha) {
        // Horseman - mounted cavalry with lance
        const s = scale;

        // Shadow (larger for horse)
        const shadow = this.add.rectangle(0, 36 * s, 40 * s, 8 * s, 0x000000, 0.2);
        shadow.setAlpha(alpha);
        container.add(shadow);

        // Horse legs
        const frontLeg = this.add.rectangle(-10 * s, 30 * s, 6 * s, 16 * s, 0x6B3503);
        frontLeg.setAlpha(alpha);
        container.add(frontLeg);
        const backLeg = this.add.rectangle(10 * s, 30 * s, 6 * s, 16 * s, 0x6B3503);
        backLeg.setAlpha(alpha);
        container.add(backLeg);

        // Horse body
        const horseBody = this.add.rectangle(0, 14 * s, 36 * s, 18 * s, 0x8B4513);
        horseBody.setAlpha(alpha);
        container.add(horseBody);
        const horseHighlight = this.add.rectangle(0, 12 * s, 32 * s, 14 * s, 0x9B5523);
        horseHighlight.setAlpha(alpha);
        container.add(horseHighlight);
        // Horse tail
        const tail = this.add.rectangle(20 * s, 18 * s, 8 * s, 12 * s, 0x3B2503);
        tail.setAlpha(alpha);
        container.add(tail);

        // Horse head and neck
        const neck = this.add.rectangle(-20 * s, 8 * s, 10 * s, 16 * s, 0x8B4513);
        neck.setAlpha(alpha);
        container.add(neck);
        const head = this.add.rectangle(-26 * s, 4 * s, 14 * s, 12 * s, 0x9B5523);
        head.setAlpha(alpha);
        container.add(head);
        const snout = this.add.rectangle(-30 * s, 2 * s, 6 * s, 6 * s, 0x8B4513);
        snout.setAlpha(alpha);
        container.add(snout);
        const ear = this.add.rectangle(-24 * s, -2 * s, 4 * s, 6 * s, 0x7B3503);
        ear.setAlpha(alpha);
        container.add(ear);
        const eye = this.add.rectangle(-28 * s, 4 * s, 3 * s, 3 * s, 0x000000);
        eye.setAlpha(alpha);
        container.add(eye);

        // Rider torso
        const riderBody = this.add.rectangle(0, -6 * s, 16 * s, 18 * s, 0x4169E1);
        riderBody.setAlpha(alpha);
        container.add(riderBody);
        const riderHighlight = this.add.rectangle(0, -4 * s, 12 * s, 14 * s, 0x5179F1);
        riderHighlight.setAlpha(alpha);
        container.add(riderHighlight);

        // Rider head
        const riderHead = this.add.rectangle(0, -20 * s, 14 * s, 14 * s, 0xFFCBA4);
        riderHead.setAlpha(alpha);
        container.add(riderHead);
        // Helmet
        const helmet = this.add.rectangle(0, -26 * s, 16 * s, 10 * s, 0x708090);
        helmet.setAlpha(alpha);
        container.add(helmet);
        // Eyes
        const eyeL = this.add.rectangle(-3 * s, -20 * s, 4 * s, 4 * s, 0x000000);
        eyeL.setAlpha(alpha);
        container.add(eyeL);
        const eyeR = this.add.rectangle(3 * s, -20 * s, 4 * s, 4 * s, 0x000000);
        eyeR.setAlpha(alpha);
        container.add(eyeR);

        // Lance
        const lanceShaft = this.add.rectangle(16 * s, -12 * s, 4 * s, 48 * s, 0x8B5A33);
        lanceShaft.setAlpha(alpha);
        container.add(lanceShaft);
        const lanceTip = this.add.rectangle(16 * s, -38 * s, 6 * s, 10 * s, 0xC0C0C0);
        lanceTip.setAlpha(alpha);
        container.add(lanceTip);
        // Pennant
        const pennant = this.add.rectangle(20 * s, -30 * s, 10 * s, 8 * s, 0xFF4444);
        pennant.setAlpha(alpha);
        container.add(pennant);
    }

    createCastleUpgrades() {
        this.add.text(GAME_WIDTH / 2, 400, 'CASTLE UPGRADES', {
            fontSize: '22px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        const upgrades = [
            { key: 'health', name: 'Castle Health', desc: '+20 HP, +20/wave at L2+', icon: '❤️' },
            { key: 'armor', name: 'Castle Armor', desc: '-5% damage taken', icon: '🛡️' },
            { key: 'goldIncome', name: 'Mining Speed', desc: '+10% mining speed', icon: '💰' }
        ];

        const startX = 260;
        const spacing = 200;
        const y = 500;

        upgrades.forEach((upgrade, index) => {
            this.createCastleUpgradeCard(startX + (index * spacing), y, upgrade);
        });
    }

    createCastleUpgradeCard(x, y, upgrade) {
        const level = this.saveData.castleUpgrades[upgrade.key];
        const card = this.add.container(x, y);
        const isMaxLevel = level >= UPGRADE_CONFIG.maxLevel;

        // Background
        const bg = this.add.rectangle(0, 0, 180, 90, 0x333344);
        bg.setStrokeStyle(2, 0x4169E1);
        card.add(bg);

        // Icon and name
        const header = this.add.text(0, -28, `${upgrade.icon} ${upgrade.name}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        card.add(header);

        // Level
        const levelText = this.add.text(0, -10, `Level ${level}/${UPGRADE_CONFIG.maxLevel}`, {
            fontSize: '13px',
            fontFamily: 'Arial',
            color: '#aaaaaa'
        }).setOrigin(0.5);
        card.add(levelText);

        // Progression display: current -> next
        const currentBonus = this.getCastleBonus(upgrade.key, level);
        const nextBonus = this.getCastleBonus(upgrade.key, level + 1);

        const progressContainer = this.add.container(0, 6);
        const currentText = this.add.text(-12, 0, currentBonus, {
            fontSize: '13px', fontFamily: 'Arial', color: '#88ff88'
        }).setOrigin(1, 0.5);
        progressContainer.add(currentText);

        if (!isMaxLevel) {
            // Draw sleek double chevron arrow
            const arrow = this.add.graphics();
            arrow.lineStyle(2, 0x44ff44, 1);
            // First chevron
            arrow.moveTo(2, -5);
            arrow.lineTo(8, 0);
            arrow.lineTo(2, 5);
            // Second chevron
            arrow.moveTo(10, -5);
            arrow.lineTo(16, 0);
            arrow.lineTo(10, 5);
            arrow.strokePath();
            progressContainer.add(arrow);

            const nextText = this.add.text(24, 0, nextBonus, {
                fontSize: '13px', fontFamily: 'Arial', color: '#ffffff', fontStyle: 'bold'
            }).setOrigin(0, 0.5);
            progressContainer.add(nextText);
        }
        card.add(progressContainer);

        // Upgrade button (uses XP)
        const xp = this.saveData.xp || 0;
        if (level < UPGRADE_CONFIG.maxLevel) {
            const cost = this.calculateCastleUpgradeCost(level);
            const btn = this.createCardButton(0, 32, `${cost} XP`, () => {
                this.purchaseCastleUpgrade(upgrade.key, cost);
            }, xp >= cost, 70, 22);
            card.add(btn);
        } else {
            const maxText = this.add.text(0, 32, 'MAX', {
                fontSize: '14px',
                fontFamily: 'Arial',
                color: '#ffd700',
                fontStyle: 'bold'
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
        const btn = this.add.container(75, GAME_HEIGHT - 30);

        const bg = this.add.rectangle(0, 0, 100, 32, 0x444455);
        bg.setStrokeStyle(2, 0x666688);
        bg.setInteractive({});
        btn.add(bg);

        const label = this.add.text(0, 0, '← Back', {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#cccccc',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        btn.add(label);

        bg.on('pointerover', () => {
            bg.setFillStyle(0x555566);
            label.setColor('#ffffff');
        });

        bg.on('pointerout', () => {
            bg.setFillStyle(0x444455);
            label.setColor('#cccccc');
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

    calculateCastleUpgradeCost(currentLevel) {
        // XP costs: 1, 2, 3, 4, 5...
        return currentLevel;
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
