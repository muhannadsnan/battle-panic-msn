// Wave System - Handles enemy wave spawning and progression with multi-directional spawning
class WaveSystem {
    constructor(scene) {
        this.scene = scene;
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = [];
        this.isSpawning = false;
        this.waveInProgress = false;
        this.spawnTimer = null;
        this.waveTimer = null;
    }

    generateWave(waveNumber) {
        const enemies = [];

        // Offset wave by 1 so wave 1 starts with more enemies (orcs included)
        const effectiveWave = waveNumber + 1;

        // Enemy count scaling - gentle early, ramps up later
        // Early waves (1-2): small but playable
        // Mid waves (3-9): moderate scaling
        // Late waves (10+): aggressive scaling
        let waveMultiplier;
        if (effectiveWave <= 3) {
            waveMultiplier = 0.8 + effectiveWave * 0.1;  // 0.9, 1.0, 1.1
        } else if (effectiveWave <= 10) {
            waveMultiplier = 1.1 + (effectiveWave - 3) * 0.12;  // Moderate growth
        } else {
            waveMultiplier = 1.94 + (effectiveWave - 10) * 0.18;  // Aggressive growth
        }

        // Wave 1 now starts with goblins + orcs
        // Each wave scales up from there
        const goblinCount = Math.max(3, Math.floor((2 + effectiveWave * 0.6) * waveMultiplier));
        const orcCount = Math.floor((1 + effectiveWave * 0.5) * waveMultiplier);
        const skeletonCount = effectiveWave >= 4 ? Math.floor((effectiveWave - 2) * 0.4 * waveMultiplier) : 0;
        const skeletonArcherCount = effectiveWave >= 6 ? Math.floor((effectiveWave - 4) * 0.35 * waveMultiplier) : 0;
        const spearMonsterCount = effectiveWave >= 7 ? Math.floor((effectiveWave - 5) * 0.3 * waveMultiplier) : 0;
        const trollCount = effectiveWave >= 8 ? Math.floor((effectiveWave - 6) * 0.25 * waveMultiplier) : 0;
        const darkKnightCount = effectiveWave >= 12 ? Math.floor((effectiveWave - 10) * 0.25 * waveMultiplier) : 0;
        const demonCount = effectiveWave >= 18 ? Math.floor((effectiveWave - 16) * 0.2 * waveMultiplier) : 0;

        // Add enemies to the wave with spawn directions
        for (let i = 0; i < goblinCount; i++) {
            enemies.push({ type: 'GOBLIN', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < orcCount; i++) {
            enemies.push({ type: 'ORC', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < skeletonCount; i++) {
            enemies.push({ type: 'SKELETON', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < skeletonArcherCount; i++) {
            enemies.push({ type: 'SKELETON_ARCHER', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < spearMonsterCount; i++) {
            enemies.push({ type: 'SPEAR_MONSTER', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < trollCount; i++) {
            enemies.push({ type: 'TROLL', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < darkKnightCount; i++) {
            enemies.push({ type: 'DARK_KNIGHT', direction: this.getRandomSpawnDirection(waveNumber) });
        }
        for (let i = 0; i < demonCount; i++) {
            enemies.push({ type: 'DEMON', direction: this.getRandomSpawnDirection(waveNumber) });
        }

        // Boss waves every N waves based on BOSS_CONFIG (bosses always from right)
        if (waveNumber % BOSS_CONFIG.spawnEveryWaves === 0 && waveNumber > 0) {
            const bossCount = Math.floor(waveNumber / BOSS_CONFIG.spawnEveryWaves);
            for (let i = 0; i < bossCount; i++) {
                enemies.push({ type: 'DRAGON', direction: 'right' });
            }
        }

        // Shuffle enemies for variety
        this.shuffleArray(enemies);

        return enemies;
    }

    getRandomSpawnDirection(waveNumber) {
        // Early waves: only from right
        // Wave 3+: can come from top
        // Wave 5+: can come from bottom
        // Wave 8+: higher chance of multi-directional
        const directions = ['right'];

        if (waveNumber >= 3) {
            directions.push('right'); // Keep right more common
            if (Math.random() < 0.3 + (waveNumber - 3) * 0.05) {
                directions.push('top');
            }
        }

        if (waveNumber >= 5) {
            if (Math.random() < 0.3 + (waveNumber - 5) * 0.05) {
                directions.push('bottom');
            }
        }

        return directions[Math.floor(Math.random() * directions.length)];
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    startWave() {
        this.currentWave++;
        this.enemiesToSpawn = this.generateWave(this.currentWave);
        this.enemiesRemaining = this.enemiesToSpawn.length;
        this.enemiesSpawned = 0;
        this.waveInProgress = true;
        this.isSpawning = true;

        // Notify scene
        if (this.scene.onWaveStart) {
            this.scene.onWaveStart(this.currentWave, this.enemiesRemaining);
        }

        // Start spawning
        this.spawnNextEnemy();
    }

    spawnNextEnemy() {
        // Don't spawn if game is paused - reschedule instead
        if (this.scene.isPaused) {
            this.spawnTimer = this.scene.time.delayedCall(100, () => {
                this.spawnNextEnemy();
            });
            return;
        }

        if (!this.isSpawning || this.enemiesToSpawn.length === 0) {
            this.isSpawning = false;
            return;
        }

        // Spawn multiple enemies at once for higher waves (burst spawning)
        // Wave 1-5: 1 enemy at a time
        // Wave 6-10: 2 enemies at a time
        // Wave 11-15: 3 enemies at a time
        // Wave 16+: 4 enemies at a time
        let burstSize = Math.min(4, 1 + Math.floor(this.currentWave / 5));

        // Higher ranks spawn more enemies at once (15% more per tier)
        // Tier 0 (Recruit) = 1x, Tier 1 (Soldier) = 1.15x, Tier 2 (Warrior) = 1.3x, etc.
        if (typeof saveSystem !== 'undefined') {
            const saveData = saveSystem.load();
            const rankInfo = saveSystem.getRankInfo(saveData);
            // Calculate tier index (0-9) from rank name
            const tierNames = ['Recruit', 'Soldier', 'Warrior', 'Knight', 'Captain', 'Commander', 'General', 'Champion', 'Legend', 'Immortal'];
            const tierIndex = tierNames.indexOf(rankInfo.rank.name);
            if (tierIndex > 0) {
                const rankMultiplier = 1 + (tierIndex * 0.15);
                burstSize = Math.ceil(burstSize * rankMultiplier);
            }
        }

        for (let i = 0; i < burstSize && this.enemiesToSpawn.length > 0; i++) {
            const enemyData = this.enemiesToSpawn.shift();
            this.enemiesSpawned++;

            // Notify scene to spawn enemy with direction
            if (this.scene.spawnEnemy) {
                this.scene.spawnEnemy(enemyData.type, enemyData.direction);
            }
        }

        // Schedule next spawn - faster at higher waves
        if (this.enemiesToSpawn.length > 0) {
            // Base interval decreases with wave: 1000ms -> down to 400ms minimum
            const baseInterval = Math.max(400, WAVE_CONFIG.spawnInterval - (this.currentWave - 1) * 50);
            const spawnDelay = baseInterval + Math.random() * 200;
            this.spawnTimer = this.scene.time.delayedCall(spawnDelay, () => {
                this.spawnNextEnemy();
            });
        } else {
            this.isSpawning = false;
        }
    }

    onEnemyKilled() {
        this.enemiesRemaining--;

        if (this.enemiesRemaining <= 0 && !this.isSpawning) {
            this.waveComplete();
        }
    }

    waveComplete() {
        this.waveInProgress = false;

        // Calculate wave rewards (gold and wood)
        let goldReward = WAVE_CONFIG.baseGoldReward + (this.currentWave * WAVE_CONFIG.goldPerWave);
        let woodReward = WAVE_CONFIG.baseWoodReward + (this.currentWave * WAVE_CONFIG.woodPerWave);

        // Apply diminishing returns after wave 25
        if (this.currentWave > WAVE_CONFIG.diminishingRewardsWave) {
            const wavesOver = this.currentWave - WAVE_CONFIG.diminishingRewardsWave;
            const diminishFactor = Math.pow(WAVE_CONFIG.rewardDiminishRate, wavesOver);
            goldReward = Math.floor(goldReward * diminishFactor);
            woodReward = Math.floor(woodReward * diminishFactor);
        }

        // Notify scene
        if (this.scene.onWaveComplete) {
            this.scene.onWaveComplete(this.currentWave, goldReward, woodReward);
        }
    }

    scheduleNextWave() {
        // Show countdown before next wave
        this.startCountdown(5);
    }

    startCountdown(seconds) {
        if (seconds <= 0) {
            // Countdown finished, start the wave
            if (this.countdownText) {
                this.countdownText.destroy();
                this.countdownText = null;
            }
            if (this.countdownLabel) {
                this.countdownLabel.destroy();
                this.countdownLabel = null;
            }
            this.startWave();
            return;
        }

        // Create or update countdown text
        if (!this.countdownText) {
            this.countdownText = this.scene.add.text(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2 - 20,
                seconds.toString(),
                {
                    fontSize: '72px',
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    color: '#ffffff',
                    stroke: '#000000',
                    strokeThickness: 6
                }
            ).setOrigin(0.5).setDepth(1000);

            // Add "Next Wave" label above
            this.countdownLabel = this.scene.add.text(
                GAME_WIDTH / 2,
                GAME_HEIGHT / 2 - 80,
                `Wave ${this.currentWave + 1}`,
                {
                    fontSize: '24px',
                    fontFamily: 'Arial',
                    fontStyle: 'bold',
                    color: '#4169E1',
                    stroke: '#000000',
                    strokeThickness: 3
                }
            ).setOrigin(0.5).setDepth(1000);
        } else {
            this.countdownText.setText(seconds.toString());
        }

        // Animate the number (pulse effect)
        this.countdownText.setScale(1.3);
        this.scene.tweens.add({
            targets: this.countdownText,
            scale: 1,
            duration: 200,
            ease: 'Back.easeOut'
        });

        // Play tick sound
        if (typeof audioManager !== 'undefined') {
            audioManager.playClick();
        }

        // Schedule next countdown tick
        this.waveTimer = this.scene.time.delayedCall(1000, () => {
            this.startCountdown(seconds - 1);
        });
    }

    stopTimers() {
        if (this.spawnTimer) {
            this.spawnTimer.remove();
            this.spawnTimer = null;
        }
        if (this.waveTimer) {
            this.waveTimer.remove();
            this.waveTimer = null;
        }
        // Clean up countdown display
        if (this.countdownText) {
            this.countdownText.destroy();
            this.countdownText = null;
        }
        if (this.countdownLabel) {
            this.countdownLabel.destroy();
            this.countdownLabel = null;
        }
    }

    pause() {
        // Pause spawn timer
        if (this.spawnTimer && !this.spawnTimer.paused) {
            this.spawnTimer.paused = true;
        }
        // Pause wave timer
        if (this.waveTimer && !this.waveTimer.paused) {
            this.waveTimer.paused = true;
        }
    }

    resume() {
        // Resume spawn timer
        if (this.spawnTimer && this.spawnTimer.paused) {
            this.spawnTimer.paused = false;
        }
        // Resume wave timer
        if (this.waveTimer && this.waveTimer.paused) {
            this.waveTimer.paused = false;
        }
    }

    getWaveInfo() {
        return {
            currentWave: this.currentWave,
            enemiesRemaining: this.enemiesRemaining,
            waveInProgress: this.waveInProgress
        };
    }

    reset() {
        this.stopTimers();
        this.currentWave = 0;
        this.enemiesRemaining = 0;
        this.enemiesSpawned = 0;
        this.enemiesToSpawn = [];
        this.isSpawning = false;
        this.waveInProgress = false;
        // Countdown text is already cleaned up in stopTimers()
    }
}
