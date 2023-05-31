import React, { useMemo } from 'react';
import { Button } from '@lace/common';
import styles from './Collateral.module.scss';
import { CollateralStep } from '.';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { useTranslation } from 'react-i18next';
import { useWalletStore } from '@src/stores';

interface CollateralFooterProps {
  setCurrentStep: (step: CollateralStep) => void;
  isInitializing: boolean;
  isSubmitting: boolean;
  submitCollateralTx: () => Promise<void>;
  hasCollateral: boolean;
  hasEnoughAda: boolean;
  onClose: () => void;
  onClaim: () => void;
  isInMemory: boolean;
  setIsPasswordValid: (isPasswordValid: boolean) => void;
  popupView: boolean;
  isButtonDisabled: boolean;
}

export const CollateralFooter = ({
  setCurrentStep,
  isInitializing,
  isSubmitting,
  submitCollateralTx,
  hasCollateral,
  hasEnoughAda,
  onClose,
  onClaim,
  isInMemory,
  setIsPasswordValid,
  popupView,
  isButtonDisabled = false
}: CollateralFooterProps): JSX.Element => {
  const { t } = useTranslation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const { inMemoryWallet } = useWalletStore();

  const handleClick = async () => {
    onClaim();
    if (hasCollateral) {
      await inMemoryWallet.utxo.setUnspendable([]);
      setCurrentStep('send');
      onClose();
    } else {
      if (!hasEnoughAda) {
        return onClose();
      }
      try {
        if (popupView && !isInMemory)
          return await backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.COLLATERAL_SETTINGS });
        await submitCollateralTx();
        onClose();
      } catch (error) {
        setIsPasswordValid(false);
        console.error(error);
      }
    }
    return true;
  };

  const buttonLabel = useMemo(() => {
    if (hasCollateral) return t('browserView.settings.wallet.collateral.reclaimCollateral');
    if (hasEnoughAda) {
      if (isInMemory) {
        return t('browserView.settings.wallet.collateral.confirm');
      }
      if (popupView) {
        return t('browserView.settings.wallet.collateral.continueInAdvancedView');
      }
      return t('browserView.settings.wallet.collateral.confirmWithLedger');
    }
    return t('browserView.settings.wallet.collateral.close');
  }, [hasCollateral, hasEnoughAda, isInMemory, popupView, t]);

  return (
    <Button
      data-testid="collateral-confirmation-btn"
      disabled={isInitializing || isButtonDisabled}
      loading={isSubmitting || isInitializing}
      className={styles.confirmBtn}
      size="large"
      onClick={handleClick}
    >
      {buttonLabel}
    </Button>
  );
};
