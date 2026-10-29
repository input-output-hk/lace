import { getTestAuthSecretDeps } from '@lace-contract/authentication-prompt';
import { signerAuthFromPrompt } from '@lace-contract/signer';
import { WalletType } from '@lace-contract/wallet-repo';
import { BehaviorSubject, firstValueFrom, of } from 'rxjs';
import { describe, expect, it, vi } from 'vitest';

import { MidnightInMemoryDataSigner } from '../../src/signing/midnight-in-memory-data-signer';
import { MidnightInMemorySignerFactory } from '../../src/signing/midnight-in-memory-signer-factory';
import { MidnightInMemoryTransactionSigner } from '../../src/signing/midnight-in-memory-transaction-signer';

import type {
  MidnightWallet,
  MidnightWalletsByAccountId,
  MidnightSignerContext,
} from '@lace-contract/midnight-context';
import type {
  AccountId,
  AnyAccount,
  AnyWallet,
} from '@lace-contract/wallet-repo';

const mockAccountId = 'account-1' as AccountId;

const testSignerAuth = signerAuthFromPrompt(getTestAuthSecretDeps(), {
  cancellable: true,
  confirmButtonLabel: 'authentication-prompt.confirm-button-label',
  message: 'authentication-prompt.message.transaction-confirmation',
});

const createMockContext = (walletType: WalletType): MidnightSignerContext => ({
  wallet: {
    type: walletType,
    accounts: [
      {
        accountId: mockAccountId,
        accountType:
          walletType === WalletType.InMemory ? 'InMemory' : walletType,
        blockchainName: 'Midnight',
        blockchainSpecific: {
          accountIndex: 0,
          networkId: 'testnet',
        },
      },
    ],
    blockchainSpecific: {},
  } as AnyWallet,
  accountId: mockAccountId,
  auth: testSignerAuth,
});

describe('MidnightInMemorySignerFactory', () => {
  const factory = new MidnightInMemorySignerFactory(of({}));

  describe('canSign', () => {
    it('returns true for InMemory Midnight accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Midnight',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(true);
    });

    it('returns false for non-InMemory account types', () => {
      const account = {
        accountType: 'HardwareLedger',
        blockchainName: 'Midnight',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });

    it('returns false for non-Midnight accounts', () => {
      const account = {
        accountType: 'InMemory',
        blockchainName: 'Cardano',
      } as AnyAccount;
      expect(factory.canSign(account)).toBe(false);
    });
  });

  describe('createTransactionSigner', () => {
    it('returns MidnightInMemoryTransactionSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createTransactionSigner(context);
      expect(signer).toBeInstanceOf(MidnightInMemoryTransactionSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createTransactionSigner(context)).toThrow(
        'MidnightInMemorySignerFactory does not support account type:',
      );
    });
  });

  describe('createDataSigner', () => {
    it('returns MidnightInMemoryDataSigner for InMemory wallets', () => {
      const context = createMockContext(WalletType.InMemory);
      const signer = factory.createDataSigner(context);
      expect(signer).toBeInstanceOf(MidnightInMemoryDataSigner);
    });

    it.each([
      WalletType.HardwareLedger,
      WalletType.HardwareTrezor,
      WalletType.MultiSig,
    ])('throws for unsupported wallet type %s', walletType => {
      const context = createMockContext(walletType);
      expect(() => factory.createDataSigner(context)).toThrow(
        'MidnightInMemorySignerFactory does not support account type:',
      );
    });

    it('throws when account is not found', () => {
      const context = createMockContext(WalletType.InMemory);
      context.accountId = 'non-existent' as AccountId;
      expect(() => factory.createDataSigner(context)).toThrow(
        'MidnightInMemorySignerFactory does not support account type:',
      );
    });
  });
});

it('passes the instance registry to data signers and rejects a removed account', async () => {
  const engine = {
    signData: vi.fn(() => of({ signature: 'aa', verifyingKey: 'bb' })),
  } as unknown as MidnightWallet;
  const registry = new BehaviorSubject<MidnightWalletsByAccountId>({
    [mockAccountId]: engine,
  });
  const factory = new MidnightInMemorySignerFactory(registry);
  const signer = factory.createDataSigner(
    createMockContext(WalletType.InMemory),
  );
  const request = { data: new Uint8Array([1]) };
  expect((await firstValueFrom(signer.signData(request))).signature).toBe('aa');
  registry.next({});
  await expect(firstValueFrom(signer.signData(request))).rejects.toThrow(
    'Could not load midnight wallet',
  );
  expect(engine.signData).toHaveBeenCalledOnce();
});
