import { Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { EpochsSwitch } from '../EpochsSwitch';
import { useRewardsByEpoch } from './hooks/useRewardsByEpoch';
import { RewardsChart } from './RewardsChart';

const DEFAULT_LAST_EPOCHS = 5;

export const PastEpochsRewards = () => {
  const [epochsCount, setEpochsCount] = useState(DEFAULT_LAST_EPOCHS);
  const { t } = useTranslation();
  const { rewardsByEpoch } = useRewardsByEpoch({ epochsCount });
  return (
    <>
      <Flex mb="$32" justifyContent="space-between" alignItems="center">
        <Text.SubHeading>{t('activity.rewardsChart.title')}</Text.SubHeading>
        <EpochsSwitch epochsCount={epochsCount} setEpochsCount={setEpochsCount} />
      </Flex>
      {rewardsByEpoch && <RewardsChart chartData={rewardsByEpoch} />}
    </>
  );
};
