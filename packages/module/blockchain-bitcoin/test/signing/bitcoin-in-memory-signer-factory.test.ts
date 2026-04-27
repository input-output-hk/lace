import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { BitcoinInMemoryDataSigner } from '../../src/signing/bitcoin-in-memory-data-signer';
import { BitcoinInMemorySignerFactory } from '../../src/signing/bitcoin-in-memory-signer-factory';
import { BitcoinInMemoryTransactionSigner } from '../../src/signing/bitcoin-in-memory-transaction-signer';

import type { BitcoinSignerContext } from '@lace-contract/bitcoin-context';
import type { SignerAuth } from '@lace-contract/signer';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';

const mockAccountId = 'account-1' as AccountId;
const mockAuth: SignerAuth = {
  authenticate: vi.fn(),
  accessAuthSecret: vi.fn(),
};

const createMockContext = (walletType: WalletType): BitcoinSignerContext => ({
  wallet: {
    type: walletType,
    accounts: [
      {
        accountId: mockAccountId,
        accountType:
          walletType === WalletType.InMemory ? 'InMemory' : walletType,
        blockchainName: 'Bitcoin',
        blockchainSpecific: {
          accountIndex: 0,
          extendedAccountPublicKeys: {},
          networkId: 'bitcoin-mainnet',
        },
      },
    ],
    blockchainSpecific: {
      Bitcoin: {
        encryptedRootPrivateKey: 'beef' as HexBytes,
      },
    },
  } as AnyWallet,
  accountId: mockAccountId,
  auth: mockAuth,
});

describe('BitcoinInMemorySignerFactory', () => {
  const factory = new BitcoinInMemorySignerFactory();

  describe('canSign', () => {
    it('returns true for InMemory Bitcoin accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Bitcoin',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(true);
    });

    it('returns false for non-InMemory account types', () => {
      const account = {
        accountType: 'HardwareLedger',
        blockchainName: 'Bitcoin',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });

    it('returns false for non-Bitcoin accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('returns BitcoinInMemoryTransactionSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createTransactionSigner(context);
      expect(signer).toBeInstanceOf(BitcoinInMemoryTransactionSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'BitcoinInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when wallet is missing Bitcoin encrypted root private key', () => {
      const context = createMockContext(WalletType.InMemory);
      (
        context.wallet as AnyWallet & {
          blockchainSpecific: Record<string, unknown>;
        }
      ).blockchainSpecific = {};
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'Wallet is missing Bitcoin encrypted root private key',
      );
    });
  });

  describe('createDataSigner', () => {
    it('returns BitcoinInMemoryDataSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createDataSigner(context);
      expect(signer).toBeInstanceOf(BitcoinInMemoryDataSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createDataSigner(context)).toThrow(
        'BitcoinInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when wallet is missing Bitcoin encrypted root private key', () => {
      const context = createMockContext(WalletType.InMemory);
      (
        context.wallet as AnyWallet & {
          blockchainSpecific: Record<string, unknown>;
        }
      ).blockchainSpecific = {};
      expect(() => factory.createDataSigner(context)).toThrow(
        'Wallet is missing Bitcoin encrypted root private key',
      );
    });

    it('throws when account has no networkId', () => {
      const context = createMockContext(WalletType.InMemory);
      const account = context.wallet.accounts.find(
        a => a.accountId === mockAccountId,
      )!;
      (
        account as typeof account & {
          blockchainSpecific: Record<string, unknown>;
        }
      ).blockchainSpecific = {
        accountIndex: 0,
        extendedAccountPublicKeys: {},
      };
      expect(() => factory.createDataSigner(context)).toThrow(
        'Cannot resolve Bitcoin network from networkId',
      );
    });
  });
});
