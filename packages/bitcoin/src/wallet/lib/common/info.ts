import { Network } from '../common';

export type NetworkKeys = {
  encryptedRootPrivateKeyHex: string;
  extendedAccountPublicKeys: {
    legacyHex: string;
    segWitHex: string;
    nativeSegWitHex: string;
    taprootHex: number;
    electrumNativeSegWitHex: number
  }
}

export type BitcoinWalletInfo = {
  walletName: string;
  accountIndex: number;
  networks: {
    mainnet: NetworkKeys,
    testnet: NetworkKeys
  }
};

export const getNetworkKeys = (info: BitcoinWalletInfo, network: Network): NetworkKeys => {
  return network === Network.Mainnet ? info.networks.mainnet : info.networks.testnet;
}
