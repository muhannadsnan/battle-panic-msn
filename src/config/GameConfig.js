// Game Constants and Configuration
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
        health: 25,
        damage: 5,
        speed: 80,
        attackSpeed: 1000,
        range: 30,
        color: 0x8B4513,
        description: 'Cheap melee fighter'
    },
    ARCHER: {
        key: 'archer',
        name: 'Archer',
        goldCost: 25,
        woodCost: 20,
        health: 20,
        damage: 7,
        speed: 60,
        attackSpeed: 1500,
        range: 200,
        isRanged: true,
        color: 0x228B22,
        description: 'Ranged, decent damage'
    },
    KNIGHT: {
        key: 'knight',
        name: 'Knight',
        goldCost: 60,
        woodCost: 40,
        health: 60,
        damage: 12,
        speed: 50,
        attackSpeed: 1200,
        range: 35,
        color: 0x4169E1,
        description: 'Tough armored warrior'
    },
    WIZARD: {
        key: 'wizard',
        name: 'Wizard',
        goldCost: 80,
        woodCost: 50,
        health: 30,
        damage: 16,
        speed: 40,
        attackSpeed: 2000,
        range: 180,
        isRanged: true,
        splashDamage: true,
        splashRadius: 50,
        color: 0x9932CC,
        description: 'Splash damage mage'
    },
    GIANT: {
        key: 'giant',
        name: 'Giant',
        goldCost: 120,
        woodCost: 80,
        health: 120,
        damage: 22,
        speed: 30,
        attackSpeed: 2000,
        range: 45,
        color: 0x8B0000,
        description: 'Massive tank unit'
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
        health: 300,
        damage: 24,
        speed: 40,
        attackSpeed: 2000,
        range: 150,
        isRanged: true,
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
    // Enemy scaling per wave (reduced for easier gameplay)
    enemyHealthScaling: 0.08,  // Was 0.12, now +8% HP per wave
    enemyDamageScaling: 0.06   // Was 0.10, now +6% damage per wave
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
    upgradeCostBase: 40, // Reasonable base cost
    upgradeCostMultiplier: 1.5 // Gentler scaling
};

// Resource Configuration
const RESOURCE_CONFIG = {
    startingGold: 50,   // Starting resources
    startingWood: 50,
    mineGoldAmount: 5,  // Less per mine (was 8)
    mineWoodAmount: 5,
    mineInterval: 2000,
    goldMineX: 140,     // Moved right for space from unit bar
    goldMineY: 100,
    woodMineX: 220,     // Moved farther right
    woodMineY: 530      // Bottom area
};

// Spawn Configuration - enemies spawn from edges, pushed to the sides (not center)
const SPAWN_CONFIG = {
    rightSpawn: { x: GAME_WIDTH + 30, minY: 80, maxY: 520 },
    topRightSpawn: { minX: 650, maxX: GAME_WIDTH - 30, y: -30 },
    topSpawn: { minX: 550, maxX: GAME_WIDTH - 50, y: -30 },  // Right side of top
    bottomRightSpawn: { minX: 650, maxX: GAME_WIDTH - 30, y: GAME_HEIGHT + 30 },
    bottomSpawn: { minX: 550, maxX: GAME_WIDTH - 50, y: GAME_HEIGHT + 30 }  // Right side of bottom
};

// Boss Configuration
const BOSS_CONFIG = {
    spawnEveryWaves: 10,
    healthMultiplier: 2.5, // Reduced again - bosses now 1/4 original strength
    damageMultiplier: 1.25, // Halved again - dragon hits castle less hard
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
