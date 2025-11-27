import React, { ReactElement, useState } from 'react';
import { WalletSetupSelectBlockchain } from '@lace/core';
import { useRestoreWallet } from '../context';
import { BitcoinImportMessageDialog } from '../../../wallet-setup/components/BitcoinImportMessageDialog';
import { usePostHogClientContext } from '@providers/PostHogClientProvider';

export const SelectBlockchain = (): ReactElement => {
  const posthog = usePostHogClientContext();
  const { back, next, selectedBlockchain, setSelectedBlockchain } = useRestoreWallet();
  const [isBitcoinDialogOpen, setIsBitcoinDialogOpen] = useState(false);
  const bitcoinWalletsEnabled = posthog?.isFeatureFlagEnabled('bitcoin-wallets');

  return (
    <>
      <WalletSetupSelectBlockchain
        back={back}
        next={selectedBlockchain === 'Bitcoin' ? () => setIsBitcoinDialogOpen(true) : next}
        selectedBlockchain={selectedBlockchain}
        setSelectedBlockchain={setSelectedBlockchain}
        showBitcoinOption={bitcoinWalletsEnabled}
      />
      <BitcoinImportMessageDialog
        onConfirm={() => {
          setIsBitcoinDialogOpen(false);
          void next();
        }}
        onCancel={() => setIsBitcoinDialogOpen(false)}
        open={isBitcoinDialogOpen}
        setOpen={setIsBitcoinDialogOpen}
      />
    </>
  );
};
