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
Reduces health, updates health bar, triggers death if HP <= 0

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
- Awards gold/wood to player
- Plays death animation
- Notifies WaveSystem via `onEnemyKilled()`

#### Enemy Sprites
Each enemy type has unique visuals:
- `createGoblin()` - Small green creature
- `createOrc()` - Large green warrior
- `createSkeleton()` - Bone warrior
- `createSkeletonArcher()` - Skeleton with bow
- `createTroll()` - Massive beast
- `createDarkKnight()` - Evil knight
- `createDemon()` - Winged demon
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

#### Arrow Attack System
The castle automatically shoots arrows at nearby enemies:
- **Range**: 300 pixels
- **Base Damage**: 5 (scales with level)
- **Base Attack Speed**: 2000ms (scales with level)
- Arrows shoot from random tower (left, right, or center)

#### Stats by Level
| Level | Arrow Damage | Attack Speed | HP Bonus |
|-------|--------------|--------------|----------|
| 1 | 5 | 2.0s | +0 |
| 5 | 13 | 1.6s | +100 |
| 10 | 23 | 1.0s | +225 |

#### Key Methods

**`update(time, delta)`**
- Finds closest enemy in range
- Shoots arrow if target found and cooldown ready

**`shootArrow(time)`**
- Creates arrow projectile from random tower
- Plays arrow sound

**`takeDamage(amount)`**
- Applies armor reduction from upgrades
- Updates health bar
- Triggers screen shake
- If HP <= 0: triggers `onCastleDestroyed()`

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
| `projectileType` | string | 'arrow', 'magic', 'fireball' |

#### Projectile Types

**Arrow** (Archer)
- Simple pointed shaft
- Fast, single target

**Magic** (Wizard)
- Glowing orb with particle trail
- Can have splash damage

**Fireball** (Dragon Boss)
- Large flaming sphere
- Animated glow effect

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
