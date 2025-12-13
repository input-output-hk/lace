import React, { ReactElement, useCallback } from 'react';
import { WalletSetupReuseMnemonicStep } from '@lace/core';
import { useCreateWallet } from '../context';
import { WalletCreateStep } from '../types';

export const ReuseRecoveryPhrase = (): ReactElement => {
  const { back, next, setWalletToReuse, nonSelectedBlockchainWallets, setStep } = useCreateWallet();

  const handleBack = useCallback(() => {
    setStep(WalletCreateStep.ChooseRecoveryMethod);
  }, [setStep]);

  return (
    <WalletSetupReuseMnemonicStep
      wallets={nonSelectedBlockchainWallets}
      onSkip={back}
      onReuse={next}
      onBack={handleBack}
      setWalletToReuse={setWalletToReuse}
    />
  );
};
