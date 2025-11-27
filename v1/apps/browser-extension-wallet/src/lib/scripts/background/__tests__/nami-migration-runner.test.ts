/* eslint-disable sonarjs/no-identical-functions */
/* eslint-disable unicorn/no-null */
/* eslint-disable no-magic-numbers */
import '@testing-library/jest-dom';
import { run, WalletManager, WalletRepository, AnyWallet, CollateralRepository } from '../nami-migration-runner';
import { Bip32WalletAccount, WalletType } from '@cardano-sdk/web-extension';
import { Wallet } from '@lace/cardano';
import { state } from './nami-migration-runner.fixture';
import { BehaviorSubject } from 'rxjs';
import type * as Nami from '@src/features/nami-migration/migration-tool/migrator/migration-data.data';

test('fresh install', async () => {
  const walletRepository: WalletRepository = {
    wallets$: new BehaviorSubject([]),
    addWallet: jest
      .fn()
      .mockResolvedValueOnce('0000000')
      .mockResolvedValueOnce('1111111')
      .mockResolvedValueOnce('2222222')
  } as unknown as WalletRepository;

  const walletManager: WalletManager = {
    activate: jest.fn()
  } as unknown as WalletManager;

  const collateralRepository: CollateralRepository = jest.fn();

  await run({ walletRepository, walletManager, collateralRepository, state });

  expect(collateralRepository).toHaveBeenNthCalledWith(1, {
    walletId: '0000000',
    accountIndex: 0,
    chainId: Wallet.Cardano.ChainIds.Mainnet,
    utxo: [
      {
        txId: Wallet.Cardano.TransactionId('5aeae083cceb3a930f3402d367096d2d524d03abf915fd9452cc59b3063a6aad'),
        index: 0,
        address:
          'addr1qymlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qw7srzg'
      },
      {
        address:
          'addr1qymlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qw7srzg',
        value: {
          coins: BigInt('5000000')
        }
      }
    ]
  });

  expect(collateralRepository).toHaveBeenNthCalledWith(2, {
    chainId: Wallet.Cardano.ChainIds.Preview,
    walletId: '1111111',
    accountIndex: 0,
    utxo: [
      {
        txId: Wallet.Cardano.TransactionId('5aeae083cceb3a930f3402d367096d2d524d03abf915fd9452cc59b3063a6aad'),
        index: 0,
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n'
      },
      {
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n',
        value: {
          coins: BigInt('5000000')
        }
      }
    ]
  });

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
        metadata: { name: 'Nami' },
        extendedAccountPublicKey:
          'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
      },
      {
        accountIndex: 1,
        metadata: { name: 'xxx' },
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
  const walletRepository: WalletRepository = {
    wallets$: new BehaviorSubject<AnyWallet[]>([
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
    ] as AnyWallet[]),
    addWallet: jest
      .fn()
      .mockResolvedValueOnce('0000000')
      .mockResolvedValueOnce('1111111')
      .mockResolvedValueOnce('2222222')
  } as unknown as WalletRepository;

  const walletManager: WalletManager = {
    activate: jest.fn()
  } as unknown as WalletManager;

  const collateralRepository: CollateralRepository = jest.fn();

  await run({ walletRepository, walletManager, collateralRepository, state });

  expect(collateralRepository).toHaveBeenNthCalledWith(1, {
    walletId: '0000000',
    accountIndex: 0,
    chainId: Wallet.Cardano.ChainIds.Mainnet,
    utxo: [
      {
        txId: Wallet.Cardano.TransactionId('5aeae083cceb3a930f3402d367096d2d524d03abf915fd9452cc59b3063a6aad'),
        index: 0,
        address:
          'addr1qymlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qw7srzg'
      },
      {
        address:
          'addr1qymlvzkhufx0f94vqtfsmfa7yzxtwql8ga8aq5yk6u98gn593a82g73tm9n0l6vehusxn3fxwwxhrssgmvnwnlaa6p4qw7srzg',
        value: {
          coins: BigInt('5000000')
        }
      }
    ]
  });

  expect(collateralRepository).toHaveBeenNthCalledWith(2, {
    chainId: Wallet.Cardano.ChainIds.Preview,
    walletId: '1111111',
    accountIndex: 0,
    utxo: [
      {
        txId: Wallet.Cardano.TransactionId('5aeae083cceb3a930f3402d367096d2d524d03abf915fd9452cc59b3063a6aad'),
        index: 0,
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n'
      },
      {
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n',
        value: {
          coins: BigInt('5000000')
        }
      }
    ]
  });

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
        metadata: { name: 'Nami' },
        extendedAccountPublicKey:
          'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
      },
      {
        accountIndex: 1,
        metadata: { name: 'xxx' },
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
  const walletRepository: WalletRepository = {
    wallets$: new BehaviorSubject<AnyWallet[]>([
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
    ] as AnyWallet[]),
    addWallet: jest.fn().mockResolvedValueOnce('2222222'),
    addAccount: jest.fn()
  } as unknown as WalletRepository;

  const walletManager: WalletManager = {
    activate: jest.fn()
  } as unknown as WalletManager;

  const collateralRepository: CollateralRepository = jest.fn();

  await run({ walletRepository, walletManager, collateralRepository, state });

  expect(collateralRepository).toHaveBeenCalledTimes(1);
  expect(collateralRepository).toHaveBeenCalledWith({
    chainId: Wallet.Cardano.ChainIds.Preview,
    accountIndex: 0,
    walletId: '2222222',
    utxo: [
      {
        txId: Wallet.Cardano.TransactionId('5aeae083cceb3a930f3402d367096d2d524d03abf915fd9452cc59b3063a6aad'),
        index: 0,
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n'
      },
      {
        address:
          'addr_test1qr5g8x8lpu6ydhe5ytggl6vrlt6prtdzzk7nljh6uf23ktknjausjhrf7f92l3ze9pp5njhkwrv45phhryjxjhtmq7rqsd7r7n',
        value: {
          coins: BigInt('5000000')
        }
      }
    ]
  });

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
  const walletRepository: WalletRepository = {
    wallets$: new BehaviorSubject<AnyWallet[]>([
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
    ] as AnyWallet[]),
    addWallet: jest.fn(),
    addAccount: jest.fn()
  } as unknown as WalletRepository;

  const walletManager: WalletManager = {
    activate: jest.fn()
  } as unknown as WalletManager;

  const collateralRepository: CollateralRepository = jest.fn();

  await run({ walletRepository, walletManager, collateralRepository, state });

  expect(collateralRepository).not.toHaveBeenCalled();
  expect(walletManager.activate).not.toHaveBeenCalled();
  expect(walletRepository.addAccount).not.toHaveBeenCalled();
  expect(walletRepository.addWallet).not.toHaveBeenCalled();
});

test('LW-12135 one conflicting hw wallet and one new in-memory wallet', async () => {
  const walletRepository: WalletRepository = {
    wallets$: new BehaviorSubject<AnyWallet[]>([
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
    ] as AnyWallet[]),
    addWallet: jest.fn().mockResolvedValueOnce('2222222'),
    addAccount: jest.fn()
  } as unknown as WalletRepository;

  const walletManager: WalletManager = {
    activate: jest.fn()
  } as unknown as WalletManager;

  const collateralRepository: CollateralRepository = jest.fn();

  const stateOneMnemonicOneHw: Nami.State = {
    ...state,
    accounts: [state.accounts[0]], // mnemonic wallet - no conflict/does not exist in Lace
    hardwareWallets: [state.hardwareWallets[1]] // hw wallet - conflict/already exists in Lace
  };
  await run({ walletRepository, walletManager, collateralRepository, state: stateOneMnemonicOneHw });

  // LW-12135: test fails without the fix because it does not correctly detect a new mnemonic wallet
  expect(walletRepository.addAccount).not.toHaveBeenCalledWith(expect.objectContaining({ walletId: '' }));

  expect(walletManager.activate).toHaveBeenCalledWith({
    walletId: '2222222',
    accountIndex: 0,
    chainId: Wallet.Cardano.ChainIds.Mainnet
  });

  // LW-12135: validate fix works by checking that the mnemonic wallet is added as a new wallet
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
        metadata: { name: 'Nami' },
        extendedAccountPublicKey:
          'a5f18f73dde7b6f11df448913d60a86bbb397a435269e5024193b293f28892fd33d1225d468aac8f5a9d3cfedceacabe80192fcf0beb5c5c9b7988151f3353cc'
      }
    ],
    type: WalletType.InMemory
  });
});
