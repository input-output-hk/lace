import { AssetActivityListProps, GroupedAssetActivityList } from '@lace/core';
import { Box, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { StateStatus } from 'features/outside-handles-provider';
import { useTranslation } from 'react-i18next';

const LACE_APP_ID = 'lace-app';

type RewardsHistoryProps = {
  groupedRewardsActivities: AssetActivityListProps[];
  walletActivitiesStatus: StateStatus;
};
export const RewardsHistory = ({ groupedRewardsActivities, walletActivitiesStatus }: RewardsHistoryProps) => {
  const { t } = useTranslation();

  return (
    <>
      <Box mb="$16">
        <Text.SubHeading>{t('activity.rewardsHistory.title')}</Text.SubHeading>
      </Box>
      <Skeleton loading={walletActivitiesStatus !== StateStatus.LOADED}>
        <GroupedAssetActivityList
          lists={groupedRewardsActivities}
          infiniteScrollProps={{ scrollableTarget: LACE_APP_ID }}
        />
      </Skeleton>
    </>
  );
};
