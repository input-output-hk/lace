import { Banner } from '@lace/common';
import { Box } from '@lace/ui';
import { useTranslation } from 'react-i18next';
import InfoIcon from '../../../assets/icons/info-icon.svg';
import WarningTriangleIcon from '../../../assets/icons/warning-triangle.svg';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import { PortfolioDriftBanner } from './PortfolioDriftBanner';
import * as styles from './StakingNotificationBanners.css';
import { StakingNotificationType } from './types';

type StakingNotificationBannersProps = {
  popupView?: boolean;
  notifications: StakingNotificationType[];
};

export const StakingNotificationBanners = ({ popupView, notifications }: StakingNotificationBannersProps) => {
  const { t } = useTranslation();
  const { expandStakingView = () => void 0 } = useOutsideHandles();
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  const onPoolRetiredOrSaturatedBannerClick = () => {
    if (popupView) {
      expandStakingView('onLoadAction=ManagePortfolio');
      return;
    }

    portfolioMutators.executeCommand({
      type: 'ManagePortfolio',
    });
  };

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
    pendingPortfolioModification: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<InfoIcon className={styles.bannerInfoIcon} />}
        message={t('overview.banners.pendingPortfolioModification.title')}
        description={t('overview.banners.pendingPortfolioModification.message')}
      />
    ),
    poolRetiredOrSaturated: (
      <Banner
        popupView={popupView}
        withIcon
        customIcon={<WarningTriangleIcon />}
        message={t('overview.banners.saturatedOrRetiredPool.title')}
        description={t('overview.banners.saturatedOrRetiredPool.message')}
        onBannerClick={onPoolRetiredOrSaturatedBannerClick}
      />
    ),
    portfolioDrifted: <PortfolioDriftBanner popupView={popupView} />,
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
