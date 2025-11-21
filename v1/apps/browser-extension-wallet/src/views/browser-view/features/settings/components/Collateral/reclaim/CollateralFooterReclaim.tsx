import React from 'react';
import { Button, toast } from '@lace/common';
import styles from '../Collateral.module.scss';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';
import { Sections } from '../types';
import { SectionConfig } from '@src/views/browser-view/stores';

interface CollateralFooterProps {
  setCurrentStep: (section?: SectionConfig<Sections>) => void;
  onClose: () => void;
  onClaim: () => void;
  isInitializing: boolean;
  isSubmitting: boolean;
}

export const CollateralFooterReclaim = ({
  setCurrentStep,
  onClose,
  onClaim,
  isSubmitting,
  isInitializing
}: CollateralFooterProps): JSX.Element => {
  const { t } = useTranslation();
  const { inMemoryWallet } = useWalletStore();

  const handleClick = async () => {
    onClaim();
    await inMemoryWallet.utxo.setUnspendable([]);
    toast.notify({ text: t('browserView.settings.wallet.collateral.toast.claim') });
    // redirect to send flow
    setCurrentStep({ currentSection: Sections.SEND });
    onClose();
    return true;
  };

  return (
    <Button
      data-testid="collateral-confirmation-btn"
      disabled={isInitializing}
      loading={isSubmitting || isInitializing}
      className={styles.confirmBtn}
      size="large"
      onClick={handleClick}
    >
      {t('browserView.settings.wallet.collateral.reclaimCollateral')}
    </Button>
  );
};
