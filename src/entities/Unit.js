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
        // PEASANT - Simple farmer with sword, clean angular design
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 28, 26, 6, 0x000000, 0.25));

        // Legs
        this.bodyParts.leftLeg = scene.add.container(-5, 18);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 16, 0x7A5230)); // brown pants
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x4A3020)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 18);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 16, 0x8A6240));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x5A4030));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - tan tunic
        const body = scene.add.rectangle(0, 4, 22, 22, 0xD4A855);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 4, 16, 18, 0xE4B865)); // highlight
        // Belt
        this.bodyParts.torso.add(scene.add.rectangle(0, 13, 24, 5, 0x6B4423));
        this.bodyParts.torso.add(scene.add.rectangle(0, 13, 6, 6, 0xD4A020)); // buckle

        // Left arm
        this.bodyParts.leftArm = scene.add.container(-13, 2);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 16, 0xE4B865)); // sleeve
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 10, 8, 8, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Right arm with sword attached
        this.bodyParts.rightArm = scene.add.container(13, 2);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 8, 16, 0xD4A855));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 10, 8, 8, 0xF5CBA7));
        // Sword attached to arm
        this.bodyParts.weapon = scene.add.container(7, -8);
        this.bodyParts.weapon.add(scene.add.rectangle(0, -10, 6, 30, 0xC0C0C0)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(1, -10, 3, 26, 0xE8E8E8)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, 8, 14, 5, 0xD4A020)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(0, 14, 5, 10, 0x6B4423)); // handle
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Head
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 22, 22, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.rectangle(2, -16, 18, 18, 0xFFDDBB)); // highlight
        // Hair - brown messy
        this.bodyParts.torso.add(scene.add.rectangle(0, -28, 24, 12, 0x8B5A2B));
        this.bodyParts.torso.add(scene.add.rectangle(-6, -26, 8, 8, 0x7B4A1B));
        this.bodyParts.torso.add(scene.add.rectangle(6, -26, 8, 8, 0x9B6A3B));
        // Eyes
        this.bodyParts.torso.add(scene.add.rectangle(-5, -16, 6, 6, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(5, -16, 6, 6, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -15, 4, 5, 0x3A2010));
        this.bodyParts.torso.add(scene.add.rectangle(6, -15, 4, 5, 0x3A2010));
        // Smile
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 8, 3, 0xC08060));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createArcher(scene) {
        // ARCHER - Hooded ranger with bow, clean angular design
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 26, 24, 6, 0x000000, 0.25));

        // Legs
        this.bodyParts.leftLeg = scene.add.container(-5, 16);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2D5A30)); // green pants
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 9, 10, 8, 0x5A3A20)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 16);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x3D6A40));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 9, 10, 8, 0x6A4A30));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - forest green tunic
        const body = scene.add.rectangle(0, 2, 20, 20, 0x2E7D32);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 2, 14, 16, 0x43A047)); // highlight
        // Belt
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 22, 4, 0x5D4037));

        // Quiver on back
        this.bodyParts.torso.add(scene.add.rectangle(-13, 0, 8, 22, 0x6D5047));
        this.bodyParts.torso.add(scene.add.rectangle(-13, -10, 3, 8, 0xE53935)); // red arrow
        this.bodyParts.torso.add(scene.add.rectangle(-11, -10, 3, 8, 0xFDD835)); // yellow arrow

        // Arms
        this.bodyParts.leftArm = scene.add.container(-12, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 7, 14, 0x43A047));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 9, 7, 7, 0xF5CBA7)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Right arm with bow attached
        this.bodyParts.rightArm = scene.add.container(12, 0);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2E7D32));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 9, 7, 7, 0xF5CBA7));
        // Bow attached to arm
        this.bodyParts.weapon = scene.add.container(6, -2);
        this.bodyParts.weapon.add(scene.add.rectangle(2, -14, 5, 12, 0x795548)); // top limb
        this.bodyParts.weapon.add(scene.add.rectangle(4, -4, 5, 8, 0x8D6E63));
        this.bodyParts.weapon.add(scene.add.rectangle(5, 4, 6, 8, 0x8D6E63)); // grip
        this.bodyParts.weapon.add(scene.add.rectangle(4, 12, 5, 8, 0x8D6E63));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 20, 5, 12, 0x795548)); // bottom limb
        this.bodyParts.weapon.add(scene.add.rectangle(0, 2, 2, 36, 0xE0E0E0)); // string
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Hood
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 24, 18, 0x1B5E20));
        this.bodyParts.torso.add(scene.add.rectangle(0, -22, 18, 10, 0x2E7D32));
        this.bodyParts.torso.add(scene.add.rectangle(0, -28, 10, 8, 0x388E3C)); // hood point

        // Face under hood
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 16, 14, 0xF5CBA7));
        this.bodyParts.torso.add(scene.add.rectangle(2, -10, 12, 10, 0xFFDDBB));
        // Eyes - green, focused
        this.bodyParts.torso.add(scene.add.rectangle(-4, -10, 5, 5, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -10, 5, 5, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-3, -9, 4, 4, 0x2E7D32));
        this.bodyParts.torso.add(scene.add.rectangle(5, -9, 4, 4, 0x2E7D32));
        // Smirk
        this.bodyParts.torso.add(scene.add.rectangle(2, -4, 6, 2, 0xC08060));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createHorseman(scene) {
        // HORSEMAN - Mounted cavalry, clean angular design
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 34, 48, 8, 0x000000, 0.25));

        // Horse back legs
        this.bodyParts.leftLeg = scene.add.container(-14, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 18, 0x6D4C30));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 12, 8, 6, 0x3D2C10)); // hoof
        this.spriteContainer.add(this.bodyParts.leftLeg);

        // Horse front legs
        this.bodyParts.rightLeg = scene.add.container(14, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 18, 0x7D5C40));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 12, 8, 6, 0x4D3C20));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Horse body - brown
        const body = scene.add.rectangle(0, 12, 44, 22, 0x8B5A2B);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 10, 38, 18, 0x9B6A3B)); // highlight

        // Horse tail
        this.bodyParts.torso.add(scene.add.rectangle(-24, 14, 6, 16, 0x3D2C10));
        this.bodyParts.torso.add(scene.add.rectangle(-28, 20, 5, 12, 0x4D3C20));

        // Horse neck and head
        this.bodyParts.leftArm = scene.add.container(22, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 4, 12, 20, 0x8B5A2B)); // neck
        this.bodyParts.leftArm.add(scene.add.rectangle(2, 2, 8, 16, 0x9B6A3B));
        this.bodyParts.leftArm.add(scene.add.rectangle(12, -4, 18, 14, 0x9B6A3B)); // head
        this.bodyParts.leftArm.add(scene.add.rectangle(20, -2, 10, 10, 0x8B5A2B)); // snout
        this.bodyParts.leftArm.add(scene.add.rectangle(6, -14, 6, 10, 0x7B4A1B)); // ear
        this.bodyParts.leftArm.add(scene.add.rectangle(12, -14, 6, 10, 0x7B4A1B)); // ear
        this.bodyParts.leftArm.add(scene.add.rectangle(10, -4, 5, 5, 0x000000)); // eye
        this.bodyParts.leftArm.add(scene.add.rectangle(-2, -4, 6, 14, 0x3D2C10)); // mane
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Saddle
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 20, 12, 0x5D4037));
        this.bodyParts.torso.add(scene.add.rectangle(0, 0, 16, 8, 0x6D5047));

        // Rider body - blue armor
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 18, 22, 0x1565C0));
        this.bodyParts.torso.add(scene.add.rectangle(2, -12, 14, 18, 0x1E88E5)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(0, -6, 14, 4, 0x78909C)); // chainmail

        // Rider arms
        this.bodyParts.torso.add(scene.add.rectangle(-10, -8, 6, 14, 0xF5CBA7)); // rein arm
        // Right arm with sword attached
        this.bodyParts.rightArm = scene.add.container(10, -10);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 2, 7, 14, 0xF5CBA7));
        // Sword attached to arm
        this.bodyParts.weapon = scene.add.container(6, -8);
        this.bodyParts.weapon.add(scene.add.rectangle(8, -8, 6, 30, 0xC0C0C0)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(9, -8, 3, 26, 0xE0E0E0)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(8, 8, 14, 5, 0xD4A020)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(8, 14, 5, 10, 0x5D4037)); // handle
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Rider head with helmet
        this.bodyParts.torso.add(scene.add.rectangle(0, -30, 14, 14, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.rectangle(0, -38, 16, 14, 0x607D8B)); // helmet
        this.bodyParts.torso.add(scene.add.rectangle(2, -36, 12, 10, 0x78909C));
        this.bodyParts.torso.add(scene.add.rectangle(8, -32, 4, 8, 0x546E7A)); // nose guard
        // Eyes
        this.bodyParts.torso.add(scene.add.rectangle(-3, -30, 4, 4, 0x263238));
        this.bodyParts.torso.add(scene.add.rectangle(5, -30, 4, 4, 0x263238));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createKnightVisual(scene) {
        // KNIGHT - Elite peasant with blue armor and shield
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 30, 28, 6, 0x000000, 0.25));

        // Legs - armored
        this.bodyParts.leftLeg = scene.add.container(-6, 18);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 10, 18, 0x1565C0));
        this.bodyParts.leftLeg.add(scene.add.rectangle(1, 0, 6, 14, 0x1E88E5));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 10, 12, 8, 0x0D47A1)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(6, 18);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 10, 18, 0x1976D2));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 10, 12, 8, 0x1565C0));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - blue armor
        const body = scene.add.rectangle(0, 4, 24, 24, 0x1565C0);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 4, 18, 20, 0x1E88E5)); // highlight
        // Golden chest emblem
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 10, 10, 0xFFC107));
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 6, 6, 0xFFD54F));

        // Shield arm
        this.bodyParts.leftArm = scene.add.container(-18, 4);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 14, 28, 0x1565C0)); // shield
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 10, 24, 0x1E88E5));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 8, 0xFFC107)); // emblem
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Sword arm with sword attached
        this.bodyParts.rightArm = scene.add.container(14, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 2, 8, 16, 0x1976D2));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 12, 8, 8, 0xF5CBA7)); // hand
        // Sword attached to arm
        this.bodyParts.weapon = scene.add.container(8, -12);
        this.bodyParts.weapon.add(scene.add.rectangle(0, -8, 6, 32, 0xE0E0E0)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(1, -8, 3, 28, 0xFFFFFF)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, 10, 16, 5, 0xFFC107)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(0, 16, 5, 10, 0x5D4037)); // handle
        this.bodyParts.weapon.add(scene.add.rectangle(0, 22, 6, 5, 0xFFC107)); // pommel
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Helmet
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 24, 20, 0x1565C0));
        this.bodyParts.torso.add(scene.add.rectangle(2, -14, 18, 16, 0x1E88E5));
        // Visor
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 18, 8, 0x263238));
        // Glowing eyes
        this.bodyParts.torso.add(scene.add.rectangle(-5, -14, 6, 5, 0x42A5F5));
        this.bodyParts.torso.add(scene.add.rectangle(5, -14, 6, 5, 0x42A5F5));
        // Red plume
        this.bodyParts.torso.add(scene.add.rectangle(0, -28, 8, 16, 0xE53935));
        this.bodyParts.torso.add(scene.add.rectangle(0, -38, 6, 12, 0xEF5350));
        this.bodyParts.torso.add(scene.add.rectangle(0, -46, 4, 8, 0xE57373));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createRobinhoodVisual(scene) {
        // ROBINHOOD - Elite archer with flowing cloak and legendary bow
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 28, 26, 6, 0x000000, 0.25));

        // Legs
        this.bodyParts.leftLeg = scene.add.container(-5, 16);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x1B5E20));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x4E342E)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 16);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E7D32));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 10, 10, 8, 0x5D4037));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Flowing cloak behind
        this.bodyParts.torso.add(scene.add.rectangle(-6, 6, 22, 28, 0x1B5E20));
        this.bodyParts.torso.add(scene.add.rectangle(-10, 12, 16, 22, 0x0D3B0F));

        // Body - dark green tunic
        const body = scene.add.rectangle(0, 2, 20, 20, 0x2E7D32);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 2, 14, 16, 0x43A047));
        // Belt with golden buckle
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 22, 4, 0x5D4037));
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 6, 5, 0xFFC107));

        // Quiver on back
        this.bodyParts.torso.add(scene.add.rectangle(-14, 0, 10, 24, 0x5D4037));
        this.bodyParts.torso.add(scene.add.rectangle(-14, -12, 3, 8, 0xE53935)); // red arrow
        this.bodyParts.torso.add(scene.add.rectangle(-12, -12, 3, 8, 0x43A047)); // green
        this.bodyParts.torso.add(scene.add.rectangle(-16, -12, 3, 8, 0xFFC107)); // gold

        // Arms
        this.bodyParts.leftArm = scene.add.container(-12, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 7, 14, 0x43A047));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 10, 7, 7, 0xF5CBA7));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Right arm with legendary bow attached
        this.bodyParts.rightArm = scene.add.container(12, 0);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 7, 14, 0x2E7D32));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 10, 7, 7, 0xF5CBA7));
        // Legendary bow with golden tips attached to arm
        this.bodyParts.weapon = scene.add.container(8, -2);
        this.bodyParts.weapon.add(scene.add.rectangle(2, -16, 5, 14, 0x795548)); // top limb
        this.bodyParts.weapon.add(scene.add.rectangle(4, -4, 5, 10, 0x8D6E63));
        this.bodyParts.weapon.add(scene.add.rectangle(5, 6, 6, 10, 0x8D6E63)); // grip
        this.bodyParts.weapon.add(scene.add.rectangle(4, 16, 5, 10, 0x8D6E63));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 26, 5, 14, 0x795548)); // bottom
        // Golden tips
        this.bodyParts.weapon.add(scene.add.rectangle(2, -22, 4, 5, 0xFFC107));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 32, 4, 5, 0xFFC107));
        // Bowstring
        this.bodyParts.weapon.add(scene.add.rectangle(0, 4, 2, 42, 0xE0E0E0));
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Hood - iconic pointed style
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 26, 20, 0x1B5E20));
        this.bodyParts.torso.add(scene.add.rectangle(0, -24, 20, 12, 0x2E7D32));
        this.bodyParts.torso.add(scene.add.rectangle(0, -32, 12, 10, 0x388E3C));
        this.bodyParts.torso.add(scene.add.rectangle(0, -38, 6, 8, 0x43A047)); // point

        // Face under hood
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 18, 16, 0xF5CBA7));
        this.bodyParts.torso.add(scene.add.rectangle(2, -10, 14, 12, 0xFFDDBB));
        // Green eyes
        this.bodyParts.torso.add(scene.add.rectangle(-4, -10, 5, 5, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -10, 5, 5, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-3, -9, 4, 4, 0x388E3C));
        this.bodyParts.torso.add(scene.add.rectangle(5, -9, 4, 4, 0x388E3C));
        // Smirk
        this.bodyParts.torso.add(scene.add.rectangle(2, -4, 6, 2, 0xC08060));
        // Red feather
        this.bodyParts.torso.add(scene.add.rectangle(12, -26, 4, 18, 0xE53935));
        this.bodyParts.torso.add(scene.add.rectangle(14, -36, 3, 12, 0xEF5350));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createLancelotVisual(scene) {
        // LANCELOT - Elite horseman on white stallion with golden armor
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 36, 52, 8, 0x000000, 0.25));

        // Horse back legs - white
        this.bodyParts.leftLeg = scene.add.container(-14, 24);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 18, 0xE0E0E0));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 12, 8, 6, 0xBDBDBD)); // hoof
        this.spriteContainer.add(this.bodyParts.leftLeg);

        // Horse front legs
        this.bodyParts.rightLeg = scene.add.container(14, 24);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 18, 0xEEEEEE));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 12, 8, 6, 0xE0E0E0));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        this.bodyParts.torso = scene.add.container(0, 0);

        // Royal red cape
        this.bodyParts.torso.add(scene.add.rectangle(-8, -4, 24, 34, 0xB71C1C));
        this.bodyParts.torso.add(scene.add.rectangle(-12, 4, 18, 28, 0xC62828));

        // Horse body - white stallion
        const body = scene.add.rectangle(0, 14, 48, 24, 0xEEEEEE);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(2, 12, 42, 20, 0xFAFAFA)); // highlight
        // Golden barding
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 36, 8, 0xFFC107));
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 32, 5, 0xFFD54F));

        // Horse tail - white
        this.bodyParts.torso.add(scene.add.rectangle(-26, 16, 6, 18, 0xE0E0E0));
        this.bodyParts.torso.add(scene.add.rectangle(-30, 22, 5, 14, 0xEEEEEE));

        // Horse neck and head
        this.bodyParts.leftArm = scene.add.container(24, 0);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 4, 14, 22, 0xEEEEEE)); // neck
        this.bodyParts.leftArm.add(scene.add.rectangle(2, 2, 10, 18, 0xFAFAFA));
        this.bodyParts.leftArm.add(scene.add.rectangle(14, -4, 20, 16, 0xFAFAFA)); // head
        this.bodyParts.leftArm.add(scene.add.rectangle(22, -2, 12, 10, 0xEEEEEE)); // snout
        this.bodyParts.leftArm.add(scene.add.rectangle(10, -4, 16, 5, 0xFFC107)); // face armor
        this.bodyParts.leftArm.add(scene.add.rectangle(6, -14, 6, 12, 0xEEEEEE)); // ear
        this.bodyParts.leftArm.add(scene.add.rectangle(12, -14, 6, 12, 0xEEEEEE)); // ear
        this.bodyParts.leftArm.add(scene.add.rectangle(10, -4, 5, 5, 0x263238)); // eye
        this.bodyParts.leftArm.add(scene.add.rectangle(-2, -4, 6, 16, 0xE0E0E0)); // mane
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Golden saddle
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 22, 14, 0xFFC107));
        this.bodyParts.torso.add(scene.add.rectangle(0, 0, 18, 10, 0xFFD54F));

        // Lancelot - golden armor
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 20, 24, 0xFFC107));
        this.bodyParts.torso.add(scene.add.rectangle(2, -12, 16, 20, 0xFFD54F)); // highlight
        // Blue chest emblem
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 10, 10, 0x1565C0));
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 6, 6, 0x1E88E5));

        // Arms
        this.bodyParts.torso.add(scene.add.rectangle(-10, -8, 6, 16, 0xF5CBA7)); // rein arm
        // Right arm with Excalibur attached
        this.bodyParts.rightArm = scene.add.container(12, -12);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 4, 7, 16, 0xF5CBA7));
        // Excalibur - legendary sword attached to arm
        this.bodyParts.weapon = scene.add.container(6, -10);
        this.bodyParts.weapon.add(scene.add.rectangle(8, -10, 7, 36, 0xFAFAFA)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(9, -10, 4, 32, 0xFFFFFF)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(8, 10, 18, 6, 0xFFC107)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(8, 16, 5, 12, 0x5D4037)); // handle
        this.bodyParts.weapon.add(scene.add.rectangle(8, 24, 8, 6, 0xFFC107)); // pommel
        this.bodyParts.weapon.add(scene.add.rectangle(8, 24, 4, 4, 0x1565C0)); // gem
        this.bodyParts.rightArm.add(this.bodyParts.weapon);
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Head with golden helmet
        this.bodyParts.torso.add(scene.add.rectangle(0, -32, 16, 16, 0xF5CBA7)); // face
        this.bodyParts.torso.add(scene.add.rectangle(0, -42, 20, 16, 0xFFC107)); // helmet
        this.bodyParts.torso.add(scene.add.rectangle(2, -40, 16, 12, 0xFFD54F));
        // Visor
        this.bodyParts.torso.add(scene.add.rectangle(0, -34, 16, 6, 0x263238));
        // Glowing eyes
        this.bodyParts.torso.add(scene.add.rectangle(-4, -32, 5, 4, 0x42A5F5));
        this.bodyParts.torso.add(scene.add.rectangle(4, -32, 5, 4, 0x42A5F5));
        // Blue and gold plume
        this.bodyParts.torso.add(scene.add.rectangle(0, -54, 10, 18, 0x1565C0));
        this.bodyParts.torso.add(scene.add.rectangle(0, -66, 8, 14, 0x1E88E5));
        this.bodyParts.torso.add(scene.add.rectangle(0, -76, 6, 10, 0x42A5F5));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -56, 4, 12, 0xFFC107)); // gold accent

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

