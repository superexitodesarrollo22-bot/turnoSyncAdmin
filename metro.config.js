const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Soporte para .cjs (necesario para algunos módulos de Supabase en SDK 54)
config.resolver.sourceExts.push('cjs');

// Desactivar el resolver de package exports si hay conflictos
config.resolver.unstable_enablePackageExports = false;

module.exports = config;
