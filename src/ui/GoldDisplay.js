// ResourceDisplay UI Component - Shows current gold and wood (no boxes)
class ResourceDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;
        this.currentGold = 0;
        this.currentWood = 0;
        this.displayedGold = 0;
        this.displayedWood = 0;

        // No background - clean look
        // Horizontal layout for top bar

        // Gold label
        this.goldLabel = scene.add.text(-80, 0, 'Gold', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0.5);
        this.add(this.goldLabel);

        // Gold text
        this.goldText = scene.add.text(-75, 0, '0', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        this.add(this.goldText);

        // Wood label (offset to the right)
        this.woodLabel = scene.add.text(30, 0, 'Wood', {
            fontSize: '14px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#cd853f',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(1, 0.5);
        this.add(this.woodLabel);

        // Wood text
        this.woodText = scene.add.text(35, 0, '0', {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#cd853f',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        this.add(this.woodText);

        scene.add.existing(this);
        this.setDepth(900);
    }

    setGold(amount) {
        this.currentGold = amount;

        if (this.goldTween) {
            this.goldTween.stop();
        }

        this.goldTween = this.scene.tweens.addCounter({
            from: this.displayedGold,
            to: amount,
            duration: 300,
            ease: 'Power2',
            onUpdate: (tween) => {
                this.displayedGold = Math.floor(tween.getValue());
                this.goldText.setText(this.displayedGold.toString());
            }
        });

        if (amount > this.displayedGold) {
            this.scene.tweens.add({
                targets: this.goldText,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    setWood(amount) {
        this.currentWood = amount;

        if (this.woodTween) {
            this.woodTween.stop();
        }

        this.woodTween = this.scene.tweens.addCounter({
            from: this.displayedWood,
            to: amount,
            duration: 300,
            ease: 'Power2',
            onUpdate: (tween) => {
                this.displayedWood = Math.floor(tween.getValue());
                this.woodText.setText(this.displayedWood.toString());
            }
        });

        if (amount > this.displayedWood) {
            this.scene.tweens.add({
                targets: this.woodText,
                scale: 1.2,
                duration: 100,
                yoyo: true
            });
        }
    }

    addGold(amount) {
        this.setGold(this.currentGold + amount);
        this.showFloatingText(-20, 0, `+${amount}`, '#ffd700');
    }

    addWood(amount) {
        this.setWood(this.currentWood + amount);
        this.showFloatingText(60, 0, `+${amount}`, '#8B4513');
    }

    subtractGold(amount) {
        this.setGold(this.currentGold - amount);
        this.showFloatingText(-20, 0, `-${amount}`, '#ff4444');
    }

    subtractWood(amount) {
        this.setWood(this.currentWood - amount);
        this.showFloatingText(60, 0, `-${amount}`, '#ff4444');
    }

    showFloatingText(offsetX, offsetY, text, color) {
        const floatText = this.scene.add.text(this.x + offsetX, this.y + offsetY, text, {
            fontSize: '14px',
            fontFamily: 'Arial',
            color: color,
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        this.scene.tweens.add({
            targets: floatText,
            y: floatText.y - 25,
            alpha: 0,
            duration: 800,
            onComplete: () => floatText.destroy()
        });
    }

    getGold() {
        return this.currentGold;
    }

    getWood() {
        return this.currentWood;
    }
}

// Keep GoldDisplay for backwards compatibility
class GoldDisplay extends ResourceDisplay {
    constructor(scene, x, y) {
        super(scene, x, y);
    }
}


// Wave Display UI Component - big font, semi-transparent, bottom right
class WaveDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;

        // Big wave number text with opacity
        this.waveText = scene.add.text(0, 0, 'Wave 0', {
            fontSize: '48px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(1, 1).setAlpha(0.4);  // Right-aligned, bottom-aligned, semi-transparent
        this.add(this.waveText);

        scene.add.existing(this);
        this.setDepth(50);  // Behind gameplay elements
    }

    setWave(waveNumber, enemiesRemaining = 0) {
        this.waveText.setText(`Wave ${waveNumber}`);
    }

    showWaveStart(waveNumber) {
        // Big wave announcement
        const announcement = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `WAVE ${waveNumber}`, {
            fontSize: '64px',
            fontFamily: 'Arial',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(1000);

        // Play wave start sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playWaveStart();
        }

        this.scene.tweens.add({
            targets: announcement,
            scale: 1.5,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => announcement.destroy()
        });
    }

    showWaveComplete(goldReward, woodReward) {
        const announcement = this.scene.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `WAVE COMPLETE!\n+${goldReward} gold  +${woodReward} wood`, {
            fontSize: '48px',
            fontFamily: 'Arial',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(1000);

        this.scene.tweens.add({
            targets: announcement,
            scale: 1.3,
            alpha: 0,
            duration: 2000,
            ease: 'Power2',
            onComplete: () => announcement.destroy()
        });
    }
}
