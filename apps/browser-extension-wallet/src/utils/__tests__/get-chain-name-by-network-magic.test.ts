import { Wallet } from '@lace/cardano';
import { getChainNameByNetworkMagic } from '../get-chain-name-by-network-magic';

describe('Testing getChainNameByNetworkMagic function', () => {
  test(`should return Mainnet as name for network magic ${Wallet.Cardano.NetworkMagics.Mainnet}`, () => {
    const networkName = getChainNameByNetworkMagic(Wallet.Cardano.NetworkMagics.Mainnet);
    expect(networkName).toBe('Mainnet');
  });
  test(`should return Preprod as name for network magic ${Wallet.Cardano.NetworkMagics.Preprod}`, () => {
    const networkName = getChainNameByNetworkMagic(Wallet.Cardano.NetworkMagics.Preprod);
    expect(networkName).toBe('Preprod');
  });
  test(`should return Preview as name for network magic ${Wallet.Cardano.NetworkMagics.Preview}`, () => {
    const networkName = getChainNameByNetworkMagic(Wallet.Cardano.NetworkMagics.Preview);
    expect(networkName).toBe('Preview');
  });
});
