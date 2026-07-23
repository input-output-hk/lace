import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { CompositeSignerFactory } from '@lace-contract/signer';
import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { BitcoinTrezorSignerFactory } from '../../../src/bitcoin/signer-factory';
import { BitcoinTrezorTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-trezor-transaction-signer';
import { CardanoTrezorSignerFactory } from '../../../src/signing/cardano-trezor-signer-factory';

import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type { CardanoTransactionSigner } from '@lace-contract/cardano-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const getConnect = vi.fn();

const account = (overrides: Partial<AnyAccount> = {}): AnyAccount =>
  ({
    accountType: 'HardwareTrezor',
    blockchainName: 'Bitcoin',
    accountId: 'acc-1' as AccountId,
    blockchainSpecific: {
      accountIndex: 0,
      masterFingerprint: 'deadbeef',
      extendedAccountPublicKeys: { nativeSegWit: 'xpub-native' },
      networkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
    } satisfies BitcoinBip32AccountProps,
    ...overrides,
  } as AnyAccount);

const wallet = (accounts: AnyAccount[]): AnyWallet =>
  ({ walletId: WalletId('trezor-wallet-1'), accounts } as AnyWallet);

const contextFor = (accounts: AnyAccount[], accountId: AccountId) =>
  ({ wallet: wallet(accounts), accountId } as never);

describe('BitcoinTrezorSignerFactory', () => {
  describe('canSign', () => {
    it('matches a Bitcoin HardwareTrezor account', () => {
      const factory = new BitcoinTrezorSignerFactory({ getConnect });
      expect(factory.canSign(account())).toBe(true);
    });

    it('rejects a non-HardwareTrezor account type', () => {
      const factory = new BitcoinTrezorSignerFactory({ getConnect });
      expect(
        factory.canSign(
          account({ accountType: 'HardwareLedger' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });

    it('rejects a HardwareTrezor account on another blockchain', () => {
      const factory = new BitcoinTrezorSignerFactory({ getConnect });
      expect(
        factory.canSign(
          account({ blockchainName: 'Cardano' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });
  });

  it('builds a transaction signer from the resolved account props', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });
    const signerAccount = account();

    const signer = factory.createTransactionSigner(
      contextFor([signerAccount], signerAccount.accountId),
    );

    expect(signer).toBeInstanceOf(BitcoinTrezorTransactionSigner);
  });

  it('constructs the signer without side effects (no connect I/O at create time)', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });
    const signerAccount = account();

    factory.createTransactionSigner(
      contextFor([signerAccount], signerAccount.accountId),
    );

    expect(getConnect).not.toHaveBeenCalled();
  });

  it('throws when the account cannot be resolved or is unsupported', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });

    expect(() =>
      factory.createTransactionSigner(contextFor([], 'missing' as AccountId)),
    ).toThrow('BitcoinTrezorSignerFactory does not support account type');
  });

  it('throws when the account has no device master fingerprint', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });
    const signerAccount = account({
      blockchainSpecific: {
        accountIndex: 0,
        extendedAccountPublicKeys: { nativeSegWit: 'xpub-native' },
        networkId: BitcoinNetworkId(BitcoinNetwork.Mainnet),
      } satisfies BitcoinBip32AccountProps,
    } as Partial<AnyAccount>);

    expect(() =>
      factory.createTransactionSigner(
        contextFor([signerAccount], signerAccount.accountId),
      ),
    ).toThrow('missing the device master fingerprint');
  });

  it('throws when the account has no network id', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });
    const signerAccount = account({
      blockchainSpecific: {
        accountIndex: 0,
        masterFingerprint: 'deadbeef',
        extendedAccountPublicKeys: { nativeSegWit: 'xpub-native' },
      } satisfies BitcoinBip32AccountProps,
    } as Partial<AnyAccount>);

    expect(() =>
      factory.createTransactionSigner(
        contextFor([signerAccount], signerAccount.accountId),
      ),
    ).toThrow('missing its network id');
  });

  it('does not support BIP-322 data signing', () => {
    const factory = new BitcoinTrezorSignerFactory({ getConnect });
    const signerAccount = account();

    expect(() =>
      factory.createDataSigner(
        contextFor([signerAccount], signerAccount.accountId),
      ),
    ).toThrow('BIP-322');
  });
});

describe('CompositeSignerFactory with Trezor factories', () => {
  const cardanoAccount = account({
    blockchainName: 'Cardano',
    accountId: 'acc-cardano' as AccountId,
    blockchainSpecific: {
      accountIndex: 0,
      chainId: { networkId: 1, networkMagic: 764_824_073 },
      extendedAccountPublicKey: 'xpub-cardano',
    },
  } as Partial<AnyAccount>);

  const cardanoSigner = {} as CardanoTransactionSigner;

  const composite = () =>
    new CompositeSignerFactory([
      new CardanoTrezorSignerFactory({
        createTransactionSigner: () => cardanoSigner,
      }),
      new BitcoinTrezorSignerFactory({ getConnect }),
    ]);

  it('routes a Bitcoin account to the Bitcoin factory', () => {
    const bitcoinAccount = account();

    const signer = composite().createTransactionSigner(
      contextFor([cardanoAccount, bitcoinAccount], bitcoinAccount.accountId),
    );

    expect(signer).toBeInstanceOf(BitcoinTrezorTransactionSigner);
  });

  it('routes a Cardano account to the Cardano factory', () => {
    const bitcoinAccount = account();

    const signer = composite().createTransactionSigner({
      wallet: wallet([cardanoAccount, bitcoinAccount]),
      accountId: cardanoAccount.accountId,
      knownAddresses: [],
      utxo: [],
    } as never);

    expect(signer).toBe(cardanoSigner);
  });

  it('throws when no factory supports the account', () => {
    const inMemoryAccount = account({
      accountType: 'InMemory',
    } as Partial<AnyAccount>);

    expect(() =>
      composite().createTransactionSigner(
        contextFor([inMemoryAccount], inMemoryAccount.accountId),
      ),
    ).toThrow('No signer factory registered for account type');
  });
});
