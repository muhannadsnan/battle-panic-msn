// ResourceDisplay UI Component - Shows current gold and wood (no boxes)
class ResourceDisplay extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        this.scene = scene;
        this.currentGold = 0;
        this.currentWood = 0;
        this.displayedGold = 0;
        this.displayedWood = 0;

        // No background - clean look with big icons
        // Horizontal layout for top bar

        // Gold icon (coin made of rectangles)
        this.goldIconContainer = scene.add.container(-70, 0);
        this.createGoldIcon(scene, this.goldIconContainer);
        this.add(this.goldIconContainer);

        // Gold text
        this.goldText = scene.add.text(-50, 0, '0', {
            fontSize: '22px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ffd700',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0, 0.5);
        this.add(this.goldText);

        // Wood icon (logs made of rectangles)
        this.woodIconContainer = scene.add.container(30, 0);
        this.createWoodIcon(scene, this.woodIconContainer);
        this.add(this.woodIconContainer);

        // Wood text
        this.woodText = scene.add.text(50, 0, '0', {
            fontSize: '22px',
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

    createGoldIcon(scene, container) {
        // Gold coin icon - single big coin (no background)
        const coin = scene.add.rectangle(0, 0, 20, 20, 0xFFD700);
        coin.setStrokeStyle(2, 0xDAA520);
        container.add(coin);
        // Inner detail
        container.add(scene.add.rectangle(0, 0, 12, 12, 0xFFE55C));
        // $ symbol approximation with rectangles
        container.add(scene.add.rectangle(0, -3, 2, 8, 0xDAA520));
        container.add(scene.add.rectangle(0, 3, 6, 2, 0xDAA520));
    }

    createWoodIcon(scene, container) {
        // Wood log icon - crossed logs (no background)
        // Log 1 (diagonal)
        container.add(scene.add.rectangle(-2, 2, 20, 7, 0x8B4513).setAngle(-20));
        container.add(scene.add.rectangle(-10, 4, 6, 5, 0xDEB887)); // End grain 1
        // Log 2 (diagonal other way)
        container.add(scene.add.rectangle(2, -2, 20, 7, 0xA0522D).setAngle(20));
        container.add(scene.add.rectangle(10, -4, 6, 5, 0xD2B48C)); // End grain 2
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

    showWaveComplete(waveNumber, goldReward, woodReward) {
        // Show at top of screen, smaller font, stays for 5 seconds
        const announcement = this.scene.add.text(GAME_WIDTH / 2, 50, `WAVE ${waveNumber}  +${goldReward}g  +${woodReward}w`, {
            fontSize: '24px',
            fontFamily: 'Arial',
            color: '#00ff00',
            stroke: '#000000',
            strokeThickness: 3,
            align: 'center'
        }).setOrigin(0.5).setDepth(1000);

        // Stay visible for 5 seconds, then fade out
        this.scene.tweens.add({
            targets: announcement,
            alpha: 0,
            delay: 5000,        // Wait 5 seconds before fading
            duration: 500,      // Quick fade out
            ease: 'Power2',
            onComplete: () => announcement.destroy()
        });
    }
}
