import { describe, expect, it } from 'vitest';

import {
  bitcoinAccountDerivationPath,
  bitcoinFullDerivationPath,
} from '../src/bip32-derivation';
import { BitcoinNetwork } from '../src/types';

describe('bitcoinAccountDerivationPath', () => {
  it.each([
    ['Legacy', 44],
    ['SegWit', 49],
    ['NativeSegWit', 84],
    ['Taproot', 86],
  ])('uses purpose %s -> %d', (addressType, purpose) => {
    expect(
      bitcoinAccountDerivationPath({
        addressType,
        network: BitcoinNetwork.Mainnet,
        account: 0,
      }),
    ).toBe(`m/${purpose}'/0'/0'`);
  });

  it('uses coin type 0 for mainnet and 1 for any other network', () => {
    expect(
      bitcoinAccountDerivationPath({
        addressType: 'NativeSegWit',
        network: BitcoinNetwork.Mainnet,
        account: 2,
      }),
    ).toBe("m/84'/0'/2'");
    expect(
      bitcoinAccountDerivationPath({
        addressType: 'NativeSegWit',
        network: BitcoinNetwork.Testnet,
        account: 2,
      }),
    ).toBe("m/84'/1'/2'");
    expect(
      bitcoinAccountDerivationPath({
        addressType: 'NativeSegWit',
        network: 'regtest',
        account: 2,
      }),
    ).toBe("m/84'/1'/2'");
  });

  it('throws for an unknown address type', () => {
    expect(() =>
      bitcoinAccountDerivationPath({
        addressType: 'SomethingElse',
        network: BitcoinNetwork.Mainnet,
        account: 0,
      }),
    ).toThrow(/Unknown Bitcoin address type: SomethingElse/);
  });
});

describe('bitcoinFullDerivationPath', () => {
  it('appends chain 0 for the external chain', () => {
    expect(
      bitcoinFullDerivationPath({
        addressType: 'NativeSegWit',
        network: BitcoinNetwork.Mainnet,
        account: 0,
        chain: 'external',
        index: 5,
      }),
    ).toBe("m/84'/0'/0'/0/5");
  });

  it('appends chain 1 for the internal chain', () => {
    expect(
      bitcoinFullDerivationPath({
        addressType: 'Taproot',
        network: BitcoinNetwork.Testnet,
        account: 3,
        chain: 'internal',
        index: 7,
      }),
    ).toBe("m/86'/1'/3'/1/7");
  });

  it('treats an unknown chain value as external', () => {
    expect(
      bitcoinFullDerivationPath({
        addressType: 'Legacy',
        network: BitcoinNetwork.Mainnet,
        account: 1,
        chain: 'receive',
        index: 0,
      }),
    ).toBe("m/44'/0'/1'/0/0");
  });
});
