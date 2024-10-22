/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
import { Wallet } from '@lace/cardano';
import { of } from 'rxjs';
import { WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { cacheNamiMetadataSubscription } from '../cache-nami-metadata';

describe('cacheNamiMetadataSubscription', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not trigger subscription for no active wallet', () => {
    const mockWalletManager = {
      activeWallet$: of({}),
      activeWalletId$: of(undefined)
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([]),
      updateAccountMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    cacheNamiMetadataSubscription({ walletManager: mockWalletManager, walletRepository: mockWalletRepository });

    expect(mockWalletRepository.updateAccountMetadata).not.toHaveBeenCalled();
  });

  it('should return early if there is no accounts', () => {
    const mockWalletManager = {
      activeWallet$: of({
        observableWallet: {
          addresses$: of(),
          protocolParameters$: of(),
          balance: {
            rewardAccounts: {
              rewards$: of()
            },
            utxo: {
              total$: of(),
              unspendable$: of()
            }
          }
        },
        props: {
          walletId: 'walletId',
          chainId: Wallet.Cardano.ChainIds.Preprod
        }
      })
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([
        {
          walletId: 'walletId',
          metadata: {},
          accounts: []
        }
      ]),
      updateAccountMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    cacheNamiMetadataSubscription({ walletManager: mockWalletManager, walletRepository: mockWalletRepository });

    expect(mockWalletRepository.updateAccountMetadata).not.toHaveBeenCalled();
  });

  it('should subscribe and update account metadata for index 0', () => {
    const mockWalletManager = {
      activeWallet$: of({
        observableWallet: {
          addresses$: of([{ address: 'address1' }]),
          protocolParameters$: of({ coinsPerUtxoByte: BigInt(100) }),
          balance: {
            rewardAccounts: {
              rewards$: of(BigInt(2000))
            },
            utxo: {
              total$: of({
                coins: BigInt(5000),
                assets: undefined
              }),
              unspendable$: of({
                coins: BigInt(1000)
              })
            }
          }
        },
        props: { walletId: 'walletId', accountIndex: 0, chainId: Wallet.Cardano.ChainIds.Preprod }
      })
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([
        {
          walletId: 'walletId',
          metadata: {},
          accounts: [{ accountIndex: 0, metadata: { name: 'account #0' } }]
        }
      ]),
      updateAccountMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const getBalanceMock = jest
      .fn()
      .mockReturnValue({ totalCoins: BigInt(7000), unspendableCoins: BigInt(1000), lockedCoins: BigInt(2000) });

    cacheNamiMetadataSubscription({
      walletManager: mockWalletManager,
      walletRepository: mockWalletRepository,
      getBalance: getBalanceMock
    });

    expect(getBalanceMock).toHaveBeenCalledWith({
      total: { coins: BigInt(5000), assets: undefined },
      unspendable: { coins: BigInt(1000) },
      rewards: BigInt(2000),
      protocolParameters: { coinsPerUtxoByte: BigInt(100) },
      address: 'address1'
    });

    expect(mockWalletRepository.updateAccountMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'walletId',
        accountIndex: 0,
        metadata: {
          name: 'account #0',
          namiMode: {
            avatar: expect.any(String),
            address: { Preprod: 'address1' },
            balance: { Preprod: '4000' }
          }
        }
      })
    );
  });

  it('should subscribe and update wallet metadata and account metadata for index 1', () => {
    const mockWalletManager = {
      activeWallet$: of({
        observableWallet: {
          addresses$: of([{ address: 'address2' }]),
          protocolParameters$: of({ coinsPerUtxoByte: BigInt(100) }),
          balance: {
            rewardAccounts: {
              rewards$: of(BigInt(2000))
            },
            utxo: {
              total$: of({
                coins: BigInt(5000),
                assets: undefined
              }),
              unspendable$: of({
                coins: BigInt(1000)
              })
            }
          }
        },
        props: { walletId: 'walletId', accountIndex: 1, chainId: Wallet.Cardano.ChainIds.Preprod }
      })
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([
        {
          walletId: 'walletId',
          metadata: {},
          accounts: [
            { accountIndex: 0, metadata: { name: 'account #0' } },
            { accountIndex: 1, metadata: { name: 'account #1', namiMode: { avatar: '0.123' } } }
          ]
        }
      ]),
      updateAccountMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const getBalanceMock = jest
      .fn()
      .mockReturnValue({ totalCoins: BigInt(7000), unspendableCoins: BigInt(1000), lockedCoins: BigInt(0) });

    cacheNamiMetadataSubscription({
      walletManager: mockWalletManager,
      walletRepository: mockWalletRepository,
      getBalance: getBalanceMock
    });

    expect(mockWalletRepository.updateAccountMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        walletId: 'walletId',
        accountIndex: 1,
        metadata: {
          name: 'account #1',
          namiMode: {
            avatar: '0.123',
            address: { Preprod: 'address2' },
            balance: { Preprod: '6000' }
          }
        }
      })
    );
  });
});
