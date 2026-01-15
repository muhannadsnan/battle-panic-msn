// Enemy Class - AI controlled enemy units with detailed sprites
class Enemy extends Phaser.GameObjects.Container {
    constructor(scene, x, y, enemyType, waveNumber = 1, spawnDirection = 'right') {
        super(scene, x, y);

        this.scene = scene;
        this.enemyType = enemyType;
        this.spawnDirection = spawnDirection; // 'right', 'top', 'bottom'

        // Get base stats
        const baseStats = ENEMY_TYPES[enemyType.toUpperCase()];
        if (!baseStats) {
            console.error('Unknown enemy type:', enemyType);
            return;
        }

        // Scale stats with wave number - tiered scaling system
        // Waves 1-20: +3%, 21-40: +6%, 41-60: +9%, 61-80: +12%, etc.
        const tierSize = WAVE_CONFIG.scalingTierSize || 20;
        const baseScale = WAVE_CONFIG.baseScalingPercent || 0.03;
        const scaleIncrement = WAVE_CONFIG.scalingIncrement || 0.03;

        let waveHealthMultiplier = 1;
        let waveDamageMultiplier = 1;

        for (let w = 1; w < waveNumber; w++) {
            const tier = Math.floor((w - 1) / tierSize); // Tier 0 for waves 1-20, tier 1 for 21-40, etc.
            const tierScale = baseScale + (tier * scaleIncrement);
            waveHealthMultiplier += tierScale;
            waveDamageMultiplier += tierScale;
        }

        // Early game reduction: waves 1-10 are 50% easier for fresh players
        // Gradually scales from 50% reduction at wave 1 to full strength at wave 11
        if (waveNumber <= 10) {
            const earlyGameReduction = 0.5 + (waveNumber - 1) * 0.05; // 0.5 at wave 1, 0.95 at wave 10
            waveHealthMultiplier *= earlyGameReduction;
            waveDamageMultiplier *= earlyGameReduction;
        }

        const waveSpeedMultiplier = 1 + (waveNumber - 1) * 0.015; // Slight speed increase

        this.isBoss = baseStats.isBoss || false;

        // Apply boss multipliers - scales with boss number!
        // Boss 1 (wave 10) = 1x, Boss 2 (wave 20) = 2x, Boss 3 (wave 30) = 3x, etc.
        let healthMult = waveHealthMultiplier;
        let damageMult = waveDamageMultiplier;
        let sizeMult = 1;

        let attackSpeedMult = 1;

        if (this.isBoss) {
            const bossNumber = Math.floor(waveNumber / BOSS_CONFIG.spawnEveryWaves);
            this.bossNumber = bossNumber;

            // Each boss is bossNumber times stronger than base boss
            healthMult *= BOSS_CONFIG.healthMultiplier * bossNumber;
            damageMult *= BOSS_CONFIG.damageMultiplier * bossNumber;
            sizeMult = BOSS_CONFIG.sizeMultiplier * (1 + (bossNumber - 1) * 0.1); // Slightly bigger each time

            // Attack speed: N × 10% faster (lower ms = faster)
            attackSpeedMult = 1 - (bossNumber * 0.1);
            attackSpeedMult = Math.max(0.2, attackSpeedMult); // Cap at 80% reduction (5x faster max)
        }

        this.maxHealth = Math.floor(baseStats.health * healthMult);
        this.currentHealth = this.maxHealth;
        this.damage = Math.floor(baseStats.damage * damageMult);
        this.speed = Math.min(baseStats.speed * waveSpeedMultiplier, baseStats.speed * 1.5);
        this.attackSpeed = Math.floor(baseStats.attackSpeed * attackSpeedMult);
        this.range = baseStats.range;
        this.isRanged = baseStats.isRanged || false;
        this.goldReward = baseStats.goldReward;
        this.woodReward = baseStats.woodReward || Math.floor(baseStats.goldReward * 0.6);
        this.color = baseStats.color;
        this.bossScale = sizeMult;

        this.isDead = false;
        this.target = null;
        this.isAttacking = false;
        this.lastAttackTime = 0;
        this.direction = -1; // -1 = left (toward player)

        // Spawn grace period - enemies are invulnerable and don't attack for first 500ms
        this.spawnTime = Date.now();
        this.spawnGracePeriod = 500; // ms
        this.isSpawning = true;

        // Animation state
        this.walkTime = 0;
        this.bodyParts = {}; // Store references to animated parts

        // Create the enemy sprite based on type
        this.spriteContainer = scene.add.container(0, 0);
        this.createEnemySprite(enemyType);
        this.add(this.spriteContainer);

        // Create health bar
        const barY = this.isBoss ? -55 : -40;
        const barWidth = this.isBoss ? 60 : 40;
        this.healthBar = new HealthBar(scene, 0, barY, barWidth, 6, 0xff0000);
        this.add(this.healthBar);

        // Add to scene
        scene.add.existing(this);

        // Set depth based on y position
        this.setDepth(y);

        // Enemies start small but grow 5% bigger each wave, capped at 500%
        const sizeBaseScale = 0.8;  // Start small
        const waveGrowth = 1 + (waveNumber - 1) * 0.05;  // +5% per wave
        const uncappedScale = sizeBaseScale * waveGrowth * this.bossScale;
        const finalScale = Math.min(uncappedScale, 5.0);  // Cap at 500%
        this.currentScale = finalScale;

        // Spawn effect - health bar stays fixed size by counter-scaling
        this.setAlpha(0);
        this.setScale(0.3);
        // Pre-scale health bar to counter the initial 0.3 scale
        if (this.healthBar) {
            this.healthBar.setScale(1 / 0.3);
        }
        scene.tweens.add({
            targets: this,
            alpha: 1,
            scaleX: finalScale,
            scaleY: finalScale,
            duration: 300,
            ease: 'Back.easeOut',
            onUpdate: () => {
                // Keep health bar at consistent size during scale animation
                if (this.healthBar && this.scaleX > 0) {
                    this.healthBar.setScale(1 / this.scaleX);
                }
            }
        });
    }

    createEnemySprite(enemyType) {
        const scene = this.scene;

        switch (enemyType.toUpperCase()) {
            case 'GOBLIN':
                this.createGoblin(scene);
                break;
            case 'ORC':
                this.createOrc(scene);
                break;
            case 'SKELETON':
                this.createSkeleton(scene);
                break;
            case 'SKELETON_ARCHER':
                this.createSkeletonArcher(scene);
                break;
            case 'TROLL':
                this.createTroll(scene);
                break;
            case 'DARK_KNIGHT':
                this.createDarkKnight(scene);
                break;
            case 'DEMON':
                this.createDemon(scene);
                break;
            case 'DRAGON':
                this.createDragon(scene);
                break;
            case 'SPEAR_MONSTER':
                this.createSpearMonster(scene);
                break;
            default:
                this.createGoblin(scene);
        }
    }

    createGoblin(scene) {
        // CARTOONY GOBLIN - mischievous little troublemaker with animated parts!
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 28, 20, 5, 0x000000, 0.2));

        // Animated scrawny legs
        this.bodyParts.leftLeg = scene.add.container(-5, 20);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x44BB44));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 6, 10, 5, 0x33AA33)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(5, 20);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 8, 14, 0x44BB44));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 6, 10, 5, 0x33AA33)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // Scrappy body
        const body = scene.add.rectangle(0, 6, 18, 18, 0x55DD55);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 14, 12, 0x66EE66)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-6, 6, 4, 14, 0x44BB44)); // shade

        // Tattered vest
        this.bodyParts.torso.add(scene.add.rectangle(0, 6, 16, 14, 0x8B5A33, 0.7));

        // Animated skinny arms
        this.bodyParts.leftArm = scene.add.container(-12, 4);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 6, 12, 0x55DD55));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(12, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 6, 12, 0x55DD55));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // BIG goofy head
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 24, 22, 0x55DD55));
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 20, 16, 0x66EE66)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-9, -14, 4, 18, 0x44BB44)); // shade

        // Huge pointy ears
        this.bodyParts.torso.add(scene.add.rectangle(-16, -14, 10, 14, 0x55DD55));
        this.bodyParts.torso.add(scene.add.rectangle(-20, -20, 8, 10, 0x66EE66));
        this.bodyParts.torso.add(scene.add.rectangle(-22, -26, 6, 8, 0x77FF77)); // tip
        this.bodyParts.torso.add(scene.add.rectangle(16, -14, 10, 14, 0x55DD55));
        this.bodyParts.torso.add(scene.add.rectangle(20, -20, 8, 10, 0x66EE66));
        this.bodyParts.torso.add(scene.add.rectangle(22, -26, 6, 8, 0x77FF77)); // tip

        // Crazy big eyes
        this.bodyParts.torso.add(scene.add.rectangle(-6, -16, 10, 12, 0xFFFF44)); // left eye
        this.bodyParts.torso.add(scene.add.rectangle(6, -16, 10, 12, 0xFFFF44)); // right eye
        this.bodyParts.torso.add(scene.add.rectangle(-5, -15, 5, 8, 0x000000)); // left pupil
        this.bodyParts.torso.add(scene.add.rectangle(7, -15, 5, 8, 0x000000)); // right pupil
        this.bodyParts.torso.add(scene.add.rectangle(-7, -18, 3, 3, 0xFFFFAA)); // shine

        // Big nose
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 8, 8, 0x44BB44));
        this.bodyParts.torso.add(scene.add.rectangle(0, -7, 6, 5, 0x55CC55)); // highlight

        // Sneaky grin
        this.bodyParts.torso.add(scene.add.rectangle(0, -1, 12, 6, 0x226622)); // mouth
        this.bodyParts.torso.add(scene.add.rectangle(-4, -2, 3, 4, 0xFFFFFF)); // tooth
        this.bodyParts.torso.add(scene.add.rectangle(4, -2, 3, 4, 0xFFFFFF)); // tooth

        // Rusty dagger (animated weapon)
        this.bodyParts.weapon = scene.add.container(-18, 4);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 5, 20, 0xAAAAAA)); // blade
        this.bodyParts.weapon.add(scene.add.rectangle(0, -2, 3, 16, 0xCCCCCC)); // shine
        this.bodyParts.weapon.add(scene.add.rectangle(0, 10, 10, 4, 0x8B5A33)); // hilt
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createOrc(scene) {
        // CARTOONY ORC - big muscular brute with animated parts!
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 40, 32, 6, 0x000000, 0.2));

        // Animated thick legs
        this.bodyParts.leftLeg = scene.add.container(-8, 28);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 12, 18, 0x6B8844));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 10, 14, 6, 0x5A7733)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(8, 28);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 12, 18, 0x6B8844));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 10, 14, 6, 0x5A7733)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // HUGE muscular body
        const body = scene.add.rectangle(0, 6, 30, 32, 0x7B9955);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 26, 26, 0x8BAA66)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-12, 6, 5, 28, 0x5A7733)); // shade

        // Pecs and abs (muscular)
        this.bodyParts.torso.add(scene.add.rectangle(-6, 2, 10, 10, 0x9BBB77)); // left pec
        this.bodyParts.torso.add(scene.add.rectangle(6, 2, 10, 10, 0x9BBB77)); // right pec
        this.bodyParts.torso.add(scene.add.rectangle(0, 14, 8, 6, 0x8BAA66)); // abs

        // Animated massive arms
        this.bodyParts.leftArm = scene.add.container(-20, 4);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 12, 22, 0x7B9955));
        this.bodyParts.leftArm.add(scene.add.rectangle(2, 0, 6, 18, 0x8BAA66)); // highlight
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 14, 14, 10, 0x8BAA66)); // fist
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(20, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 12, 22, 0x7B9955));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 14, 14, 10, 0x8BAA66)); // fist
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Mean-looking head
        this.bodyParts.torso.add(scene.add.rectangle(0, -20, 28, 26, 0x7B9955));
        this.bodyParts.torso.add(scene.add.rectangle(0, -18, 24, 20, 0x8BAA66)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-10, -20, 6, 22, 0x5A7733)); // shade

        // Strong jaw with underbite
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 22, 12, 0x6B8844));

        // Big tusks
        this.bodyParts.torso.add(scene.add.rectangle(-8, -2, 5, 12, 0xFFFFEE));
        this.bodyParts.torso.add(scene.add.rectangle(-8, -6, 6, 6, 0xFFFFFF)); // shine
        this.bodyParts.torso.add(scene.add.rectangle(8, -2, 5, 12, 0xFFFFEE));
        this.bodyParts.torso.add(scene.add.rectangle(8, -6, 6, 6, 0xFFFFFF)); // shine

        // Angry glowing eyes
        this.bodyParts.torso.add(scene.add.rectangle(-7, -22, 10, 8, 0xFF4444)); // left eye
        this.bodyParts.torso.add(scene.add.rectangle(7, -22, 10, 8, 0xFF4444)); // right eye
        this.bodyParts.torso.add(scene.add.rectangle(-6, -21, 6, 5, 0xFF6666)); // glow
        this.bodyParts.torso.add(scene.add.rectangle(8, -21, 6, 5, 0xFF6666));
        // Angry brow
        this.bodyParts.torso.add(scene.add.rectangle(-7, -28, 12, 4, 0x4A5533));
        this.bodyParts.torso.add(scene.add.rectangle(7, -28, 12, 4, 0x4A5533));

        // HUGE battle axe (animated weapon)
        this.bodyParts.weapon = scene.add.container(-28, 2);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 6, 46, 0x8B5A33)); // handle
        this.bodyParts.weapon.add(scene.add.rectangle(1, 2, 4, 42, 0x9B6A43)); // highlight
        // Axe head (big and shiny)
        this.bodyParts.weapon.add(scene.add.rectangle(-10, -22, 18, 22, 0x777777));
        this.bodyParts.weapon.add(scene.add.rectangle(-8, -20, 14, 18, 0x999999)); // highlight
        this.bodyParts.weapon.add(scene.add.rectangle(-16, -22, 6, 18, 0x666666)); // edge
        this.bodyParts.weapon.add(scene.add.rectangle(-6, -24, 8, 6, 0xBBBBBB)); // shine
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createSkeleton(scene) {
        // CARTOONY SKELETON - spooky but silly! WITH ANIMATIONS
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 38, 18, 5, 0x000000, 0.2));

        // Animated bony legs
        this.bodyParts.leftLeg = scene.add.container(-4, 26);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 6, 20, 0xFFFFFF));
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 2, 4, 16, 0xEEEEEE));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 10, 8, 4, 0xEEEEEE)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(4, 26);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 6, 20, 0xFFFFFF));
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 2, 4, 16, 0xEEEEEE));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 10, 8, 4, 0xEEEEEE)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (torso)
        this.bodyParts.torso = scene.add.container(0, 0);

        // Ribcage (cartoony)
        const body = scene.add.rectangle(0, 8, 18, 22, 0xFFFFFF);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 16, 4, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 14, 4, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(0, 14, 12, 4, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 4, 24, 0xCCCCCC)); // spine

        // Animated bony arms
        this.bodyParts.leftArm = scene.add.container(-12, 6);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 6, 18, 0xFFFFFF));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 2, 4, 14, 0xEEEEEE));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(12, 6);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 6, 18, 0xFFFFFF));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // BIG cartoony skull
        const skull = scene.add.rectangle(0, -14, 24, 22, 0xFFFFFF);
        this.bodyParts.torso.add(skull);
        this.bodyParts.torso.add(scene.add.rectangle(0, -12, 20, 16, 0xF8F8F8));
        this.bodyParts.torso.add(scene.add.rectangle(-8, -14, 6, 18, 0xDDDDDD));

        // Big spooky eye sockets
        this.bodyParts.torso.add(scene.add.rectangle(-6, -16, 10, 10, 0x222222));
        this.bodyParts.torso.add(scene.add.rectangle(6, -16, 10, 10, 0x222222));
        // Glowing eyes
        this.bodyParts.torso.add(scene.add.rectangle(-5, -15, 6, 6, 0xFF3333));
        this.bodyParts.torso.add(scene.add.rectangle(7, -15, 6, 6, 0xFF3333));
        this.bodyParts.torso.add(scene.add.rectangle(-6, -17, 3, 3, 0xFF6666));

        // Nose hole
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 6, 6, 0x333333));

        // Toothy grin
        this.bodyParts.torso.add(scene.add.rectangle(0, -2, 14, 6, 0x222222));
        this.bodyParts.torso.add(scene.add.rectangle(-5, -2, 3, 4, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(0, -2, 3, 4, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(5, -2, 3, 4, 0xFFFFFF));

        // Rusty old sword (animated weapon)
        this.bodyParts.weapon = scene.add.container(-18, 0);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 5, 28, 0x998866));
        this.bodyParts.weapon.add(scene.add.rectangle(1, 2, 3, 24, 0xAA9977));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 14, 10, 4, 0x6B4423));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = skull;
    }

    createSkeletonArcher(scene) {
        // CARTOONY SKELETON ARCHER - hooded spooky sniper! WITH ANIMATIONS
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 34, 16, 5, 0x000000, 0.2));

        // Animated bony legs
        this.bodyParts.leftLeg = scene.add.container(-3, 22);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 5, 18, 0xEEEEEE));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 10, 7, 4, 0xDDDDDD)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(3, 22);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 5, 18, 0xEEEEEE));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 10, 7, 4, 0xDDDDDD)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (torso)
        this.bodyParts.torso = scene.add.container(0, 0);

        // Ribcage with tattered cloak
        const body = scene.add.rectangle(0, 6, 16, 18, 0xEEEEEE);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 14, 4, 0xDDDDDD));
        this.bodyParts.torso.add(scene.add.rectangle(0, 10, 12, 4, 0xDDDDDD));

        // Dark hood and cloak
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 20, 20, 0x333344));
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 18, 16, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 24, 18, 0x333344));
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 22, 14, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(0, -20, 18, 10, 0x555566));
        this.bodyParts.torso.add(scene.add.rectangle(0, -26, 12, 8, 0x555566));

        // Skull face in hood
        const skull = scene.add.rectangle(0, -10, 18, 16, 0xEEEEEE);
        this.bodyParts.torso.add(skull);
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 14, 12, 0xFFFFFF));

        // Spooky eye sockets
        this.bodyParts.torso.add(scene.add.rectangle(-5, -12, 8, 8, 0x111111));
        this.bodyParts.torso.add(scene.add.rectangle(5, -12, 8, 8, 0x111111));
        // Green ghostly eyes
        this.bodyParts.torso.add(scene.add.rectangle(-4, -11, 5, 5, 0x44FF44));
        this.bodyParts.torso.add(scene.add.rectangle(6, -11, 5, 5, 0x44FF44));
        this.bodyParts.torso.add(scene.add.rectangle(-5, -13, 3, 3, 0xAAFFAA));

        // Nose and teeth
        this.bodyParts.torso.add(scene.add.rectangle(0, -4, 4, 4, 0x222222));
        this.bodyParts.torso.add(scene.add.rectangle(-3, 0, 2, 3, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(3, 0, 2, 3, 0xFFFFFF));

        // Animated bow arm
        this.bodyParts.leftArm = scene.add.container(-14, 2);
        // Dark bow
        this.bodyParts.leftArm.add(scene.add.rectangle(-4, -16, 5, 10, 0x554433));
        this.bodyParts.leftArm.add(scene.add.rectangle(-6, -8, 5, 8, 0x665544));
        this.bodyParts.leftArm.add(scene.add.rectangle(-4, 0, 5, 10, 0x554433));
        this.bodyParts.leftArm.add(scene.add.rectangle(-6, 8, 5, 8, 0x665544));
        this.bodyParts.leftArm.add(scene.add.rectangle(-4, 16, 5, 10, 0x554433));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 2, 36, 0x888888)); // bowstring
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Ghostly arrow
        this.bodyParts.torso.add(scene.add.rectangle(-8, 2, 18, 3, 0x88AA88));
        this.bodyParts.torso.add(scene.add.rectangle(4, 2, 6, 4, 0x44FF44));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = skull;
    }

    createTroll(scene) {
        // CARTOONY TROLL - big dumb brute with warts! WITH ANIMATIONS
        const s = 1.3;

        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 46 * s, 36 * s, 8, 0x000000, 0.2));

        // Animated chunky legs
        this.bodyParts.leftLeg = scene.add.container(-10 * s, 34 * s);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 14 * s, 20 * s, 0x558866));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1 * s, 12 * s, 18 * s, 8 * s, 0x447755));
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(10 * s, 34 * s);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 14 * s, 20 * s, 0x558866));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1 * s, 12 * s, 18 * s, 8 * s, 0x447755));
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (torso)
        this.bodyParts.torso = scene.add.container(0, 0);

        // FAT body
        const body = scene.add.rectangle(0, 10 * s, 34 * s, 38 * s, 0x669977);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 12 * s, 30 * s, 32 * s, 0x77AA88));
        this.bodyParts.torso.add(scene.add.rectangle(-14 * s, 10 * s, 6 * s, 34 * s, 0x447755));

        // Big belly
        this.bodyParts.torso.add(scene.add.rectangle(0, 16 * s, 28 * s, 26 * s, 0x88BB99));
        this.bodyParts.torso.add(scene.add.rectangle(4 * s, 14 * s, 14 * s, 14 * s, 0x99CCAA, 0.5));

        // Animated huge arms
        this.bodyParts.leftArm = scene.add.container(-24 * s, 10 * s);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 14 * s, 30 * s, 0x669977));
        this.bodyParts.leftArm.add(scene.add.rectangle(2 * s, 2 * s, 8 * s, 24 * s, 0x77AA88));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 18 * s, 16 * s, 12 * s, 0x77AA88)); // fist
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(24 * s, 10 * s);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 14 * s, 30 * s, 0x669977));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 18 * s, 16 * s, 12 * s, 0x77AA88)); // fist
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Dumb-looking head
        const head = scene.add.rectangle(0, -18 * s, 30 * s, 26 * s, 0x669977);
        this.bodyParts.torso.add(head);
        this.bodyParts.torso.add(scene.add.rectangle(0, -16 * s, 26 * s, 20 * s, 0x77AA88));
        this.bodyParts.torso.add(scene.add.rectangle(-12 * s, -18 * s, 6 * s, 22 * s, 0x447755));

        // Warts!
        this.bodyParts.torso.add(scene.add.rectangle(-10 * s, -26 * s, 6 * s, 6 * s, 0x88BB99));
        this.bodyParts.torso.add(scene.add.rectangle(12 * s, -16 * s, 5 * s, 5 * s, 0x88BB99));
        this.bodyParts.torso.add(scene.add.rectangle(-14 * s, -10 * s, 4 * s, 4 * s, 0x88BB99));

        // Dopey eyes
        this.bodyParts.torso.add(scene.add.rectangle(-8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        this.bodyParts.torso.add(scene.add.rectangle(8 * s, -20 * s, 10 * s, 10 * s, 0xFFFF66));
        this.bodyParts.torso.add(scene.add.rectangle(-7 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(9 * s, -19 * s, 5 * s, 6 * s, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(-9 * s, -22 * s, 3 * s, 3 * s, 0xFFFFAA));
        // Confused brow
        this.bodyParts.torso.add(scene.add.rectangle(-8 * s, -28 * s, 12 * s, 4 * s, 0x447755));
        this.bodyParts.torso.add(scene.add.rectangle(8 * s, -28 * s, 12 * s, 4 * s, 0x447755));

        // Big bulbous nose
        this.bodyParts.torso.add(scene.add.rectangle(0, -10 * s, 14 * s, 12 * s, 0x558866));
        this.bodyParts.torso.add(scene.add.rectangle(0, -8 * s, 10 * s, 8 * s, 0x669977));
        this.bodyParts.torso.add(scene.add.rectangle(-3 * s, -6 * s, 4 * s, 4 * s, 0x336644));
        this.bodyParts.torso.add(scene.add.rectangle(3 * s, -6 * s, 4 * s, 4 * s, 0x336644));

        // Dumb open mouth
        this.bodyParts.torso.add(scene.add.rectangle(0, -2 * s, 16 * s, 8 * s, 0x336644));
        this.bodyParts.torso.add(scene.add.rectangle(-5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));
        this.bodyParts.torso.add(scene.add.rectangle(5 * s, -4 * s, 4 * s, 5 * s, 0xFFFFEE));

        // Big wooden club (animated weapon)
        this.bodyParts.weapon = scene.add.container(-30 * s, 24 * s);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 8 * s, 38 * s, 0x8B6633));
        this.bodyParts.weapon.add(scene.add.rectangle(1 * s, 2 * s, 4 * s, 34 * s, 0x9B7643));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 24 * s, 18 * s, 20 * s, 0x6B5533));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 22 * s, 14 * s, 14 * s, 0x7B6543));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createDarkKnight(scene) {
        // CARTOONY DARK KNIGHT - menacing evil warrior! WITH ANIMATIONS
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 40, 30, 6, 0x000000, 0.2));

        // Flowing evil cape (behind body)
        this.spriteContainer.add(scene.add.rectangle(0, 22, 34, 36, 0x660022));
        this.spriteContainer.add(scene.add.rectangle(0, 24, 30, 30, 0x880033));
        this.spriteContainer.add(scene.add.rectangle(-12, 28, 8, 24, 0x550011));

        // Animated armored legs
        this.bodyParts.leftLeg = scene.add.container(-6, 26);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 10, 18, 0x333344));
        this.bodyParts.leftLeg.add(scene.add.rectangle(1, 1, 6, 14, 0x444455));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 10, 12, 6, 0x222233)); // boot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(6, 26);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 10, 18, 0x333344));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 10, 12, 6, 0x222233)); // boot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (torso)
        this.bodyParts.torso = scene.add.container(0, 0);

        // Dark armor body
        const body = scene.add.rectangle(0, 6, 26, 28, 0x333344);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 22, 22, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(-10, 6, 5, 24, 0x222233));

        // Evil emblem on chest
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 12, 12, 0xAA0022));
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 8, 8, 0xCC0033));
        this.bodyParts.torso.add(scene.add.rectangle(0, 4, 4, 4, 0xFF0044));

        // Animated sword arm
        this.bodyParts.leftArm = scene.add.container(-16, 6);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 8, 18, 0x333344));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        // Animated shield arm
        this.bodyParts.rightArm = scene.add.container(16, 6);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 8, 18, 0x333344));
        this.bodyParts.rightArm.add(scene.add.rectangle(2, 0, 18, 28, 0x333344)); // shield
        this.bodyParts.rightArm.add(scene.add.rectangle(2, 0, 14, 24, 0x444455));
        this.bodyParts.rightArm.add(scene.add.rectangle(2, -2, 10, 10, 0xAA0022)); // emblem
        this.bodyParts.rightArm.add(scene.add.rectangle(2, -2, 6, 6, 0xFF0044));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // EVIL helmet
        const helmet = scene.add.rectangle(0, -18, 24, 22, 0x333344);
        this.bodyParts.torso.add(helmet);
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 20, 18, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(-8, -18, 6, 18, 0x222233));

        // Menacing visor with red eyes
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 18, 8, 0x111122));
        this.bodyParts.torso.add(scene.add.rectangle(-5, -16, 8, 5, 0xFF2222));
        this.bodyParts.torso.add(scene.add.rectangle(5, -16, 8, 5, 0xFF2222));
        this.bodyParts.torso.add(scene.add.rectangle(-5, -17, 4, 3, 0xFF6666));
        this.bodyParts.torso.add(scene.add.rectangle(5, -17, 4, 3, 0xFF6666));

        // Evil horns
        this.bodyParts.torso.add(scene.add.rectangle(-12, -28, 6, 12, 0x333344));
        this.bodyParts.torso.add(scene.add.rectangle(-12, -36, 5, 10, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(-12, -42, 4, 8, 0x555566));
        this.bodyParts.torso.add(scene.add.rectangle(12, -28, 6, 12, 0x333344));
        this.bodyParts.torso.add(scene.add.rectangle(12, -36, 5, 10, 0x444455));
        this.bodyParts.torso.add(scene.add.rectangle(12, -42, 4, 8, 0x555566));

        // DARK glowing sword (animated weapon)
        this.bodyParts.weapon = scene.add.container(-22, -4);
        this.bodyParts.weapon.add(scene.add.rectangle(0, 0, 6, 36, 0x444466));
        this.bodyParts.weapon.add(scene.add.rectangle(1, 2, 4, 32, 0x555588));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -16, 8, 4, 0xFF0044));
        this.bodyParts.weapon.add(scene.add.rectangle(0, 20, 16, 6, 0x333344)); // hilt
        this.bodyParts.weapon.add(scene.add.rectangle(0, 20, 6, 8, 0xAA0022));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createDemon(scene) {
        // CARTOONY DEMON - scary but cool hellspawn! WITH ANIMATIONS
        const s = 1.2;

        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 42 * s, 40 * s, 8, 0x000000, 0.2));

        // Big bat wings (behind body)
        this.spriteContainer.add(scene.add.rectangle(-32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        this.spriteContainer.add(scene.add.rectangle(-42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        this.spriteContainer.add(scene.add.rectangle(-50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        this.spriteContainer.add(scene.add.rectangle(-30 * s, 4 * s, 10 * s, 18 * s, 0x882233));
        this.spriteContainer.add(scene.add.rectangle(32 * s, -8 * s, 14 * s, 28 * s, 0xAA2244));
        this.spriteContainer.add(scene.add.rectangle(42 * s, -16 * s, 12 * s, 22 * s, 0xBB3355));
        this.spriteContainer.add(scene.add.rectangle(50 * s, -24 * s, 10 * s, 18 * s, 0xCC4466));
        this.spriteContainer.add(scene.add.rectangle(30 * s, 4 * s, 10 * s, 18 * s, 0x882233));

        // Spiky tail
        this.spriteContainer.add(scene.add.rectangle(14 * s, 28 * s, 18 * s, 8 * s, 0xBB3344));
        this.spriteContainer.add(scene.add.rectangle(26 * s, 26 * s, 14 * s, 7 * s, 0xCC4455));
        this.spriteContainer.add(scene.add.rectangle(36 * s, 24 * s, 12 * s, 8 * s, 0x661122));

        // Animated muscular legs
        this.bodyParts.leftLeg = scene.add.container(-8 * s, 30 * s);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 12 * s, 18 * s, 0xBB3344));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1 * s, 10 * s, 14 * s, 6 * s, 0x441122)); // hoof
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(8 * s, 30 * s);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 12 * s, 18 * s, 0xBB3344));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1 * s, 10 * s, 14 * s, 6 * s, 0x441122)); // hoof
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container (torso)
        this.bodyParts.torso = scene.add.container(0, 0);

        // Muscular body
        const body = scene.add.rectangle(0, 6 * s, 30 * s, 34 * s, 0xCC3344);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8 * s, 26 * s, 28 * s, 0xDD4455));
        this.bodyParts.torso.add(scene.add.rectangle(-12 * s, 6 * s, 6 * s, 30 * s, 0xAA2233));

        // Abs and chest
        this.bodyParts.torso.add(scene.add.rectangle(-5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        this.bodyParts.torso.add(scene.add.rectangle(5 * s, 4 * s, 10 * s, 10 * s, 0xEE5566));
        this.bodyParts.torso.add(scene.add.rectangle(0, 16 * s, 8 * s, 6 * s, 0xDD4455));

        // Animated muscular arms with claws
        this.bodyParts.leftArm = scene.add.container(-20 * s, 6 * s);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 12 * s, 24 * s, 0xCC3344));
        this.bodyParts.leftArm.add(scene.add.rectangle(-2 * s, 16 * s, 10 * s, 8 * s, 0xDD4455));
        this.bodyParts.leftArm.add(scene.add.rectangle(-6 * s, 22 * s, 5 * s, 8 * s, 0x441122));
        this.bodyParts.leftArm.add(scene.add.rectangle(2 * s, 22 * s, 5 * s, 8 * s, 0x441122));
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(20 * s, 6 * s);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 12 * s, 24 * s, 0xCC3344));
        this.bodyParts.rightArm.add(scene.add.rectangle(2 * s, 16 * s, 10 * s, 8 * s, 0xDD4455));
        this.bodyParts.rightArm.add(scene.add.rectangle(6 * s, 22 * s, 5 * s, 8 * s, 0x441122));
        this.bodyParts.rightArm.add(scene.add.rectangle(-2 * s, 22 * s, 5 * s, 8 * s, 0x441122));
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Scary head
        const head = scene.add.rectangle(0, -18 * s, 28 * s, 26 * s, 0xCC3344);
        this.bodyParts.torso.add(head);
        this.bodyParts.torso.add(scene.add.rectangle(0, -16 * s, 24 * s, 20 * s, 0xDD4455));
        this.bodyParts.torso.add(scene.add.rectangle(-10 * s, -18 * s, 6 * s, 22 * s, 0xAA2233));

        // BIG curvy horns
        this.bodyParts.torso.add(scene.add.rectangle(-12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        this.bodyParts.torso.add(scene.add.rectangle(-14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        this.bodyParts.torso.add(scene.add.rectangle(-16 * s, -50 * s, 6 * s, 10 * s, 0x663344));
        this.bodyParts.torso.add(scene.add.rectangle(12 * s, -32 * s, 8 * s, 14 * s, 0x441122));
        this.bodyParts.torso.add(scene.add.rectangle(14 * s, -42 * s, 7 * s, 12 * s, 0x552233));
        this.bodyParts.torso.add(scene.add.rectangle(16 * s, -50 * s, 6 * s, 10 * s, 0x663344));

        // Glowing evil eyes
        this.bodyParts.torso.add(scene.add.rectangle(-7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        this.bodyParts.torso.add(scene.add.rectangle(7 * s, -20 * s, 10 * s, 10 * s, 0xFFFF44));
        this.bodyParts.torso.add(scene.add.rectangle(-6 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(8 * s, -19 * s, 5 * s, 7 * s, 0x000000));
        this.bodyParts.torso.add(scene.add.rectangle(-8 * s, -22 * s, 3 * s, 3 * s, 0xFFFFAA));

        // Evil grin with fangs
        this.bodyParts.torso.add(scene.add.rectangle(0, -8 * s, 16 * s, 8 * s, 0x661122));
        this.bodyParts.torso.add(scene.add.rectangle(-6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));
        this.bodyParts.torso.add(scene.add.rectangle(6 * s, -6 * s, 4 * s, 8 * s, 0xFFFFFF));

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    createDragon(scene) {
        // CARTOONY DRAGON BOSS - epic fire-breathing beast!
        const s = 1.6;

        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 56 * s, 60 * s, 10, 0x000000, 0.2));

        // EPIC Wings
        // Left wing bones
        this.spriteContainer.add(scene.add.rectangle(-44 * s, -12 * s, 16 * s, 40 * s, 0xFF6633));
        this.spriteContainer.add(scene.add.rectangle(-56 * s, -22 * s, 14 * s, 32 * s, 0xFF7744));
        this.spriteContainer.add(scene.add.rectangle(-66 * s, -32 * s, 12 * s, 26 * s, 0xFF8855));
        // Wing membrane
        this.spriteContainer.add(scene.add.rectangle(-50 * s, -16 * s, 10 * s, 30 * s, 0xFF8844, 0.6));
        this.spriteContainer.add(scene.add.rectangle(-60 * s, -26 * s, 8 * s, 22 * s, 0xFF9955, 0.6));
        // Right wing
        this.spriteContainer.add(scene.add.rectangle(44 * s, -12 * s, 16 * s, 40 * s, 0xFF6633));
        this.spriteContainer.add(scene.add.rectangle(56 * s, -22 * s, 14 * s, 32 * s, 0xFF7744));
        this.spriteContainer.add(scene.add.rectangle(66 * s, -32 * s, 12 * s, 26 * s, 0xFF8855));
        this.spriteContainer.add(scene.add.rectangle(50 * s, -16 * s, 10 * s, 30 * s, 0xFF8844, 0.6));
        this.spriteContainer.add(scene.add.rectangle(60 * s, -26 * s, 8 * s, 22 * s, 0xFF9955, 0.6));

        // Long tail
        this.spriteContainer.add(scene.add.rectangle(0, 42 * s, 16 * s, 22 * s, 0xFF5522));
        this.spriteContainer.add(scene.add.rectangle(0, 58 * s, 14 * s, 18 * s, 0xFF6633));
        this.spriteContainer.add(scene.add.rectangle(0, 72 * s, 12 * s, 14 * s, 0xFF7744));
        this.spriteContainer.add(scene.add.rectangle(0, 84 * s, 10 * s, 12 * s, 0xFF8855));
        // Tail spike
        this.spriteContainer.add(scene.add.rectangle(0, 94 * s, 14 * s, 10 * s, 0xCC4411));
        this.spriteContainer.add(scene.add.rectangle(0, 102 * s, 10 * s, 8 * s, 0xAA3300));

        // Big legs
        this.spriteContainer.add(scene.add.rectangle(-14 * s, 38 * s, 14 * s, 22 * s, 0xFF5522));
        this.spriteContainer.add(scene.add.rectangle(14 * s, 38 * s, 14 * s, 22 * s, 0xFF5522));
        // Huge claws
        this.spriteContainer.add(scene.add.rectangle(-20 * s, 52 * s, 6 * s, 10 * s, 0x664422));
        this.spriteContainer.add(scene.add.rectangle(-14 * s, 52 * s, 6 * s, 10 * s, 0x775533));
        this.spriteContainer.add(scene.add.rectangle(-8 * s, 52 * s, 6 * s, 10 * s, 0x664422));
        this.spriteContainer.add(scene.add.rectangle(20 * s, 52 * s, 6 * s, 10 * s, 0x664422));
        this.spriteContainer.add(scene.add.rectangle(14 * s, 52 * s, 6 * s, 10 * s, 0x775533));
        this.spriteContainer.add(scene.add.rectangle(8 * s, 52 * s, 6 * s, 10 * s, 0x664422));

        // MASSIVE body
        const body = scene.add.rectangle(0, 12 * s, 44 * s, 38 * s, 0xFF5522);
        this.spriteContainer.add(body);
        this.spriteContainer.add(scene.add.rectangle(0, 14 * s, 38 * s, 32 * s, 0xFF6633)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-18 * s, 12 * s, 8 * s, 34 * s, 0xDD4411)); // shade

        // Golden belly scales
        this.spriteContainer.add(scene.add.rectangle(0, 18 * s, 30 * s, 26 * s, 0xFFAA33));
        this.spriteContainer.add(scene.add.rectangle(0, 14 * s, 26 * s, 8 * s, 0xFFBB44)); // scale row
        this.spriteContainer.add(scene.add.rectangle(0, 24 * s, 26 * s, 8 * s, 0xFFBB44)); // scale row

        // Long neck
        this.spriteContainer.add(scene.add.rectangle(0, -16 * s, 20 * s, 32 * s, 0xFF5522));
        this.spriteContainer.add(scene.add.rectangle(0, -14 * s, 16 * s, 28 * s, 0xFF6633)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-7 * s, -16 * s, 6 * s, 28 * s, 0xDD4411)); // shade

        // Back spikes (epic!)
        for (let i = 0; i < 5; i++) {
            const y = (-32 + i * 14) * s;
            this.spriteContainer.add(scene.add.rectangle(0, y, 10 * s, 8 * s, 0xDD4411));
            this.spriteContainer.add(scene.add.rectangle(0, y - 5 * s, 8 * s, 6 * s, 0xEE5522));
            this.spriteContainer.add(scene.add.rectangle(0, y - 9 * s, 6 * s, 4 * s, 0xFF6633)); // tip
        }

        // BIG dragon head
        const head = scene.add.rectangle(0, -42 * s, 32 * s, 26 * s, 0xFF5522);
        this.spriteContainer.add(head);
        this.spriteContainer.add(scene.add.rectangle(0, -40 * s, 28 * s, 20 * s, 0xFF6633)); // highlight
        this.spriteContainer.add(scene.add.rectangle(-12 * s, -42 * s, 8 * s, 22 * s, 0xDD4411)); // shade

        // Long snout
        this.spriteContainer.add(scene.add.rectangle(0, -52 * s, 20 * s, 14 * s, 0xDD4411));
        this.spriteContainer.add(scene.add.rectangle(0, -54 * s, 16 * s, 8 * s, 0xEE5522)); // highlight

        // Nostrils (with smoke!)
        this.spriteContainer.add(scene.add.rectangle(-5 * s, -56 * s, 5 * s, 4 * s, 0x333333));
        this.spriteContainer.add(scene.add.rectangle(5 * s, -56 * s, 5 * s, 4 * s, 0x333333));

        // Majestic horns
        this.spriteContainer.add(scene.add.rectangle(-14 * s, -54 * s, 8 * s, 14 * s, 0x775533));
        this.spriteContainer.add(scene.add.rectangle(-14 * s, -64 * s, 7 * s, 12 * s, 0x886644));
        this.spriteContainer.add(scene.add.rectangle(-14 * s, -72 * s, 6 * s, 10 * s, 0x997755));
        this.spriteContainer.add(scene.add.rectangle(14 * s, -54 * s, 8 * s, 14 * s, 0x775533));
        this.spriteContainer.add(scene.add.rectangle(14 * s, -64 * s, 7 * s, 12 * s, 0x886644));
        this.spriteContainer.add(scene.add.rectangle(14 * s, -72 * s, 6 * s, 10 * s, 0x997755));

        // Fierce glowing eyes
        this.spriteContainer.add(scene.add.rectangle(-9 * s, -44 * s, 12 * s, 10 * s, 0xFFFF44)); // left eye
        this.spriteContainer.add(scene.add.rectangle(9 * s, -44 * s, 12 * s, 10 * s, 0xFFFF44)); // right eye
        this.spriteContainer.add(scene.add.rectangle(-8 * s, -43 * s, 6 * s, 8 * s, 0x000000)); // left pupil
        this.spriteContainer.add(scene.add.rectangle(10 * s, -43 * s, 6 * s, 8 * s, 0x000000)); // right pupil
        this.spriteContainer.add(scene.add.rectangle(-10 * s, -46 * s, 4 * s, 4 * s, 0xFFFFAA)); // shine

        // GOLDEN Crown for the boss!
        this.spriteContainer.add(scene.add.rectangle(0, -62 * s, 24 * s, 8 * s, 0xFFDD00));
        this.spriteContainer.add(scene.add.rectangle(-10 * s, -70 * s, 6 * s, 12 * s, 0xFFEE22));
        this.spriteContainer.add(scene.add.rectangle(0, -74 * s, 6 * s, 16 * s, 0xFFEE22));
        this.spriteContainer.add(scene.add.rectangle(10 * s, -70 * s, 6 * s, 12 * s, 0xFFEE22));
        // Crown gems
        this.spriteContainer.add(scene.add.rectangle(0, -68 * s, 5 * s, 5 * s, 0xFF2222)); // ruby
        this.spriteContainer.add(scene.add.rectangle(-10 * s, -66 * s, 4 * s, 4 * s, 0x22FF22)); // emerald
        this.spriteContainer.add(scene.add.rectangle(10 * s, -66 * s, 4 * s, 4 * s, 0x44AAFF)); // sapphire

        // Fire breath glow effect
        const fireGlow = scene.add.rectangle(0, -60 * s, 18 * s, 14 * s, 0xFF6600, 0.4);
        this.spriteContainer.add(fireGlow);

        scene.tweens.add({
            targets: fireGlow,
            alpha: 0.7,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            yoyo: true,
            repeat: -1
        });

        this.mainSprite = body;
    }

    createSpearMonster(scene) {
        // CARTOONY SPEAR MONSTER - tribal brute that throws big spears!
        // Shadow
        this.spriteContainer.add(scene.add.rectangle(0, 38, 28, 6, 0x000000, 0.2));

        // Animated legs
        this.bodyParts.leftLeg = scene.add.container(-7, 26);
        this.bodyParts.leftLeg.add(scene.add.rectangle(0, 0, 10, 16, 0x8B6B4A));
        this.bodyParts.leftLeg.add(scene.add.rectangle(-1, 8, 12, 6, 0x7A5A3A)); // foot
        this.spriteContainer.add(this.bodyParts.leftLeg);

        this.bodyParts.rightLeg = scene.add.container(7, 26);
        this.bodyParts.rightLeg.add(scene.add.rectangle(0, 0, 10, 16, 0x8B6B4A));
        this.bodyParts.rightLeg.add(scene.add.rectangle(1, 8, 12, 6, 0x7A5A3A)); // foot
        this.spriteContainer.add(this.bodyParts.rightLeg);

        // Body container
        this.bodyParts.torso = scene.add.container(0, 0);

        // Muscular brown body
        const body = scene.add.rectangle(0, 6, 26, 28, 0x9B7B5A);
        this.bodyParts.torso.add(body);
        this.bodyParts.torso.add(scene.add.rectangle(0, 8, 22, 22, 0xAB8B6A)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-10, 6, 5, 24, 0x7A5A3A)); // shade

        // Tribal markings on chest
        this.bodyParts.torso.add(scene.add.rectangle(0, 2, 4, 18, 0xFF4444)); // red stripe
        this.bodyParts.torso.add(scene.add.rectangle(-6, 6, 3, 8, 0xFF4444)); // left mark
        this.bodyParts.torso.add(scene.add.rectangle(6, 6, 3, 8, 0xFF4444)); // right mark

        // Animated arms
        this.bodyParts.leftArm = scene.add.container(-16, 4);
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 0, 10, 20, 0x9B7B5A));
        this.bodyParts.leftArm.add(scene.add.rectangle(0, 12, 12, 8, 0xAB8B6A)); // fist
        this.bodyParts.torso.add(this.bodyParts.leftArm);

        this.bodyParts.rightArm = scene.add.container(16, 4);
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 0, 10, 20, 0x9B7B5A));
        this.bodyParts.rightArm.add(scene.add.rectangle(0, 12, 12, 8, 0xAB8B6A)); // fist
        this.bodyParts.torso.add(this.bodyParts.rightArm);

        // Fierce head
        this.bodyParts.torso.add(scene.add.rectangle(0, -16, 24, 22, 0x9B7B5A));
        this.bodyParts.torso.add(scene.add.rectangle(0, -14, 20, 16, 0xAB8B6A)); // highlight
        this.bodyParts.torso.add(scene.add.rectangle(-8, -16, 5, 18, 0x7A5A3A)); // shade

        // War paint on face
        this.bodyParts.torso.add(scene.add.rectangle(-8, -14, 6, 3, 0xFF4444)); // left war paint
        this.bodyParts.torso.add(scene.add.rectangle(8, -14, 6, 3, 0xFF4444)); // right war paint
        this.bodyParts.torso.add(scene.add.rectangle(0, -8, 8, 3, 0xFF4444)); // chin paint

        // Angry eyes
        this.bodyParts.torso.add(scene.add.rectangle(-6, -18, 8, 8, 0xFFFFFF)); // left eye
        this.bodyParts.torso.add(scene.add.rectangle(6, -18, 8, 8, 0xFFFFFF)); // right eye
        this.bodyParts.torso.add(scene.add.rectangle(-5, -17, 4, 5, 0x000000)); // left pupil
        this.bodyParts.torso.add(scene.add.rectangle(7, -17, 4, 5, 0x000000)); // right pupil
        // Angry brow
        this.bodyParts.torso.add(scene.add.rectangle(-6, -24, 10, 4, 0x5A4A3A));
        this.bodyParts.torso.add(scene.add.rectangle(6, -24, 10, 4, 0x5A4A3A));

        // Feather headdress
        this.bodyParts.torso.add(scene.add.rectangle(-6, -30, 4, 12, 0xFF6644));
        this.bodyParts.torso.add(scene.add.rectangle(-6, -38, 3, 10, 0xFF8866));
        this.bodyParts.torso.add(scene.add.rectangle(0, -32, 4, 14, 0xFFAA44));
        this.bodyParts.torso.add(scene.add.rectangle(0, -42, 3, 12, 0xFFCC66));
        this.bodyParts.torso.add(scene.add.rectangle(6, -30, 4, 12, 0xFF6644));
        this.bodyParts.torso.add(scene.add.rectangle(6, -38, 3, 10, 0xFF8866));

        // BIG SPEAR (the main weapon!)
        this.bodyParts.weapon = scene.add.container(-24, -8);
        // Long wooden shaft
        this.bodyParts.weapon.add(scene.add.rectangle(0, 16, 6, 56, 0x8B5A33));
        this.bodyParts.weapon.add(scene.add.rectangle(1, 18, 4, 52, 0x9B6A43)); // highlight
        // Big stone spearhead
        this.bodyParts.weapon.add(scene.add.rectangle(0, -18, 12, 24, 0x666666));
        this.bodyParts.weapon.add(scene.add.rectangle(0, -16, 8, 20, 0x888888)); // highlight
        this.bodyParts.weapon.add(scene.add.rectangle(0, -26, 6, 12, 0x999999)); // tip
        this.bodyParts.weapon.add(scene.add.rectangle(0, -30, 4, 6, 0xAAAAAA)); // sharp point
        // Feather decoration on spear
        this.bodyParts.weapon.add(scene.add.rectangle(-4, -4, 6, 8, 0xFF4444));
        this.bodyParts.weapon.add(scene.add.rectangle(4, -4, 6, 8, 0xFFAA44));
        this.bodyParts.torso.add(this.bodyParts.weapon);

        this.spriteContainer.add(this.bodyParts.torso);
        this.mainSprite = body;
    }

    update(time, delta) {
        if (this.isDead) return;

        // Check spawn grace period - enemies can move but not attack during grace
        if (this.isSpawning) {
            const elapsed = Date.now() - this.spawnTime;
            if (elapsed >= this.spawnGracePeriod) {
                this.isSpawning = false;
            }
        }

        let isMoving = false;

        // Check if castle has fence - fence blocks enemies
        const castle = this.scene.playerCastle;
        const hasFence = castle && castle.hasFence && castle.fenceCurrentHealth > 0;
        const fenceX = castle ? castle.x + 120 : 300; // Fence position

        // Find target - prioritize player units, then fence/castle
        if (!this.target || this.target.isDead || !this.target.active) {
            this.target = this.scene.combatSystem.findTarget(this, this.scene.units.getChildren());

            // If no units, target the fence (if exists) or castle
            if (!this.target && castle && !castle.isDead) {
                this.target = castle;
            }
        }

        if (this.target) {
            // If targeting castle and fence exists, stop at fence
            let targetX = this.target.x;
            let targetY = this.target.y;

            if (this.target === castle && hasFence) {
                // Target the fence position instead
                targetX = fenceX;
            }

            // Check if in range (use fence position if fence exists)
            const distanceToTarget = Phaser.Math.Distance.Between(this.x, this.y, targetX, targetY);
            const inRange = distanceToTarget <= this.range;

            if (inRange && !this.isSpawning) {
                // Stop and attack (but not during spawn grace period)
                this.attack(time);
            } else if (!inRange) {
                // Move toward target (fence or actual target)
                this.moveTowardPosition(targetX, targetY, delta);
                isMoving = true;
            }
        } else {
            // No target, move toward fence/castle
            const stopX = hasFence ? fenceX : CASTLE_CONFIG.playerX + 100;
            if (this.x > stopX + this.range) {
                this.x -= this.speed * (delta / 1000);
                isMoving = true;
            }
        }

        // Separate from other enemies to avoid stacking
        this.separateFromEnemies(delta);

        // Update walking animation
        this.updateAnimation(delta, isMoving);

        // Update depth based on y
        this.setDepth(this.y);
    }

    separateFromEnemies(delta) {
        const enemies = this.scene.enemies.getChildren();
        const separationRadius = 45; // How close before pushing away
        const separationForce = 100; // How strong the push is

        let pushX = 0;
        let pushY = 0;

        for (const enemy of enemies) {
            if (enemy === this || enemy.isDead) continue;

            const dx = this.x - enemy.x;
            const dy = this.y - enemy.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Scale separation radius based on enemy size
            const effectiveRadius = separationRadius * Math.max(this.currentScale || 1, enemy.currentScale || 1);

            if (distance < effectiveRadius && distance > 0) {
                // Push away - stronger when closer
                const force = (effectiveRadius - distance) / effectiveRadius;
                pushX += (dx / distance) * force * force;
                pushY += (dy / distance) * force * force;
            }
        }

        // Apply separation movement
        if (pushX !== 0 || pushY !== 0) {
            const moveAmount = separationForce * (delta / 1000);
            this.x += pushX * moveAmount;
            this.y = Phaser.Math.Clamp(this.y + pushY * moveAmount, 120, 550);
        }
    }

    moveToward(target, delta) {
        this.moveTowardPosition(target.x, target.y, delta);
    }

    moveTowardPosition(targetX, targetY, delta) {
        const dx = targetX - this.x;
        const dy = targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > 0) {
            // Move freely in all directions toward target
            const moveX = (dx / distance) * this.speed * (delta / 1000);
            const moveY = (dy / distance) * this.speed * (delta / 1000);

            this.x += moveX;
            this.y = Phaser.Math.Clamp(this.y + moveY, 120, 550);

            // Face direction of movement
            if (dx > 0 && this.direction !== 1) {
                this.direction = 1;
                this.spriteContainer.setScale(-1, 1);
            } else if (dx < 0 && this.direction !== -1) {
                this.direction = -1;
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

        // Attack animation - body lunge
        this.scene.tweens.add({
            targets: this.spriteContainer,
            scaleX: this.direction === 1 ? -1.1 : 1.1,
            scaleY: 1.05,
            duration: 80,
            yoyo: true,
            ease: 'Power2',
            onComplete: () => {
                this.isAttacking = false;
            }
        });

        if (this.isRanged) {
            // Create projectile based on enemy type
            let projectileType = 'arrow';
            if (this.isBoss) {
                projectileType = 'fireball';
            } else if (this.enemyType.toUpperCase() === 'SPEAR_MONSTER') {
                projectileType = 'spear';
            }
            const projectile = new Projectile(
                this.scene,
                this.x,
                this.y,
                this.target,
                {
                    damage: this.damage,
                    speed: 350,
                    color: this.color,
                    isPlayerProjectile: false,
                    projectileType: projectileType
                }
            );
            this.scene.projectiles.add(projectile);
        } else {
            // Melee attack
            if (this.target.takeDamage) {
                this.scene.combatSystem.dealDamage(this, this.target, this.damage);
            }
        }
    }

    takeDamage(amount) {
        if (this.isDead) return;

        // Invulnerable during spawn grace period
        if (this.isSpawning) return;

        this.currentHealth -= amount;
        this.healthBar.setPercent(this.currentHealth / this.maxHealth);

        // Damage flash
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

        // Play monster death sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playMonsterDeath();
        }

        // Calculate rewards - bosses get multiplied by wave number
        let goldReward = this.goldReward;
        let woodReward = this.woodReward;
        if (this.isBoss && this.scene.currentWave) {
            goldReward = this.goldReward * this.scene.currentWave;
            woodReward = this.woodReward * this.scene.currentWave;
        }

        // Give gold/wood rewards based on enemy type
        if (this.scene.gold !== undefined && goldReward > 0) {
            this.scene.gold += goldReward;
            this.scene.goldCollectedThisRun += goldReward;
            if (this.scene.resourceDisplay) {
                this.scene.resourceDisplay.addGold(goldReward);
            }
        }
        if (this.scene.wood !== undefined && woodReward > 0) {
            this.scene.wood += woodReward;
            this.scene.woodCollectedThisRun += woodReward;
            if (this.scene.resourceDisplay) {
                this.scene.resourceDisplay.addWood(woodReward);
            }
        }

        // Purple blood explosion effect
        this.createBloodExplosion();

        // Death animation
        this.scene.tweens.add({
            targets: this,
            alpha: 0,
            scaleX: 0.3,
            scaleY: 0.3,
            angle: Phaser.Math.Between(-60, 60),
            duration: 500,
            onComplete: () => {
                this.destroy();
            }
        });

        // Notify scene
        if (this.scene.onEnemyKilled) {
            this.scene.onEnemyKilled(this);
        }
    }

    createBloodExplosion() {
        const x = this.x;
        const y = this.y;
        const scale = this.isBoss ? 1.5 : 1;

        // Purple blood colors
        const bloodColors = [0x8B008B, 0x9400D3, 0x800080, 0x6A0DAD, 0x4B0082];

        // Blood splatter particles spraying upward
        for (let i = 0; i < 12; i++) {
            const color = Phaser.Utils.Array.GetRandom(bloodColors);
            const size = Phaser.Math.Between(3, 8) * scale;
            const particle = this.scene.add.circle(x, y, size, color);
            particle.setDepth(5);

            // Random spray direction (mostly upward)
            const angle = Phaser.Math.Between(-150, -30); // Upward arc
            const speed = Phaser.Math.Between(80, 180) * scale;
            const vx = Math.cos(Phaser.Math.DegToRad(angle)) * speed;
            const vy = Math.sin(Phaser.Math.DegToRad(angle)) * speed;

            this.scene.tweens.add({
                targets: particle,
                x: x + vx * 0.4,
                y: y + vy * 0.4 + 40, // Gravity pulls down
                alpha: 0,
                scale: 0.3,
                duration: Phaser.Math.Between(300, 500),
                ease: 'Quad.easeOut',
                onComplete: () => particle.destroy()
            });
        }

        // Blood spot on ground
        const spotSize = Phaser.Math.Between(20, 35) * scale;
        const spotColor = Phaser.Utils.Array.GetRandom(bloodColors);
        const bloodSpot = this.scene.add.ellipse(x, y + 15, spotSize, spotSize * 0.4, spotColor, 0.7);
        bloodSpot.setDepth(1); // Below units/enemies

        // Fade out after 5 seconds
        this.scene.tweens.add({
            targets: bloodSpot,
            alpha: 0,
            duration: 1500,
            delay: 3500, // Wait 3.5s then fade over 1.5s = 5s total
            onComplete: () => bloodSpot.destroy()
        });
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
            this.walkTime += delta * 0.01; // Animation speed
            const bodyBob = Math.abs(Math.sin(this.walkTime * 2)) * 3; // Body bounce

            // Animate legs (opposite directions) from their base position
            this.bodyParts.leftLeg.y = this.bodyParts.leftLegBaseY + Math.sin(this.walkTime) * 5;
            this.bodyParts.rightLeg.y = this.bodyParts.rightLegBaseY + Math.sin(this.walkTime + Math.PI) * 5;

            // Body bob
            if (this.bodyParts.torso) {
                this.bodyParts.torso.y = -bodyBob;
            }

            // Arm swing while walking
            if (this.bodyParts.leftArm && !this.isAttacking) {
                this.bodyParts.leftArm.rotation = Math.sin(this.walkTime) * 0.25;
            }
            if (this.bodyParts.rightArm && !this.isAttacking) {
                this.bodyParts.rightArm.rotation = Math.sin(this.walkTime + Math.PI) * 0.25;
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
                rotation: 0.8,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
        // Arm swing for attack
        if (this.bodyParts.leftArm) {
            this.scene.tweens.add({
                targets: this.bodyParts.leftArm,
                rotation: 0.5,
                duration: 100,
                yoyo: true,
                ease: 'Power2'
            });
        }
    }
}
