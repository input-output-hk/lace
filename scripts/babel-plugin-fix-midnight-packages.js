/* eslint-disable no-console */
// Babel plugin to fix problematic midnight-ntwrk imports
// This plugin temporarily removes the 'exports' field from problematic @midnight-ntwrk packages
const fs = require('fs');
const path = require('path');
const Module = require('module');

// List of problematic packages to patch (removes 'exports' field so Node falls back to 'main')
// Only works when the package has a CJS file reachable via 'main' or root-level fallback.
const packagesToPatch = [
  'dapp-connector-api',
  'wallet-sdk-abstractions',
  'wallet-sdk-address-format',
  'wallet-sdk-hd',
  'midnight-js-http-client-proof-provider',
  'midnight-js-types',
];

// compact-js and platform-js have no CJS builds at all — their root-level files are also ESM.
// Removing their 'exports' field backfires: Node falls back to the ESM root files, which then
// use bare directory imports that the ESM resolver rejects with ERR_UNSUPPORTED_DIR_IMPORT.
// Instead, intercept Module._load and return an empty stub before any resolution is attempted.
// The diagram script only needs the module map structure (implements/dependsOn), not the runtime
// implementations, so returning {} is sufficient.
const STUB_PACKAGES = [
  '@midnight-ntwrk/compact-js/effect', // no CJS build; root-level effect/ is also ESM
  '@midnight-ntwrk/platform-js', // no CJS build; same issue
];

const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (
    STUB_PACKAGES.some(pkg => request === pkg || request.startsWith(pkg + '/'))
  ) {
    return {};
  }
  return originalLoad.apply(this, arguments);
};

const getPackageJsonPath = packageName =>
  path.join(
    __dirname,
    '..',
    'node_modules',
    '@midnight-ntwrk',
    packageName,
    'package.json',
  );
const getPackageJsonBackupPath = packageJsonPath => packageJsonPath + '.backup';

const patchMidnightPackages = () => {
  // Track patched packages
  const patchedPackages = new Set();

  packagesToPatch.forEach(packageName => {
    if (patchedPackages.has(packageName)) return;

    const packageJsonPath = getPackageJsonPath(packageName);
    const backupPath = getPackageJsonBackupPath(packageJsonPath);

    try {
      if (!fs.existsSync(packageJsonPath)) {
        console.warn(
          `Package @midnight-ntwrk/${packageName} not found, skipping`,
        );
        return;
      }

      // Read the current package.json
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

      // Only patch if exports field exists
      if (packageJson.exports) {
        // Create backup
        fs.writeFileSync(backupPath, JSON.stringify(packageJson, null, 2));

        // Remove the exports field
        delete packageJson.exports;
        // some packages package.json are missing "main"
        if (!packageJson.main) {
          packageJson.main = './dist/index.js';
        }

        // Write the patched version
        fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

        console.log(`Patched @midnight-ntwrk/${packageName} package.json`);
        patchedPackages.add(packageName);
      }
    } catch (error) {
      console.warn(
        `Could not patch @midnight-ntwrk/${packageName}:`,
        error.message,
      );
    }
  });

  const restorePackageJsons = () => {
    patchedPackages.forEach(packageName => {
      const packageJsonPath = getPackageJsonPath(packageName);

      const backupPath = packageJsonPath + '.backup';

      try {
        if (fs.existsSync(backupPath)) {
          // Restore from backup
          const backup = fs.readFileSync(backupPath, 'utf8');
          fs.writeFileSync(packageJsonPath, backup);

          // Remove backup file
          fs.unlinkSync(backupPath);

          console.log(`Restored @midnight-ntwrk/${packageName} package.json`);
        } else {
          console.warn('Backup not found:', backupPath);
        }
      } catch (error) {
        console.error(
          `Could not restore @midnight-ntwrk/${packageName}:`,
          error.message,
        );
      }
    });

    patchedPackages.clear();
  };

  // Register cleanup on process exit only once
  if (patchedPackages.size > 0) {
    const restoreAndExit = () => {
      restorePackageJsons();
      process.exit();
    };
    process.on('exit', restorePackageJsons);
    process.on('SIGINT', restoreAndExit);
    process.on('SIGTERM', restoreAndExit);
  }
};

// Apply patches immediately when the plugin is loaded
patchMidnightPackages();

// Babel plugin - doesn't need to do anything since patching happens on module load
module.exports = () => {
  return {
    visitor: {},
  };
};
