import React, { useMemo } from 'react';
import { Button, toast } from '@lace/common';
import styles from '../Collateral.module.scss';
import { useTranslation } from 'react-i18next';
import { useBackgroundServiceAPIContext } from '@providers';
import { BrowserViewSections } from '@lib/scripts/types';
import { Sections } from '../types';
import { SectionConfig } from '@src/views/browser-view/stores';
import { withSignTxConfirmation } from '@lib/wallet-api-ui';
import { WalletType } from '@cardano-sdk/web-extension';
import { useSecrets } from '@src/../../../packages/core/dist/ui/hooks';

interface CollateralFooterProps {
  onClose: () => void;
  onClaim: () => void;
  walletType: string;
  setIsPasswordValid: (isPasswordValid: boolean) => void;
  popupView: boolean;
  secretsUtil: ReturnType<typeof useSecrets>;
  submitCollateralTx: () => Promise<void>;
  hasEnoughAda: boolean;
  isInitializing: boolean;
  isSubmitting: boolean;
  setCurrentStep: (section?: SectionConfig<Sections>) => void;
}

export const CollateralFooterSend = ({
  onClose,
  onClaim,
  walletType,
  setIsPasswordValid,
  popupView,
  secretsUtil,
  submitCollateralTx,
  hasEnoughAda,
  isInitializing,
  isSubmitting,
  setCurrentStep
}: CollateralFooterProps): JSX.Element => {
  const { t } = useTranslation();
  const backgroundServices = useBackgroundServiceAPIContext();
  const isInMemory = walletType === WalletType.InMemory;

  const submitTx = async () => withSignTxConfirmation(submitCollateralTx, secretsUtil.password.value);

  const handleClick = async () => {
    onClaim();

    if (!hasEnoughAda) {
      return onClose();
    }
    try {
      if (popupView && !isInMemory)
        return await backgroundServices?.handleOpenBrowser({ section: BrowserViewSections.COLLATERAL_SETTINGS });
      await submitTx();
      toast.notify({ text: t('browserView.settings.wallet.collateral.toast.add') });
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
      return t('browserView.settings.wallet.collateral.confirmWithDevice', { hardwareWallet: walletType });
    }
    return t('browserView.settings.wallet.collateral.close');
  }, [hasEnoughAda, isInMemory, walletType, popupView, t]);

  // password is not required for hw flow
  const isPasswordMissing = isInMemory && !secretsUtil.password.value;
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
