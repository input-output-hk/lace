import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const nodeModulesPath = resolve(repoRoot, 'apps/lace-sdk/node_modules');

if (!existsSync(nodeModulesPath)) {
  process.exit(0);
}

// LW-15105: the SDK retains its v1 development peers while the extension uses
// v2 at the root. This exception does not establish SDK compatibility with v2.
const retainedMidnightPackages = new Map([
  ['@midnightntwrk/wallet-sdk', '1.2.0'],
  ['@midnightntwrk/wallet-sdk-abstractions', '2.1.0'],
  ['@midnightntwrk/wallet-sdk-address-format', '3.1.2'],
  ['@midnightntwrk/wallet-sdk-indexer-client', '1.2.3'],
  ['@midnightntwrk/wallet-sdk-utilities', '1.2.1'],
  ['@scure/base', '2.4.0'],
]);
const installedPackages = readdirSync(nodeModulesPath)
  .filter(entry => !entry.startsWith('.'))
  .flatMap(entry =>
    entry.startsWith('@')
      ? readdirSync(resolve(nodeModulesPath, entry)).map(
          name => `${entry}/${name}`,
        )
      : [entry],
  );
const unexpectedPackages = installedPackages.filter(name => {
  const expected = retainedMidnightPackages.get(name);
  if (!expected) return true;
  const manifest = resolve(nodeModulesPath, name, 'package.json');
  if (!existsSync(manifest)) return true;
  return JSON.parse(readFileSync(manifest, 'utf8')).version !== expected;
});

if (unexpectedPackages.length > 0) {
  // eslint-disable-next-line no-console
  console.error(
    `Unexpected SDK-local dependencies:\n${unexpectedPackages.join('\n')}\n` +
      'Only the pinned LW-15105 Midnight v1 development dependency closure may remain local.\n' +
      'Align other SDK dependencies with the root package.json.',
  );
  process.exit(1);
}
