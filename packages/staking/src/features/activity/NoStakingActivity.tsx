import { Flex } from '@input-output-hk/lace-ui-toolkit';
import SadFaceIcon from '@lace/core/src/ui/assets/icons/sad-face.component.svg';
import { Typography } from 'antd';
import { useTranslation } from 'react-i18next';
import * as styles from './NoStakingActivity.css';

export const NoStakingActivity = () => {
  const { t } = useTranslation();
  return (
    <Flex h="$fill" flexDirection="column" alignItems="center" justifyContent="center" gap="$8">
      <SadFaceIcon className={styles.sadFaceIcon} />
      <Typography.Text className={styles.noActivityText}>
        {t('activity.rewardsHistory.noStakingActivityYet')}
      </Typography.Text>
    </Flex>
  );
};
