import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { useHwWalletSetupForm } from '@lace-lib/util-hw/extension-ui';
import { useCallback, useEffect } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { StackScreenProps } from '@lace-lib/navigation';
import type { HardwareErrorCategory } from '@lace-lib/util-hw';

export const useOnboardingHardwareSetup = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.OnboardingHardwareSetup>) => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const { optionId, walletType, device, derivationTypes } = route.params;

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

  const {
    accountIndex,
    setAccountIndex,
    derivationType,
    handleDerivationTypeChange: setDerivationType,
    derivationTypeOptions,
    error,
  } = useHwWalletSetupForm({
    derivationTypes,
    errorCategory: createWalletError as HardwareErrorCategory | null,
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
    // TODO: use loadHwBlockchainSupport addon to show blockchain selector when > 1
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
    walletType,
    device,
    accountIndex,
    derivationType,
    trackEvent,
  ]);

  const handleBackPress = useCallback(() => {
    if (isCreating) return;
    navigation.goBack();
  }, [isCreating, navigation]);

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
    title: t('onboarding.hardware-wallet-setup.title'),
    accountLabel: t('onboarding.hardware-wallet-setup.account-label'),
    derivationTypeLabel: t(
      'onboarding.hardware-wallet-setup.derivation-type-label',
    ),
    createButtonLabel: t('onboarding.hardware-wallet-setup.create-button'),
  };
};
