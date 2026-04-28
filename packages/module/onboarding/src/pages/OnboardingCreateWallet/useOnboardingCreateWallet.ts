import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import { StackRoutes, TabRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  useDispatchLaceAction,
  useLaceSelector,
  useLoadModules,
} from '../../hooks';
import { toAccountOption } from '../utils';

import type { InMemoryWalletIntegration } from '@lace-contract/in-memory';
import type { StackScreenProps } from '@lace-lib/navigation';
import type { AccountOption } from '@lace-lib/ui-toolkit/src/design-system/templates/onboarding/onboardingCreateWallet';
import type { BlockchainName } from '@lace-lib/util-store';

const updateBlockchainSelection = (
  current: BlockchainName[],
  blockchain: BlockchainName,
  shouldEnable: boolean,
): BlockchainName[] => {
  if (shouldEnable) {
    return current.includes(blockchain) ? current : [...current, blockchain];
  }

  // Don't allow deselecting the last blockchain
  if (current.length === 1) return current;

  return current.filter(name => name !== blockchain);
};

export const useOnboardingCreateWallet = ({
  navigation,
}: StackScreenProps<StackRoutes.OnboardingCreateWallet>) => {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();

  const attemptCreateWallet = useDispatchLaceAction(
    'onboardingV2.attemptCreateWallet',
  );
  const resetCreateWalletStatus = useDispatchLaceAction(
    'onboardingV2.resetCreateWalletStatus',
  );

  const pendingCreateWallet = useLaceSelector(
    'onboardingV2.selectPendingCreateWallet',
  );
  const isCreatingWallet = useLaceSelector(
    'onboardingV2.selectIsCreatingWallet',
  );
  const lastCreatedWalletId = useLaceSelector(
    'onboardingV2.selectLastCreatedWalletId',
  );
  const createWalletError = useLaceSelector(
    'onboardingV2.selectCreateWalletError',
  );

  const loadedIntegrations = useLoadModules(
    'addons.loadInMemoryWalletIntegration',
  ) as InMemoryWalletIntegration[] | undefined;
  const inMemoryWalletIntegrations = useMemo(
    () => loadedIntegrations ?? [],
    [loadedIntegrations],
  );

  const [selectedBlockchains, setSelectedBlockchains] = useState<
    BlockchainName[]
  >([]);
  const hasInitializedSelection = useRef(false);

  useEffect(() => {
    // This waits for the wallet to be created and then resets the status
    // We need to do this since there is now way yet to do a reset from
    // a side effect. TODO to check later maybe?
    if (!lastCreatedWalletId) return;

    resetCreateWalletStatus();
    navigation.reset({
      index: 0,
      routes: [
        {
          name: StackRoutes.Home,
          params: { screen: TabRoutes.Portfolio },
        } as never,
      ],
    });
  }, [lastCreatedWalletId, navigation, resetCreateWalletStatus]);

  // Track if we're navigating away to prevent re-triggers
  const isNavigatingToPasswordEntry = useRef(false);

  // Handle biometric authentication errors - fall back to password entry
  // This happens on Android when biometric→PIN fallback fails due to Keystore issues
  useEffect(() => {
    if (
      createWalletError === 'biometric-auth-failed' &&
      !isNavigatingToPasswordEntry.current
    ) {
      isNavigatingToPasswordEntry.current = true;
      // DON'T reset status here - it will be reset when user completes password entry
      // Resetting here allows handleFinishSetup to be called again before navigation completes
      try {
        navigation.navigate(StackRoutes.OnboardingDesktopLogin);
      } catch {
        isNavigatingToPasswordEntry.current = false;
      }
    }
  }, [createWalletError, navigation]);

  // Reset the navigation flag when component is focused again
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      isNavigatingToPasswordEntry.current = false;
      // Reset status when returning to this screen
      if (createWalletError) {
        resetCreateWalletStatus();
      }
    });
    return unsubscribe;
  }, [navigation, createWalletError, resetCreateWalletStatus]);

  useEffect(() => {
    if (!inMemoryWalletIntegrations.length || hasInitializedSelection.current) {
      return;
    }
    // Pre-select the first integration by default
    setSelectedBlockchains([inMemoryWalletIntegrations[0].blockchainName]);
    hasInitializedSelection.current = true;
  }, [inMemoryWalletIntegrations]);

  const toggleBlockchain = useCallback(
    (blockchainName: BlockchainName, enabled: boolean) => {
      setSelectedBlockchains(previous =>
        updateBlockchainSelection(previous, blockchainName, enabled),
      );
    },
    [],
  );

  const handleAccountToggle = useCallback(
    (accountId: string, value: boolean) => {
      trackEvent('onboarding | create wallet | toggle blockchain | press');
      const integration = inMemoryWalletIntegrations.find(
        ({ blockchainName }) => blockchainName.toLowerCase() === accountId,
      );
      if (!integration) return;

      toggleBlockchain(integration.blockchainName, value);
    },
    [inMemoryWalletIntegrations, toggleBlockchain, trackEvent],
  );

  const hasNoBlockchainsAndIsCreatingWallet = useMemo(() => {
    return selectedBlockchains.length === 0 || isCreatingWallet;
  }, [selectedBlockchains, isCreatingWallet]);

  const handleFinishSetup = useCallback(() => {
    // Prevent re-triggering while navigating to password entry
    if (isNavigatingToPasswordEntry.current) {
      return;
    }

    if (hasNoBlockchainsAndIsCreatingWallet || !pendingCreateWallet?.password)
      return;

    trackEvent('onboarding | create wallet | finish setup | press');

    const walletName = t('onboarding.create-wallet.default-wallet-name', {
      index: 0,
    });
    attemptCreateWallet({
      walletName,
      blockchains: selectedBlockchains,
      password: pendingCreateWallet?.password ?? '',
      recoveryPhrase: pendingCreateWallet?.recoveryPhrase ?? [],
    });
  }, [
    attemptCreateWallet,
    hasNoBlockchainsAndIsCreatingWallet,
    pendingCreateWallet?.recoveryPhrase,
    pendingCreateWallet?.password,
    selectedBlockchains,
    t,
    trackEvent,
  ]);

  const handleBackPress = useCallback(() => {
    trackEvent('onboarding | create wallet | back | press');
    navigation.goBack();
  }, [navigation, trackEvent]);

  const accounts = useMemo<AccountOption[]>(() => {
    if (!inMemoryWalletIntegrations.length) {
      return [];
    }

    return inMemoryWalletIntegrations.map(integration =>
      toAccountOption({
        blockchainName: integration.blockchainName,
        enabled: selectedBlockchains.includes(integration.blockchainName),
      }),
    );
  }, [inMemoryWalletIntegrations, selectedBlockchains]);

  const title = t('onboarding.create-wallet.title');
  const subtitle = t('onboarding.create-wallet.subtitle');
  const finishButtonLabel = t('onboarding.create-wallet.finish-setup');

  const isFinishDisabled = useMemo(() => {
    return (
      hasNoBlockchainsAndIsCreatingWallet ||
      !pendingCreateWallet?.password ||
      !inMemoryWalletIntegrations.length
    );
  }, [
    hasNoBlockchainsAndIsCreatingWallet,
    inMemoryWalletIntegrations.length,
    pendingCreateWallet?.password,
  ]);

  return {
    theme,
    title,
    subtitle,
    accounts,
    onAccountToggle: handleAccountToggle,
    onFinishSetup: handleFinishSetup,
    onBackPress: handleBackPress,
    finishButtonLabel,
    isFinishDisabled,
    isFinishLoading: isCreatingWallet,
    isAccountSelectionDisabled: isCreatingWallet,
  };
};
