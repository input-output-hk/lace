import { BitcoinNetwork } from '@lace-contract/bitcoin-context';
import { describe, expect, it } from 'vitest';

import { BitcoinWalletResolver } from '../src/wallet-resolver';

import { bitcoinAccount, MAINNET_ADDRESS, TESTNET_ADDRESS } from './fixtures';

describe('BitcoinWalletResolver', () => {
  it('resolves the (walletId, accountIndex) pair from the derived native-segwit address', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([bitcoinAccount({})]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('returns undefined for an address it has never derived', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([bitcoinAccount({})]);
    expect(resolver.accountForAddress('bc1qunknownaddress')).toBeUndefined();
  });

  it('resolves both network accounts at the same index to distinct addresses', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([
      bitcoinAccount({ network: BitcoinNetwork.Mainnet }),
      bitcoinAccount({ network: BitcoinNetwork.Testnet }),
    ]);
    expect(MAINNET_ADDRESS).not.toEqual(TESTNET_ADDRESS);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
    expect(resolver.accountForAddress(TESTNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('resolves a HardwareLedger account address (host device ceremony, )', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([bitcoinAccount({ accountType: 'HardwareLedger' })]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('resolves a HardwareTrezor account address (host device ceremony, )', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([bitcoinAccount({ accountType: 'HardwareTrezor' })]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('resolves a HardwareKeystone account address (host QR ceremony, )', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([bitcoinAccount({ accountType: 'HardwareKeystone' })]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('resolves a HardwareSeedSigner account address (host QR ceremony, )', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([
      bitcoinAccount({ accountType: 'HardwareSeedSigner' }),
    ]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 0,
    });
  });

  it('skips non-Bitcoin and non-signable account types', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([
      bitcoinAccount({ blockchainName: 'Cardano' }),
      bitcoinAccount({ accountType: 'MultiSig' }),
    ]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toBeUndefined();
  });

  it('rebuilds the map when re-fed (a newly added account is picked up)', () => {
    const resolver = new BitcoinWalletResolver();
    resolver.setAccounts([]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toBeUndefined();
    resolver.setAccounts([bitcoinAccount({ accountIndex: 3 })]);
    expect(resolver.accountForAddress(MAINNET_ADDRESS)).toEqual({
      walletId: 'w1',
      accountIndex: 3,
    });
  });
});
