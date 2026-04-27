import { useTranslation } from '@lace-contract/i18n';
import React from 'react';
import { StyleSheet } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Row, Text, Divider, Column, Thumbnail } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';
import { getAssetImageUrl } from '../../../util';

import type { Theme } from '../../../../design-tokens';

type MetadataRowProps = {
  label: string;
  value?: unknown;
  isLink?: boolean;
  onPress?: () => void;
  withDivider?: boolean;
  testID?: string;
};

const formatMetadataValue = (value: unknown): string => {
  if (value === undefined || value === null) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return '[Unable to serialize]';
  }
};

type TokenInfo = {
  policyId: string;
  assetId: string;
  mediaUrl: string;
  folderIds: string;
};

interface NftDetailBottomSheetProps {
  tokenInfo: TokenInfo;
  headerTitle: string;
  selectedNft: {
    metadata: {
      image: string;
    };
  };
  onSendPress: () => void;
  theme: Theme;
  metadataItems: MetadataRowProps[];
  sendMenuLabel: string;
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
  headerTitle,
  theme,
  selectedNft,
  metadataItems,
  sendMenuLabel,
  onSendPress,
}: NftDetailBottomSheetProps) => {
  const footerHeight = useFooterHeight();
  const defaultStyles = styles(theme, footerHeight);
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

  const tokenInfoEntries = Object.entries(tokenInfo);

  const defaultTokenMetadataItems = [
    ...tokenInfoEntries.map(([label, value], index) => ({
      label: labelMap[label as keyof typeof labelMap] ?? label,
      value,
      isLink: undefined,
      onPress: undefined,
      withDivider:
        index === tokenInfoEntries.length - 1 && metadataItems.length > 0,
      testID: label,
    })),
  ];

  const additionalMetadataItems = metadataItems.map(item => ({
    label: labelMap[item.label as keyof typeof labelMap] ?? item.label,
    value: item.value,
    isLink: item.isLink,
    onPress: item.onPress,
    withDivider: item.withDivider,
    testID: item.testID,
  }));

  return (
    <>
      <SheetHeader title={headerTitle} testID="nft-detail-bottom-sheet" />
      <Sheet.Scroll contentContainerStyle={defaultStyles.sheetContent}>
        <Column style={defaultStyles.content}>
          <Thumbnail
            containerStyle={defaultStyles.thumbnail}
            source={{
              uri: getAssetImageUrl(selectedNft.metadata?.image),
            }}
            testID="nft-detail-thumbnail"
          />

          {defaultTokenMetadataItems.map((item, index) => (
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

          <Text.S
            variant="secondary"
            testID="nft-detail-additional-attributes-label">
            {t('v2.nft-detail.attributes')}
          </Text.S>
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
      <SheetFooter
        showDivider={false}
        primaryButton={{
          label: sendMenuLabel,
          onPress: onSendPress,
          testID: 'nft-detail-send-button',
        }}
      />
    </>
  );
};

const styles = (theme: Theme, footerHeight: number) =>
  StyleSheet.create({
    sheetContent: { paddingBottom: footerHeight },
    content: {
      gap: spacing.L,
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
