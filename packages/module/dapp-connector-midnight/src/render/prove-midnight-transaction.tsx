import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
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

  const dappPayload = request
    ? {
        dappDomain: extractDappDomain(request.dapp.origin),
        dappName: request.dapp.name,
        blockchain: 'Midnight',
      }
    : undefined;

  return (
    <ProveTransaction
      rejectTransaction={() => {
        rejectDappTx();
        trackEvent(
          'dapp connector | prove transaction | reject | press',
          dappPayload,
        );
      }}
      imageUrl={request?.dapp.imageUrl || ''}
      name={request?.dapp.name || ''}
      transactionData={request?.transactionData ?? null}
      confirmTransaction={() => {
        confirmDappTx();
        trackEvent('dapp connector | prove transaction | confirm | press', {
          ...dappPayload,
          ...(request?.transactionType && {
            transactionType: request.transactionType,
          }),
        });
      }}
      url={request?.dapp.origin || ''}
    />
  );
};
