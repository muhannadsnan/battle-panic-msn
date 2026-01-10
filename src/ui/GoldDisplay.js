// ResourceDisplay UI Component - Shows current gold and wood with text labels
class ResourceDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;
        this.currentGold = 0;
        this.currentWood = 0;
        this.displayedGold = 0;
        this.displayedWood = 0;

        // Clean text-based layout for top bar

        // Gold label
        this.goldLabel = scene.add.text(-35, 0, 'GOLD', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        this.add(this.goldLabel);

        // Gold value
        this.goldText = scene.add.text(15, 0, '0', {
            fontSize: '26px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        this.add(this.goldText);

        // Wood label
        this.woodLabel = scene.add.text(75, 0, 'WOOD', {
            fontSize: '16px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#cd853f',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0, 0.5);
        this.add(this.woodLabel);

        // Wood value
        this.woodText = scene.add.text(130, 0, '0', {
            fontSize: '26px',
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
        // Direct update for smooth continuous mining
        this.displayedGold = amount;
        this.goldText.setText(amount.toString());
    }

    setWood(amount) {
        this.currentWood = amount;
        // Direct update for smooth continuous mining
        this.displayedWood = amount;
        this.woodText.setText(amount.toString());
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


// Wave Display UI Component - big font, semi-transparent, bottom right, always on top
class WaveDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;

        // Big wave number text with opacity
        this.waveText = scene.add.text(0, 0, 'Wave 0', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffffff',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 1).setAlpha(0.8);  // Right-aligned, bottom-aligned
        this.add(this.waveText);

        scene.add.existing(this);
        this.setDepth(900);  // Always on top of gameplay
    }

    setWave(waveNumber, enemiesRemaining = 0) {
        this.waveText.setText(`Wave ${waveNumber}`);
    }

    showWaveStart(waveNumber) {
        // Big wave announcement - no zoom, just fade out
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

        // Simple fade out, no zoom
        this.scene.tweens.add({
            targets: announcement,
            alpha: 0,
            duration: 1500,
            ease: 'Power2',
            onComplete: () => announcement.destroy()
        });
    }

    showWaveComplete(waveNumber, goldReward, woodReward) {
        // Show rewards below resource display (ResourceDisplay is at 150, 30)
        // Gold reward below gold value
        const goldBonusText = this.scene.add.text(165, 55, `+${goldReward}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        // Wood reward below wood value
        const woodBonusText = this.scene.add.text(280, 55, `+${woodReward}`, {
            fontSize: '20px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#44ff44',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(1000);

        // Stay visible for 3 seconds, then fade out
        this.scene.tweens.add({
            targets: [goldBonusText, woodBonusText],
            alpha: 0,
            delay: 3000,        // Wait 3 seconds before fading
            duration: 500,      // Quick fade out
            ease: 'Power2',
            onComplete: () => {
                goldBonusText.destroy();
                woodBonusText.destroy();
            }
        });
    }
}
