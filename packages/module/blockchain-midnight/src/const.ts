import { FeatureFlagKey } from '@lace-contract/feature';
import {
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
  MidnightSDKNetworkId,
  MidnightSDKNetworkIds,
} from '@lace-contract/midnight-context';

export {
  FEATURE_FLAG_MIDNIGHT_INDEXER_URLS,
  FEATURE_FLAG_MIDNIGHT_REMOTE_PROOF_SERVER,
};

export const FEATURE_FLAG_MIDNIGHT = FeatureFlagKey('BLOCKCHAIN_MIDNIGHT');
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREPROD_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_PREPROD_SUPPORT',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_QANET_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_QANET_SUPPORT',
);
export const FEATURE_FLAG_MIDNIGHT_UNSHIELDED = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_UNSHIELDED',
);
// Re-export with the name used in side effects
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_DEVNET_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_DEVNET_SUPPORT',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_TESTNET_SUPPORT = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_TESTNET_SUPPORT',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_INDEXER_URLS = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_INDEXER_URLS',
);
export const FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_NODE_URLS = FeatureFlagKey(
  'BLOCKCHAIN_MIDNIGHT_NODE_URLS',
);

export type GatedMidnightSDKNetworkId = Exclude<
  MidnightSDKNetworkId,
  'undeployed'
>;
export const GatedMidnightSDKNetworkId = MidnightSDKNetworkId.filter(
  networkId => networkId !== MidnightSDKNetworkIds.Undeployed,
);

export const FeatureFlagKeysByNetworkId: Record<
  GatedMidnightSDKNetworkId,
  FeatureFlagKey
> = {
  [MidnightSDKNetworkIds.MainNet]:
    FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_MAINNET_SUPPORT,
  [MidnightSDKNetworkIds.PreProd]:
    FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREPROD_SUPPORT,
  [MidnightSDKNetworkIds.Preview]:
    FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_PREVIEW_SUPPORT,
  [MidnightSDKNetworkIds.QaNet]: FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_QANET_SUPPORT,
  [MidnightSDKNetworkIds.DevNet]:
    FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_DEVNET_SUPPORT,
  [MidnightSDKNetworkIds.TestNet]:
    FEATURE_FLAG_BLOCKCHAIN_MIDNIGHT_TESTNET_SUPPORT,
};

/** Midnight docs: install and run the proof server */
export const PROOF_SERVER_INSTALL_GUIDE_URL: string =
  'https://docs.midnight.network/guides/run-proof-server';
