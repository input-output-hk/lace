import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
import React, { useCallback } from 'react';

import { ProveTransactionV2 } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

export const ProveMidnightTransactionV2 = () => {
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

  const handleRejectTransaction = useCallback(() => {
    rejectDappTx();
    trackEvent(
      'dapp connector | prove transaction | reject | press',
      dappPayload,
    );
  }, [rejectDappTx, trackEvent, dappPayload]);

  const handleConfirmTransaction = useCallback(() => {
    confirmDappTx();
    trackEvent('dapp connector | prove transaction | confirm | press', {
      ...dappPayload,
      ...(request?.transactionType && {
        transactionType: request.transactionType,
      }),
    });
  }, [confirmDappTx, trackEvent, request, dappPayload]);

  return (
    <ProveTransactionV2
      rejectTransaction={handleRejectTransaction}
      imageUrl={request?.dapp.imageUrl || ''}
      name={request?.dapp.name || ''}
      transactionData={request?.transactionData ?? null}
      confirmTransaction={handleConfirmTransaction}
      url={request?.dapp.origin || ''}
    />
  );
};
