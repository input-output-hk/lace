import { StateStatus, useOutsideHandles } from 'features/outside-handles-provider';
import { getGroupedRewardsActivities } from './helpers/getGroupedRewardsHistory';
import { NoStakingActivity } from './NoStakingActivity';
import { PastEpochsRewards } from './PastEpochsRewards';
import { RewardsHistory } from './RewardsHistory';

export const Activity = () => {
  const { walletStoreWalletActivitiesStatus: walletActivitiesStatus, walletStoreWalletActivities: walletActivities } =
    useOutsideHandles();
  const groupedRewardsActivities = getGroupedRewardsActivities(walletActivities);

  return (
    <>
      {walletActivitiesStatus === StateStatus.LOADED && groupedRewardsActivities.length === 0 ? (
        <NoStakingActivity />
      ) : (
        <>
          <PastEpochsRewards />
          <RewardsHistory
            walletActivitiesStatus={walletActivitiesStatus}
            groupedRewardsActivities={groupedRewardsActivities}
          />
        </>
      )}
    </>
  );
};
