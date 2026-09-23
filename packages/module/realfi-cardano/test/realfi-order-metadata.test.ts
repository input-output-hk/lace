import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  ORDER_ORIGIN_METADATA_LABEL,
  orderOriginMetadatum,
} from '../src/realfi-order-metadata';

/**
 * The installed `@realfi-co/realfi-partner-sdk` version, read from its
 * package.json on disk. The SDK's `exports` map blocks importing the file, so
 * resolve the package's main entry and walk back to the package directory.
 */
const installedPartnerSdkVersion = (): string => {
  const require = createRequire(import.meta.url);
  const entry = require.resolve('@realfi-co/realfi-partner-sdk');
  const packageDirectory = entry.slice(
    0,
    entry.lastIndexOf(join('@realfi-co', 'realfi-partner-sdk')) +
      join('@realfi-co', 'realfi-partner-sdk').length,
  );
  const manifest = JSON.parse(
    readFileSync(join(packageDirectory, 'package.json'), 'utf8'),
  ) as { version: string };
  return manifest.version;
};

describe('realfi-order-metadata', () => {
  it('uses the label the RealFi indexer requires', () => {
    expect(ORDER_ORIGIN_METADATA_LABEL).toBe(55_534_473n);
  });

  it('stamps {source, version, partner} — bump the pinned constant with the SDK', () => {
    expect(orderOriginMetadatum()).toEqual(
      new Map([
        // The BUILDER, matching the SDK's own `clientSource` — RealFi's
        // indexer reads partner attribution from `partner`, not `source`.
        ['source', 'partner-sdk'],
        ['version', installedPartnerSdkVersion()],
        // SDK 2.18 partner attribution: mirrors the `partner` key the SDK's
        // own builders stamp when created with { partner: 'lace' }.
        ['partner', 'lace'],
      ]),
    );
  });
});
