import React, { ReactElement, useState } from 'react';
import { WalletSetupSelectBlockchain } from '@lace/core';
import { useRestoreWallet } from '../context';
import { BitcoinImportMessageDialog } from '../../../wallet-setup/components/BitcoinImportMessageDialog';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { logger } from '@lace/common';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';
import { useLMP } from '@hooks';
import { useTranslation } from 'react-i18next';

export const SelectBlockchain = (): ReactElement => {
  const { t } = useTranslation();
  const posthog = usePostHogClientContext();
  const { back, next, selectedBlockchain, setSelectedBlockchain } = useRestoreWallet();
  const [isBitcoinDialogOpen, setIsBitcoinDialogOpen] = useState(false);
  const bitcoinWalletsEnabled = posthog?.isFeatureFlagEnabled('bitcoin-wallets');
  const midnightWalletsEnabled = posthog?.isFeatureFlagEnabled('midnight-wallets');
  const analytics = useAnalyticsContext();
  const { postHogActions } = useWalletOnboarding();
  const { midnightWallets, startMidnightRestore } = useLMP();

  const hasMidnightWallet = midnightWallets && midnightWallets.length > 0;

  // eslint-disable-next-line consistent-return
  const handleNext = () => {
    const doNext = async () => {
      await next();
      await analytics.sendEventToPostHog(postHogActions.restore.CHOSE_BLOCKCHAIN_CLICK, {
        blockchain: selectedBlockchain
      });
    };

    if (selectedBlockchain === 'Bitcoin') {
      if (isBitcoinDialogOpen) setIsBitcoinDialogOpen(false);
      else return setIsBitcoinDialogOpen(true);
    }

    doNext().catch((error) => logger.error('Error in next selecting blockchain', error));
  };

  const handleMidnightSelect = () => {
    startMidnightRestore();
  };

  return (
    <>
      <WalletSetupSelectBlockchain
        back={back}
        next={handleNext}
        selectedBlockchain={selectedBlockchain}
        setSelectedBlockchain={setSelectedBlockchain}
        showBitcoinOption={bitcoinWalletsEnabled}
        showMidnightOption={midnightWalletsEnabled}
        midnightDisabled={hasMidnightWallet}
        midnightDisabledReason={t('core.WalletSetupSelectBlockchain.midnight.disabledReason')}
        onMidnightSelect={handleMidnightSelect}
      />
      <BitcoinImportMessageDialog
        onConfirm={handleNext}
        onCancel={() => setIsBitcoinDialogOpen(false)}
        open={isBitcoinDialogOpen}
        setOpen={setIsBitcoinDialogOpen}
      />
    </>
  );
};
