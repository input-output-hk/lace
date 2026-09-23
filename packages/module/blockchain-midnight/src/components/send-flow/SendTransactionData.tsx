import React, { useMemo } from 'react';

import { useLaceSelector } from '../../hooks';

import { getSettledTransactionData } from './get-settled-transaction-data';
import { SendTransactionDataView } from './SendTransactionDataView';

/**
 * Collapsed-by-default disclosure of the exact transfer data the transaction
 * will be signed from — the decoded `serializedTx` payload, mirroring the
 * transaction-data box of the dApp connector's proving screen. Lets the user
 * verify every asset and recipient the wallet will actually submit before
 * confirming.
 */
export const SendTransactionData = () => {
  const sendFlowState = useLaceSelector('sendFlow.selectSendFlowState');

  const transactionData = useMemo(
    () => getSettledTransactionData(sendFlowState),
    [sendFlowState],
  );

  return <SendTransactionDataView transactionData={transactionData} />;
};
