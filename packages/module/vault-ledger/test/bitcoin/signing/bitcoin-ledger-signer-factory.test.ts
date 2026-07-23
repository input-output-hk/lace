import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { CompositeSignerFactory } from '@lace-contract/signer';
import { WalletId } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { BitcoinLedgerSignerFactory } from '../../../src/bitcoin/signer-factory';
import { BitcoinLedgerTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-ledger-transaction-signer';
import { CardanoLedgerSignerFactory } from '../../../src/signing/cardano-ledger-signer-factory';
import { CardanoLedgerTransactionSigner } from '../../../src/signing/cardano-ledger-transaction-signer';

import type { LedgerBitcoinTransport } from '../../../src/ledger-bitcoin-transport';
import type { LedgerCardanoTransport } from '../../../src/ledger-cardano-transport';
import type { BitcoinBip32AccountProps } from '@lace-contract/bitcoin-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const makeTransport = (): LedgerBitcoinTransport => ({
  getMasterFingerprint: vi.fn(),
  getExtendedPubkey: vi.fn(),
  signPsbt: vi.fn(),
});

const account = (overrides: Partial<AnyAccount> = {}): AnyAccount =>
  ({
    accountType: 'HardwareLedger',
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
  ({ walletId: WalletId('usb-hw-11415-4117-abc123'), accounts } as AnyWallet);

const contextFor = (accounts: AnyAccount[], accountId: AccountId) =>
  ({ wallet: wallet(accounts), accountId } as never);

describe('BitcoinLedgerSignerFactory', () => {
  describe('canSign', () => {
    it('matches a Bitcoin HardwareLedger account', () => {
      const factory = new BitcoinLedgerSignerFactory({
        transport: makeTransport(),
      });
      expect(factory.canSign(account())).toBe(true);
    });

    it('rejects a non-HardwareLedger account type', () => {
      const factory = new BitcoinLedgerSignerFactory({
        transport: makeTransport(),
      });
      expect(
        factory.canSign(
          account({ accountType: 'InMemory' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });

    it('rejects a HardwareLedger account on another blockchain', () => {
      const factory = new BitcoinLedgerSignerFactory({
        transport: makeTransport(),
      });
      expect(
        factory.canSign(
          account({ blockchainName: 'Cardano' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });
  });

  it('builds a transaction signer from the resolved account props', () => {
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });
    const signerAccount = account();

    const signer = factory.createTransactionSigner(
      contextFor([signerAccount], signerAccount.accountId),
    );

    expect(signer).toBeInstanceOf(BitcoinLedgerTransactionSigner);
  });

  it('constructs the signer without side effects (no device I/O at create time)', () => {
    const transport = makeTransport();
    const factory = new BitcoinLedgerSignerFactory({ transport });
    const signerAccount = account();

    factory.createTransactionSigner(
      contextFor([signerAccount], signerAccount.accountId),
    );

    expect(transport.signPsbt).not.toHaveBeenCalled();
    expect(transport.getMasterFingerprint).not.toHaveBeenCalled();
    expect(transport.getExtendedPubkey).not.toHaveBeenCalled();
  });

  it('throws when the account cannot be resolved or is unsupported', () => {
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });

    expect(() =>
      factory.createTransactionSigner(contextFor([], 'missing' as AccountId)),
    ).toThrow('BitcoinLedgerSignerFactory does not support account type');
  });

  it('throws when the account has no device master fingerprint', () => {
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });
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
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });
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
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });
    const signerAccount = account();

    expect(() =>
      factory.createDataSigner(
        contextFor([signerAccount], signerAccount.accountId),
      ),
    ).toThrow('BIP-322');
  });
});

describe('CompositeSignerFactory with Ledger factories', () => {
  const cardanoTransport: LedgerCardanoTransport = {
    getXpub: vi.fn(),
    createKeyAgent: vi.fn(),
  };

  const cardanoAccount = account({
    blockchainName: 'Cardano',
    accountId: 'acc-cardano' as AccountId,
    blockchainSpecific: {
      accountIndex: 0,
      chainId: { networkId: 1, networkMagic: 764824073 },
      extendedAccountPublicKey: 'xpub-cardano',
    },
  } as Partial<AnyAccount>);

  const composite = () =>
    new CompositeSignerFactory([
      new CardanoLedgerSignerFactory({ transport: cardanoTransport }),
      new BitcoinLedgerSignerFactory({ transport: makeTransport() }),
    ]);

  it('routes a Bitcoin account to the Bitcoin factory', () => {
    const bitcoinAccount = account();

    const signer = composite().createTransactionSigner(
      contextFor([cardanoAccount, bitcoinAccount], bitcoinAccount.accountId),
    );

    expect(signer).toBeInstanceOf(BitcoinLedgerTransactionSigner);
  });

  it('routes a Cardano account to the Cardano factory', () => {
    const bitcoinAccount = account();

    const signer = composite().createTransactionSigner({
      wallet: wallet([cardanoAccount, bitcoinAccount]),
      accountId: cardanoAccount.accountId,
      knownAddresses: [],
      utxo: [],
    } as never);

    expect(signer).toBeInstanceOf(CardanoLedgerTransactionSigner);
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
