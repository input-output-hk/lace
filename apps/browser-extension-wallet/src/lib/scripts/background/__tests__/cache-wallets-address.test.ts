/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
import { WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { cacheActivatedWalletAddressSubscription } from '../cache-wallets-address';
import { Wallet } from '@lace/cardano';
import { BehaviorSubject, of } from 'rxjs';

describe('cacheActivatedWalletAddressSubscription', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not trigger subscription for no active wallet', () => {
    const mockWalletManager = {
      activeWallet$: of(undefined),
      activeWalletId$: of(undefined)
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([]),
      updateWalletMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    cacheActivatedWalletAddressSubscription(mockWalletManager, mockWalletRepository);

    expect(mockWalletRepository.updateWalletMetadata).not.toHaveBeenCalled();
  });

  it('should subscribe and update metadata', () => {
    const mockWalletManager = {
      activeWallet$: of({ addresses$: of([{ address: 'address1' }]) }),
      activeWalletId$: of({ walletId: 'walletId' })
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$: of([
        {
          walletId: 'walletId',
          metadata: {}
        }
      ]),
      updateWalletMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    cacheActivatedWalletAddressSubscription(mockWalletManager, mockWalletRepository);

    expect(mockWalletRepository.updateWalletMetadata).toHaveBeenCalledWith({
      walletId: 'walletId',
      metadata: {
        walletAddresses: ['address1']
      }
    });
  });

  it('should subscribe and update metadata when a new wallet is added and activated', () => {
    const activeWallet$ = new BehaviorSubject({
      addresses$: of([{ address: 'address1' }])
    });
    const activeWalletId$ = new BehaviorSubject({
      walletId: 'walletId1'
    });
    const wallets$ = new BehaviorSubject<{ walletId: string; metadata: { walletAddresses?: string[] } }[]>([
      {
        walletId: 'walletId1',
        metadata: { walletAddresses: ['address1'] }
      }
    ]);
    const mockWalletManager = {
      activeWallet$,
      activeWalletId$
    } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    const mockWalletRepository = {
      wallets$,
      updateWalletMetadata: jest.fn()
    } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

    cacheActivatedWalletAddressSubscription(mockWalletManager, mockWalletRepository);

    wallets$.next([
      {
        walletId: 'walletId1',
        metadata: { walletAddresses: ['address1'] }
      },
      {
        walletId: 'walletId2',
        metadata: {}
      }
    ]);
    activeWalletId$.next({ walletId: 'walletId2' });
    activeWallet$.next({ addresses$: of([{ address: 'address2' }, { address: 'address3' }]) });

    expect(mockWalletRepository.updateWalletMetadata).toHaveBeenNthCalledWith(1, {
      walletId: 'walletId1',
      metadata: {
        walletAddresses: ['address1']
      }
    });

    expect(mockWalletRepository.updateWalletMetadata).toHaveBeenNthCalledWith(2, {
      walletId: 'walletId2',
      metadata: {
        walletAddresses: ['address2', 'address3']
      }
    });
  });
});
