import BellIcon from '@assets/icons/bell-icon.component.svg';
import { Banner } from '@lace/common';
import InfoIcon from '@lace/core/src/ui/assets/icons/info-icon.component.svg';
import { useTranslation } from 'react-i18next';
import * as styles from './StakingNotificationBanner.css';
import { StakingNotificationType } from './types';

type StakingNotificationBannerProps = {
  popupView?: boolean;
  notification: StakingNotificationType;
  onPortfolioDriftedNotificationClick?: () => void;
};

export const StakingNotificationBanner = ({
  popupView,
  notification,
  onPortfolioDriftedNotificationClick,
}: StakingNotificationBannerProps) => {
  const { t } = useTranslation();

  switch (notification) {
    case 'pendingFirstDelegation':
      return (
        <Banner
          popupView={popupView}
          withIcon
          customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
          message={t('overview.banners.pendingFirstDelegation.title')}
          description={t('overview.banners.pendingFirstDelegation.message')}
        />
      );
    case 'pendingPoolMigration':
      return (
        <Banner
          popupView={popupView}
          withIcon
          customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
          message={t('overview.banners.pendingPoolMigration.title')}
          description={t('overview.banners.pendingPoolMigration.message')}
        />
      );
    case 'portfolioDrifted':
      return (
        <Banner
          popupView={popupView}
          withIcon
          customIcon={<BellIcon className={styles.bannerInfoIcon} />}
          message={t('overview.banners.portfolioDrifted.title')}
          description={t('overview.banners.portfolioDrifted.message')}
          onBannerClick={onPortfolioDriftedNotificationClick}
        />
      );
    default:
      return <></>;
  }
};
