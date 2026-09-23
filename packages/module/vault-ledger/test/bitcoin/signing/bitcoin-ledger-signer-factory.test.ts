import { Cardano, Serialization } from '@cardano-sdk/core';
import {
  BitcoinNetwork,
  BitcoinNetworkId,
} from '@lace-contract/bitcoin-context';
import { CompositeSignerFactory } from '@lace-contract/signer';
import { WalletId } from '@lace-contract/wallet-repo';
import { HexBytes } from '@lace-lib/util';
import { firstValueFrom, of } from 'rxjs';
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

  it('does not support message signing', () => {
    const factory = new BitcoinLedgerSignerFactory({
      transport: makeTransport(),
    });
    const signerAccount = account();

    expect(() =>
      factory.createDataSigner(
        contextFor([signerAccount], signerAccount.accountId),
      ),
    ).toThrow('Message signing is not supported');
  });
});

// A real, decodable, collateral-free tx -- lets the guard allow
// and delegate, so the positive routing assertion proves delegation into the
// Cardano branch, not just "did not return Bitcoin's".
const NO_COLLATERAL_TX = Serialization.Transaction.fromCore({
  id: Cardano.TransactionId('0'.repeat(64)),
  body: {
    inputs: [{ txId: Cardano.TransactionId('1'.repeat(64)), index: 0 }],
    outputs: [
      {
        address: Cardano.PaymentAddress(
          'addr_test1qz2fxv2umyhttkxyxp8x0dlpdt3k6cwng5pxj3jhsydzer3jcu5d8ps7zex2k2xt3uqxgjqnnj83ws8lhrn648jjxtwq2ytjqp',
        ),
        value: { coins: 1_000_000n },
      },
    ],
    fee: 170_000n,
  },
  witness: { signatures: new Map() },
} as Cardano.Tx).toCbor();

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

  it('routes a Cardano account to the Cardano factory', async () => {
    const bitcoinAccount = account();
    // Spy rather than let the real Ledger device pipeline run (SodiumBip32Ed25519
    // + device descriptor resolution + transport.createKeyAgent) -- this test's
    // job is proving the COMPOSITE picked the Cardano branch, not exercising
    // Ledger's own signing internals (covered elsewhere).
    const innerSign = vi
      .spyOn(CardanoLedgerTransactionSigner.prototype, 'sign')
      .mockReturnValue(
        of({ serializedTx: HexBytes('deadbeef'), signatureCount: 1 }),
      );

    const signer = composite().createTransactionSigner({
      wallet: wallet([cardanoAccount, bitcoinAccount]),
      accountId: cardanoAccount.accountId,
      knownAddresses: [],
      utxo: [],
      collateralInputResolver: { resolveInput: async () => null },
    } as never);

    // The Cardano factory returns a guard wrapper around the routed signer,
    // not the signer instance itself. This Bitcoin-routing behaviour and its
    // own factory/signer are untouched -- only the Cardano branch's return
    // value shape changed.
    expect(signer).not.toBeInstanceOf(CardanoLedgerTransactionSigner);
    expect(typeof signer.sign).toBe('function');

    // POSITIVE proof (not just "isn't Bitcoin's"): the guard allows this
    // no-collateral fixture and delegates into the REAL CardanoLedgerTransactionSigner
    // the composite constructed -- proving the Cardano branch was picked.
    const request = { serializedTx: HexBytes(NO_COLLATERAL_TX) };
    const result = await firstValueFrom(signer.sign(request));
    expect(innerSign).toHaveBeenCalledWith(request);
    expect(result.serializedTx).toBe('deadbeef');
    innerSign.mockRestore();
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
