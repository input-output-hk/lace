import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { CardanoInMemoryDataSigner } from '../../src/signing/cardano-in-memory-data-signer';
import { CardanoInMemorySignerFactory } from '../../src/signing/cardano-in-memory-signer-factory';
import { CardanoInMemoryTransactionSigner } from '../../src/signing/cardano-in-memory-transaction-signer';

import type { Cardano } from '@cardano-sdk/core';
import type { Bip32PublicKeyHex } from '@cardano-sdk/crypto';
import type {
  CardanoSignerContext,
  CardanoTransactionSignerContext,
  CreateCardanoKeyAgent,
} from '@lace-contract/cardano-context';
import type { SignerAuth } from '@lace-contract/signer';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';
import type { HexBytes } from '@lace-sdk/util';

const mockChainId: Cardano.ChainId = { networkId: 0, networkMagic: 1 };
const mockAccountId = 'account-1' as AccountId;
const mockAuth: SignerAuth = {
  authenticate: vi.fn(),
  accessAuthSecret: vi.fn(),
};

const createMockContext = (walletType: WalletType): CardanoSignerContext => ({
  wallet: {
    type: walletType,
    accounts: [
      {
        accountId: mockAccountId,
        accountType:
          walletType === WalletType.InMemory ? 'InMemory' : walletType,
        blockchainName: 'Cardano',
        blockchainSpecific: {
          accountIndex: 0,
          chainId: mockChainId,
          extendedAccountPublicKey: 'abcd' as unknown as Bip32PublicKeyHex,
        },
      },
    ],
    blockchainSpecific: {
      Cardano: {
        encryptedRootPrivateKey: 'beef' as HexBytes,
      },
    },
  } as AnyWallet,
  accountId: mockAccountId,
  knownAddresses: [],
  auth: mockAuth,
});

const createMockTxContext = (
  walletType: WalletType,
): CardanoTransactionSignerContext => ({
  ...createMockContext(walletType),
  utxo: [],
});

describe('CardanoSignerFactory', () => {
  const createKeyAgent: CreateCardanoKeyAgent = vi.fn();
  const factory = new CardanoInMemorySignerFactory({
    createKeyAgent,
  });

  describe('canSign', () => {
    it('returns true for InMemory Cardano accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(true);
    });

    it('returns false for non-InMemory account types', () => {
      const account = {
        accountType: 'HardwareLedger',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });

    it('returns false for non-Cardano accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Bitcoin',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('returns CardanoInMemoryTransactionSigner for InMemory wallets', () => {
      const context = createMockTxContext(WalletType.InMemory);
      const signer = factory.createTransactionSigner(context);
      expect(signer).toBeInstanceOf(CardanoInMemoryTransactionSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockTxContext(walletType);
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when account is not found', () => {
      const context = createMockTxContext(WalletType.InMemory);
      context.accountId = 'non-existent' as AccountId;
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when wallet is missing Cardano encrypted root private key', () => {
      const context = createMockTxContext(WalletType.InMemory);
      (
        context.wallet as AnyWallet & {
          blockchainSpecific: Record<string, unknown>;
        }
      ).blockchainSpecific = {};
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'Wallet is missing Cardano encrypted root private key',
      );
    });
  });

  describe('createDataSigner', () => {
    it('returns CardanoInMemoryDataSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createDataSigner(context);
      expect(signer).toBeInstanceOf(CardanoInMemoryDataSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createDataSigner(context)).toThrow(
        'CardanoInMemorySignerFactory does not support account type:',
      );
    });
  });
});
