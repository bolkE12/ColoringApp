#!/bin/bash

echo "🧹 Clearing all caches and build artifacts..."

# Stop any running Metro bundler
echo "Stopping any running Metro bundler..."
pkill -f "metro" || true
pkill -f "expo" || true

# Remove node_modules
echo "Removing node_modules..."
rm -rf node_modules

# Remove package-lock.json
echo "Removing package-lock.json..."
rm -f package-lock.json

# Remove Expo cache
echo "Removing .expo cache..."
rm -rf .expo

# Remove Metro cache
echo "Removing Metro cache..."
rm -rf .metro

# Remove temp folders
echo "Removing temp folders..."
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf /tmp/react-* 2>/dev/null || true
rm -rf /tmp/haste-map-* 2>/dev/null || true

# Clear watchman (if installed)
echo "Clearing watchman..."
watchman watch-del-all 2>/dev/null || echo "Watchman not installed, skipping..."

# Clear npm cache
echo "Clearing npm cache..."
npm cache clean --force

# Reinstall dependencies
echo "Reinstalling dependencies..."
npm install

echo ""
echo "✅ All caches cleared!"
echo ""
echo "Now run: npx expo start -c"
echo ""
