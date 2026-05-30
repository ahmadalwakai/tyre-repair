const path = require('path');

process.env.EXPO_NO_METRO_WORKSPACE_ROOT =
  process.env.EXPO_NO_METRO_WORKSPACE_ROOT || '1';
process.env.EXPO_PROJECT_ROOT =
  process.env.EXPO_PROJECT_ROOT || path.resolve(__dirname, '..');
