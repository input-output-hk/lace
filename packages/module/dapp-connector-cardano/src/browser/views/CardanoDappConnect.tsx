import { useAnalytics } from '@lace-contract/analytics';
import { extractDappDomain } from '@lace-contract/dapp-connector';
import { useTranslation } from '@lace-contract/i18n';
import { Loader, Sheet, spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthorizeDappSheet } from '../../common/components';
import { useDispatchLaceAction, useLaceSelector } from '../../common/hooks';
import { useSelectedAccountBalance } from '../../common/hooks/useSelectedAccountBalance';

import type { AnyAccount } from '@lace-contract/wallet-repo';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const CardanoDappConnect = (
  props: SheetScreenProps<SheetRoutes.AuthorizeDapp>,
) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();
  const request = useLaceSelector(
    'cardanoDappConnector.selectPendingAuthRequest',
  );
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');
  const activeWallets = useLaceSelector('wallets.selectActiveNetworkWallets');

  const [selectedAccount, setSelectedAccount] = useState<AnyAccount | null>(
    null,
  );

  const hasRespondedRef = useRef(false);

  const cardanoAccounts = accounts.filter(
    account => account.blockchainName === 'Cardano',
  );

  const walletNameByWalletId = useMemo(
    () =>
      Object.fromEntries(
        activeWallets.map(wallet => [wallet.walletId, wallet.metadata.name]),
      ),
    [activeWallets],
  );

  const selectedAccountBalance = useSelectedAccountBalance(selectedAccount);

  const confirmConnect = useDispatchLaceAction(
    'cardanoDappConnector.confirmConnect',
  );
  const rejectConnect = useDispatchLaceAction(
    'cardanoDappConnector.rejectConnect',
    true,
  );

  const handleSelectAccount = useCallback((account: AnyAccount) => {
    setSelectedAccount(account);
  }, []);

  const dappPayload = request
    ? {
        dappDomain: extractDappDomain(request.dapp.origin),
        dappName: request.dapp.name,
        blockchain: 'Cardano',
      }
    : undefined;

  const handleAuthorize = useCallback(() => {
    if (!selectedAccount || !dappPayload) return;
    hasRespondedRef.current = true;
    confirmConnect({ account: selectedAccount });
    trackEvent(
      'dapp connector | authorize dapp | authorize | press',
      dappPayload,
    );
  }, [confirmConnect, selectedAccount, trackEvent, dappPayload]);

  const handleCancel = useCallback(() => {
    hasRespondedRef.current = true;
    rejectConnect();
    trackEvent('dapp connector | authorize dapp | cancel | press', dappPayload);
  }, [rejectConnect, trackEvent, dappPayload]);

  // Reject when the sheet is dismissed without an explicit response (X
  // button, swipe down, click outside, navigation away). Hold the latest
  // dispatcher in a ref so this unmount-only effect calls a fresh reference
  // without re-running on every render — which would otherwise auto-reject
  // whenever the pending request supersedes.
  const rejectConnectRef = useRef(rejectConnect);
  rejectConnectRef.current = rejectConnect;
  useEffect(() => {
    return () => {
      if (!hasRespondedRef.current) {
        rejectConnectRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (!request) {
      props.navigation.setOptions({
        header: undefined,
        footer: undefined,
      });
      return;
    }
    props.navigation.setOptions({
      header: (
        <Sheet.Header
          title={t('dapp-connector.cardano.authorize.title')}
          handleClose={handleCancel}
        />
      ),
      footer: (
        <Sheet.Footer
          primaryButton={{
            disabled: !selectedAccount,
            label: t('dapp-connector.cardano.authorize.button'),
            onPress: handleAuthorize,
            iconColor: theme.brand.white,
          }}
          secondaryButton={{
            label: t('dapp-connector.cardano.authorize.cancel'),
            onPress: handleCancel,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    props.navigation,
    selectedAccount,
    handleAuthorize,
    handleCancel,
    request,
    t,
  ]);

  if (!request) {
    return (
      <View style={[loadingStyles.container, loadingStyles.content]}>
        <Loader size={36} color={theme.text.primary} />
      </View>
    );
  }

  return (
    <AuthorizeDappSheet
      headerTitle={t('dapp-connector.cardano.authorize.title')}
      imageUrl={request.dapp.imageUrl}
      name={request.dapp.name}
      url={request.dapp.origin}
      accounts={cardanoAccounts}
      walletNameByWalletId={walletNameByWalletId}
      selectedAccount={selectedAccount}
      onSelectAccount={handleSelectAccount}
      selectedAccountBalance={selectedAccountBalance}
      onAuthorize={handleAuthorize}
      onCancel={handleCancel}
    />
  );
};

const loadingStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: spacing.S,
    paddingVertical: spacing.L,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
