import { NetworkId } from '@midnightntwrk/wallet-sdk-abstractions';
import { describe, expect, it } from 'vitest';

import { walletId } from '../../src/stub-data';
import { MidnightAccountId } from '../../src/value-objects';

describe('MidnightAccountId', () => {
  it('derives the exact string persisted state is keyed on', () => {
    // Pinned rather than compared field-by-field: reordering the parts or
    // changing the separator keeps every account distinct while orphaning
    // every stored document, and two other places re-derive this shape
    // without importing it — the wallet-repo account-id migration and the
    // extension e2e upgrade fixtures.
    expect(MidnightAccountId(walletId, 1, NetworkId.NetworkId.PreProd)).toBe(
      `${walletId}-mn-1-preprod`,
    );
  });
});
