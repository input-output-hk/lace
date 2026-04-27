import { useAnalytics } from '@lace-contract/analytics';
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

  const handleRejectTransaction = useCallback(() => {
    rejectDappTx();
    trackEvent('dapp connector | prove transaction | reject | press');
  }, [rejectDappTx, trackEvent]);

  const handleConfirmTransaction = useCallback(() => {
    confirmDappTx();
    trackEvent('dapp connector | prove transaction | confirm | press', {
      ...(request?.transactionType && {
        transactionType: request.transactionType,
      }),
    });
  }, [confirmDappTx, trackEvent, request]);

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
