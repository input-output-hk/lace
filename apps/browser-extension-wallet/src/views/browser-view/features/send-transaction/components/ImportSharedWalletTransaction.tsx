/* eslint-disable unicorn/consistent-function-scoping */
/* eslint-disable no-console */
import { CoSignEntry, SharedWalletTransactionSchema } from '@lace/core';
import React from 'react';
import { useDrawer } from '@views/browser/stores';
// import { useBuiltTxState } from '../store';
import { Serialization } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
// import { useBuiltTxState, useSections } from '../store';
// import { DrawerContent } from '@src/views/browser-view/components/Drawer';
// import { Sections } from '../types';

export const ImportSharedWalletTransaction = (): JSX.Element => {
  const [config] = useDrawer();
  // const { setSection } = useSections();
  // const { setBuiltTxData } = useBuiltTxState();

  const onContinue = (txData: SharedWalletTransactionSchema) => {
    try {
      const decodedTx = Serialization.Transaction.fromCbor(Wallet.TxCBOR(txData.transaction.cborHex)).toCore();
      console.log(decodedTx);
      // TODO: adjust setBuiltTxData for send flow
      // setBuiltTxData({
      //   uiTx: {
      //     fee: decodedTx.body.fee,
      //     hash: decodedTx.id,
      //     outputs: new Set(decodedTx.body.outputs),
      //     validityInterval: decodedTx.body.validityInterval
      //   },
      //   tx: decodedTx,
      //   error: undefined
      // });
      // setSection({ currentSection: Sections.SUMMARY });
      // setDrawerConfig({ content: DrawerContent.SEND_TRANSACTION });
    } catch {
      console.error('Failed to decode tx data');
    }
  };

  // TODO: LW-10946 get the transaction data from the onContinue and set it using useBuiltTxState
  // eslint-disable-next-line react/jsx-handler-names
  return <CoSignEntry onCancel={config.onClose} onContinue={onContinue} />;
};
