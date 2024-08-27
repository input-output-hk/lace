import { CoSignEntry } from '@lace/core';
import React from 'react';
import { useDrawer } from '@views/browser/stores';
import { useBuiltTxState } from '../store';
import { Serialization } from '@cardano-sdk/core';
import { Wallet } from '@lace/cardano';
import { useWalletState } from '@hooks/useWalletState';

export const ImportSharedWalletTransaction = (): JSX.Element => {
  const [config] = useDrawer();
  const { setBuiltTxData } = useBuiltTxState();
  const walletState = useWalletState();

  return (
    <CoSignEntry
      // eslint-disable-next-line react/jsx-handler-names
      onCancel={config.onClose}
      onContinue={async (txData) => {
        if (!txData) return;
        const importedSharedWalletTx = Serialization.Transaction.fromCbor(
          Wallet.Serialization.TxCBOR(txData.transaction.cborHex)
        );
        const { body, id } = importedSharedWalletTx.toCore();

        const ownAddresses = new Set([...(walletState?.addresses || [])].map((address) => address.address));
        const filteredOutputs = body.outputs.map((o) => o).filter((o) => !ownAddresses.has(o.address));

        setBuiltTxData({
          uiTx: {
            fee: body.fee,
            outputs: new Set(filteredOutputs.length === 0 ? body.outputs : filteredOutputs),
            hash: id,
            // TODO: LW-11113 ada handles probably won't work with hardcoded empty array
            handleResolutions: [],
            validityInterval: body.validityInterval
          },
          importedSharedWalletTx
        });
      }}
    />
  );
};
