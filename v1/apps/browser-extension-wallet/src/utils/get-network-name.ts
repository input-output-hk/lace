import { Blockchain } from '@src/multichain';

export const isBitcoinNetworkSwitchingEnabled = (): boolean => process.env.USE_BITCOIN_NETWORK_SWITCHING === 'true';
export const isBitcoinNetworkSwitchingDisabled = (): boolean => !isBitcoinNetworkSwitchingEnabled();

/**
 * Gets the network name for the current blockchain and environment.
 * @param blockchain The blockchain to get the network name for.
 * @param environmentName The environment name to get the network name for.
 */
export const getNetworkName = (blockchain: Blockchain, environmentName: string): string => {
  if (blockchain === Blockchain.Cardano) {
    return environmentName;
  }

  if (isBitcoinNetworkSwitchingDisabled()) {
    return 'Testnet4';
  }

  return environmentName === 'Mainnet' ? environmentName : 'Testnet4';
};
