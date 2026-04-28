import { Asset, Cardano } from '@cardano-sdk/core';
import { HexBytes } from '@lace-sdk/util';
import { combineLatest, distinctUntilChanged, filter, map } from 'rxjs';

import { Handle, HandleType } from '../value-objects';

import type { SideEffect } from '..';
import type { AddressAliasEntry } from '@lace-contract/addresses';
import type { Token } from '@lace-contract/tokens';

/** ADA Handle policy IDs per network */
const HANDLE_POLICY_IDS: Partial<Record<Cardano.NetworkMagic, string>> = {
  [Cardano.NetworkMagics.Mainnet]:
    'f0ff48bbb7bbe9d59a40f1ce90e9e9d0ff5002ec48f232b49ca0fb9a',
  [Cardano.NetworkMagics.Preview]:
    '8d18d786e92776c824607fd8e193ec535c79dc61ea2405ddf3b09fe3',
};

/**
 * Decodes handle name from a Cardano AssetId.
 * Handles CIP-67 encoded names by extracting the content portion.
 */
const decodeHandleName = (assetId: Cardano.AssetId): string | undefined => {
  const assetName = Cardano.AssetId.getAssetName(assetId);
  const decoded = Asset.AssetNameLabel.decode(assetName);
  const nameHex = decoded?.content ?? assetName;

  try {
    return HexBytes.toUTF8(HexBytes(nameHex));
  } catch {
    return undefined;
  }
};

/**
 * Filters tokens that are ADA Handle NFTs based on their policy ID.
 */
const filterHandleTokens = (
  tokens: Token[],
  networkMagic: Cardano.NetworkMagic,
): Token[] => {
  const policyId = HANDLE_POLICY_IDS[networkMagic];
  if (!policyId) return [];
  return tokens.filter(token => token.tokenId.startsWith(policyId));
};

/**
 * Extracts handle aliases from tokens.
 */
const extractHandleAliases = (handleTokens: Token[]): AddressAliasEntry[] => {
  const aliases: AddressAliasEntry[] = [];

  for (const token of handleTokens) {
    const handleName = decodeHandleName(Cardano.AssetId(token.tokenId));
    if (!handleName) continue;

    const handleAlias = `$${handleName}`;
    if (!Handle.isHandle(handleAlias)) continue;

    aliases.push({
      address: token.address,
      aliasType: HandleType(),
      alias: Handle(handleAlias),
    });
  }

  return aliases;
};

/**
 * Compares two alias arrays for equality.
 */
const areAliasesEqual = (
  a: AddressAliasEntry[],
  b: AddressAliasEntry[],
): boolean => {
  if (a.length !== b.length) return false;
  return a.every(
    (entry, index) =>
      entry.address === b[index].address && entry.alias === b[index].alias,
  );
};

/**
 * Side effect that watches for Cardano tokens with ADA Handle policy IDs
 * and dispatches actions to set address aliases.
 */
export const trackOwnHandleAliases: SideEffect = (
  _,
  {
    tokens: { selectTokensGroupedByAccount$ },
    cardanoContext: { selectChainId$ },
  },
  { actions },
) =>
  combineLatest([
    selectChainId$.pipe(filter(Boolean)),
    selectTokensGroupedByAccount$,
  ]).pipe(
    map(([chainId, tokensGroupedByAccount]) => {
      const allAccountTokens: Token[] = Object.values(
        tokensGroupedByAccount,
      ).flatMap(group => [...group.fungible, ...group.nfts]);
      const cardanoTokens = allAccountTokens.filter(
        token => token.blockchainName === 'Cardano',
      );
      const handleTokens = filterHandleTokens(
        cardanoTokens,
        chainId.networkMagic,
      );
      return extractHandleAliases(handleTokens);
    }),
    distinctUntilChanged(areAliasesEqual),
    filter(aliases => aliases.length > 0),
    map(aliases => actions.addresses.setAliases({ aliases })),
  );
