const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');
const path = require('path');

// In monorepo setups the babel caller object doesn't always carry the
// `projectRoot`, so babel-preset-expo's expo-router plugin falls back to the
// EXPO_PROJECT_ROOT env var when resolving the router app root. Set it here
// so every Metro worker process inherits the right value.
process.env.EXPO_PROJECT_ROOT =
  process.env.EXPO_PROJECT_ROOT || path.resolve(__dirname);
process.env.EXPO_ROUTER_APP_ROOT =
  process.env.EXPO_ROUTER_APP_ROOT || '../../app';

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);
config.watchFolders = [workspaceRoot];
// Native build outputs (CMake/Gradle) create and delete short-lived temp
// directories under android/.cxx and android/build. Metro's fallback watcher
// (used when watchman isn't installed) crashes with ENOENT when one of those
// dirs vanishes between scan and watch. Exclude them.
const nativeBuildBlockList = [
  // Any CMake/Gradle build output under any `android` directory (the app's
  // own android/ folder, plus any android/ folder shipped inside a native
  // package under node_modules).
  /[\\/]android[\\/](?:app[\\/])?\.cxx[\\/]/,
  /[\\/]android[\\/](?:app[\\/])?build[\\/]/,
  // npm leaves empty platform-specific optional-dep stubs under node_modules
  // on Windows. Metro's fallback watcher walks them, then crashes with
  // ENOENT when they vanish. Match any package whose final path segment
  // ends in a {platform}-{arch}{?-libc} token (darwin-arm64, linux-x64-gnu,
  // win32-ia32-msvc, etc.) under any node_modules/ or node_modules/@scope/.
  /[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]*(?:darwin|linux|win32|freebsd|openbsd|netbsd|sunos|android|ios|wasi|wasm32)-[^\\/]+[\\/]?$/,
  /[\\/]node_modules[\\/](?:@[^\\/]+[\\/])?[^\\/]*(?:darwin|linux|win32|freebsd|openbsd|netbsd|sunos|android|ios|wasi|wasm32)-[^\\/]+[\\/].+/,
];
const existingBlockList = config.resolver.blockList;
config.resolver.blockList = existingBlockList
  ? Array.isArray(existingBlockList)
    ? [...existingBlockList, ...nativeBuildBlockList]
    : [existingBlockList, ...nativeBuildBlockList]
  : nativeBuildBlockList;
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];
config.resolver.disableHierarchicalLookup = true;
// Expo SDK 54 enables Metro package.json `exports` by default. @sentry/core
// 10.x ships an exports map that only lists the root entry, which breaks
// Metro's resolution of its own internal relative imports (e.g.
// ./semanticAttributes.js from build/esm/index.js). Disable until Sentry
// publishes a Metro-friendly exports map.
config.resolver.unstable_enablePackageExports = false;

// With package exports disabled, Metro picks @tanstack/query-core's `module`
// field (build/legacy/index.js). That file is ESM but the package is also
// `"type": "module"`, which trips Metro's resolver on the web platform.
// Force resolution to the CommonJS build instead.
const tanstackCjsAliases = {
  '@tanstack/query-core': path.resolve(
    workspaceRoot,
    'node_modules/@tanstack/query-core/build/legacy/index.cjs',
  ),
  '@tanstack/react-query': path.resolve(
    workspaceRoot,
    'node_modules/@tanstack/react-query/build/legacy/index.cjs',
  ),
};

const previousResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const aliased = tanstackCjsAliases[moduleName];
  if (aliased) {
    return { type: 'sourceFile', filePath: aliased };
  }
  if (previousResolveRequest) {
    return previousResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
