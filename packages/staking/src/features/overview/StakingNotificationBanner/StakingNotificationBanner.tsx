import { Banner } from '@lace/common';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../assets/icons/info-icon.svg';
import { PortfolioDriftBanner } from '../../portfolio-drift';
import * as styles from './StakingNotificationBanner.css';
import { StakingNotificationType } from './types';

type StakingNotificationBannerProps = {
  popupView?: boolean;
  notification: StakingNotificationType;
};

export const StakingNotificationBanner = ({ popupView, notification }: StakingNotificationBannerProps) => {
  const { t } = useTranslation();

  if (notification === 'pendingFirstDelegation' || notification === 'pendingPoolMigration') {
    const messageKey =
      notification === 'pendingFirstDelegation'
        ? 'overview.banners.pendingFirstDelegation.title'
        : 'overview.banners.pendingPoolMigration.title';
    const descriptionKey =
      notification === 'pendingFirstDelegation'
        ? 'overview.banners.pendingFirstDelegation.message'
        : 'overview.banners.pendingPoolMigration.message';
    return (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
        message={t(messageKey)}
        description={t(descriptionKey)}
      />
    );
  }

  if (notification === 'portfolioDrifted') {
    return <PortfolioDriftBanner popupView={popupView} />;
  }

  return <></>;
};
