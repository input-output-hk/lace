import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { Text, spacing } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { MidnightDappConnect } from './components';
import { useDispatchLaceAction, useLaceSelector } from './hooks';

import type { AnyAccount } from '@lace-contract/wallet-repo';

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.M },
});

export const MidnightDappConnectView = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();

  const request = useLaceSelector(
    'dappConnector.selectActiveAuthorizeDappRequest',
  );
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const activeWallets = useLaceSelector('wallets.selectActiveNetworkWallets');

  const midnightAccounts = useMemo(
    () => allAccounts.filter(account => account.blockchainName === 'Midnight'),
    [allAccounts],
  );

  const walletNameByWalletId = useMemo(
    () =>
      Object.fromEntries(activeWallets.map(w => [w.walletId, w.metadata.name])),
    [activeWallets],
  );

  const [selectedAccount, setSelectedAccount] = useState<AnyAccount | null>(
    null,
  );

  const confirmConnect = useDispatchLaceAction(
    'midnightDappConnector.confirmConnect',
  );
  const authorize = useDispatchLaceAction('authorizeDapp.completed');

  useEffect(() => {
    if (!request) window.close();
  }, [request]);

  const handleAuthorize = useCallback(() => {
    if (!request || !selectedAccount) return;
    confirmConnect({ account: selectedAccount, dappId: request.dapp.id });
    trackEvent('dapp connector | authorize dapp | authorize | press', {
      dappDomain: extractDappDomain(request.dapp.origin),
      dappName: request.dapp.name,
      blockchain: 'Midnight',
    });
  }, [confirmConnect, request, selectedAccount, trackEvent]);

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
      <DappConnectorLayoutV2 fillViewport>
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
      accounts={midnightAccounts}
      walletNameByWalletId={walletNameByWalletId}
      selectedAccount={selectedAccount}
      onSelectAccount={setSelectedAccount}
      onAuthorize={handleAuthorize}
      onCancel={handleCancel}
    />
  );
};
