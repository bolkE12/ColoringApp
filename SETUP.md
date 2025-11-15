# ColoringApp Setup Instructions

## The Problem

If you're seeing errors like:
```
Error: Asset not found: /Users/brian/ColoringApp/assets/base/giraffe.svg
```

This is caused by **Metro Bundler cache** from when the project used SVG files. The app now uses PNG files exclusively.

## The Solution

### Step 1: Pull Latest Changes

```bash
cd /Users/brian/ColoringApp
git fetch origin
git pull origin claude/pull-main-expo-setup-011sZaUrzwxkz5FUBFPrYxFz
```

### Step 2: Nuclear Cache Clear

Run the provided script:

```bash
chmod +x clear-cache.sh
./clear-cache.sh
```

Or manually:

```bash
# Kill any running Metro/Expo processes
pkill -f "metro" || true
pkill -f "expo" || true

# Remove ALL cache and build artifacts
rm -rf node_modules
rm -rf .expo
rm -rf .metro
rm -rf /tmp/metro-*
rm -rf /tmp/react-*
rm -rf /tmp/haste-map-*
rm -f package-lock.json

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

# Clear npm cache
npm cache clean --force

# Fresh install
npm install
```

### Step 3: Start Fresh

```bash
# IMPORTANT: Use -c flag to clear Metro cache
npx expo start -c
```

## What Was Fixed

1. **Removed `react-native-svg-transformer`** from `package.json`
   - This was telling Metro to transform SVG files, which don't exist anymore

2. **Removed SVG type declarations** (`declarations.d.ts`, `types/svg-raw.d.ts`)
   - These were telling TypeScript that SVG files could be imported

3. **Updated `metro.config.js`**
   - Explicitly prevents SVG from being treated as a source file
   - Ensures SVG stays as an asset extension only

## Troubleshooting

### Still seeing SVG errors?

1. **Close your terminal completely** and open a fresh one
2. **Check you're in the right directory**: `pwd` should show `/Users/brian/ColoringApp`
3. **Verify you pulled the latest changes**: `git log -1` should show "Fix Metro bundler SVG cache issues"
4. **Make sure all processes are killed**: `ps aux | grep metro` should show nothing
5. **Try a fresh clone** (last resort):
   ```bash
   cd /Users/brian
   mv ColoringApp ColoringApp_backup
   git clone https://github.com/bolkE12/ColoringApp.git
   cd ColoringApp
   git checkout claude/pull-main-expo-setup-011sZaUrzwxkz5FUBFPrYxFz
   npm install
   npx expo start -c
   ```

### Node Version Issues

You're using Node v24.11.0, which is very new. Expo 54 officially supports Node 18-20. If issues persist, consider using Node 20:

```bash
nvm install 20
nvm use 20
npm install
npx expo start -c
```

## Files That Should Exist

✅ All animal images should be **PNG files**:
- `assets/base/giraffe.png` ✅
- `assets/base/zebra.png` ✅
- `assets/hybrid/giraffe_zebra.png` ✅

❌ There should be **NO SVG files** in the assets directory

## Files That Should NOT Exist

These files have been removed and should not exist:
- ❌ `declarations.d.ts`
- ❌ `types/svg-raw.d.ts`

## Need Help?

If you're still having issues after following all these steps, please share:
1. The exact error message
2. Output of `git status`
3. Output of `npm ls react-native-svg-transformer` (should show "not installed")
