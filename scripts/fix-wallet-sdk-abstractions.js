#!/usr/bin/env node

/**
 * Postinstall script to fix @midnight-ntwrk packages package.json
 *
 * These packages only have `module` and `exports` fields but no `main` field,
 * which causes CI build failures in webpack-based builds that expect a `main` field.
 *
 * Additionally, the `exports` field only defines `import` (ESM) but not `require` (CommonJS),
 * which causes Node.js to throw ERR_PACKAGE_PATH_NOT_EXPORTED when using require().
 *
 * This script:
 * 1. Adds a `main` field pointing to `dist/index.js` (from the `module` field)
 * 2. Adds a `require` entry to the `exports` field for CommonJS compatibility
 */

const fs = require('fs');
const path = require('path');

// List of problematic packages to fix (from babel-plugin-fix-midnight-packages.js)
// TODO: remove as part of DoD for LW-13253 and V2 mobile
const PACKAGES_TO_FIX = [
  'dapp-connector-api',
  'wallet-sdk-abstractions',
  'wallet-sdk-address-format',
  'wallet-sdk-hd',
];

/**
 * Fix a single package's package.json
 * @param {string} packageName - The package name without @midnight-ntwrk/ prefix
 * @returns {boolean} - Returns true if package was fixed, false otherwise
 */
const fixPackage = packageName => {
  const fullPackageName = `@midnight-ntwrk/${packageName}`;
  const packageJsonPath = path.join(
    __dirname,
    '..',
    'node_modules',
    fullPackageName,
    'package.json',
  );

  try {
    // Check if package is installed
    if (!fs.existsSync(packageJsonPath)) {
      console.log(
        `[postinstall] ${fullPackageName} not found, skipping fix (package may not be installed)`,
      );
      return false;
    }

    // Read package.json
    const packageJsonContent = fs.readFileSync(packageJsonPath, 'utf8');
    const packageJson = JSON.parse(packageJsonContent);

    // Determine the main entry point
    // Use 'module' field if available, otherwise default to 'dist/index.js'
    const mainEntryPoint = packageJson.module || 'dist/index.js';
    // Ensure mainEntryPointWithDot starts with ./ but doesn't have double ./
    const mainEntryPointWithDot =
      mainEntryPoint.startsWith('./') || mainEntryPoint.startsWith('../')
        ? mainEntryPoint
        : `./${mainEntryPoint}`;

    let changesMade = [];

    // Add main field if it doesn't exist
    if (!packageJson.main) {
      packageJson.main = mainEntryPoint;
      changesMade.push(`added 'main' field: ${mainEntryPoint}`);
    }

    // Add require entry to exports field if it exists and doesn't have require
    if (packageJson.exports && typeof packageJson.exports === 'object') {
      // Handle exports as an object with '.' key
      if (
        packageJson.exports['.'] &&
        typeof packageJson.exports['.'] === 'object'
      ) {
        if (!packageJson.exports['.'].require) {
          packageJson.exports['.'].require = mainEntryPointWithDot;
          changesMade.push(
            `added 'exports["."].require' field: ${mainEntryPointWithDot}`,
          );
        }
      }
    }

    // Only write if we made changes
    if (changesMade.length > 0) {
      // Write updated package.json back
      // Preserve formatting by using 2-space indentation
      const updatedContent = JSON.stringify(packageJson, null, 2) + '\n';
      fs.writeFileSync(packageJsonPath, updatedContent, 'utf8');

      console.log(
        `[postinstall] Fixed ${fullPackageName}: ${changesMade.join(', ')}`,
      );
      return true;
    } else {
      console.log(
        `[postinstall] ${fullPackageName} already has required fields, skipping fix`,
      );
      return false;
    }
  } catch (error) {
    // Don't fail the install process if this script fails
    console.error(
      `[postinstall] Error fixing ${fullPackageName}:`,
      error.message,
    );
    return false;
  }
};

// Fix all packages
let fixedCount = 0;
for (const packageName of PACKAGES_TO_FIX) {
  if (fixPackage(packageName)) {
    fixedCount++;
  }
}

if (fixedCount === 0) {
  console.log('[postinstall] No packages needed fixing');
}
