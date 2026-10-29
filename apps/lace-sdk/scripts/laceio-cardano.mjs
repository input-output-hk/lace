// The SDK depends on @laceio/cardano, the Cardano domain layer this
// repository maintains (ADR 68), rather than bundling a copy of the npm
// @cardano-sdk packages, so an app using both can share one copy of its
// classes and types. The platform's sources still import @cardano-sdk/*, so
// the SDK's bundle (tsdown.config.ts) and its declarations
// (rollup.dts.config.mjs) both resolve each package the domain layer
// publishes to its subpath, external. The subpaths are the ones its
// package.json exports, so the two builds and the package cannot disagree.
import fs from 'node:fs';
import path from 'node:path';

const manifest = JSON.parse(
  fs.readFileSync(
    path.resolve(import.meta.dirname, '../../lace-cardano/package.json'),
    'utf8',
  ),
);

/** The subpaths @laceio/cardano publishes: `core`, `crypto`, … */
export const CARDANO_SUBPATHS = new Set(
  Object.keys(manifest.exports).map(subpath => subpath.replace(/^\.\//, '')),
);

/** The @laceio/cardano subpath an @cardano-sdk/<name> import maps to. */
export const cardanoSubpathOf = source => {
  const match = /^@cardano-sdk\/([a-z-]+)$/.exec(source);
  return match && CARDANO_SUBPATHS.has(match[1]) ? match[1] : undefined;
};

/** Resolves each @cardano-sdk package the domain layer publishes to it, external. */
export const useLaceioCardano = {
  name: 'use-laceio-cardano',
  resolveId: source => {
    const subpath = cardanoSubpathOf(source);
    return subpath
      ? { id: `@laceio/cardano/${subpath}`, external: true }
      : null;
  },
};
