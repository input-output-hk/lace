import { airGappedQrExchangeHook } from '@lace-contract/air-gapped-qr-exchange';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { BitcoinSeedSignerSignerFactory } from '../../../src/bitcoin/signer-factory';
import { BitcoinSeedSignerTransactionSigner } from '../../../src/bitcoin/signing/bitcoin-seed-signer-transaction-signer';

import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const triggerSpy = vi.spyOn(airGappedQrExchangeHook, 'trigger');

const account = (overrides: Partial<AnyAccount> = {}): AnyAccount =>
  ({
    accountType: 'HardwareSeedSigner',
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

describe('BitcoinSeedSignerSignerFactory', () => {
  beforeEach(() => triggerSpy.mockReset());

  describe('canSign', () => {
    it('matches a Bitcoin HardwareSeedSigner account', () => {
      const factory = new BitcoinSeedSignerSignerFactory();
      expect(factory.canSign(account())).toBe(true);
    });

    it('rejects a non-HardwareSeedSigner account type', () => {
      const factory = new BitcoinSeedSignerSignerFactory();
      expect(
        factory.canSign(
          account({ accountType: 'InMemory' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });

    it('rejects a HardwareSeedSigner account on another blockchain', () => {
      const factory = new BitcoinSeedSignerSignerFactory();
      expect(
        factory.canSign(
          account({ blockchainName: 'Cardano' } as Partial<AnyAccount>),
        ),
      ).toBe(false);
    });
  });

  it('builds a transaction signer from the resolved account props', () => {
    const factory = new BitcoinSeedSignerSignerFactory();
    const signerAccount = account();

    const signer = factory.createTransactionSigner({
      wallet: wallet([signerAccount]),
      accountId: signerAccount.accountId,
    } as never);

    expect(signer).toBeInstanceOf(BitcoinSeedSignerTransactionSigner);
  });

  it('constructs the signer without side effects (no QR exchange at create time)', () => {
    const factory = new BitcoinSeedSignerSignerFactory();
    const signerAccount = account();

    factory.createTransactionSigner({
      wallet: wallet([signerAccount]),
      accountId: signerAccount.accountId,
    } as never);

    expect(triggerSpy).not.toHaveBeenCalled();
  });

  it('throws when the account cannot be resolved or is unsupported', () => {
    const factory = new BitcoinSeedSignerSignerFactory();

    expect(() =>
      factory.createTransactionSigner({
        wallet: wallet([]),
        accountId: 'missing' as AccountId,
      } as never),
    ).toThrow('does not support account type');
  });

  it('does not support BIP-322 data signing', () => {
    const factory = new BitcoinSeedSignerSignerFactory();
    const signerAccount = account();

    expect(() =>
      factory.createDataSigner({
        wallet: wallet([signerAccount]),
        accountId: signerAccount.accountId,
      } as never),
    ).toThrow('BIP-322');
  });
});
