const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// In monorepo setups the babel caller object doesn't always carry the
// `projectRoot`, so babel-preset-expo's expo-router plugin falls back to the
// EXPO_PROJECT_ROOT env var when resolving the router app root. Set it here
// so every Metro worker process inherits the right value.
process.env.EXPO_PROJECT_ROOT =
  process.env.EXPO_PROJECT_ROOT || path.resolve(__dirname);

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;

// Force a single (compatible) react-native-worklets version. Reanimated 4.2.x
// requires worklets 0.7.x but npm hoists 0.8.x to the workspace root for any
// consumer that asks for ">=0.7.0". Aliasing here makes Metro resolve every
// import of `react-native-worklets` to the local 0.7.x copy, regardless of
// which package issued the request.
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules ?? {}),
  'react-native-worklets': path.resolve(
    projectRoot,
    'node_modules/react-native-worklets',
  ),
};

module.exports = withNativeWind(config, { input: './global.css' });
