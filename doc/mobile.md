# Mobile App Publishing Guide

Guide for publishing Battle Panic to iOS App Store (and Android Play Store).

---

## Overview

The game is built with Phaser 3 (web). To publish to app stores, we wrap it in a native container using **Capacitor**.

---

## Prerequisites

### For iOS (App Store)
- Mac computer (required for Xcode)
- Xcode (free from Mac App Store)
- Apple Developer Account ($99/year): https://developer.apple.com
- App icons and screenshots

### For Android (Play Store)
- Android Studio (free, works on Windows/Mac/Linux)
- Google Play Developer Account ($25 one-time): https://play.google.com/console
- App icons and screenshots

---

## Step 1: Install Capacitor

```bash
# In project root
npm install @capacitor/core @capacitor/cli
npm install @capacitor/ios @capacitor/android

# Initialize Capacitor
npx cap init "Battle Panic" com.battlepanic.game --web-dir=.
```

### Configure capacitor.config.json

```json
{
  "appId": "com.battlepanic.game",
  "appName": "Battle Panic",
  "webDir": ".",
  "server": {
    "androidScheme": "https"
  },
  "ios": {
    "contentInset": "always"
  }
}
```

---

## Step 2: Add Platforms

```bash
# Add iOS (Mac only)
npx cap add ios

# Add Android
npx cap add android

# Sync web code to native projects
npx cap sync
```

---

## Step 3: App Icons

### Required Sizes

**iOS:**
- 1024x1024 (App Store)
- 180x180 (iPhone @3x)
- 120x120 (iPhone @2x)
- 167x167 (iPad Pro)
- 152x152 (iPad @2x)

**Android:**
- 512x512 (Play Store)
- 192x192 (xxxhdpi)
- 144x144 (xxhdpi)
- 96x96 (xhdpi)
- 72x72 (hdpi)
- 48x48 (mdpi)

### Generate Icons

Use a tool like:
- https://www.appicon.co/
- https://makeappicon.com/

Place icons in:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
- Android: `android/app/src/main/res/mipmap-*/`

---

## Step 4: Splash Screen

```bash
npm install @capacitor/splash-screen

# Configure in capacitor.config.json
```

```json
{
  "plugins": {
    "SplashScreen": {
      "launchShowDuration": 2000,
      "backgroundColor": "#1a1a2e",
      "showSpinner": false
    }
  }
}
```

---

## Step 5: Build for iOS

```bash
# Sync latest code
npx cap sync ios

# Open in Xcode
npx cap open ios
```

### In Xcode:
1. Select your Team (Apple Developer account)
2. Set Bundle Identifier: `com.battlepanic.game`
3. Set Version: `1.4.0`
4. Set Build: `1`
5. Select target device or "Any iOS Device"
6. Product → Archive
7. Distribute App → App Store Connect

---

## Step 6: Build for Android

```bash
# Sync latest code
npx cap sync android

# Open in Android Studio
npx cap open android
```

### In Android Studio:
1. Build → Generate Signed Bundle / APK
2. Choose Android App Bundle (.aab)
3. Create or select keystore
4. Build release version

---

## Step 7: App Store Connect (iOS)

1. Go to https://appstoreconnect.apple.com
2. Create new app
3. Fill in details:
   - App name: Battle Panic
   - Primary language: English
   - Bundle ID: com.battlepanic.game
   - SKU: battlepanic001

### Required Information:
- Description (up to 4000 chars)
- Keywords (up to 100 chars)
- Support URL
- Privacy Policy URL
- Screenshots (6.5" and 5.5" iPhone)
- App icon (1024x1024)
- Age rating questionnaire
- Price (Free or paid)

### Review Process:
- Initial review: 1-7 days
- May request changes
- Common rejection reasons:
  - Bugs or crashes
  - Incomplete features
  - Misleading description
  - Privacy issues

---

## Step 8: Google Play Console (Android)

1. Go to https://play.google.com/console
2. Create new app
3. Fill in store listing:
   - Title: Battle Panic
   - Short description (80 chars)
   - Full description (4000 chars)
   - Screenshots (phone, 7" tablet, 10" tablet)
   - Feature graphic (1024x500)
   - App icon (512x512)

### Required:
- Privacy policy URL
- Content rating questionnaire
- Target audience
- Ads declaration

---

## Touch Controls (Important!)

The game currently uses keyboard/mouse. For mobile, add touch controls:

### Option 1: Virtual Joystick Plugin
```bash
npm install phaser3-rex-plugins
```

### Option 2: Simple Touch Buttons
Add touch buttons for unit spawning in GameScene:

```javascript
// Mobile detection
const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

if (isMobile) {
    this.createMobileControls();
}
```

### Current Controls to Adapt:
| Desktop | Mobile Equivalent |
|---------|-------------------|
| Keys 1-5 | Touch unit buttons (already works!) |
| Mouse hover mining | Touch and hold |
| ESC/P pause | Pause button |

**Good news:** The game already uses touch-friendly unit buttons with hover-to-spawn!

---

## Performance Optimization

### For Mobile:
```javascript
// In main.js, add mobile-friendly config
const config = {
    type: Phaser.AUTO,
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    render: {
        antialias: false,  // Better performance
        pixelArt: true
    }
};
```

### Reduce particle effects on mobile
### Lower enemy count caps on older devices
### Test on real devices, not just simulators

---

## Monetization Options

### In-App Purchases (for XP)
```bash
npm install @capacitor-community/in-app-purchases
```

Can implement:
- Buy 10 XP for $1.99
- Buy 50 XP for $7.99
- Remove ads for $2.99

### Ads
```bash
npm install @capacitor-community/admob
```

Can implement:
- Banner ads (bottom of screen)
- Interstitial ads (between waves)
- Rewarded ads (watch ad for 5 XP)

---

## Testing

### iOS TestFlight
1. Upload build to App Store Connect
2. Add internal testers (up to 100)
3. Or public TestFlight link (up to 10,000)

### Android Internal Testing
1. Upload to Play Console
2. Internal testing track
3. Share link with testers

---

## Checklist Before Submission

### iOS
- [ ] App icons all sizes
- [ ] Launch screen configured
- [ ] Bundle ID matches App Store Connect
- [ ] Version and build numbers set
- [ ] Privacy policy URL
- [ ] Screenshots (6.5" and 5.5")
- [ ] App description
- [ ] Age rating completed
- [ ] No crashes on test devices

### Android
- [ ] App icons all sizes
- [ ] Signed release bundle (.aab)
- [ ] Privacy policy URL
- [ ] Screenshots (phone + tablets)
- [ ] Feature graphic
- [ ] Store listing complete
- [ ] Content rating completed
- [ ] Target API level current

---

## Estimated Costs

| Item | Cost |
|------|------|
| Apple Developer Account | $99/year |
| Google Play Account | $25 one-time |
| Mac (if needed) | $500-2000+ |
| App icons design | $0-50 |
| **Total minimum** | **$124** |

---

## Timeline

| Phase | Duration |
|-------|----------|
| Setup Capacitor | 1-2 hours |
| Create icons/screenshots | 2-4 hours |
| Configure & build iOS | 2-4 hours |
| Configure & build Android | 1-2 hours |
| App Store submission | 1 hour |
| Review (iOS) | 1-7 days |
| Review (Android) | 1-3 days |

---

*Status: PLANNED - Not yet implemented*
