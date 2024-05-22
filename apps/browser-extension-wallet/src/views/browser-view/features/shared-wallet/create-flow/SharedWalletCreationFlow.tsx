import React, { VFC } from 'react';
import { SharedWalletCreationStepSetup } from './SharedWalletCreationStepSetup';
import { SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationStep } from './types';

export const SharedWalletCreationFlow: VFC = () => (
  <SharedWalletCreationStore>
    {({ state: { step } }) => <>{step === SharedWalletCreationStep.Setup && <SharedWalletCreationStepSetup />}</>}
  </SharedWalletCreationStore>
);
