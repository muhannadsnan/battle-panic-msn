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
- Skips enemies in spawn grace period (first 500ms)
- Returns target with minimum distance
- Returns `null` if no valid targets

**`isInRange(attacker, target, range)`**
Returns `true` if target is within attack range.

**`dealDamage(attacker, target, damage)`**
Applies damage to target with armor reductions:
1. **Horseman/Lancelot armor** - ranged/melee damage reduction
2. **Horseman Shield upgrade** - additional 50% damage reduction (stacks)
3. **Knight armor** - gold tier peasants get 25% damage reduction
4. **Robinhood armor** - gold tier archers get 15% damage reduction
5. Calls `target.takeDamage(finalDamage)`
6. Plays hit sound (sword, arrow, or orc hit)

**Horseman Shield Upgrade:**
When `specialUpgrades.horsemanShield` is active, all horsemen take 50% less damage. This stacks multiplicatively with Lancelot's innate armor.

**`dealSplashDamage(attacker, centerX, centerY, damage, radius, targets)`**
AoE damage for area attacks:
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
Creates enemy list for a wave. Uses `effectiveWave = waveNumber + 1` for wave offset (so wave 1 starts stronger):

| Enemy | Appears | Count Formula |
|-------|---------|---------------|
| Goblin | Wave 1+ | min 3, `(2 + effectiveWave * 0.6) * mult` |
| Orc | Wave 1+ | `(1 + effectiveWave * 0.5) * mult` |
| Skeleton | Wave 4+ | `(effectiveWave - 2) * 0.4 * mult` |
| Skeleton Archer | Wave 6+ | `(effectiveWave - 4) * 0.35 * mult` |
| Spear Monster | Wave 7+ | `(effectiveWave - 5) * 0.3 * mult` |
| Troll | Wave 8+ | `(effectiveWave - 6) * 0.25 * mult` |
| Dark Knight | Wave 12+ | `(effectiveWave - 10) * 0.25 * mult` |
| Demon | Wave 18+ | `(effectiveWave - 16) * 0.2 * mult` |
| Dragon | Every 10 | 1 per 10 waves |

**Wave multiplier scaling:**
- Wave 1-3: Gentle (0.8 - 1.1)
- Wave 4-10: Moderate (1.1 - 1.94)
- Wave 11+: Aggressive (1.94+)

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
| Wave | Base enemies per burst | Spawn interval |
|------|------------------------|----------------|
| 1-5 | 1 | ~1.0s |
| 6-10 | 2 | ~0.7s |
| 11-15 | 3 | ~0.5s |
| 16+ | 4 | ~0.4s |

**Rank-Based Spawn Scaling:**
Higher ranked players spawn more enemies at once, making waves complete faster:
| Rank Tier | Spawn Multiplier | Example (Wave 16+) |
|-----------|------------------|-------------------|
| Recruit | 1.0x | 4 enemies |
| Soldier | 1.15x | 5 enemies |
| Warrior | 1.3x | 6 enemies |
| Knight | 1.45x | 6 enemies |
| Captain | 1.6x | 7 enemies |
| Commander | 1.75x | 7 enemies |
| General | 1.9x | 8 enemies |
| Champion | 2.05x | 9 enemies |
| Legend | 2.2x | 9 enemies |
| Immortal | 2.35x | 10 enemies |

**`onEnemyKilled()`**
Called when enemy dies:
1. Decrements `enemiesRemaining`
2. If 0 remaining and done spawning: `waveComplete()`

**`waveComplete()`**
Wave finished:
1. Calculates rewards
2. Notifies scene via `onWaveComplete(wave, gold, wood)`

**`scheduleNextWave()`**
Shows a 5-second countdown (5, 4, 3, 2, 1) before starting the next wave.

**`startCountdown(seconds)`**
Displays countdown UI with pulse animation and plays click sound on each tick.

**`pause()` / `resume()`**
Pauses/resumes spawn and wave timers.

**`reset()`**
Resets all wave state to initial values.

---

## SaveSystem

**File:** `src/systems/SaveSystem.js`

Handles localStorage persistence for game progress with guest/user save separation and cloud sync support.

### Class: `SaveSystem`

#### Save Keys

| State | Key | Description |
|-------|-----|-------------|
| Guest | `battlePanicSave_guest` | Default for non-logged-in users |
| User | `battlePanicSave_{userId}` | User-specific save when logged in |
| Legacy | `battlePanicSave` | Old key, auto-migrated to guest |

#### Save Data Structure
```javascript
{
    gold: 50,                    // Current gold (not used between games)
    xp: 0,                       // XP points for upgrades
    purchasedXP: 0,              // XP bought with money (excluded from rank)
    highestWave: 0,              // Best wave reached
    totalGoldEarned: 0,          // Lifetime gold
    totalEnemiesKilled: 0,       // Lifetime kills
    killStats: {                 // Detailed kills per enemy type
        goblin: 0,
        orc: 0,
        skeleton: 0,
        skeleton_archer: 0,
        spear_monster: 0,
        troll: 0,
        dark_knight: 0,
        demon: 0,
        dragon: 0
    },
    stats: {                     // Lifetime stats for achievements
        totalBossesKilled: 0,
        totalGamesPlayed: 0,
        totalWavesCompleted: 0,
        longestSurvivalTime: 0,  // in seconds
        totalUnitsSpawned: 0,
        unitsSpawned: {          // Per-unit-type counts
            peasant: 0,
            archer: 0,
            horseman: 0
        },
        totalGoldCollected: 0,   // Total gold mined
        totalWoodCollected: 0,   // Total wood collected
        totalGoldSpent: 0,       // Total gold spent on units/upgrades
        totalWoodSpent: 0        // Total wood spent on units
    },
    upgrades: {
        peasant: { level: 1, unlocked: true },
        archer: { level: 1, unlocked: true },
        horseman: { level: 1, unlocked: false }
    },
    castleUpgrades: {
        health: 1,               // +20 HP per level (permanent) + unlocks +20 HP/wave at L2+
        armor: 1,                // -5% damage taken per level (permanent)
        goldIncome: 1            // +10% mining speed per level (permanent) - costs 2x XP!
    },
    specialUpgrades: {
        // Boolean upgrades (one-time purchase)
        eliteDiscount: false,        // Gold tier units spawn 2 for 1 (requires all units L5+)
        horsemanShield: false,       // Horsemen take 50% less damage (requires horseman unlocked)
        reinforcements: false,       // Enables reinforcement button (2-min timer)
        emergencyReinforcement: false, // Auto-spawn when castle HP < 50% (1x/battle)

        // Multi-level upgrades (0 = not purchased)
        productionSpeed: 0,          // 0-10: -5% unit spawn time per level
        productionCost: 0,           // 0-10: -5% unit cost per level
        unitSpeed: 0,                // 0-10: +5% movement speed per level
        reinforcementLevel: 0,       // 0-10: Better reinforcement units
        peasantPromoSkip: 0,         // 0-5: Start peasants at higher promotion
        archerPromoSkip: 0,          // 0-5: Start archers at higher promotion
        horsemanPromoSkip: 0,        // 0-5: Start horsemen at higher promotion
        castleExtension: 0,          // 0-10: +5 max castle level per level (up to 60)
        smarterUnits: 0              // 0-5: Units form multiple defense groups
    },
    // Legacy stats - NEVER reset, persist through account deletion
    legacy: {
        highestWaveEver: 0,          // Best wave across all resets
        totalGamesPlayedAllTime: 0,  // Lifetime games played
        totalEnemiesKilledAllTime: 0,// Lifetime enemy kills
        totalBossesKilledAllTime: 0, // Lifetime boss kills
        accountResets: 0,            // How many times player reset
        firstPlayedAt: null,         // Timestamp of first game
        lastResetAt: null            // Timestamp of last reset
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
Full reset for debugging - clears data but preserves legacy stats.

**`resetAccount()`**
Account reset (used by Delete Account button):
1. Preserves legacy stats and updates them with current progress
2. Preserves audio settings
3. Resets: XP, upgrades, rank, current stats
4. Increments `legacy.accountResets`
5. Updates `legacy.lastResetAt` timestamp

**`updateHighScore(wave, goldEarned, enemiesKilled, killStats, gameStats)`**
Called after game over:
1. Calculates XP divisor FIRST (based on rank at game start, not after stats update)
2. Updates `highestWave` if new record
3. Adds to `totalGoldEarned` and `totalEnemiesKilled`
4. Updates detailed `killStats` per enemy type
5. Updates lifetime `stats` (games played, waves completed, bosses killed, etc.)
6. Awards XP: `floor(wave / divisor)` - divisor based on player rank at game start

**`getXPDivisorForRank(data)`**
Returns XP divisor based on player rank (easier for new players, harder for veterans):

| Rank | Divisor | Min Wave for 1 XP |
|------|---------|-------------------|
| Recruit | 2 | 2 |
| Soldier | 3 | 3 |
| Warrior | 3 | 3 |
| Knight | 6 | 6 |
| Captain | 9 | 9 |
| Commander | 12 | 12 |
| General | 15 | 15 |
| Champion | 18 | 18 |
| Legend | 21 | 21 |
| Immortal | 24 | 24 |

**`calculateSpentXP(data)`**
Calculates total XP invested in upgrades:
- Unit levels: `sum(1 to level-1)` per unit
- Unlock costs: Knight=2
- Castle upgrades: Same formula

**`resetUpgrades()`**
Resets upgrades and refunds XP:
1. Calculates spent XP
2. Subtracts fee: **2 XP + 25% of current XP balance**
3. Refunds remaining to player
4. Resets all upgrades to defaults
5. Keeps stats (highestWave, etc.)

**`addXP(amount, isPurchased = true)`**
Adds XP to save data:
- `isPurchased = true`: Tracks as purchased XP (excluded from rank)
- `isPurchased = false`: Counts as earned XP (contributes to rank)

#### Cloud Sync Methods

**`setUserSaveKey(userId)`**
Switches save key based on login state:
- `userId` provided: Uses `battlePanicSave_{userId}`
- `null`: Uses `battlePanicSave_guest`

**`getSaveKey()`**
Returns current save key string.

**`isGuestSave()`**
Returns `true` if using guest save key.

**`syncWithCloud(guestDataForMigration = null)`**
Syncs with cloud (cloud is source of truth):
1. Loads cloud save
2. If no cloud save: uploads local data
3. If cloud exists: overwrites local with cloud
4. **Exception**: If `guestDataForMigration` provided, merges guest data first
5. Returns `{success, action: 'uploaded'|'loaded'|'merged'|'migrated', data}`

**`mergeCloudData(local, cloud)`**
Merges two save objects, taking maximum values for:
- `highestWave`, `totalGoldEarned`, `totalEnemiesKilled`, `xp`
- All `killStats` per enemy type
- All `stats` fields
- Upgrade levels (highest) and unlock states (OR)
- Castle upgrade levels (highest)
- Legacy stats (highest, earliest `firstPlayedAt`)

**`uploadToCloud()`**
Uploads current local save to Supabase.
Returns `{success, error?}`.

---

## SupabaseClient

**File:** `src/systems/SupabaseClient.js`

Handles Supabase authentication, cloud saves, and leaderboard.

See [auth.md](auth.md) for full documentation.

### Quick Reference

| Method | Description |
|--------|-------------|
| `init(url, key)` | Initialize Supabase client |
| `sendMagicLink(email)` | Send login email |
| `isLoggedIn()` | Check if user is logged in |
| `getUser()` | Get current user object |
| `logout()` | Sign out user |
| `saveToCloud(data)` | Upload save data |
| `loadFromCloud()` | Download save data |
| `updateLeaderboard(wave, kills)` | Update leaderboard entry |

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
| `playWarning()` | Not enough resources (two low beeps) |
| `playSpawn()` | Unit spawned |
| `playSwordHit()` | Melee attack |
| `playOrcHit()` | Heavy orc/troll attack |
| `playArrow()` | Arrow shot |
| `playMagic()` | Magic attack |
| `playHit()` | Generic hit |
| `playDeath()` | Entity death |
| `playGold()` | Gold mining complete |
| `playWood()` | Wood chopping complete |
| `playWaveStart()` | Wave begins |
| `playDefeat()` | Game over (sad descending notes) |

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
Awards XP: floor(wave / divisor)
  (divisor based on rank at game START: 2-24)
  (calculated before stats update to prevent rank-jump penalty)
      ↓
Transition to GameOverScene
```

---

*Files: `src/systems/*.js`*
