# Authentication System

Magic link email authentication with Supabase for cloud saves and leaderboards.

---

## Overview

- **Backend**: Supabase (hosted PostgreSQL + Auth)
- **Method**: Magic link (passwordless email via OTP)
- **Storage**: Session managed by Supabase JS client
- **Benefits**: No passwords, verified email, automatic session refresh

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GAME (Client Side)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │ AuthScene.js │  │SupabaseClient│  │ SaveSystem   │          │
│  │  (Login UI)  │  │   .js        │  │   .js        │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ Supabase JS SDK
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SUPABASE                                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │     Auth     │  │    saves     │  │  leaderboard │          │
│  │   (Magic     │  │   (table)    │  │   (table)    │          │
│  │    Link)     │  │              │  │              │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Files

| File | Purpose |
|------|---------|
| `src/systems/SupabaseClient.js` | Supabase SDK wrapper, auth, cloud saves |
| `src/scenes/AuthScene.js` | Login/Profile UI |
| `src/systems/SaveSystem.js` | Local saves with guest/user separation |

---

## Authentication Flow

### 1. Magic Link Login

```
User clicks "Login" in MenuScene
         │
         ▼
┌─────────────────────────────────────┐
│   AuthScene - Email Input Panel     │
│   ┌─────────────────────────────┐   │
│   │  Enter your email:          │   │
│   │  [_____________________]    │   │
│   │  [   Send Magic Link   ]    │   │
│   └─────────────────────────────┘   │
└─────────────────────────────────────┘
         │
         │ supabaseClient.sendMagicLink(email)
         ▼
┌─────────────────────────────────────┐
│   Supabase sends email with link    │
│   game.com/?token=xxx               │
└─────────────────────────────────────┘
         │
         │ User clicks email link
         ▼
┌─────────────────────────────────────┐
│   Supabase validates token          │
│   Creates/gets user session         │
│   Redirects to game                 │
└─────────────────────────────────────┘
         │
         │ onAuthStateChange fires
         ▼
┌─────────────────────────────────────┐
│   Game receives auth state change   │
│   - saveSystem.setUserSaveKey(id)   │
│   - Load cloud data if exists       │
│   - Show profile panel              │
└─────────────────────────────────────┘
```

### 2. Session Persistence

On game load:
1. `supabaseClient.checkSession()` checks for existing session
2. If valid session exists, user is automatically logged in
3. `saveSystem.setUserSaveKey(userId)` switches to user-specific save

---

## Single-Device Session Management

Prevents data conflicts when game is open on multiple devices simultaneously.

### How It Works

```
Device A opens game
         │
         ▼
┌─────────────────────────────────────┐
│   validateSession()                  │
│   - Generates unique session_id      │
│   - Stores in user metadata          │
│   - Stores in sessionStorage         │
└─────────────────────────────────────┘
         │
         │ Device B opens game
         ▼
┌─────────────────────────────────────┐
│   Session Conflict Detected!         │
│   - Cloud session_id != local        │
│   - Session < 2 hours old            │
│                                      │
│   Dialog: "Play Here" / "Cancel"     │
└─────────────────────────────────────┘
         │
         │ User clicks "Play Here"
         ▼
┌─────────────────────────────────────┐
│   takeoverSession()                  │
│   - New session_id saved to cloud    │
│   - Device B becomes active          │
└─────────────────────────────────────┘
         │
         │ Within 30 seconds...
         ▼
┌─────────────────────────────────────┐
│   Device A: "Session Expired"        │
│   - Periodic check detects mismatch  │
│   - User logged out automatically    │
└─────────────────────────────────────┘
```

### Session Storage

| Location | Key/Field | Purpose |
|----------|-----------|---------|
| User Metadata | `session_id` | Unique session identifier |
| User Metadata | `session_started_at` | When session was started |
| sessionStorage | `battlePanicSessionId` | Local session ID (survives refresh) |

### Auto-Takeover

Sessions older than **2 hours** are automatically taken over without showing the conflict dialog.

### Periodic Validation

Every **30 seconds**, MenuScene and GameScene check if the session is still valid:
- If another device took over → Show "Session Expired" dialog → Logout

### Post-Battle Validation

After every battle ends:
1. Sync battle results to cloud immediately
2. Validate session - if taken over, logout silently
3. User returns to menu as logged out (sees login screen)

---

## Save System Integration

### Save Keys

| State | Save Key | Description |
|-------|----------|-------------|
| Guest (not logged in) | `battlePanicSave_guest` | Local-only save |
| Logged in | `battlePanicSave_{userId}` | User-specific local save |
| Legacy (pre-auth) | `battlePanicSave` | Migrated to guest on first load |

### Data Flow

```
Guest Mode:
  localStorage (battlePanicSave_guest) ←→ Game

Logged In Mode:
  localStorage (battlePanicSave_{id}) ←→ Game
                     │
                     │ Sync Now / Auto-sync
                     ▼
              Supabase (saves table)
```

### Cloud as Source of Truth

For logged-in users, **cloud data is always the source of truth**:
- On sync: Cloud data overwrites local data
- No "take max values" merge (prevents XP/upgrade rollback bugs)
- All data-changing actions (purchases, upgrades) sync to cloud immediately

**Exception - First-Time Migration:**
When a guest logs in for the first time with existing cloud data:
- **Stats**: Take maximum values (kills, waves, XP, etc.)
- **Upgrades**: Take highest level for each upgrade
- **Legacy stats**: Take highest, preserve earliest `firstPlayedAt`

---

## SupabaseClient API

### Class: `SupabaseClient`

**File:** `src/systems/SupabaseClient.js`

#### Initialization

```javascript
supabaseClient.init(SUPABASE_URL, SUPABASE_ANON_KEY)
```

Called in `index.html` on DOMContentLoaded.

#### Auth Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `sendMagicLink(email)` | `{success, message/error}` | Send login email |
| `checkSession()` | `user \| null` | Check for existing session |
| `logout()` | `{success, error?}` | Sign out user |
| `isLoggedIn()` | `boolean` | Check login status |
| `getUser()` | `user \| null` | Get current user object |
| `getDisplayName()` | `string \| null` | Get display name (metadata or email prefix) |
| `updateDisplayName(name)` | `{success, error?}` | Update user's display name |

#### Session Management Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `startSession()` | `boolean` | Start new session, store ID in metadata |
| `validateSession()` | `{valid, reason, ...}` | Check if session is still valid |
| `takeoverSession()` | `boolean` | Take over from another device |
| `hasValidLocalSession()` | `boolean` | Check if local session ID exists |

#### Real-Time Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `subscribeToSaves()` | `void` | Subscribe to save changes (for XP purchases) |
| `unsubscribeFromSaves()` | `void` | Unsubscribe from real-time updates |
| `updateLastKnownXP(xp)` | `void` | Update XP tracking to avoid false notifications |

#### Cloud Save Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `saveToCloud(saveData)` | `{success, updatedAt?, error?}` | Upload save to Supabase |
| `loadFromCloud()` | `{success, saveData?, updatedAt?, error?}` | Download save from Supabase |

#### Leaderboard Methods

| Method | Returns | Description |
|--------|---------|-------------|
| `getLeaderboard(limit=100)` | `{success, leaderboard?, error?}` | Get top players |
| `updateLeaderboard(wave, kills)` | `{success, error?}` | Update user's leaderboard entry |

#### Events

```javascript
// Auth state changes (login/logout)
window.addEventListener('authStateChanged', (event) => {
    const { user } = event.detail;
    // user is null if logged out, user object if logged in
});

// XP purchased via Stripe (real-time notification)
window.addEventListener('xpPurchased', (event) => {
    const { newXP, xpGained } = event.detail;
    // Show notification, refresh UI
});
```

---

## AuthScene UI

### Class: `AuthScene`

**File:** `src/scenes/AuthScene.js`

#### Login Panel (not logged in)

```
┌──────────────────────────────────┐
│            Login                 │
│              📧                  │
│                                  │
│  Enter your email to receive     │
│  a magic login link:             │
│                                  │
│  ┌────────────────────────────┐  │
│  │    your@email.com          │  │
│  └────────────────────────────┘  │
│                                  │
│  [    Send Magic Link    ]       │
│                                  │
│  [    Back to Menu    ]          │
└──────────────────────────────────┘
```

#### Check Email Panel (after sending)

```
┌──────────────────────────────────┐
│       Check Your Email!          │
│              ✉️                   │
│                                  │
│  We sent a login link to:        │
│  player@email.com                │
│                                  │
│  Click the link in your email    │
│  to login. Link expires in       │
│  15 minutes.                     │
│                                  │
│  [  Resend  ]    [  Back  ]      │
└──────────────────────────────────┘
```

#### Profile Panel (logged in)

```
┌──────────────────────────────────┐
│            Profile               │
│              👤                  │
│                                  │
│  Display Name:                   │
│         CoolPlayer42             │
│                                  │
│  Email:                          │
│      player@email.com            │
│                                  │
│  ☁️ Cloud Save: Ready            │
│                                  │
│  [      Sync Now      ]          │
│  [       Logout       ]          │
│  [    Back to Menu    ]          │
└──────────────────────────────────┘
```

---

## Supabase Database Schema

### `saves` Table

```sql
CREATE TABLE saves (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    save_data JSONB NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE saves ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own save"
    ON saves FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own save"
    ON saves FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own save"
    ON saves FOR UPDATE
    USING (auth.uid() = user_id);
```

### `leaderboard` Table

```sql
CREATE TABLE leaderboard (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id),
    display_name TEXT NOT NULL,
    highest_wave INTEGER DEFAULT 0,
    total_kills INTEGER DEFAULT 0,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read leaderboard"
    ON leaderboard FOR SELECT
    TO authenticated, anon
    USING (true);

CREATE POLICY "Users can upsert own entry"
    ON leaderboard FOR ALL
    USING (auth.uid() = user_id);
```

---

## Configuration

### index.html Setup

```html
<!-- Supabase JS from CDN -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

<!-- Initialize Supabase -->
<script>
    const SUPABASE_URL = 'https://your-project.supabase.co';
    const SUPABASE_ANON_KEY = 'your-anon-key';

    window.addEventListener('DOMContentLoaded', () => {
        supabaseClient.init(SUPABASE_URL, SUPABASE_ANON_KEY);
    });
</script>
```

Get credentials from: `https://supabase.com/dashboard/project/YOUR_PROJECT/settings/api`

---

## Security

1. **Magic links expire** after 15 minutes (Supabase default)
2. **One-time use** - links invalidated after click
3. **Rate limiting** - handled by Supabase
4. **Row Level Security** - users can only access their own data
5. **Anon key** is safe to expose (only allows authenticated operations via RLS)

---

*Status: IMPLEMENTED (v1.28.0) - Session management, real-time XP notifications*
