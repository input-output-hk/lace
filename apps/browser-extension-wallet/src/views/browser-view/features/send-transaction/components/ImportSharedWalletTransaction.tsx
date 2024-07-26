import { CoSignEntry } from '@lace/core';
import React from 'react';
import { useDrawer } from '@views/browser/stores';
import { useBuiltTxState } from '../store';
import { Serialization } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';

export const ImportSharedWalletTransaction = (): JSX.Element => {
  const [config] = useDrawer();
  const { setBuiltTxData } = useBuiltTxState();

  // TODO: LW-10946 get the transaction data from the onContinue and set it using useBuiltTxState
  // eslint-disable-next-line react/jsx-handler-names
  return (
    <CoSignEntry
      onCancel={config.onClose}
      onContinue={(txData) => {
        const decoded = Serialization.Transaction.fromCbor(Wallet.TxCBOR(txData.transaction.cborHex));
        setBuiltTxData({
          tx: decoded.toCore()
        });
      }}
    />
  );
};
