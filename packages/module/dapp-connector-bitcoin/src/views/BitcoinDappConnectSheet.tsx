import { useTranslation } from '@lace-contract/i18n';
import { Sheet, spacing, useTheme } from '@lace-lib/ui-toolkit';
import { useNavigation } from '@react-navigation/native';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { AuthorizeDappBody } from '../components';
import { useDispatchLaceAction, useLaceSelector } from '../hooks';

import type { AnyAccount } from '@lace-contract/wallet-repo';

/**
 * Side panel sheet for the connect/authorize request behind
 * window.bitcoin.lace.enable(). Renders the same review body as the popup with
 * the sheet's own header and footer chrome, so an already open Lace side panel
 * handles the request instead of a separate window. Every dismissal path
 * rejects the request, so the dApp's enable() promise never hangs.
 */
export const BitcoinDappConnectSheet = () => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const navigation = useNavigation();

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
  const rejectConnect = useDispatchLaceAction(
    'bitcoinDappConnector.rejectConnect',
    true,
  );

  const hasRespondedRef = useRef(false);

  const handleAuthorize = useCallback(() => {
    if (!request || !selectedAccount) return;
    hasRespondedRef.current = true;
    confirmConnect({ account: selectedAccount, dappId: request.dapp.id });
  }, [confirmConnect, request, selectedAccount]);

  const handleCancel = useCallback(() => {
    hasRespondedRef.current = true;
    rejectConnect();
  }, [rejectConnect]);

  const handleCancelRef = useRef(handleCancel);
  handleCancelRef.current = handleCancel;
  const handleHeaderClose = useCallback(() => {
    handleCancelRef.current();
  }, []);

  // Reject on any dismissal that is not an explicit response (close X, swipe
  // down, click outside, navigation away): the outcome stream resolves only on
  // confirm, reject, a panel disconnect or a dropped request, so dismissing
  // just this sheet would otherwise leave enable() pending forever. Hold the
  // dispatcher in a ref so the effect stays unmount-only instead of
  // re-running - and auto-rejecting - whenever the request supersedes.
  const rejectConnectRef = useRef(rejectConnect);
  rejectConnectRef.current = rejectConnect;
  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current) {
        rejectConnectRef.current();
      }
    };
  }, []);

  // Publish the close X in its own effect: the footer below re-publishes as
  // selection resolves, and a shared effect would re-create the header each
  // time - remounting the close button and dropping a tap mid-swap. See ADR 31.
  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('dapp-connector.connect-dapp.title')}
          handleClose={handleHeaderClose}
        />
      ),
    });
  }, [navigation, t, handleHeaderClose]);

  useEffect(() => {
    navigation.setOptions({
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: t('dapp-connector.connect-dapp.authorize'),
            onPress: handleAuthorize,
            iconColor: theme.brand.white,
            disabled: !selectedAccount || !request,
          }}
          secondaryButton={{
            label: t('dapp-connector.connect-dapp.cancel'),
            onPress: handleCancel,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    navigation,
    t,
    theme.brand.white,
    handleAuthorize,
    handleCancel,
    selectedAccount,
    request,
  ]);

  if (!request) return null;

  return (
    <ScrollView contentContainerStyle={styles.content}>
      <AuthorizeDappBody
        imageUrl={request.dapp.imageUrl}
        name={request.dapp.name}
        url={request.dapp.origin}
        accounts={bitcoinAccounts}
        walletNameByWalletId={walletNameByWalletId}
        selectedAccount={selectedAccount}
        onSelectAccount={setSelectedAccount}
        showTitle={false}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: spacing.S,
    paddingBottom: spacing.M,
  },
});
