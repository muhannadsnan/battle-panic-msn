# Authentication System (Planned)

Magic link email authentication for cloud saves and leaderboards.

---

## Overview

- **Method**: Magic link (passwordless email)
- **Storage**: JWT token in localStorage
- **Benefits**: No passwords, verified email, simple UX

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     GAME (Client Side)                          │
└─────────────────────────────────────────────────────────────────┘
                              │
       1. User clicks "Login" │
                              ▼
         ┌─────────────────────────────────────┐
         │   Email Input Panel (in-game UI)    │
         │   ┌─────────────────────────────┐   │
         │   │  Enter your email:          │   │
         │   │  [_____________________]    │   │
         │   │  [   Send Magic Link   ]    │   │
         │   └─────────────────────────────┘   │
         └─────────────────────────────────────┘
                              │
       2. POST /api/auth/send │ { email: "user@email.com" }
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      SERVER                                      │
│  - Generate random token (UUID)                                  │
│  - Store: { token, email, expires: 15min }                       │
│  - Send email with link: game.com/auth?token=abc123              │
└─────────────────────────────────────────────────────────────────┘
                              │
       3. User clicks link    │
          in email            ▼
         ┌─────────────────────────────────────┐
         │  game.com/auth?token=abc123         │
         │  - Validates token                  │
         │  - Creates/gets user by email       │
         │  - Returns JWT auth token           │
         │  - Redirects to game with token     │
         └─────────────────────────────────────┘
                              │
       4. Game receives       │
          JWT token           ▼
         ┌─────────────────────────────────────┐
         │  localStorage.authToken = jwt       │
         │  localStorage.user = {              │
         │    id: "uuid",                      │
         │    email: "user@email.com",         │
         │    displayName: "Player123"         │
         │  }                                  │
         └─────────────────────────────────────┘
```

---

## Data Structures

### Client Storage (localStorage)

```javascript
{
    authToken: "jwt.token.here",
    user: {
        id: "uuid-123",
        email: "player@email.com",
        displayName: "CoolPlayer42"  // User can change this
    },
    // ... existing save data synced with server
}
```

### Server Database

**Users Table:**
```javascript
{
    id: "uuid-123",
    email: "player@email.com",
    displayName: "CoolPlayer42",
    createdAt: "2024-01-01",
    lastLogin: "2024-01-15"
}
```

**Saves Table:**
```javascript
{
    userId: "uuid-123",
    saveData: { /* all game stats, upgrades, killStats, etc */ },
    updatedAt: "2024-01-15"
}
```

**Magic Links Table:**
```javascript
{
    token: "abc123-random-uuid",
    email: "player@email.com",
    expiresAt: "2024-01-15T12:15:00Z",  // 15 minutes
    used: false
}
```

---

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/send` | POST | No | Send magic link to email |
| `/api/auth/verify` | GET | No | Verify token, return JWT |
| `/api/auth/me` | GET | Yes | Get current user info |
| `/api/user/displayname` | PUT | Yes | Update display name |
| `/api/save` | GET | Yes | Load cloud save |
| `/api/save` | POST | Yes | Save to cloud |
| `/api/leaderboard` | GET | No | Get rankings |
| `/api/leaderboard/me` | GET | Yes | Get user's rank |

---

## API Request/Response Examples

### Send Magic Link
```javascript
// POST /api/auth/send
// Request:
{ "email": "player@email.com" }

// Response:
{ "success": true, "message": "Check your email!" }
```

### Verify Token
```javascript
// GET /api/auth/verify?token=abc123
// Response:
{
    "token": "jwt.auth.token",
    "user": {
        "id": "uuid-123",
        "email": "player@email.com",
        "displayName": "Player123"
    }
}
```

### Save Data (with auth)
```javascript
// POST /api/save
// Headers: { Authorization: "Bearer jwt.token.here" }
// Request:
{
    "saveData": {
        "xp": 50,
        "highestWave": 25,
        "killStats": { "goblin": 100, "orc": 50, ... },
        "stats": { "totalGamesPlayed": 10, ... },
        "upgrades": { ... }
    }
}

// Response:
{ "success": true, "updatedAt": "2024-01-15T12:00:00Z" }
```

### Load Data (with auth)
```javascript
// GET /api/save
// Headers: { Authorization: "Bearer jwt.token.here" }
// Response:
{
    "saveData": { ... },
    "updatedAt": "2024-01-15T12:00:00Z"
}
```

---

## In-Game UI

### Login Panel (not logged in)
```
┌──────────────────────────────────┐
│         📧 Login                 │
│                                  │
│  Enter your email:               │
│  ┌────────────────────────────┐  │
│  │                            │  │
│  └────────────────────────────┘  │
│                                  │
│  [    Send Magic Link    ]       │
│                                  │
│  A login link will be sent       │
│  to your email address.          │
└──────────────────────────────────┘
```

### After Sending Link
```
┌──────────────────────────────────┐
│         📧 Check Your Email!     │
│                                  │
│  We sent a login link to:        │
│  player@email.com                │
│                                  │
│  Click the link to login.        │
│  Link expires in 15 minutes.     │
│                                  │
│  [  Resend  ]  [  Cancel  ]      │
└──────────────────────────────────┘
```

### Profile Panel (logged in)
```
┌──────────────────────────────────┐
│  👤 CoolPlayer42                 │
│  📧 player@email.com             │
│                                  │
│  Display Name:                   │
│  ┌────────────────────────────┐  │
│  │ CoolPlayer42               │  │
│  └────────────────────────────┘  │
│  [    Save Name    ]             │
│                                  │
│  ☁️ Cloud Save: Synced           │
│  Last sync: 2 minutes ago        │
│                                  │
│  [    Logout    ]                │
└──────────────────────────────────┘
```

---

## Sync Strategy

### On Game Load:
1. Check if `authToken` exists in localStorage
2. If yes, validate token with `/api/auth/me`
3. If valid, load cloud save with `/api/save`
4. Compare cloud save with local save
5. Use whichever has higher `highestWave` (or merge stats)

### On Game Over:
1. Update local save
2. If logged in, sync to cloud via `/api/save`

### Conflict Resolution:
- Stats (kills, games played): Take maximum of each
- Upgrades: Take highest level of each
- highestWave: Take maximum

---

## Implementation Checklist

### Backend:
- [ ] Set up Node.js/Express server (or serverless)
- [ ] Database setup (PostgreSQL/MongoDB)
- [ ] Email service integration (Resend/SendGrid)
- [ ] JWT token generation/validation
- [ ] API endpoints implementation
- [ ] Rate limiting for magic link requests

### Frontend:
- [ ] Login button in menu
- [ ] Email input panel UI
- [ ] "Check your email" confirmation UI
- [ ] Profile panel UI
- [ ] Display name editor
- [ ] Cloud sync status indicator
- [ ] Logout functionality

### Game Integration:
- [ ] Modify SaveSystem to sync with server
- [ ] Add auth token to API requests
- [ ] Handle offline mode gracefully
- [ ] Merge local/cloud saves on login

---

## Security Considerations

1. **Magic links expire** after 15 minutes
2. **One-time use** - links invalidated after click
3. **Rate limit** magic link requests (max 3 per hour per email)
4. **JWT expiration** - tokens valid for 30 days
5. **HTTPS only** - all API calls over secure connection
6. **No sensitive data** in JWT payload (just user ID)

---

*Status: PLANNED - Not yet implemented*
