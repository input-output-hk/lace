import { AnyWallet } from '@cardano-sdk/web-extension';
import { getAllWalletsAddresses } from '../get-all-wallets-addresses';
import { Wallet } from '@lace/cardano';

describe('getAllWalletsAddresses', () => {
  it('should return an empty array if undefined is provided', () => {
    const addresses = getAllWalletsAddresses();

    expect(addresses).toEqual([]);
  });

  it('should return an empty array if no wallets are provided', () => {
    const addresses = getAllWalletsAddresses([]);

    expect(addresses).toEqual([]);
  });

  it('should return an array of payment addresses', () => {
    const mockWallets = [
      {
        metadata: {
          walletAddresses: ['addr1', 'addr2']
        }
      },
      {
        metadata: {
          walletAddresses: ['addr2', 'addr3']
        }
      }
    ] as AnyWallet<Wallet.WalletMetadata, Wallet.AccountMetadata>[];

    const addresses = getAllWalletsAddresses(mockWallets);

    expect(addresses).toEqual(['addr1', 'addr2', 'addr3']);
  });
});
