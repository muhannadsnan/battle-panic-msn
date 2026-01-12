// Unit Class - Player's combat units with detailed sprites
class Unit extends Phaser.GameObjects.Container {
    constructor(scene, x, y, unitType, upgradeLevel = 1, promotionBonus = 1.0, promotionLevel = 0) {
        super(scene, x, y);

        this.scene = scene;
        this.unitType = unitType;
        this.upgradeLevel = upgradeLevel;
        this.promotionBonus = promotionBonus;
        this.promotionLevel = promotionLevel;

        // Get base stats
        const baseStats = UNIT_TYPES[unitType.toUpperCase()];
        if (!baseStats) {
            console.error('Unknown unit type:', unitType);
            return;
        }

        // Apply upgrade bonuses
        const stats = scene.combatSystem.getStatsWithUpgrades(baseStats, upgradeLevel);

        // Apply promotion bonus to HP, damage, and attack speed
        const promotedHealth = Math.floor(stats.health * promotionBonus);
        let promotedDamage = Math.floor(stats.damage * promotionBonus);
        let promotedAttackSpeed = Math.max(200, Math.floor(stats.attackSpeed / promotionBonus)); // Faster = lower ms
        let promotedSpeed = stats.speed;

        // Elite unit bonuses (gold tier lvl 4+)
        const isElite = promotionLevel >= 4;
        if (isElite) {
            if (unitType.toUpperCase() === 'ARCHER') {
                // Robinhood: 2x attack speed
                const atkMultiplier = baseStats.robinhoodAttackSpeedMultiplier || 0.5;
                promotedAttackSpeed = Math.max(200, Math.floor(promotedAttackSpeed * atkMultiplier));
            } else if (unitType.toUpperCase() === 'HORSEMAN') {
                // Lancelot: +25% speed, +20% damage
                const speedBonus = baseStats.lancelotSpeedBonus || 1.25;
                const dmgBonus = baseStats.lancelotDamageBonus || 1.2;
                promotedSpeed = Math.floor(stats.speed * speedBonus);
                promotedDamage = Math.floor(promotedDamage * dmgBonus);
            }
        }

        this.stats = { ...stats };
        this.maxHealth = promotedHealth;
        this.currentHealth = promotedHealth;
        this.damage = promotedDamage;
        this.speed = promotedSpeed;
        this.attackSpeed = promotedAttackSpeed;

        // Apply range bonus for archers: +10% per promotion level
        let promotedRange = stats.range;
        if (unitType.toUpperCase() === 'ARCHER' && promotionLevel > 0) {
            promotedRange = Math.floor(stats.range * (1 + promotionLevel * 0.1));
        }
        this.range = promotedRange;
        this.isRanged = stats.isRanged || false;
        this.splashDamage = stats.splashDamage || false;
        this.splashRadius = stats.splashRadius || 0;
        this.color = stats.color;

        this.isDead = false;
        this.target = null;
        this.isAttacking = false;
        this.lastAttackTime = 0;
        this.direction = 1; // 1 = right (toward enemy)
        this.isReturningToBase = false;
        this.targetAcquiredTime = 0; // Track when we acquired current target
        this.lastTargetSwitchTime = 0; // Prevent rapid target switching

        // Animation state
        this.walkTime = 0;
        this.isWalking = false;
        this.bodyParts = {}; // Store references to animated parts

        // Assign defense position based on unit type
        // Ranged units (archers) stay behind melee units
        // Melee units (peasants, horsemen) form the front line
        this.assignDefensePosition();

        // Create the unit sprite based on type
        this.spriteContainer = scene.add.container(0, 0);
        this.createUnitSprite(unitType);
        this.add(this.spriteContainer);

        // Create health bar (compact, right above head, thin border)
        this.healthBar = new HealthBar(scene, 0, -35, 30, 5, 0x00ff00, true);  // x1.5 larger
        this.add(this.healthBar);

        // Create promotion badge if promoted
        if (this.promotionLevel > 0) {
            this.createPromotionBadge();
        }

        // Add to scene
        scene.add.existing(this);

        // Set depth based on y position
        this.setDepth(y);

        // Base scale for all units (bigger!)
        this.baseScale = 1.4;  // All units 40% bigger

        // Spawn animation
        this.setScale(0);
        scene.tweens.add({
            targets: this,
            scaleX: this.baseScale,
            scaleY: this.baseScale,
            duration: 200,
            ease: 'Back.easeOut'
        });
    }

    assignDefensePosition() {
        const baseX = CASTLE_CONFIG.defenseLineX;
        const minY = CASTLE_CONFIG.defenseMinY;
        const maxY = CASTLE_CONFIG.defenseMaxY;

        // Position units based on their role
        // Ranged units stay further back (lower X, closer to castle)
        // Melee units form the front line (higher X, toward enemies)
        const type = this.unitType.toUpperCase();

        if (this.isRanged) {
            // Ranged units: Archers stay behind
            // Position them 30-60px behind the defense line
            this.defenseX = baseX - Phaser.Math.Between(30, 60);
            this.defenseY = Phaser.Math.Between(minY, maxY);
        } else {
            // Melee units form front line based on their tankiness
            switch (type) {
                case 'HORSEMAN':
                    // Horsemen are cavalry - charge to front
                    this.defenseX = baseX + Phaser.Math.Between(50, 80);
                    this.defenseY = Phaser.Math.Between(minY + 20, maxY - 20);
                    break;
                case 'PEASANT':
                default:
                    // Peasants - middle ground, not too far front
                    this.defenseX = baseX + Phaser.Math.Between(10, 40);
                    this.defenseY = Phaser.Math.Between(minY, maxY);
                    break;
            }
        }
    }

    createUnitSprite(unitType) {
        const scene = this.scene;

        switch (unitType.toUpperCase()) {
            case 'PEASANT':
                // Gold tier peasants (level 4+) become Knights visually!
                if (this.promotionLevel >= 4) {
                    this.createKnightVisual(scene);
                } else {
                    this.createPeasant(scene);
                }
                break;
            case 'ARCHER':
                // Gold tier archers (level 4+) become Robinhoods visually!
                if (this.promotionLevel >= 4) {
                    this.createRobinhoodVisual(scene);
                } else {
                    this.createArcher(scene);
                }
                break;
            case 'HORSEMAN':
                // Gold tier horsemen (level 4+) become Lancelots visually!
                if (this.promotionLevel >= 4) {
                    this.createLancelotVisual(scene);
                } else {
                    this.createHorseman(scene);
                }
                break;
            default:
                this.createPeasant(scene);
        }
    }

    createPeasant(scene) {
        // CLEAN PEASANT DESIGN - Simple warrior with sword
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 28, 28, 8, 0x000000, 0.25));

        // Legs
        this.bodyParts.leftLeg = scene.add.container(-5, 18);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 16, 0x8B6914)); // pants
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x5C4033)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 18);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 16, 0x8B6914));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x5C4033));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - simple tunic
        const body = scene.add.rectangle(0, 4, 20, 20, 0xD4A84B);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 16, 16, 0xE8BC5F)); // highlight

        // Belt
        this.bodyParts.torso.add(scene.add.rectangle(0, 12, 22, 4, 0x6B4423));
        this.bodyParts.torso.add(scene.add.rectangle(0, 12, 5, 5, 0xC9A227)); // buckle

        // Arms
        this.bodyParts.leftArm = scene.add.container(-12, 2);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 16, 0xE8BC5F));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 10, 8, 8, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(12, 2);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 8, 16, 0xE8BC5F));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 10, 8, 8, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Head - round friendly face
        this.bodyParts.torso.add(scene.add.circle(0, -14, 14, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.circle(-3, -10, 2, 0xE8B090)); // left cheek

        // Hair - simple cap style
        this.bodyParts.torso.add(scene.add.ellipse(0, -22, 28, 14, 0x8B6914));
        this.bodyParts.torso.add(scene.add.rectangle(0, -18, 26, 6, 0x8B6914));

        // Eyes - simple dots
        this.bodyParts.torso.add(scene.add.circle(-5, -14, 3, 0x2C3E50));
        this.bodyParts.torso.add(scene.add.circle(5, -14, 3, 0x2C3E50));
        this.bodyParts.torso.add(scene.add.circle(-6, -15, 1, 0xFFFFFF)); // shine
        this.bodyParts.torso.add(scene.add.circle(4, -15, 1, 0xFFFFFF));

        // Simple smile
        this.bodyParts.torso.add(scene.add.rectangle(0, -6, 8, 2, 0xC0846A));

        // Sword - clean design
        this.bodyParts.weapon = scene.add.container(18, -4);
        this.bodyParts.weapon.add(scene.add.rectangle(0, -8, 5, 26, 0xBDC3C7)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(1, -8, 2, 22, 0xECF0F1)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, -22, 4, 4, 0xECF0F1)); // tip
        this.bodyParts.weapon.add(scene.add.rectangle(0, 6, 12, 4, 0xC9A227)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(0, 12, 4, 8, 0x6B4423)); // handle
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createArcher(scene) {
        // CLEAN ARCHER DESIGN - Sleek ranger with bow
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 26, 26, 8, 0x000000, 0.25));

        // Legs
        this.bodyParts.leftLeg = scene.add.container(-5, 16);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E5A2E)); // pants
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 9, 10, 8, 0x5C4033)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 16);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E5A2E));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 9, 10, 8, 0x5C4033));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - green tunic
        const body = scene.add.rectangle(0, 2, 18, 18, 0x27AE60);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 14, 14, 0x2ECC71)); // highlight

        // Belt
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 20, 4, 0x6B4423));

        // Quiver on back - simple
        this.bodyParts.torso.add(scene.add.rectangle(-12, 0, 6, 18, 0x8B5A33));
        this.bodyParts.torso.add(scene.add.rectangle(-12, -8, 2, 6, 0xE74C3C)); // arrow fletch
        this.bodyParts.torso.add(scene.add.rectangle(-10, -8, 2, 6, 0xF1C40F)); // arrow fletch

        // Arms
        this.bodyParts.leftArm = scene.add.container(-11, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2ECC71));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 9, 7, 7, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(11, 0);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2ECC71));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 9, 7, 7, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Hood
        this.bodyParts.torso.add(scene.add.ellipse(0, -16, 26, 20, 0x1E8449));
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 22, 10, 0x1E8449));

        // Face - visible under hood
        this.bodyParts.torso.add(scene.add.circle(0, -8, 10, 0xF5CBA7));

        // Eyes - focused
        this.bodyParts.torso.add(scene.add.circle(-4, -8, 3, 0x2C3E50));
        this.bodyParts.torso.add(scene.add.circle(4, -8, 3, 0x2C3E50));
        this.bodyParts.torso.add(scene.add.circle(-5, -9, 1, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.circle(3, -9, 1, 0xFFFFFF));

        // Confident smirk
        this.bodyParts.torso.add(scene.add.rectangle(2, -2, 6, 2, 0xC0846A));

        // Bow - elegant curved design
        this.bodyParts.weapon = scene.add.container(16, -2);
        // Bow limbs using arc shapes (rectangles positioned to form curve)
        this.bodyParts.weapon.add(scene.add.rectangle(2, -14, 4, 10, 0x8B4513)); // top limb
        this.bodyParts.weapon.add(scene.add.rectangle(4, -8, 4, 8, 0x9B5523));
        this.bodyParts.weapon.add(scene.add.rectangle(5, 0, 4, 6, 0x9B5523)); // grip
        this.bodyParts.weapon.add(scene.add.rectangle(4, 8, 4, 8, 0x9B5523));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 14, 4, 10, 0x8B4513)); // bottom limb
        // Bowstring
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 2, 32, 0xECF0F1));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createHorseman(scene) {
        // CLEAN HORSEMAN - Mounted cavalry knight
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 34, 50, 10, 0x000000, 0.25));

        // Horse back legs
        this.bodyParts.leftLeg = scene.add.container(-14, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 18, 0x8B4513));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 10, 8, 6, 0x5C4033)); // hoof
        this.spriteContainer.add(this.bodyParts.leftLeg);

        // Horse front legs
        this.bodyParts.rightLeg = scene.add.container(14, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 18, 0x9B5523));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 10, 8, 6, 0x5C4033));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Horse body - sleek brown
        const body = scene.add.ellipse(0, 12, 44, 22, 0x8B4513);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.ellipse(2, 10, 38, 18, 0x9B5523)); // highlight

        // Horse tail
        this.bodyParts.torso.add(scene.add.ellipse(-24, 16, 10, 16, 0x5C4033));
        this.bodyParts.torso.add(scene.add.ellipse(-28, 20, 8, 12, 0x4A3020));

        // Horse neck and head
        this.bodyParts.leftArm = scene.add.container(20, 0);
        this.bodyParts.leftArm.add(scene.add.ellipse(4, 4, 14, 20, 0x8B4513)); // neck
        this.bodyParts.leftArm.add(scene.add.ellipse(14, -4, 18, 14, 0x9B5523)); // head
        this.bodyParts.leftArm.add(scene.add.ellipse(22, -2, 10, 8, 0x8B4513)); // snout
        // Ears
        this.bodyParts.leftArm.add(scene.add.ellipse(8, -12, 5, 8, 0x8B4513));
        this.bodyParts.leftArm.add(scene.add.ellipse(14, -12, 5, 8, 0x8B4513));
        // Eye
        this.bodyParts.leftArm.add(scene.add.circle(10, -4, 3, 0x2C3E50));
        this.bodyParts.leftArm.add(scene.add.circle(9, -5, 1, 0xFFFFFF));
        // Mane
        this.bodyParts.leftArm.add(scene.add.ellipse(0, -4, 8, 14, 0x4A3020));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Saddle
        this.bodyParts.torso.add(scene.add.ellipse(0, 2, 20, 12, 0x6B4423));
        this.bodyParts.torso.add(scene.add.rectangle(0, 0, 16, 6, 0x7B5433)); // seat

        // Rider body - blue armor
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 16, 18, 0x3498DB));
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 12, 14, 0x5DADE2)); // highlight

        // Rider arms
        this.bodyParts.torso.add(scene.add.rectangle(-10, -8, 6, 12, 0xF5CBA7)); // left arm
        this.bodyParts.rightArm = scene.add.container(10, -8);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 6, 12, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Rider head with helmet
        this.bodyParts.torso.add(scene.add.circle(0, -28, 10, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.ellipse(0, -34, 22, 16, 0x7F8C8D)); // helmet
        this.bodyParts.torso.add(scene.add.rectangle(0, -30, 18, 8, 0x95A5A6)); // visor area
        // Eyes through visor
        this.bodyParts.torso.add(scene.add.circle(-4, -28, 2, 0x2C3E50));
        this.bodyParts.torso.add(scene.add.circle(4, -28, 2, 0x2C3E50));

        // Sword - clean design
        this.bodyParts.weapon = scene.add.container(16, -18);
        this.bodyParts.weapon.add(scene.add.rectangle(6, -6, 5, 28, 0xBDC3C7)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(7, -6, 2, 24, 0xECF0F1)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(6, -21, 4, 4, 0xECF0F1)); // tip
        this.bodyParts.weapon.add(scene.add.rectangle(6, 8, 12, 4, 0xF1C40F)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(6, 14, 4, 8, 0x6B4423)); // handle
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createKnightVisual(scene) {
        // ELITE KNIGHT - Clean heroic armored warrior
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 30, 30, 8, 0x000000, 0.25));

        // Legs - armored
        this.bodyParts.leftLeg = scene.add.container(-6, 18);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 9, 16, 0x4080C0)); // armor
        this.bodyParts.leftLeg.add(scene.add.ellipse(0, 10, 11, 8, 0x3070B0)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(6, 18);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 9, 16, 0x5090D0));
        this.bodyParts.rightLeg.add(scene.add.ellipse(0, 10, 11, 8, 0x4080C0));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - blue armor with golden trim
        const body = scene.add.ellipse(0, 4, 24, 22, 0x4488DD);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.ellipse(2, 4, 20, 18, 0x55AAEE)); // highlight
        // Golden chest emblem
        this.bodyParts.torso.add(scene.add.circle(0, 4, 6, 0xFFD700));
        this.bodyParts.torso.add(scene.add.circle(0, 4, 3, 0xFFEE44));

        // Shield arm
        this.bodyParts.leftArm = scene.add.container(-16, 4);
        this.bodyParts.leftArm.add(scene.add.ellipse(0, 0, 14, 24, 0x4488DD)); // shield
        this.bodyParts.leftArm.add(scene.add.ellipse(0, 0, 10, 18, 0x55AAEE));
        this.bodyParts.leftArm.add(scene.add.circle(0, 0, 5, 0xFFD700)); // emblem
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Sword arm
        this.bodyParts.rightArm = scene.add.container(12, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 4, 7, 14, 0x5090D0));
        this.bodyParts.rightArm.add(scene.add.ellipse(0, 12, 8, 8, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Helmet - round with visor
        this.bodyParts.torso.add(scene.add.ellipse(0, -16, 24, 20, 0x5090D0));
        this.bodyParts.torso.add(scene.add.ellipse(0, -14, 20, 16, 0x60A0E0)); // highlight
        // Visor slit
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 16, 6, 0x202020));
        // Glowing eyes
        this.bodyParts.torso.add(scene.add.circle(-4, -14, 3, 0x4488FF));
        this.bodyParts.torso.add(scene.add.circle(4, -14, 3, 0x4488FF));
        this.bodyParts.torso.add(scene.add.circle(-5, -15, 1, 0xAADDFF)); // shine
        this.bodyParts.torso.add(scene.add.circle(3, -15, 1, 0xAADDFF));
        // Red plume
        this.bodyParts.torso.add(scene.add.ellipse(0, -28, 8, 14, 0xFF4444));
        this.bodyParts.torso.add(scene.add.ellipse(0, -36, 6, 10, 0xFF6666));
        this.bodyParts.torso.add(scene.add.ellipse(0, -42, 4, 6, 0xFF8888)); // tip

        // Sword - clean design
        this.bodyParts.weapon = scene.add.container(18, -6);
        this.bodyParts.weapon.add(scene.add.rectangle(0, -8, 5, 28, 0xDDDDDD)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(1, -8, 2, 24, 0xFFFFFF)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, -23, 4, 4, 0xFFFFFF)); // tip
        this.bodyParts.weapon.add(scene.add.rectangle(0, 8, 14, 5, 0xC9A227)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(0, 14, 4, 8, 0x6B4423)); // handle
        this.bodyParts.weapon.add(scene.add.circle(0, 19, 4, 0xFFD700)); // pommel
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createRobinhoodVisual(scene) {
        // ELITE ROBINHOOD - Clean legendary outlaw archer
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 28, 28, 8, 0x000000, 0.25));

        // Legs with leather boots
        this.bodyParts.leftLeg = scene.add.container(-5, 16);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E5A2E)); // pants
        this.bodyParts.leftLeg.add(scene.add.ellipse(0, 10, 10, 8, 0x5C4033)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 16);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x3E6A3E));
        this.bodyParts.rightLeg.add(scene.add.ellipse(0, 10, 10, 8, 0x5C4033));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Flowing cloak (behind)
        this.bodyParts.torso.add(scene.add.ellipse(-4, 10, 20, 26, 0x1A3A1A));

        // Body - dark green tunic
        const body = scene.add.ellipse(0, 4, 20, 20, 0x27AE60);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.ellipse(2, 4, 16, 16, 0x2ECC71)); // highlight

        // Belt with golden buckle
        this.bodyParts.torso.add(scene.add.rectangle(0, 12, 22, 4, 0x5A3A20));
        this.bodyParts.torso.add(scene.add.circle(0, 12, 4, 0xFFD700));

        // Quiver on back
        this.bodyParts.torso.add(scene.add.ellipse(-12, 0, 8, 20, 0x5A3A20));
        this.bodyParts.torso.add(scene.add.ellipse(-12, -10, 4, 6, 0xFF4444)); // red fletch
        this.bodyParts.torso.add(scene.add.ellipse(-10, -10, 4, 6, 0x44FF44)); // green
        this.bodyParts.torso.add(scene.add.ellipse(-14, -10, 4, 6, 0xFFD700)); // gold

        // Arms
        this.bodyParts.leftArm = scene.add.container(-11, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2ECC71));
        this.bodyParts.leftArm.add(scene.add.ellipse(0, 10, 8, 8, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(11, 0);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2ECC71));
        this.bodyParts.rightArm.add(scene.add.ellipse(0, 10, 8, 8, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Hood - iconic rounded shape
        this.bodyParts.torso.add(scene.add.ellipse(0, -14, 28, 22, 0x1E8449));
        this.bodyParts.torso.add(scene.add.ellipse(0, -20, 20, 14, 0x27AE60));
        // Hood point
        this.bodyParts.torso.add(scene.add.ellipse(0, -30, 8, 12, 0x27AE60));

        // Face under hood
        this.bodyParts.torso.add(scene.add.circle(0, -8, 11, 0xF5CBA7));

        // Eyes - sharp and confident
        this.bodyParts.torso.add(scene.add.circle(-4, -8, 3, 0x228B22)); // green eyes
        this.bodyParts.torso.add(scene.add.circle(4, -8, 3, 0x228B22));
        this.bodyParts.torso.add(scene.add.circle(-5, -9, 1, 0xFFFFFF)); // shine
        this.bodyParts.torso.add(scene.add.circle(3, -9, 1, 0xFFFFFF));

        // Confident smirk
        this.bodyParts.torso.add(scene.add.rectangle(2, -2, 6, 2, 0xC0846A));

        // Red feather in hood
        this.bodyParts.torso.add(scene.add.ellipse(10, -22, 5, 16, 0xFF4444));
        this.bodyParts.torso.add(scene.add.ellipse(12, -30, 4, 10, 0xFF6666));

        // Legendary bow with golden accents
        this.bodyParts.weapon = scene.add.container(18, -2);
        // Bow limbs curved
        this.bodyParts.weapon.add(scene.add.rectangle(2, -14, 4, 12, 0x8B4513)); // top limb
        this.bodyParts.weapon.add(scene.add.rectangle(4, -6, 4, 8, 0x9B5523));
        this.bodyParts.weapon.add(scene.add.rectangle(5, 0, 5, 6, 0x9B5523)); // grip
        this.bodyParts.weapon.add(scene.add.rectangle(4, 6, 4, 8, 0x9B5523));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 14, 4, 12, 0x8B4513)); // bottom
        // Golden tips
        this.bodyParts.weapon.add(scene.add.circle(2, -18, 3, 0xFFD700));
        this.bodyParts.weapon.add(scene.add.circle(2, 18, 3, 0xFFD700));
        // Bowstring
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 2, 34, 0xECF0F1));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createLancelotVisual(scene) {
        // ELITE LANCELOT - Clean legendary knight on white stallion
        // Shadow
        this.spriteContainer.add(scene.add.ellipse(0, 36, 54, 12, 0x000000, 0.25));

        // Horse back legs (WHITE STALLION)
        this.bodyParts.leftLeg = scene.add.container(-14, 24);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 18, 0xEEEEEE));
        this.bodyParts.leftLeg.add(scene.add.ellipse(0, 12, 8, 6, 0xDDDDDD)); // hoof
        this.spriteContainer.add(this.bodyParts.leftLeg);

        // Horse front legs
        this.bodyParts.rightLeg = scene.add.container(14, 24);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 18, 0xFFFFFF));
        this.bodyParts.rightLeg.add(scene.add.ellipse(0, 12, 8, 6, 0xEEEEEE));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Royal cape (flowing behind)
        this.bodyParts.torso.add(scene.add.ellipse(-8, 0, 22, 34, 0x8B0000));
        this.bodyParts.torso.add(scene.add.ellipse(-12, 6, 18, 28, 0xAA2222));

        // Horse body - white stallion
        const body = scene.add.ellipse(0, 14, 48, 24, 0xEEEEEE);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.ellipse(2, 12, 42, 20, 0xFFFFFF)); // highlight

        // Golden barding (horse armor)
        this.bodyParts.torso.add(scene.add.ellipse(0, 10, 34, 10, 0xFFD700));
        this.bodyParts.torso.add(scene.add.ellipse(0, 10, 30, 7, 0xFFEE44));

        // Horse tail (flowing white)
        this.bodyParts.torso.add(scene.add.ellipse(-26, 16, 10, 18, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.ellipse(-30, 22, 8, 14, 0xEEEEEE));

        // Horse head and neck
        this.bodyParts.leftArm = scene.add.container(22, 0);
        // Neck
        this.bodyParts.leftArm.add(scene.add.ellipse(2, 4, 14, 22, 0xEEEEEE));
        // Head
        this.bodyParts.leftArm.add(scene.add.ellipse(14, -4, 20, 16, 0xFFFFFF));
        // Snout
        this.bodyParts.leftArm.add(scene.add.ellipse(24, -2, 12, 10, 0xEEEEEE));
        // Golden face armor
        this.bodyParts.leftArm.add(scene.add.ellipse(10, -4, 14, 6, 0xFFD700));
        // Ears
        this.bodyParts.leftArm.add(scene.add.ellipse(8, -14, 5, 10, 0xEEEEEE));
        this.bodyParts.leftArm.add(scene.add.ellipse(14, -14, 5, 10, 0xEEEEEE));
        // Eye
        this.bodyParts.leftArm.add(scene.add.circle(10, -4, 3, 0x2C3E50));
        this.bodyParts.leftArm.add(scene.add.circle(9, -5, 1, 0xFFFFFF)); // shine
        // Mane (white flowing)
        this.bodyParts.leftArm.add(scene.add.ellipse(-2, -6, 8, 16, 0xDDDDDD));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Golden saddle
        this.bodyParts.torso.add(scene.add.ellipse(0, 2, 22, 14, 0xFFD700));
        this.bodyParts.torso.add(scene.add.ellipse(0, 0, 18, 8, 0xFFEE44));

        // Lancelot - golden armor
        this.bodyParts.torso.add(scene.add.ellipse(0, -12, 22, 24, 0xFFD700));
        this.bodyParts.torso.add(scene.add.ellipse(2, -12, 18, 20, 0xFFEE44)); // highlight
        // Chest emblem (royal blue)
        this.bodyParts.torso.add(scene.add.circle(0, -10, 6, 0x4169E1));
        this.bodyParts.torso.add(scene.add.circle(0, -10, 3, 0x5179F1));

        // Rein arm
        this.bodyParts.torso.add(scene.add.rectangle(-10, -6, 6, 14, 0xF5CBA7));

        // Sword arm
        this.bodyParts.rightArm = scene.add.container(12, -10);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 2, 7, 14, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Lancelot head with golden helmet
        this.bodyParts.torso.add(scene.add.circle(0, -30, 11, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.ellipse(0, -38, 24, 18, 0xFFD700)); // helmet
        this.bodyParts.torso.add(scene.add.ellipse(0, -36, 20, 14, 0xFFEE44)); // highlight
        // Visor
        this.bodyParts.torso.add(scene.add.rectangle(0, -32, 16, 6, 0x303030));
        // Heroic eyes
        this.bodyParts.torso.add(scene.add.circle(-4, -30, 3, 0x4488FF));
        this.bodyParts.torso.add(scene.add.circle(4, -30, 3, 0x4488FF));
        this.bodyParts.torso.add(scene.add.circle(-5, -31, 1, 0xAADDFF)); // shine
        this.bodyParts.torso.add(scene.add.circle(3, -31, 1, 0xAADDFF));
        // Blue and gold plume
        this.bodyParts.torso.add(scene.add.ellipse(0, -50, 10, 18, 0x4169E1));
        this.bodyParts.torso.add(scene.add.ellipse(0, -60, 8, 14, 0x5179F1));
        this.bodyParts.torso.add(scene.add.ellipse(0, -68, 6, 10, 0x6189FF)); // tip
        this.bodyParts.torso.add(scene.add.ellipse(-4, -52, 5, 12, 0xFFD700)); // gold accent

        // Excalibur - legendary sword
        this.bodyParts.weapon = scene.add.container(18, -18);
        this.bodyParts.weapon.add(scene.add.rectangle(8, -8, 6, 32, 0xFFFFFF)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(9, -8, 3, 28, 0xFFFFEE)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(8, -25, 5, 5, 0xFFFFFF)); // tip
        this.bodyParts.weapon.add(scene.add.rectangle(8, 10, 16, 5, 0xFFD700)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(8, 16, 5, 8, 0x6B4423)); // handle
        this.bodyParts.weapon.add(scene.add.circle(8, 22, 4, 0xFFD700)); // pommel
        this.bodyParts.weapon.add(scene.add.circle(8, 22, 2, 0x4169E1)); // gem
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    update(time, delta) {
        if (this.isDead) return;

        let isMoving = false;

        // Find target if we don't have one
        if (!this.target || this.target.isDead || !this.target.active) {
            this.target = this.findBestTarget(time);
            if (this.target) {
                this.targetAcquiredTime = time;
            }
        }

        // Re-evaluate target if stuck for too long (2 seconds without attacking)
        // This prevents units from getting stuck chasing unreachable enemies
        if (this.target && time - this.lastAttackTime > 2000 && time - this.targetAcquiredTime > 2000) {
            // Check if we've been chasing without success
            const distanceToTarget = Phaser.Math.Distance.Between(this.x, this.y, this.target.x, this.target.y);
            if (distanceToTarget > this.range * 1.5) {
                // Try to find a closer/more accessible target
                const newTarget = this.findBestTarget(time, this.target);
                if (newTarget && newTarget !== this.target) {
                    this.target = newTarget;
                    this.targetAcquiredTime = time;
                }
            }
        }

        if (this.target) {
            this.isReturningToBase = false;
            const inRange = this.scene.combatSystem.isInRange(this, this.target, this.range);

            if (inRange) {
                // Stop and attack
                this.attack(time);
            } else {
                // Move toward target in all directions
                this.moveTowardTarget(this.target, delta);
                isMoving = true;
            }
        } else {
            // No enemies - return to defense position
            const dx = this.defenseX - this.x;
            const dy = this.defenseY - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance > 10) {
                isMoving = true;
            }
            this.returnToDefensePosition(delta);
        }

        // Separate from other friendly units to avoid stacking
        this.separateFromAllies(delta);

        // Update walking/idle animation
        this.updateAnimation(delta, isMoving);

        // Update depth based on y
        this.setDepth(this.y);
    }

    separateFromAllies(delta) {
        const allies = this.scene.units.getChildren();
        const separationRadius = 50; // Increased - how close before pushing away
        const separationForce = 120; // Increased - how strong the push is

        let pushX = 0;
        let pushY = 0;

        for (const ally of allies) {
            if (ally === this || ally.isDead) continue;

            const dx = this.x - ally.x;
            const dy = this.y - ally.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < separationRadius && distance > 0) {
                // Push away from this ally - stronger when closer
                const force = (separationRadius - distance) / separationRadius;
                pushX += (dx / distance) * force * force; // Squared for stronger close-range push
                pushY += (dy / distance) * force * force;
            }
        }

        // Apply separation movement
        if (pushX !== 0 || pushY !== 0) {
            const moveAmount = separationForce * (delta / 1000);
            this.x += pushX * moveAmount;
            this.y = Phaser.Math.Clamp(this.y + pushY * moveAmount, 50, GAME_HEIGHT - 50);
        }
    }

    moveTowardTarget(target, delta) {
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Move in all directions freely toward target
            const moveX = (dx / distance) * this.speed * (delta / 1000);
            const moveY = (dy / distance) * this.speed * (delta / 1000);

            this.x += moveX;
            // Allow units to move across full battlefield to engage all enemies
            this.y = Phaser.Math.Clamp(this.y + moveY, 50, GAME_HEIGHT - 50);

            // Face direction of movement (flip only, don't rescale)
            if (dx < 0 && this.direction !== -1) {
                this.direction = -1;
                this.spriteContainer.setScale(-1, 1);
            } else if (dx > 0 && this.direction !== 1) {
                this.direction = 1;
                this.spriteContainer.setScale(1, 1);
            }
        }

        this.isAttacking = false;
    }

    returnToDefensePosition(delta) {
        const dx = this.defenseX - this.x;
        const dy = this.defenseY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Only move if not already at defense position
        if (distance > 10) {
            this.isReturningToBase = true;

            const moveX = (dx / distance) * this.speed * (delta / 1000);
            const moveY = (dy / distance) * this.speed * (delta / 1000);

            this.x += moveX;
            this.y = Phaser.Math.Clamp(this.y + moveY, 50, GAME_HEIGHT - 50);

            // Face direction of movement (flip only, don't rescale)
            if (dx < 0 && this.direction !== -1) {
                this.direction = -1;
                this.spriteContainer.setScale(-1, 1);
            } else if (dx > 0 && this.direction !== 1) {
                this.direction = 1;
                this.spriteContainer.setScale(1, 1);
            }
        } else {
            this.isReturningToBase = false;
            // Face right (toward enemies) when idle
            if (this.direction !== 1) {
                this.direction = 1;
                this.spriteContainer.setScale(1, 1);
            }
        }

        this.isAttacking = false;
    }

    attack(time) {
        if (time - this.lastAttackTime < this.attackSpeed) return;

        this.lastAttackTime = time;
        this.isAttacking = true;

        // Play attack animation
        this.playAttackAnimation();

        // Also do a slight body lunge
        this.scene.tweens.add({
            targets: this.spriteContainer,
            scaleX: this.direction * 1.1,
            scaleY: 1.05,
            duration: 80,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.isAttacking = false;
            }
        });

        if (this.isRanged) {
            // Create projectile with max distance based on unit range (+ 100 buffer)
            const projectile = new Projectile(
                this.scene,
                this.x,
                this.y,
                this.target,
                {
                    damage: this.damage,
                    speed: 800,  // 2x faster arrows
                    color: this.color,
                    isPlayerProjectile: true,
                    splashDamage: this.splashDamage,
                    splashRadius: this.splashRadius,
                    projectileType: 'arrow',
                    maxDistance: this.range + 100 // Arrow travels slightly past attack range
                }
            );
            this.scene.projectiles.add(projectile);
        } else {
            // Melee attack
            this.scene.combatSystem.dealDamage(this, this.target, this.damage);
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;

        this.currentHealth -= amount;
        this.healthBar.setPercent(this.currentHealth / this.maxHealth);

        // Play hit sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playSwordHit();
        }

        // Damage flash - tint all children white briefly
        this.spriteContainer.list.forEach(child => {
            if (child.setTint) child.setTint(0xffffff);
        });

        this.scene.time.delayedCall(100, () => {
            if (!this.isDead) {
                this.spriteContainer.list.forEach(child => {
                    if (child.clearTint) child.clearTint();
                });
            }
        });

        if (this.currentHealth <= 0) {
            this.die();
        }
    }

    die() {
        this.isDead = true;

        // Death animation
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            angle: Phaser.Math.Between(-45, 45),
            duration: 400,
            onComplete: () => {
                this.destroy();
            }
        });

        // Notify scene
        if (this.scene.onUnitDied) {
            this.scene.onUnitDied(this);
        }
    }

    heal(amount) {
        if (this.isDead) return;

        this.currentHealth = Math.min(this.currentHealth + amount, this.maxHealth);
        this.healthBar.setPercent(this.currentHealth / this.maxHealth);

        this.scene.combatSystem.showHealNumber(this.x, this.y - 20, amount);
    }

    // Animation methods
    updateAnimation(delta, isMoving) {
        if (!this.bodyParts.leftLeg || !this.bodyParts.rightLeg) return;

        // Store base positions on first call
        if (!this.bodyParts.leftLegBaseY) {
            this.bodyParts.leftLegBaseY = this.bodyParts.leftLeg.y;
            this.bodyParts.rightLegBaseY = this.bodyParts.rightLeg.y;
        }

        if (isMoving) {
            // Walking animation
            this.walkTime += delta * 0.012; // Animation speed
            const bodyBob = Math.abs(Math.sin(this.walkTime * 2)) * 2; // Body bounce

            // Animate legs (opposite directions) from base position
            this.bodyParts.leftLeg.y = this.bodyParts.leftLegBaseY + Math.sin(this.walkTime) * 4;
            this.bodyParts.rightLeg.y = this.bodyParts.rightLegBaseY + Math.sin(this.walkTime + Math.PI) * 4;

            // Body bob
            if (this.bodyParts.torso) {
                this.bodyParts.torso.y = -bodyBob;
            }

            // Arm swing while walking
            if (this.bodyParts.leftArm && !this.isAttacking) {
                this.bodyParts.leftArm.rotation = Math.sin(this.walkTime) * 0.3;
            }
            if (this.bodyParts.rightArm && !this.isAttacking) {
                this.bodyParts.rightArm.rotation = Math.sin(this.walkTime + Math.PI) * 0.3;
            }
        } else {
            // Idle - reset to neutral
            this.bodyParts.leftLeg.y = this.bodyParts.leftLegBaseY;
            this.bodyParts.rightLeg.y = this.bodyParts.rightLegBaseY;
            if (this.bodyParts.torso) {
                this.bodyParts.torso.y = 0;
            }
            if (this.bodyParts.leftArm && !this.isAttacking) {
                this.bodyParts.leftArm.rotation = 0;
            }
            if (this.bodyParts.rightArm && !this.isAttacking) {
                this.bodyParts.rightArm.rotation = 0;
            }
        }
    }

    playAttackAnimation() {
        // Weapon swing animation
        if (this.bodyParts.weapon) {
            this.scene.tweens.add({
                targets: this.bodyParts.weapon,
                rotation: -0.8,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
        // Right arm swing for attack
        if (this.bodyParts.rightArm) {
            this.scene.tweens.add({
                targets: this.bodyParts.rightArm,
                rotation: -0.6,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
    }

    findBestTarget(time, excludeTarget = null) {
        const enemies = this.scene.enemies.getChildren();
        if (!enemies || enemies.length === 0) return null;

        let bestTarget = null;
        let bestScore = Infinity;

        // Unit's reachable Y range (with some margin)
        const minY = 60;
        const maxY = GAME_HEIGHT - 60;

        enemies.forEach(enemy => {
            if (!enemy.active || enemy.isDead) return;
            if (excludeTarget && enemy === excludeTarget) return;

            const dx = enemy.x - this.x;
            const dy = enemy.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Calculate accessibility score (lower is better)
            // Penalize enemies at Y extremes that we can't easily reach
            let yPenalty = 0;
            if (enemy.y < minY || enemy.y > maxY) {
                yPenalty = 200; // Heavy penalty for unreachable Y
            } else {
                // Small penalty for Y distance to prefer enemies at similar Y level
                yPenalty = Math.abs(dy) * 0.3;
            }

            // Score combines distance and accessibility
            const score = distance + yPenalty;

            if (score < bestScore) {
                bestScore = score;
                bestTarget = enemy;
            }
        });

        return bestTarget;
    }

    createPromotionBadge() {
        // Badge appears to the LEFT of the unit
        // Level 1-3: Silver chevrons, Level 4-6: Gold chevrons
        // Military style: V-shaped chevrons stacked vertically
        const badgeContainer = this.scene.add.container(-22, -28);
        this.add(badgeContainer);

        const isGold = this.promotionLevel > 3;
        const numChevrons = isGold ? this.promotionLevel - 3 : this.promotionLevel;
        const color = isGold ? 0xffd700 : 0xc0c0c0;
        const borderColor = isGold ? 0x8b6914 : 0x606060;

        // Draw stacked chevrons (open V shapes pointing down, like military rank)
        // 2x size
        const chevronWidth = 16;
        const chevronHeight = 8;
        const spacing = 8;

        for (let i = 0; i < numChevrons; i++) {
            const graphics = this.scene.add.graphics();
            const offsetY = -i * spacing; // Stack upward

            // Draw border first (thicker, darker)
            graphics.lineStyle(6, borderColor, 1);
            graphics.beginPath();
            graphics.moveTo(0, offsetY);
            graphics.lineTo(chevronWidth / 2, offsetY + chevronHeight);
            graphics.lineTo(chevronWidth, offsetY);
            graphics.strokePath();

            // Draw main chevron on top
            graphics.lineStyle(3, color, 1);
            graphics.beginPath();
            graphics.moveTo(0, offsetY);
            graphics.lineTo(chevronWidth / 2, offsetY + chevronHeight);
            graphics.lineTo(chevronWidth, offsetY);
            graphics.strokePath();

            badgeContainer.add(graphics);
        }
    }
}

