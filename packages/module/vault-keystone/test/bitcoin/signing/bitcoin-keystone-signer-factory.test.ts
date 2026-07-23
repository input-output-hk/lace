import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinKeystoneSignerFactory } from '../../../src/bitcoin/signer-factory';
import { BitcoinKeystoneTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-keystone-transaction-signer';

import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const account = (overrides: Partial<AnyAccount> = {}): AnyAccount =>
  ({
    accountType: 'HardwareKeystone',
    blockchainName: 'Bitcoin',
    accountId: 'acc-1' as AccountId,
    blockchainSpecific: {
      accountIndex: 0,
      masterFingerprint: 'deadbeef',
      extendedAccountPublicKeys: { nativeSegWit: 'xpub-native' },
    },
    ...overrides,
  } as AnyAccount);

const wallet = (accounts: AnyAccount[]): AnyWallet =>
  ({ accounts } as AnyWallet);

describe('BitcoinKeystoneSignerFactory', () => {
  beforeEach(() => triggerSpy.mockReset());

  describe('canSign', () => {
    it('matches a Bitcoin HardwareKeystone account', () => {
      const factory = new BitcoinKeystoneSignerFactory();
      expect(factory.canSign(account())).toBe(true);
    });

    it('rejects a non-HardwareKeystone account type', () => {
      const factory = new BitcoinKeystoneSignerFactory();
      expect(
        factory.canSign(
          account({ accountType: 'InMemory' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });

    it('rejects a HardwareKeystone account on another blockchain', () => {
      const factory = new BitcoinKeystoneSignerFactory();
      expect(
        factory.canSign(
          account({ blockchainName: 'Cardano' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });
  });

  it('builds a transaction signer from the resolved account props', () => {
    const factory = new BitcoinKeystoneSignerFactory();
    const signerAccount = account();

    const signer = factory.createTransactionSigner({
      wallet: wallet([signerAccount]),
      accountId: signerAccount.accountId,
    } as never);

    expect(signer).toBeInstanceOf(BitcoinKeystoneTransactionSigner);
  });

  it('constructs the signer without side effects (no QR exchange at create time)', () => {
    const factory = new BitcoinKeystoneSignerFactory();
    const signerAccount = account();

    factory.createTransactionSigner({
      wallet: wallet([signerAccount]),
      accountId: signerAccount.accountId,
    } as never);

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('throws when the account cannot be resolved or is unsupported', () => {
    const factory = new BitcoinKeystoneSignerFactory();

    expect(() =>
      factory.createTransactionSigner({
        wallet: wallet([]),
        accountId: 'missing' as AccountId,
      } as never),
    ).toThrow('does not support account type');
  });

  it('does not support BIP-322 data signing', () => {
    const factory = new BitcoinKeystoneSignerFactory();
    const signerAccount = account();

    expect(() =>
      factory.createDataSigner({
        wallet: wallet([signerAccount]),
        accountId: signerAccount.accountId,
      } as never),
    ).toThrow('BIP-322');
  });
});
