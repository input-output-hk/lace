import React, { ReactElement } from 'react';
import { WalletSetupMnemonicErrorStep } from '@lace/core';
import { useCreateWallet } from '../context';

export const RecoveryPhraseError = (): ReactElement => {
  const { next, back } = useCreateWallet();

  return <WalletSetupMnemonicErrorStep onNext={next} onBack={back} />;
};
