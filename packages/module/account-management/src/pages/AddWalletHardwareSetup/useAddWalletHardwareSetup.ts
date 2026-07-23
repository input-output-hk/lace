import { useTranslation } from '@lace-contract/i18n';
import {
  getDerivationTypesForBlockchain,
  getMaxHwAccountIndex,
  isDeviceAccountSelection,
} from '@lace-contract/onboarding-v2';
import { NavigationControls } from '@lace-lib/navigation';
import { useHwWalletSetupForm } from '@lace-lib/util-hw/extension-ui';
import { useCallback, useEffect } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import type { TranslationKey } from '@lace-contract/i18n';
import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

/**
 * Import instruction shown when the device dictates account selection. The
 * text walks the user through the device's own export screen, so it is picked
 * per onboarding option id; unknown options fall back to the Seed Signer
 * wording.
 */
const deviceImportInstructionKey = (optionId: string): TranslationKey =>
  optionId === 'keystone-bitcoin'
    ? 'v2.keystone-bitcoin.import.instruction'
    : 'v2.seed-signer-bitcoin.import.instruction';

export const useAddWalletHardwareSetup = ({
  route,
}: SheetScreenProps<SheetRoutes.AddWalletHardwareSetup>) => {
  const { t } = useTranslation();
  const { optionId, device, derivationTypes, blockchainName } = route.params;

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

  const loadedHwBlockchainSupport = useLoadModules(
    'addons.loadHwBlockchainSupport',
  );

  const hasAccountSetup = !isDeviceAccountSelection(loadedHwBlockchainSupport, {
    optionId,
  });

  const maxAccountIndex = getMaxHwAccountIndex(loadedHwBlockchainSupport, {
    optionId,
  });

  const {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange,
    derivationTypeOptions,
    error,
  } = useHwWalletSetupForm({
    derivationTypes: hasAccountSetup
      ? getDerivationTypesForBlockchain(blockchainName, derivationTypes)
      : undefined,
    errorCategory,
    maxAccountIndex,
  });

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
      accountIndex: hasAccountSetup ? accountIndex : 0,
      derivationType: hasAccountSetup ? derivationType : undefined,
      blockchainName,
    });
  }, [
    isCreating,
    attemptCreateHardwareWallet,
    optionId,
    device,
    accountIndex,
    derivationType,
    blockchainName,
    hasAccountSetup,
  ]);

  const handleBackPress = useCallback(() => {
    if (isCreating) return;
    NavigationControls.closeSheet();
  }, [isCreating]);

  return {
    hasAccountSetup,
    accountIndex,
    setAccountIndex,
    maxAccountIndex,
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
    instructionText: hasAccountSetup
      ? undefined
      : t(deviceImportInstructionKey(optionId)),
    derivationTypeLabel: t(
      'v2.account-details.add-wallet-hardware-setup.derivation-type-label',
    ),
    createButtonLabel: t(
      'v2.account-details.add-wallet-hardware-setup.create-button',
    ),
  };
};
