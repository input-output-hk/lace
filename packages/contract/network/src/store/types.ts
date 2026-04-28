import type { BlockchainNetworkId } from '../value-objects';
import type { TranslationKey } from '@lace-contract/i18n';
import type { BlockchainName } from '@lace-lib/util-store';

export type NetworkType = 'mainnet' | 'testnet';

export const isNetworkType = (value: unknown): value is NetworkType =>
  value === 'mainnet' || value === 'testnet';

export type BlockchainNetworkConfig = {
  mainnet: BlockchainNetworkId;
  testnet: BlockchainNetworkId;
};

export type TestnetOption = {
  id: BlockchainNetworkId;
  label: TranslationKey;
};

export type NetworkSliceState = {
  networkType: NetworkType;
  /**
   * The network type as seeded by the `INITIAL_NETWORK_TYPE` feature flag.
   * Unlike `networkType`, this value is always kept in sync with the feature
   * flag. `networkType` is only updated from the flag once (on first load)
   * so that a user-initiated switch is not overridden by a subsequent flag
   * update.
   */
  initialNetworkType: NetworkType;
  blockchainNetworks: Partial<Record<BlockchainName, BlockchainNetworkConfig>>;
  testnetOptions: Partial<Record<BlockchainName, TestnetOption[]>>;
};
