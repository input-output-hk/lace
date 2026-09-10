import { useAnalytics } from '@lace-contract/analytics';
import { useTranslation } from '@lace-contract/i18n';
import {
  clearPendingCreateWalletSecrets,
  setPendingCreateWalletSecrets,
} from '@lace-contract/onboarding-v2';
import { StackRoutes } from '@lace-lib/navigation';
import { useTheme } from '@lace-lib/ui-toolkit';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useDispatchLaceAction } from '../../hooks';
import { usePasswordStrength } from '../../hooks/usePasswordStrength';

import type { StackScreenProps } from '@lace-lib/navigation';

export const useOnboardingDesktopLogin = ({
  navigation,
  route,
}: StackScreenProps<StackRoutes.OnboardingDesktopLogin>) => {
  const hardwareSetup = route.params?.hardwareSetup;
  const { t } = useTranslation();
  const { theme } = useTheme();
  const { trackEvent } = useAnalytics();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isNewPasswordVisible, setIsNewPasswordVisible] = useState(false);
  const [isConfirmPasswordVisible, setIsConfirmPasswordVisible] =
    useState(false);

  const resetCreateWalletStatus = useDispatchLaceAction(
    'onboardingV2.resetCreateWalletStatus',
  );

  useEffect(() => {
    // Clear the status of the wallet creation, for example, if an
    // error occurs, we need to clear the status so that the user can try again
    resetCreateWalletStatus();
  }, [resetCreateWalletStatus]);

  const handleNext = useCallback(() => {
    trackEvent('onboarding | create password | next | press');
    if (!newPassword || newPassword !== confirmPassword) return;
    setPendingCreateWalletSecrets({ password: newPassword });
    if (hardwareSetup) {
      navigation.navigate(StackRoutes.OnboardingHardwareSetup, hardwareSetup);
    } else {
      navigation.navigate(StackRoutes.OnboardingCreateWallet);
    }
    setNewPassword('');
    setConfirmPassword('');
  }, [navigation, newPassword, confirmPassword, hardwareSetup, trackEvent]);

  const handleBackPress = useCallback(() => {
    trackEvent('onboarding | create password | back | press');
    // If we go back (either start or restore) we clear the pending
    // data so that the user can start again
    clearPendingCreateWalletSecrets();
    navigation.goBack();
  }, [navigation, trackEvent]);

  const toggleNewPasswordVisibility = useCallback(() => {
    trackEvent(
      'onboarding | create password | toggle password visibility | press',
    );
    setIsNewPasswordVisible(previous => !previous);
  }, [trackEvent]);

  const toggleConfirmPasswordVisibility = useCallback(() => {
    trackEvent(
      'onboarding | create password | toggle password visibility | press',
    );
    setIsConfirmPasswordVisible(previous => !previous);
  }, [trackEvent]);

  const { feedback: passwordStrengthFeedback, isStrong: isPasswordStrong } =
    usePasswordStrength(newPassword);

  const isNextDisabled = useMemo(() => {
    if (!newPassword || !confirmPassword) return true;
    if (newPassword !== confirmPassword) return true;
    if (!isPasswordStrong) return true;
    return false;
  }, [confirmPassword, newPassword, isPasswordStrong]);

  const headerTitle = t('onboarding.desktop-login.title');
  const newPasswordLabel = t('onboarding.desktop-login.new-password');
  const confirmPasswordLabel = t('onboarding.desktop-login.confirm-password');
  const nextButtonLabel = t('v2.generic.btn.next');
  const passwordMatchError = t('onboarding.desktop-login.password-match-error');
  // The unlock password is app-wide and cannot be reset, so warn on every
  // onboarding path — hardware included. Only the recovery *route* differs:
  // software wallets restore from the recovery phrase; hardware wallets restore
  // by reconnecting the device (the keys never leave it), so we pick the
  // matching copy rather than show phrase-based guidance to hardware users
  // (PR review of #2453).
  const passwordRecoveryNote = t(
    hardwareSetup
      ? 'onboarding.desktop-login.password-recovery-note-hardware'
      : 'onboarding.desktop-login.password-recovery-note',
  );

  const getInputError = useCallback((): string | undefined => {
    if (!newPassword || !confirmPassword) {
      return undefined;
    }
    if (newPassword !== confirmPassword) {
      return passwordMatchError;
    }
    return undefined;
  }, [newPassword, confirmPassword, passwordMatchError]);

  const inputError = getInputError();

  return {
    theme,
    headerTitle,
    newPasswordLabel,
    confirmPasswordLabel,
    nextButtonLabel,
    newPassword,
    onNewPasswordChange: setNewPassword,
    confirmPassword,
    onConfirmPasswordChange: setConfirmPassword,
    isNewPasswordVisible,
    onToggleNewPasswordVisibility: toggleNewPasswordVisibility,
    isConfirmPasswordVisible,
    onToggleConfirmPasswordVisibility: toggleConfirmPasswordVisibility,
    isNextDisabled,
    isNextLoading: false,
    onBackPress: handleBackPress,
    onNext: handleNext,
    passwordStrengthFeedback,
    inputError,
    passwordRecoveryNote,
  };
};
