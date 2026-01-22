# Battle Panic Clone - Documentation Index

A tower defense game built with Phaser 3 where players defend their castle against waves of enemies by spawning and upgrading units.

## Quick Start

```bash
npm run dev    # Starts local server at http://localhost:3000
```

**Controls:** Hover over unit buttons to spawn, ESC/P to pause, M to toggle music

---

## Project Structure

```
battle-panic-msn/
├── index.html          # Entry HTML file
├── package.json        # Project config (uses npx serve)
├── src/
│   ├── main.js         # Phaser game initialization
│   ├── config/
│   │   └── GameConfig.js    # All game constants and balance values
│   ├── entities/
│   │   ├── Unit.js          # Player units (Peasant, Archer, Horseman + elite forms)
│   │   ├── Enemy.js         # Enemy units (Goblin, Orc, Skeleton, Dragon, etc.)
│   │   ├── Castle.js        # Player's castle with health
│   │   └── Projectile.js    # Arrows, magic bolts, fireballs
│   ├── systems/
│   │   ├── WaveSystem.js    # Wave generation and enemy spawning
│   │   ├── CombatSystem.js  # Damage, targeting, combat logic
│   │   ├── SaveSystem.js    # localStorage persistence, XP, upgrades, cloud sync
│   │   ├── AudioManager.js  # Sound effects and music
│   │   └── SupabaseClient.js # Authentication and cloud saves
│   ├── scenes/
│   │   ├── BootScene.js     # Initial boot
│   │   ├── PreloadScene.js  # Asset loading
│   │   ├── MenuScene.js     # Main menu, donations, buy XP
│   │   ├── AuthScene.js     # Login/profile UI
│   │   ├── GameScene.js     # Main gameplay
│   │   ├── UpgradeScene.js  # Unit and castle upgrades
│   │   └── GameOverScene.js # End screen with stats
│   └── ui/
│       ├── GoldDisplay.js   # Resource display, wave announcements
│       ├── HealthBar.js     # Health bars for units/enemies
│       └── UnitButton.js    # Unit spawn buttons
└── doc/                     # This documentation
```

---

## Documentation Sections

| Document | Description |
|----------|-------------|
| [config.md](config.md) | Game balance, unit stats, enemy stats, wave configuration |
| [entities.md](entities.md) | Units, enemies, castle, projectiles - how they work |
| [systems.md](systems.md) | Combat, waves, saving, audio - core game systems |
| [scenes.md](scenes.md) | Menu, gameplay, upgrades, game over - scene flow |
| [ui.md](ui.md) | UI components - displays, buttons, health bars |
| [auth.md](auth.md) | Authentication system - Supabase magic link, cloud saves, leaderboard |

---

## Game Flow

```
BootScene → PreloadScene → MenuScene
                              ↓
                    ┌─────────┼─────────┐
                    ↓         ↓         ↓
              UpgradeScene AuthScene GameScene
                    ↓         ↓         ↓
                    └─────────┴──→ GameOverScene
                                       ↓
                                  MenuScene
```

---

## Key Concepts

### Resources
- **Gold** - Earned from killing enemies and completing waves. Used to spawn units in battle.
- **Wood** - Earned from killing enemies and completing waves. Used alongside gold to spawn units.
- **XP** - Earned from battles (max 3 per game). Divisor based on rank:
  - Recruit: 1 XP per 3 waves
  - Soldier: 1 XP per 6 waves
  - Higher ranks need more waves per XP

### Units (Player)
| Unit | Cost | Role | Special |
|------|------|------|---------|
| Peasant | 10g/10w | Cheap melee | → Knight at gold tier (25% armor) |
| Archer | 25g/20w | Ranged DPS | → Robinhood at gold tier (2x attack speed, 15% armor) |
| Horseman | 60g/40w | Fast cavalry | 2x speed, armored → Lancelot at gold tier |

### Enemies
- **Goblin** (Wave 1+) - Fast, weak
- **Orc** (Wave 2+) - Stronger melee
- **Skeleton** (Wave 4+) - Medium threat
- **Skeleton Archer** (Wave 6+) - Ranged enemy
- **Spear Monster** (Wave 7+) - Throws big spears, tribal warrior
- **Troll** (Wave 8+) - High HP tank
- **Dark Knight** (Wave 12+) - Strong melee
- **Demon** (Wave 18+) - Very strong
- **Dragon** (Every 10 waves) - BOSS, ring of fire area attack, flies

### Upgrades (Permanent)
- Unit upgrades: Increase HP and damage per level
- Castle upgrades: Health, Armor, Gold Income
- Unlock new units: Horseman (2 XP)
- Reset upgrades costs 2 XP + 25% of current XP (refunds spent XP minus fee)

---

## Play Online

| Platform | URL | Status |
|----------|-----|--------|
| **Official Site** | https://battle-panic-msn.netlify.app/ | ✅ Live |
| **itch.io** | https://muhannadsnan.itch.io/battle-panic-msn | ✅ Live |
| **Newgrounds** | https://www.newgrounds.com/portal/view/1014822 | ✅ Live |
| **Poki** | Submitted | ⏳ Under Review |
| **Reddit** | r/WebGames, r/IndieGaming, r/playmygame | 📢 Posted |

**Third-party site behavior:**
- "Play on Official Site" button appears when embedded on other platforms
- Login, Buy XP, and Coffee buttons remain visible (monetization priority)

---

## Monetization

- **Buy XP** button in main menu (Stripe Checkout)
  - 25 XP for $2.99
  - 50 XP for $4.50 (Best Value)
  - 100 XP for $7.99
- **Buy Me a Coffee** button for donations
- Links to: https://www.buymeacoffee.com/masterassassin

---

## Recent Updates (v1.38.28)

### v1.38.28
- **Hero Ability Glow**: Only glows when ready, stops during cooldown

### v1.38.27
- **Hero Ability Visual**: Blue circle effect with pulse animation
- **Hero Ability Damage**: Changed from instant kill to 100 damage per enemy

### v1.38.26
- **Rank-Based Difficulty**: Enemies gain +5% HP and damage per primary rank
  - Recruit: baseline, Soldier: +5%, Warrior: +10%, Knight: +15%
  - Captain: +20%, Commander: +25%, General: +30%
  - Champion: +35%, Legend: +40%, Immortal: +45%

### v1.38.25
- **Castle Upgrade**: Spinner no longer shows on hover when castle is at max level

### v1.38.24
- **Bug Fix**: Hero ability now unlocks correctly at wave 20

### v1.38.23
- **Wave Tips**: Now skip for Knight rank and above (was Commander+)

### v1.38.19
- **Game Over Screen**: Dark overlay (0.2 opacity) and bold font for "Castle Destroyed" message

### v1.38.18
- **Dragon Rebalance**:
  - Ring of fire base damage: 200 → 50
  - Ring damage capped at 150 HP max
  - Attack speed: 8s → 4s
- **Dragon Roar Sound**: New deep rumbling roar with fiery crackle

### v1.38.17
- **Castle Spinner**: Changed to circular background (was square), rotates clockwise
- **Pause Dialog**: Increased height for better spacing

### v1.38.16
- **Pause Menu**: Added proper bottom padding to dialog

### v1.38.15
- **Pause Menu UI**: Cleaner design
  - Darker transparent overlay (0.2 opacity)
  - Removed wave number and "Sound:" label
  - Removed double borders from dialog and buttons
  - Larger button text (22px)
- **Unit Buttons**: Cleaner single background, removed odd inner borders

### v1.38.14
- **Hero Lock Icon**: Larger (2x) and positioned in corner for mobile friendliness

### v1.38.13
- **Welcome Sound**: Pleasant chime plays when profile loads for logged-in users
  - Gentle ascending major chord arpeggio with sparkle effect

### v1.37.4
- **Hero Ability UI**: Moved ability from top bar to hero portrait below castle
  - Hero portrait glows when ability is ready
  - Click portrait to activate ability
- **Pie Timer Effect**: All spinners now use radial wipe (pie chart) style
  - Hero ability, reinforcement button, castle upgrade all use new effect
- **Alchemist Rebalance**: Changed passive from +5% resource income to +10% horsemen damage
- **Hero Cards**: Increased card height for better proportions

### v1.35.25
- **Dragon Rework**: Ring of fire attack replaces fireballs
  - Area damage hits groups of units
  - 2x slower attack rate (8s cooldown)
  - Spread your units to minimize damage!
- Updated all dragon tips and messages

### v1.35.24
- **Audio**: Fixed archer arrow sound - now plays on shoot at 60% volume (was playing on hit)
- **Fix**: Castle arrows now reach targets at all castle levels (maxDistance matches attackRange)

### v1.35.23
- **Audio**: Reduced archer unit arrow sound by 60% (less overwhelming with large armies)
- **Cache**: Added Netlify cache headers to prevent stale content after updates

### v1.35.22
- **Visual**: Castle arrows 50% bigger

### v1.35.21
- **UI**: Removed floating +gold/+wood text on kills (cleaner battles)

### v1.35.20
- **Audio**: Reduced hit sound volume by 60% (less annoying with large armies)

### v1.35.19
- **Audio**: New castle arrow sound (bow twang + whoosh)

### v1.35.18
- **Audio**: New unit spawn sound (pop + shimmer + whoosh)

### v1.35.17
- **Smarter Units**: Redesigned with wing-based system (Left, Free, Top, Bottom, Right)
- **Reinforcements**: War horn sound replaces text message
- **Promotions**: Notification shows for shorter time (2.4s)

### v1.35.16
- **Messages**: Removed "Castle +X HP" wave message

### v1.35.15
- **Messages**: Queue system - one message at a time, 25% shorter duration, higher position
- **Unit Bar**: Full height opaque background

### v1.35.14
- **Upgrades**: Button hides during glow animation, reappears when glow ends
- **In-game**: Messages disappear instantly (no fade out)
- **Robinhood**: Fixed crossbow orientation (limbs now at front)

### v1.35.13
- **Upgrade Glow Fix**: Glow effect now appears on the correct card when upgrading from side cards

### v1.35.12
- **UI**: Reinforce button timer enlarged (20px bold)
- **UI**: In-game messages now stay 2x longer with 0.6 opacity
- **UI**: Reinforce button glows when ready (no message popup)

### v1.35.11
- **UI**: Reinforce button moved to bottom of unit bar

### v1.35.10
- **Repair Exploit Fix**: Can't repair castle when enemies are too close
  - Shows "CLEAR ENEMIES" in red when repair is blocked
  - Prevents fence recreation exploit
- **Upgrade Cards Fix**: All visible cards (±1 from center) are now clickable
- **Menu Transition Fix**: Prevents accidental Play button clicks when switching scenes
- **Rank Display Fix**: Removed duplicate rank badge, added icon to wave display

### v1.35.9
- **Smarter Units Upgrade Rework**:
  - Cost increased to 20 XP per level (premium upgrade)
  - Now toggleable from Settings gear in main menu
  - Shows "Toggle in Settings" hint on card when owned
- **Upgrade Card Bug Fix**: Buttons only work on centered card (no more accidental wrong upgrades)
- **Improved Slider**: Swipe now moves 3 cards at a time, smoother animation

### v1.35.8
- **Upgrade Card UX Improvements**:
  - Cards now stay at current position after upgrading (no jump to first card)
  - Green glow effect pulses around card after upgrade
  - 2-second throttle prevents accidental multiple clicks
  - All upgrade types now use consistent notification system

### v1.35.7
- **Dragon Boss Redesign**: Menacing pixel art dragon
  - Bat-like wings with dark membrane
  - Deep crimson color palette
  - Curved horns and dorsal spikes
  - Glowing orange eyes with slit pupils
  - Animated smoke from nostrils
  - Curved tail with arrow spike

### v1.35.6
- **Improved In-Game Messages**: All notifications now have styled boxes
  - Rounded corners, semi-transparent backgrounds (0.7 opacity)
  - Colored borders matching message theme
  - Pop-in animations and smooth fade-outs
  - Mobile-friendly sizing
- **Rank Display**: Player rank now shows next to wave count (bottom right)
- **Wave Announcements**: Styled boxes for wave start and rewards

### v1.35.5
- **Unit Visual Improvements**:
  - Archer (lvl 1-3): Gray color scheme, bow string pulled back (ready stance)
  - Robinhood (lvl 4-6): Now uses crossbow instead of bow
  - Knight (lvl 4-6): Sword angled slightly forward (ready stance)
  - All Horsemen: Sword angled slightly forward (ready stance)
- **Wave Tips Rank-Based**: Experienced players (Commander I+) skip wave tips

### v1.25.0
- **Buy XP with Stripe**: In-game XP purchases now available!
  - 3 packages: 25 XP ($2.99), 50 XP ($4.50), 100 XP ($7.99)
  - Secure Stripe Checkout integration
  - Automatic XP crediting via webhook
  - Requires login to purchase
- **Supabase Edge Functions**: Backend payment processing
  - `create-checkout`: Creates Stripe checkout sessions
  - `stripe-webhook`: Receives payment confirmations and credits XP

### v1.24.0
- **Weapons Attached to Arms**: Swords and bows now move with arm animations
- **Improved UI Icons**: Full character icons in spawn buttons and upgrade cards
- **Trumpet Promotion Sound**: Military bugle fanfare on unit promotion

### v1.23.0
- **Redesigned Unit Icons (Angular Style)**: All 6 unit sprites completely redesigned
  - Clean, bold rectangular shapes with better proportions
  - Consistent Material Design color palettes
  - **Peasant**: Tan tunic, brown hair, clean sword
  - **Knight**: Blue armor, golden emblems, red plume, glowing visor
  - **Archer**: Forest green hood, wooden bow with string
  - **Robinhood**: Dark green cloak, pointed hood, red feather, golden-tipped bow
  - **Horseman**: Brown horse, blue armored rider with helmet
  - **Lancelot**: White stallion, golden armor, red cape, Excalibur
- **Fixed Upgrades Slider**: Buttons now work while swiping still works

### v1.22.0
- Smoother upgrades slider with velocity-based momentum scrolling
- Rubber band effect at slider edges
- Profile dialog enlarged with bigger fonts, buttons at bottom

### v1.21.0
- Horizontal swipeable slider for upgrades (7 cards)
- Consistent popping circle close buttons across dialogs
- Profile dialog: left-aligned labels, aligned values, red logout button
- Main menu polish: no borders on ranking/PLAY, "Profile" button label
- PLAY button: Gold color, bigger (52px), pulsing animation
- Supabase authentication with magic link
- Cloud save sync for logged-in users

## Future Plans

- Payment webhook integration for automatic XP crediting
- Public leaderboard display
- Social features

---

## Technical Details

- **Engine:** Phaser 3
- **Rendering:** WebGL with Canvas fallback
- **Physics:** Arcade physics (no gravity)
- **Resolution:** 1024x600, auto-scales to fit
- **Local Save:** localStorage (guest/user separation)
- **Cloud Backend:** Supabase (PostgreSQL + Auth)
- **Authentication:** Magic link (passwordless email)

---

*Last updated: January 2026 (v1.38.28)*
