import { describe, expect, it } from 'vitest';

import loadHwBlockchainSupport from '../src/hw-blockchain-support';

import type { HwBlockchainSupport } from '@lace-contract/onboarding-v2';

const support = (loadHwBlockchainSupport as () => HwBlockchainSupport[])();

describe('vault-ledger hw-blockchain-support addon', () => {
  it('advertises Cardano and Bitcoin support with per-blockchain option ids', () => {
    expect(support).toHaveLength(2);
    expect(support[0]).toMatchObject({
      blockchainName: 'Cardano',
      deviceOptionId: 'ledger',
      walletType: 'HardwareLedger',
    });
    expect(support[1]).toMatchObject({
      blockchainName: 'Bitcoin',
      deviceOptionId: 'ledger-bitcoin',
      walletType: 'HardwareLedger',
    });
  });

  it('leaves account selection with the app for both blockchains', () => {
    for (const entry of support) {
      expect(entry.accountSelection).toBeUndefined();
    }
  });
});
