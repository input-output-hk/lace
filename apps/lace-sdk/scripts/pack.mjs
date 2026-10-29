// Packs a built channel of the SDK the way a release publishes it: the one
// way the package becomes a tarball, shared by the public repository's
// publish-release.yml and the developer site's build, so both hold the same
// bytes for the same build.
//
//   node scripts/pack.mjs --out <dir> [--dist <dir>] [--name <name>] [--version <v>] [--development]
//
// `npm pack` packs the package directory, whose dist/ holds whichever channel
// was built last, so the build is staged first: package.json (with the name
// or version overridden where asked, as a canary's version or the GitHub
// Packages name is), the README and the licence, if any, and the given dist
// directory as dist/. The staged manifest declares the canary-only entries
// only when the build holds them (manifestForDistribution), so this script
// packs either channel. Prints the tarball's file name, and with --json its name, version, file name,
// SHA-256 and integrity.
//
// package.json names the development version (scripts/releases.mjs) outside
// a release: a release stamps the version it computed into its own copy, or
// passes --version. Packing the development version is refused, so it never
// publishes, unless --development says the tarball is for a local build, such
// as the developer site's preview of the checked-out source.
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

import { CANARY_ONLY_ENTRIES, entryFiles } from './entries.mjs';
import { DEVELOPMENT_VERSION } from './releases.mjs';

const packageDirectory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
);

/** The files npm packs beside the manifest and `files`: the README and licence. */
const ALWAYS_PACKED = /^(README|LICEN[CS]E)(\..*)?$/i;

/**
 * The peers whose published range differs from the workspace manifest's. The
 * workspace pins every @midnight-ntwrk package exactly (its lint rule), but a
 * published peer at an exact version conflicts with the newer patch a
 * consumer or the wallet SDK itself may hold, so the tarball declares the
 * wallet SDK's own caret range for exactly these reviewed pins. Any other
 * pin of such a package, or a change to a listed one, fails the pack so the
 * published range is decided deliberately.
 */
export const PUBLISHED_PEER_RANGES = {
  '@midnight-ntwrk/ledger-v8': { pin: '8.1.0', published: '^8.1.0' },
};

// An exact version as npm reads one (semver's loose form, which npm applies
// to a dependency specifier): any "=", "v" and spaces, then
// major.minor.patch, an optional pre-release with or without its hyphen and
// an optional build; "8", "8.x" and "8.1.0 - 8.1.3" are ranges.
const EXACT_VERSION =
  /^[v=\s]*\d+\.\d+\.\d+(?:-?(?:\d+|\d*[A-Za-z-][0-9A-Za-z-]*)(?:\.(?:\d+|\d*[A-Za-z-][0-9A-Za-z-]*))*)?(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/;

/** The range the tarball declares for a peer the workspace manifest declares at `version`. */
export const publishedPeerRange = (name, version) => {
  const reviewed = PUBLISHED_PEER_RANGES[name];
  if (reviewed) {
    if (version !== reviewed.pin)
      throw new Error(
        `${name} is pinned at ${version}, not the reviewed ${reviewed.pin}; update PUBLISHED_PEER_RANGES in scripts/pack.mjs`,
      );
    return reviewed.published;
  }
  if (/^@midnight-ntwrk\//.test(name) && EXACT_VERSION.test(version.trim()))
    throw new Error(
      `${name} is an exact peer pin with no reviewed published range; add it to PUBLISHED_PEER_RANGES in scripts/pack.mjs`,
    );
  return version;
};

/**
 * The package's manifest as a build in `distribution` publishes it. The
 * canary-only entries (scripts/entries.mjs) stay when the build holds them;
 * otherwise, as in a stable build, the manifest declares neither them nor
 * the peers that serve only them (ADR 66: the stable package names no canary
 * feature).
 */
export const manifestForDistribution = distribution => {
  const manifest = JSON.parse(
    fs.readFileSync(path.join(packageDirectory, 'package.json'), 'utf8'),
  );
  const built = CANARY_ONLY_ENTRIES.filter(({ name }) => {
    const present = entryFiles(name).map(file =>
      fs.existsSync(path.join(distribution, file)),
    );
    if (present.some(Boolean) && !present.every(Boolean)) {
      throw new Error(`${distribution} holds an incomplete ${name} entry`);
    }
    return present.every(Boolean);
  });
  for (const [name, version] of Object.entries(
    manifest.peerDependencies ?? {},
  )) {
    manifest.peerDependencies[name] = publishedPeerRange(name, version);
  }
  for (const { publishedPeers = {} } of built) {
    for (const [name, range] of Object.entries(publishedPeers)) {
      manifest.peerDependencies = {
        ...manifest.peerDependencies,
        [name]: range,
      };
      manifest.peerDependenciesMeta = {
        ...manifest.peerDependenciesMeta,
        [name]: { optional: true },
      };
    }
  }
  const isServedByBuiltEntry = peer =>
    built.some(({ peers }) => peers.some(pattern => pattern.test(peer)));
  for (const { name, peers } of CANARY_ONLY_ENTRIES) {
    if (built.some(entry => entry.name === name)) continue;
    delete manifest.exports[`./${name}`];
    for (const peer of Object.keys(manifest.peerDependencies ?? {})) {
      if (
        peers.some(pattern => pattern.test(peer)) &&
        !isServedByBuiltEntry(peer)
      ) {
        delete manifest.peerDependencies[peer];
        delete manifest.peerDependenciesMeta?.[peer];
      }
    }
  }
  return manifest;
};

/**
 * Packs the build in `distribution` (the package's dist/ by default) into
 * `out`, as `name` at `version` when given. A tarball of the development
 * version is refused unless `development` is set.
 * Returns `{ name, version, filename, path, sha256, integrity }`.
 */
export const packSdk = ({
  distribution = path.join(packageDirectory, 'dist'),
  out,
  name,
  version,
  development = false,
}) => {
  const distributionDirectory = path.resolve(packageDirectory, distribution);
  for (const entry of [
    'index.js',
    'index.d.ts',
    'cardano.js',
    'cardano.d.ts',
  ]) {
    if (!fs.existsSync(path.join(distributionDirectory, entry))) {
      throw new Error(
        `${distributionDirectory} holds no built SDK (${entry} missing); build the channel first (bash scripts/build.sh)`,
      );
    }
  }
  const manifest = manifestForDistribution(distributionDirectory);
  if (name) manifest.name = name;
  if (version) manifest.version = version;
  if (manifest.version === DEVELOPMENT_VERSION && !development) {
    throw new Error(
      `${manifest.name} is at the development version ${DEVELOPMENT_VERSION}, which never publishes: pass the release's version (--version), or --development for a local build`,
    );
  }

  const staging = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-pack-'));
  try {
    fs.writeFileSync(
      path.join(staging, 'package.json'),
      JSON.stringify(manifest, undefined, 2) + '\n',
    );
    for (const entry of fs.readdirSync(packageDirectory)) {
      if (ALWAYS_PACKED.test(entry)) {
        fs.copyFileSync(
          path.join(packageDirectory, entry),
          path.join(staging, entry),
        );
      }
    }
    fs.cpSync(distributionDirectory, path.join(staging, 'dist'), {
      recursive: true,
    });
    fs.mkdirSync(out, { recursive: true });
    const run = spawnSync(
      'npm',
      ['pack', '--json', '--pack-destination', path.resolve(out), staging],
      {
        encoding: 'utf8',
        env: { ...process.env, NPM_CONFIG_LOGLEVEL: 'error' },
      },
    );
    if (run.status !== 0) {
      throw new Error(`npm pack failed:\n${run.stdout}${run.stderr}`);
    }
    const [packed] = JSON.parse(run.stdout);
    const tarball = path.join(path.resolve(out), packed.filename);
    return {
      name: packed.name,
      version: packed.version,
      filename: packed.filename,
      path: tarball,
      sha256: createHash('sha256')
        .update(fs.readFileSync(tarball))
        .digest('hex'),
      integrity: packed.integrity,
    };
  } finally {
    fs.rmSync(staging, { recursive: true, force: true });
  }
};

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { values } = parseArgs({
    options: {
      out: { type: 'string' },
      dist: { type: 'string' },
      name: { type: 'string' },
      version: { type: 'string' },
      development: { type: 'boolean', default: false },
      json: { type: 'boolean', default: false },
    },
  });
  if (!values.out) {
    // eslint-disable-next-line no-console -- usage
    console.error(
      'usage: node scripts/pack.mjs --out <dir> [--dist <dir>] [--name <name>] [--version <version>] [--development] [--json]',
    );
    process.exit(2);
  }
  const packed = packSdk({ ...values, distribution: values.dist });
  // eslint-disable-next-line no-console -- the command's result
  console.log(values.json ? JSON.stringify(packed) : packed.filename);
}
