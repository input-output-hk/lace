import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { useCallback } from 'react';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';

export const useSuccessCreateNewWalletSheet = ({
  route: {
    params: { walletId },
  },
}: SheetScreenProps<SheetRoutes.SuccessCreateNewWallet>) => {
  const { t } = useTranslation();

  const handleViewWallet = useCallback(() => {
    NavigationControls.actions.closeAndNavigate(StackRoutes.WalletSettings, {
      walletId,
      origin: 'add-wallet',
    });
  }, [walletId]);

  return {
    image: { name: 'RelievedFace' as IconName, variant: 'solid' as const },
    title: t('v2.account-management.create-wallet.success.title'),
    body: t('v2.account-management.create-wallet.success.description'),
    buttonText: t('v2.account-management.create-wallet.success.cta'),
    onButtonPress: handleViewWallet,
  };
};
