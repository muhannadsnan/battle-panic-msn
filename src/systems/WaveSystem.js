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
        const difficulty = waveNumber;

        // More enemies each wave! Numbers scale faster
        const waveMultiplier = 1 + (waveNumber - 1) * 0.15;  // +15% more enemies per wave

        const goblinCount = Math.floor((4 + waveNumber * 0.8) * waveMultiplier);
        const orcCount = waveNumber >= 2 ? Math.floor((2 + waveNumber * 0.6) * waveMultiplier) : 0;
        const skeletonCount = waveNumber >= 3 ? Math.floor((1 + waveNumber * 0.5) * waveMultiplier) : 0;
        const skeletonArcherCount = waveNumber >= 5 ? Math.floor((waveNumber - 3) * 0.5 * waveMultiplier) : 0;
        const trollCount = waveNumber >= 7 ? Math.floor((waveNumber - 5) * 0.3 * waveMultiplier) : 0;
        const darkKnightCount = waveNumber >= 10 ? Math.floor((waveNumber - 8) * 0.3 * waveMultiplier) : 0;
        const demonCount = waveNumber >= 15 ? Math.floor((waveNumber - 13) * 0.25 * waveMultiplier) : 0;

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

        const enemyData = this.enemiesToSpawn.shift();
        this.enemiesSpawned++;

        // Notify scene to spawn enemy with direction
        if (this.scene.spawnEnemy) {
            this.scene.spawnEnemy(enemyData.type, enemyData.direction);
        }

        // Schedule next spawn
        if (this.enemiesToSpawn.length > 0) {
            const spawnDelay = WAVE_CONFIG.spawnInterval + Math.random() * 300;
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
