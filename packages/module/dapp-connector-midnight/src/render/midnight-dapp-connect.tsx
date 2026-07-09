import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { Text, spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { MidnightDappConnect } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.M },
});

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
    trackEvent('dapp connector | authorize dapp | authorize | press', {
      dappDomain: extractDappDomain(request.dapp.origin),
      dappName: request.dapp.name,
      blockchain: 'Midnight',
    });
  }, [authorize, request, trackEvent]);

  const handleCancel = useCallback(() => {
    if (!request) return;
    authorize({
      authorized: false,
      dapp: request.dapp,
    });
    trackEvent('dapp connector | authorize dapp | cancel | press', {
      dappDomain: extractDappDomain(request.dapp.origin),
      dappName: request.dapp.name,
      blockchain: 'Midnight',
    });
  }, [authorize, request, trackEvent]);

  if (!request) {
    return (
      <DappConnectorLayoutV2>
        <View style={styles.loading}>
          <Text.S testID="midnight-dapp-connect-loading">
            {t('app.loading')}
          </Text.S>
        </View>
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
