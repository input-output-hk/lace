import { describe, expect, it } from 'vitest';

import { mergeAccountResolutions } from '../../../src/store/side-effects/create-source-context';

import type { SourceContext } from '../../../src/store/side-effects/create-source-context';
import type { AccountResolution } from '../../../src/store/side-effects/scan-active-accounts';
import type { Cardano } from '@cardano-sdk/core';

const utxo = (txId: string): Cardano.Utxo =>
  [
    { txId, index: 0 },
    { address: 'addr', value: { coins: 0n } },
  ] as unknown as Cardano.Utxo;

const context = {
  wallet: { id: 'w' },
  chainId: { networkId: 0, networkMagic: 1 },
  protocolParameters: { maxTxSize: 16_384 },
  utxos: [utxo('tx0')],
  addresses: ['addr0'],
  signingAccounts: [
    { accountId: 'a0', accountIndex: 0, extendedAccountPublicKey: 'xpub0' },
  ],
} as unknown as SourceContext;

const resolution = (index: number): AccountResolution =>
  ({
    accountId: `a${index}`,
    accountIndex: index,
    extendedAccountPublicKey: `xpub${index}`,
    addresses: [`addr${index}`],
    utxos: [utxo(`tx${index}`)],
  } as unknown as AccountResolution);

describe('mergeAccountResolutions', () => {
  it('is the account-0 context unchanged when there are no scanned accounts', () => {
    expect(mergeAccountResolutions(context, [])).toEqual(context);
  });

  it('unions the scanned accounts utxos, addresses, and signing identities', () => {
    const merged = mergeAccountResolutions(context, [
      resolution(1),
      resolution(2),
    ]);

    expect(merged.utxos).toEqual([utxo('tx0'), utxo('tx1'), utxo('tx2')]);
    expect(merged.addresses).toEqual(['addr0', 'addr1', 'addr2']);
    expect(merged.signingAccounts).toEqual([
      { accountId: 'a0', accountIndex: 0, extendedAccountPublicKey: 'xpub0' },
      { accountId: 'a1', accountIndex: 1, extendedAccountPublicKey: 'xpub1' },
      { accountId: 'a2', accountIndex: 2, extendedAccountPublicKey: 'xpub2' },
    ]);
    // The wallet and chain-level fields are carried through unchanged.
    expect(merged.wallet).toBe(context.wallet);
    expect(merged.protocolParameters).toBe(context.protocolParameters);
  });

  it('throws when a scanned account repeats a TxIn already in the set', () => {
    // resolution(0) reuses tx0, which the account-0 context already holds.
    expect(() => mergeAccountResolutions(context, [resolution(0)])).toThrow(
      /Duplicate TxIn/,
    );
  });
});
