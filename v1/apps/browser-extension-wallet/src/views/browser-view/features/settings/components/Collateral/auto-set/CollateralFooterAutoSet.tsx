import React from 'react';
import { Button } from '@lace/common';
import { useTranslation } from 'react-i18next';
import styles from '../../SettingsLayout.module.scss';

type AutoSetFooterProps = {
  handleAutoSetCollateral: () => void;
};

export const CollateralFooterAutoSet = ({ handleAutoSetCollateral }: AutoSetFooterProps): React.ReactElement => {
  const { t } = useTranslation();
  return (
    <Button
      data-testid="collateral-confirmation-btn"
      block
      className={styles.confirmBtn}
      size="large"
      onClick={handleAutoSetCollateral}
    >
      {t('browserView.settings.wallet.collateral.confirm')}
    </Button>
  );
};
