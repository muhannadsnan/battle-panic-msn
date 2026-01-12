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
        this.promotionLevel = 0;
        this.promotionBadgeContainer = scene.add.container(buttonWidth / 2 - 12, -buttonHeight / 2 + 10);
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
        // SIMPLE SWORD ICON
        const s = scale;

        // Blade
        this.iconContainer.add(scene.add.rectangle(0, -8 * s, 8 * s, 36 * s, 0xC0C0C0));
        this.iconContainer.add(scene.add.rectangle(1 * s, -8 * s, 4 * s, 32 * s, 0xE8E8E8)); // shine
        // Blade tip
        this.iconContainer.add(scene.add.rectangle(0, -28 * s, 6 * s, 8 * s, 0xD0D0D0));
        // Cross guard (gold)
        this.iconContainer.add(scene.add.rectangle(0, 12 * s, 24 * s, 6 * s, 0xFFD700));
        this.iconContainer.add(scene.add.rectangle(0, 12 * s, 20 * s, 4 * s, 0xFFEE44)); // highlight
        // Handle (brown leather)
        this.iconContainer.add(scene.add.rectangle(0, 22 * s, 6 * s, 14 * s, 0x8B4513));
        this.iconContainer.add(scene.add.rectangle(0, 20 * s, 4 * s, 3 * s, 0x6B3503)); // wrap
        this.iconContainer.add(scene.add.rectangle(0, 24 * s, 4 * s, 3 * s, 0x6B3503)); // wrap
        // Pommel (gold)
        this.iconContainer.add(scene.add.rectangle(0, 30 * s, 8 * s, 6 * s, 0xFFD700));
    }

    createArcherIcon(scene, scale) {
        // DRAWN BOW ICON - stressed/pulled back
        const s = scale;

        // Bow body (curved, stressed shape)
        this.iconContainer.add(scene.add.rectangle(8 * s, -20 * s, 5 * s, 12 * s, 0x8B4513));
        this.iconContainer.add(scene.add.rectangle(12 * s, -12 * s, 5 * s, 10 * s, 0x9B5523));
        this.iconContainer.add(scene.add.rectangle(14 * s, 0, 5 * s, 14 * s, 0x9B5523));
        this.iconContainer.add(scene.add.rectangle(12 * s, 12 * s, 5 * s, 10 * s, 0x9B5523));
        this.iconContainer.add(scene.add.rectangle(8 * s, 20 * s, 5 * s, 12 * s, 0x8B4513));
        // Bow tips
        this.iconContainer.add(scene.add.rectangle(6 * s, -26 * s, 4 * s, 5 * s, 0x6B3503));
        this.iconContainer.add(scene.add.rectangle(6 * s, 26 * s, 4 * s, 5 * s, 0x6B3503));
        // Bowstring - pulled back (diagonal lines to nock point)
        this.iconContainer.add(scene.add.rectangle(-4 * s, -13 * s, 2 * s, 28 * s, 0xDDCCBB).setAngle(10));
        this.iconContainer.add(scene.add.rectangle(-4 * s, 13 * s, 2 * s, 28 * s, 0xDDCCBB).setAngle(-10));
        // Arrow nocked and ready
        this.iconContainer.add(scene.add.rectangle(-10 * s, 0, 32 * s, 3 * s, 0x8B6B4A)); // shaft
        this.iconContainer.add(scene.add.rectangle(-28 * s, 0, 10 * s, 5 * s, 0xA0A0B0)); // arrowhead
        // Fletching
        this.iconContainer.add(scene.add.rectangle(6 * s, -2 * s, 5 * s, 2 * s, 0xFF4444));
        this.iconContainer.add(scene.add.rectangle(6 * s, 2 * s, 5 * s, 2 * s, 0xFF4444));
    }

    createHorsemanIcon(scene, scale) {
        // ICONIC HORSE HEAD - simple silhouette
        const s = scale;

        // Neck (angled)
        this.iconContainer.add(scene.add.rectangle(-4 * s, 12 * s, 14 * s, 22 * s, 0x8B4513));
        // Head
        this.iconContainer.add(scene.add.rectangle(6 * s, -2 * s, 20 * s, 16 * s, 0x8B4513));
        // Snout
        this.iconContainer.add(scene.add.rectangle(18 * s, 4 * s, 12 * s, 10 * s, 0x7B3503));
        // Eye (simple)
        this.iconContainer.add(scene.add.rectangle(4 * s, -4 * s, 5 * s, 5 * s, 0x000000));
        // Ear (single, alert)
        this.iconContainer.add(scene.add.rectangle(0, -16 * s, 6 * s, 14 * s, 0x7B3503));
        // Mane (flowing)
        this.iconContainer.add(scene.add.rectangle(-12 * s, -4 * s, 8 * s, 18 * s, 0x3B2503));
        this.iconContainer.add(scene.add.rectangle(-14 * s, 6 * s, 6 * s, 14 * s, 0x2B1503));
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
        }).setOrigin(0, 0.5).setDepth(1000).setAlpha(0.6);
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
        // Level 1-3: Silver chevrons, Level 4-6: Gold chevrons
        // Military style: V-shaped chevrons stacked vertically (matching unit badges)
        const isGold = level > 3;
        const numChevrons = isGold ? level - 3 : level;
        const color = isGold ? 0xffd700 : 0xc0c0c0;
        const borderColor = isGold ? 0x8b6914 : 0x606060;

        // Draw stacked chevrons (open V shapes pointing down, like military rank)
        // Scaled down from unit badges (unit uses 16/8/8, button uses 12/6/6)
        const chevronWidth = 12;
        const chevronHeight = 6;
        const spacing = 6;

        for (let i = 0; i < numChevrons; i++) {
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
}
