import { Banner } from '@lace/common';
import { VFC } from 'react';
import { useTranslation } from 'react-i18next';
import BellIcon from '../../../assets/icons/bell-icon.svg';
import { useOutsideHandles } from '../../outside-handles-provider';
import { useDelegationPortfolioStore } from '../../store';
import * as styles from './PortfolioDriftBanner.css';

type PortfolioDriftBannerProps = {
  popupView?: boolean;
};

export const PortfolioDriftBanner: VFC<PortfolioDriftBannerProps> = ({ popupView }) => {
  const { t } = useTranslation();
  const { expandStakingView = () => void 0 } = useOutsideHandles();
  const portfolioMutators = useDelegationPortfolioStore((store) => store.mutators);

  const onBannerClick = () => {
    if (popupView) {
      expandStakingView('onLoadAction=ManagePortfolio');
      return;
    }

    portfolioMutators.executeCommand({
      type: 'ManagePortfolio',
    });
  };

  return (
    <Banner
      popupView={popupView}
      withIcon
      customIcon={<BellIcon className={styles.bannerBellIcon} />}
      message={t('overview.banners.portfolioDrifted.title')}
      description={t('overview.banners.portfolioDrifted.message')}
      onBannerClick={onBannerClick}
    />
  );
};
