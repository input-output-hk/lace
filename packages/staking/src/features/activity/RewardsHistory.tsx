import { GroupedAssetActivityList } from '@lace/core';
import { Box, Text } from '@lace/ui';
import { Skeleton } from 'antd';
import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { useTranslation } from 'react-i18next';

const LACE_APP_ID = 'lace-app';

export const RewardsHistory = () => {
  const { t } = useTranslation();
  const { walletStoreWalletActivitiesStatus: walletActivitiesStatus, walletStoreWalletActivities: walletActivities } =
    useOutsideHandles();
  const groupedRewardsActivities = walletActivities
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => item.type === 'rewards'),
    }))
    .filter((group) => group.items.length > 0);

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
