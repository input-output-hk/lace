import { formatTokenFullName, getTokenTickerFallback } from '../../utils';

import type {
  RawToken,
  RawTokenWithoutContext,
  Token,
  TokenMetadata,
} from '../../types';
import type { Address } from '@lace-contract/addresses';
import type { AccountId } from '@lace-contract/wallet-repo';
import type { BlockchainAssigned, BlockchainName } from '@lace-lib/util-store';

export const getTokensOfAccount = (tokens: Token[], accountId: AccountId) =>
  tokens.filter(t => t.accountId === accountId);

export const getTokensOfBlockchain = (
  tokens: Token[],
  blockchainName: BlockchainName,
) => tokens.filter(t => t.blockchainName === blockchainName);

const getDisplayShortName = <BlockchainSpecificMetadata = unknown>({
  rawToken,
  metadata,
  displayLongName,
  isUnnamed,
}: {
  rawToken: RawToken;
  metadata?: TokenMetadata<BlockchainSpecificMetadata>;
  displayLongName: string;
  isUnnamed: boolean;
}) => {
  if (metadata?.ticker) return metadata.ticker;
  if (!isUnnamed) return displayLongName;
  return getTokenTickerFallback(rawToken.tokenId);
};

export const createRawToken = ({
  accountId,
  address,
  blockchainName,
  tokenWithoutContext,
}: BlockchainAssigned<{
  accountId: AccountId;
  address: Address;
  tokenWithoutContext: RawTokenWithoutContext;
}>) => ({
  ...tokenWithoutContext,
  accountId,
  address,
  blockchainName,
});

export const createToken = <BlockchainSpecificMetadata = unknown>(
  rawToken: RawToken,
  metadata?: TokenMetadata<BlockchainSpecificMetadata>,
): Token<BlockchainSpecificMetadata> => {
  const isUnnamed = !metadata?.name;
  const displayName = metadata?.name || rawToken.tokenId;
  const displayLongName = formatTokenFullName(displayName);
  const displayShortName = getDisplayShortName({
    rawToken,
    metadata,
    displayLongName,
    isUnnamed,
  });

  return {
    ...rawToken,
    unnamed: isUnnamed,
    metadata,
    decimals: metadata?.decimals || 0,
    displayLongName,
    displayShortName,
  };
};
