// Castle Class - CARTOONY castle with upgrades and arrow defense
class Castle extends Phaser.GameObjects.Container {
    constructor(scene, x, y, isPlayer = true, maxHealth = 100) {
        super(scene, x, y);

        this.scene = scene;
        this.isPlayer = isPlayer;
        this.maxHealth = maxHealth;
        this.currentHealth = maxHealth;
        this.isDead = false;
        this.level = 1;
        this.permanentHealthBonus = maxHealth - CASTLE_CONFIG.playerHealth; // Store XP upgrade bonus
        this.waveHealthBonus = 0; // Tracks HP gained from completing waves

        // Castle arrow attack properties
        this.attackRange = 300;      // How far castle can shoot
        this.attackSpeed = 700;      // Attack every 0.7 seconds
        this.arrowDamage = 8;        // Base arrow damage
        this.lastAttackTime = 0;
        this.target = null;

        // Fence properties (unlocked at level 3)
        this.hasFence = false;
        this.fenceMaxHealth = 0;
        this.fenceCurrentHealth = 0;
        this.fenceContainer = null;
        this.fenceHealthBar = null;

        // Create the detailed castle
        this.spriteContainer = scene.add.container(0, 0);
        this.createCastleSprite(scene);
        this.add(this.spriteContainer);

        // Modern health bar (no borders)
        this.createModernHealthBar(scene);

        // Level indicator
        this.levelBadge = this.createLevelBadge(scene);
        this.add(this.levelBadge);

        scene.add.existing(this);
        this.setDepth(50);
    }

    createModernHealthBar(scene) {
        // Health bar background (dark, no border)
        this.healthBarBg = scene.add.rectangle(0, -130, 110, 14, 0x1a1a2e);
        this.add(this.healthBarBg);

        // Health bar fill (gradient effect with multiple rects)
        this.healthBarFill = scene.add.rectangle(-50, -130, 100, 10, 0x00d26a);
        this.healthBarFill.setOrigin(0, 0.5);
        this.add(this.healthBarFill);

        // Health bar shine
        this.healthBarShine = scene.add.rectangle(-50, -133, 100, 3, 0x40ff9a, 0.5);
        this.healthBarShine.setOrigin(0, 0.5);
        this.add(this.healthBarShine);

        // Health text (x3 bigger, outside bar to right)
        this.healthText = scene.add.text(60, -130, `${this.currentHealth}`, {
            fontSize: '33px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5).setAlpha(0.7);  // Left-aligned at right of bar
        this.add(this.healthText);
    }

    createLevelBadge(scene) {
        const badge = scene.add.container(0, 0);  // Center of castle

        // Badge background (larger)
        const bg = scene.add.rectangle(0, 0, 40, 40, 0x2a2a4e);
        badge.add(bg);

        // Inner color
        const inner = scene.add.rectangle(0, 0, 34, 34, 0x4a4a8e);
        badge.add(inner);

        // Level text (larger)
        this.levelText = scene.add.text(0, 0, `${this.level}`, {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5).setAlpha(0.8);
        badge.add(this.levelText);

        return badge;
    }

    createCastleSprite(scene) {
        // CARTOONY CASTLE - Bright, friendly, and fun!

        // Ground/foundation shadow
        this.spriteContainer.add(scene.add.rectangle(5, 75, 160, 14, 0x000000, 0.25));

        // ============ FOUNDATION ============
        this.spriteContainer.add(scene.add.rectangle(0, 68, 170, 18, 0x887766));
        this.spriteContainer.add(scene.add.rectangle(0, 68, 166, 14, 0x998877));
        this.spriteContainer.add(scene.add.rectangle(0, 63, 162, 5, 0xAA9988));

        // ============ MAIN WALL (bright stone) ============
        this.spriteContainer.add(scene.add.rectangle(0, 20, 130, 85, 0xDDCCBB));
        this.spriteContainer.add(scene.add.rectangle(0, 22, 120, 78, 0xEEDDCC)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-50, 20, 25, 80, 0xCCBBAA)); // left shade

        // Stone brick pattern (cartoony)
        for (let row = 0; row < 4; row++) {
            for (let col = 0; col < 5; col++) {
                const offsetX = (row % 2) * 12;
                const brickX = -48 + col * 26 + offsetX;
                const brickY = -10 + row * 22;
                // Main brick (bright)
                this.spriteContainer.add(scene.add.rectangle(brickX, brickY, 24, 20, 0xDDCCBB));
                // Brick highlight
                this.spriteContainer.add(scene.add.rectangle(brickX - 6, brickY - 5, 10, 7, 0xEEDDCC, 0.6));
            }
        }

        // ============ LEFT TOWER ============
        this.spriteContainer.add(scene.add.rectangle(-55, -10, 50, 135, 0xDDCCBB));
        this.spriteContainer.add(scene.add.rectangle(-55, -8, 45, 128, 0xEEDDCC)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-73, -10, 14, 130, 0xCCBBAA)); // shade

        // Left tower roof (BRIGHT BLUE - cartoony)
        this.spriteContainer.add(scene.add.rectangle(-55, -88, 56, 10, 0x4488DD));
        this.spriteContainer.add(scene.add.rectangle(-55, -98, 48, 10, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(-55, -108, 40, 10, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(-55, -118, 32, 10, 0x66BBFF));
        this.spriteContainer.add(scene.add.rectangle(-55, -126, 24, 8, 0x77CCFF));
        this.spriteContainer.add(scene.add.rectangle(-55, -132, 16, 6, 0x88DDFF));
        this.spriteContainer.add(scene.add.rectangle(-55, -137, 8, 6, 0x99EEFF));

        // ============ RIGHT TOWER ============
        this.spriteContainer.add(scene.add.rectangle(55, -10, 50, 135, 0xDDCCBB));
        this.spriteContainer.add(scene.add.rectangle(55, -8, 45, 128, 0xEEDDCC)); // highlight
        this.spriteContainer.add(scene.add.rectangle(73, -10, 14, 130, 0xCCBBAA)); // shade

        // Right tower roof
        this.spriteContainer.add(scene.add.rectangle(55, -88, 56, 10, 0x4488DD));
        this.spriteContainer.add(scene.add.rectangle(55, -98, 48, 10, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(55, -108, 40, 10, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(55, -118, 32, 10, 0x66BBFF));
        this.spriteContainer.add(scene.add.rectangle(55, -126, 24, 8, 0x77CCFF));
        this.spriteContainer.add(scene.add.rectangle(55, -132, 16, 6, 0x88DDFF));
        this.spriteContainer.add(scene.add.rectangle(55, -137, 8, 6, 0x99EEFF));

        // ============ CENTER TOWER (Taller) ============
        this.spriteContainer.add(scene.add.rectangle(0, -30, 60, 155, 0xDDCCBB));
        this.spriteContainer.add(scene.add.rectangle(0, -28, 55, 148, 0xEEDDCC)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-24, -30, 14, 150, 0xCCBBAA)); // shade

        // Center tower roof (larger, brighter)
        this.spriteContainer.add(scene.add.rectangle(0, -118, 68, 12, 0x4488DD));
        this.spriteContainer.add(scene.add.rectangle(0, -130, 58, 12, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(0, -142, 48, 12, 0x55AAEE));
        this.spriteContainer.add(scene.add.rectangle(0, -152, 38, 10, 0x66BBFF));
        this.spriteContainer.add(scene.add.rectangle(0, -161, 28, 9, 0x77CCFF));
        this.spriteContainer.add(scene.add.rectangle(0, -169, 18, 8, 0x88DDFF));
        this.spriteContainer.add(scene.add.rectangle(0, -175, 10, 6, 0x99EEFF));

        // ============ FLAGS (bright and cheerful) ============
        // Left flag pole
        this.spriteContainer.add(scene.add.rectangle(-55, -150, 4, 28, 0x8B6633));
        // Left flag
        const leftFlag = scene.add.container(-42, -160);
        leftFlag.add(scene.add.rectangle(0, 0, 22, 16, 0x44DD44));
        leftFlag.add(scene.add.rectangle(0, 0, 18, 12, 0x66FF66));
        leftFlag.add(scene.add.rectangle(-2, 0, 6, 6, 0xFFDD00)); // star emblem
        this.spriteContainer.add(leftFlag);

        // Right flag pole
        this.spriteContainer.add(scene.add.rectangle(55, -150, 4, 28, 0x8B6633));
        // Right flag
        const rightFlag = scene.add.container(68, -160);
        rightFlag.add(scene.add.rectangle(0, 0, 22, 16, 0x44DD44));
        rightFlag.add(scene.add.rectangle(0, 0, 18, 12, 0x66FF66));
        rightFlag.add(scene.add.rectangle(-2, 0, 6, 6, 0xFFDD00));
        this.spriteContainer.add(rightFlag);

        // Animate flags (bouncy!)
        scene.tweens.add({
            targets: [leftFlag, rightFlag],
            scaleX: 0.85,
            y: '-=3',
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Center banner pole
        this.spriteContainer.add(scene.add.rectangle(0, -190, 5, 35, 0x8B6633));
        // Royal banner (golden!)
        const banner = scene.add.container(16, -198);
        banner.add(scene.add.rectangle(0, 0, 26, 38, 0xFFAA00));
        banner.add(scene.add.rectangle(0, 0, 22, 34, 0xFFDD00));
        // Crown symbol
        banner.add(scene.add.rectangle(0, -10, 12, 6, 0x4488DD));
        banner.add(scene.add.rectangle(-5, -5, 5, 10, 0x4488DD));
        banner.add(scene.add.rectangle(5, -5, 5, 10, 0x4488DD));
        banner.add(scene.add.rectangle(0, -5, 5, 10, 0x55AAEE));
        this.spriteContainer.add(banner);

        // ============ BATTLEMENTS ============
        for (let i = -2; i <= 2; i++) {
            if (Math.abs(i) > 0) {
                this.spriteContainer.add(scene.add.rectangle(i * 24, -53, 18, 22, 0xDDCCBB));
                this.spriteContainer.add(scene.add.rectangle(i * 24, -52, 16, 18, 0xEEDDCC)); // highlight
            }
        }

        // ============ WINDOWS (bright and glowy) ============
        this.createPixelWindow(scene, -55, -45);
        this.createPixelWindow(scene, -55, -5);
        this.createPixelWindow(scene, 55, -45);
        this.createPixelWindow(scene, 55, -5);
        this.createPixelWindow(scene, 0, -78, 1.4);
        this.createPixelWindow(scene, 0, -38, 1.4);

        // ============ MAIN GATE (friendly looking) ============
        // Gate arch
        this.spriteContainer.add(scene.add.rectangle(0, 18, 52, 10, 0x998877));
        this.spriteContainer.add(scene.add.rectangle(0, 14, 48, 5, 0xAA9988));

        // Gate frame (warm wood)
        this.spriteContainer.add(scene.add.rectangle(0, 44, 48, 54, 0x6B4423));
        this.spriteContainer.add(scene.add.rectangle(0, 44, 44, 50, 0x8B5A33));

        // Double doors (friendly brown)
        this.spriteContainer.add(scene.add.rectangle(-12, 46, 20, 46, 0x9B6A43));
        this.spriteContainer.add(scene.add.rectangle(12, 46, 20, 46, 0x9B6A43));
        // Door highlights
        this.spriteContainer.add(scene.add.rectangle(-16, 46, 8, 44, 0xAB7A53));
        this.spriteContainer.add(scene.add.rectangle(8, 46, 8, 44, 0xAB7A53));

        // Metal bands (golden!)
        for (let i = 0; i < 3; i++) {
            this.spriteContainer.add(scene.add.rectangle(-12, 28 + i * 16, 18, 5, 0xDDAA33));
            this.spriteContainer.add(scene.add.rectangle(12, 28 + i * 16, 18, 5, 0xDDAA33));
        }

        // Door handles (shiny gold)
        this.spriteContainer.add(scene.add.rectangle(-6, 50, 6, 6, 0xFFDD00));
        this.spriteContainer.add(scene.add.rectangle(6, 50, 6, 6, 0xFFDD00));
        this.spriteContainer.add(scene.add.rectangle(-5, 49, 3, 3, 0xFFEE66)); // shine

        // ============ TORCHES ============
        this.createPixelTorch(scene, -32, 35);
        this.createPixelTorch(scene, 32, 35);
    }

    createPixelWindow(scene, x, y, scale = 1) {
        const s = scale;
        // Window frame
        this.spriteContainer.add(scene.add.rectangle(x, y, 14 * s, 20 * s, 0x4d3827));
        // Window glass
        const glass = scene.add.rectangle(x, y, 10 * s, 16 * s, 0x4a7a9a);
        this.spriteContainer.add(glass);
        // Window shine
        this.spriteContainer.add(scene.add.rectangle(x - 2 * s, y - 4 * s, 3 * s, 6 * s, 0x8abaca, 0.6));
        // Window cross bars
        this.spriteContainer.add(scene.add.rectangle(x, y, 2 * s, 16 * s, 0x4d3827));
        this.spriteContainer.add(scene.add.rectangle(x, y, 10 * s, 2 * s, 0x4d3827));

        // Animate window glow
        scene.tweens.add({
            targets: glass,
            alpha: 0.7,
            duration: 2000,
            yoyo: true,
            repeat: -1
        });
    }

    createPixelTorch(scene, x, y) {
        // Torch bracket
        this.spriteContainer.add(scene.add.rectangle(x, y, 6, 16, 0x4a4a5a));
        this.spriteContainer.add(scene.add.rectangle(x, y - 10, 8, 8, 0x5a4030));

        // Flame (animated rectangles, no ellipses!)
        const flame1 = scene.add.rectangle(x, y - 20, 10, 14, 0xff6600);
        const flame2 = scene.add.rectangle(x, y - 22, 6, 10, 0xff9900);
        const flame3 = scene.add.rectangle(x, y - 24, 4, 6, 0xffcc00);
        this.spriteContainer.add(flame1);
        this.spriteContainer.add(flame2);
        this.spriteContainer.add(flame3);

        // Animate flame
        scene.tweens.add({
            targets: flame1,
            scaleX: 0.8,
            scaleY: 1.2,
            duration: 150,
            yoyo: true,
            repeat: -1
        });
        scene.tweens.add({
            targets: flame2,
            scaleX: 0.7,
            scaleY: 1.3,
            duration: 120,
            yoyo: true,
            repeat: -1
        });
        scene.tweens.add({
            targets: flame3,
            scaleY: 1.4,
            alpha: 0.8,
            duration: 100,
            yoyo: true,
            repeat: -1
        });
    }

    setLevel(level) {
        // Get effective max level from castle extension upgrade (+5 per level, max 60)
        const castleExtension = this.scene.saveData?.specialUpgrades?.castleExtension || 0;
        const effectiveMaxLevel = CASTLE_CONFIG.maxLevel + (castleExtension * 5);

        // Clamp level to effective max
        this.level = Math.min(level, effectiveMaxLevel);
        this.levelText.setText(`${this.level}`);

        // Update health based on level (includes permanent XP upgrade bonus + wave bonus)
        const levelHealthBonus = (this.level - 1) * 25;
        this.maxHealth = CASTLE_CONFIG.playerHealth + this.permanentHealthBonus + this.waveHealthBonus + levelHealthBonus;
        // Restore to full HP on upgrade
        this.currentHealth = this.maxHealth;
        this.updateHealthBar();

        // Scale attack stats with level
        this.arrowDamage = 8 + (this.level - 1) * 3;        // +3 damage per level
        this.attackSpeed = Math.max(150, 700 - (this.level - 1) * 40);    // Faster attacks (min 150ms at high levels)
        this.attackRange = 300 * (1 + (this.level - 1) * 0.1);  // +10% range per level

        // Fence system - unlocks at level 3
        // HP progression: 100 to 500 for levels 3-10, +100 per level beyond 10
        if (this.level >= 3) {
            const fenceHPTable = { 3: 100, 4: 150, 5: 200, 6: 275, 7: 325, 8: 400, 9: 450, 10: 500 };
            const baseFenceHP = this.level <= 10 ? (fenceHPTable[this.level] || 500) : 500;
            const extraFenceHP = this.level > 10 ? (this.level - 10) * 100 : 0;
            const newFenceHP = baseFenceHP + extraFenceHP;

            if (!this.hasFence) {
                // First time getting fence
                this.hasFence = true;
                this.fenceMaxHealth = newFenceHP;
                this.fenceCurrentHealth = this.fenceMaxHealth;
                this.createFence();
            } else {
                // Upgrade fence and repair to full
                this.fenceMaxHealth = newFenceHP;
                this.fenceCurrentHealth = this.fenceMaxHealth;
                this.updateFenceHealthBar();
                // Flash fence to show upgrade
                if (this.fenceContainer) {
                    this.scene.tweens.add({
                        targets: this.fenceContainer,
                        alpha: 0.5,
                        duration: 100,
                        yoyo: true,
                        repeat: 2
                    });
                }
            }
        }

        // Castle grows bigger with each level!
        // Level 1 = 0.6 scale (small castle), Level 20+ = 1.4 scale (grand palace)
        // Cap visual scaling at level 20 to prevent castle from getting too huge
        const minScale = 0.6;
        const maxScale = 1.4;
        const visualLevel = Math.min(this.level, 20); // Cap visual scaling at level 20
        const scaleProgress = (visualLevel - 1) / 19; // 19 = 20 - 1
        const castleScale = minScale + (maxScale - minScale) * scaleProgress;

        // Animate scale change
        this.scene.tweens.add({
            targets: this.spriteContainer,
            scaleX: castleScale,
            scaleY: castleScale,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // Update health bar position based on scale
        const barYOffset = -130 * castleScale;
        this.healthBarBg.setY(barYOffset);
        this.healthBarFill.setY(barYOffset);
        this.healthBarShine.setY(barYOffset - 3);
        this.healthText.setY(barYOffset);

        // Update level badge position (center of castle)
        this.levelBadge.setPosition(0, 0);

        // No glow effect - clean look
    }

    updateHealthBar() {
        const percent = this.currentHealth / this.maxHealth;
        this.healthBarFill.setDisplaySize(100 * percent, 10);
        this.healthBarShine.setDisplaySize(100 * percent, 3);
        this.healthText.setText(`${this.currentHealth}`);

        // Color based on health
        if (percent > 0.6) {
            this.healthBarFill.setFillStyle(0x00d26a);
            this.healthBarShine.setFillStyle(0x40ff9a, 0.5);
        } else if (percent > 0.3) {
            this.healthBarFill.setFillStyle(0xf0a030);
            this.healthBarShine.setFillStyle(0xffc060, 0.5);
        } else {
            this.healthBarFill.setFillStyle(0xd03030);
            this.healthBarShine.setFillStyle(0xff6060, 0.5);
        }
    }

    createFence() {
        // Create fence container positioned in front of castle
        this.fenceContainer = this.scene.add.container(this.x + 150, this.y);

        // Fence posts and planks - big wooden fence
        const fenceWidth = 60;
        const fenceHeight = 180;

        // Main fence body (wooden planks)
        for (let i = 0; i < 5; i++) {
            const plankX = -20 + i * 10;
            const plank = this.scene.add.rectangle(plankX, 0, 8, fenceHeight, 0x8B5A2B);
            this.fenceContainer.add(plank);
            // Plank highlight
            const highlight = this.scene.add.rectangle(plankX - 1, 0, 3, fenceHeight - 10, 0x9B6A3B);
            this.fenceContainer.add(highlight);
        }

        // Horizontal crossbeams
        this.fenceContainer.add(this.scene.add.rectangle(0, -60, fenceWidth, 12, 0x6B4423));
        this.fenceContainer.add(this.scene.add.rectangle(0, 0, fenceWidth, 12, 0x6B4423));
        this.fenceContainer.add(this.scene.add.rectangle(0, 60, fenceWidth, 12, 0x6B4423));

        // Pointed tops on each plank
        for (let i = 0; i < 5; i++) {
            const plankX = -20 + i * 10;
            const point = this.scene.add.rectangle(plankX, -fenceHeight/2 - 8, 8, 16, 0x7B4A1B);
            point.setAngle(0);
            this.fenceContainer.add(point);
        }

        // Metal reinforcements
        this.fenceContainer.add(this.scene.add.rectangle(-20, -30, 10, 6, 0x555555));
        this.fenceContainer.add(this.scene.add.rectangle(20, -30, 10, 6, 0x555555));
        this.fenceContainer.add(this.scene.add.rectangle(-20, 30, 10, 6, 0x555555));
        this.fenceContainer.add(this.scene.add.rectangle(20, 30, 10, 6, 0x555555));

        // Fence health bar (above fence)
        this.fenceHealthBarBg = this.scene.add.rectangle(0, -120, 70, 10, 0x1a1a2e);
        this.fenceContainer.add(this.fenceHealthBarBg);

        this.fenceHealthBarFill = this.scene.add.rectangle(-30, -120, 60, 6, 0x8B4513);
        this.fenceHealthBarFill.setOrigin(0, 0.5);
        this.fenceContainer.add(this.fenceHealthBarFill);

        this.fenceHealthText = this.scene.add.text(55, -120, `${this.fenceCurrentHealth}`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);  // Outside bar to right, x2 bigger
        this.fenceContainer.add(this.fenceHealthText);

        // "FENCE" label
        const fenceLabel = this.scene.add.text(0, -135, 'FENCE', {
            fontSize: '8px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#8B4513'
        }).setOrigin(0.5);
        this.fenceContainer.add(fenceLabel);

        this.fenceContainer.setDepth(45);

        // Spawn animation
        this.fenceContainer.setScale(0);
        this.scene.tweens.add({
            targets: this.fenceContainer,
            scaleX: 1,
            scaleY: 1,
            duration: 500,
            ease: 'Back.easeOut'
        });
    }

    updateFenceHealthBar() {
        if (!this.fenceHealthBarFill || !this.fenceHealthText) return;

        const percent = this.fenceCurrentHealth / this.fenceMaxHealth;
        this.fenceHealthBarFill.setDisplaySize(60 * percent, 6);
        this.fenceHealthText.setText(`${this.fenceCurrentHealth}`);

        // Color based on health
        if (percent > 0.6) {
            this.fenceHealthBarFill.setFillStyle(0x8B4513);
        } else if (percent > 0.3) {
            this.fenceHealthBarFill.setFillStyle(0xCD853F);
        } else {
            this.fenceHealthBarFill.setFillStyle(0xD2691E);
        }
    }

    destroyFence() {
        if (!this.fenceContainer) return;

        // Play destruction sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playCastleHit();
        }

        // Debris explosion
        for (let i = 0; i < 10; i++) {
            const debris = this.scene.add.rectangle(
                this.fenceContainer.x + Phaser.Math.Between(-30, 30),
                this.fenceContainer.y + Phaser.Math.Between(-60, 60),
                Phaser.Math.Between(6, 14),
                Phaser.Math.Between(6, 14),
                Phaser.Math.RND.pick([0x8B5A2B, 0x6B4423, 0x5A3A20])
            );

            this.scene.tweens.add({
                targets: debris,
                x: debris.x + Phaser.Math.Between(-80, 80),
                y: debris.y + Phaser.Math.Between(30, 100),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(600, 1000),
                onComplete: () => debris.destroy()
            });
        }

        // Destroy fence container
        this.fenceContainer.destroy();
        this.fenceContainer = null;
        this.hasFence = false;
        this.fenceCurrentHealth = 0;
    }

    takeDamage(amount) {
        if (this.isDead) return;

        // Apply armor damage reduction: -5% per armor level (level 1 = 0%, level 2 = 5%, etc.)
        const armorLevel = this.armorLevel || 1;
        const damageReduction = Math.min((armorLevel - 1) * 0.05, 0.75); // Cap at 75% reduction
        const reducedAmount = Math.max(1, Math.floor(amount * (1 - damageReduction))); // Minimum 1 damage

        // If fence exists, damage fence first
        if (this.hasFence && this.fenceCurrentHealth > 0) {
            this.fenceCurrentHealth -= reducedAmount;

            // Play orc hit sound (same for all orc attacks)
            if (typeof audioManager !== 'undefined') {
                audioManager.playOrcHit();
            }

            // Shake fence
            if (this.fenceContainer) {
                this.scene.tweens.add({
                    targets: this.fenceContainer,
                    x: this.fenceContainer.x + Phaser.Math.Between(-5, 5),
                    duration: 50,
                    yoyo: true,
                    repeat: 2,
                    onComplete: () => {
                        if (this.fenceContainer) {
                            this.fenceContainer.x = this.x + 150;
                        }
                    }
                });

                // Flash fence red
                this.fenceContainer.list.forEach(child => {
                    if (child.setTint) child.setTint(0xff6666);
                });
                this.scene.time.delayedCall(100, () => {
                    if (this.fenceContainer) {
                        this.fenceContainer.list.forEach(child => {
                            if (child.clearTint) child.clearTint();
                        });
                    }
                });
            }

            if (this.fenceCurrentHealth <= 0) {
                this.fenceCurrentHealth = 0;
                this.destroyFence();
            } else {
                this.updateFenceHealthBar();
            }
            return; // Fence absorbed the damage
        }

        // No fence or fence destroyed - damage castle (with armor reduction)
        this.currentHealth -= reducedAmount;
        this.currentHealth = Math.max(0, this.currentHealth);
        this.updateHealthBar();

        // Play orc hit sound (same for all orc attacks)
        if (typeof audioManager !== 'undefined') {
            audioManager.playOrcHit();
        }

        // Shake effect
        this.scene.tweens.add({
            targets: this,
            x: this.x + Phaser.Math.Between(-8, 8),
            duration: 50,
            yoyo: true,
            repeat: 4,
            onComplete: () => {
                this.x = CASTLE_CONFIG.playerX;
            }
        });

        // Flash effect
        this.spriteContainer.list.forEach(child => {
            if (child.setTint) child.setTint(0xff0000);
        });
        this.scene.time.delayedCall(150, () => {
            this.spriteContainer.list.forEach(child => {
                if (child.clearTint) child.clearTint();
            });
        });

        // Debris particles (rectangles, not circles!)
        for (let i = 0; i < 5; i++) {
            const debris = this.scene.add.rectangle(
                this.x + Phaser.Math.Between(-40, 40),
                this.y + Phaser.Math.Between(-60, 40),
                Phaser.Math.Between(4, 8),
                Phaser.Math.Between(4, 8),
                0x6b6b7a
            );
            this.scene.tweens.add({
                targets: debris,
                y: debris.y + 60,
                alpha: 0,
                angle: Phaser.Math.Between(-90, 90),
                duration: 600,
                onComplete: () => debris.destroy()
            });
        }

        // Check for emergency reinforcement trigger (HP below 50%)
        if (this.scene.checkEmergencyReinforcement) {
            this.scene.checkEmergencyReinforcement();
        }

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;

        // Play castle destruction explosion sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playCastleDestroyed();
        }

        // Destruction animation
        this.scene.tweens.add({
            targets: this.spriteContainer,
            scaleY: 0.3,
            y: 50,
            alpha: 0.5,
            duration: 1000,
            ease: 'Bounce.easeOut'
        });

        // Debris explosion (rectangles only)
        for (let i = 0; i < 20; i++) {
            const debris = this.scene.add.rectangle(
                this.x + Phaser.Math.Between(-50, 50),
                this.y + Phaser.Math.Between(-80, 40),
                Phaser.Math.Between(8, 20),
                Phaser.Math.Between(8, 20),
                Phaser.Math.RND.pick([0x6b6b7a, 0x5a5a6a, 0x4a4a5a])
            );

            this.scene.tweens.add({
                targets: debris,
                x: debris.x + Phaser.Math.Between(-100, 100),
                y: debris.y + Phaser.Math.Between(50, 150),
                angle: Phaser.Math.Between(-180, 180),
                alpha: 0,
                duration: Phaser.Math.Between(800, 1500),
                onComplete: () => debris.destroy()
            });
        }

        // Smoke (rectangles with alpha)
        for (let i = 0; i < 10; i++) {
            const smoke = this.scene.add.rectangle(
                this.x + Phaser.Math.Between(-30, 30),
                this.y + Phaser.Math.Between(-40, 20),
                Phaser.Math.Between(15, 35),
                Phaser.Math.Between(15, 35),
                0x333333,
                0.7
            );

            this.scene.tweens.add({
                targets: smoke,
                y: smoke.y - 100,
                scaleX: 2,
                scaleY: 2,
                alpha: 0,
                duration: 2000,
                delay: i * 100,
                onComplete: () => smoke.destroy()
            });
        }

        if (this.scene.onPlayerCastleDestroyed) {
            this.scene.onPlayerCastleDestroyed();
        }
    }

    heal(amount) {
        if (this.isDead) return;

        this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
        this.updateHealthBar();

        // Heal text
        const healText = this.scene.add.text(this.x, this.y - 100, `+${amount}`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#40ff9a'
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: healText,
            y: this.y - 150,
            alpha: 0,
            duration: 1000,
            onComplete: () => healText.destroy()
        });

        // Green glow (rectangle)
        const glow = this.scene.add.rectangle(this.x, this.y, 160, 200, 0x00ff00, 0.2);
        this.scene.tweens.add({
            targets: glow,
            scaleX: 1.3,
            scaleY: 1.3,
            alpha: 0,
            duration: 500,
            onComplete: () => glow.destroy()
        });
    }

    reset() {
        this.currentHealth = this.maxHealth;
        this.isDead = false;
        this.updateHealthBar();
        this.setAlpha(1);
        this.spriteContainer.setScale(1);
        this.spriteContainer.y = 0;

        // Reset fence if castle level >= 3
        if (this.level >= 3) {
            if (this.fenceContainer) {
                this.fenceContainer.destroy();
                this.fenceContainer = null;
            }
            // Fence HP: 100 to 500 for levels 3-10
            const fenceHPTable = { 3: 100, 4: 150, 5: 200, 6: 275, 7: 325, 8: 400, 9: 450, 10: 500 };
            this.hasFence = true;
            this.fenceMaxHealth = fenceHPTable[this.level] || 500;
            this.fenceCurrentHealth = this.fenceMaxHealth;
            this.createFence();
        } else {
            // Destroy fence if level below 3
            if (this.fenceContainer) {
                this.fenceContainer.destroy();
                this.fenceContainer = null;
            }
            this.hasFence = false;
            this.fenceCurrentHealth = 0;
            this.fenceMaxHealth = 0;
        }
    }

    update(time, delta) {
        if (this.isDead) return;

        // Find closest enemy in range
        this.target = this.findTarget();

        if (this.target && time - this.lastAttackTime >= this.attackSpeed) {
            this.shootArrow(time);
        }
    }

    findTarget() {
        // Castle only shoots arrows from level 2+
        if (this.level < 2) return null;
        if (!this.scene.enemies) return null;

        // Keep current target if still alive and in range (focus fire)
        if (this.target && this.target.active && !this.target.isDead) {
            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                this.target.x, this.target.y
            );
            if (distance <= this.attackRange) {
                return this.target;
            }
        }

        // Find new target - prioritize most powerful enemy (highest damage) in range
        let bestTarget = null;
        let highestThreat = -1;

        this.scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active || enemy.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                enemy.x, enemy.y
            );

            if (distance <= this.attackRange) {
                // Threat score: damage * 10 + current health (prioritize high damage dealers)
                const threat = (enemy.damage || 10) * 10 + (enemy.currentHealth || 50);
                if (threat > highestThreat) {
                    highestThreat = threat;
                    bestTarget = enemy;
                }
            }
        });

        return bestTarget;
    }

    shootArrow(time) {
        this.lastAttackTime = time;

        // Play arrow sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playArrow();
        }

        // Create arrow projectile from tower positions
        const towerOffsets = [
            { x: -55, y: -80 },  // Left tower
            { x: 55, y: -80 },   // Right tower
            { x: 0, y: -100 }    // Center tower
        ];

        // Shoot from a random tower
        const tower = Phaser.Math.RND.pick(towerOffsets);

        const projectile = new Projectile(
            this.scene,
            this.x + tower.x,
            this.y + tower.y,
            this.target,
            {
                damage: this.arrowDamage,
                speed: 2000,  // Fast castle arrows
                color: 0xFFAA00,
                isPlayerProjectile: true,
                projectileType: 'arrow',
                isCastleArrow: true,  // Castle arrows play sound on shoot, not hit
                scale: 1.5,  // 50% bigger castle arrows
                maxDistance: this.attackRange + 100  // Match castle's attack range
            }
        );

        this.scene.projectiles.add(projectile);
    }
}
