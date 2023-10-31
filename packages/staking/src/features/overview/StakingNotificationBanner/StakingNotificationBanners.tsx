import { Banner } from '@lace/common';
import { Box } from '@lace/ui';
import ExclamationIcon from '@lace/ui/dist/assets/icons/warning-icon-triangle.component.svg';
import { useTranslation } from 'react-i18next';
import BellIcon from '../../../assets/icons/bell-icon.svg';
import InfoIcon from '../../../assets/icons/info-icon.svg';
import * as styles from './StakingNotificationBanners.css';
import { StakingNotificationType } from './types';

type StakingNotificationBannersProps = {
  popupView?: boolean;
  notifications: StakingNotificationType[];
  onClickableBannerClick?: () => void;
};

export const StakingNotificationBanners = ({
  popupView,
  notifications,
  onClickableBannerClick,
}: StakingNotificationBannersProps) => {
  const { t } = useTranslation();

  const notificationComponents = {
    pendingFirstDelegation: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
        message={t('overview.banners.pendingFirstDelegation.title')}
        description={t('overview.banners.pendingFirstDelegation.message')}
      />
    ),
    pendingPoolMigration: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
        message={t('overview.banners.pendingPoolMigration.title')}
        description={t('overview.banners.pendingPoolMigration.message')}
      />
    ),
    poolRetiredOrSaturated: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<ExclamationIcon />}
        message={t('overview.banners.saturatedOrRetiredPool.title')}
        description={t('overview.banners.saturatedOrRetiredPool.message')}
        onBannerClick={onClickableBannerClick}
      />
    ),
    portfolioDrifted: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<BellIcon className={styles.bannerInfoIcon} />}
        message={t('overview.banners.portfolioDrifted.title')}
        description={t('overview.banners.portfolioDrifted.message')}
        onBannerClick={onClickableBannerClick}
      />
    ),
  };

  return (
    <>
      {notifications.map((notification, index) => (
        <Box key={index} className={styles.bannerContainer}>
          {notificationComponents[notification]}
        </Box>
      ))}
    </>
  );
};
