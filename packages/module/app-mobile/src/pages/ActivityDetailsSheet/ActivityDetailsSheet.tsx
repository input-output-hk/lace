import { ActivityType } from '@lace-contract/activities';
import { useUICustomisation } from '@lace-contract/app';
import { ActivityDetailSheetTemplate, Sheet } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';

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
    activityType,
    explorerUrl,
    isLoading,
    theme,
    address,
    accountId,
    getMainTokenBalanceChange,
    tokensMetadataByTokenId,
  } = useActivityDetailsSheet(props);

  const hasRewardData = activityType === ActivityType.Rewards;

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

  useEffect(() => {
    props.navigation.setOptions({
      detents: hasRewardData ? ['auto'] : [1],
      scrollable: !hasRewardData,
      header: (
        <Sheet.Header
          title={headerTitle}
          leftIconOnPress={onBackPress}
          testID="activity-details-sheet-header"
        />
      ),
    });
  }, [props.navigation, headerTitle, onBackPress, hasRewardData]);

  return (
    <ActivityDetailSheetTemplate
      headerProps={{
        loadingText,
        isLoading,
        theme,
      }}
      contentProps={{
        hasRewardData: false,
        hasCardanoData: !!content,
        activityDetails: content ?? null,
      }}
    />
  );
};
