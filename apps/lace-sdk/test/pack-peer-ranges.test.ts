import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { entryFiles, STABLE_ENTRIES } from '../scripts/entries.mjs';
import {
  manifestForDistribution,
  publishedPeerRange,
} from '../scripts/pack.mjs';

describe('publishedPeerRange', () => {
  it('publishes the reviewed ledger pin at the wallet SDK caret range and nothing else', () => {
    expect(publishedPeerRange('@midnight-ntwrk/ledger-v8', '8.1.0')).toBe(
      '^8.1.0',
    );
    // Ranges and other packages pass through untouched.
    expect(publishedPeerRange('@midnightntwrk/wallet-sdk', '^1.2.0')).toBe(
      '^1.2.0',
    );
    expect(publishedPeerRange('@polkadot/api', '^16.5.4')).toBe('^16.5.4');
    // A range on an unreviewed package of the family is not an exact pin and passes through.
    for (const range of [
      '^8.1.0',
      '~8.1.0',
      '8.x',
      '8',
      '8.1',
      '8.1.0 - 8.1.3',
      '>=8.1.0 <9',
      '8.1.0 || 8.1.3',
      '8.1.x',
      '*',
    ]) {
      expect(
        publishedPeerRange('@midnight-ntwrk/onchain-runtime-v8', range),
      ).toBe(range);
    }
  });

  it('refuses a changed or unreviewed exact pin instead of loosening it', () => {
    // The reviewed pin changed to a range: decided deliberately, not rewritten.
    expect(() =>
      publishedPeerRange('@midnight-ntwrk/ledger-v8', '8.1.0 - 8.1.3'),
    ).toThrow(/reviewed 8.1.0/);
    expect(() =>
      publishedPeerRange('@midnight-ntwrk/ledger-v8', '8.1.3'),
    ).toThrow(/reviewed 8.1.0/);
    // Every spelling of an exact version is a pin.
    for (const pin of [
      '8.1.0',
      '=8.1.3',
      'v8.1.3',
      '= 8.1.3',
      '=v8.1.3',
      '8.1.3-rc.1',
      '8.1.3rc.1',
      '8.1.3+build.7',
      ' 8.1.0 ',
    ]) {
      expect(() =>
        publishedPeerRange('@midnight-ntwrk/onchain-runtime-v8', pin),
      ).toThrow(/no reviewed published range/);
    }
  });
});

type Manifest = {
  exports: Record<string, unknown>;
  peerDependencies?: Record<string, string>;
  peerDependenciesMeta?: Record<string, unknown>;
};

describe('manifestForDistribution', () => {
  const distribution = (entries: readonly string[]) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'lace-sdk-dist-'));
    for (const entry of entries)
      for (const file of entryFiles(entry))
        fs.writeFileSync(path.join(directory, file), '');
    return directory;
  };

  it('declares the experimental entry and its published peers only when the build holds it', () => {
    const canary = manifestForDistribution(
      distribution([...STABLE_ENTRIES, 'midnight', 'experimental']),
    ) as Manifest;
    expect(canary.exports['./experimental']).toBeDefined();
    expect(canary.peerDependencies?.['@midnightntwrk/wallet-sdk-facade']).toBe(
      '^5.0.0-rc.0',
    );
    expect(
      canary.peerDependenciesMeta?.['@midnight-ntwrk/compact-runtime'],
    ).toEqual({ optional: true });

    const stable = manifestForDistribution(
      distribution(STABLE_ENTRIES),
    ) as Manifest;
    expect(stable.exports['./experimental']).toBeUndefined();
    expect(
      Object.keys(stable.peerDependencies ?? {}).filter(name =>
        /midnight/.test(name),
      ),
    ).toEqual([]);
  });
});
