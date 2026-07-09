import { useTranslation } from '@lace-contract/i18n';
import { Sheet, useTheme } from '@lace-lib/ui-toolkit';
import React, { useEffect, useMemo } from 'react';

import { AuthorizeDappSheet } from '../../../common/components';
import { useLaceSelector } from '../../../common/hooks';
import { useSelectedAccountBalance } from '../../../common/hooks/useSelectedAccountBalance';

import { useAuthorizeDapp } from './useAuthorizeDapp';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { AvatarContent } from '@lace-lib/ui-toolkit';

const CARDANO_ACCOUNTS_PARAMS = { blockchainName: 'Cardano' } as const;

const getImageUrlFromIcon = (
  icon: AvatarContent | undefined,
): string | undefined => icon?.img?.uri;

export const AuthorizeDapp = (
  props: SheetScreenProps<SheetRoutes.AuthorizeDapp>,
) => {
  const { t } = useTranslation();
  const {
    displayDapp,
    displayOrigin,
    dappStatus,
    headerTitle,
    handleAuthorize,
    handleReject,
    handleSetAccountId,
    selectedAccount,
  } = useAuthorizeDapp(props);
  const { theme } = useTheme();

  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_ACCOUNTS_PARAMS,
  );
  const activeWallets = useLaceSelector('wallets.selectActiveNetworkWallets');
  const walletNameByWalletId = useMemo(
    () =>
      Object.fromEntries(
        activeWallets.map(wallet => [wallet.walletId, wallet.metadata.name]),
      ),
    [activeWallets],
  );

  const selectedAccountBalance = useSelectedAccountBalance(selectedAccount);

  useEffect(() => {
    props.navigation.setOptions({
      header: <Sheet.Header title={headerTitle} />,
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
            onPress: handleReject,
          }}
          showDivider={true}
        />
      ),
    });
  }, [
    props.navigation,
    headerTitle,
    selectedAccount,
    handleAuthorize,
    handleReject,
    theme.brand.white,
    t,
  ]);

  return (
    <AuthorizeDappSheet
      headerTitle={headerTitle}
      name={displayDapp?.name ?? ''}
      url={displayOrigin ?? ''}
      imageUrl={getImageUrlFromIcon(displayDapp?.icon)}
      accounts={cardanoAccounts}
      walletNameByWalletId={walletNameByWalletId}
      selectedAccount={selectedAccount}
      onSelectAccount={handleSetAccountId}
      onAuthorize={handleAuthorize}
      onCancel={handleReject}
      category={displayDapp?.category}
      coinIcons={displayDapp?.coinIcons}
      dappStatus={dappStatus}
      selectedAccountBalance={selectedAccountBalance}
    />
  );
};
