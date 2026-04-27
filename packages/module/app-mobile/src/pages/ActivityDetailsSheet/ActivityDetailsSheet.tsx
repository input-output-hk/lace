import { useUICustomisation } from '@lace-contract/app';
import { ActivityDetailSheetTemplate } from '@lace-lib/ui-toolkit';
import React, { useCallback } from 'react';

import { useActivityDetailsSheet } from './useActivityDetailsSheet';

import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';

export const ActivityDetailsSheet = (
  props: SheetScreenProps<SheetRoutes.ActivityDetail>,
) => {
  const { navigation } = props;
  const goBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);
  const onBackPress = navigation.canGoBack() ? goBack : undefined;
  const {
    headerTitle,
    loadingText,
    activityDetails,
    explorerUrl,
    isLoading,
    theme,
    address,
    accountId,
    getMainTokenBalanceChange,
    tokensMetadataByTokenId,
  } = useActivityDetailsSheet(props);

  const [activityDetailsSheetUICustomisation] = useUICustomisation(
    'addons.loadActivityDetailsSheetUICustomisations',
    { blockchainName: address?.blockchainName },
  );

  const ActivityDetailsContent =
    activityDetailsSheetUICustomisation?.ActivityDetailsContent;

  const content =
    ActivityDetailsContent && activityDetails ? (
      <ActivityDetailsContent
        activityDetail={activityDetails}
        activityId={activityDetails.activityId}
        explorerUrl={explorerUrl}
        address={address}
        accountId={accountId}
        getMainTokenBalanceChange={getMainTokenBalanceChange}
        tokensMetadataByTokenId={tokensMetadataByTokenId}
      />
    ) : null;

  return (
    <ActivityDetailSheetTemplate
      headerProps={{
        headerTitle,
        loadingText,
        isLoading,
        theme,
        onBackPress,
      }}
      contentProps={{
        hasRewardData: false,
        hasCardanoData: !!content,
        activityDetails: content ?? null,
      }}
    />
  );
};
