# Game Scenes

Phaser scenes that control different game states and screens.

---

## Scene Flow

```
BootScene → PreloadScene → MenuScene ←──────────────────┐
                              │                          │
                    ┌─────────┼─────────┐               │
                    ↓         ↓         ↓               │
              UpgradeScene AuthScene HeroSelectScene    │
                    │         │         │               │
                    │         │         ↓               │
                    │         │     GameScene           │
                    │         │         │               │
                    │         │         ↓               │
                    │         │  GameOverScene ─────────┘
                    │         │         │
                    └─────────┴─────────┘
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
| Rank display | Center | Shows rank, grade, progress. **Tap to view All Ranks** |
| Stats display | Center | Shows highest wave |
| PLAY button | Center | Starts GameScene |
| UPGRADES button | Center | Opens UpgradeScene |
| TIPS & INFO button | Center | Opens tips modal (9 pages, mobile-friendly) |
| Reset Upgrades | Bottom center | Opens reset dialog |
| Settings gear | Top left | Opens account panel |
| Buy XP ($2) | Bottom left | Disabled (Coming Soon) |
| Buy Me a Coffee | Bottom right | Opens donation page |
| Battlefield characters | Left & right sides | Decorative enemies/units |

### All Ranks Dialog
Shown when tapping the rank display panel:
- Lists all 10 rank tiers with icons and colors
- Shows grade indicators (I, II, III) for each rank
- Current rank highlighted with large pulsing arrow (▶)
- Current grade circled
- Completed ranks/grades shown dimmed
- Future ranks grayed out (including icons)

### Methods

**`createBattlefieldDisplay()`**
Displays decorative battlefield characters on menu:
- 4 random enemies on left side (staggered positions)
- 4 random player units on right side (staggered positions)
- All 8 enemy types and 5 unit types available
- Characters randomized each menu load
- Scale: 1.2-1.4x

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

## AuthScene

**File:** `src/scenes/AuthScene.js`

Login and profile management scene accessed from MenuScene.

### Purpose
- Magic link email authentication via Supabase
- Display user profile when logged in
- Cloud save sync controls

### UI States

**Not Logged In → Login Panel:**
- Email input field (HTML overlay)
- "Send Magic Link" button
- Back to menu button

**After Sending → Check Email Panel:**
- Confirmation message with email
- Resend button
- Back button

**Logged In → Profile Panel:**
- Display name
- Email address
- Cloud sync status
- Sync Now button
- Logout button
- Back to menu button

### Methods

**`showLoginPanel()`**
Displays email input form with magic link button.

**`showCheckEmailPanel(email)`**
Shows confirmation that email was sent.

**`showProfilePanel()`**
Shows user profile with sync controls.

**`sendMagicLink(email?)`**
Sends magic link via `supabaseClient.sendMagicLink()`:
1. Validates email format
2. Calls Supabase API
3. Shows check email panel on success

**`syncSaveData()`**
Manual cloud sync:
1. Gets local save from `saveSystem.load()`
2. Uploads to cloud via `supabaseClient.saveToCloud()`
3. Updates leaderboard
4. Shows success/failure message

**`logout()`**
Signs out user via `supabaseClient.logout()`:
1. Clears session
2. Switches to login panel
3. SaveSystem reverts to guest save key

**`createEmailInput()`**
Creates HTML input element positioned over canvas.

**`removeEmailInput()`**
Removes HTML input when leaving scene.

### Auth State Listener

Scene listens for `authStateChanged` events:
```javascript
window.addEventListener('authStateChanged', (event) => {
    const { user } = event.detail;
    // Update UI based on login state
    // Load cloud data on login
});
```

---

## HeroSelectScene

**File:** `src/scenes/HeroSelectScene.js`

Hero selection screen before battle.

### Purpose
- Allow player to choose a hero before starting battle
- Display hero name and pixel art portrait
- Pass selected hero to GameScene
- Detailed hero info (passives, abilities) available in Tips & Info panel

### Heroes

| Hero | Color | Passive Effects | Wave 20 Ability |
|------|-------|-----------------|-----------------|
| Druid | Green | +10% archer damage, -10% enemy speed | Nature's Wrath (AoE kill) |
| Warlord | Red | +15% melee damage, -15% production time | Battle Charge (8s buff) |
| Alchemist | Gold | +10% horsemen damage, -5% unit costs | Volatile Concoction (AoE) |

### UI
- Simplified cards (200x200px) showing only hero icon and name
- Click to select, green border on selected card
- BATTLE button enabled after selection

### Flow
```javascript
// From MenuScene
this.scene.start('HeroSelectScene');

// To GameScene with hero
this.scene.start('GameScene', { heroKey: 'DRUID' });
```

### Hero Effects in GameScene
- **Passives** - Applied automatically when units spawn, enemies spawn, or resources are collected
- **Portrait** - Displayed below castle with ability indicator
- **Wave 20 Ability** - Click portrait to activate; one-time use per battle

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
| 10 | Dragon Boss | Ring of fire hits groups, spread units out |
| 12 | Dark Knights | High damage, use multiple Archers |
| 18 | Demons | Need balanced army |
| 20, 30 | Scaled Dragons | Spread army to avoid ring of fire, use tanks |

- Game pauses when tip appears
- 3 second countdown before can close
- Resumes when player clicks CONTINUE

---

## UpgradeScene

**File:** `src/scenes/UpgradeScene.js`

Permanent upgrades using XP currency. Mobile-friendly design with larger fonts, buttons, and touch targets.

### Layout
```
┌─────────────────────────────────────────┐
│              UPGRADES                    │
│              ⭐ XP: 5                    │
├─────────────────────────────────────────┤
│           UNIT UPGRADES                  │
│  ┌─────┐ ┌─────┐ ┌─────┐                │
│  │Peas │ │Arch │ │Horse│                │
│  │Lv 2 │ │Lv 1 │ │ 🔒  │                │
│  │[Upg]│ │[Upg]│ │[Unl]│                │
│  └─────┘ └─────┘ └─────┘                │
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

### Special Upgrades

Advanced upgrades that modify gameplay mechanics.

#### Boolean Upgrades (One-time Purchase)

| Upgrade | Cost | Effect |
|---------|------|--------|
| Elite Mastery | 50 XP | Gold tier spawns 2 units for cost of 1 |
| Castle Emergency | 30 XP | Explosives at 25% HP, kills all monsters for 5s, no repair |

#### Multi-Level Upgrades

| Upgrade | Max | Cost/Lvl | Effect per Level |
|---------|-----|----------|------------------|
| Horseman Shield | 5 | 10/20/30/40/50 XP | -10% damage per level (max -50%) |
| Reinforcements | 5 | 10/20/30/40/50 XP | Better reinforcement units |
| Production Speed | 10 | 3 XP | -5% unit spawn time |
| Production Cost | 10 | 3 XP | -5% unit cost |
| Unit Speed | 10 | 3 XP | +5% movement speed |
| Peasant Promo Skip | 5 | 8 XP | Start peasants at higher promotion |
| Archer Promo Skip | 5 | 8 XP | Start archers at higher promotion |
| Horseman Promo Skip | 5 | 10 XP | Start horsemen at higher promotion |
| Castle Extension | 10 | 5 XP | +5 max castle level (up to 60) |
| Smarter Units | 5 | 5 XP | Units form multiple defense groups |

#### Reinforcements System
- **Timer**: 2-minute cooldown fills during gameplay
- **Level-based units**:
  - Level 1: 5 peasants, 3 archers, 1 horseman
  - Level 2: 6 peasants, 4 archers, 2 horsemen
  - Level 3: 7 peasants, 5 archers, 3 horsemen
  - Level 4: 8 peasants, 6 archers, 4 horsemen
  - Level 5: 10 peasants, 8 archers, 5 horsemen

#### Castle Emergency
- Triggers automatically when castle HP drops below 25%
- One-time use per battle (clutch save mechanic)
- Launches explosives for 5 seconds, killing all monsters in blast radius
- Castle repair is disabled for rest of battle after triggering
- Red screen flash effect

#### Smarter Units (Defense Groups)
Units organize into multiple defense positions:
- **Level 0**: Single group near castle (default)
- **Level 1**: Castle group
- **Level 2**: + Top group (upper screen)
- **Level 3**: + Bottom group (lower screen)
- **Level 4**: + Middle group (center)
- **Level 5**: + Front group (forward position)

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
XP earned based on rank divisor (Recruit: wave/2, Soldier/Warrior: wave/3, Knight: wave/6, etc.)

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
    AuthScene,
    GameScene,
    UpgradeScene,
    GameOverScene
]
```

---

*Files: `src/scenes/*.js`*
