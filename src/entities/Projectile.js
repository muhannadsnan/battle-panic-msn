// Projectile Class - Arrows, fireballs, magic bolts
class Projectile extends Phaser.GameObjects.Container {
    constructor(scene, x, y, target, config) {
        super(scene, x, y);

        this.scene = scene;
        this.target = target;
        this.damage = config.damage || 10;
        this.speed = config.speed || 400;
        this.color = config.color || 0xffff00;
        this.isPlayerProjectile = config.isPlayerProjectile;
        this.splashDamage = config.splashDamage || false;
        this.splashRadius = config.splashRadius || 0;
        this.projectileType = config.projectileType || 'arrow';
        this.maxDistance = config.maxDistance || 500; // Max travel distance (half screen)

        this.hasHit = false;
        this.startX = x;
        this.startY = y;
        this.distanceTraveled = 0;

        // Calculate initial direction
        if (target && target.active) {
            this.targetX = target.x;
            this.targetY = target.y;
        } else {
            this.targetX = this.isPlayerProjectile ? GAME_WIDTH : 0;
            this.targetY = y;
        }

        // Create projectile visual based on type
        this.createProjectileSprite();

        // Calculate velocity
        const dx = this.targetX - x;
        const dy = this.targetY - y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        this.velocityX = (dx / distance) * this.speed;
        this.velocityY = (dy / distance) * this.speed;

        // Rotate to face direction
        this.rotation = Math.atan2(dy, dx);

        scene.add.existing(this);
        this.setDepth(500);
    }

    createProjectileSprite() {
        switch (this.projectileType) {
            case 'arrow':
                this.createArrow();
                break;
            case 'magic':
                this.createMagicBolt();
                break;
            case 'fireball':
                this.createFireball();
                break;
            case 'spear':
                this.createSpear();
                break;
            default:
                this.createArrow();
        }
    }

    createArrow() {
        // Sleek wooden arrow shaft with gradient effect
        const shaftBack = this.scene.add.rectangle(-2, 0, 22, 4, 0x6B4423);
        this.add(shaftBack);
        const shaft = this.scene.add.rectangle(0, 0, 20, 3, 0x8B5A33);
        this.add(shaft);
        const shaftHighlight = this.scene.add.rectangle(0, -1, 18, 1, 0xA67B5B);
        this.add(shaftHighlight);

        // Sharp metal arrowhead
        const headBase = this.scene.add.rectangle(14, 0, 8, 5, 0x888888);
        this.add(headBase);
        const headMid = this.scene.add.rectangle(17, 0, 6, 4, 0xAAAAAA);
        this.add(headMid);
        const headTip = this.scene.add.rectangle(21, 0, 4, 2, 0xCCCCCC);
        this.add(headTip);

        // Fletching (feathers) - red and white striped
        const fletchBase = this.scene.add.rectangle(-10, 0, 6, 6, 0xCC3333);
        this.add(fletchBase);
        const fletchTop = this.scene.add.rectangle(-10, -3, 5, 4, 0xEE5555);
        this.add(fletchTop);
        const fletchBot = this.scene.add.rectangle(-10, 3, 5, 4, 0xEE5555);
        this.add(fletchBot);
        const fletchStripe = this.scene.add.rectangle(-10, 0, 6, 1, 0xFFFFFF);
        this.add(fletchStripe);

        // Nock (back end)
        const nock = this.scene.add.rectangle(-13, 0, 3, 3, 0x4A3020);
        this.add(nock);

        this.mainSprite = shaft;
    }

    createMagicBolt() {
        // Outer glow
        const outerGlow = this.scene.add.circle(0, 0, 14, 0x9932CC, 0.3);
        this.add(outerGlow);

        // Middle glow
        const middleGlow = this.scene.add.circle(0, 0, 10, 0x9932CC, 0.5);
        this.add(middleGlow);

        // Core
        const core = this.scene.add.circle(0, 0, 6, 0x00FFFF);
        core.setStrokeStyle(2, 0xFFFFFF);
        this.add(core);

        // Sparkle effect
        const sparkle = this.scene.add.star(0, 0, 4, 2, 8, 0xFFFFFF, 0.8);
        this.add(sparkle);

        // Animate glow
        this.scene.tweens.add({
            targets: [outerGlow, middleGlow],
            scale: 1.3,
            alpha: 0.2,
            duration: 150,
            yoyo: true,
            repeat: -1
        });

        // Trail particles
        this.trailTimer = this.scene.time.addEvent({
            delay: 50,
            callback: () => {
                if (!this.hasHit) {
                    const trail = this.scene.add.circle(this.x, this.y, 4, 0x9932CC, 0.5);
                    this.scene.tweens.add({
                        targets: trail,
                        scale: 0,
                        alpha: 0,
                        duration: 200,
                        onComplete: () => trail.destroy()
                    });
                }
            },
            loop: true
        });

        this.mainSprite = core;
    }

    createFireball() {
        // Outer flame
        const outerFlame = this.scene.add.ellipse(0, 0, 28, 20, 0xFF4500, 0.6);
        this.add(outerFlame);

        // Middle flame
        const middleFlame = this.scene.add.ellipse(0, 0, 20, 14, 0xFF6600, 0.8);
        this.add(middleFlame);

        // Inner core
        const core = this.scene.add.ellipse(0, 0, 12, 10, 0xFFFF00);
        this.add(core);

        // Animate flames
        this.scene.tweens.add({
            targets: outerFlame,
            scaleX: 1.2,
            scaleY: 0.8,
            duration: 100,
            yoyo: true,
            repeat: -1
        });

        this.scene.tweens.add({
            targets: middleFlame,
            scaleX: 0.9,
            scaleY: 1.1,
            duration: 80,
            yoyo: true,
            repeat: -1
        });

        // Smoke trail
        this.trailTimer = this.scene.time.addEvent({
            delay: 40,
            callback: () => {
                if (!this.hasHit) {
                    const smoke = this.scene.add.circle(
                        this.x - this.velocityX * 0.02,
                        this.y - this.velocityY * 0.02,
                        Phaser.Math.Between(4, 8),
                        0x333333,
                        0.5
                    );
                    this.scene.tweens.add({
                        targets: smoke,
                        scale: 2,
                        alpha: 0,
                        y: smoke.y - 20,
                        duration: 400,
                        onComplete: () => smoke.destroy()
                    });
                }
            },
            loop: true
        });

        this.mainSprite = core;
    }

    createSpear() {
        // BIG thrown spear - larger and more menacing than arrow
        // Long wooden shaft
        const shaft = this.scene.add.rectangle(0, 0, 40, 5, 0x8B5A33);
        this.add(shaft);
        const shaftHighlight = this.scene.add.rectangle(0, -1, 38, 2, 0x9B6A43);
        this.add(shaftHighlight);

        // Big stone spearhead
        const head1 = this.scene.add.rectangle(24, 0, 16, 8, 0x666666);
        this.add(head1);
        const head2 = this.scene.add.rectangle(28, 0, 10, 6, 0x888888);
        this.add(head2);
        const tip = this.scene.add.rectangle(34, 0, 8, 4, 0xAAAAAA);
        this.add(tip);

        // Feather decorations at back
        const feather1 = this.scene.add.rectangle(-18, -4, 8, 5, 0xFF4444);
        const feather2 = this.scene.add.rectangle(-18, 4, 8, 5, 0xFFAA44);
        const feather3 = this.scene.add.rectangle(-22, 0, 6, 4, 0xFF6644);
        this.add(feather1);
        this.add(feather2);
        this.add(feather3);

        // Spinning rotation effect while flying
        this.scene.tweens.add({
            targets: this,
            angle: '+=5',
            duration: 100,
            repeat: -1,
            ease: 'Linear'
        });

        this.mainSprite = shaft;
    }

    update(time, delta) {
        if (this.hasHit) return;

        // Move projectile
        const dt = delta / 1000;
        this.x += this.velocityX * dt;
        this.y += this.velocityY * dt;

        // Update target position if target is still alive (slight homing)
        if (this.target && this.target.active && !this.target.isDead) {
            const dx = this.target.x - this.x;
            const dy = this.target.y - this.y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance > 0) {
                const homingStrength = 0.015;
                this.velocityX += (dx / distance) * this.speed * homingStrength;
                this.velocityY += (dy / distance) * this.speed * homingStrength;

                // Normalize velocity
                const vel = Math.sqrt(this.velocityX * this.velocityX + this.velocityY * this.velocityY);
                this.velocityX = (this.velocityX / vel) * this.speed;
                this.velocityY = (this.velocityY / vel) * this.speed;

                // Update rotation
                this.rotation = Math.atan2(this.velocityY, this.velocityX);
            }
        }

        // Check for collision
        this.checkCollision();

        // Track distance traveled
        this.distanceTraveled = Phaser.Math.Distance.Between(this.startX, this.startY, this.x, this.y);

        // Destroy if exceeded max distance or out of bounds
        if (this.distanceTraveled > this.maxDistance ||
            this.x < -50 || this.x > GAME_WIDTH + 50 || this.y < -50 || this.y > GAME_HEIGHT + 50) {
            this.cleanup();
            this.destroy();
        }
    }

    checkCollision() {
        if (this.hasHit) return;

        let targets;
        if (this.isPlayerProjectile) {
            targets = this.scene.enemies.getChildren();
        } else {
            targets = [...this.scene.units.getChildren()];
            if (this.scene.playerCastle && !this.scene.playerCastle.isDead) {
                targets.push(this.scene.playerCastle);
            }
        }

        for (const target of targets) {
            if (!target.active || target.isDead) continue;

            const distance = Phaser.Math.Distance.Between(this.x, this.y, target.x, target.y);
            const hitRadius = target.isBoss ? 35 : 25;

            if (distance < hitRadius) {
                this.hit(target);
                return;
            }
        }
    }

    hit(target) {
        this.hasHit = true;
        this.cleanup();

        if (this.splashDamage) {
            // Deal splash damage
            let targets;
            if (this.isPlayerProjectile) {
                targets = this.scene.enemies.getChildren();
            } else {
                targets = this.scene.units.getChildren();
            }
            this.scene.combatSystem.dealSplashDamage(
                this,
                this.x,
                this.y,
                this.damage,
                this.splashRadius,
                targets
            );

            // Splash effect based on type
            if (this.projectileType === 'magic') {
                this.createMagicExplosion();
            } else if (this.projectileType === 'fireball') {
                this.createFireExplosion();
            } else {
                this.createBasicImpact();
            }
        } else {
            // Single target damage
            this.scene.combatSystem.dealDamage(this, target, this.damage);
            this.createBasicImpact();
        }

        // Destroy after effect
        this.scene.time.delayedCall(100, () => {
            this.destroy();
        });
    }

    createBasicImpact() {
        // Simple hit effect
        const impact = this.scene.add.circle(this.x, this.y, 8, this.color);
        this.scene.tweens.add({
            targets: impact,
            scale: 2,
            alpha: 0,
            duration: 200,
            onComplete: () => impact.destroy()
        });
    }

    createMagicExplosion() {
        // Purple magic explosion
        const explosion = this.scene.add.circle(this.x, this.y, this.splashRadius || 30, 0x9932CC, 0.5);
        explosion.setStrokeStyle(3, 0x00FFFF);

        this.scene.tweens.add({
            targets: explosion,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => explosion.destroy()
        });

        // Sparkles
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const sparkle = this.scene.add.star(
                this.x + Math.cos(angle) * 10,
                this.y + Math.sin(angle) * 10,
                4, 2, 5, 0x00FFFF
            );

            this.scene.tweens.add({
                targets: sparkle,
                x: this.x + Math.cos(angle) * 40,
                y: this.y + Math.sin(angle) * 40,
                alpha: 0,
                scale: 0,
                duration: 300,
                onComplete: () => sparkle.destroy()
            });
        }
    }

    createFireExplosion() {
        // Fire explosion
        const explosion1 = this.scene.add.circle(this.x, this.y, this.splashRadius || 40, 0xFF4500, 0.6);
        const explosion2 = this.scene.add.circle(this.x, this.y, (this.splashRadius || 40) * 0.6, 0xFFFF00, 0.8);

        this.scene.tweens.add({
            targets: explosion1,
            scale: 1.8,
            alpha: 0,
            duration: 400,
            onComplete: () => explosion1.destroy()
        });

        this.scene.tweens.add({
            targets: explosion2,
            scale: 1.5,
            alpha: 0,
            duration: 300,
            onComplete: () => explosion2.destroy()
        });

        // Fire particles
        for (let i = 0; i < 12; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = Math.random() * 30;
            const particle = this.scene.add.circle(
                this.x + Math.cos(angle) * dist,
                this.y + Math.sin(angle) * dist,
                Phaser.Math.Between(3, 8),
                Phaser.Math.Between(0, 1) ? 0xFF4500 : 0xFFFF00
            );

            this.scene.tweens.add({
                targets: particle,
                x: particle.x + Math.cos(angle) * 50,
                y: particle.y + Math.sin(angle) * 50 - 30,
                alpha: 0,
                scale: 0,
                duration: Phaser.Math.Between(300, 500),
                onComplete: () => particle.destroy()
            });
        }

        // Smoke
        for (let i = 0; i < 5; i++) {
            const smoke = this.scene.add.circle(
                this.x + Phaser.Math.Between(-20, 20),
                this.y + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(8, 15),
                0x333333,
                0.6
            );

            this.scene.tweens.add({
                targets: smoke,
                y: smoke.y - 60,
                scale: 2.5,
                alpha: 0,
                duration: 800,
                delay: i * 50,
                onComplete: () => smoke.destroy()
            });
        }
    }

    cleanup() {
        if (this.trailTimer) {
            this.trailTimer.remove();
            this.trailTimer = null;
        }
    }

    destroy() {
        this.cleanup();
        super.destroy();
    }
}
