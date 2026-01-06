# Game Systems

Core systems that handle game logic, data persistence, and audio.

---

## CombatSystem

**File:** `src/systems/CombatSystem.js`

Handles targeting, damage calculation, and combat effects.

### Class: `CombatSystem`

#### Constructor
```javascript
new CombatSystem(scene)
```

#### Methods

**`findTarget(attacker, potentialTargets)`**
Finds the closest valid target from an array:
- Filters out dead/inactive targets
- Returns target with minimum distance
- Returns `null` if no valid targets

**`isInRange(attacker, target, range)`**
Returns `true` if target is within attack range.

**`dealDamage(attacker, target, damage)`**
Applies damage to target:
1. Calls `target.takeDamage(damage)`
2. Plays hit sound (sword or arrow)
3. Shows floating damage number

**`dealSplashDamage(attacker, centerX, centerY, damage, radius, targets)`**
AoE damage for Wizard attacks:
- Hits all targets within radius
- Damage falls off with distance: `damage * (1 - distance/radius * 0.5)`
- Plays magic sound effect

**`showDamageNumber(x, y, damage)`**
Creates floating red `-damage` text that fades upward.

**`showHealNumber(x, y, amount)`**
Creates floating green `+amount` text that fades upward.

**`getStatsWithUpgrades(baseStats, upgradeLevel)`**
Calculates final unit stats with **exponential** upgrade bonuses:
```javascript
hpBonus = 2^(level-1) - 1    // +1, +3, +7, +15, +31...
dmgBonus = 2^level - 2       // +2, +6, +14, +30, +62...
health = baseHealth + hpBonus
damage = baseDamage + dmgBonus
attackSpeed = baseAttackSpeed - (level-1) * 30  // min 300ms
```

---

## WaveSystem

**File:** `src/systems/WaveSystem.js`

Manages enemy wave generation and spawning.

### Class: `WaveSystem`

#### Constructor
```javascript
new WaveSystem(scene)
```

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `currentWave` | number | Current wave number |
| `enemiesRemaining` | number | Enemies left in wave |
| `enemiesSpawned` | number | Enemies spawned so far |
| `enemiesToSpawn` | array | Queue of enemies to spawn |
| `isSpawning` | boolean | Currently spawning |
| `waveInProgress` | boolean | Wave active |

#### Methods

**`generateWave(waveNumber)`**
Creates enemy list for a wave:

| Enemy | Appears | Count Formula |
|-------|---------|---------------|
| Goblin | Wave 1+ | `(2 + wave * 0.5) * mult` |
| Orc | Wave 2+ | `(1 + wave * 0.4) * mult` |
| Skeleton | Wave 4+ | `(wave - 2) * 0.4 * mult` |
| Skeleton Archer | Wave 6+ | `(wave - 4) * 0.35 * mult` |
| Troll | Wave 8+ | `(wave - 6) * 0.25 * mult` |
| Dark Knight | Wave 12+ | `(wave - 10) * 0.25 * mult` |
| Demon | Wave 18+ | `(wave - 16) * 0.2 * mult` |
| Dragon | Every 10 | 1 per 10 waves |

**Wave multiplier scaling:**
- Wave 1-3: Gentle (0.7 - 0.9)
- Wave 4-10: Moderate (1.0 - 1.84)
- Wave 11+: Aggressive (1.84+)

**`getRandomSpawnDirection(waveNumber)`**
Returns spawn direction:
- Wave 1-2: Always `'right'`
- Wave 3+: 30%+ chance of `'top'`
- Wave 5+: 30%+ chance of `'bottom'`

**`startWave()`**
Begins a new wave:
1. Increments `currentWave`
2. Generates enemy list
3. Notifies scene via `onWaveStart()`
4. Starts spawn timer

**`spawnNextEnemy()`**
Spawns enemies with burst spawning at higher waves:
1. Calculates burst size based on wave (1-4 enemies at once)
2. Pops enemies from `enemiesToSpawn`
3. Calls `scene.spawnEnemy(type, direction)` for each
4. Schedules next spawn (faster at higher waves)

**Burst Spawning:**
| Wave | Enemies per burst | Spawn interval |
|------|-------------------|----------------|
| 1-5 | 1 | ~1.0s |
| 6-10 | 2 | ~0.7s |
| 11-15 | 3 | ~0.5s |
| 16+ | 4 | ~0.4s |

**`onEnemyKilled()`**
Called when enemy dies:
1. Decrements `enemiesRemaining`
2. If 0 remaining and done spawning: `waveComplete()`

**`waveComplete()`**
Wave finished:
1. Calculates rewards
2. Notifies scene via `onWaveComplete(wave, gold, wood)`

**`scheduleNextWave()`**
Schedules next wave after `timeBetweenWaves` (8 seconds).

**`pause()` / `resume()`**
Pauses/resumes spawn and wave timers.

**`reset()`**
Resets all wave state to initial values.

---

## SaveSystem

**File:** `src/systems/SaveSystem.js`

Handles localStorage persistence for game progress.

### Class: `SaveSystem`

#### Save Data Structure
```javascript
{
    gold: 50,                    // Current gold (not used between games)
    xp: 0,                       // XP points for upgrades
    highestWave: 0,              // Best wave reached
    totalGoldEarned: 0,          // Lifetime gold
    totalEnemiesKilled: 0,       // Lifetime kills
    upgrades: {
        peasant: { level: 1, unlocked: true },
        archer: { level: 1, unlocked: true },
        knight: { level: 1, unlocked: false },
        wizard: { level: 1, unlocked: false },
        giant: { level: 1, unlocked: false }
    },
    castleUpgrades: {
        health: 1,               // +20 HP per level
        armor: 1,                // -5% damage per level
        goldIncome: 1            // +1 gold/sec per level
    },
    settings: {
        musicVolume: 0.5,
        sfxVolume: 0.7
    }
}
```

#### Methods

**`save(data)`**
Saves data to localStorage as JSON.

**`load()`**
Loads data from localStorage, merges with defaults for new fields.

**`reset()`**
Deletes all save data, returns defaults.

**`updateHighScore(wave, goldEarned, enemiesKilled)`**
Called after game over:
1. Updates `highestWave` if new record
2. Adds to `totalGoldEarned` and `totalEnemiesKilled`
3. Awards XP: `floor(wave / 10)` per game

**`calculateSpentXP(data)`**
Calculates total XP invested in upgrades:
- Unit levels: `sum(1 to level-1)` per unit
- Unlock costs: Knight=2, Wizard=3, Giant=5
- Castle upgrades: Same formula

**`resetUpgrades()`**
Resets upgrades and refunds XP:
1. Calculates spent XP
2. Subtracts 2 XP fee
3. Refunds remaining to player
4. Resets all upgrades to defaults
5. Keeps stats (highestWave, etc.)

**`addXP(amount)`**
Adds XP to save data (for purchases).

---

## AudioManager

**File:** `src/systems/AudioManager.js`

Manages sound effects and music playback.

### Class: `AudioManager`

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `scene` | Scene | Current Phaser scene |
| `sounds` | object | Loaded sound objects |
| `musicVolume` | number | 0-1 volume |
| `sfxVolume` | number | 0-1 volume |
| `isMuted` | boolean | Mute state |

#### Sound Effect Methods

| Method | Description |
|--------|-------------|
| `playClick()` | UI button click |
| `playSpawn()` | Unit spawned |
| `playSwordHit()` | Melee attack |
| `playArrow()` | Arrow shot |
| `playMagic()` | Magic attack |
| `playHit()` | Generic hit |
| `playDeath()` | Entity death |
| `playWaveStart()` | Wave begins |
| `playVictory()` | Game won |
| `playDefeat()` | Game lost |

#### Music Methods

**`startMusic()`**
Starts procedural background music with looping.

**`stopMusic()`**
Stops current music and clears interval.

**`pauseMusic()`**
Pauses music playback (used when game is paused).

**`resumeMusic()`**
Resumes music playback after pause.

**`setMusicVolume(volume)`**
Sets music volume (0-1).

**`setSFXVolume(volume)`**
Sets sound effect volume (0-1).

**`toggleMute()`**
Toggles all audio on/off.

---

## System Interactions

```
┌─────────────┐     spawns      ┌─────────────┐
│ WaveSystem  │ ───────────────→│   Enemy     │
└─────────────┘                 └─────────────┘
       │                              │
       │ onEnemyKilled()              │ attacks
       │                              ↓
       │                        ┌─────────────┐
       │                        │   Castle    │
       │                        │   or Unit   │
       │                        └─────────────┘
       │                              │
       │                              │ takeDamage()
       │                              ↓
       │                        ┌─────────────┐
       └───────────────────────→│CombatSystem │
                                └─────────────┘
                                      │
                                      │ plays sound
                                      ↓
                                ┌─────────────┐
                                │AudioManager │
                                └─────────────┘
```

### Game Over Flow
```
Castle HP <= 0
      ↓
GameScene.onCastleDestroyed()
      ↓
SaveSystem.updateHighScore(wave, gold, kills)
      ↓
Awards XP: floor(wave / 10)
      ↓
Transition to GameOverScene
```

---

*Files: `src/systems/*.js`*
