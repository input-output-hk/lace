import React, { ReactElement, useState } from 'react';
import { WalletSetupSelectBlockchain } from '@lace/core';
import { useRestoreWallet } from '../context';
import { BitcoinImportMessageDialog } from '../../../wallet-setup/components/BitcoinImportMessageDialog';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';
import { logger } from '@lace/common';
import { useWalletOnboarding } from '../../walletOnboardingContext';
import { useAnalyticsContext } from '@providers/AnalyticsProvider';

export const SelectBlockchain = (): ReactElement => {
  const posthog = usePostHogClientContext();
  const { back, next, selectedBlockchain, setSelectedBlockchain } = useRestoreWallet();
  const [isBitcoinDialogOpen, setIsBitcoinDialogOpen] = useState(false);
  const bitcoinWalletsEnabled = posthog?.isFeatureFlagEnabled('bitcoin-wallets');
  const analytics = useAnalyticsContext();
  const { postHogActions } = useWalletOnboarding();

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

  return (
    <>
      <WalletSetupSelectBlockchain
        back={back}
        next={handleNext}
        selectedBlockchain={selectedBlockchain}
        setSelectedBlockchain={setSelectedBlockchain}
        showBitcoinOption={bitcoinWalletsEnabled}
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
