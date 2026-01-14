// UnitButton UI Component - Button to spawn units with hover-to-spawn mechanic
class UnitButton extends Phaser.GameObjects.Container {
    constructor(scene, x, y, unitType, hotkey, isUnlocked = true) {
        super(scene, x, y);

        this.scene = scene;
        this.unitType = unitType;
        this.hotkey = hotkey;
        this.isUnlocked = isUnlocked;
        this.isEnabled = true;
        this.isHovering = false;
        this.hoverStartTime = 0;
        this.hoverDelay = 250; // 250ms delay before progress starts
        this.spawnProgress = 0;
        this.spawnTarget = 100;
        this.spawnSpeed = 100; // Progress per second

        const stats = UNIT_TYPES[unitType.toUpperCase()];
        if (!stats) {
            console.error('Unknown unit type for button:', unitType);
            return;
        }

        this.goldCost = stats.goldCost;
        this.woodCost = stats.woodCost;
        this.color = stats.color;
        this.name = stats.name;

        const buttonWidth = 110;
        const buttonHeight = 120;

        // Light background for visibility
        this.background = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2a3a4a, 0.85);
        this.add(this.background);

        // Inner lighter area
        this.innerBg = scene.add.rectangle(0, -8, buttonWidth - 10, buttonHeight - 28, 0x3a4a5a, 0.7);
        this.add(this.innerBg);

        const spinnerRadius = 38;  // Bigger spinner

        // Spinner graphics for progress arc
        this.spinnerGraphics = scene.add.graphics();
        this.add(this.spinnerGraphics);
        this.spinnerRadius = spinnerRadius;
        this.spinnerColor = stats.color;

        // Unit icon container - 2x BIGGER
        this.iconContainer = scene.add.container(0, -5);
        this.iconContainer.setScale(4);  // x2 larger icons
        this.createUnitIcon(unitType);
        this.add(this.iconContainer);

        // Percentage text (hidden by default, shows when hovering)
        this.percentText = scene.add.text(0, 35, '0%', {
            fontSize: '25px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false);
        this.add(this.percentText);

        // Affordable count (hidden but tracked for logic)
        this.affordableCount = 0;

        // Cost display (gold and wood) - at bottom
        this.goldCostText = scene.add.text(-28, 48, `${this.goldCost}g`, {
            fontSize: '27px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.goldCostText);

        this.woodCostText = scene.add.text(28, 48, `${this.woodCost}w`, {
            fontSize: '27px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#cd853f',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.woodCostText);

        // Locked overlay (invisible background)
        this.lockedOverlay = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x000000, 0.7);
        this.add(this.lockedOverlay);

        this.lockIcon = scene.add.text(0, -10, '🔒', {
            fontSize: '43px'
        }).setOrigin(0.5);
        this.add(this.lockIcon);

        // Unlock info text (shows wave needed)
        const unlockWave = this.getUnlockWave(unitType);
        this.unlockInfoText = scene.add.text(0, 30, `Wave ${unlockWave}`, {
            fontSize: '23px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.unlockInfoText);

        // Promotion badge container (hidden by default, shows after 10 spawns)
        // Positioned in the middle-right of the button
        this.promotionLevel = 0;
        this.promotionBadgeContainer = scene.add.container(buttonWidth / 2 - 14, 0);
        this.promotionBadgeContainer.setVisible(false);
        this.add(this.promotionBadgeContainer);

        if (isUnlocked) {
            this.unlock();
        }

        // Make interactive
        this.background.setInteractive({});

        // Helper to start spawning (used by both hover and touch)
        const startSpawning = () => {
            // Block if another interaction is active (prevents multi-touch on iPad)
            if (this.scene.activeInteraction && this.scene.activeInteraction !== this) return;
            if (this.isEnabled && this.isUnlocked) {
                this.scene.activeInteraction = this;
                this.isHovering = true;
                this.hoverStartTime = Date.now(); // Record when hover started
                this.innerBg.setFillStyle(0x4a6a8a, 0.85);
                this.showTooltip();
            }
        };

        // Helper to stop spawning (used by both hover and touch)
        const stopSpawning = () => {
            this.isHovering = false;
            this.hoverStartTime = 0;
            this.innerBg.setFillStyle(0x3a4a5a, 0.7);
            this.percentText.setVisible(false);
            this.hideTooltip();
            // Release interaction lock
            if (this.scene.activeInteraction === this) {
                this.scene.activeInteraction = null;
            }
        };

        // Desktop: hover to spawn
        this.background.on('pointerover', startSpawning);
        this.background.on('pointerout', stopSpawning);

        // Touch/Mobile: hold to spawn (pointerdown starts, pointerup stops)
        this.background.on('pointerdown', () => {
            // Block if another interaction is active
            if (this.scene.activeInteraction && this.scene.activeInteraction !== this) return;
            if (this.isUnlocked) {
                if (this.isEnabled) {
                    // Start spawning on touch hold
                    startSpawning();
                } else {
                    // Not enough resources - play warning
                    audioManager.playWarning();
                }
            }
        });

        this.background.on('pointerup', stopSpawning);

        scene.add.existing(this);
        this.setDepth(900);
    }

    // Called from GameScene update loop
    updateSpawnProgress(delta) {
        if (!this.isEnabled || !this.isUnlocked) {
            // Don't reset progress when disabled - just stop progressing
            this.drawSpinner();
            return;
        }

        const progressPerFrame = (this.spawnSpeed * delta) / 1000;

        if (this.isHovering) {
            // Only start progressing after hover delay has passed
            const hoverDuration = Date.now() - this.hoverStartTime;
            if (hoverDuration >= this.hoverDelay) {
                this.spawnProgress += progressPerFrame;
                if (this.spawnProgress >= this.spawnTarget) {
                    this.spawnProgress = 0;
                    this.onClick(); // Spawn the unit
                }
            }
        }
        // Progress persists when not hovering (no decay)

        this.drawSpinner();
    }

    drawSpinner() {
        const graphics = this.spinnerGraphics;
        const percent = Math.floor((this.spawnProgress / this.spawnTarget) * 100);

        graphics.clear();

        if (this.spawnProgress > 0) {
            const startAngle = -Math.PI / 2;
            const endAngle = startAngle + (this.spawnProgress / this.spawnTarget) * Math.PI * 2;

            // Main progress arc
            graphics.lineStyle(5, this.spinnerColor, 1);
            graphics.beginPath();
            graphics.arc(0, -8, this.spinnerRadius - 2, startAngle, endAngle, false);
            graphics.strokePath();

            // Glow when near complete
            if (percent >= 80) {
                graphics.lineStyle(8, this.spinnerColor, 0.4);
                graphics.beginPath();
                graphics.arc(0, -8, this.spinnerRadius + 2, startAngle, endAngle, false);
                graphics.strokePath();
            }
        }

        // this.percentText.setText(`${percent}%`);  // Hidden

        // Pulse when hovering (base scale is 2)
        if (this.isHovering && percent > 0) {
            this.iconContainer.setScale(2 + Math.sin(Date.now() / 80) * 0.1);
        } else {
            this.iconContainer.setScale(2);
        }
    }

    createUnitIcon(unitType) {
        const scale = 0.5;
        const scene = this.scene;

        switch (unitType.toUpperCase()) {
            case 'PEASANT':
                this.createPeasantIcon(scene, scale);
                break;
            case 'ARCHER':
                this.createArcherIcon(scene, scale);
                break;
            case 'HORSEMAN':
                this.createHorsemanIcon(scene, scale);
                break;
        }
    }

    createPeasantIcon(scene, scale) {
        // PEASANT - Clean angular farmer with sword
        const s = scale;

        // Shadow
        this.iconContainer.add(scene.add.rectangle(0, 24 * s, 20 * s, 4 * s, 0x000000, 0.3));

        // Legs
        this.iconContainer.add(scene.add.rectangle(-4 * s, 16 * s, 6 * s, 14 * s, 0x7A5230));
        this.iconContainer.add(scene.add.rectangle(4 * s, 16 * s, 6 * s, 14 * s, 0x8A6240));
        // Boots
        this.iconContainer.add(scene.add.rectangle(-4 * s, 22 * s, 8 * s, 6 * s, 0x4A3020));
        this.iconContainer.add(scene.add.rectangle(4 * s, 22 * s, 8 * s, 6 * s, 0x5A4030));

        // Body - tan tunic
        this.iconContainer.add(scene.add.rectangle(0, 4 * s, 18 * s, 18 * s, 0xD4A855));
        this.iconContainer.add(scene.add.rectangle(0, 4 * s, 14 * s, 14 * s, 0xE4B865));
        // Belt
        this.iconContainer.add(scene.add.rectangle(0, 11 * s, 20 * s, 4 * s, 0x6B4423));
        this.iconContainer.add(scene.add.rectangle(0, 11 * s, 5 * s, 5 * s, 0xD4A020));

        // Arms
        this.iconContainer.add(scene.add.rectangle(-11 * s, 4 * s, 6 * s, 12 * s, 0xE4B865));
        this.iconContainer.add(scene.add.rectangle(11 * s, 4 * s, 6 * s, 12 * s, 0xD4A855));
        // Hands
        this.iconContainer.add(scene.add.rectangle(-11 * s, 12 * s, 6 * s, 6 * s, 0xF5CBA7));
        this.iconContainer.add(scene.add.rectangle(11 * s, 12 * s, 6 * s, 6 * s, 0xF5CBA7));

        // Head
        this.iconContainer.add(scene.add.rectangle(0, -12 * s, 18 * s, 18 * s, 0xF5CBA7));
        this.iconContainer.add(scene.add.rectangle(1 * s, -12 * s, 14 * s, 14 * s, 0xFFDDBB));
        // Hair - brown
        this.iconContainer.add(scene.add.rectangle(0, -22 * s, 20 * s, 10 * s, 0x8B5A2B));
        this.iconContainer.add(scene.add.rectangle(-5 * s, -20 * s, 6 * s, 6 * s, 0x7B4A1B));
        this.iconContainer.add(scene.add.rectangle(5 * s, -20 * s, 6 * s, 6 * s, 0x9B6A3B));
        // Eyes
        this.iconContainer.add(scene.add.rectangle(-4 * s, -12 * s, 4 * s, 4 * s, 0x3A2010));
        this.iconContainer.add(scene.add.rectangle(4 * s, -12 * s, 4 * s, 4 * s, 0x3A2010));

        // Sword (held at right side)
        this.iconContainer.add(scene.add.rectangle(18 * s, -4 * s, 5 * s, 24 * s, 0xC0C0C0));
        this.iconContainer.add(scene.add.rectangle(19 * s, -4 * s, 2 * s, 20 * s, 0xE8E8E8));
        this.iconContainer.add(scene.add.rectangle(18 * s, 10 * s, 12 * s, 4 * s, 0xD4A020));
        this.iconContainer.add(scene.add.rectangle(18 * s, 15 * s, 4 * s, 8 * s, 0x6B4423));
    }

    createArcherIcon(scene, scale) {
        // ARCHER - Hooded ranger with bow
        const s = scale;

        // Shadow
        this.iconContainer.add(scene.add.rectangle(0, 22 * s, 18 * s, 4 * s, 0x000000, 0.3));

        // Legs - green
        this.iconContainer.add(scene.add.rectangle(-4 * s, 14 * s, 6 * s, 12 * s, 0x2D5A30));
        this.iconContainer.add(scene.add.rectangle(4 * s, 14 * s, 6 * s, 12 * s, 0x3D6A40));
        // Boots
        this.iconContainer.add(scene.add.rectangle(-4 * s, 20 * s, 8 * s, 6 * s, 0x5A3A20));
        this.iconContainer.add(scene.add.rectangle(4 * s, 20 * s, 8 * s, 6 * s, 0x6A4A30));

        // Body - forest green tunic
        this.iconContainer.add(scene.add.rectangle(0, 2 * s, 16 * s, 16 * s, 0x2E7D32));
        this.iconContainer.add(scene.add.rectangle(0, 2 * s, 12 * s, 12 * s, 0x43A047));
        // Belt
        this.iconContainer.add(scene.add.rectangle(0, 8 * s, 18 * s, 3 * s, 0x5D4037));

        // Arms
        this.iconContainer.add(scene.add.rectangle(-10 * s, 2 * s, 5 * s, 12 * s, 0x43A047));
        this.iconContainer.add(scene.add.rectangle(10 * s, 2 * s, 5 * s, 12 * s, 0x2E7D32));
        // Hands
        this.iconContainer.add(scene.add.rectangle(-10 * s, 10 * s, 5 * s, 5 * s, 0xF5CBA7));
        this.iconContainer.add(scene.add.rectangle(10 * s, 10 * s, 5 * s, 5 * s, 0xF5CBA7));

        // Hood
        this.iconContainer.add(scene.add.rectangle(0, -10 * s, 20 * s, 16 * s, 0x1B5E20));
        this.iconContainer.add(scene.add.rectangle(0, -18 * s, 14 * s, 8 * s, 0x2E7D32));
        this.iconContainer.add(scene.add.rectangle(0, -22 * s, 8 * s, 6 * s, 0x388E3C));

        // Face under hood
        this.iconContainer.add(scene.add.rectangle(0, -6 * s, 12 * s, 10 * s, 0xF5CBA7));
        // Eyes - green
        this.iconContainer.add(scene.add.rectangle(-3 * s, -6 * s, 3 * s, 3 * s, 0x2E7D32));
        this.iconContainer.add(scene.add.rectangle(3 * s, -6 * s, 3 * s, 3 * s, 0x2E7D32));

        // Bow (held at right side)
        this.iconContainer.add(scene.add.rectangle(17 * s, -12 * s, 4 * s, 10 * s, 0x795548));
        this.iconContainer.add(scene.add.rectangle(18 * s, -4 * s, 4 * s, 6 * s, 0x8D6E63));
        this.iconContainer.add(scene.add.rectangle(19 * s, 2 * s, 5 * s, 6 * s, 0x8D6E63));
        this.iconContainer.add(scene.add.rectangle(18 * s, 8 * s, 4 * s, 6 * s, 0x8D6E63));
        this.iconContainer.add(scene.add.rectangle(17 * s, 14 * s, 4 * s, 10 * s, 0x795548));
        // String
        this.iconContainer.add(scene.add.rectangle(14 * s, 0, 2 * s, 30 * s, 0xE0E0E0));

        // Quiver on back
        this.iconContainer.add(scene.add.rectangle(-14 * s, 0, 6 * s, 18 * s, 0x6D5047));
        this.iconContainer.add(scene.add.rectangle(-14 * s, -8 * s, 2 * s, 6 * s, 0xE53935));
        this.iconContainer.add(scene.add.rectangle(-12 * s, -8 * s, 2 * s, 6 * s, 0xFDD835));
    }

    createHorsemanIcon(scene, scale) {
        // HORSEMAN - Mounted cavalry with rider
        const s = scale;

        // Shadow
        this.iconContainer.add(scene.add.rectangle(0, 28 * s, 36 * s, 4 * s, 0x000000, 0.3));

        // Horse legs
        this.iconContainer.add(scene.add.rectangle(-10 * s, 20 * s, 6 * s, 14 * s, 0x6D4C30));
        this.iconContainer.add(scene.add.rectangle(10 * s, 20 * s, 6 * s, 14 * s, 0x7D5C40));
        // Hooves
        this.iconContainer.add(scene.add.rectangle(-10 * s, 26 * s, 6 * s, 4 * s, 0x3D2C10));
        this.iconContainer.add(scene.add.rectangle(10 * s, 26 * s, 6 * s, 4 * s, 0x4D3C20));

        // Horse body - brown
        this.iconContainer.add(scene.add.rectangle(0, 10 * s, 34 * s, 18 * s, 0x8B5A2B));
        this.iconContainer.add(scene.add.rectangle(0, 8 * s, 28 * s, 14 * s, 0x9B6A3B));

        // Horse tail
        this.iconContainer.add(scene.add.rectangle(-18 * s, 12 * s, 4 * s, 12 * s, 0x3D2C10));

        // Horse neck and head
        this.iconContainer.add(scene.add.rectangle(16 * s, 2 * s, 10 * s, 16 * s, 0x8B5A2B));
        this.iconContainer.add(scene.add.rectangle(24 * s, -4 * s, 14 * s, 10 * s, 0x9B6A3B));
        this.iconContainer.add(scene.add.rectangle(30 * s, -2 * s, 8 * s, 8 * s, 0x8B5A2B));
        // Horse ear
        this.iconContainer.add(scene.add.rectangle(22 * s, -12 * s, 4 * s, 8 * s, 0x7B4A1B));
        // Horse eye
        this.iconContainer.add(scene.add.rectangle(24 * s, -4 * s, 3 * s, 3 * s, 0x000000));
        // Mane
        this.iconContainer.add(scene.add.rectangle(14 * s, -4 * s, 4 * s, 12 * s, 0x3D2C10));

        // Saddle
        this.iconContainer.add(scene.add.rectangle(0, 2 * s, 16 * s, 10 * s, 0x5D4037));
        this.iconContainer.add(scene.add.rectangle(0, 0, 12 * s, 6 * s, 0x6D5047));

        // Rider body - blue armor
        this.iconContainer.add(scene.add.rectangle(0, -12 * s, 14 * s, 16 * s, 0x1565C0));
        this.iconContainer.add(scene.add.rectangle(0, -10 * s, 10 * s, 12 * s, 0x1E88E5));

        // Rider arms
        this.iconContainer.add(scene.add.rectangle(-8 * s, -8 * s, 4 * s, 10 * s, 0xF5CBA7));
        this.iconContainer.add(scene.add.rectangle(8 * s, -8 * s, 4 * s, 10 * s, 0xF5CBA7));

        // Rider head with helmet
        this.iconContainer.add(scene.add.rectangle(0, -24 * s, 12 * s, 12 * s, 0xF5CBA7));
        this.iconContainer.add(scene.add.rectangle(0, -30 * s, 14 * s, 10 * s, 0x607D8B));
        this.iconContainer.add(scene.add.rectangle(0, -28 * s, 10 * s, 6 * s, 0x78909C));
        // Eyes
        this.iconContainer.add(scene.add.rectangle(-2 * s, -24 * s, 3 * s, 3 * s, 0x263238));
        this.iconContainer.add(scene.add.rectangle(4 * s, -24 * s, 3 * s, 3 * s, 0x263238));

        // Sword (held at right)
        this.iconContainer.add(scene.add.rectangle(16 * s, -18 * s, 4 * s, 22 * s, 0xC0C0C0));
        this.iconContainer.add(scene.add.rectangle(17 * s, -18 * s, 2 * s, 18 * s, 0xE0E0E0));
        this.iconContainer.add(scene.add.rectangle(16 * s, -6 * s, 10 * s, 4 * s, 0xD4A020));
    }

    onClick() {
        if (this.scene.spawnUnit) {
            this.scene.spawnUnit(this.unitType);
        }
    }

    setEnabled(enabled) {
        this.isEnabled = enabled;

        if (enabled && this.isUnlocked) {
            this.background.setFillStyle(0x2a3a4a, 0.85);
            this.innerBg.setFillStyle(0x3a4a5a, 0.7);
            this.iconContainer.setAlpha(1);
            this.goldCostText.setAlpha(1);
            this.woodCostText.setAlpha(1);
        } else {
            this.background.setFillStyle(0x1a1a2a, 0.7);
            this.innerBg.setFillStyle(0x2a2a3a, 0.5);
            this.iconContainer.setAlpha(0.4);
            this.goldCostText.setAlpha(0.4);
            this.woodCostText.setAlpha(0.4);
        }
    }

    unlock() {
        this.isUnlocked = true;
        this.lockedOverlay.setVisible(false);
        this.lockIcon.setVisible(false);
        if (this.unlockInfoText) {
            this.unlockInfoText.setVisible(false);
        }
        this.setEnabled(true);
    }

    lock() {
        this.isUnlocked = false;
        this.lockedOverlay.setVisible(true);
        this.lockIcon.setVisible(true);
        if (this.unlockInfoText) {
            this.unlockInfoText.setVisible(true);
        }
        this.setEnabled(false);
    }

    showTooltip() {
        if (this.tooltip) return;

        const stats = UNIT_TYPES[this.unitType.toUpperCase()];

        // Get XP upgrade bonuses
        const saveData = saveSystem.load();
        const upgradeLevel = saveData.upgrades[this.unitType.toLowerCase()]?.level || 1;
        const hpBonus = Math.pow(2, upgradeLevel - 1) - 1;
        const dmgBonus = Math.pow(2, upgradeLevel) - 2;
        const upgradedHP = stats.health + hpBonus;
        const upgradedDMG = stats.damage + dmgBonus;

        // Get promotion bonus from GameScene
        let finalHP = upgradedHP;
        let finalDMG = upgradedDMG;
        if (this.scene.getPromotionBonus) {
            const promotionLevel = this.scene.getPromotionLevel(this.unitType.toUpperCase());
            const promotionBonus = this.scene.getPromotionBonus(promotionLevel);
            finalHP = Math.floor(upgradedHP * promotionBonus);
            finalDMG = Math.floor(upgradedDMG * promotionBonus);
        }

        const text = `${stats.name} HP:${finalHP} DMG:${finalDMG}`;

        // Text only tooltip - x2 bigger but transparent
        this.tooltip = this.scene.add.text(this.x + 60, this.y, text, {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0, 0.5).setDepth(1000).setAlpha(0.85);
    }

    hideTooltip() {
        if (this.tooltip) {
            this.tooltip.destroy();
            this.tooltip = null;
        }
    }

    updateCosts(goldCost, woodCost) {
        this.goldCost = goldCost;
        this.woodCost = woodCost;
        this.goldCostText.setText(`${goldCost}`);
        this.woodCostText.setText(`${woodCost}`);
    }

    updateAffordableCount(gold, wood, costMultiplier = 1) {
        // Calculate how many units can be produced with current resources
        // costMultiplier is 2 for max promotion (double spawn costs double)
        const effectiveGoldCost = this.goldCost * costMultiplier;
        const effectiveWoodCost = this.woodCost * costMultiplier;
        const byGold = Math.floor(gold / effectiveGoldCost);
        const byWood = Math.floor(wood / effectiveWoodCost);
        this.affordableCount = Math.min(byGold, byWood);
    }

    getUnlockWave(unitType) {
        // XP costs to unlock units (from UpgradeScene)
        const xpCosts = {
            'PEASANT': 0,   // Already unlocked
            'ARCHER': 0,    // Already unlocked
            'HORSEMAN': 2
        };
        const xpNeeded = xpCosts[unitType.toUpperCase()] || 1;
        // 1 XP per 10 waves, so wave needed = XP * 10
        return xpNeeded * 10;
    }

    setPromotionLevel(level) {
        this.promotionLevel = level;

        // Clear existing badge graphics
        this.promotionBadgeContainer.removeAll(true);

        if (level <= 0) {
            this.promotionBadgeContainer.setVisible(false);
            return;
        }

        // Determine badge appearance
        // Level 1-2: Silver chevrons, Level 3: Silver star
        // Level 4-5: Gold chevrons, Level 6: Gold star
        const isGold = level > 3;
        const levelInTier = isGold ? level - 3 : level;
        const color = isGold ? 0xffd700 : 0xc0c0c0;
        const borderColor = isGold ? 0x8b6914 : 0x606060;

        // Level 3 or 6: Show a star instead of 3 chevrons
        if (levelInTier === 3) {
            this.drawButtonStar(6, -4, 8, color, borderColor);
        } else {
            // Draw stacked chevrons (open V shapes pointing down, like military rank)
            // Scaled down from unit badges (unit uses 16/8/8, button uses 12/6/6)
            const chevronWidth = 12;
            const chevronHeight = 6;
            const spacing = 6;

            for (let i = 0; i < levelInTier; i++) {
                const graphics = this.scene.add.graphics();
                const offsetY = -i * spacing; // Stack upward

                // Draw border first (thicker, darker) - matching unit style
                graphics.lineStyle(4, borderColor, 1);
                graphics.beginPath();
                graphics.moveTo(0, offsetY);
                graphics.lineTo(chevronWidth / 2, offsetY + chevronHeight);
                graphics.lineTo(chevronWidth, offsetY);
                graphics.strokePath();

                // Draw main chevron on top (thinner, brighter) - matching unit style
                graphics.lineStyle(2, color, 1);
                graphics.beginPath();
                graphics.moveTo(0, offsetY);
                graphics.lineTo(chevronWidth / 2, offsetY + chevronHeight);
                graphics.lineTo(chevronWidth, offsetY);
                graphics.strokePath();

                this.promotionBadgeContainer.add(graphics);
            }
        }

        this.promotionBadgeContainer.setVisible(true);

        // Animate the badge on promotion
        this.scene.tweens.add({
            targets: this.promotionBadgeContainer,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 200,
            yoyo: true,
            ease: 'Bounce.easeOut'
        });
    }

    drawButtonStar(x, y, size, fillColor, borderColor) {
        const graphics = this.scene.add.graphics();
        const points = [];
        const spikes = 5;
        const outerRadius = size;
        const innerRadius = size * 0.5;

        for (let i = 0; i < spikes * 2; i++) {
            const radius = i % 2 === 0 ? outerRadius : innerRadius;
            const angle = (i * Math.PI / spikes) - Math.PI / 2;
            points.push({
                x: x + Math.cos(angle) * radius,
                y: y + Math.sin(angle) * radius
            });
        }

        // Draw border
        graphics.lineStyle(2, borderColor, 1);
        graphics.fillStyle(fillColor, 1);
        graphics.beginPath();
        graphics.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            graphics.lineTo(points[i].x, points[i].y);
        }
        graphics.closePath();
        graphics.fillPath();
        graphics.strokePath();

        this.promotionBadgeContainer.add(graphics);
    }
}
