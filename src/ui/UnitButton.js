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

        const buttonWidth = 90;
        const buttonHeight = 95;

        // Light background for visibility
        this.background = scene.add.rectangle(0, 0, buttonWidth, buttonHeight, 0x2a3a4a, 0.85);
        this.add(this.background);

        // Inner lighter area
        this.innerBg = scene.add.rectangle(0, -5, buttonWidth - 8, buttonHeight - 20, 0x3a4a5a, 0.7);
        this.add(this.innerBg);

        const spinnerRadius = 32;  // Bigger spinner

        // Spinner graphics for progress arc
        this.spinnerGraphics = scene.add.graphics();
        this.add(this.spinnerGraphics);
        this.spinnerRadius = spinnerRadius;
        this.spinnerColor = stats.color;

        // Unit icon container - 2x BIGGER
        this.iconContainer = scene.add.container(0, -5);
        this.iconContainer.setScale(2);  // Double the size!
        this.createUnitIcon(unitType);
        this.add(this.iconContainer);

        // Percentage text (hidden by default, shows when hovering)
        this.percentText = scene.add.text(0, 28, '0%', {
            fontSize: '12px',
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
        this.goldCostText = scene.add.text(-18, 38, `${this.goldCost}g`, {
            fontSize: '12px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.goldCostText);

        this.woodCostText = scene.add.text(20, 38, `${this.woodCost}w`, {
            fontSize: '12px',
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
            fontSize: '24px'
        }).setOrigin(0.5);
        this.add(this.lockIcon);

        // Unlock info text (shows wave needed)
        const unlockWave = this.getUnlockWave(unitType);
        this.unlockInfoText = scene.add.text(0, 18, `Wave ${unlockWave}`, {
            fontSize: '11px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffaa00',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        this.add(this.unlockInfoText);

        // Promotion badge (hidden by default, shows after 10 spawns)
        this.promotionLevel = 0;
        this.promotionBadge = scene.add.text(buttonWidth / 2 - 8, -buttonHeight / 2 + 8, '', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setVisible(false);
        this.add(this.promotionBadge);

        if (isUnlocked) {
            this.unlock();
        }

        // Make interactive
        this.background.setInteractive({ useHandCursor: true });

        this.background.on('pointerover', () => {
            if (this.isEnabled && this.isUnlocked) {
                this.isHovering = true;
                this.hoverStartTime = Date.now(); // Record when hover started
                this.innerBg.setFillStyle(0x4a6a8a, 0.85);
                this.percentText.setVisible(true);
                this.showTooltip();
            }
        });

        this.background.on('pointerout', () => {
            this.isHovering = false;
            this.hoverStartTime = 0;
            this.innerBg.setFillStyle(0x3a4a5a, 0.7);
            this.percentText.setVisible(false);
            this.hideTooltip();
        });

        // Click still works for instant spawn
        this.background.on('pointerdown', () => {
            if (this.isUnlocked) {
                if (this.isEnabled) {
                    audioManager.playClick();
                    this.onClick();
                } else {
                    // Not enough resources - play warning
                    audioManager.playWarning();
                }
            }
        });

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

        this.percentText.setText(`${percent}%`);

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
            case 'KNIGHT':
                this.createKnightIcon(scene, scale);
                break;
            case 'WIZARD':
                this.createWizardIcon(scene, scale);
                break;
            case 'GIANT':
                this.createGiantIcon(scene, scale);
                break;
        }
    }

    createPeasantIcon(scene, scale) {
        // CARTOONY PEASANT ICON - Friendly farmer
        const s = scale;

        // Body (brown tunic)
        this.iconContainer.add(scene.add.rectangle(0, 5 * s, 16 * s, 22 * s, 0xC4956A));
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 14 * s, 18 * s, 0xD4A57A)); // highlight

        // Big cartoony head
        this.iconContainer.add(scene.add.rectangle(0, -10 * s, 18 * s, 16 * s, 0xFFCBA4));
        this.iconContainer.add(scene.add.rectangle(-2 * s, -12 * s, 12 * s, 10 * s, 0xFFDDB8)); // face highlight

        // Cute eyes
        this.iconContainer.add(scene.add.rectangle(-4 * s, -10 * s, 6 * s, 7 * s, 0xFFFFFF)); // left eye
        this.iconContainer.add(scene.add.rectangle(-3 * s, -9 * s, 4 * s, 5 * s, 0x4A3020)); // left pupil
        this.iconContainer.add(scene.add.rectangle(-4 * s, -11 * s, 2 * s, 2 * s, 0xFFFFFF)); // left shine
        this.iconContainer.add(scene.add.rectangle(4 * s, -10 * s, 6 * s, 7 * s, 0xFFFFFF)); // right eye
        this.iconContainer.add(scene.add.rectangle(5 * s, -9 * s, 4 * s, 5 * s, 0x4A3020)); // right pupil

        // Rosy cheeks
        this.iconContainer.add(scene.add.rectangle(-7 * s, -6 * s, 4 * s, 3 * s, 0xFFAAAA, 0.5));
        this.iconContainer.add(scene.add.rectangle(7 * s, -6 * s, 4 * s, 3 * s, 0xFFAAAA, 0.5));

        // Happy mouth
        this.iconContainer.add(scene.add.rectangle(0, -4 * s, 6 * s, 3 * s, 0xFF9988));

        // Hair
        this.iconContainer.add(scene.add.rectangle(0, -17 * s, 16 * s, 6 * s, 0x6B4423));

        // Pitchfork
        this.iconContainer.add(scene.add.rectangle(12 * s, 0, 3 * s, 28 * s, 0x9B7B5A));
        this.iconContainer.add(scene.add.rectangle(12 * s, -15 * s, 3 * s, 10 * s, 0x8899AA));
        this.iconContainer.add(scene.add.rectangle(8 * s, -16 * s, 3 * s, 8 * s, 0x8899AA));
        this.iconContainer.add(scene.add.rectangle(16 * s, -16 * s, 3 * s, 8 * s, 0x8899AA));
    }

    createArcherIcon(scene, scale) {
        // CARTOONY ARCHER ICON - Forest ranger
        const s = scale;

        // Body (green tunic)
        this.iconContainer.add(scene.add.rectangle(0, 5 * s, 14 * s, 20 * s, 0x4CAF50));
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 12 * s, 16 * s, 0x66BB6A)); // highlight

        // Hood (stacked rectangles for pyramid)
        this.iconContainer.add(scene.add.rectangle(0, -6 * s, 18 * s, 10 * s, 0x388E3C));
        this.iconContainer.add(scene.add.rectangle(0, -12 * s, 14 * s, 8 * s, 0x2E7D32));
        this.iconContainer.add(scene.add.rectangle(0, -17 * s, 10 * s, 6 * s, 0x1B5E20));

        // Face peeking out
        this.iconContainer.add(scene.add.rectangle(0, -4 * s, 12 * s, 10 * s, 0xFFCBA4));
        this.iconContainer.add(scene.add.rectangle(-1 * s, -5 * s, 8 * s, 7 * s, 0xFFDDB8)); // highlight

        // Cute eyes
        this.iconContainer.add(scene.add.rectangle(-3 * s, -5 * s, 5 * s, 6 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(-2 * s, -4 * s, 3 * s, 4 * s, 0x2E7D32));
        this.iconContainer.add(scene.add.rectangle(3 * s, -5 * s, 5 * s, 6 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(4 * s, -4 * s, 3 * s, 4 * s, 0x2E7D32));

        // Bow (rectangles only)
        this.iconContainer.add(scene.add.rectangle(12 * s, -6 * s, 3 * s, 12 * s, 0xA87B5A));
        this.iconContainer.add(scene.add.rectangle(12 * s, 6 * s, 3 * s, 12 * s, 0xA87B5A));
        this.iconContainer.add(scene.add.rectangle(14 * s, 0, 2 * s, 22 * s, 0xD4A574)); // string
    }

    createKnightIcon(scene, scale) {
        // CARTOONY KNIGHT ICON - Brave hero
        const s = scale;

        // Body (blue armor)
        this.iconContainer.add(scene.add.rectangle(0, 5 * s, 18 * s, 24 * s, 0x5B8DEE));
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 16 * s, 20 * s, 0x7BA3FF)); // highlight
        this.iconContainer.add(scene.add.rectangle(-5 * s, 8 * s, 4 * s, 16 * s, 0x4B7DDE)); // shade

        // Helmet
        this.iconContainer.add(scene.add.rectangle(0, -10 * s, 16 * s, 14 * s, 0x8899AA));
        this.iconContainer.add(scene.add.rectangle(0, -9 * s, 14 * s, 10 * s, 0x99AABB)); // highlight
        this.iconContainer.add(scene.add.rectangle(0, -16 * s, 12 * s, 4 * s, 0x7789AA)); // top

        // Plume (stacked rectangles)
        this.iconContainer.add(scene.add.rectangle(0, -20 * s, 8 * s, 6 * s, 0xFF5555));
        this.iconContainer.add(scene.add.rectangle(0, -24 * s, 6 * s, 5 * s, 0xFF6666));
        this.iconContainer.add(scene.add.rectangle(0, -27 * s, 4 * s, 4 * s, 0xFF7777));

        // Visor slot (eyes peeking)
        this.iconContainer.add(scene.add.rectangle(0, -8 * s, 12 * s, 4 * s, 0x222222));
        this.iconContainer.add(scene.add.rectangle(-3 * s, -8 * s, 3 * s, 3 * s, 0x55AAFF)); // eye glow
        this.iconContainer.add(scene.add.rectangle(3 * s, -8 * s, 3 * s, 3 * s, 0x55AAFF));

        // Shield
        this.iconContainer.add(scene.add.rectangle(-12 * s, 5 * s, 10 * s, 14 * s, 0x5B8DEE));
        this.iconContainer.add(scene.add.rectangle(-12 * s, 5 * s, 8 * s, 12 * s, 0x7BA3FF));
        this.iconContainer.add(scene.add.rectangle(-12 * s, 5 * s, 4 * s, 6 * s, 0xFFDD00)); // emblem

        // Sword
        this.iconContainer.add(scene.add.rectangle(14 * s, -5 * s, 4 * s, 22 * s, 0xCCDDEE));
        this.iconContainer.add(scene.add.rectangle(14 * s, -4 * s, 3 * s, 18 * s, 0xDDEEFF)); // shine
        this.iconContainer.add(scene.add.rectangle(14 * s, 8 * s, 8 * s, 4 * s, 0xFFDD00)); // hilt
    }

    createWizardIcon(scene, scale) {
        // CARTOONY WIZARD ICON - Mystical mage
        const s = scale;

        // Robe (purple, stacked for pyramid shape)
        this.iconContainer.add(scene.add.rectangle(0, 12 * s, 20 * s, 16 * s, 0xAA55DD));
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 16 * s, 12 * s, 0xBB66EE));
        this.iconContainer.add(scene.add.rectangle(0, 0, 12 * s, 10 * s, 0xCC77FF));

        // Face
        this.iconContainer.add(scene.add.rectangle(0, -8 * s, 14 * s, 12 * s, 0xFFCBA4));
        this.iconContainer.add(scene.add.rectangle(-1 * s, -9 * s, 10 * s, 8 * s, 0xFFDDB8));

        // Wise eyes
        this.iconContainer.add(scene.add.rectangle(-4 * s, -8 * s, 5 * s, 6 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(-3 * s, -7 * s, 3 * s, 4 * s, 0x6633AA));
        this.iconContainer.add(scene.add.rectangle(4 * s, -8 * s, 5 * s, 6 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(5 * s, -7 * s, 3 * s, 4 * s, 0x6633AA));

        // Beard
        this.iconContainer.add(scene.add.rectangle(0, -2 * s, 10 * s, 6 * s, 0xDDDDDD));
        this.iconContainer.add(scene.add.rectangle(0, 2 * s, 8 * s, 5 * s, 0xEEEEEE));
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 6 * s, 4 * s, 0xFFFFFF));

        // Wizard hat (stacked rectangles)
        this.iconContainer.add(scene.add.rectangle(0, -16 * s, 18 * s, 6 * s, 0xAA55DD));
        this.iconContainer.add(scene.add.rectangle(0, -21 * s, 14 * s, 6 * s, 0xBB66EE));
        this.iconContainer.add(scene.add.rectangle(0, -26 * s, 10 * s, 6 * s, 0xCC77FF));
        this.iconContainer.add(scene.add.rectangle(0, -30 * s, 6 * s, 5 * s, 0xDD88FF));
        // Star on hat
        this.iconContainer.add(scene.add.rectangle(0, -25 * s, 5 * s, 5 * s, 0xFFDD00));
        this.iconContainer.add(scene.add.rectangle(0, -25 * s, 3 * s, 3 * s, 0xFFEE55));

        // Staff
        this.iconContainer.add(scene.add.rectangle(14 * s, 2 * s, 4 * s, 32 * s, 0x8B6B4A));
        this.iconContainer.add(scene.add.rectangle(14 * s, -16 * s, 8 * s, 8 * s, 0x55FFFF)); // orb
        this.iconContainer.add(scene.add.rectangle(12 * s, -18 * s, 4 * s, 4 * s, 0xAAFFFF)); // orb shine
    }

    createGiantIcon(scene, scale) {
        // CARTOONY GIANT ICON - Friendly brute
        const s = scale * 0.85;

        // Massive body
        this.iconContainer.add(scene.add.rectangle(0, 6 * s, 24 * s, 30 * s, 0xDD8844));
        this.iconContainer.add(scene.add.rectangle(0, 7 * s, 22 * s, 26 * s, 0xEE9955)); // highlight
        this.iconContainer.add(scene.add.rectangle(-8 * s, 8 * s, 6 * s, 24 * s, 0xCC7733)); // shade

        // Big friendly head
        this.iconContainer.add(scene.add.rectangle(0, -14 * s, 22 * s, 20 * s, 0xFFCBA4));
        this.iconContainer.add(scene.add.rectangle(-2 * s, -15 * s, 16 * s, 14 * s, 0xFFDDB8));

        // Big goofy eyes
        this.iconContainer.add(scene.add.rectangle(-5 * s, -14 * s, 8 * s, 9 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(-4 * s, -13 * s, 5 * s, 6 * s, 0x664422));
        this.iconContainer.add(scene.add.rectangle(-5 * s, -15 * s, 3 * s, 3 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(5 * s, -14 * s, 8 * s, 9 * s, 0xFFFFFF));
        this.iconContainer.add(scene.add.rectangle(6 * s, -13 * s, 5 * s, 6 * s, 0x664422));

        // Happy grin
        this.iconContainer.add(scene.add.rectangle(0, -6 * s, 12 * s, 5 * s, 0xFF9988));
        this.iconContainer.add(scene.add.rectangle(0, -7 * s, 10 * s, 3 * s, 0xFFFFFF)); // teeth

        // Messy hair
        this.iconContainer.add(scene.add.rectangle(-6 * s, -24 * s, 6 * s, 8 * s, 0x664422));
        this.iconContainer.add(scene.add.rectangle(0, -25 * s, 6 * s, 10 * s, 0x775533));
        this.iconContainer.add(scene.add.rectangle(6 * s, -24 * s, 6 * s, 8 * s, 0x664422));

        // Big club
        this.iconContainer.add(scene.add.rectangle(18 * s, 2 * s, 6 * s, 32 * s, 0x8B6B4A));
        this.iconContainer.add(scene.add.rectangle(18 * s, -16 * s, 12 * s, 16 * s, 0x6B4B2A));
        this.iconContainer.add(scene.add.rectangle(18 * s, -15 * s, 10 * s, 12 * s, 0x7B5B3A)); // highlight
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
        const text = `${stats.name} HP:${stats.health} DMG:${stats.damage}`;

        // Text only tooltip - no boxes
        this.tooltip = this.scene.add.text(this.x + 50, this.y, text, {
            fontSize: '10px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5).setDepth(1000);
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

    updateAffordableCount(gold, wood) {
        // Calculate how many units can be produced with current resources
        const byGold = Math.floor(gold / this.goldCost);
        const byWood = Math.floor(wood / this.woodCost);
        this.affordableCount = Math.min(byGold, byWood);
    }

    getUnlockWave(unitType) {
        // XP costs to unlock units (from UpgradeScene)
        const xpCosts = {
            'PEASANT': 0,   // Already unlocked
            'ARCHER': 0,    // Already unlocked
            'KNIGHT': 2,
            'WIZARD': 3,
            'GIANT': 5
        };
        const xpNeeded = xpCosts[unitType.toUpperCase()] || 1;
        // 1 XP per 10 waves, so wave needed = XP * 10
        return xpNeeded * 10;
    }

    setPromotionLevel(level) {
        this.promotionLevel = level;

        if (level <= 0) {
            this.promotionBadge.setVisible(false);
            return;
        }

        // Determine badge appearance
        // Level 1-3: Silver (★, ★★, ★★★)
        // Level 4-6: Gold (★, ★★, ★★★)
        let color, signs;
        if (level <= 3) {
            color = '#c0c0c0'; // Silver
            signs = level;
        } else {
            color = '#ffd700'; // Gold
            signs = level - 3;
        }

        const badgeText = '★'.repeat(signs);
        this.promotionBadge.setText(badgeText);
        this.promotionBadge.setColor(color);
        this.promotionBadge.setVisible(true);

        // Animate the badge on promotion
        this.scene.tweens.add({
            targets: this.promotionBadge,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 200,
            yoyo: true,
            ease: 'Bounce.easeOut'
        });
    }
}
