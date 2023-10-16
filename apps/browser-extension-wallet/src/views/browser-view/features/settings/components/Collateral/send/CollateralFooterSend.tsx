import React, { useMemo } from 'react';
import { Button } from '@lace/common';
import { Wallet } from '@lace/cardano';
import styles from '../Collateral.module.scss';
import { useTranslation } from 'react-i18next';
import { useWalletManager } from '@hooks';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { Sections } from '../types';
import { SectionConfig } from '@src/views/browser-view/stores';

interface CollateralFooterProps {
  onClose: () => void;
  onClaim: () => void;
  keyAgentType: string;
  setIsPasswordValid: (isPasswordValid: boolean) => void;
  popupView: boolean;
  password: string;
  submitCollateralTx: () => Promise<void>;
  hasEnoughAda: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  setCurrentStep: (section?: SectionConfig<Sections>) => void;
}

export const CollateralFooterSend = ({
  onClose,
  onClaim,
  keyAgentType,
  setIsPasswordValid,
  popupView,
  password,
  submitCollateralTx,
  hasEnoughAda,
  isInitializing,
  isSubmitting,
  setCurrentStep
}: CollateralFooterProps): JSX.Element => {
  const { t } = useTranslation();
  const { executeWithPassword } = useWalletManager();
  const backgroundServices = useBackgroundServiceAPIContext();
  const isInMemory = useMemo(() => keyAgentType === Wallet.KeyManagement.KeyAgentType.InMemory, [keyAgentType]);

  const submitTx = async () => {
    await (isInMemory ? executeWithPassword(password, submitCollateralTx) : submitCollateralTx());
  };

  const handleClick = async () => {
    onClaim();

    if (!hasEnoughAda) {
      return onClose();
    }
    try {
      if (popupView && !isInMemory)
        return await backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.COLLATERAL_SETTINGS });
      await submitTx();
      if (isInMemory) onClose();
    } catch {
      if (!isInMemory) {
        setCurrentStep({ currentSection: Sections.FAIL_TX });
      } else {
        setIsPasswordValid(false);
      }
    }

    return true;
  };

  const buttonLabel = useMemo(() => {
    if (hasEnoughAda) {
      if (isInMemory) {
        return t('browserView.settings.wallet.collateral.confirm');
      }
      if (popupView) {
        return t('browserView.settings.wallet.collateral.continueInAdvancedView');
      }
      return t('browserView.settings.wallet.collateral.confirmWithDevice', { hardwareWallet: keyAgentType });
    }
    return t('browserView.settings.wallet.collateral.close');
  }, [hasEnoughAda, isInMemory, keyAgentType, popupView, t]);

  // password is not required for hw flow
  const isPasswordMissing = isInMemory && !password;
  const isButtonDisabled = hasEnoughAda && isPasswordMissing;

  return (
    <Button
      data-testid="collateral-confirmation-btn"
      disabled={isSubmitting || isInitializing || isButtonDisabled}
      loading={isSubmitting || isInitializing}
      className={styles.confirmBtn}
      size="large"
      onClick={handleClick}
    >
      {buttonLabel}
    </Button>
  );
};
