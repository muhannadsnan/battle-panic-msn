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
// BALANCE: Early enemies are weaker to give player time to build up
const ENEMY_TYPES = {
    GOBLIN: {
        key: 'goblin',
        name: 'Goblin',
        health: 15,
        damage: 3,
        speed: 85,
        attackSpeed: 900,
        range: 25,
        goldReward: 6,
        woodReward: 4,
        color: 0x32CD32
    },
    ORC: {
        key: 'orc',
        name: 'Orc',
        health: 40,
        damage: 6,
        speed: 55,
        attackSpeed: 1100,
        range: 30,
        goldReward: 14,
        woodReward: 10,
        color: 0x556B2F
    },
    SKELETON: {
        key: 'skeleton',
        name: 'Skeleton',
        health: 28,
        damage: 5,
        speed: 65,
        attackSpeed: 1000,
        range: 28,
        goldReward: 10,
        woodReward: 6,
        color: 0xD3D3D3
    },
    SKELETON_ARCHER: {
        key: 'skeleton_archer',
        name: 'Skeleton Archer',
        health: 25,
        damage: 10,
        speed: 50,
        attackSpeed: 1400,
        range: 180,
        isRanged: true,
        goldReward: 15,
        woodReward: 10,
        color: 0xA9A9A9
    },
    TROLL: {
        key: 'troll',
        name: 'Troll',
        health: 150,
        damage: 20,
        speed: 35,
        attackSpeed: 1800,
        range: 40,
        goldReward: 30,
        woodReward: 20,
        color: 0x2F4F4F
    },
    DARK_KNIGHT: {
        key: 'dark_knight',
        name: 'Dark Knight',
        health: 100,
        damage: 15,
        speed: 55,
        attackSpeed: 1100,
        range: 35,
        goldReward: 25,
        woodReward: 15,
        color: 0x1C1C1C
    },
    DEMON: {
        key: 'demon',
        name: 'Demon',
        health: 200,
        damage: 25,
        speed: 45,
        attackSpeed: 1500,
        range: 35,
        goldReward: 50,
        woodReward: 30,
        color: 0x8B0000
    },
    DRAGON: {
        key: 'dragon',
        name: 'Dragon',
        health: 500,
        damage: 40,
        speed: 40,
        attackSpeed: 2000,
        range: 150,
        isRanged: true,
        goldReward: 150,
        woodReward: 100,
        color: 0xFF4500,
        isBoss: true
    }
};

// Wave Configuration
const WAVE_CONFIG = {
    baseGoldReward: 30,       // Reduced from 40
    baseWoodReward: 20,       // Reduced from 30
    goldPerWave: 10,          // Reduced from 20
    woodPerWave: 8,           // Reduced from 15
    timeBetweenWaves: 8000,   // Faster waves
    spawnInterval: 1000,      // Faster enemy spawn
    // Enemy scaling per wave (makes late game harder)
    enemyHealthScaling: 0.12,  // +12% HP per wave
    enemyDamageScaling: 0.10   // +10% damage per wave
};

// Upgrade Configuration
const UPGRADE_CONFIG = {
    maxLevel: 5,
    costMultiplier: 1.8,
    statBoostPercent: 15
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

// Spawn Configuration - enemies spread across all edges
const SPAWN_CONFIG = {
    rightSpawn: { x: GAME_WIDTH + 30, minY: 80, maxY: 520 },
    topRightSpawn: { minX: 600, maxX: GAME_WIDTH - 50, y: -30 },
    topSpawn: { minX: 300, maxX: 700, y: -30 },
    bottomRightSpawn: { minX: 600, maxX: GAME_WIDTH - 50, y: GAME_HEIGHT + 30 },
    bottomSpawn: { minX: 300, maxX: 700, y: GAME_HEIGHT + 30 }
};

// Boss Configuration
const BOSS_CONFIG = {
    spawnEveryWaves: 10,
    healthMultiplier: 10,
    damageMultiplier: 10,
    sizeMultiplier: 1.5  // Reduced from 2.5
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
