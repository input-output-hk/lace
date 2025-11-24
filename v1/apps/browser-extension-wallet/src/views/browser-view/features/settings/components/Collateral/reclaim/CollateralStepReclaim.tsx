import { Banner } from '@lace/common';
import { Typography } from 'antd';
import React from 'react';
import { useTranslation } from 'react-i18next';
import styles from '../../SettingsLayout.module.scss';
import collateralStyles from '../Collateral.module.scss';

const { Text } = Typography;

interface CollateralStepReclaimProps {
  popupView: boolean;
}

export const CollateralStepReclaim = ({ popupView }: CollateralStepReclaimProps): JSX.Element => {
  const { t } = useTranslation();
  return (
    <div className={popupView ? styles.popupContainer : undefined} style={{ height: '100%' }}>
      <div className={collateralStyles.collateralContainer}>
        <div className={collateralStyles.contentContainer}>
          <Text className={styles.drawerDescription} data-testid="collateral-description">
            {t('browserView.settings.wallet.collateral.reclaimDescription')}
          </Text>
          <div className={styles.bannerContainer}>
            <Banner withIcon message={t('browserView.settings.wallet.collateral.reclaimBanner')} />
          </div>
        </div>
      </div>
    </div>
  );
};
