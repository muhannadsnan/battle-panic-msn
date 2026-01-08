# Game Entities

Entities are the interactive game objects: player units, enemies, the castle, and projectiles.

---

## Unit (Player Units)

**File:** `src/entities/Unit.js`

Units are player-controlled defenders spawned during gameplay.

### Class: `Unit extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new Unit(scene, x, y, unitType, upgradeLevel = 1)
```

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `unitType` | string | PEASANT, ARCHER, KNIGHT, WIZARD, GIANT |
| `upgradeLevel` | number | Current upgrade level (1-5) |
| `maxHealth` | number | Maximum HP |
| `currentHealth` | number | Current HP |
| `damage` | number | Attack damage |
| `speed` | number | Movement speed |
| `attackSpeed` | number | MS between attacks |
| `range` | number | Attack range (pixels) |
| `isRanged` | boolean | Shoots projectiles |
| `splashDamage` | boolean | Deals AoE damage |
| `splashRadius` | number | AoE radius |
| `isDead` | boolean | Death state |
| `target` | Enemy/null | Current attack target |
| `isAttacking` | boolean | Currently attacking |
| `defenseX/Y` | number | Assigned defense position |
| `direction` | number | 1=right, -1=left |

#### Key Methods

**`update(time, delta)`**
Main update loop:
1. Find target if none exists
2. If target in range: attack
3. If target out of range: move toward target
4. If no target: return to defense position
5. Separate from allies to avoid stacking
6. Update walking animation

**`assignDefensePosition()`**
Assigns where unit stands when idle:
- Ranged units (Archer, Wizard): Behind defense line
- Melee units (Peasant): Middle ground
- Tanks (Knight, Giant): Front line

**`attack(time)`**
Performs attack:
- Melee: Direct damage via CombatSystem
- Ranged: Creates Projectile

**`takeDamage(amount)`**
Reduces health, updates health bar, plays hit sound, triggers death if HP <= 0

**`die()`**
- Sets `isDead = true`
- Plays death animation
- Notifies scene via `onUnitDied()`

#### Unit Sprites
Each unit type has a detailed sprite made of rectangles:
- `createPeasant()` - Farmer with pitchfork
- `createArcher()` - Hooded ranger with bow
- `createKnight()` - Armored warrior with sword/shield
- `createWizard()` - Robed mage with glowing staff
- `createGiant()` - Large brute with spiked club

#### Animation System
Units have animated body parts stored in `this.bodyParts`:
- `leftLeg`, `rightLeg` - Walking animation
- `torso` - Body bobbing
- `leftArm`, `rightArm` - Arm swing
- `weapon` - Attack swing

#### Unit Promotion System
Units get promoted based on how many of that type have been spawned in the current game.

**Promotion Levels:**
| Level | Spawns | Badge | Total Bonus |
|-------|--------|-------|-------------|
| 0 | 0-9 | None | +0% |
| 1 | 10-19 | ▲ Silver | +10% |
| 2 | 20-29 | ▲▲ Silver | +30% |
| 3 | 30-49 | ▲▲▲ Silver | +60% |
| 4 | 50-79 | ▲ Gold | +100% |
| 5 | 80-119 | ▲▲ Gold | +150% |
| 6 | 120+ | ▲▲▲ Gold | +200% |

**Bonuses apply to:**
- HP (multiplied by bonus)
- Damage (multiplied by bonus)
- Attack Speed (faster by bonus)
- Range (Archers only: +10% per promotion level)

At max promotion (level 6), units have **3x stats** and **spawn 2 at a time** (costs double)!
Archers at max promotion get **+60% range**.

**Visual Indicators:**
- Military-style open V-shaped chevron badge next to each unit's HP bar
- Open V shape (two lines forming a V, open at the top)
- Chevrons stack vertically: 1, 2, or 3 chevrons
- Badge also shown on unit spawn button (top-right corner)
- Promotion notification shows in center of screen
- Silver chevrons for levels 1-3, Gold chevrons for levels 4-6
- HP bar is compact (20x3 pixels) to make room for badge

---

## Enemy

**File:** `src/entities/Enemy.js`

Enemies spawn in waves and attack the player's castle.

### Class: `Enemy extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new Enemy(scene, x, y, enemyType, waveNumber)
```

#### Properties
Similar to Unit, plus:
| Property | Type | Description |
|----------|------|-------------|
| `isBoss` | boolean | Is this a boss enemy |
| `goldReward` | number | Gold dropped on death |
| `woodReward` | number | Wood dropped on death |
| `bossScale` | number | Size multiplier for bosses |

#### Stat Scaling
Enemy stats scale with wave number:
```javascript
health = baseHealth * (1 + waveNumber * healthScaling)
damage = baseDamage * (1 + waveNumber * damageScaling)
```

Boss enemies get additional multipliers from `BOSS_CONFIG`.

#### Key Methods

**`update(time, delta)`**
1. Find nearest target (unit or castle)
2. If in range: attack
3. If not: move toward target
4. Update animations

**`getSpawnPosition(direction)`**
Returns spawn coordinates based on direction:
- `'right'` - Right edge of screen
- `'top'` - Top edge
- `'bottom'` - Bottom edge

**`die()`**
- Awards gold/wood to player based on enemy type
- Plays death animation
- Notifies WaveSystem via `onEnemyKilled()`

#### Kill Rewards by Enemy Type
| Enemy | Gold | Wood |
|-------|------|------|
| Goblin | 1 | 1 |
| Orc | 1 | 1 |
| Skeleton | 1 | 1 |
| Skeleton Archer | 2 | 1 |
| Spear Monster | 2 | 1 |
| Troll | 3 | 2 |
| Dark Knight | 3 | 2 |
| Demon | 5 | 3 |
| Dragon (Boss) | 15 × wave | 10 × wave |

*Boss rewards are multiplied by the current wave number (e.g., wave 10 = 150g, 100w)*

#### Enemy Sprites
Each enemy type has unique visuals:
- `createGoblin()` - Small green creature with dagger
- `createOrc()` - Large green warrior with battle axe
- `createSkeleton()` - Bone warrior with rusty sword
- `createSkeletonArcher()` - Hooded skeleton with bow
- `createSpearMonster()` - Tribal warrior with big spear, feather headdress, war paint
- `createTroll()` - Massive beast with wooden club
- `createDarkKnight()` - Evil armored knight with dark sword
- `createDemon()` - Winged demon with horns and claws
- `createDragon()` - Boss with crown, breathes fire

---

## Castle

**File:** `src/entities/Castle.js`

The player's base that must be defended. **Also shoots arrows at enemies!**

### Class: `Castle extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new Castle(scene, x, y)
```

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `maxHealth` | number | Maximum HP (from upgrades) |
| `currentHealth` | number | Current HP |
| `isDestroyed` | boolean | Game over state |
| `attackRange` | number | Arrow range (300px) |
| `attackSpeed` | number | MS between shots |
| `arrowDamage` | number | Damage per arrow |
| `level` | number | Castle upgrade level (1-10) |
| `hasFence` | boolean | Whether fence is active |
| `fenceMaxHealth` | number | Fence maximum HP |
| `fenceCurrentHealth` | number | Fence current HP |

#### Arrow Attack System
The castle automatically shoots arrows at nearby enemies **starting from level 2**:
- **Level 1**: No arrow defense (castle cannot attack)
- **Level 2+**: Arrow defense enabled
- **Range**: 300 pixels base (+10% per level)
- **Base Damage**: 5 (+2 per level)
- **Base Attack Speed**: 1000ms (-50ms per level, min 400ms)
- Arrows shoot from random tower (left, right, or center)

#### Stats by Level
| Level | Arrow Damage | Attack Speed | Range | HP Bonus |
|-------|--------------|--------------|-------|----------|
| 1 | - | - | - | +0 (no arrows) |
| 2 | 7 | 0.95s | 330px | +25 |
| 5 | 13 | 0.8s | 420px | +100 |
| 10 | 23 | 0.4s | 570px | +225 |

#### Mining Speed Bonus
Castle level also increases mining rate by 10% per level.

#### Fence System (Unlocked at Level 6)
At castle level 6, a defensive wooden fence appears in front of the castle.

**Fence Stats:**
| Level | Fence HP |
|-------|----------|
| 6 | 50 |
| 7 | 80 |
| 8 | 120 |
| 9 | 160 |
| 10 | 200 |

**Fence Behavior:**
- Enemies physically stop at the fence and attack it
- Enemies must destroy the fence before they can reach the castle
- Fence has its own health bar with "FENCE" label
- When destroyed, fence explodes into wooden debris
- On game reset, fence is recreated if castle level >= 6

**Visual:**
- Wooden palisade with vertical planks
- Horizontal crossbeams
- Pointed tops on each plank
- Metal reinforcements

#### Upgrade Benefits
- Upgrading castle restores HP to full
- Level badge displayed in center of castle
- At level 2+: Arrow defense enabled
- At level 6+: Fence is created/upgraded and repaired to full
- Upgrade cost: 100 gold + 75 wood base, +15% per level
- At level 10: Can REPAIR castle and fence for same cost as level 10 upgrade

#### Key Methods

**`update(time, delta)`**
- Finds closest enemy in range
- Shoots arrow if target found and cooldown ready

**`shootArrow(time)`**
- Creates arrow projectile from random tower
- Plays arrow sound

**`takeDamage(amount)`**
- If fence exists: damages fence first, plays hit sound, shakes fence
- If fence destroyed or no fence: damages castle
- Updates health bar
- Triggers screen shake
- If HP <= 0: triggers `onCastleDestroyed()`

**`createFence()`**
Creates the wooden fence visual and health bar in front of castle

**`destroyFence()`**
Destroys fence with debris explosion effect

**`heal(amount)`**
Restores HP (not currently used but available)

**`setLevel(level)`**
Updates castle level, scales attack stats and HP

#### Visual
Castle is drawn with rectangles forming:
- Three towers (left, right, center)
- Main wall with battlements
- Windows with animated glow
- Animated torches
- Flags with wave animation

---

## Projectile

**File:** `src/entities/Projectile.js`

Ranged attacks from units and enemies.

### Class: `Projectile extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new Projectile(scene, x, y, target, options)
```

**Options:**
| Option | Type | Description |
|--------|------|-------------|
| `damage` | number | Damage on hit |
| `speed` | number | Flight speed |
| `color` | hex | Projectile color |
| `isPlayerProjectile` | boolean | From unit or enemy |
| `splashDamage` | boolean | Deals AoE |
| `splashRadius` | number | AoE radius |
| `projectileType` | string | 'arrow', 'magic', 'fireball', 'spear' |

#### Projectile Types

**Arrow** (Archer, Castle)
- Simple pointed shaft with feathers
- Fast, single target

**Magic** (Wizard)
- Glowing orb with particle trail
- Can have splash damage

**Fireball** (Dragon Boss)
- Large flaming sphere
- Animated glow effect

**Spear** (Spear Monster)
- Big wooden shaft with stone spearhead
- Feather decorations
- Slight wobble while flying

#### Key Methods

**`update(time, delta)`**
1. Move toward target position
2. Rotate to face direction
3. Check if reached target
4. On hit: deal damage, handle splash, destroy self

**`createSplashEffect()`**
Visual explosion for AoE hits

---

## Entity Lifecycle

### Spawn Flow
```
User presses key → GameScene.spawnUnit()
                        ↓
              new Unit() created
                        ↓
              Added to scene.units group
                        ↓
              Update loop begins
```

### Death Flow
```
Entity.takeDamage() → HP <= 0
                          ↓
                   Entity.die()
                          ↓
              Death animation plays
                          ↓
              Notify relevant systems
                          ↓
              Entity.destroy()
```

---

## Collision & Targeting

Entities don't use Phaser's physics collisions directly. Instead:

1. **CombatSystem.findTarget()** - Finds nearest enemy in range
2. **CombatSystem.isInRange()** - Distance check for attacks
3. **Manual position updates** - Entities move via `this.x += ...`

This gives more control over combat behavior and formations.

---

*Files: `src/entities/*.js`*
