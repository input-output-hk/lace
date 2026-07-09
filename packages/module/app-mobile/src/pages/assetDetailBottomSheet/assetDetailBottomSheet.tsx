import {
  isWeb,
  NftDetailBottomSheet as NftDetailBottomSheetTemplate,
  Sheet,
  TokenDetailBottomSheet as TokenDetailBottomSheetTemplate,
} from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAssetDetailBottomSheet } from './useAssetDetailBottomSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

// Matches the browse-pool sheet pattern: FlashList inside a bottom sheet
// needs an explicitly-sized parent on native (sheet dynamic sizing doesn't
// propagate a pixel height to a virtualized child).
const SHEET_HEIGHT_RATIO = 0.9;

const EMPTY_SECTIONS: never[] = [];

export const AssetDetailBottomSheet = ({
  navigation,
  route,
}: SheetScreenProps<SheetRoutes.AssetDetailBottomSheet>) => {
  const {
    selectedToken,
    tokenDetailProps,
    tokenDetailsUICustomisation,
    tokenInfo,
    nftHeaderTitle,
    nftTheme,
    formattedSelectedNft,
    nftMetadataItems,
    nftOnSendPress,
    nftSendMenuLabel,
    isTokenPricingEnabled,
  } = useAssetDetailBottomSheet({
    navigation,
    route,
  });

  const isNft = !!selectedToken?.metadata?.isNft;

  const {
    labels: tokenLabels,
    actions: tokenActions,
    utils: tokenUtils,
  } = tokenDetailProps;
  const {
    headerTitle: tokenHeaderTitle,
    coinName,
    sendMenuLabel,
    buyButtonLabel,
  } = tokenLabels;
  const { isPortfolioView } = tokenUtils;
  const { onBackToPortfolioPress, onSendPress, onBuyPress } = tokenActions;

  useEffect(() => {
    if (isNft) {
      navigation.setOptions({
        header: (
          <Sheet.Header
            title={nftHeaderTitle}
            testID="nft-detail-bottom-sheet"
          />
        ),
        footer: (
          <Sheet.Footer
            primaryButton={{
              label: nftSendMenuLabel,
              onPress: nftOnSendPress,
              testID: 'nft-detail-sheet-send-button',
            }}
          />
        ),
      });
    } else {
      const headerAvatar = {
        metadata: {
          image: selectedToken?.metadata?.image,
          fallback: coinName,
        },
      };
      navigation.setOptions({
        header: (
          <Sheet.Header
            title={tokenHeaderTitle}
            headerAvatar={headerAvatar}
            height={44}
            showDivider={false}
            testID="token-details-sheet-header"
            leftIconOnPress={
              !isPortfolioView && onBackToPortfolioPress
                ? onBackToPortfolioPress
                : undefined
            }
          />
        ),
        footer: !isPortfolioView ? (
          <Sheet.Footer
            secondaryButton={
              onBuyPress
                ? {
                    label: buyButtonLabel,
                    onPress: onBuyPress,
                    testID: 'token-details-sheet-buy-button',
                  }
                : undefined
            }
            primaryButton={{
              label: sendMenuLabel,
              onPress: onSendPress,
              testID: 'token-details-sheet-send-button',
            }}
          />
        ) : undefined,
      });
    }
  }, [
    navigation,
    isNft,
    nftHeaderTitle,
    nftSendMenuLabel,
    nftOnSendPress,
    tokenHeaderTitle,
    coinName,
    selectedToken?.metadata?.image,
    isPortfolioView,
    onBackToPortfolioPress,
    onSendPress,
    onBuyPress,
    sendMenuLabel,
    buyButtonLabel,
  ]);

  const { height: windowHeight } = useWindowDimensions();
  const sheetContainerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  if (isNft) {
    return (
      <NftDetailBottomSheetTemplate
        tokenInfo={tokenInfo}
        theme={nftTheme}
        selectedNft={formattedSelectedNft}
        metadataItems={nftMetadataItems}
      />
    );
  }

  const RecentTransactionsContent =
    tokenDetailsUICustomisation?.RecentTransactionsContent;
  const shouldHideActivityList =
    !!selectedToken &&
    !!tokenDetailsUICustomisation?.shouldHideActivitiesList?.(selectedToken);

  // For blockchains that suppress on-chain activity display (e.g. Midnight
  // shielded tokens), clear the list sections and disable pagination so the
  // FlashList renders only its ListHeaderComponent (static content + privacy
  // info header) with no rows, no load-more trigger, and no empty-state hint.
  const tokenDetailPropsWithActivitySuppression = shouldHideActivityList
    ? {
        ...tokenDetailProps,
        activityListSections: EMPTY_SECTIONS,
        onLoadMorePress: undefined,
        isLoadingOlderActivities: false,
        emptyActivitiesMessage: undefined,
      }
    : tokenDetailProps;

  const content = (
    <TokenDetailBottomSheetTemplate
      {...tokenDetailPropsWithActivitySuppression}
      isTokenPricingEnabled={isTokenPricingEnabled}
      scrollStateKey={route.key}
      activitiesHeader={
        RecentTransactionsContent ? (
          <RecentTransactionsContent token={selectedToken} />
        ) : undefined
      }
    />
  );

  // Web uses the default flex chain; native needs the explicit-height wrapper
  // for the FlashList inside `TokenDetailBottomSheet` to have a bounded parent.
  if (isWeb) {
    return content;
  }

  return <View style={sheetContainerStyle}>{content}</View>;
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
