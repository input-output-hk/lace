import { useAnalytics } from '@lace-contract/analytics';
import React from 'react';

import { ProveTransaction } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

export const ProveMidnightTransaction = () => {
  const { trackEvent } = useAnalytics();

  const confirmDappTx = useDispatchLaceAction(
    'midnightDappConnector.confirmDappTx',
    true,
  );
  const rejectDappTx = useDispatchLaceAction(
    'midnightDappConnector.rejectDappTx',
    true,
  );
  const request = useLaceSelector('midnightDappConnector.selectProveTxRequest');

  return (
    <ProveTransaction
      rejectTransaction={() => {
        rejectDappTx();
        trackEvent('dapp connector | prove transaction | reject | press');
      }}
      imageUrl={request?.dapp.imageUrl || ''}
      name={request?.dapp.name || ''}
      transactionData={request?.transactionData ?? null}
      confirmTransaction={() => {
        confirmDappTx();
        trackEvent('dapp connector | prove transaction | confirm | press', {
          ...(request?.transactionType && {
            transactionType: request.transactionType,
          }),
        });
      }}
      url={request?.dapp.origin || ''}
    />
  );
};
