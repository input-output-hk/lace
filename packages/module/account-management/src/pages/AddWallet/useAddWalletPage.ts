import { useTranslation } from '@lace-contract/i18n';
import { isHardwareOption } from '@lace-contract/onboarding-v2';
import {
  NavigationControls,
  SheetRoutes,
  type StackScreenProps,
} from '@lace-lib/navigation';
import { useCallback, useMemo } from 'react';

import { useDispatchLaceAction, useLoadedOnboardingOptions } from '../../hooks';

import type { StackRoutes } from '@lace-lib/navigation';
import type { AddWalletPageTemplateProps } from '@lace-lib/ui-toolkit';

type AddWalletScreenProps = StackScreenProps<StackRoutes.AddWallet>;

export const useAddWalletPage = ({ navigation }: AddWalletScreenProps) => {
  const { t } = useTranslation();
  const clearRestoreWalletFlow = useDispatchLaceAction(
    'accountManagement.clearRestoreWalletFlow',
  );

  const handleGoBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleCreateWallet = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.CreateNewWallet);
  }, []);

  const handleRestoreWallet = useCallback(() => {
    clearRestoreWalletFlow();
    NavigationControls.sheets.navigate(
      SheetRoutes.RestoreWalletRecoveryPhrase,
      { hasNestedScrolling: true },
    );
  }, [clearRestoreWalletFlow]);

  const handleConnectHardwareWallet = useCallback(() => {
    NavigationControls.sheets.navigate(SheetRoutes.AddWalletHardware);
  }, []);

  const loadedOnboardingOptions = useLoadedOnboardingOptions();
  const hasHardwareOption = useMemo(
    () => loadedOnboardingOptions?.flat().some(isHardwareOption) ?? false,
    [loadedOnboardingOptions],
  );

  const actions = useMemo<AddWalletPageTemplateProps['actions']>(
    () => [
      {
        id: 'create-wallet',
        icon: 'Plus',
        title: t('v2.account-details.add-wallet.create-wallet'),
        onPress: handleCreateWallet,
        testID: 'add-wallet-create-action',
      },
      {
        id: 'import-wallet',
        icon: 'Download',
        title: t('v2.account-details.add-wallet.import-wallet'),
        onPress: handleRestoreWallet,
        testID: 'add-wallet-import-action',
      },
      ...(hasHardwareOption
        ? [
            {
              id: 'connect-hardware',
              icon: 'HardwareWallet' as const,
              title: t('v2.account-details.add-wallet.hardware-wallet'),
              onPress: handleConnectHardwareWallet,
              testID: 'add-wallet-hardware-action',
            },
          ]
        : []),
    ],
    [
      handleCreateWallet,
      handleRestoreWallet,
      handleConnectHardwareWallet,
      hasHardwareOption,
      t,
    ],
  );

  return {
    title: t('v2.account-details.add-wallet.title'),
    actions,
    onBackPress: handleGoBack,
  } satisfies AddWalletPageTemplateProps;
};
