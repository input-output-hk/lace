import React, { VFC } from 'react';
import { SharedWalletCreationStore } from './SharedWalletCreationStore';
import { SharedWalletCreationUI } from './SharedWalletCreationUI';

export const SharedWalletCreationFlow: VFC = () => (
  <SharedWalletCreationStore>
    <SharedWalletCreationUI />
  </SharedWalletCreationStore>
);
