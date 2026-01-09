# UI Components

Reusable UI components for displaying game information and handling user interaction.

---

## ResourceDisplay / GoldDisplay

**File:** `src/ui/GoldDisplay.js`

Displays current gold and wood resources at the top of the screen.

### Class: `ResourceDisplay extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new ResourceDisplay(scene, x, y)
```

#### Visual Layout
```
GOLD 50   WOOD 50
```

Text labels ("GOLD" and "WOOD") are used instead of icons for cleaner display.

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `currentGold` | number | Current gold amount |
| `currentWood` | number | Current wood amount |
| `goldLabel` | Text | "GOLD" label |
| `goldText` | Text | Gold display text |
| `woodLabel` | Text | "WOOD" label |
| `woodText` | Text | Wood display text |

#### Methods

**`setGold(amount)` / `setWood(amount)`**
Sets resource to exact value.

**`addGold(amount)` / `addWood(amount)`**
Adds to resource, shows floating "+X" text.

**`subtractGold(amount)` / `subtractWood(amount)`**
Subtracts from resource, shows floating "-X" text (red).

**`showFloatingText(offsetX, offsetY, text, color)`**
Creates animated text that floats up and fades.

---

## WaveDisplay

**File:** `src/ui/GoldDisplay.js`

Shows current wave number and wave announcements.

### Class: `WaveDisplay extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new WaveDisplay(scene, x, y)
```

#### Visual
Large "Wave X" text in bottom-right, semi-transparent (0.7 alpha).

#### Methods

**`setWave(waveNumber)`**
Updates the wave number display.

**`showWaveStart(waveNumber)`**
Shows big "WAVE X" announcement:
- Center screen, 64px red text
- Scales up and fades out (1.5 seconds)
- Plays wave start sound

**`showWaveComplete(goldReward, woodReward)`**
Shows completion message:
- **Position**: Top of screen (y: 50)
- **Text**: "WAVE COMPLETE! +Xg +Yw"
- **Duration**: Stays 5 seconds, then fades
- **Size**: 24px green text

---

## HealthBar

**File:** `src/ui/HealthBar.js`

Health bar used by units, enemies, and castle.

### Class: `HealthBar extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new HealthBar(scene, x, y, width, height, color = 0x00ff00)
```

#### Visual
```
┌─────────────────────────┐
│██████████████░░░░░░░░░░░│  <- Fill shrinks left-to-right
└─────────────────────────┘
```

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `barWidth` | number | Total bar width |
| `barHeight` | number | Bar height |
| `percent` | number | Current fill (0-1) |
| `fill` | Rectangle | Fill rectangle |

#### Methods

**`setPercent(percent)`**
Updates health fill:
- Resizes fill rectangle
- Changes color based on health:
  - \>60%: Green (0x00ff00)
  - 30-60%: Yellow (0xffff00)
  - <30%: Red (0xff0000)

**`setColor(color)`**
Overrides automatic color.

---

## UnitButton

**File:** `src/ui/UnitButton.js`

Spawn button with hover-to-spawn mechanic.

### Class: `UnitButton extends Phaser.GameObjects.Container`

#### Constructor
```javascript
new UnitButton(scene, x, y, unitType, hotkey, isUnlocked = true)
```

#### Visual Layout
```
┌──────────────────┐
│   ┌──────────┐   │
│   │  [Icon]  │   │  <- Unit icon (4x scale for iPad)
│   │   ____   │   │  <- Progress spinner
│   └──────────┘   │
│      42%         │  <- Progress (28px font)
│   10g    10w     │  <- Costs (30px font)
└──────────────────┘
```

**iPad-Friendly Features:**
- Unit icons: 4x scale (enlarged for touch)
- Cost text: 30px font
- Lock icon: 48px emoji
- Progress text: 28px font
- Button size: 110x120px (full height bar, no margins)
- 50x50px touch targets for all controls

#### Properties
| Property | Type | Description |
|----------|------|-------------|
| `unitType` | string | Unit type key |
| `hotkey` | string | Keyboard key (1-5) |
| `isUnlocked` | boolean | Can be used |
| `isEnabled` | boolean | Has enough resources |
| `isHovering` | boolean | Mouse over button |
| `spawnProgress` | number | Progress toward spawn |
| `spawnTarget` | number | Progress needed (100) |
| `spawnSpeed` | number | Progress per second |

#### Spawn Mechanics

**Hover-to-Spawn:**
1. Hover over button
2. Progress fills at `spawnSpeed` (100/sec)
3. When progress reaches 100: spawn unit
4. Progress persists when not hovering

**Click-to-Spawn:**
Clicking immediately attempts to spawn (traditional method).

#### Methods

**`updateSpawnProgress(delta)`**
Called every frame:
- If hovering and enabled: increment progress
- If progress >= 100: spawn and reset
- Draw progress spinner

**`drawSpinner()`**
Draws circular progress arc:
- Starts at top (-90 degrees)
- Fills clockwise
- Glows when >=80%

**`setEnabled(enabled)`**
Updates visual state:
- Enabled: Full opacity, interactive
- Disabled: Faded (40%), non-interactive

**`unlock()` / `lock()`**
Shows/hides lock overlay.

**`showTooltip()` / `hideTooltip()`**
Shows unit stats on hover.

#### Unit Icons
Each unit has a procedural icon:
- `createPeasantIcon()` - Farmer with pitchfork
- `createArcherIcon()` - Hooded figure with bow
- `createKnightIcon()` - Armored knight with sword
- `createWizardIcon()` - Wizard with hat and staff
- `createGiantIcon()` - Large brute with club

---

## UI Positioning

### GameScene UI Layout
```
┌────────────────────────────────────────────────┐
│ [Gold] 50   [Wood] 50                          │
├───┬────────────────────────────────────────────┤
│ 1 │                                            │
│[P]│                                            │
├───┤                                            │
│ 2 │        [GAME AREA]                         │
│[A]│                                            │
├───┤                                            │
│ 3 │                                            │
│[K]│                                      Wave 5│
├───┤                                            │
│ 4 │                                            │
│[W]│                                            │
├───┤                                            │
│ 5 │                                            │
│[G]│                                            │
└───┴────────────────────────────────────────────┘
```

### Z-Depth (setDepth values)
| Element | Depth |
|---------|-------|
| Background | 0 |
| Wave display | 50 |
| Entities | y-position |
| Health bars | 100 |
| UI buttons | 900 |
| Floating text | 1000 |
| Dialogs | 1000+ |

---

## Creating Custom UI

### Pattern: Container-Based UI
```javascript
class MyUI extends Phaser.GameObjects.Container {
    constructor(scene, x, y) {
        super(scene, x, y);

        // Add background
        this.bg = scene.add.rectangle(0, 0, 100, 50, 0x333333);
        this.add(this.bg);

        // Add text
        this.label = scene.add.text(0, 0, 'Hello', {...}).setOrigin(0.5);
        this.add(this.label);

        // Add to scene
        scene.add.existing(this);
        this.setDepth(900);
    }
}
```

### Pattern: Interactive Button
```javascript
this.bg.setInteractive({ useHandCursor: true });

this.bg.on('pointerover', () => {
    this.bg.setFillStyle(0x555555);
});

this.bg.on('pointerout', () => {
    this.bg.setFillStyle(0x333333);
});

this.bg.on('pointerdown', () => {
    this.onClick();
});
```

---

*Files: `src/ui/*.js`*

## iPad/Touch Optimization (v1.5.0)

All UI elements optimized for iPad and touch screens:

| Element | Size/Feature |
|---------|-------------|
| Pause button | 30px + 50x50 touch target |
| Music/Volume icons | 28px + 50x50 touch targets |
| Unit buttons | 110x120px, icons 4x scale |
| Unit count display | 32px text, 2x scale icons |
| Resource text | 26px values, 16px labels |
| Castle HP text | 33px (outside bar) |
| Castle level | 28px (in badge) |

**HTML Meta Tags:**
- viewport-fit=cover for notch safety
- user-scalable=no prevents accidental zoom
- touch-action: none prevents browser gestures
