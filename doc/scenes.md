# Game Scenes

Phaser scenes that control different game states and screens.

---

## Scene Flow

```
BootScene → PreloadScene → MenuScene ←──────────────┐
                              │                      │
                    ┌─────────┴─────────┐           │
                    ↓                   ↓           │
              UpgradeScene         GameScene        │
                    │                   │           │
                    │                   ↓           │
                    │            GameOverScene ─────┘
                    │                   │
                    └───────────────────┘
```

---

## BootScene

**File:** `src/scenes/BootScene.js`

Minimal scene that runs first to set up basic game state.

### Purpose
- Initialize any global variables
- Set up loading screen basics
- Immediately transition to PreloadScene

### Lifecycle
```javascript
create() {
    this.scene.start('PreloadScene');
}
```

---

## PreloadScene

**File:** `src/scenes/PreloadScene.js`

Handles asset loading with progress display.

### Purpose
- Load all game assets (images, audio, fonts)
- Display loading progress bar
- Initialize AudioManager

### Assets Loaded
Currently uses procedural graphics (no external assets), but structure supports:
- Sprite sheets
- Audio files
- JSON data

### Lifecycle
```javascript
preload() {
    // Load assets
    // Show progress bar
}

create() {
    // Initialize audio
    this.scene.start('MenuScene');
}
```

---

## MenuScene

**File:** `src/scenes/MenuScene.js`

Main menu with navigation and monetization.

### UI Elements

| Element | Position | Action |
|---------|----------|--------|
| Title "BATTLE PANIC" | Top center | Animated bounce |
| Subtitle | Below title | Static |
| Rank display | Center | Shows rank, grade, progress |
| Stats display | Center | Shows highest wave |
| PLAY button | Center | Starts GameScene |
| UPGRADES button | Center | Opens UpgradeScene |
| TIPS & INFO button | Center | Opens tips modal |
| Reset Upgrades | Bottom center | Opens reset dialog |
| Settings gear | Top left | Opens account panel |
| Buy XP ($2) | Bottom left | Disabled (Coming Soon) |
| Buy Me a Coffee | Bottom right | Opens donation page |

### Methods

**`create()`**
Sets up all UI elements:
1. Starfield background animation
2. Animated title
3. Load and display save stats
4. Create interactive buttons

**`createButton(x, y, text, callback)`**
Creates main menu button with hover effects:
- Scale animation on hover
- Color change on hover
- Click animation

**`createSmallButton(x, y, text, callback)`**
Smaller text button for secondary actions.

**`createCoffeeButton(x, y)`**
Buy Me a Coffee button with:
- Coffee cup icon (animated steam)
- Links to: `buymeacoffee.com/masterassassin`

**`createBuyXPButton(x, y)`**
XP purchase button (currently disabled):
- Greyed out star icon
- Shows "10 XP for $2"
- "Coming Soon" label
- Not interactive

**`confirmResetUpgrades()`**
Reset confirmation dialog:
- Shows XP in upgrades
- Shows fee (2 XP)
- Shows refund amount
- RESET / CANCEL buttons

---

## GameScene

**File:** `src/scenes/GameScene.js`

Main gameplay scene with combat and resource management.

### Systems Initialized
- `CombatSystem` - Combat logic
- `WaveSystem` - Enemy waves

### Groups
- `this.units` - Player units
- `this.enemies` - Enemy units
- `this.projectiles` - All projectiles

### UI Components
- `ResourceDisplay` - Gold/wood at top
- `WaveDisplay` - Wave number
- `UnitButton[]` - Unit spawn buttons
- Castle health bar

### Key Methods

**`create()`**
1. Load save data for upgrades
2. Create systems
3. Create castle
4. Set up resource mines
5. Create UI
6. Set up input handlers
7. Start first wave

**`update(time, delta)`**
Main game loop:
1. Update all units
2. Update all enemies
3. Update all projectiles
4. Update resource generation
5. Check game over condition

**`spawnUnit(unitType)`**
Spawns a player unit:
1. Check if unlocked
2. Check gold/wood cost
3. Subtract resources
4. Create Unit at castle position
5. Add to units group

**`spawnEnemy(enemyType, direction)`**
Spawns enemy (called by WaveSystem):
1. Get spawn position for direction
2. Create Enemy with wave scaling
3. Add to enemies group

**`onWaveStart(waveNumber, enemyCount)`**
Wave started callback:
- Update wave display
- Show wave announcement

**`onWaveComplete(wave, goldReward, woodReward)`**
Wave completed callback:
- Add rewards to resources
- Show completion message (top, 5 seconds)
- Schedule next wave

**`onCastleDestroyed()`**
Game over callback:
1. Stop wave system
2. Calculate final stats
3. Update save data (awards XP)
4. Transition to GameOverScene

**`togglePause()`**
Pauses/resumes game:
- Pauses physics
- Pauses wave system
- Shows pause overlay

### Input Handling
| Key | Action |
|-----|--------|
| ESC / P | Toggle pause |
| M | Toggle music |
| Right-click | Toggle pause |

**Note:** Units are spawned by hovering over unit buttons (no keyboard shortcuts).

### Resource Generation
Mines generate resources every 2 seconds:
- Gold mine: +5 gold
- Wood mill: +5 wood
- Castle upgrade bonus: +1 gold/sec per level

### Wave Tips
Tips appear before challenging waves to help players prepare:

| Wave | Threat | Tip |
|------|--------|-----|
| 6 | Skeleton Archers | Ranged enemies, position tanks in front |
| 8 | Trolls | One-shot peasants, use Knights |
| 10 | Dragon Boss | Use Giants to tank |
| 12 | Dark Knights | High damage, use Wizards for splash |
| 18 | Demons | Need balanced army |
| 20, 30 | Scaled Dragons | Max promotion units needed |

- Game pauses when tip appears
- 3 second countdown before can close
- Resumes when player clicks CONTINUE

---

## UpgradeScene

**File:** `src/scenes/UpgradeScene.js`

Permanent upgrades using XP currency.

### Layout
```
┌─────────────────────────────────────────┐
│              UPGRADES                    │
│              ⭐ XP: 5                    │
├─────────────────────────────────────────┤
│           UNIT UPGRADES                  │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐│
│  │Peas │ │Arch │ │Knig │ │Wiza │ │Gian ││
│  │Lv 2 │ │Lv 1 │ │ 🔒  │ │ 🔒  │ │ 🔒  ││
│  │[Upg]│ │[Upg]│ │[Unl]│ │[Unl]│ │[Unl]││
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘│
├─────────────────────────────────────────┤
│          CASTLE UPGRADES                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ │
│  │❤️ Health │ │🛡️ Armor  │ │💰 Income │ │
│  │  Lv 1    │ │  Lv 1    │ │  Lv 1    │ │
│  │ [1 XP]   │ │ [1 XP]   │ │ [1 XP]   │ │
│  └──────────┘ └──────────┘ └──────────┘ │
├─────────────────────────────────────────┤
│ [← Back]                                 │
└─────────────────────────────────────────┘
```

### Unit Cards
Each unit card shows:
- Unit icon (procedural sprite)
- Unit name
- Current level
- HP/DMG stats
- Upgrade button (if unlocked)
- Unlock button (if locked)
- Lock overlay (if locked)

### Button States
- **Affordable**: Bright green, pulsing glow
- **Not affordable**: Dark gray, no interaction

### Methods

**`createUnitCard(x, y, unitType)`**
Creates upgrade card for a unit type.

**`createCastleUpgradeCard(x, y, upgrade)`**
Creates upgrade card for castle stat.

**`createCardButton(x, y, text, callback, enabled)`**
Creates interactive button with state styling.

**`purchaseUpgrade(unitKey, cost)`**
Buys unit upgrade:
1. Subtract XP
2. Increment level
3. Save and restart scene

**`unlockUnit(unitKey, cost)`**
Unlocks a unit:
1. Subtract XP
2. Set unlocked = true
3. Save and restart scene

**`purchaseCastleUpgrade(upgradeKey, cost)`**
Buys castle upgrade.

---

## GameOverScene

**File:** `src/scenes/GameOverScene.js`

End screen showing results and stats.

### Data Received
```javascript
{
    wave: number,        // Final wave reached
    goldEarned: number,  // Gold earned this game
    enemiesKilled: number,
    xpEarned: number     // XP awarded (max 3, based on rank divisor)
}
```

### UI Elements
- "GAME OVER" title (red, if lost)
- "VICTORY" title (gold, if won - not implemented)
- Stats panel:
  - Wave Reached
  - Enemies Killed
  - Gold Earned
  - XP Earned
- "PLAY AGAIN" button → GameScene
- "MAIN MENU" button → MenuScene

### XP Award Display
Shows "+X XP!" with star display (max 3 stars).
XP earned based on rank divisor (Recruit: wave/3, Soldier: wave/6, etc.)

---

## Scene Data Passing

Scenes can pass data using Phaser's scene system:

```javascript
// Sending data
this.scene.start('GameOverScene', { wave: 15, gold: 500 });

// Receiving data
create(data) {
    this.resultData = data;
}
```

---

## Scene Registry

All scenes are registered in `src/main.js`:

```javascript
scene: [
    BootScene,
    PreloadScene,
    MenuScene,
    GameScene,
    UpgradeScene,
    GameOverScene
]
```

---

*Files: `src/scenes/*.js`*
