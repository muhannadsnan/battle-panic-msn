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
- **Dragon** (Every 10 waves) - BOSS, ranged, flies

### Upgrades (Permanent)
- Unit upgrades: Increase HP and damage per level
- Castle upgrades: Health, Armor, Gold Income
- Unlock new units: Horseman (2 XP)
- Reset upgrades costs 2 XP + 25% of current XP (refunds spent XP minus fee)

---

## Monetization

- **Buy Me a Coffee** button in main menu
- **Buy XP** button: 25 XP for $2 donation (Coming Soon)
- Links to: https://www.buymeacoffee.com/masterassassin

---

## Recent Updates (v1.20.0)

- Supabase authentication with magic link (passwordless email)
- Cloud save sync for logged-in users
- Guest mode with separate local save
- Leaderboard integration
- Login/Profile UI (AuthScene)

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

*Last updated: January 2026 (v1.20.0)*
