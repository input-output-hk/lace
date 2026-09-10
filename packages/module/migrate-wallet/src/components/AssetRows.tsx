import {
  Avatar,
  Column,
  getAssetImageUrl,
  Row,
  spacing,
  Text,
} from '@lace-lib/ui-toolkit';
import { formatAmountToLocale } from '@lace-lib/util-render';
import React, { useMemo } from 'react';
import { StyleSheet } from 'react-native';

import { useLaceSelector } from '../hooks';

import { assetLabel } from './asset-label';
import { cardLayout } from './card-styles';

import type { SweptAsset } from '../store/slice';

/** Matched to the ADA coin's optical weight at the smaller row size. */
const AVATAR_SIZE = 32;

type AssetMetadata = { decimals?: number; image?: string; name?: string };

/**
 * One asset the sweep moves: what it is, and how much of it. The name and logo
 * come from the app's token-metadata cache, which the imported source wallet
 * populates as it syncs; until then — and for assets the cache has never seen —
 * the id names the asset itself and the avatar falls back to its initials.
 * `Avatar` rather than the shared `TokenGroupSummary`, which shows a
 * broken-image glyph instead of initials when an asset has no logo.
 *
 * Unknown decimals are treated as zero, the same assumption the portfolio and
 * send screens make, so a quantity here reads exactly as it does everywhere
 * else in Lace.
 */
const AssetItem = ({
  asset,
  metadata,
}: {
  asset: SweptAsset;
  metadata?: AssetMetadata;
}) => {
  const name = metadata?.name ?? assetLabel(asset.id);
  const uri = getAssetImageUrl(metadata?.image);

  return (
    <Row gap={spacing.S} alignItems="center">
      <Avatar
        size={AVATAR_SIZE}
        shape="rounded"
        content={{ ...(uri && { img: { uri } }), fallback: name }}
      />
      <Text.M style={cardLayout.body} numberOfLines={1}>
        {name}
      </Text.M>
      <Text.M style={styles.quantity}>
        {formatAmountToLocale(asset.quantity, metadata?.decimals ?? 0)}
      </Text.M>
    </Row>
  );
};

/**
 * The native assets a sweep moves, listed beside the ADA they arrive with —
 * because that is what arrives: one list of holdings, of which ADA is the
 * largest line. A count could only ever say that something was missing, never
 * what: nobody knows they hold "4 native assets", they know they hold HOSKY and
 * an NFT.
 */
export const AssetRows = ({
  assets = [],
  testID,
}: {
  assets?: SweptAsset[];
  testID?: string;
}) => {
  const tokensMetadata = useLaceSelector('tokens.selectTokensMetadata');
  // Keyed by plain string: the slice keys are branded `TokenId`s, and an asset
  // id off the chain is not one until it is proven to be.
  const metadataById = useMemo(
    () => new Map(Object.entries(tokensMetadata)),
    [tokensMetadata],
  );

  if (assets.length === 0) return null;

  return (
    <Column gap={spacing.M} testID={testID}>
      {assets.map(asset => (
        <AssetItem
          key={asset.id}
          asset={asset}
          metadata={metadataById.get(asset.id)}
        />
      ))}
    </Column>
  );
};

const styles = StyleSheet.create({
  quantity: {
    textAlign: 'right',
  },
});
