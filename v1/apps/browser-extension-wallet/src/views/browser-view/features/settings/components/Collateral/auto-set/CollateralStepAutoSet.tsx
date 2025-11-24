import React from 'react';
import { useTranslation } from 'react-i18next';
import collateralStyles from '../Collateral.module.scss';
import styles from '../../SettingsLayout.module.scss';
import { Typography } from 'antd';
const { Text } = Typography;

interface CollateralStepAutoSetProps {
  popupView: boolean;
}

export const CollateralStepAutoSet = ({ popupView }: CollateralStepAutoSetProps): JSX.Element => {
  const { t } = useTranslation();

  return (
    <div className={popupView ? styles.popupContainer : undefined} style={{ height: '100%' }}>
      <div className={collateralStyles.collateralContainer}>
        <div className={collateralStyles.contentContainer}>
          <Text className={styles.drawerDescription} data-testid="collateral-autoset-description">
            {t('browserView.settings.wallet.collateral.autoSet.description')}
          </Text>
        </div>
      </div>
    </div>
  );
};
