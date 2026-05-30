// Custom Expo Router entry. Mirrors `expo-router/entry-classic` (so splash
// dismissal, error overlay, and HMR keep working) and adds Sentry on top.
// Keep this file as plain CommonJS — it is the React Native runtime entry
// (`package.json` "main") and must work with both Hermes and Metro require.

// Side-effect import required by react-native-gesture-handler on Android so
// the native module attaches before any RN view tries to use it.
require('react-native-gesture-handler');
require('@expo/metro-runtime');

const Sentry = require('@sentry/react-native');
const { App } = require('expo-router/build/qualified-entry');
const { renderRootComponent } = require('expo-router/build/renderRootComponent');

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

if (sentryDsn) {
  try {
    Sentry.init({
      dsn: sentryDsn,
      sendDefaultPii: false,
      tracesSampleRate: 0.1,
      enableNative: true,
      environment: __DEV__ ? 'development' : 'production',
    });
  } catch {
    // Never let telemetry setup prevent the app from booting.
  }
}

renderRootComponent(sentryDsn ? Sentry.wrap(App) : App);
