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
                    horseman: 0
                },
                // Resource totals
                totalGoldCollected: 0,
                totalWoodCollected: 0,
                totalGoldSpent: 0,
                totalWoodSpent: 0
            },
            // Legacy stats - NEVER reset, persist through account deletion
            legacy: {
                highestWaveEver: 0,
                totalGamesPlayedAllTime: 0,
                totalEnemiesKilledAllTime: 0,
                totalBossesKilledAllTime: 0,
                accountResets: 0,  // Track how many times player has reset
                firstPlayedAt: null,  // Timestamp of first game
                lastResetAt: null  // Timestamp of last reset
            },
            upgrades: {
                peasant: { level: 1, unlocked: true },
                archer: { level: 1, unlocked: true },
                horseman: { level: 1, unlocked: false }
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
        const savedLegacy = saved.legacy || {};

        // Migration: rename knight -> horseman (v1.8.2)
        if (saved.upgrades && saved.upgrades.knight && !saved.upgrades.horseman) {
            saved.upgrades.horseman = saved.upgrades.knight;
            delete saved.upgrades.knight;
        }
        if (savedStats.unitsSpawned && savedStats.unitsSpawned.knight !== undefined && savedStats.unitsSpawned.horseman === undefined) {
            savedStats.unitsSpawned.horseman = savedStats.unitsSpawned.knight;
            delete savedStats.unitsSpawned.knight;
        }

        return {
            ...defaults,
            ...saved,
            killStats: { ...defaults.killStats, ...(saved.killStats || {}) },
            stats: {
                ...defaults.stats,
                ...savedStats,
                unitsSpawned: { ...defaults.stats.unitsSpawned, ...(savedStats.unitsSpawned || {}) }
            },
            legacy: { ...defaults.legacy, ...savedLegacy },
            upgrades: { ...defaults.upgrades, ...saved.upgrades },
            castleUpgrades: { ...defaults.castleUpgrades, ...saved.castleUpgrades },
            settings: { ...defaults.settings, ...saved.settings }
        };
    }

    reset() {
        // Full reset - only used for debugging, preserves legacy
        const data = this.load();
        const legacy = data.legacy || this.getDefaultData().legacy;
        localStorage.removeItem(this.saveKey);
        const newData = this.getDefaultData();
        newData.legacy = legacy;
        this.save(newData);
        return newData;
    }

    // Reset account - preserves legacy achievements
    resetAccount() {
        const data = this.load();

        // Preserve and update legacy stats
        const legacy = data.legacy || this.getDefaultData().legacy;

        // Update legacy with current stats before reset
        if (data.highestWave > legacy.highestWaveEver) {
            legacy.highestWaveEver = data.highestWave;
        }
        legacy.totalGamesPlayedAllTime += data.stats?.totalGamesPlayed || 0;
        legacy.totalEnemiesKilledAllTime += data.totalEnemiesKilled || 0;
        legacy.totalBossesKilledAllTime += data.stats?.totalBossesKilled || 0;
        legacy.accountResets += 1;
        legacy.lastResetAt = Date.now();
        if (!legacy.firstPlayedAt) {
            legacy.firstPlayedAt = Date.now();
        }

        // Get fresh defaults and restore legacy + settings
        const newData = this.getDefaultData();
        newData.legacy = legacy;
        newData.settings = data.settings; // Keep audio settings

        this.save(newData);
        return { success: true, legacy: legacy };
    }

    exists() {
        return localStorage.getItem(this.saveKey) !== null;
    }

    updateHighScore(wave, goldEarned, enemiesKilled, killStats = {}, gameStats = {}) {
        const data = this.load();

        // Calculate XP divisor BEFORE updating stats (use rank at start of game, not after)
        // This prevents rank jumping mid-calculation from penalizing players
        const rankInfo = this.getRankInfo(data);
        const xpDivisor = this.getXPDivisorForRank(data);
        const xpEarned = Math.min(3, Math.floor(wave / xpDivisor)); // Max 3 XP per game

        // Debug logging
        console.log(`[XP Debug] Wave: ${wave}, Rank: ${rankInfo.rank.name}, Divisor: ${xpDivisor}, XP Earned: ${xpEarned}`);

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

        // Award XP (calculated above before stat updates)
        data.xp = (data.xp || 0) + xpEarned;

        // Update legacy stats
        if (!data.legacy) {
            data.legacy = this.getDefaultData().legacy;
        }
        if (!data.legacy.firstPlayedAt) {
            data.legacy.firstPlayedAt = Date.now();
        }
        if (wave > data.legacy.highestWaveEver) {
            data.legacy.highestWaveEver = wave;
        }

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
                const unlockCosts = { horseman: 2 };
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

    // Reset upgrades only (costs 2 XP + 25% of current XP balance)
    resetUpgrades() {
        const data = this.load();
        const spentXP = this.calculateSpentXP(data);
        const currentXP = data.xp || 0;
        const totalXP = currentXP + spentXP;

        // Fee: 2 XP flat + 25% of current XP balance
        const flatFee = 2;
        const percentFee = Math.floor(currentXP * 0.25);
        const totalFee = flatFee + percentFee;

        // Check if player has enough total XP to cover the fee
        if (totalXP < totalFee) {
            return { success: false, message: `Need at least ${totalFee} XP total (2 + 25% of ${currentXP})` };
        }

        // After reset: get back spent XP, minus the fee
        const newXP = totalXP - totalFee;

        // Reset upgrades to defaults
        const defaults = this.getDefaultData();
        data.upgrades = { ...defaults.upgrades };
        data.castleUpgrades = { ...defaults.castleUpgrades };
        data.xp = newXP;

        this.save(data);
        return { success: true, refunded: spentXP, fee: totalFee, flatFee: flatFee, percentFee: percentFee, newXP: newXP };
    }

    // Add XP (for purchases)
    addXP(amount) {
        const data = this.load();
        data.xp = (data.xp || 0) + amount;
        this.save(data);
        return data.xp;
    }

    // Get XP divisor based on player rank - easier for new players, harder for veterans
    // Dopamine club: Recruit (2), Soldier (3), Warrior (3) for newcomer boost!
    getXPDivisorForRank(data) {
        const rankInfo = this.getRankInfo(data);
        const rankName = rankInfo.rank.name;

        const divisors = {
            'Recruit': 2,   // Dopamine boost: 1 XP per 2 waves
            'Soldier': 3,   // Dopamine club: 1 XP per 3 waves
            'Warrior': 3,   // Dopamine club: 1 XP per 3 waves
            'Knight': 12,
            'Captain': 15,
            'Commander': 18,
            'General': 22,
            'Champion': 25,
            'Legend': 28,
            'Immortal': 31
        };

        return divisors[rankName] || 3;
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
    // Thresholds increase progressively for long-term progression
    getRankInfo(data) {
        const score = this.calculateRankScore(data);

        // All 30 ranks with explicit thresholds (increasing gaps as rank goes up)
        // Pattern: each tier's grades have progressively larger gaps
        const allRanks = [
            // Recruit: special lower thresholds (0, 60, 120) for newcomer dopamine
            { name: 'Recruit', grade: 1, minScore: 0, color: '#888888', icon: '🔰' },
            { name: 'Recruit', grade: 2, minScore: 60, color: '#888888', icon: '🔰' },
            { name: 'Recruit', grade: 3, minScore: 120, color: '#888888', icon: '🔰' },
            // Soldier: 324, 486, 648
            { name: 'Soldier', grade: 1, minScore: 324, color: '#4a9c4a', icon: '⚔️' },
            { name: 'Soldier', grade: 2, minScore: 486, color: '#4a9c4a', icon: '⚔️' },
            { name: 'Soldier', grade: 3, minScore: 648, color: '#4a9c4a', icon: '⚔️' },
            // Warrior: 864, 1134, 1458
            { name: 'Warrior', grade: 1, minScore: 864, color: '#4169E1', icon: '🗡️' },
            { name: 'Warrior', grade: 2, minScore: 1134, color: '#4169E1', icon: '🗡️' },
            { name: 'Warrior', grade: 3, minScore: 1458, color: '#4169E1', icon: '🗡️' },
            // Knight: 1530, 1935, 2430
            { name: 'Knight', grade: 1, minScore: 1530, color: '#9932CC', icon: '🛡️' },
            { name: 'Knight', grade: 2, minScore: 1935, color: '#9932CC', icon: '🛡️' },
            { name: 'Knight', grade: 3, minScore: 2430, color: '#9932CC', icon: '🛡️' },
            // Captain: 3060, 3870, 4860
            { name: 'Captain', grade: 1, minScore: 3060, color: '#ff6b6b', icon: '⭐' },
            { name: 'Captain', grade: 2, minScore: 3870, color: '#ff6b6b', icon: '⭐' },
            { name: 'Captain', grade: 3, minScore: 4860, color: '#ff6b6b', icon: '⭐' },
            // Commander: 6120, 7740, 9720
            { name: 'Commander', grade: 1, minScore: 6120, color: '#ff4500', icon: '🌟' },
            { name: 'Commander', grade: 2, minScore: 7740, color: '#ff4500', icon: '🌟' },
            { name: 'Commander', grade: 3, minScore: 9720, color: '#ff4500', icon: '🌟' },
            // General: 12150, 15300, 19350
            { name: 'General', grade: 1, minScore: 12150, color: '#ffd700', icon: '👑' },
            { name: 'General', grade: 2, minScore: 15300, color: '#ffd700', icon: '👑' },
            { name: 'General', grade: 3, minScore: 19350, color: '#ffd700', icon: '👑' },
            // Champion: 24300, 30600, 38700
            { name: 'Champion', grade: 1, minScore: 24300, color: '#00ffff', icon: '💎' },
            { name: 'Champion', grade: 2, minScore: 30600, color: '#00ffff', icon: '💎' },
            { name: 'Champion', grade: 3, minScore: 38700, color: '#00ffff', icon: '💎' },
            // Legend: 48600, 61200, 77400
            { name: 'Legend', grade: 1, minScore: 48600, color: '#ff00ff', icon: '🔥' },
            { name: 'Legend', grade: 2, minScore: 61200, color: '#ff00ff', icon: '🔥' },
            { name: 'Legend', grade: 3, minScore: 77400, color: '#ff00ff', icon: '🔥' },
            // Immortal: 97200, 122400, 154800
            { name: 'Immortal', grade: 1, minScore: 97200, color: '#ffffff', icon: '⚡' },
            { name: 'Immortal', grade: 2, minScore: 122400, color: '#ffffff', icon: '⚡' },
            { name: 'Immortal', grade: 3, minScore: 154800, color: '#ffffff', icon: '⚡' }
        ];

        // Find current rank
        let currentRankIndex = 0;
        for (let i = allRanks.length - 1; i >= 0; i--) {
            if (score >= allRanks[i].minScore) {
                currentRankIndex = i;
                break;
            }
        }

        const currentRank = allRanks[currentRankIndex];
        const nextRank = allRanks[currentRankIndex + 1] || null;

        // Calculate progress to next rank
        let progress = 0;
        let pointsToNext = 0;

        if (nextRank) {
            const currentMin = currentRank.minScore;
            const nextMin = nextRank.minScore;
            progress = (score - currentMin) / (nextMin - currentMin);
            pointsToNext = nextMin - score;
        } else {
            progress = 1;
            pointsToNext = 0;
        }

        const gradeNumerals = ['I', 'II', 'III'];
        const fullRankName = `${currentRank.name} ${gradeNumerals[currentRank.grade - 1]}`;

        // Find next tier (different name) for display
        let nextTierName = null;
        if (nextRank && nextRank.name !== currentRank.name) {
            nextTierName = nextRank.name;
        } else if (nextRank) {
            // Same tier, next grade
            nextTierName = null;
        }

        return {
            rank: {
                ...currentRank,
                fullName: fullRankName,
                gradeNumeral: gradeNumerals[currentRank.grade - 1]
            },
            nextRank: nextRank,
            nextTierName: nextTierName,
            score: score,
            progress: Math.min(1, Math.max(0, progress)),
            pointsToNext: pointsToNext,
            isMaxGrade: !nextRank
        };
    }
}

// Global instance
const saveSystem = new SaveSystem();
