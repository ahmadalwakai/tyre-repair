const path = require('path');

// In monorepo setups the babel caller doesn't always carry `projectRoot`,
// so babel-preset-expo's expo-router plugin falls back to EXPO_PROJECT_ROOT.
// Setting it here ensures every Metro worker resolves the app root correctly.
process.env.EXPO_PROJECT_ROOT =
  process.env.EXPO_PROJECT_ROOT || path.resolve(__dirname);
process.env.EXPO_ROUTER_APP_ROOT =
  process.env.EXPO_ROUTER_APP_ROOT || '../../app';

module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel',
    ],
    plugins: ['react-native-reanimated/plugin'],
  };
};
