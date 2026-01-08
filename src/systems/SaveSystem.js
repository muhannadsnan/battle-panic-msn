// Save System - Handles localStorage persistence
class SaveSystem {
    constructor() {
        this.saveKey = 'battlePanicSave';
    }

    getDefaultData() {
        return {
            gold: RESOURCE_CONFIG.startingGold,
            xp: 0, // XP points for upgrades (earned from battles)
            highestWave: 0,
            totalGoldEarned: 0,
            totalEnemiesKilled: 0,
            // Detailed kill stats per enemy type
            killStats: {
                goblin: 0,
                orc: 0,
                skeleton: 0,
                skeleton_archer: 0,
                troll: 0,
                dark_knight: 0,
                demon: 0,
                dragon: 0,  // Bosses
                spear_monster: 0
            },
            // Lifetime stats for achievements
            stats: {
                totalBossesKilled: 0,
                totalGamesPlayed: 0,
                totalWavesCompleted: 0,
                longestSurvivalTime: 0,  // in seconds
                totalUnitsSpawned: 0,
                // Unit spawn counts
                unitsSpawned: {
                    peasant: 0,
                    archer: 0,
                    knight: 0,
                    wizard: 0,
                    giant: 0
                },
                // Resource totals
                totalGoldCollected: 0,
                totalWoodCollected: 0,
                totalGoldSpent: 0,
                totalWoodSpent: 0
            },
            upgrades: {
                peasant: { level: 1, unlocked: true },
                archer: { level: 1, unlocked: true },
                knight: { level: 1, unlocked: false },
                wizard: { level: 1, unlocked: false },
                giant: { level: 1, unlocked: false }
            },
            castleUpgrades: {
                health: 1,
                armor: 1,
                goldIncome: 1
            },
            settings: {
                musicVolume: 0.5,
                sfxVolume: 0.7
            }
        };
    }

    save(data) {
        try {
            const saveData = JSON.stringify(data);
            localStorage.setItem(this.saveKey, saveData);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    load() {
        try {
            const saveData = localStorage.getItem(this.saveKey);
            if (saveData) {
                const parsed = JSON.parse(saveData);
                // Merge with defaults to handle new fields in updates
                return this.mergeWithDefaults(parsed);
            }
            return this.getDefaultData();
        } catch (e) {
            console.error('Failed to load game:', e);
            return this.getDefaultData();
        }
    }

    mergeWithDefaults(saved) {
        const defaults = this.getDefaultData();
        const savedStats = saved.stats || {};
        return {
            ...defaults,
            ...saved,
            killStats: { ...defaults.killStats, ...(saved.killStats || {}) },
            stats: {
                ...defaults.stats,
                ...savedStats,
                unitsSpawned: { ...defaults.stats.unitsSpawned, ...(savedStats.unitsSpawned || {}) }
            },
            upgrades: { ...defaults.upgrades, ...saved.upgrades },
            castleUpgrades: { ...defaults.castleUpgrades, ...saved.castleUpgrades },
            settings: { ...defaults.settings, ...saved.settings }
        };
    }

    reset() {
        localStorage.removeItem(this.saveKey);
        return this.getDefaultData();
    }

    exists() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    updateHighScore(wave, goldEarned, enemiesKilled, killStats = {}, gameStats = {}) {
        const data = this.load();
        if (wave > data.highestWave) {
            data.highestWave = wave;
        }
        data.totalGoldEarned += goldEarned;
        data.totalEnemiesKilled += enemiesKilled;

        // Update detailed kill stats per enemy type
        for (const enemyType in killStats) {
            if (data.killStats[enemyType] !== undefined) {
                data.killStats[enemyType] += killStats[enemyType];
            }
        }

        // Update lifetime stats
        data.stats.totalGamesPlayed += 1;
        data.stats.totalWavesCompleted += wave;
        data.stats.totalBossesKilled += (killStats.dragon || 0);
        if (gameStats.survivalTime && gameStats.survivalTime > data.stats.longestSurvivalTime) {
            data.stats.longestSurvivalTime = gameStats.survivalTime;
        }
        data.stats.totalUnitsSpawned += (gameStats.unitsSpawned || 0);

        // Update unit spawn counts per type
        if (gameStats.unitCounts) {
            for (const unitType in gameStats.unitCounts) {
                if (data.stats.unitsSpawned[unitType] !== undefined) {
                    data.stats.unitsSpawned[unitType] += gameStats.unitCounts[unitType];
                }
            }
        }

        // Update resource stats
        data.stats.totalGoldCollected += (gameStats.goldCollected || 0);
        data.stats.totalWoodCollected += (gameStats.woodCollected || 0);
        data.stats.totalGoldSpent += (gameStats.goldSpent || 0);
        data.stats.totalWoodSpent += (gameStats.woodSpent || 0);

        // Award XP: 1 point per 10 waves completed
        const xpEarned = Math.floor(wave / 10);
        data.xp = (data.xp || 0) + xpEarned;

        this.save(data);
        return { ...data, xpEarned };
    }

    purchaseUpgrade(unitKey, cost) {
        const data = this.load();
        if (data.gold >= cost && data.upgrades[unitKey]) {
            data.gold -= cost;
            data.upgrades[unitKey].level++;
            this.save(data);
            return true;
        }
        return false;
    }

    unlockUnit(unitKey, cost) {
        const data = this.load();
        if (data.gold >= cost && data.upgrades[unitKey] && !data.upgrades[unitKey].unlocked) {
            data.gold -= cost;
            data.upgrades[unitKey].unlocked = true;
            this.save(data);
            return true;
        }
        return false;
    }

    addGold(amount) {
        const data = this.load();
        data.gold += amount;
        this.save(data);
        return data.gold;
    }

    // Calculate total XP spent on upgrades
    calculateSpentXP(data) {
        let spent = 0;
        const defaults = this.getDefaultData();

        // Unit upgrades: each level costs (level-1) XP, so total for level N is sum(1 to N-1)
        for (const key in data.upgrades) {
            const level = data.upgrades[key].level;
            // Sum of 1+2+...+(level-1) = (level-1)*level/2
            if (level > 1) {
                spent += (level - 1) * level / 2;
            }
            // Unlock costs
            if (data.upgrades[key].unlocked && !defaults.upgrades[key].unlocked) {
                const unlockCosts = { knight: 2, wizard: 3, giant: 5 };
                spent += unlockCosts[key] || 0;
            }
        }

        // Castle upgrades: each level costs (level-1) XP
        for (const key in data.castleUpgrades) {
            const level = data.castleUpgrades[key];
            if (level > 1) {
                spent += (level - 1) * level / 2;
            }
        }

        return spent;
    }

    // Reset upgrades only (refund XP minus 2 XP fee)
    resetUpgrades() {
        const data = this.load();
        const spentXP = this.calculateSpentXP(data);
        const fee = 2;

        // Check if player has at least 2 XP (either in balance or spent)
        if ((data.xp || 0) + spentXP < fee) {
            return { success: false, message: 'Need at least 2 XP total' };
        }

        // Refund spent XP minus fee
        const refund = spentXP - fee;
        data.xp = (data.xp || 0) + refund;

        // Reset upgrades to defaults
        const defaults = this.getDefaultData();
        data.upgrades = { ...defaults.upgrades };
        data.castleUpgrades = { ...defaults.castleUpgrades };

        this.save(data);
        return { success: true, refunded: spentXP, fee: fee, newXP: data.xp };
    }

    // Add XP (for purchases)
    addXP(amount) {
        const data = this.load();
        data.xp = (data.xp || 0) + amount;
        this.save(data);
        return data.xp;
    }

    // Calculate total rank score based on all achievements
    calculateRankScore(data) {
        const spentXP = this.calculateSpentXP(data);
        const totalXP = (data.xp || 0) + spentXP;

        let score = 0;

        // XP contribution (x10 weight)
        score += totalXP * 10;

        // Kills contribution
        score += (data.totalEnemiesKilled || 0) * 0.5;

        // Boss kills (x20 weight)
        score += (data.stats?.totalBossesKilled || 0) * 20;

        // Highest wave (x5 weight)
        score += (data.highestWave || 0) * 5;

        // Total waves completed
        score += (data.stats?.totalWavesCompleted || 0) * 0.5;

        // Games played (x2 weight)
        score += (data.stats?.totalGamesPlayed || 0) * 2;

        // Resources collected (x0.01 weight)
        score += (data.stats?.totalGoldCollected || 0) * 0.01;
        score += (data.stats?.totalWoodCollected || 0) * 0.01;

        // Units spawned (x0.1 weight)
        score += (data.stats?.totalUnitsSpawned || 0) * 0.1;

        return Math.floor(score);
    }

    // Get rank info based on score
    getRankInfo(data) {
        const score = this.calculateRankScore(data);

        const ranks = [
            { name: 'Recruit', minScore: 0, color: '#888888', icon: '🔰' },
            { name: 'Soldier', minScore: 100, color: '#4a9c4a', icon: '⚔️' },
            { name: 'Warrior', minScore: 300, color: '#4169E1', icon: '🗡️' },
            { name: 'Knight', minScore: 600, color: '#9932CC', icon: '🛡️' },
            { name: 'Captain', minScore: 1000, color: '#ff6b6b', icon: '⭐' },
            { name: 'Commander', minScore: 2000, color: '#ff4500', icon: '🌟' },
            { name: 'General', minScore: 4000, color: '#ffd700', icon: '👑' },
            { name: 'Champion', minScore: 8000, color: '#00ffff', icon: '💎' },
            { name: 'Legend', minScore: 15000, color: '#ff00ff', icon: '🔥' },
            { name: 'Immortal', minScore: 30000, color: '#ffffff', icon: '⚡' }
        ];

        let currentRank = ranks[0];
        let nextRank = ranks[1];

        for (let i = ranks.length - 1; i >= 0; i--) {
            if (score >= ranks[i].minScore) {
                currentRank = ranks[i];
                nextRank = ranks[i + 1] || null;
                break;
            }
        }

        const progress = nextRank
            ? (score - currentRank.minScore) / (nextRank.minScore - currentRank.minScore)
            : 1;

        return {
            rank: currentRank,
            nextRank: nextRank,
            score: score,
            progress: Math.min(1, Math.max(0, progress)),
            pointsToNext: nextRank ? nextRank.minScore - score : 0
        };
    }
}

// Global instance
const saveSystem = new SaveSystem();
