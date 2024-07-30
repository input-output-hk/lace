import { CoSignEntry } from '@lace/core';
import React from 'react';
import { useDrawer } from '@views/browser/stores';
import { useBuiltTxState, useSections } from '../store';
import { Serialization } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { Sections } from '@views/browser/features/send-transaction';

export const ImportSharedWalletTransaction = (): JSX.Element => {
  const [config] = useDrawer();
  const { setBuiltTxData } = useBuiltTxState();
  const { setSection } = useSections();

  // TODO: LW-10946 get the transaction data from the onContinue and set it using useBuiltTxState
  // eslint-disable-next-line react/jsx-handler-names
  return (
    <CoSignEntry
      // eslint-disable-next-line react/jsx-handler-names
      onCancel={config.onClose}
      onContinue={async (txData) => {
        const importedSharedWalletTx = Serialization.Transaction.fromCbor(Wallet.TxCBOR(txData.transaction.cborHex));
        const { body, id } = importedSharedWalletTx.toCore();

        setBuiltTxData({
          uiTx: {
            fee: body.fee,
            outputs: new Set(body.outputs),
            hash: id,
            handleResolutions: [],
            validityInterval: body.validityInterval
          },
          importedSharedWalletTx
        });

        setSection({ currentSection: Sections.SUMMARY });
      }}
    />
  );
};
