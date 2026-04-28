import { WalletType } from '@lace-contract/wallet-repo';
import { describe, expect, it, vi } from 'vitest';

import { CompositeSignerFactory } from '../src/composite-signer-factory';

import type {
  DataSigner,
  SignerContext,
  SignerFactory,
  TransactionSigner,
} from '../src/types';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const mockAccountId = 'account-1' as AccountId;

const mockAccount = {
  accountId: mockAccountId,
  accountType: 'InMemory',
  blockchainName: 'Cardano',
} as unknown as AnyAccount;

const mockWallet = {
  type: WalletType.InMemory,
  accounts: [mockAccount],
  blockchainSpecific: {},
} as unknown as AnyWallet;

const mockContext: SignerContext = {
  wallet: mockWallet,
  accountId: mockAccountId,
};

const createMockFactory = (supports: boolean): SignerFactory => ({
  canSign: vi.fn().mockReturnValue(supports),
  createTransactionSigner: vi.fn().mockReturnValue({} as TransactionSigner),
  createDataSigner: vi.fn().mockReturnValue({} as DataSigner<unknown, unknown>),
});

describe('CompositeSignerFactory', () => {
  describe('canSign', () => {
    it('returns true if any factory supports the account', () => {
      const composite = new CompositeSignerFactory([
        createMockFactory(false),
        createMockFactory(true),
      ]);
      expect(composite.canSign(mockAccount)).toBe(true);
    });

    it('returns false if no factory supports the account', () => {
      const composite = new CompositeSignerFactory([
        createMockFactory(false),
        createMockFactory(false),
      ]);
      expect(composite.canSign(mockAccount)).toBe(false);
    });

    it('returns false for empty factories', () => {
      const composite = new CompositeSignerFactory([]);
      expect(composite.canSign(mockAccount)).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('delegates to the first supporting factory', () => {
      const unsupported = createMockFactory(false);
      const supported = createMockFactory(true);
      const composite = new CompositeSignerFactory([unsupported, supported]);

      composite.createTransactionSigner(mockContext);

      expect(unsupported.createTransactionSigner).not.toHaveBeenCalled();
      expect(supported.createTransactionSigner).toHaveBeenCalledWith(
        mockContext,
      );
    });

    it('throws when no factory supports the account', () => {
      const composite = new CompositeSignerFactory([createMockFactory(false)]);
      expect(() => composite.createTransactionSigner(mockContext)).toThrow(
        `No signer factory registered for account type "${mockAccount.accountType}"`,
      );
    });

    it('throws when account is not found in wallet', () => {
      const composite = new CompositeSignerFactory([createMockFactory(true)]);
      const context: SignerContext = {
        wallet: mockWallet,
        accountId: 'non-existent' as AccountId,
      };
      expect(() => composite.createTransactionSigner(context)).toThrow(
        'Account non-existent not found in wallet',
      );
    });
  });

  describe('createDataSigner', () => {
    it('delegates to the first supporting factory', () => {
      const unsupported = createMockFactory(false);
      const supported = createMockFactory(true);
      const composite = new CompositeSignerFactory([unsupported, supported]);

      composite.createDataSigner(mockContext);

      expect(unsupported.createDataSigner).not.toHaveBeenCalled();
      expect(supported.createDataSigner).toHaveBeenCalledWith(mockContext);
    });

    it('throws when no factory supports the account', () => {
      const composite = new CompositeSignerFactory([createMockFactory(false)]);
      expect(() => composite.createDataSigner(mockContext)).toThrow(
        `No signer factory registered for account type "${mockAccount.accountType}"`,
      );
    });
  });
});
