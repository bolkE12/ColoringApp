// metro.config.js
const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Do NOT set babelTransformerPath to react-native-svg-transformer.
// Do NOT move 'svg' into sourceExts.
module.exports = config;