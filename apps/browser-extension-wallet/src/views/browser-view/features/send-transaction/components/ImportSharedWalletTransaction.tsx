import { CoSignEntry } from '@lace/core';
import React from 'react';
import { useDrawer } from '@views/browser/stores';

export const ImportSharedWalletTransaction = (): JSX.Element => {
  const [config] = useDrawer();

  // TODO: LW-10946 get the transaction data from the onContinue and set it using useBuiltTxState
  // eslint-disable-next-line react/jsx-handler-names
  return <CoSignEntry onCancel={config.onClose} onContinue={() => void 0} />;
};
