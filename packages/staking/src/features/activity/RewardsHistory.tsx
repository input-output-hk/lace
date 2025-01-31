import { Box, Text } from '@input-output-hk/lace-ui-toolkit';
import { AssetActivityListProps, GroupedAssetActivityList, useGroupedActivitiesPageSize } from '@lace/core';
import { Skeleton } from 'antd';
import { StateStatus } from 'features/outside-handles-provider';
import take from 'lodash/take';
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

const LACE_APP_ID = 'lace-app';

type RewardsHistoryProps = {
  groupedRewardsActivities: AssetActivityListProps[];
  walletActivitiesStatus: StateStatus;
};

export const RewardsHistory = ({ groupedRewardsActivities, walletActivitiesStatus }: RewardsHistoryProps) => {
  const { t } = useTranslation();

  const pageSize = useGroupedActivitiesPageSize();
  const [paginatedLists, setPaginatedLists] = useState<AssetActivityListProps[]>([]);

  const loadMoreData = useCallback(() => {
    if (groupedRewardsActivities.length === 0) return;
    setPaginatedLists((prevList) => take(groupedRewardsActivities, prevList.length + pageSize));
  }, [groupedRewardsActivities, pageSize]);

  return (
    <>
      <Box mt="$48" mb="$16">
        <Text.SubHeading>{t('activity.rewardsHistory.title')}</Text.SubHeading>
      </Box>
      <Skeleton loading={walletActivitiesStatus !== StateStatus.LOADED}>
        <GroupedAssetActivityList
          hasMore={paginatedLists.length < groupedRewardsActivities.length}
          loadMore={loadMoreData}
          lists={paginatedLists}
          scrollableTarget={LACE_APP_ID}
          loadFirstChunk
        />
      </Skeleton>
    </>
  );
};
