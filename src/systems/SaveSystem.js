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
        return {
            ...defaults,
            ...saved,
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

    updateHighScore(wave, goldEarned, enemiesKilled) {
        const data = this.load();
        if (wave > data.highestWave) {
            data.highestWave = wave;
        }
        data.totalGoldEarned += goldEarned;
        data.totalEnemiesKilled += enemiesKilled;

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
}

// Global instance
const saveSystem = new SaveSystem();
