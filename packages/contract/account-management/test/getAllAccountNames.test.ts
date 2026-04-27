import { describe, it, expect } from 'vitest';

import { getAllAccountNames } from '../src/utils/getAllAccountNames';

import type { AnyWallet } from '@lace-contract/wallet-repo';

const wallet = (accounts: Array<{ metadata: { name: string } }>): AnyWallet =>
  ({ accounts } as unknown as AnyWallet);

describe('getAllAccountNames', () => {
  it('returns empty array for empty wallets array', () => {
    expect(getAllAccountNames([])).toEqual([]);
  });

  it('extracts names from a single wallet with multiple accounts', () => {
    const wallets = [
      wallet([
        { metadata: { name: 'Cardano #0' } },
        { metadata: { name: 'Cardano #1' } },
      ]),
    ];
    expect(getAllAccountNames(wallets)).toEqual(['Cardano #0', 'Cardano #1']);
  });

  it('extracts names across multiple wallets', () => {
    const wallets = [
      wallet([{ metadata: { name: 'Cardano #0' } }]),
      wallet([{ metadata: { name: 'Bitcoin #0' } }]),
    ];
    expect(getAllAccountNames(wallets)).toEqual(['Cardano #0', 'Bitcoin #0']);
  });

  it('handles wallets with empty accounts array', () => {
    const wallets = [wallet([])];
    expect(getAllAccountNames(wallets)).toEqual([]);
  });

  it('handles wallets with nullish accounts', () => {
    const wallets = [{ accounts: undefined } as unknown as AnyWallet];
    expect(getAllAccountNames(wallets)).toEqual([]);
  });

  it('returns names in flatMap order (wallet-by-wallet)', () => {
    const wallets = [
      wallet([{ metadata: { name: 'A' } }, { metadata: { name: 'B' } }]),
      wallet([{ metadata: { name: 'C' } }]),
      wallet([{ metadata: { name: 'D' } }, { metadata: { name: 'E' } }]),
    ];
    expect(getAllAccountNames(wallets)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
