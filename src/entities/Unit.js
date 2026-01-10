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
        const promotedDamage = Math.floor(stats.damage * promotionBonus);
        const promotedAttackSpeed = Math.max(200, Math.floor(stats.attackSpeed / promotionBonus)); // Faster = lower ms

        this.stats = { ...stats };
        this.maxHealth = promotedHealth;
        this.currentHealth = promotedHealth;
        this.damage = promotedDamage;
        this.speed = stats.speed;
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
        // Ranged units (archers, wizards) stay behind melee units
        // Melee units (peasants, knights, giants) form the front line
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
            // Ranged units: Archers and Wizards stay behind
            // Position them 30-60px behind the defense line
            this.defenseX = baseX - Phaser.Math.Between(30, 60);
            this.defenseY = Phaser.Math.Between(minY, maxY);
        } else {
            // Melee units form front line based on their tankiness
            switch (type) {
                case 'KNIGHT':
                    // Knights are tanks - front and center
                    this.defenseX = baseX + Phaser.Math.Between(40, 70);
                    this.defenseY = Phaser.Math.Between(minY + 20, maxY - 20);
                    break;
                case 'GIANT':
                    // Giants are very tanky - at the very front
                    this.defenseX = baseX + Phaser.Math.Between(60, 90);
                    this.defenseY = Phaser.Math.Between(minY, maxY);
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
                this.createPeasant(scene);
                break;
            case 'ARCHER':
                this.createArcher(scene);
                break;
            case 'KNIGHT':
                this.createKnight(scene);
                break;
            case 'WIZARD':
                this.createWizard(scene);
                break;
            case 'GIANT':
                this.createGiant(scene);
                break;
            default:
                this.createPeasant(scene);
        }
    }

    createPeasant(scene) {
        // CARTOONY PEASANT - friendly farmer style with animated parts
        // Shadow (soft)
        this.spriteContainer.add(scene.add.rectangle(0, 30, 24, 6, 0x000000, 0.2));

        // Animated legs container
        this.bodyParts.leftLeg = scene.add.container(-6, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 10, 14, 0x6B4423));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 6, 12, 6, 0x4A3020)); // shoe
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(6, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 10, 14, 0x6B4423));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 6, 12, 6, 0x4A3020)); // shoe
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (for bobbing)
        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - puffy tunic
        const body = scene.add.rectangle(0, 6, 22, 22, 0xE8C87A);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 18, 16, 0xF5D88A)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-8, 6, 4, 18, 0xD4B060)); // left shade

        // Belt with buckle
        this.bodyParts.torso.add(scene.add.rectangle(0, 14, 24, 5, 0x8B5A2B));
        this.bodyParts.torso.add(scene.add.rectangle(0, 14, 6, 6, 0xFFD700)); // buckle

        // Animated arms
        this.bodyParts.leftArm = scene.add.container(-14, 4);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 14, 0xFFCBA4));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 8, 10, 8, 0xFFDDBB)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(14, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 8, 14, 0xFFCBA4));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 8, 10, 8, 0xFFDDBB)); // hand
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // BIG cartoony head
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 26, 24, 0xFFCBA4)); // face
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 22, 18, 0xFFDDBB)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-10, -14, 4, 20, 0xE8B090)); // shade

        // Messy hair
        this.bodyParts.torso.add(scene.add.rectangle(0, -26, 28, 10, 0x8B6914));
        this.bodyParts.torso.add(scene.add.rectangle(-8, -24, 8, 8, 0x8B6914));
        this.bodyParts.torso.add(scene.add.rectangle(8, -24, 8, 8, 0x8B6914));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -30, 6, 6, 0x9B7924)); // highlight tuft

        // BIG cute eyes
        this.bodyParts.torso.add(scene.add.rectangle(-6, -14, 10, 12, 0xFFFFFF)); // left eye white
        this.bodyParts.torso.add(scene.add.rectangle(6, -14, 10, 12, 0xFFFFFF)); // right eye white
        this.bodyParts.torso.add(scene.add.rectangle(-5, -13, 6, 8, 0x4A3020)); // left pupil
        this.bodyParts.torso.add(scene.add.rectangle(7, -13, 6, 8, 0x4A3020)); // right pupil
        this.bodyParts.torso.add(scene.add.rectangle(-6, -15, 3, 3, 0xFFFFFF)); // left shine
        this.bodyParts.torso.add(scene.add.rectangle(6, -15, 3, 3, 0xFFFFFF)); // right shine

        // Happy mouth
        this.bodyParts.torso.add(scene.add.rectangle(0, -4, 8, 4, 0xE08080));
        this.bodyParts.torso.add(scene.add.rectangle(0, -3, 6, 2, 0xC06060)); // inner mouth

        // Rosy cheeks
        this.bodyParts.torso.add(scene.add.rectangle(-10, -8, 6, 4, 0xFFAAAA, 0.5));
        this.bodyParts.torso.add(scene.add.rectangle(10, -8, 6, 4, 0xFFAAAA, 0.5));

        // Weapon arm with pitchfork
        this.bodyParts.weapon = scene.add.container(20, 0);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 5, 36, 0xC49A4A)); // handle
        this.bodyParts.weapon.add(scene.add.rectangle(0, 2, 3, 32, 0xD4AA5A)); // handle highlight
        this.bodyParts.weapon.add(scene.add.rectangle(0, -18, 4, 10, 0x88AACC)); // center prong
        this.bodyParts.weapon.add(scene.add.rectangle(-6, -16, 4, 8, 0x88AACC)); // left prong
        this.bodyParts.weapon.add(scene.add.rectangle(6, -16, 4, 8, 0x88AACC)); // right prong
        this.bodyParts.weapon.add(scene.add.rectangle(0, -12, 16, 4, 0x99BBDD)); // crossbar
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createArcher(scene) {
        // CARTOONY ARCHER - cool ranger style WITH ANIMATIONS
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 28, 22, 5, 0x000000, 0.2));

        // Animated legs with boots
        this.bodyParts.leftLeg = scene.add.container(-5, 20);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E5A2E));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 6, 10, 6, 0x5A3A20)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 20);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x2E5A2E));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 6, 10, 6, 0x5A3A20)); // boot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - sleek tunic
        const body = scene.add.rectangle(0, 4, 18, 20, 0x3CB043);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 6, 14, 14, 0x4CC053));
        this.bodyParts.torso.add(scene.add.rectangle(-6, 4, 4, 16, 0x2A9030));
        this.bodyParts.torso.add(scene.add.rectangle(0, 12, 20, 4, 0x6B4423)); // belt

        // Quiver on back
        this.bodyParts.torso.add(scene.add.rectangle(-14, 2, 8, 20, 0x6B4423));
        this.bodyParts.torso.add(scene.add.rectangle(-14, 0, 6, 16, 0x7B5433));
        this.bodyParts.torso.add(scene.add.rectangle(-14, -10, 3, 6, 0xFF6666));
        this.bodyParts.torso.add(scene.add.rectangle(-12, -10, 3, 6, 0x66FF66));

        // Animated bow arm
        this.bodyParts.leftArm = scene.add.container(-12, 2);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 6, 12, 0xFFCBA4));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Animated draw arm with bow
        this.bodyParts.rightArm = scene.add.container(12, 2);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 6, 12, 0xFFCBA4));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Cool hood/cape
        this.bodyParts.torso.add(scene.add.rectangle(0, -4, 22, 14, 0x228B22));
        this.bodyParts.torso.add(scene.add.rectangle(0, -10, 20, 10, 0x228B22));
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 16, 8, 0x2A9B32));
        this.bodyParts.torso.add(scene.add.rectangle(0, -20, 10, 6, 0x2A9B32));

        // Face (visible under hood)
        this.bodyParts.torso.add(scene.add.rectangle(0, -6, 16, 14, 0xFFCBA4));
        this.bodyParts.torso.add(scene.add.rectangle(0, -5, 14, 10, 0xFFDDBB));

        // Determined eyes
        this.bodyParts.torso.add(scene.add.rectangle(-4, -8, 8, 8, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -8, 8, 8, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-3, -7, 5, 6, 0x228B22));
        this.bodyParts.torso.add(scene.add.rectangle(5, -7, 5, 6, 0x228B22));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -8, 3, 3, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(4, -8, 3, 3, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(-5, -10, 2, 2, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(2, -1, 6, 2, 0xCC8888)); // smirk

        // Cool bow (animated weapon)
        this.bodyParts.weapon = scene.add.container(18, 0);
        this.bodyParts.weapon.add(scene.add.rectangle(0, -12, 5, 8, 0x8B5A33));
        this.bodyParts.weapon.add(scene.add.rectangle(2, -6, 5, 6, 0x9B6A43));
        this.bodyParts.weapon.add(scene.add.rectangle(4, 0, 5, 8, 0x9B6A43));
        this.bodyParts.weapon.add(scene.add.rectangle(2, 6, 5, 6, 0x9B6A43));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 12, 5, 8, 0x8B5A33));
        this.bodyParts.weapon.add(scene.add.rectangle(-2, 0, 2, 28, 0xDDDDDD)); // bowstring
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createKnight(scene) {
        // CARTOONY KNIGHT - heroic and shiny with animated parts!
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 32, 28, 6, 0x000000, 0.2));

        // Animated legs
        this.bodyParts.leftLeg = scene.add.container(-6, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 10, 16, 0x5080C0));
        this.bodyParts.leftLeg.add(scene.add.rectangle(1, 0, 6, 12, 0x60A0E0)); // highlight
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 8, 12, 6, 0x4070B0)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(6, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 10, 16, 0x5080C0));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 8, 12, 6, 0x4070B0)); // boot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // Body - heroic blue armor
        const body = scene.add.rectangle(0, 4, 24, 24, 0x4488DD);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 6, 20, 18, 0x55AAEE)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-9, 4, 5, 20, 0x3366AA)); // shade
        // Golden chest emblem
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 10, 10, 0xFFD700));
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 6, 6, 0xFFEE44)); // inner shine

        // Shield arm (animated)
        this.bodyParts.leftArm = scene.add.container(-18, 6);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 14, 26, 0x4488DD)); // shield
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 12, 22, 0x55AAEE)); // highlight
        this.bodyParts.leftArm.add(scene.add.rectangle(0, -2, 8, 8, 0xFFD700)); // emblem
        this.bodyParts.leftArm.add(scene.add.rectangle(0, -2, 4, 4, 0xFFEE66)); // shine
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Sword arm (animated)
        this.bodyParts.rightArm = scene.add.container(13, 8);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 6, 14, 0x5080C0)); // arm
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // AWESOME Helmet
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 22, 18, 0x6090D0));
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 18, 14, 0x70A0E0)); // highlight
        // Visor (shows brave eyes inside)
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 16, 8, 0x303030));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -12, 6, 5, 0x4488FF)); // left eye glow
        this.bodyParts.torso.add(scene.add.rectangle(4, -12, 6, 5, 0x4488FF)); // right eye glow
        this.bodyParts.torso.add(scene.add.rectangle(-4, -13, 3, 2, 0xAADDFF)); // shine
        this.bodyParts.torso.add(scene.add.rectangle(4, -13, 3, 2, 0xAADDFF));
        // Epic plume
        this.bodyParts.torso.add(scene.add.rectangle(0, -24, 6, 12, 0xFF4444));
        this.bodyParts.torso.add(scene.add.rectangle(0, -30, 5, 8, 0xFF6666));
        this.bodyParts.torso.add(scene.add.rectangle(0, -34, 4, 6, 0xFF8888)); // tip

        // SHINY Sword (in weapon container)
        this.bodyParts.weapon = scene.add.container(20, -8);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 6, 32, 0xDDDDDD)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(0, 2, 4, 28, 0xFFFFFF)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, -14, 4, 6, 0xFFFFFF)); // tip shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, 18, 14, 6, 0xC49A4A)); // crossguard
        this.bodyParts.weapon.add(scene.add.rectangle(0, 18, 10, 4, 0xD4AA5A)); // highlight
        this.bodyParts.weapon.add(scene.add.rectangle(0, 24, 6, 6, 0xFFD700)); // pommel
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createWizard(scene) {
        // CARTOONY WIZARD - magical and mysterious! WITH ANIMATIONS
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 30, 26, 6, 0x000000, 0.2));

        // Animated robe bottom (acts like legs)
        this.bodyParts.leftLeg = scene.add.container(-5, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 12, 16, 0x8844CC));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 2, 10, 12, 0x9955DD));
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 12, 16, 0x8844CC));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 2, 10, 12, 0x9955DD));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // Robe body
        const robe = scene.add.rectangle(0, 6, 22, 20, 0xAA55EE);
        this.bodyParts.torso.add(robe);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 18, 14, 0xBB66FF));
        this.bodyParts.torso.add(scene.add.rectangle(-8, 6, 4, 16, 0x8844CC));

        // Gold trim
        this.bodyParts.torso.add(scene.add.rectangle(0, 28, 28, 4, 0xFFD700));
        this.bodyParts.torso.add(scene.add.rectangle(-8, 28, 4, 3, 0xFFEE66));
        this.bodyParts.torso.add(scene.add.rectangle(8, 28, 4, 3, 0xFFEE66));

        // Animated arms with sleeves
        this.bodyParts.leftArm = scene.add.container(-14, 6);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 14, 0xAA55EE));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 8, 8, 6, 0xFFCBA4)); // hand
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(14, 6);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 8, 14, 0xAA55EE));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 8, 8, 6, 0xFFCBA4)); // hand
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Wise old face
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 18, 16, 0xFFCBA4));
        this.bodyParts.torso.add(scene.add.rectangle(0, -6, 14, 12, 0xFFDDBB));

        // Magnificent beard
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 14, 14, 0xEEEEEE));
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 12, 10, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-4, 14, 6, 8, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(4, 14, 6, 8, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(0, 18, 4, 6, 0xFFFFFF));

        // Magical glowing eyes
        this.bodyParts.torso.add(scene.add.rectangle(-4, -10, 8, 8, 0x00DDFF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -10, 8, 8, 0x00DDFF));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -10, 4, 4, 0xAAFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -10, 4, 4, 0xAAFFFF));

        // Bushy eyebrows
        this.bodyParts.torso.add(scene.add.rectangle(-5, -15, 8, 3, 0xCCCCCC));
        this.bodyParts.torso.add(scene.add.rectangle(5, -15, 8, 3, 0xCCCCCC));

        // MAGICAL Wizard hat
        this.bodyParts.torso.add(scene.add.rectangle(0, -18, 24, 8, 0x8844CC));
        this.bodyParts.torso.add(scene.add.rectangle(0, -26, 18, 12, 0x9955DD));
        this.bodyParts.torso.add(scene.add.rectangle(0, -34, 14, 10, 0xAA66EE));
        this.bodyParts.torso.add(scene.add.rectangle(0, -42, 10, 10, 0xBB77FF));
        this.bodyParts.torso.add(scene.add.rectangle(4, -48, 8, 8, 0xCC88FF));
        this.bodyParts.torso.add(scene.add.rectangle(-4, -30, 5, 5, 0xFFD700));
        this.bodyParts.torso.add(scene.add.rectangle(4, -38, 4, 4, 0xFFEE88));

        // MAGICAL Staff (animated weapon)
        this.bodyParts.weapon = scene.add.container(22, 4);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 6, 44, 0x8B5A33));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 2, 4, 40, 0x9B6A43));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -26, 16, 16, 0x00BBCC)); // orb
        this.bodyParts.weapon.add(scene.add.rectangle(0, -26, 12, 12, 0x00DDEE));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -26, 6, 6, 0x66FFFF));
        this.bodyParts.weapon.add(scene.add.rectangle(-3, -29, 4, 4, 0xFFFFFF));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        // Animated magic glow
        const glow = scene.add.rectangle(22, -22, 20, 20, 0x00FFFF, 0.3);
        this.bodyParts.torso.add(glow);
        scene.tweens.add({
            targets: glow,
            alpha: 0.6,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 800,
            yoyo: true,
            repeat: -1
        });

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = robe;
    }

    createGiant(scene) {
        // CARTOONY GIANT - big friendly (but fierce) warrior! WITH ANIMATIONS
        const s = 1.5; // scale

        // Big shadow
        this.spriteContainer.add(scene.add.rectangle(0, 48 * s, 40 * s, 8, 0x000000, 0.2));

        // Animated chunky legs
        this.bodyParts.leftLeg = scene.add.container(-10 * s, 32 * s);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 14 * s, 20 * s, 0x7B5040));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1 * s, 12 * s, 16 * s, 8 * s, 0x6B4030)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(10 * s, 32 * s);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 14 * s, 20 * s, 0x7B5040));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1 * s, 12 * s, 16 * s, 8 * s, 0x6B4030)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // MASSIVE body
        const body = scene.add.rectangle(0, 10 * s, 36 * s, 32 * s, 0xBB4444);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 12 * s, 30 * s, 26 * s, 0xCC5555));
        this.bodyParts.torso.add(scene.add.rectangle(-14 * s, 10 * s, 6 * s, 28 * s, 0x993333));

        // Friendly belly
        this.bodyParts.torso.add(scene.add.rectangle(0, 16 * s, 24 * s, 18 * s, 0xDD7766));
        this.bodyParts.torso.add(scene.add.rectangle(0, 14 * s, 18 * s, 12 * s, 0xEE8877));

        // Cool belt
        this.bodyParts.torso.add(scene.add.rectangle(0, 24 * s, 38 * s, 6 * s, 0x5A4030));
        this.bodyParts.torso.add(scene.add.rectangle(0, 24 * s, 10 * s, 8 * s, 0xFFD700));
        this.bodyParts.torso.add(scene.add.rectangle(0, 24 * s, 6 * s, 4 * s, 0xFFEE66));

        // Animated huge arms
        this.bodyParts.leftArm = scene.add.container(-22 * s, 10 * s);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 12 * s, 28 * s, 0xDD9966));
        this.bodyParts.leftArm.add(scene.add.rectangle(2 * s, 0, 6 * s, 24 * s, 0xEEAA77));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 16 * s, 14 * s, 12 * s, 0xEEAA77)); // fist
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(22 * s, 10 * s);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 12 * s, 28 * s, 0xDD9966));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 16 * s, 14 * s, 12 * s, 0xEEAA77)); // fist
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Big lovable head
        this.bodyParts.torso.add(scene.add.rectangle(0, -16 * s, 28 * s, 24 * s, 0xDD9966));
        this.bodyParts.torso.add(scene.add.rectangle(0, -14 * s, 24 * s, 18 * s, 0xEEAA77));
        this.bodyParts.torso.add(scene.add.rectangle(-10 * s, -16 * s, 6 * s, 20 * s, 0xCC8855));

        // Friendly but fierce eyes
        this.bodyParts.torso.add(scene.add.rectangle(-7 * s, -18 * s, 10 * s, 10 * s, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(7 * s, -18 * s, 10 * s, 10 * s, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-6 * s, -17 * s, 6 * s, 8 * s, 0x664422));
        this.bodyParts.torso.add(scene.add.rectangle(8 * s, -17 * s, 6 * s, 8 * s, 0x664422));
        this.bodyParts.torso.add(scene.add.rectangle(-8 * s, -19 * s, 3 * s, 3 * s, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(6 * s, -19 * s, 3 * s, 3 * s, 0xFFFFFF));

        // Determined eyebrows
        this.bodyParts.torso.add(scene.add.rectangle(-7 * s, -24 * s, 10 * s, 4 * s, 0x5A3020));
        this.bodyParts.torso.add(scene.add.rectangle(7 * s, -24 * s, 10 * s, 4 * s, 0x5A3020));

        // Big smile with teeth
        this.bodyParts.torso.add(scene.add.rectangle(0, -6 * s, 16 * s, 8 * s, 0xAA4040));
        this.bodyParts.torso.add(scene.add.rectangle(0, -8 * s, 12 * s, 4 * s, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(-5 * s, -3 * s, 4 * s, 6 * s, 0xFFFFEE));
        this.bodyParts.torso.add(scene.add.rectangle(5 * s, -3 * s, 4 * s, 6 * s, 0xFFFFEE));

        // EPIC spiked club (animated weapon)
        this.bodyParts.weapon = scene.add.container(34 * s, 4 * s);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 10 * s, 50 * s, 0x6B5030));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 2 * s, 6 * s, 46 * s, 0x7B6040));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -30 * s, 20 * s, 24 * s, 0x5A4030));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -30 * s, 16 * s, 20 * s, 0x6B5040));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -46 * s, 6 * s, 12 * s, 0x888888));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -48 * s, 4 * s, 8 * s, 0xAAAAAA));
        this.bodyParts.weapon.add(scene.add.rectangle(12 * s, -32 * s, 10 * s, 5 * s, 0x888888));
        this.bodyParts.weapon.add(scene.add.rectangle(-12 * s, -32 * s, 10 * s, 5 * s, 0x888888));
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
                    projectileType: this.unitType.toUpperCase() === 'WIZARD' ? 'magic' : 'arrow',
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

