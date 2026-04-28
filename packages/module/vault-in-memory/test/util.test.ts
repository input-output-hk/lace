import { AuthSecret } from '@lace-contract/authentication-prompt';
import { AccountId, WalletType } from '@lace-contract/wallet-repo';
import { ByteArray, type HexBytes } from '@lace-sdk/util';
import { dummyLogger } from 'ts-log';
import { describe, expect, it, vi } from 'vitest';

import { createInMemoryWalletEntityFactory } from '../src/util';

import type {
  InMemoryWalletAccount,
  WalletId,
  InMemoryWallet,
} from '@lace-contract/wallet-repo';

describe('vault-in-memory/util', () => {
  describe('createInMemoryWalletEntityFactory', () => {
    it('creates a wallet with accounts from all integrations', async () => {
      const cardanoAccount = {
        accountId: AccountId('cardano-acc'),
      } as InMemoryWalletAccount;
      const midnightAccount = {
        accountId: AccountId('midnight-acc'),
      } as InMemoryWalletAccount;
      const cardanoBlockchainSpecificProps = {
        prop: 1,
      };
      const midnightBlockchainSpecificProps = {
        otherProp: 2,
      };
      const factory = createInMemoryWalletEntityFactory(
        [
          {
            blockchainName: 'Cardano',
            createAccounts: vi.fn(),
            addAccounts: vi.fn(),
            initializeWallet: async () => ({
              accounts: [cardanoAccount],
              blockchainSpecificWalletData: cardanoBlockchainSpecificProps,
            }),
          },
          {
            blockchainName: 'Midnight',
            createAccounts: vi.fn(),
            addAccounts: vi.fn(),
            initializeWallet: async () => ({
              accounts: [midnightAccount],
              blockchainSpecificWalletData: midnightBlockchainSpecificProps,
            }),
          },
        ],
        {
          logger: dummyLogger,
        },
      );

      const walletName = 'Wally';
      const order = 1;
      const { wallet } = await factory({
        walletName,
        order,
        blockchains: ['Cardano', 'Midnight'],
        password: AuthSecret(ByteArray(new Uint8Array(10))),
        recoveryPhrase:
          'hand gate snack priority gun punch require make slot average delay mouse height melt ritual year own stool decide twice wood meadow mother kid'.split(
            ' ',
          ),
      });

      expect(wallet).toMatchObject<InMemoryWallet>({
        accounts: [cardanoAccount, midnightAccount],
        walletId: expect.any(String) as WalletId,
        blockchainSpecific: {
          Cardano: cardanoBlockchainSpecificProps,
          Midnight: midnightBlockchainSpecificProps,
        },
        encryptedRecoveryPhrase: expect.any(String) as HexBytes,
        metadata: {
          name: walletName,
          order,
        },
        type: WalletType.InMemory,
        isPassphraseConfirmed: false,
      });
    });

    it('activate clears password', async () => {
      const factory = createInMemoryWalletEntityFactory(
        [
          {
            blockchainName: 'Midnight',
            createAccounts: vi.fn(),
            addAccounts: vi.fn(),
            initializeWallet: async () => ({
              accounts: [
                {
                  accountId: AccountId('midnight-acc'),
                } as InMemoryWalletAccount,
              ],
              blockchainSpecificWalletData: {},
            }),
          },
        ],
        {
          logger: dummyLogger,
        },
      );

      const password = ByteArray(new Uint8Array([1, 2, 3, 4, 5])) as AuthSecret;
      const { activate } = await factory({
        walletName: 'Test',
        order: 0,
        blockchains: ['Midnight'],
        password,
        recoveryPhrase:
          'hand gate snack priority gun punch require make slot average delay mouse height melt ritual year own stool decide twice wood meadow mother kid'.split(
            ' ',
          ),
      });

      // Before activate: password not cleared
      expect(password).toEqual(new Uint8Array([1, 2, 3, 4, 5]));

      await activate();

      // After activate: password cleared
      expect(password).toEqual(new Uint8Array([0, 0, 0, 0, 0]));
    });
  });
});
