import { getNetworkKeys, BitcoinWalletInfo, ExtendedAccountPublicKeys } from '../src/wallet/lib/common/info';
import { Network } from '../src/wallet/lib/common/network';

describe('getNetworkKeys', () => {
  const mainnetKeys: ExtendedAccountPublicKeys = {
    legacy: 'xpub-mainnet-legacy',
    segWit: 'xpub-mainnet-segwit',
    nativeSegWit: 'xpub-mainnet-nativesegwit',
    taproot: 'xpub-mainnet-taproot',
    electrumNativeSegWit: 'xpub-mainnet-electrum'
  };

  const testnetKeys: ExtendedAccountPublicKeys = {
    legacy: 'tpub-testnet-legacy',
    segWit: 'tpub-testnet-segwit',
    nativeSegWit: 'tpub-testnet-nativesegwit',
    taproot: 'tpub-testnet-taproot',
    electrumNativeSegWit: 'tpub-testnet-electrum'
  };

  const walletInfo: BitcoinWalletInfo = {
    walletName: 'Test Wallet',
    accountIndex: 0,
    encryptedSecrets: {
      mnemonics: 'encrypted-mnemonic-placeholder',
      seed: 'encrypted-seed-placeholder'
    },
    extendedAccountPublicKeys: {
      mainnet: mainnetKeys,
      testnet: testnetKeys
    }
  };

  it('returns mainnet keys for Network.Mainnet', () => {
    const keys = getNetworkKeys(walletInfo, Network.Mainnet);
    expect(keys).toEqual(mainnetKeys);
  });

  it('returns testnet keys for Network.Testnet', () => {
    const keys = getNetworkKeys(walletInfo, Network.Testnet);
    expect(keys).toEqual(testnetKeys);
  });
});
