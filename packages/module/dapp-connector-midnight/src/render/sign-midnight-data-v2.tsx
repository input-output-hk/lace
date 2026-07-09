import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
import React, { useCallback } from 'react';

import { SignDataV2 } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

export const SignMidnightDataV2 = () => {
  const { trackEvent } = useAnalytics();

  const confirmSignData = useDispatchLaceAction(
    'midnightDappConnector.confirmSignData',
    true,
  );
  const rejectSignData = useDispatchLaceAction(
    'midnightDappConnector.rejectSignData',
    true,
  );
  const request = useLaceSelector(
    'midnightDappConnector.selectSignDataRequest',
  );

  const dappPayload = request
    ? {
        dappDomain: extractDappDomain(request.dapp.origin),
        dappName: request.dapp.name,
        blockchain: 'Midnight',
      }
    : undefined;

  const handleRejectSignData = useCallback(() => {
    rejectSignData();
    trackEvent('dapp connector | sign data | reject | press', dappPayload);
  }, [rejectSignData, trackEvent, dappPayload]);

  const handleConfirmSignData = useCallback(() => {
    confirmSignData();
    trackEvent('dapp connector | sign data | confirm | press', dappPayload);
  }, [confirmSignData, trackEvent, dappPayload]);

  return (
    <SignDataV2
      rejectSignData={handleRejectSignData}
      imageUrl={request?.dapp.imageUrl || ''}
      name={request?.dapp.name || ''}
      payload={request?.payload ?? ''}
      keyType={request?.keyType ?? 'unshielded'}
      confirmSignData={handleConfirmSignData}
      url={request?.dapp.origin || ''}
    />
  );
};
