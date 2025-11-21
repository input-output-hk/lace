/* eslint-disable no-magic-numbers */
/* eslint-disable unicorn/no-useless-undefined */
import { AnyWallet, WalletManager, WalletRepository } from '@cardano-sdk/web-extension';
import { createTestScheduler } from '@cardano-sdk/util-dev';
import { walletMetadataWithAddresses, cacheActivatedWalletAddressSubscription } from '../cache-wallets-address';
import { Wallet } from '@lace/cardano';
import { Observable, of } from 'rxjs';

const eachSubscription = <T>(...observables: Observable<T>[]) => {
  let numSubscription = 0;
  return new Observable((subscriber) => observables[numSubscription++].subscribe(subscriber));
};

describe('cacheActivatedWalletAddressSubscription', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should not trigger subscription for no active wallet', () => {
    const mockWalletManager = {
      activeWallet$: of(undefined)
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
      activeWallet$: of({
        observableWallet: { addresses$: of([{ address: 'address1' }]) },
        props: { walletId: 'walletId' }
      })
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

  it('should update metadata when a new wallet is added and activated', () => {
    createTestScheduler().run(({ cold, expectObservable }) => {
      const mockWalletManager = {
        activeWallet$: cold('a----f', {
          a: {
            observableWallet: { addresses$: cold('a', { a: [{ address: 'address1' }] }) },
            props: { walletId: 'walletId1' }
          },
          f: {
            observableWallet: { addresses$: cold('a', { a: [{ address: 'address2' }] }) },
            props: { walletId: 'walletId2' }
          }
        })
      } as unknown as WalletManager<Wallet.WalletMetadata, Wallet.AccountMetadata>;
      const mockWalletRepository = {
        wallets$: eachSubscription(
          cold('a-b', {
            a: [
              {
                walletId: 'walletId1',
                metadata: { walletAddresses: [] }
              } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
            ],
            b: [
              {
                walletId: 'walletId1',
                metadata: { walletAddresses: ['address1'] }
              } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
            ]
          }),
          cold('a', {
            a: [
              {
                walletId: 'walletId2',
                metadata: {}
              } as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>
            ]
          })
        )
      } as unknown as WalletRepository<Wallet.WalletMetadata, Wallet.AccountMetadata>;

      expectObservable(walletMetadataWithAddresses(mockWalletManager, mockWalletRepository)).toBe('a----f', {
        a: {
          walletId: 'walletId1',
          metadata: {
            walletAddresses: ['address1']
          }
        },
        f: {
          walletId: 'walletId2',
          metadata: {
            walletAddresses: ['address2']
          }
        }
      });
    });
  });
});
