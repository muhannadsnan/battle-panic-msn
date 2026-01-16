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

        // Rank text (left of wave)
        this.rankText = scene.add.text(-10, 0, '', {
            fontSize: '32px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#aaaaaa',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(1, 1).setAlpha(0.8);
        this.add(this.rankText);

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

    setRank(rankInfo) {
        if (rankInfo && rankInfo.rank) {
            const rank = rankInfo.rank;
            const gradeNum = rank.grade ? ` ${['I', 'II', 'III'][rank.grade - 1] || rank.grade}` : '';
            // Show icon + rank name (no separator)
            this.rankText.setText(`${rank.icon || '⭐'} ${rank.name}${gradeNum}`);
            this.rankText.setColor(rank.color || '#aaaaaa');
            // Reposition rank text to be left of wave text with spacing
            this.rankText.setX(-this.waveText.width - 15);
        }
    }

    setWave(waveNumber, enemiesRemaining = 0) {
        this.waveText.setText(`Wave ${waveNumber}`);
        // Reposition rank after wave text changes
        this.rankText.setX(-this.waveText.width - 15);
    }

    showWaveStart(waveNumber) {
        // Container for wave announcement box
        const container = this.scene.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2);
        container.setDepth(1000);

        // Create text first to measure
        const announcement = this.scene.add.text(0, 0, `WAVE ${waveNumber}`, {
            fontSize: '52px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#ff4444',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        // Rounded background box
        const padding = { x: 40, y: 20 };
        const boxWidth = announcement.width + padding.x * 2;
        const boxHeight = announcement.height + padding.y * 2;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.7);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 16);
        bg.lineStyle(3, 0xff4444, 0.6);
        bg.strokeRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 16);

        container.add(bg);
        container.add(announcement);

        // Play wave start sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playWaveStart();
        }

        // Pop-in then fade out
        container.setScale(0.8);
        container.setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.easeOut',
            onComplete: () => {
                this.scene.tweens.add({
                    targets: container,
                    alpha: 0,
                    duration: 1000,
                    delay: 500,
                    ease: 'Power2',
                    onComplete: () => container.destroy()
                });
            }
        });
    }

    showWaveComplete(waveNumber, goldReward, woodReward) {
        // Container for rewards notification
        const container = this.scene.add.container(220, 58);
        container.setDepth(1000);

        // Create reward text
        const rewardText = this.scene.add.text(0, 0, `+${goldReward}g  +${woodReward}w`, {
            fontSize: '18px',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            color: '#4ade80',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);

        // Small rounded background
        const padding = { x: 12, y: 6 };
        const boxWidth = rewardText.width + padding.x * 2;
        const boxHeight = rewardText.height + padding.y * 2;

        const bg = this.scene.add.graphics();
        bg.fillStyle(0x000000, 0.6);
        bg.fillRoundedRect(-boxWidth / 2, -boxHeight / 2, boxWidth, boxHeight, 8);

        container.add(bg);
        container.add(rewardText);

        // Pop in
        container.setScale(0.8);
        container.setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 150,
            ease: 'Back.easeOut',
            onComplete: () => {
                // Stay visible then fade out
                this.scene.tweens.add({
                    targets: container,
                    alpha: 0,
                    y: 48,
                    delay: 2500,
                    duration: 400,
                    ease: 'Power2',
                    onComplete: () => container.destroy()
                });
            }
        });
    }
}
