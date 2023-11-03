import SadFaceIcon from '@lace/core/src/ui/assets/icons/sad-face.component.svg';
import { Flex } from '@lace/ui';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import * as styles from './NoStakingActivity.css';

export const NoStakingActivity = () => {
  const { t } = useTranslation();
  return (
    <Flex flexDirection="column" alignItems="center" gap="$8">
      <SadFaceIcon className={styles.sadFaceIcon} />
      <Typography.Text className={styles.noActivityText}>
        {t('activity.rewardsHistory.noStakingActivityYet')}
      </Typography.Text>
    </Flex>
  );
};
