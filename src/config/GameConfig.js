// Game Constants and Configuration
const GAME_VERSION = 'v1.38.22';
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 600;

// Unit Types Configuration (cost now includes gold and wood)
// BALANCE: More expensive units, harder to snowball
const UNIT_TYPES = {
    PEASANT: {
        key: 'peasant',
        name: 'Peasant',
        goldCost: 10,
        woodCost: 10,
        health: 14,
        damage: 4,
        speed: 88,      // 10% faster than orcs (55)
        attackSpeed: 1000,
        range: 30,
        knightArmor: 0.25,  // Gold tier (lvl 4+) becomes Knight with 25% damage reduction
        color: 0x8B4513,
        description: 'Cheap melee fighter'
    },
    ARCHER: {
        key: 'archer',
        name: 'Archer',
        goldCost: 25,
        woodCost: 20,
        health: 18,
        damage: 6,
        speed: 66,      // 10% faster than orcs
        attackSpeed: 1500,
        range: 200,
        isRanged: true,
        // Gold tier (lvl 4+) becomes Robinhood
        robinhoodAttackSpeedMultiplier: 0.5,  // Attacks 2x faster
        robinhoodArmor: 0.15,                  // 15% damage reduction (thick cloak)
        color: 0x228B22,
        description: 'Ranged, decent damage'
    },
    HORSEMAN: {
        key: 'horseman',
        name: 'Horseman',
        goldCost: 60,
        woodCost: 40,
        health: 35,
        damage: 14,
        speed: 176,     // 2x faster than peasants (cavalry charge!)
        attackSpeed: 800,  // Fast attacker, gets 25% faster per promotion level
        range: 40,
        infantryDamageReduction: 0.4,  // Takes 40% less damage from melee (armor + shield)
        rangedDamageReduction: 0.2,    // Takes 20% less damage from ranged (helmet + speed)
        // Gold tier (lvl 4+) becomes Lancelot (legendary knight)
        lancelotSpeedBonus: 2.0,              // 2x speed!
        lancelotDamageBonus: 1.2,             // 20% more damage
        lancelotMeleeArmor: 0.5,              // 50% melee reduction (up from 40%)
        lancelotRangedArmor: 0.3,             // 30% ranged reduction (up from 20%)
        color: 0x8B4513,
        description: 'Fast cavalry, armored'
    }
};

// Enemy Types Configuration
// BALANCE: Enemies 40% weaker than original for easier gameplay
const ENEMY_TYPES = {
    GOBLIN: {
        key: 'goblin',
        name: 'Goblin',
        health: 9,
        damage: 2,
        speed: 85,
        attackSpeed: 900,
        range: 25,
        goldReward: 1,
        woodReward: 1,
        color: 0x32CD32
    },
    ORC: {
        key: 'orc',
        name: 'Orc',
        health: 24,
        damage: 3,
        speed: 55,
        attackSpeed: 1100,
        range: 30,
        goldReward: 1,
        woodReward: 1,
        color: 0x556B2F
    },
    SKELETON: {
        key: 'skeleton',
        name: 'Skeleton',
        health: 17,
        damage: 3,
        speed: 65,
        attackSpeed: 1000,
        range: 28,
        goldReward: 1,
        woodReward: 1,
        color: 0xD3D3D3
    },
    SKELETON_ARCHER: {
        key: 'skeleton_archer',
        name: 'Skeleton Archer',
        health: 15,
        damage: 6,
        speed: 50,
        attackSpeed: 1400,
        range: 180,
        isRanged: true,
        goldReward: 2,
        woodReward: 1,
        color: 0xA9A9A9
    },
    TROLL: {
        key: 'troll',
        name: 'Troll',
        health: 90,
        damage: 12,
        speed: 35,
        attackSpeed: 1800,
        range: 40,
        goldReward: 3,
        woodReward: 2,
        color: 0x2F4F4F
    },
    DARK_KNIGHT: {
        key: 'dark_knight',
        name: 'Dark Knight',
        health: 60,
        damage: 9,
        speed: 55,
        attackSpeed: 1100,
        range: 35,
        goldReward: 3,
        woodReward: 2,
        color: 0x1C1C1C
    },
    DEMON: {
        key: 'demon',
        name: 'Demon',
        health: 120,
        damage: 15,
        speed: 45,
        attackSpeed: 1500,
        range: 35,
        goldReward: 5,
        woodReward: 3,
        color: 0x8B0000
    },
    DRAGON: {
        key: 'dragon',
        name: 'Dragon',
        oneHitKill: true,
        health: 300,
        damage: 50,         // Ring of fire base damage (scales with wave/boss)
        speed: 40,
        attackSpeed: 4000,  // Ring of fire every 4 seconds
        range: 120,         // Close range - ring of fire radius
        isRanged: false,    // Ring of fire is a close-range area attack
        goldReward: 15,
        woodReward: 10,
        color: 0xFF4500,
        isBoss: true
    },
    SPEAR_MONSTER: {
        key: 'spear_monster',
        name: 'Spear Monster',
        health: 18,
        damage: 8,
        speed: 75,
        attackSpeed: 1800,
        range: 200,
        isRanged: true,
        goldReward: 2,
        woodReward: 1,
        color: 0x8B4513
    }
};

// Wave Configuration
const WAVE_CONFIG = {
    baseGoldReward: 30,
    baseWoodReward: 20,
    goldPerWave: 10,
    woodPerWave: 8,
    timeBetweenWaves: 3000,
    spawnInterval: 1000,
    // Enemy scaling per wave (tiered system, increases every 20 waves)
    // Waves 1-20: +2.7%, 21-40: +5.4%, 41-60: +8.1%, etc. (10% less intense)
    scalingTierSize: 20,        // Waves per tier
    baseScalingPercent: 0.027,  // Starting at 2.7% per wave (was 3%)
    scalingIncrement: 0.027,    // +2.7% more per tier (was 3%)
    // Diminishing wave rewards after wave 25
    diminishingRewardsWave: 25,
    rewardDiminishRate: 0.9  // 10% less reward per wave after threshold
};

// Upgrade Configuration
// Exponential upgrades: HP +1,+2,+4,+8... DMG +2,+4,+8,+16...
const UPGRADE_CONFIG = {
    maxLevel: 10,
    costMultiplier: 1.5,  // XP cost scaling
    // Exponential bonus formula (used in CombatSystem and UpgradeScene):
    // HP bonus = 2^(level-1) - 1
    // DMG bonus = 2^level - 2
};

// Castle Configuration
const CASTLE_CONFIG = {
    playerHealth: 100,
    playerX: 180,       // Moved right for space from unit bar
    defenseLineX: 280,  // Where units return to defend
    defenseMinY: 80,    // Full battlefield range
    defenseMaxY: 520,
    maxLevel: 10,       // Max castle upgrade level
    upgradeGoldBase: 100,   // Starting gold cost
    upgradeWoodBase: 75,    // Starting wood cost
    upgradeCostMultiplier: 1.15 // 15% more per level
};

// Resource Configuration
const RESOURCE_CONFIG = {
    startingGold: 50,   // Starting resources
    startingWood: 50,
    mineGoldAmount: 5,  // Less per mine (was 8)
    mineWoodAmount: 5,
    mineInterval: 2000,
    goldMineX: 330,     // Aligned with fence
    goldMineY: 100,
    woodMineX: 330,     // Aligned with fence
    woodMineY: 530      // Bottom area
};

// Spawn Configuration - enemies spawn from edges, closer to center for visibility
const SPAWN_CONFIG = {
    rightSpawn: { x: GAME_WIDTH - 20, minY: 180, maxY: 450 },  // Closer, narrower Y range
    topRightSpawn: { minX: 400, maxX: GAME_WIDTH - 150, y: 100 },  // On-screen, more left (unused)
    topSpawn: { x: 600, y: 120 },  // Fixed X near right side
    bottomRightSpawn: { minX: 400, maxX: GAME_WIDTH - 150, y: 500 },  // On-screen, more left (unused)
    bottomSpawn: { x: 600, y: 480 }  // Fixed X near right side
};

// Boss Configuration
const BOSS_CONFIG = {
    spawnEveryWaves: 10,
    healthMultiplier: 3.75, // 3x stronger bosses
    damageMultiplier: 1.25, // Dragon hits castle less hard
    sizeMultiplier: 0.75   // Half size (reduced from 1.5)
};

// Audio Configuration
const AUDIO_CONFIG = {
    musicVolume: 0.3,
    sfxVolume: 0.5,
    hitSounds: ['hit1', 'hit2', 'hit3'],
    deathSounds: ['death1', 'death2'],
    spawnSound: 'spawn',
    waveStartSound: 'waveStart',
    victorySound: 'victory',
    defeatSound: 'defeat'
};

// Hero Configuration
const HERO_TYPES = {
    DRUID: {
        key: 'druid',
        name: 'Druid',
        quote: '"The forest answers my call."',
        color: 0x228B22,  // Forest green
        // Passive effects
        archerDamageBonus: 0.10,      // +10% archer damage
        enemySpeedReduction: 0.10,    // -10% enemy speed
        // Wave 20 ability
        abilityName: "Nature's Wrath",
        abilityDescription: 'Click to strike enemies with nature',
        abilityWave: 20,
        abilityRadius: 120,
        abilityDamage: 9999  // Instant kill
    },
    WARLORD: {
        key: 'warlord',
        name: 'Warlord',
        quote: '"Victory through steel and courage!"',
        color: 0xB22222,  // Firebrick red
        // Passive effects
        meleeDamageBonus: 0.15,       // +15% melee damage (peasants, horsemen)
        productionSpeedBonus: 0.15,   // -15% production time
        // Wave 20 ability
        abilityName: 'Battle Charge',
        abilityDescription: 'All units gain speed and damage',
        abilityWave: 20,
        abilitySpeedBoost: 0.50,      // +50% speed
        abilityDamageBoost: 0.25,     // +25% damage
        abilityDuration: 8000         // 8 seconds
    },
    ALCHEMIST: {
        key: 'alchemist',
        name: 'Alchemist',
        quote: '"Gold flows like water in capable hands."',
        color: 0xFFD700,  // Gold
        // Passive effects
        horsemenDamageBonus: 0.10,    // +10% horsemen damage
        unitCostReduction: 0.05,      // -5% unit costs
        // Wave 20 ability
        abilityName: 'Volatile Concoction',
        abilityDescription: 'Click to throw explosive potion',
        abilityWave: 20,
        abilityRadius: 150,
        abilityDamage: 9999  // Instant kill
    }
};
