/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { run } from '../nami-migration-runner';
import { AnyWallet, Bip32WalletAccount, WalletManager, WalletRepository, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { state } from './nami-migration-runner.fixture';
import { BehaviorSubject } from 'rxjs';

type WalletRepositoryMock = WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;
type WalletMock = AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>;
type WalletManagerMock = WalletManager<any, any>;

test('fresh install', async () => {
  const walletRepository: WalletRepositoryMock = {
    wallets$: new BehaviorSubject([]),
    addWallet: jest.fn().mockResolvedValueOnce('0000000')
  } as unknown as WalletRepositoryMock;

  const walletManager: WalletManagerMock = {
    activate: jest.fn()
  } as unknown as WalletManagerMock;

  await run(walletRepository, walletManager, state);

  expect(walletManager.activate).toHaveBeenCalledWith({
    walletId: '0000000',
    accountIndex: 0,
    chainId: Wallet.Cardano.ChainIds.Mainnet
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(1, {
    metadata: { name: 'Nami', lastActiveAccountIndex: 0 },
    encryptedSecrets: {
      keyMaterial: '',
      rootPrivateKeyBytes:
        'da7af7c22eeaf4bb460c02b426792d556a9242a7e8dca47e7628350f4290d97a0078f3dad5812606f4fa993772dc1c0fc5b7941dc91796a111a8d789b8d3f473eb9c67b32f89f5a2518ff02bb5595a00638e99e7799858b42a639edab14d1bd997eeb8ebe518939ca0522a527219062d1585bfd34434dd84c2a3f895d34863158fce54c1c2c2ab8e8fd3d23d70bc3114fd302badca2c850160597443'
    },
    accounts: [
      {
        accountIndex: 0,
        metadata: { name: 'Account #0' },
        extendedAccountPublicKey:
          'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
      },
      {
        accountIndex: 1,
        metadata: { name: 'Account #1' },
        extendedAccountPublicKey:
          '5280ef1287dfa35605891eb788590dbfe43b59682ada939ee111f8667d4a0847b43c08b5dce7aab937e860626e95f05ef6cc12758fa9ee16a4fc394bd9f684e4'
      }
    ],
    type: WalletType.InMemory
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(2, {
    metadata: { name: 'Ledger 1', lastActiveAccountIndex: 0 },
    type: 'Ledger',
    accounts: [
      {
        extendedAccountPublicKey:
          '7eefc2120ec17dc280f7f7adba233bcd75c00d59d9442ded45e44e00745e28d4d06673111ee5aad359f25fafbb787c55f1f80e0d9f0b567959d0a3587276210c',
        accountIndex: 0,
        metadata: { name: 'Account #0' }
      }
    ]
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(3, {
    metadata: { name: 'Ledger 2', lastActiveAccountIndex: 1 },
    type: 'Ledger',
    accounts: [
      {
        extendedAccountPublicKey:
          '18b35d8e07c1dd096ce359f4ce5ac669a27c8ac23583f9e6a53b7508efd28c849a7b1eda5ac98ed02d6048d0cbe84f91570b9f0cc3acff935cf229cd798da730',
        accountIndex: 1,
        metadata: { name: 'Account #1' }
      }
    ]
  });
});

test('lace already installed and has no conflict', async () => {
  const walletRepository: WalletRepositoryMock = {
    wallets$: new BehaviorSubject<WalletMock[]>([
      {
        accounts: [
          {
            accountIndex: 0,
            extendedAccountPublicKey: '000000'
          }
        ] as Bip32WalletAccount<Wallet.AccountMetadata>[],
        type: WalletType.InMemory,
        walletId: '0000000'
      }
    ] as WalletMock[]),
    addWallet: jest.fn().mockResolvedValueOnce('0000000')
  } as unknown as WalletRepositoryMock;

  const walletManager: WalletManagerMock = {
    activate: jest.fn()
  } as unknown as WalletManagerMock;

  await run(walletRepository, walletManager, state);

  expect(walletManager.activate).toHaveBeenCalledWith({
    walletId: '0000000',
    accountIndex: 0,
    chainId: Wallet.Cardano.ChainIds.Mainnet
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(1, {
    metadata: { name: 'Nami', lastActiveAccountIndex: 0 },
    encryptedSecrets: {
      keyMaterial: '',
      rootPrivateKeyBytes:
        'da7af7c22eeaf4bb460c02b426792d556a9242a7e8dca47e7628350f4290d97a0078f3dad5812606f4fa993772dc1c0fc5b7941dc91796a111a8d789b8d3f473eb9c67b32f89f5a2518ff02bb5595a00638e99e7799858b42a639edab14d1bd997eeb8ebe518939ca0522a527219062d1585bfd34434dd84c2a3f895d34863158fce54c1c2c2ab8e8fd3d23d70bc3114fd302badca2c850160597443'
    },
    accounts: [
      {
        accountIndex: 0,
        metadata: { name: 'Account #0' },
        extendedAccountPublicKey:
          'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
      },
      {
        accountIndex: 1,
        metadata: { name: 'Account #1' },
        extendedAccountPublicKey:
          '5280ef1287dfa35605891eb788590dbfe43b59682ada939ee111f8667d4a0847b43c08b5dce7aab937e860626e95f05ef6cc12758fa9ee16a4fc394bd9f684e4'
      }
    ],
    type: WalletType.InMemory
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(2, {
    metadata: { name: 'Ledger 1', lastActiveAccountIndex: 0 },
    type: 'Ledger',
    accounts: [
      {
        extendedAccountPublicKey:
          '7eefc2120ec17dc280f7f7adba233bcd75c00d59d9442ded45e44e00745e28d4d06673111ee5aad359f25fafbb787c55f1f80e0d9f0b567959d0a3587276210c',
        accountIndex: 0,
        metadata: { name: 'Account #0' }
      }
    ]
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(3, {
    metadata: { name: 'Ledger 2', lastActiveAccountIndex: 1 },
    type: 'Ledger',
    accounts: [
      {
        extendedAccountPublicKey:
          '18b35d8e07c1dd096ce359f4ce5ac669a27c8ac23583f9e6a53b7508efd28c849a7b1eda5ac98ed02d6048d0cbe84f91570b9f0cc3acff935cf229cd798da730',
        accountIndex: 1,
        metadata: { name: 'Account #1' }
      }
    ]
  });
});

test('some accounts existing conflict', async () => {
  const walletRepository: WalletRepositoryMock = {
    wallets$: new BehaviorSubject<WalletMock[]>([
      {
        accounts: [
          {
            accountIndex: 0,
            extendedAccountPublicKey:
              'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
          }
        ] as Bip32WalletAccount<Wallet.AccountMetadata>[],
        type: WalletType.InMemory,
        walletId: '0000000'
      },
      {
        accounts: [
          {
            accountIndex: 1,
            extendedAccountPublicKey:
              '18b35d8e07c1dd096ce359f4ce5ac669a27c8ac23583f9e6a53b7508efd28c849a7b1eda5ac98ed02d6048d0cbe84f91570b9f0cc3acff935cf229cd798da730'
          }
        ] as Bip32WalletAccount<Wallet.AccountMetadata>[],
        type: WalletType.Ledger,
        walletId: '111111'
      }
    ] as WalletMock[]),
    addWallet: jest.fn(),
    addAccount: jest.fn()
  } as unknown as WalletRepositoryMock;

  const walletManager: WalletManagerMock = {
    activate: jest.fn()
  } as unknown as WalletManagerMock;

  await run(walletRepository, walletManager, state);

  expect(walletManager.activate).not.toHaveBeenCalled();

  expect(walletRepository.addAccount).toHaveBeenNthCalledWith(1, {
    accountIndex: 1,
    metadata: { name: 'Account #1' },
    extendedAccountPublicKey:
      '5280ef1287dfa35605891eb788590dbfe43b59682ada939ee111f8667d4a0847b43c08b5dce7aab937e860626e95f05ef6cc12758fa9ee16a4fc394bd9f684e4',
    walletId: '0000000'
  });

  expect(walletRepository.addWallet).toHaveBeenNthCalledWith(1, {
    metadata: { name: 'Ledger 1', lastActiveAccountIndex: 0 },
    type: 'Ledger',
    accounts: [
      {
        extendedAccountPublicKey:
          '7eefc2120ec17dc280f7f7adba233bcd75c00d59d9442ded45e44e00745e28d4d06673111ee5aad359f25fafbb787c55f1f80e0d9f0b567959d0a3587276210c',
        accountIndex: 0,
        metadata: { name: 'Account #0' }
      }
    ]
  });
});

test('all accounts existing conflict', async () => {
  const walletRepository: WalletRepositoryMock = {
    wallets$: new BehaviorSubject<WalletMock[]>([
      {
        accounts: [
          {
            accountIndex: 0,
            extendedAccountPublicKey:
              'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
          },
          {
            accountIndex: 1,
            extendedAccountPublicKey:
              '5280ef1287dfa35605891eb788590dbfe43b59682ada939ee111f8667d4a0847b43c08b5dce7aab937e860626e95f05ef6cc12758fa9ee16a4fc394bd9f684e4'
          }
        ] as Bip32WalletAccount<Wallet.AccountMetadata>[],
        type: WalletType.InMemory,
        walletId: '0000000'
      },
      {
        accounts: [
          {
            accountIndex: 0,
            extendedAccountPublicKey:
              '7eefc2120ec17dc280f7f7adba233bcd75c00d59d9442ded45e44e00745e28d4d06673111ee5aad359f25fafbb787c55f1f80e0d9f0b567959d0a3587276210c'
          },
          {
            accountIndex: 1,
            extendedAccountPublicKey:
              '18b35d8e07c1dd096ce359f4ce5ac669a27c8ac23583f9e6a53b7508efd28c849a7b1eda5ac98ed02d6048d0cbe84f91570b9f0cc3acff935cf229cd798da730'
          }
        ] as Bip32WalletAccount<Wallet.AccountMetadata>[],
        type: WalletType.Ledger,
        walletId: '111111'
      }
    ] as WalletMock[]),
    addWallet: jest.fn(),
    addAccount: jest.fn()
  } as unknown as WalletRepositoryMock;

  const walletManager: WalletManagerMock = {
    activate: jest.fn()
  } as unknown as WalletManagerMock;

  await run(walletRepository, walletManager, state);

  expect(walletManager.activate).not.toHaveBeenCalled();
  expect(walletRepository.addAccount).not.toHaveBeenCalled();
  expect(walletRepository.addWallet).not.toHaveBeenCalled();
});
