// Runs the dependencies' install scripts after `npm ci --ignore-scripts`, as
// `npm ci` runs them: every installed copy the lockfile marks with an install
// script is rebuilt, a required copy's failure fails the install, and an
// optional copy whose script fails is removed, as npm ci leaves out an optional
// dependency it cannot build (chacha-native on Node 24, say), which
// `npm rebuild` alone does not. The root's own install scripts run last, as
// they do after an install; its prepare (git hooks) has no place in a build.
// Node's built-ins only, so it runs before anything installed is trusted.
//
//   node apps/lace-sdk/scripts/install-scripts.mjs
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

// Each installed location the lockfile marks with an install script, kept
// apart: one name can be installed at several versions, one copy required
// and another optional, and npm ci drops only the optional copy that fails.
const lock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const withScripts = Object.entries(lock.packages)
  .filter(
    ([location, entry]) =>
      location.includes('node_modules/') &&
      entry.hasInstallScript &&
      fs.existsSync(location),
  )
  .map(([location, entry]) => ({
    location,
    directory: path.resolve(location),
    optional: Boolean(entry.optional),
  }));
const required = withScripts.filter(entry => !entry.optional);
const optional = withScripts.filter(entry => entry.optional);

// npm rebuild takes a directory as the exact installed copy to rebuild
// (npm-package-arg's directory spec, matched against each node's path) and
// runs its install scripts as npm ci does: preinstall, install and
// postinstall, node-gyp's default where binding.gyp needs it, with npm's
// environment.
const npm = args => spawnSync('npm', args, { stdio: 'inherit' }).status;

process.stdout.write(
  `Rebuilding ${required.length} required packages: ${required
    .map(entry => entry.location)
    .join(', ')}\n`,
);
// npm rebuild with no directories rebuilds the whole tree, optional copies
// included, so an empty required set runs nothing.
if (
  required.length &&
  npm(['rebuild', ...required.map(entry => entry.directory)]) !== 0
) {
  process.stderr.write(
    '::error::a required dependency failed its install script\n',
  );
  process.exit(1);
}

for (const { location, directory } of optional) {
  // A copy nested in an optional one already left out went with it.
  if (!fs.existsSync(directory)) continue;
  if (npm(['rebuild', directory]) === 0) continue;
  fs.rmSync(directory, { recursive: true, force: true });
  process.stdout.write(
    `::notice::optional dependency ${location} failed its install script and is left out, as npm ci leaves it out\n`,
  );
}

const { scripts = {} } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
for (const event of ['preinstall', 'install', 'postinstall']) {
  if (scripts[event] && npm(['run', event]) !== 0) process.exit(1);
}
