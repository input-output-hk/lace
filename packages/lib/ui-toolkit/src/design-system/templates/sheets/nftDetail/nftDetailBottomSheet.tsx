import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Row, Text, Divider, Column, Thumbnail } from '../../../atoms';
import { Sheet, footerHeight } from '../../../organisms';
import { formatMetadataValue, getAssetImageUrl } from '../../../util';

import type { Theme } from '../../../../design-tokens';

type MetadataRowProps = {
  label: string;
  value?: unknown;
  isLink?: boolean;
  onPress?: () => void;
  withDivider?: boolean;
  testID?: string;
};

type TokenInfo = {
  policyId: string;
  assetId: string;
  mediaUrl: string;
  folderIds: string;
};

interface NftDetailBottomSheetProps {
  tokenInfo: TokenInfo;
  selectedNft: {
    metadata: {
      image: string;
    };
  };
  theme: Theme;
  metadataItems: MetadataRowProps[];
}

const MetadataRow = ({
  label,
  value,
  isLink,
  onPress,
  withDivider,
  testID,
  defaultStyles,
}: MetadataRowProps & { defaultStyles: ReturnType<typeof styles> }) => {
  return (
    <>
      <Row style={defaultStyles.metadataRow}>
        <Text.S
          style={defaultStyles.metadataLabel}
          testID={`nft-detail-attribute-${testID}-label`}>
          {label}
        </Text.S>
        <Text.S
          style={[defaultStyles.metadataValue, isLink && defaultStyles.link]}
          onPress={onPress}
          testID={`nft-detail-attribute-${testID}-value`}>
          {formatMetadataValue(value)}
        </Text.S>
      </Row>
      {!withDivider && <Divider />}
    </>
  );
};

export const NftDetailBottomSheet = ({
  tokenInfo,
  theme,
  selectedNft,
  metadataItems,
}: NftDetailBottomSheetProps) => {
  const defaultStyles = styles(theme);
  const { t } = useTranslation();

  const labelMap = {
    policyId: t('v2.nft-detail.policyId'),
    assetId: t('v2.nft-detail.assetId'),
    mediaUrl: t('v2.nft-detail.mediaUrl'),
    folderIds: t('v2.nft-detail.folderIds'),
    Url: t('v2.nft-detail.url'),
    symbol: t('v2.nft-detail.symbol'),
    ticker: t('v2.nft-detail.ticker'),
    decimals: t('v2.nft-detail.decimals'),
    tokenType: t('v2.nft-detail.tokenType'),
    totalSupply: t('v2.nft-detail.totalSupply'),
    attributes: t('v2.nft-detail.attributes'),
  };

  const visibleDefaultItems = Object.entries(tokenInfo)
    .filter(([, value]) => value)
    .map(([label, value], index, items) => ({
      label: labelMap[label as keyof typeof labelMap] ?? label,
      value,
      isLink: undefined,
      onPress: undefined,
      withDivider: index === items.length - 1 && metadataItems.length > 0,
      testID: label,
    }));

  const additionalMetadataItems = metadataItems.map(item => ({
    label: labelMap[item.label as keyof typeof labelMap] ?? item.label,
    value: item.value,
    isLink: item.isLink,
    onPress: item.onPress,
    withDivider: item.withDivider,
    testID: item.testID,
  }));

  const hasAdditionalMetadata = additionalMetadataItems.length > 0;

  return (
    <Sheet.Scroll>
      <Column style={defaultStyles.content}>
        <Thumbnail
          containerStyle={defaultStyles.thumbnail}
          source={{
            uri: getAssetImageUrl(selectedNft.metadata?.image),
          }}
          testID="nft-detail-thumbnail"
        />

        {visibleDefaultItems.map((item, index) => (
          <MetadataRow
            key={item.label || index}
            label={item.label}
            value={item.value}
            isLink={item.isLink}
            onPress={item.onPress}
            withDivider={item.withDivider}
            testID={item.testID}
            defaultStyles={defaultStyles}
          />
        ))}

        {hasAdditionalMetadata && (
          <Text.L
            variant="secondary"
            testID="nft-detail-additional-attributes-label">
            {t('v2.nft-detail.attributes')}
          </Text.L>
        )}

        {additionalMetadataItems.map((item, index) => (
          <MetadataRow
            key={item.label || index}
            label={item.label}
            value={item.value}
            isLink={item.isLink}
            onPress={item.onPress}
            withDivider={item.withDivider}
            testID={item.testID}
            defaultStyles={defaultStyles}
          />
        ))}
      </Column>
    </Sheet.Scroll>
  );
};

const styles = (theme: Theme) =>
  StyleSheet.create({
    content: {
      gap: spacing.L,
      paddingBottom: footerHeight.horizontal,
    },
    metadataRow: {
      marginVertical: spacing.XS,
      width: '100%',
      gap: spacing.L,
      justifyContent: 'space-between',
    },
    metadataLabel: {
      color: theme.text.secondary,
      marginBottom: spacing.XS,
    },
    metadataValue: {
      flexShrink: 1,
      maxWidth: '100%',
      textAlign: 'right',
    },
    link: {
      textDecorationLine: 'underline',
    },
    thumbnail: {
      marginVertical: spacing.M,
    },
  });
