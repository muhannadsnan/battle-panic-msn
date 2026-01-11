// Combat System - Handles combat logic, targeting, and damage
class CombatSystem {
    constructor(scene) {
        this.scene = scene;
    }

    findTarget(attacker, potentialTargets) {
        if (!potentialTargets || potentialTargets.length === 0) return null;

        let closestTarget = null;
        let closestDistance = Infinity;

        potentialTargets.forEach(target => {
            if (!target.active || target.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                attacker.x, attacker.y,
                target.x, target.y
            );

            if (distance < closestDistance) {
                closestDistance = distance;
                closestTarget = target;
            }
        });

        return closestTarget;
    }

    isInRange(attacker, target, range) {
        if (!target || !target.active) return false;

        const distance = Phaser.Math.Distance.Between(
            attacker.x, attacker.y,
            target.x, target.y
        );

        return distance <= range;
    }

    dealDamage(attacker, target, damage) {
        if (!target || target.isDead) return false;

        let finalDamage = damage;

        // Horseman armor: takes reduced damage from all attackers
        if (target.unitType === 'HORSEMAN') {
            if (attacker.isRanged) {
                // 20% reduction from ranged (helmet + speed)
                const reduction = UNIT_TYPES.HORSEMAN.rangedDamageReduction || 0;
                finalDamage = Math.floor(damage * (1 - reduction));
            } else {
                // 40% reduction from melee (armor + shield)
                const reduction = UNIT_TYPES.HORSEMAN.infantryDamageReduction || 0;
                finalDamage = Math.floor(damage * (1 - reduction));
            }
        }
        // Knight armor: gold tier peasants (lvl 4+) get 25% damage reduction
        else if (target.unitType === 'PEASANT' && target.promotionLevel >= 4) {
            const reduction = UNIT_TYPES.PEASANT.knightArmor || 0;
            finalDamage = Math.floor(damage * (1 - reduction));
        }

        target.takeDamage(finalDamage);

        // Play hit sound based on attacker type
        if (typeof audioManager !== 'undefined') {
            if (attacker.isRanged) {
                audioManager.playArrow();
            } else if (attacker.enemyType === 'ORC' || attacker.enemyType === 'TROLL') {
                // Heavy hit for orcs and trolls
                audioManager.playOrcHit();
            } else {
                audioManager.playSwordHit();
            }
        }

        return true;
    }

    dealSplashDamage(attacker, centerX, centerY, damage, radius, targets) {
        if (!targets || targets.length === 0) return;

        // Play magic/explosion sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playMagic();
        }

        targets.forEach(target => {
            if (!target.active || target.isDead) return;

            const distance = Phaser.Math.Distance.Between(
                centerX, centerY,
                target.x, target.y
            );

            if (distance <= radius) {
                // Damage falls off with distance
                const falloff = 1 - (distance / radius) * 0.5;
                const finalDamage = Math.floor(damage * falloff);
                target.takeDamage(finalDamage);
            }
        });
    }

    showDamageNumber(x, y, damage) {
        const damageText = this.scene.add.text(x, y, `-${damage}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: damageText,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                damageText.destroy();
            }
        });
    }

    showHealNumber(x, y, amount) {
        const healText = this.scene.add.text(x, y, `+${amount}`, {
            fontSize: '16px',
            fontFamily: 'Arial',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        this.scene.tweens.add({
            targets: healText,
            y: y - 30,
            alpha: 0,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                healText.destroy();
            }
        });
    }

    createProjectile(attacker, target, config) {
        const projectile = new Projectile(
            this.scene,
            attacker.x,
            attacker.y,
            target,
            config
        );
        return projectile;
    }

    getStatsWithUpgrades(baseStats, upgradeLevel) {
        // Exponential upgrade bonuses:
        // HP bonus: +1, +2, +4, +8, +16... (cumulative: 2^(level-1) - 1)
        // DMG bonus: +2, +4, +8, +16, +32... (cumulative: 2^level - 2)
        const hpBonus = Math.pow(2, upgradeLevel - 1) - 1;
        const dmgBonus = Math.pow(2, upgradeLevel) - 2;

        return {
            ...baseStats,
            health: baseStats.health + hpBonus,
            damage: baseStats.damage + dmgBonus,
            speed: baseStats.speed,
            attackSpeed: Math.max(300, baseStats.attackSpeed - (upgradeLevel - 1) * 30)
        };
    }

    calculateUpgradeCost(unitKey, currentLevel) {
        const baseType = UNIT_TYPES[unitKey.toUpperCase()];
        if (!baseType) return { gold: 0, wood: 0 };

        const baseGoldCost = (baseType.goldCost || 10) * 2;
        const baseWoodCost = (baseType.woodCost || 10) * 2;
        return {
            gold: Math.floor(baseGoldCost * Math.pow(UPGRADE_CONFIG.costMultiplier, currentLevel - 1)),
            wood: Math.floor(baseWoodCost * Math.pow(UPGRADE_CONFIG.costMultiplier, currentLevel - 1))
        };
    }

    calculateUnlockCost(unitKey) {
        const costs = {
            horseman: 150
        };
        return costs[unitKey] || 100;
    }
}
