# Game Configuration & Balance

All game constants are defined in `src/config/GameConfig.js`. This document explains each configuration section.

---

## Game Dimensions

```javascript
const GAME_WIDTH = 1024;
const GAME_HEIGHT = 600;
```

---

## Unit Types (Player Units)

Located in `UNIT_TYPES` object. Each unit has:

| Property | Description |
|----------|-------------|
| `key` | Internal identifier |
| `name` | Display name |
| `goldCost` | Gold required to spawn |
| `woodCost` | Wood required to spawn |
| `health` | Base HP |
| `damage` | Base damage per attack |
| `speed` | Movement speed (pixels/sec) |
| `attackSpeed` | Milliseconds between attacks |
| `range` | Attack range in pixels |
| `isRanged` | If true, shoots projectiles |
| `splashDamage` | If true, deals AoE damage |
| `splashRadius` | AoE radius (if splash) |
| `color` | Hex color for visuals |

### Unit Stats Table

| Unit | Gold | Wood | HP | DMG | Speed | Atk Speed | Range | Type |
|------|------|------|-----|-----|-------|-----------|-------|------|
| Peasant | 10 | 10 | 14 | 4 | 88 | 1000ms | 30 | Melee |
| Archer | 25 | 20 | 18 | 6 | 66 | 1500ms | 200 | Ranged |
| Knight | 60 | 40 | 43 | 11 | 61 | 1200ms | 35 | Melee |
| Giant | 120 | 80 | 86 | 20 | 61 | 2000ms | 45 | Melee |

### Unit Roles

- **Peasant**: Cheap frontline, fast to spawn, expendable
- **Archer**: Back-line DPS, stays behind melee units
- **Knight**: Tank, forms front line, high survivability
- **Giant**: Heavy tank, slow but powerful

---

## Enemy Types

Located in `ENEMY_TYPES` object. Similar stats to units plus:

| Property | Description |
|----------|-------------|
| `goldReward` | Gold dropped on death |
| `woodReward` | Wood dropped on death |
| `isBoss` | If true, applies boss multipliers |

### Enemy Stats Table (40% easier than original)

| Enemy | HP | DMG | Speed | Range | Gold | Wood | Appears |
|-------|-----|-----|-------|-------|------|------|---------|
| Goblin | 9 | 2 | 85 | 25 | 1 | 1 | Wave 1+ |
| Orc | 24 | 3 | 55 | 30 | 1 | 1 | Wave 1+ |
| Skeleton | 17 | 3 | 65 | 28 | 1 | 1 | Wave 4+ |
| Skeleton Archer | 15 | 6 | 50 | 180 | 2 | 1 | Wave 6+ |
| Spear Monster | 18 | 8 | 75 | 200 | 2 | 1 | Wave 7+ |
| Troll | 90 | 12 | 35 | 40 | 3 | 2 | Wave 8+ |
| Dark Knight | 60 | 9 | 55 | 35 | 3 | 2 | Wave 12+ |
| Demon | 120 | 15 | 45 | 35 | 5 | 3 | Wave 18+ |
| Dragon (Boss) | 300 | 9999 | 40 | 150 | 15 | 10 | Every 10 waves |

*Note: All enemy HP and damage reduced by 40% from original values for easier gameplay. Wave 1 now includes both Goblins and Orcs for a harder start.*

---

## Wave Configuration

Located in `WAVE_CONFIG`:

```javascript
const WAVE_CONFIG = {
    baseGoldReward: 30,       // Gold for completing wave 1
    baseWoodReward: 20,       // Wood for completing wave 1
    goldPerWave: 10,          // Additional gold per wave number
    woodPerWave: 8,           // Additional wood per wave number
    timeBetweenWaves: 3000,   // 3 seconds between waves
    spawnInterval: 1000,      // Base spawn interval (decreases at higher waves)
    // Tiered scaling system (increases every 20 waves)
    scalingTierSize: 20,        // Waves per tier
    baseScalingPercent: 0.03,   // Starting at 3% per wave
    scalingIncrement: 0.03,     // +3% more per tier
    diminishingRewardsWave: 25,  // Rewards diminish after this wave
    rewardDiminishRate: 0.9      // 10% less reward per wave after threshold
};
```

### Wave Rewards Formula
- Gold reward = `30 + (waveNumber * 10)`
- Wood reward = `20 + (waveNumber * 8)`
- After wave 25: rewards diminish by 10% per wave

### Enemy Scaling (Tiered System)
Enemies get stronger each wave using a tiered scaling system that increases every 20 waves:

| Wave Range | Scaling Per Wave | Example: Wave 40 Enemy |
|------------|------------------|------------------------|
| 1-20 | +3% HP/DMG | Base × 1.57 |
| 21-40 | +6% HP/DMG | Base × 2.77 |
| 41-60 | +9% HP/DMG | (continues) |
| 61-80 | +12% HP/DMG | (continues) |
| 81+ | +15% HP/DMG | (continues) |

The scaling compounds - later waves use higher percentages for ALL waves in that tier.

### Spawn Speed Scaling
Higher waves spawn enemies faster to keep action intense:

| Wave | Burst Size | Spawn Interval |
|------|------------|----------------|
| 1-5 | 1 enemy | ~1.0s |
| 6-10 | 2 enemies | ~0.7s |
| 11-15 | 3 enemies | ~0.5s |
| 16+ | 4 enemies | ~0.4s |

---

## Boss Configuration

Located in `BOSS_CONFIG`:

```javascript
const BOSS_CONFIG = {
    spawnEveryWaves: 10,      // Boss appears wave 10, 20, 30...
    healthMultiplier: 1.25,   // 1.25x base HP (much easier now)
    damageMultiplier: 1.25,   // 1.25x base damage (reduced for balance)
    sizeMultiplier: 0.75      // 0.75x visual size (was 1.5x)
};
```

### Dragon Boss Stats (with multipliers)
- Base HP: 300 × 1.25 = **~375 HP**
- Base Damage: 24 × 1.25 = **~30 damage**
- Ranged attack with fireballs

---

## Upgrade Configuration

Located in `UPGRADE_CONFIG`:

```javascript
const UPGRADE_CONFIG = {
    maxLevel: 10,             // Maximum upgrade level
    costMultiplier: 1.5,      // XP cost scaling
    // Exponential bonus formula:
    // HP bonus = 2^(level-1) - 1
    // DMG bonus = 2^level - 2
};
```

### Upgrade Costs (XP)
- Level 1→2: 1 XP
- Level 2→3: 2 XP
- Level 3→4: 3 XP
- ... continues to level 10

### Unit Unlock Costs (XP)
- Knight: 2 XP
- Giant: 3 XP

### Exponential Stats System
Upgrades now use **exponential growth** - each level doubles the previous bonus!

| Level | HP Bonus | DMG Bonus | Per-Level HP | Per-Level DMG |
|-------|----------|-----------|--------------|---------------|
| 1 | +0 | +0 | - | - |
| 2 | +1 | +2 | +1 | +2 |
| 3 | +3 | +6 | +2 | +4 |
| 4 | +7 | +14 | +4 | +8 |
| 5 | +15 | +30 | +8 | +16 |
| 6 | +31 | +62 | +16 | +32 |
| 7 | +63 | +126 | +32 | +64 |
| 8 | +127 | +254 | +64 | +128 |
| 9 | +255 | +510 | +128 | +256 |
| 10 | +511 | +1022 | +256 | +512 |

### Example: Peasant (Base 25 HP, 5 DMG)
| Level | HP | DMG |
|-------|-----|------|
| 1 | 25 | 5 |
| 5 | 40 | 35 |
| 10 | 536 | 1027 |

Upgrades become **extremely powerful** at higher levels!

---

## Castle Configuration

Located in `CASTLE_CONFIG`:

```javascript
const CASTLE_CONFIG = {
    playerHealth: 100,        // Starting castle HP
    playerX: 180,             // Castle X position
    defenseLineX: 280,        // Where units defend
    defenseMinY: 80,          // Top boundary
    defenseMaxY: 520,         // Bottom boundary
    maxLevel: 10,             // Max castle upgrade level
    upgradeGoldBase: 100,     // Base gold cost
    upgradeWoodBase: 75,      // Base wood cost
    upgradeCostMultiplier: 1.15 // 15% more per level
};
```

**Note:** Castle does NOT shoot arrows at level 1. Arrow defense begins at level 2.

---

## Resource Configuration

Located in `RESOURCE_CONFIG`:

```javascript
const RESOURCE_CONFIG = {
    startingGold: 50,         // Gold at game start
    startingWood: 50,         // Wood at game start
    mineGoldAmount: 5,        // Gold per mine tick
    mineWoodAmount: 5,        // Wood per mine tick
    mineInterval: 2000,       // Mine ticks every 2 seconds
    goldMineX: 140,           // Gold mine position
    goldMineY: 100,
    woodMineX: 220,           // Wood mill position
    woodMineY: 530
};
```

### Mining Speed
- Base mining speed: 50
- Castle level bonus: +10% per level
- Mining rate displayed every 2 seconds while hovering over mines

---

## Spawn Configuration

Located in `SPAWN_CONFIG`:

```javascript
const SPAWN_CONFIG = {
    rightSpawn: { x: GAME_WIDTH + 30, minY: 80, maxY: 520 },
    topRightSpawn: { minX: 600, maxX: GAME_WIDTH - 50, y: -30 },
    topSpawn: { minX: 300, maxX: 700, y: -30 },
    bottomRightSpawn: { minX: 600, maxX: GAME_WIDTH - 50, y: GAME_HEIGHT + 30 },
    bottomSpawn: { minX: 300, maxX: 700, y: GAME_HEIGHT + 30 }
};
```

### Spawn Direction by Wave
- **Wave 1-2**: All enemies from right
- **Wave 3+**: Some enemies from top (30% chance, increases)
- **Wave 5+**: Some enemies from bottom (30% chance, increases)
- **Bosses**: Always spawn from right

---

## Audio Configuration

Located in `AUDIO_CONFIG`:

```javascript
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
```

---

## Balance Tips

### Making the game easier:
- Increase `RESOURCE_CONFIG.startingGold/Wood`
- Decrease `WAVE_CONFIG.enemyHealthScaling`
- Decrease `BOSS_CONFIG.healthMultiplier`
- Increase unit damage/health in `UNIT_TYPES`

### Making the game harder:
- Decrease wave rewards in `WAVE_CONFIG`
- Increase enemy stats in `ENEMY_TYPES`
- Decrease `WAVE_CONFIG.timeBetweenWaves`
- Increase spawn frequency

---

*File: `src/config/GameConfig.js`*
