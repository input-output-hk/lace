import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls, StackRoutes } from '@lace-lib/navigation';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction } from '../../hooks';

import type { SheetScreenProps, SheetRoutes } from '@lace-lib/navigation';
import type { IconName } from '@lace-lib/ui-toolkit';

type RestoreWalletSuccessSheetProps =
  SheetScreenProps<SheetRoutes.RestoreWalletSuccess>;

export const useRestoreWalletSuccessSheet = ({
  route: {
    params: { walletId },
  },
}: RestoreWalletSuccessSheetProps) => {
  const { t } = useTranslation();
  const clearRestoreWalletFlow = useDispatchLaceAction(
    'accountManagement.clearRestoreWalletFlow',
  );

  const handleViewWallet = useCallback(() => {
    NavigationControls.actions.closeAndNavigate(StackRoutes.WalletSettings, {
      walletId,
      origin: 'add-wallet',
    });
  }, [walletId]);

  useEffect(() => {
    clearRestoreWalletFlow();
  }, [clearRestoreWalletFlow]);

  return {
    image: { name: 'RelievedFace' as IconName, variant: 'solid' as const },
    title: t('v2.account-management.restore-wallet.success.title'),
    body: t('v2.account-management.restore-wallet.success.description'),
    buttonText: t('v2.account-management.restore-wallet.success.cta'),
    onButtonPress: handleViewWallet,
  };
};
