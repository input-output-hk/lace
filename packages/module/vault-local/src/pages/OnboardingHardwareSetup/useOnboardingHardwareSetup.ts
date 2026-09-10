import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  clearPendingCreateWalletSecrets,
  getDerivationTypesForBlockchain,
  getMaxHwAccountIndex,
  getPendingCreateWalletPasswordUtf8,
  isDeviceAccountSelection,
} from '@lace-contract/onboarding-v2';
import { WalletType } from '@lace-contract/wallet-repo';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import {
  checkTrezorSuiteReachable,
  TREZOR_SUITE_DOWNLOAD_URL,
} from '@lace-lib/util-hw/extension';
import { useHwWalletSetupForm } from '@lace-lib/util-hw/extension-ui';
import { useCallback, useEffect, useState } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';

import type { TranslationKey } from '@lace-contract/i18n';
import type { StackScreenProps } from '@lace-lib/navigation';
import type { HardwareErrorCategory } from '@lace-lib/util-hw';

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

export const useOnboardingHardwareSetup = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.OnboardingHardwareSetup>) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { optionId, walletType, device, derivationTypes, blockchainName } =
    route.params;

  const attemptCreateHardwareWallet = useDispatchLaceAction(
    'onboardingV2.attemptCreateHardwareWallet',
  );
  const resetCreateWalletStatus = useDispatchLaceAction(
    'onboardingV2.resetCreateWalletStatus',
  );

  const isCreating = useLaceSelector('onboardingV2.selectIsCreatingWallet');
  const createWalletError = useLaceSelector(
    'onboardingV2.selectCreateWalletError',
  );
  const lastCreatedWalletId = useLaceSelector(
    'onboardingV2.selectLastCreatedWalletId',
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

  // Safe 7 and newer only connect through the Trezor Suite desktop app, so
  // when Suite is unreachable the screen warns upfront instead of letting
  // the user run into Trezor's dead-end popup. `null` (probe not
  // applicable, e.g. outside the extension) shows nothing.
  const [shouldShowTrezorSuiteNotice, setShouldShowTrezorSuiteNotice] =
    useState(false);
  useEffect(() => {
    if (walletType !== WalletType.HardwareTrezor) {
      setShouldShowTrezorSuiteNotice(false);
      return;
    }
    let didCancel = false;
    void checkTrezorSuiteReachable().then(reachable => {
      if (!didCancel) setShouldShowTrezorSuiteNotice(reachable === false);
    });
    return () => {
      didCancel = true;
    };
  }, [walletType]);

  const {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange: setDerivationType,
    derivationTypeOptions,
    error,
  } = useHwWalletSetupForm({
    derivationTypes: hasAccountSetup
      ? getDerivationTypesForBlockchain(blockchainName, derivationTypes)
      : undefined,
    errorCategory: createWalletError as HardwareErrorCategory | null,
    maxAccountIndex,
  });

  const handleDerivationTypeChange = useCallback(
    (value: string) => {
      trackEvent('onboarding | hardware wallet | derivation type | changed', {
        walletType,
        derivationType: value,
      });
      setDerivationType(value);
    },
    [setDerivationType, trackEvent, walletType],
  );

  const navigateHome = useCallback(() => {
    navigation.reset({
      index: 0,
      routes: [
        {
          name: StackRoutes.Home,
          params: { screen: TabRoutes.Portfolio },
        },
      ],
    });
  }, [navigation]);

  useEffect(() => {
    if (!lastCreatedWalletId) return;
    clearPendingCreateWalletSecrets();
    resetCreateWalletStatus();
    navigateHome();
  }, [lastCreatedWalletId, navigateHome, resetCreateWalletStatus]);

  const handleCreateWallet = useCallback(() => {
    if (isCreating) return;

    trackEvent('onboarding | hardware wallet | create | press', {
      walletType,
      ...(derivationType && { derivationType }),
      accountIndex,
    });
    attemptCreateHardwareWallet({
      optionId,
      device,
      accountIndex: hasAccountSetup ? accountIndex : 0,
      derivationType: hasAccountSetup ? derivationType : undefined,
      blockchainName,
      password: getPendingCreateWalletPasswordUtf8() ?? '',
    });
  }, [
    isCreating,
    attemptCreateHardwareWallet,
    optionId,
    walletType,
    device,
    accountIndex,
    derivationType,
    blockchainName,
    hasAccountSetup,
    trackEvent,
  ]);

  const handleBackPress = useCallback(() => {
    if (isCreating) return;
    navigation.goBack();
  }, [isCreating, navigation]);

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
    title: t('onboarding.hardware-wallet-setup.title'),
    accountLabel: t('onboarding.hardware-wallet-setup.account-label'),
    instructionText: hasAccountSetup
      ? undefined
      : t(deviceImportInstructionKey(optionId)),
    derivationTypeLabel: t(
      'onboarding.hardware-wallet-setup.derivation-type-label',
    ),
    createButtonLabel: t('onboarding.hardware-wallet-setup.create-button'),
    notice: shouldShowTrezorSuiteNotice
      ? t('v2.account-details.add-wallet-hardware-setup.trezor-suite-notice')
      : undefined,
    noticeLinkLabel: shouldShowTrezorSuiteNotice
      ? t(
          'v2.account-details.add-wallet-hardware-setup.trezor-suite-notice-link',
        )
      : undefined,
    noticeLinkUrl: shouldShowTrezorSuiteNotice
      ? TREZOR_SUITE_DOWNLOAD_URL
      : undefined,
  };
};
