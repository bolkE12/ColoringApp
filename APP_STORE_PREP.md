# App Store Preparation Checklist

This guide will help you prepare Coloring Creatures for App Store submission while waiting for Apple Developer Program approval.

## ✅ Completed

### 1. App Configuration (app.json)
- ✅ Bundle identifier set: `com.creature.coloring`
- ✅ Build number added
- ✅ Privacy permissions configured
- ✅ Splash screen background updated
- ✅ Asset bundling configured
- ✅ Encryption compliance set to false

---

## 🔨 To Do Before Submission

### 2. App Store Assets

#### Required Screenshots
You'll need screenshots for different device sizes:

**iPad (Required if supporting iPad)**
- 12.9" Display (iPad Pro)
  - Size: 2048 x 2732 pixels
  - Minimum: 3 screenshots, Maximum: 10

**How to capture:**
1. Run app in iOS Simulator
2. Navigate to key screens:
   - Home screen with animal selection
   - Create screen with hybrid animal selection
   - Coloring screen showing the canvas and tools
   - Animal Pen showing saved creations
   - A completed colored animal
3. Take screenshots: `Cmd + S` in Simulator
4. Screenshots saved to Desktop

#### App Preview Video (Optional but Recommended)
- Max 30 seconds
- Shows key features: selecting animals, coloring, saving
- Same dimensions as screenshots

#### App Icon
- ✅ Current: 1024x1024 PNG (already have this in assets/icon.png)
- Must not have transparency
- Must not have rounded corners (Apple adds them)

---

### 3. App Store Metadata

#### App Name
**Coloring Creatures** (already set)

#### Subtitle (30 characters max)
Suggested: "Mix & Color Hybrid Animals"

#### Description (4000 characters max)
See `APP_STORE_DESCRIPTION.md` for full copy

#### Keywords (100 characters max, comma-separated)
```
coloring,kids,animals,creative,art,drawing,children,education,hybrid,fun
```

#### Promotional Text (170 characters, can update anytime)
```
Create magical animal hybrids! Mix a giraffe and zebra, then bring them to life with colors. Endless combinations for creative fun!
```

#### What's New in This Version
```
Initial release of Coloring Creatures!
• Create unique hybrid animals
• Color with easy-to-use tools
• Save your creations to the Animal Pen
• 12 base animals with 66 hybrid combinations
```

---

### 4. App Store Information

#### Category
- Primary: **Education** or **Entertainment**
- Secondary: **Education** (if primary is Entertainment)

#### Age Rating
Based on your app content:
- Violence: None
- Sexual Content: None
- Profanity: None
- Gambling: None
- **Suggested Rating: 4+** (suitable for young children)

#### Privacy Policy URL
Required if you collect any data. See `PRIVACY_POLICY.md`

#### Support URL
Your website or GitHub: `https://github.com/bolkE12/ColoringApp`

#### Marketing URL (Optional)
A landing page for your app

---

### 5. EAS Build Setup

Create `eas.json`:
```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "ios": {
        "buildConfiguration": "Release"
      },
      "android": {
        "buildType": "apk"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

**Commands to use (after Apple approval):**
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Configure project
eas build:configure

# Build for iOS (requires Apple Developer account)
eas build --platform ios

# Submit to App Store (after build completes)
eas submit --platform ios
```

---

### 6. Privacy Policy

Your app saves images locally and may use in-app purchases. You MUST have a privacy policy.

See `PRIVACY_POLICY.md` for a template you can customize and host.

---

### 7. Testing Checklist

Before submission, test thoroughly:

**Core Features:**
- [ ] Can select animals on home screen
- [ ] Can create hybrid animals
- [ ] Coloring canvas loads correctly
- [ ] Fill tool works on all regions
- [ ] Brush tool draws smoothly
- [ ] Undo works correctly
- [ ] Clear removes all colors
- [ ] Save creates image in Animal Pen
- [ ] Name generation works
- [ ] Name cycling (previous/next) works
- [ ] Text-to-speech speaks names correctly
- [ ] Music toggle works
- [ ] Background music plays

**Edge Cases:**
- [ ] App works on iPhone SE (small screen)
- [ ] App works on iPad (large screen)
- [ ] App works in portrait orientation
- [ ] Landscape mode displays correctly
- [ ] App handles low memory situations
- [ ] Images save successfully every time
- [ ] No crashes when rapidly tapping
- [ ] All animals load correctly

**Performance:**
- [ ] App launches in < 3 seconds
- [ ] No frame drops when coloring
- [ ] Smooth animations
- [ ] Images load quickly
- [ ] No memory leaks

**Permissions:**
- [ ] Photo library permission prompts correctly
- [ ] Graceful handling if permission denied
- [ ] Background music permission works

---

### 8. App Review Preparation

Apple will review your app. Be ready to provide:

**Demo Account (if needed)**
- Not needed for your app (no login required)

**Review Notes**
```
Coloring Creatures is a creative app for children to mix and color animals.

How to test:
1. Tap "Create Animal" on home screen
2. Select two different animals (e.g., Giraffe + Zebra)
3. Tap on the canvas to color using the fill tool
4. Switch to brush tool to draw freehand
5. Save your creation to the Animal Pen
6. View saved animals in the Pen

The app requests photo library access only for saving colored images locally.
No account or login required.
```

**App Store Review Guidelines Compliance**
- ✅ No private API usage
- ✅ No misleading functionality
- ✅ Appropriate for 4+ age rating
- ✅ No in-app purchases yet (can add later)
- ✅ Privacy permissions clearly explained
- ✅ No ads
- ✅ No third-party login required

---

### 9. Pre-Launch Checklist

**Before clicking "Submit for Review":**
- [ ] All screenshots uploaded (at least 3 per device size)
- [ ] App icon uploaded (1024x1024)
- [ ] Description written and proofread
- [ ] Keywords optimized
- [ ] Privacy policy URL added
- [ ] Support URL added
- [ ] Age rating completed
- [ ] Pricing set (Free with $0.99 IAP)
- [ ] Build uploaded via EAS
- [ ] TestFlight testing completed
- [ ] All review notes added

---

### 10. Post-Approval Tasks

**After Apple Developer approval, you can:**
1. Set up your App Store Connect account
2. Create app listing
3. Build app using EAS: `eas build --platform ios`
4. Upload to TestFlight for beta testing
5. Submit for App Store review
6. Monitor review status

**Timeline expectations:**
- Build time: 10-20 minutes
- TestFlight processing: 5-30 minutes
- App Review: 24-48 hours (average)

---

## Quick Reference

### Important URLs
- App Store Connect: https://appstoreconnect.apple.com
- Expo EAS Docs: https://docs.expo.dev/build/introduction/
- App Store Guidelines: https://developer.apple.com/app-store/review/guidelines/
- Screenshot Specs: https://developer.apple.com/help/app-store-connect/reference/screenshot-specifications

### Commands
```bash
# Build for iOS
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios --latest

# Check build status
eas build:list
```

---

## Need Help?

Common issues and solutions in SETUP.md
