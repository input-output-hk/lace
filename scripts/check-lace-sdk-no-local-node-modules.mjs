import { existsSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nodeModulesPath = resolve(repoRoot, 'apps/lace-sdk/node_modules');

if (!existsSync(nodeModulesPath)) {
  process.exit(0);
}

const entries = readdirSync(nodeModulesPath);
// npm may create node_modules with only .package-lock.json — that's fine
const realPackages = entries.filter(
  entry => !entry.startsWith('.') && entry !== '.package-lock.json',
);

if (realPackages.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `\n❌ apps/lace-sdk has local node_modules with non-hoisted packages:\n` +
      realPackages.map(package_ => `  - ${package_}`).join('\n') +
      `\n\nAll dependencies of @input-output-hk/lace-sdk must be hoisted to the monorepo root.\n` +
      `Fix: align the dependency versions in apps/lace-sdk/package.json with the root package.json.\n`,
  );
  process.exit(1);
}
