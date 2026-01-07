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

        // Enemy count scaling - gentle early, ramps up later
        // Early waves (1-3): very few enemies to let player build up
        // Mid waves (4-10): moderate scaling
        // Late waves (10+): aggressive scaling
        let waveMultiplier;
        if (waveNumber <= 3) {
            waveMultiplier = 0.6 + waveNumber * 0.1;  // 0.7, 0.8, 0.9
        } else if (waveNumber <= 10) {
            waveMultiplier = 1 + (waveNumber - 3) * 0.12;  // Moderate growth
        } else {
            waveMultiplier = 1.84 + (waveNumber - 10) * 0.18;  // Aggressive growth
        }

        // Wave 1: just 3 goblins
        // Wave 2: 4 goblins + 1 orc
        // Wave 3+: scales up
        const goblinCount = Math.floor((2 + waveNumber * 0.5) * waveMultiplier);
        const orcCount = waveNumber >= 2 ? Math.floor((1 + waveNumber * 0.4) * waveMultiplier) : 0;
        const skeletonCount = waveNumber >= 4 ? Math.floor((waveNumber - 2) * 0.4 * waveMultiplier) : 0;
        const skeletonArcherCount = waveNumber >= 6 ? Math.floor((waveNumber - 4) * 0.35 * waveMultiplier) : 0;
        const spearMonsterCount = waveNumber >= 7 ? Math.floor((waveNumber - 5) * 0.3 * waveMultiplier) : 0;
        const trollCount = waveNumber >= 8 ? Math.floor((waveNumber - 6) * 0.25 * waveMultiplier) : 0;
        const darkKnightCount = waveNumber >= 12 ? Math.floor((waveNumber - 10) * 0.25 * waveMultiplier) : 0;
        const demonCount = waveNumber >= 18 ? Math.floor((waveNumber - 16) * 0.2 * waveMultiplier) : 0;

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
        if (!this.isSpawning || this.enemiesToSpawn.length === 0) {
            this.isSpawning = false;
            return;
        }

        // Spawn multiple enemies at once for higher waves (burst spawning)
        // Wave 1-5: 1 enemy at a time
        // Wave 6-10: 2 enemies at a time
        // Wave 11-15: 3 enemies at a time
        // Wave 16+: 4 enemies at a time
        const burstSize = Math.min(4, 1 + Math.floor(this.currentWave / 5));

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
        const goldReward = WAVE_CONFIG.baseGoldReward + (this.currentWave * WAVE_CONFIG.goldPerWave);
        const woodReward = WAVE_CONFIG.baseWoodReward + (this.currentWave * WAVE_CONFIG.woodPerWave);

        // Notify scene
        if (this.scene.onWaveComplete) {
            this.scene.onWaveComplete(this.currentWave, goldReward, woodReward);
        }
    }

    scheduleNextWave() {
        this.waveTimer = this.scene.time.delayedCall(WAVE_CONFIG.timeBetweenWaves, () => {
            this.startWave();
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
    }
}
