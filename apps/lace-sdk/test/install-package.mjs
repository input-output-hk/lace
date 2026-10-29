import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { channelPublishedPeers } from '../scripts/entries.mjs';
import { manifestForDistribution } from '../scripts/pack.mjs';

export const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);
export const manifest = JSON.parse(
  fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'),
);

/**
 * The Midnight packages whose `package.json` the monorepo's postinstall
 * (`scripts/fix-wallet-sdk-abstractions.js`) rewrites with a `main` field and
 * a `require` export condition. A consumer installs them from the registry
 * unpatched, so the ones this package declares are installed here with their
 * upstream manifests: the published package must load without that patch.
 * The install stays a symlink farm over the monorepo's node_modules, so the
 * packages' own dependencies resolve from the monorepo; it is not a registry
 * install.
 */
const PATCHED_BY_POSTINSTALL = new Set([
  '@midnightntwrk/wallet-sdk-abstractions',
  '@midnightntwrk/wallet-sdk-address-format',
]);

const withoutPostinstallPatch = manifest => {
  const { main: _main, ...rest } = manifest;
  const exports = rest.exports;
  if (exports && typeof exports === 'object') {
    for (const [subpath, conditions] of Object.entries(exports)) {
      if (
        conditions &&
        typeof conditions === 'object' &&
        'require' in conditions
      ) {
        const { require: _require, ...upstream } = conditions;
        exports[subpath] = upstream;
      }
    }
  }
  return rest;
};

/** The installed copy of `name` that Node resolves from this package. */
export const findInstalledDependency = name => {
  for (
    let directory = packageDirectory;
    directory !== path.dirname(directory);
    directory = path.dirname(directory)
  ) {
    const candidate = path.join(directory, 'node_modules', name);
    if (fs.existsSync(path.join(candidate, 'package.json'))) return candidate;
  }
  throw new Error(`Dependency ${name} is not installed`);
};

/** Runs `use` in a temporary install with only the built channel and its declared dependencies and peers. */
export const withInstalledPackage = async (prefix, use) => {
  const installDirectory = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  try {
    const nodeModules = path.join(installDirectory, 'node_modules');
    const installed = path.join(nodeModules, manifest.name);
    fs.mkdirSync(installed, { recursive: true });
    fs.writeFileSync(
      path.join(installed, 'package.json'),
      JSON.stringify(
        manifestForDistribution(path.join(packageDirectory, 'dist')),
      ),
    );
    for (const entry of manifest.files) {
      fs.cpSync(
        path.join(packageDirectory, entry),
        path.join(installed, entry),
        { recursive: true },
      );
    }
    // The canary-only entries' published-only peers stay out: the entries
    // load them lazily, so a consumer without them must still load the
    // package, and the workspace installs them only under passport-account.
    const publishedOnly = channelPublishedPeers('canary');
    for (const name of Object.keys({
      ...manifest.dependencies,
      ...manifestForDistribution(path.join(packageDirectory, 'dist'))
        .peerDependencies,
    }).filter(name => !(name in publishedOnly))) {
      const link = path.join(nodeModules, name);
      fs.mkdirSync(path.dirname(link), { recursive: true });
      const source = findInstalledDependency(name);
      if (!PATCHED_BY_POSTINSTALL.has(name)) {
        fs.symlinkSync(source, link, 'dir');
        continue;
      }
      // Only the manifest is replaced; the files stay symlinks, so the
      // package's own dependencies still resolve from where it is installed.
      fs.mkdirSync(link);
      for (const entry of fs.readdirSync(source)) {
        if (entry === 'package.json') continue;
        fs.symlinkSync(path.join(source, entry), path.join(link, entry));
      }
      fs.writeFileSync(
        path.join(link, 'package.json'),
        JSON.stringify(
          withoutPostinstallPatch(
            JSON.parse(
              fs.readFileSync(path.join(source, 'package.json'), 'utf8'),
            ),
          ),
          undefined,
          2,
        ),
      );
    }
    return await use(installDirectory);
  } finally {
    fs.rmSync(installDirectory, { recursive: true, force: true });
  }
};
