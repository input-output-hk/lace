import type { IconName } from '../design-system';

export type NFT = {
  tokenId: string;
  name: string;
  image?: string;
};

export type AssetToSend = {
  type: 'nft' | 'token';
  token: Token;
  nft?: NFT;
  value: string;
  amount: string;
  symbol?: string;
  currency?: string;
};

export type Token = {
  tokenId: string;
  name?: string;
  symbol?: string;
  decimals?: number;
  available?: string;
  displayShortName: string;
  metadata?: {
    image?: string;
    isNft?: boolean;
    blockchainSpecific?: unknown;
  };
};

export type TokenMetadata = {
  blockchainSpecific?: unknown;
};

/**
 * Returns true when metadata has blockchainSpecific with kind === 'shielded'.
 * Safe for unknown/metadata from different sources.
 */
export const isShieldedFromMetadata = (metadata?: TokenMetadata): boolean => {
  if (
    !metadata?.blockchainSpecific ||
    typeof metadata.blockchainSpecific !== 'object'
  ) {
    return false;
  }
  if (!('kind' in metadata.blockchainSpecific)) {
    return false;
  }
  return (metadata.blockchainSpecific as { kind: string }).kind === 'shielded';
};

export type FeeEntry = {
  amount: string;
  token: Token;
  value: string;
  currency: string;
};

export type FeeOption = 'Average' | 'Custom' | 'Fast' | 'Low';

export type FeeOptionTabItem = {
  label: string;
  value: FeeOption;
  testID?: string;
  disabled?: boolean;
};

export type FeeOptionTab = FeeOption | FeeOptionTabItem;

export type AccountData = {
  accountId: string;
  accountName: string;
  walletName: string;
  status: string;
  leftIcon: IconName;
};
