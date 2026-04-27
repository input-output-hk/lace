import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useHwWalletSetupForm } from '@lace-lib/util-hw/extension-ui';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const useAddWalletHardwareSetup = ({
  route,
}: SheetScreenProps<SheetRoutes.AddWalletHardwareSetup>) => {
  const { t } = useTranslation();
  const { optionId, device, derivationTypes } = route.params;

  const attemptCreateHardwareWallet = useDispatchLaceAction(
    'accountManagement.attemptCreateHardwareWallet',
  );
  const clearAccountStatus = useDispatchLaceAction(
    'accountManagement.clearAccountStatus',
  );

  const isCreating = useLaceSelector('accountManagement.getIsLoading');
  const errorCategory = useLaceSelector(
    'accountManagement.getLastHardwareWalletCreationError',
  );

  const {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeOptions,
    error,
  } = useHwWalletSetupForm({ derivationTypes, errorCategory });

  useEffect(
    () => () => {
      clearAccountStatus();
    },
    [clearAccountStatus],
  );

  const handleCreateWallet = useCallback(() => {
    if (isCreating) return;

    attemptCreateHardwareWallet({
      optionId,
      device,
      accountIndex,
      derivationType,
      blockchainName: 'Cardano',
    });
  }, [
    isCreating,
    attemptCreateHardwareWallet,
    optionId,
    device,
    accountIndex,
    derivationType,
  ]);

  const handleBackPress = useCallback(() => {
    if (isCreating) return;
    NavigationControls.sheets.close();
  }, [isCreating]);

  return {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeOptions,
    isCreating,
    error,
    onCreateWallet: handleCreateWallet,
    onBackPress: handleBackPress,
    title: t('v2.account-details.add-wallet-hardware-setup.title'),
    accountLabel: t(
      'v2.account-details.add-wallet-hardware-setup.account-label',
    ),
    derivationTypeLabel: t(
      'v2.account-details.add-wallet-hardware-setup.derivation-type-label',
    ),
    createButtonLabel: t(
      'v2.account-details.add-wallet-hardware-setup.create-button',
    ),
  };
};
