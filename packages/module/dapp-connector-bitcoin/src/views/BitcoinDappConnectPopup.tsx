import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { spacing, Text } from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthorizeDappContent } from '../components';
import { BITCOIN_DAPP_CONNECT_LOCATION } from '../const';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { Dapp } from '@lace-contract/dapp-connector';
import type { AnyAccount } from '@lace-contract/wallet-repo';

const styles = StyleSheet.create({
  loading: { marginVertical: spacing.M },
});

/**
 * Connect/authorize popup shown for window.bitcoin.lace.enable().
 *
 * Lets the user pick a Bitcoin account and authorize the requesting origin, or
 * reject it. Authorize dispatches confirmConnect so the prompt side effect binds
 * the account to the authenticated sender origin; a reject or an unresolved
 * close completes the shared authorize job as unauthorized. Once the active
 * request clears the window asks the service worker to close it, which
 * `window.close()` cannot do reliably for a service-worker-opened popup.
 */
export const BitcoinDappConnectPopup = () => {
  const { t } = useTranslation();

  const request = useLaceSelector(
    'dappConnector.selectActiveAuthorizeDappRequest',
  );
  const allAccounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const activeWallets = useLaceSelector('wallets.selectActiveNetworkWallets');

  const bitcoinAccounts = useMemo(
    () => allAccounts.filter(account => account.blockchainName === 'Bitcoin'),
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
    'bitcoinDappConnector.confirmConnect',
  );
  const authorize = useDispatchLaceAction('authorizeDapp.completed');
  const requestPopupClose = useDispatchLaceAction(
    'bitcoinDappConnector.closePopupRequested',
  );

  const hasResolvedRef = useRef(false);
  const dappRef = useRef<Dapp | null>(null);
  if (request) dappRef.current = request.dapp;

  useEffect(() => {
    if (!request) requestPopupClose(BITCOIN_DAPP_CONNECT_LOCATION);
  }, [request, requestPopupClose]);

  useEffect(
    () => () => {
      if (hasResolvedRef.current || !dappRef.current) return;
      authorize({ authorized: false, dapp: dappRef.current });
    },
    [authorize],
  );

  const handleAuthorize = useCallback(() => {
    if (!request || !selectedAccount) return;
    hasResolvedRef.current = true;
    confirmConnect({ account: selectedAccount, dappId: request.dapp.id });
  }, [confirmConnect, request, selectedAccount]);

  const handleCancel = useCallback(() => {
    if (!request) return;
    hasResolvedRef.current = true;
    authorize({ authorized: false, dapp: request.dapp });
  }, [authorize, request]);

  if (!request) {
    return (
      <DappConnectorLayoutV2 fillViewport>
        <View style={styles.loading}>
          <Text.S testID="bitcoin-dapp-connect-loading">
            {t('app.loading')}
          </Text.S>
        </View>
      </DappConnectorLayoutV2>
    );
  }

  return (
    <AuthorizeDappContent
      imageUrl={request.dapp.imageUrl}
      name={request.dapp.name}
      url={request.dapp.origin}
      accounts={bitcoinAccounts}
      walletNameByWalletId={walletNameByWalletId}
      selectedAccount={selectedAccount}
      onSelectAccount={setSelectedAccount}
      onAuthorize={handleAuthorize}
      onCancel={handleCancel}
    />
  );
};
