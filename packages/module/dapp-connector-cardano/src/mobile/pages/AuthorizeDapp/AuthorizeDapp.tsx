import React from 'react';

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

  const cardanoAccounts = useLaceSelector(
    'wallets.selectActiveNetworkAccountsByBlockchainName',
    CARDANO_ACCOUNTS_PARAMS,
  );

  const selectedAccountBalance = useSelectedAccountBalance(selectedAccount);

  return (
    <AuthorizeDappSheet
      headerTitle={headerTitle}
      name={displayDapp?.name ?? ''}
      url={displayOrigin ?? ''}
      imageUrl={getImageUrlFromIcon(displayDapp?.icon)}
      accounts={cardanoAccounts}
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
