import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { DappConnectorLayoutV2 } from '@lace-lib/ui-extension';
import { Loader, spacing, Text, useTheme } from '@lace-lib/ui-toolkit';
import React, { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AuthorizeDappContent } from '../../common/components';
import { useDispatchLaceAction, useLaceSelector } from '../../common/hooks';
import { useSelectedAccountBalance } from '../../common/hooks/useSelectedAccountBalance';

import type { AnyAccount } from '@lace-contract/wallet-repo';

export const CardanoDappConnectPopup = () => {
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
    confirmConnect({ account: selectedAccount });
    trackEvent('dapp connector | authorize dapp | authorize | press');
  }, [confirmConnect, selectedAccount, trackEvent]);

  const handleCancel = useCallback(() => {
    rejectConnect();
    trackEvent('dapp connector | authorize dapp | cancel | press');
  }, [rejectConnect, trackEvent]);

  if (!request) {
    return (
      <View style={styles.loadingContainer}>
        <Loader size={36} color={theme.text.primary} />
      </View>
    );
  }

  return (
    <DappConnectorLayoutV2
      footerOrientation="horizontal"
      showHeader={false}
      fillViewport
      primaryButton={{
        disabled: !selectedAccount,
        label: t('dapp-connector.cardano.authorize.button'),
        action: handleAuthorize,
      }}
      secondaryButton={{
        label: t('dapp-connector.cardano.authorize.cancel'),
        action: handleCancel,
      }}>
      <View style={styles.header}>
        <Text.S align="center">
          {t('dapp-connector.cardano.authorize.title')}
        </Text.S>
      </View>
      <AuthorizeDappContent
        imageUrl={request.dapp.imageUrl}
        name={request.dapp.name}
        url={request.dapp.origin}
        accounts={cardanoAccounts}
        selectedAccount={selectedAccount}
        onSelectAccount={handleSelectAccount}
        selectedAccountBalance={selectedAccountBalance}
      />
    </DappConnectorLayoutV2>
  );
};

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.M,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
