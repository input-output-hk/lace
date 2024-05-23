/*
 * THIS IS A FAKE STORY
 * */

import React, { VFC } from 'react';
import { SharedWalletCreationStore, StateCoSigners } from './SharedWalletCreationStore';
import { SharedWalletCreationUI } from './SharedWalletCreationUI';
import { SharedWalletCreationStep } from '@views/browser/features/shared-wallet/create-flow/types';

const cosignersState: StateCoSigners = {
  activeWalletName: 'My wallet',
  step: SharedWalletCreationStep.CoSigners,
  coSignersKeys: ['key 1', 'key 2'],
  walletName: 'My shared wallet'
};

export const SharedWalletCreationFlow: VFC = () => (
  <SharedWalletCreationStore initialState={cosignersState}>
    <SharedWalletCreationUI />
  </SharedWalletCreationStore>
);
