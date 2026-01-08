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
    // Designed for LONG-TERM progression - takes many hours/days to rank up
    calculateRankScore(data) {
        const spentXP = this.calculateSpentXP(data);
        const totalXP = (data.xp || 0) + spentXP;

        let score = 0;

        // XP contribution (x5 weight) - main progression
        score += totalXP * 5;

        // Kills contribution (x0.1) - grinding matters
        score += (data.totalEnemiesKilled || 0) * 0.1;

        // Boss kills (x5 weight) - meaningful milestone
        score += (data.stats?.totalBossesKilled || 0) * 5;

        // Highest wave (x3 weight) - skill matters
        score += (data.highestWave || 0) * 3;

        // Total waves completed (x0.1)
        score += (data.stats?.totalWavesCompleted || 0) * 0.1;

        // Games played (x0.5 weight) - consistency
        score += (data.stats?.totalGamesPlayed || 0) * 0.5;

        // Resources collected (x0.001 weight)
        score += (data.stats?.totalGoldCollected || 0) * 0.001;
        score += (data.stats?.totalWoodCollected || 0) * 0.001;

        // Units spawned (x0.02 weight)
        score += (data.stats?.totalUnitsSpawned || 0) * 0.02;

        return Math.floor(score);
    }

    // Get rank info based on score - each rank has 3 grades (I, II, III)
    getRankInfo(data) {
        const score = this.calculateRankScore(data);

        // Ranks with 3 grades each - designed for long-term progression
        // Each rank tier has a base score, and grades divide it into thirds
        const rankTiers = [
            { name: 'Recruit', baseScore: 0, color: '#888888', icon: '🔰' },
            { name: 'Soldier', baseScore: 50, color: '#4a9c4a', icon: '⚔️' },
            { name: 'Warrior', baseScore: 150, color: '#4169E1', icon: '🗡️' },
            { name: 'Knight', baseScore: 400, color: '#9932CC', icon: '🛡️' },
            { name: 'Captain', baseScore: 800, color: '#ff6b6b', icon: '⭐' },
            { name: 'Commander', baseScore: 1500, color: '#ff4500', icon: '🌟' },
            { name: 'General', baseScore: 3000, color: '#ffd700', icon: '👑' },
            { name: 'Champion', baseScore: 6000, color: '#00ffff', icon: '💎' },
            { name: 'Legend', baseScore: 12000, color: '#ff00ff', icon: '🔥' },
            { name: 'Immortal', baseScore: 25000, color: '#ffffff', icon: '⚡' }
        ];

        // Find current rank tier
        let tierIndex = 0;
        for (let i = rankTiers.length - 1; i >= 0; i--) {
            if (score >= rankTiers[i].baseScore) {
                tierIndex = i;
                break;
            }
        }

        const currentTier = rankTiers[tierIndex];
        const nextTier = rankTiers[tierIndex + 1] || null;

        // Calculate grade within tier (I, II, III)
        let grade = 1;
        let gradeProgress = 0;
        let pointsToNextGrade = 0;

        if (nextTier) {
            const tierRange = nextTier.baseScore - currentTier.baseScore;
            const gradeSize = tierRange / 3;
            const scoreInTier = score - currentTier.baseScore;

            grade = Math.min(3, Math.floor(scoreInTier / gradeSize) + 1);
            const gradeStart = (grade - 1) * gradeSize;
            const gradeEnd = grade * gradeSize;

            gradeProgress = (scoreInTier - gradeStart) / gradeSize;
            pointsToNextGrade = Math.ceil(currentTier.baseScore + gradeEnd - score);

            // If at grade 3, points to next is to next tier
            if (grade === 3) {
                pointsToNextGrade = nextTier.baseScore - score;
            }
        } else {
            // Max rank (Immortal) - still has grades based on score beyond baseScore
            const beyondBase = score - currentTier.baseScore;
            const gradeSize = 10000; // 10k per grade at max rank
            grade = Math.min(3, Math.floor(beyondBase / gradeSize) + 1);
            gradeProgress = grade === 3 ? 1 : (beyondBase % gradeSize) / gradeSize;
            pointsToNextGrade = grade === 3 ? 0 : gradeSize - (beyondBase % gradeSize);
        }

        const gradeNumerals = ['I', 'II', 'III'];
        const fullRankName = `${currentTier.name} ${gradeNumerals[grade - 1]}`;

        return {
            rank: {
                ...currentTier,
                fullName: fullRankName,
                grade: grade,
                gradeNumeral: gradeNumerals[grade - 1]
            },
            nextRank: nextTier,
            score: score,
            progress: Math.min(1, Math.max(0, gradeProgress)),
            pointsToNext: pointsToNextGrade,
            isMaxGrade: !nextTier && grade === 3
        };
    }
}

// Global instance
const saveSystem = new SaveSystem();
