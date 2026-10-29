import { existsSync, statSync } from 'node:fs';
import path from 'node:path';

/**
 * Fails when the production build is missing a file the extension needs. An
 * interrupted build can exit successfully with a partial `dist`, and Nx would
 * cache that output as a good build.
 */
const REQUIRED_FILES = [
  'manifest.json',
  'expo/index.html',
  'js/isolated-script.js',
  'js/injected-script.js',
  'js/sw/sw-script.js',
];

const distDirectory = path.join(__dirname, '..', 'dist');

const missing = REQUIRED_FILES.filter(file => {
  const filePath = path.join(distDirectory, file);
  return !existsSync(filePath) || statSync(filePath).size === 0;
});

if (missing.length > 0) {
  console.error(
    `lace-extension build output is incomplete; missing or empty in dist: ${missing.join(
      ', ',
    )}`,
  );
  process.exit(1);
}

console.log(
  `lace-extension build output has all ${REQUIRED_FILES.length} required files`,
);
