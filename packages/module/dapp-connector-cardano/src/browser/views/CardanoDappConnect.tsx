import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { onSheetClose } from '@lace-lib/navigation';
import { Loader, spacing, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthorizeDappSheet } from '../../common/components';
import { useDispatchLaceAction, useLaceSelector } from '../../common/hooks';
import { useSelectedAccountBalance } from '../../common/hooks/useSelectedAccountBalance';

import type { AnyAccount } from '@lace-contract/wallet-repo';

export const CardanoDappConnect = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { theme } = useTheme();
  const request = useLaceSelector(
    'cardanoDappConnector.selectPendingAuthRequest',
  );
  const accounts = useLaceSelector('wallets.selectActiveNetworkAccounts');

  const [selectedAccount, setSelectedAccount] = useState<AnyAccount | null>(
    null,
  );
  const hasRespondedRef = useRef(false);

  const cardanoAccounts = accounts.filter(
    account => account.blockchainName === 'Cardano',
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

  const handleAuthorize = useCallback(() => {
    if (!selectedAccount) return;
    hasRespondedRef.current = true;
    confirmConnect({ account: selectedAccount });
    trackEvent('dapp connector | authorize dapp | authorize | press');
  }, [confirmConnect, selectedAccount, trackEvent]);

  const handleCancel = useCallback(() => {
    hasRespondedRef.current = true;
    rejectConnect();
    trackEvent('dapp connector | authorize dapp | cancel | press');
  }, [rejectConnect, trackEvent]);

  // Reject when sheet is dismissed (X button, swipe down, click outside).
  useEffect(() => {
    return onSheetClose(() => {
      if (!hasRespondedRef.current && request) {
        rejectConnect();
      }
    });
  }, [rejectConnect, request]);

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
