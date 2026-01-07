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

        // Castle arrow attack properties
        this.attackRange = 300;      // How far castle can shoot
        this.attackSpeed = 1000;     // Attack every 1 second (2x faster)
        this.arrowDamage = 5;        // Base arrow damage
        this.lastAttackTime = 0;
        this.target = null;

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

        // Health text (modern font style)
        this.healthText = scene.add.text(0, -130, `${this.currentHealth}`, {
            fontSize: '11px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.add(this.healthText);
    }

    createLevelBadge(scene) {
        const badge = scene.add.container(55, -120);

        // Badge background
        const bg = scene.add.rectangle(0, 0, 28, 28, 0x2a2a4e);
        badge.add(bg);

        // Inner color
        const inner = scene.add.rectangle(0, 0, 24, 24, 0x4a4a8e);
        badge.add(inner);

        // Level text
        this.levelText = scene.add.text(0, 0, `${this.level}`, {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700'
        }).setOrigin(0.5);
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
        // Clamp level to max 10
        const oldLevel = this.level;
        this.level = Math.min(level, CASTLE_CONFIG.maxLevel);
        this.levelText.setText(`${this.level}`);

        // Update health based on level
        const oldHealthBonus = (oldLevel - 1) * 25;
        const newHealthBonus = (this.level - 1) * 25;
        const healthGain = newHealthBonus - oldHealthBonus;

        this.maxHealth = 100 + newHealthBonus;
        // Add the HP bonus to current health (not just max)
        this.currentHealth = Math.min(this.currentHealth + healthGain, this.maxHealth);
        this.updateHealthBar();

        // Scale attack stats with level
        this.arrowDamage = 5 + (this.level - 1) * 2;        // +2 damage per level
        this.attackSpeed = Math.max(400, 1000 - (this.level - 1) * 50);   // Faster attacks (base 1s)
        this.attackRange = 300 * (1 + (this.level - 1) * 0.1);  // +10% range per level

        // Castle grows bigger with each level!
        // Level 1 = 0.6 scale (small castle), Level 10 = 1.4 scale (grand palace)
        const minScale = 0.6;
        const maxScale = 1.4;
        const scaleProgress = (this.level - 1) / (CASTLE_CONFIG.maxLevel - 1);
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

        // Update level badge position
        this.levelBadge.setPosition(55 * castleScale, -120 * castleScale);

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

    takeDamage(amount) {
        if (this.isDead) return;

        this.currentHealth -= amount;
        this.currentHealth = Math.max(0, this.currentHealth);
        this.updateHealthBar();

        // Play castle hit sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playCastleHit();
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
        if (!this.scene.enemies) return null;

        let closestEnemy = null;
        let closestDistance = this.attackRange;

        this.scene.enemies.getChildren().forEach(enemy => {
            if (!enemy.active || enemy.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                this.x, this.y,
                enemy.x, enemy.y
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestEnemy = enemy;
            }
        });

        return closestEnemy;
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
                speed: 350,
                color: 0xFFAA00,
                isPlayerProjectile: true,
                projectileType: 'arrow'
            }
        );

        this.scene.projectiles.add(projectile);
    }
}
