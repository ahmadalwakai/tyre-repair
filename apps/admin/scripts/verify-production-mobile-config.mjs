#!/usr/bin/env node
/**
 * Fails the build if any development-server / non-production URL reference
 * is found in the admin mobile sources, env files, or the generated Android
 * release bundle/assets.
 *
 * Run automatically by Gradle before the release JS bundle is assembled,
 * and can be invoked manually with:
 *
 *   node apps/admin/scripts/verify-production-mobile-config.mjs
 */

import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const ADMIN_ROOT = join(HERE, '..');
const REPO_ROOT = join(ADMIN_ROOT, '..', '..');

const PROD_API_BASE = 'https://www.tyrerepair.uk';

/** Patterns that must NEVER appear in shipped JS / config. */
const FORBIDDEN = [
  { re: /localhost:8081/gi,        label: 'Metro dev server (localhost:8081)' },
  { re: /127\.0\.0\.1:8081/gi,     label: 'Metro dev server (127.0.0.1:8081)' },
  { re: /10\.0\.2\.2:8081/gi,      label: 'Android emulator host (10.0.2.2:8081)' },
  { re: /\bexp:\/\//gi,            label: 'Expo Go scheme (exp://)' },
  { re: /\bexpo-development-client\b/gi, label: 'expo-development-client reference' },
  { re: /REACT_NATIVE_PACKAGER_HOSTNAME/g, label: 'Metro packager hostname override' },
  { re: /EXPO_USE_DEV_SERVER/g,    label: 'EXPO_USE_DEV_SERVER flag' },
];

/** Globs (relative to admin root) to scan for source-level violations. */
const SOURCE_ROOTS = ['src', 'app', 'index.js', 'babel.config.js', 'metro.config.js', '.env'];

/** Files inside generated Android assets that must contain ONLY production. */
const RELEASE_BUNDLE_PATHS = [
  'android/app/build/generated/assets/createBundleReleaseJsAndAssets/index.android.bundle',
  'android/app/build/ASSETS/createBundleReleaseJsAndAssets/index.android.bundle',
  'android/app/src/main/assets/index.android.bundle',
];

/**
 * Anything that hosts a getDevServer() fallback string is OK in non-shipped
 * source-map files (they are not part of the runtime APK). We only scan the
 * raw bundle binary, not its .map.
 */
const SKIP_FILE_PATTERNS = [
  /[\\/]node_modules[\\/]/,
  /[\\/]android[\\/].*[\\/]build[\\/]/,
  /\.map$/,
  /\.lock$/,
  /package-lock\.json$/,
  /yarn\.lock$/,
  /pnpm-lock\.yaml$/,
];

const FORBIDDEN_API_HOSTS = [
  /https?:\/\/localhost\b/gi,
  /https?:\/\/127\.0\.0\.1\b/gi,
  /https?:\/\/10\.0\.2\.2\b/gi,
];

const errors = [];

function walk(dir, out = []) {
  const stat = statSync(dir);
  if (stat.isFile()) {
    out.push(dir);
    return out;
  }
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (SKIP_FILE_PATTERNS.some((re) => re.test(p))) continue;
    try {
      const s = statSync(p);
      if (s.isDirectory()) walk(p, out);
      else if (s.isFile()) out.push(p);
    } catch {
      /* ignore */
    }
  }
  return out;
}

function scanText(file, text, patterns) {
  for (const { re, label } of patterns) {
    const m = text.match(re);
    if (m && m.length > 0) {
      errors.push(`${label} in ${relative(REPO_ROOT, file).split(sep).join('/')} (${m.length} match${m.length === 1 ? '' : 'es'})`);
    }
  }
}

/** Scan source files for forbidden tokens. */
function scanSources() {
  for (const root of SOURCE_ROOTS) {
    const full = join(ADMIN_ROOT, root);
    if (!existsSync(full)) continue;
    const files = walk(full);
    for (const f of files) {
      if (!/\.(t|j)sx?$|\.json$|\.env$|\.env\..*$|\.cjs$|\.mjs$/.test(f) && !f.endsWith('.env')) {
        // also accept dotfiles like .env without extension
        if (!/[\\/]\.env(?:\..+)?$/.test(f)) continue;
      }
      let txt;
      try { txt = readFileSync(f, 'utf8'); } catch { continue; }
      scanText(f, txt, FORBIDDEN);
      // Hard-fail any hard-coded non-prod API hosts.
      for (const re of FORBIDDEN_API_HOSTS) {
        const m = txt.match(re);
        if (m && m.length > 0) {
          errors.push(`Non-production API host ${m[0]} in ${relative(REPO_ROOT, f).split(sep).join('/')}`);
        }
      }
    }
  }
}

/** Verify the env file pins the prod API host. */
function checkEnv() {
  const envPath = join(ADMIN_ROOT, '.env');
  if (!existsSync(envPath)) {
    errors.push(`Missing apps/admin/.env (must define EXPO_PUBLIC_API_BASE_URL=${PROD_API_BASE})`);
    return;
  }
  const txt = readFileSync(envPath, 'utf8');
  const m = txt.match(/^EXPO_PUBLIC_API_BASE_URL\s*=\s*(.+)$/m);
  if (!m) {
    errors.push(`apps/admin/.env is missing EXPO_PUBLIC_API_BASE_URL (must be ${PROD_API_BASE})`);
    return;
  }
  const value = m[1].trim().replace(/^['"]|['"]$/g, '');
  if (value !== PROD_API_BASE) {
    errors.push(`apps/admin/.env: EXPO_PUBLIC_API_BASE_URL must be ${PROD_API_BASE} (found ${value})`);
  }
}

/** If a release bundle exists, scan its raw text for dev-server URLs. */
function scanReleaseBundle() {
  for (const rel of RELEASE_BUNDLE_PATHS) {
    const full = join(ADMIN_ROOT, rel);
    if (!existsSync(full)) continue;
    const buf = readFileSync(full);
    const txt = buf.toString('utf8');
    // Inside the compiled bundle, look for the exact prod host AND verify no
    // explicit dev-server URLs appear as string literals.
    if (!txt.includes(PROD_API_BASE)) {
      errors.push(`Release bundle missing production host literal ${PROD_API_BASE}: ${rel}`);
    }
    // We must not see explicit dev URLs as string literals embedded in the bundle.
    const bundleForbidden = [
      { re: /"http:\/\/localhost:8081/g, label: 'Embedded http://localhost:8081 literal' },
      { re: /"http:\/\/10\.0\.2\.2:8081/g, label: 'Embedded http://10.0.2.2:8081 literal' },
      { re: /"http:\/\/127\.0\.0\.1:8081/g, label: 'Embedded http://127.0.0.1:8081 literal' },
    ];
    scanText(full, txt, bundleForbidden);
  }
}

scanSources();
checkEnv();
scanReleaseBundle();

if (errors.length > 0) {
  console.error('\n[verify-production-mobile-config] FAILED:\n');
  for (const e of errors) console.error('  - ' + e);
  console.error('\nFix the above before producing a release APK.\n');
  process.exit(1);
}

console.log('[verify-production-mobile-config] OK — production config clean.');
