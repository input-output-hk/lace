import cn from 'classnames';
import { useHistory } from 'react-router-dom';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Banner } from '@lace/common';
import { walletRoutePaths } from '@routes';
import styles from './LockedStakeRewardsBanner.module.scss';
import { Box, Button, Flex, Text } from '@input-output-hk/lace-ui-toolkit';
import { useDrawer } from '@src/views/browser-view/stores';
import ExclamationCircleOutline from '@src/assets/icons/red-exclamation-circle.component.svg';

export type LockedStakeRewardsBannerProps = {
  isPopupView?: boolean;
};

export const LockedStakeRewardsBanner = ({ isPopupView }: LockedStakeRewardsBannerProps): React.ReactElement => {
  const { t } = useTranslation();
  const history = useHistory();
  const [, setIsDrawerVisible] = useDrawer();

  const onGoToStaking = () => {
    const path = isPopupView ? walletRoutePaths.earn : walletRoutePaths.staking;
    setIsDrawerVisible();
    history.push(path);
  };

  return isPopupView ? (
    <Flex className={styles.bannerPopup} flexDirection="column" py="$16" px="$24" gap="$24">
      <Text.Button>{t('general.errors.lockedStakeRewards.description')}</Text.Button>
      <Button.CallToAction
        w="$fill"
        onClick={onGoToStaking}
        data-testid="stats-register-as-drep-cta"
        label={t('general.errors.lockedStakeRewards.cta')}
      />
    </Flex>
  ) : (
    <Banner
      customIcon={<ExclamationCircleOutline />}
      popupView={isPopupView}
      className={cn(styles.banner, { [styles.popupView]: isPopupView })}
      message={<Box className={styles.bannerDescription}>{t('general.errors.lockedStakeRewards.description')}</Box>}
      buttonMessage={t('general.errors.lockedStakeRewards.cta')}
      onButtonClick={onGoToStaking}
      withIcon
    />
  );
};
