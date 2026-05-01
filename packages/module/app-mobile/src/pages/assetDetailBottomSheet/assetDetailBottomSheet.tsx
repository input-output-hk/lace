import { NftDetailBottomSheet as NftDetailBottomSheetTemplate } from '@lace-lib/ui-toolkit';
import { TokenDetailBottomSheet as TokenDetailBottomSheetTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { ActivitiesList } from '../portfolio/activities';

import { useAssetDetailBottomSheet } from './useAssetDetailBottomSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

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

  if (selectedToken?.metadata?.isNft) {
    return (
      <NftDetailBottomSheetTemplate
        tokenInfo={tokenInfo}
        headerTitle={nftHeaderTitle}
        theme={nftTheme}
        selectedNft={formattedSelectedNft}
        metadataItems={nftMetadataItems}
        onSendPress={nftOnSendPress}
        sendMenuLabel={nftSendMenuLabel}
      />
    );
  }

  const RecentTransactionsContent =
    tokenDetailsUICustomisation?.RecentTransactionsContent;

  return (
    <TokenDetailBottomSheetTemplate
      {...tokenDetailProps}
      isTokenPricingEnabled={isTokenPricingEnabled}
      globalState={{
        ...tokenDetailProps.globalState,
        activityList: RecentTransactionsContent ? (
          <RecentTransactionsContent token={selectedToken}>
            <ActivitiesList
              {...tokenDetailProps.globalState.activityListProps}
            />
          </RecentTransactionsContent>
        ) : (
          <ActivitiesList {...tokenDetailProps.globalState.activityListProps} />
        ),
      }}
    />
  );
};
