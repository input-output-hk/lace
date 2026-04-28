import { Box, Text } from '@input-output-hk/lace-ui-toolkit';
import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import React, { useCallback, useEffect } from 'react';

import { MidnightDappConnect } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

export const MidnightDappConnectView = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const request = useLaceSelector(
    'dappConnector.selectActiveAuthorizeDappRequest',
  );

  const authorize = useDispatchLaceAction('authorizeDapp.completed');

  useEffect(() => {
    if (!request) window.close();
  }, [request]);

  const handleAuthorize = useCallback(() => {
    if (!request) return;
    authorize({
      authorized: true,
      blockchainName: request.blockchainName,
      dapp: request.dapp,
    });
    trackEvent('dapp connector | authorize dapp | authorize | press');
  }, [authorize, request, trackEvent]);

  const handleCancel = useCallback(() => {
    if (!request) return;
    authorize({
      authorized: false,
      dapp: request.dapp,
    });
    trackEvent('dapp connector | authorize dapp | cancel | press');
  }, [authorize, request, trackEvent]);

  if (!request) {
    return (
      <DappConnectorLayoutV2>
        <Box my="$16">
          <Text.Body.Normal data-testid="midnight-dapp-connect-loading">
            {t('app.loading')}
          </Text.Body.Normal>
        </Box>
      </DappConnectorLayoutV2>
    );
  }

  return (
    <MidnightDappConnect
      imageUrl={request.dapp.imageUrl}
      name={request.dapp.name}
      url={request.dapp.origin}
      onAuthorize={handleAuthorize}
      onCancel={handleCancel}
    />
  );
};
