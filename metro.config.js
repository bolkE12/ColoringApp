// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);

// Do NOT set babelTransformerPath to react-native-svg-transformer.
// Do NOT move 'svg' into sourceExts.
// Explicitly keep SVG as an asset extension only (not a source extension)
// This prevents Metro from trying to transform SVG files

// Ensure SVG stays in assetExts and not sourceExts
config.resolver.assetExts = config.resolver.assetExts || [];
config.resolver.sourceExts = config.resolver.sourceExts || [];

// Make sure svg is NOT in sourceExts
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'svg');

// Make sure svg IS in assetExts (if not already there)
if (!config.resolver.assetExts.includes('svg')) {
  config.resolver.assetExts.push('svg');
}

module.exports = config;