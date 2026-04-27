import { OnboardingDesktopLogin as OnboardingDesktopLoginTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useOnboardingDesktopLogin } from './useOnboardingDesktopLogin';

import type { StackScreenProps, StackRoutes } from '@lace-lib/navigation';

export const OnboardingDesktopLogin = (
  props: StackScreenProps<StackRoutes.OnboardingDesktopLogin>,
) => {
  const {
    headerTitle,
    newPasswordLabel,
    confirmPasswordLabel,
    nextButtonLabel,
    newPassword,
    onNewPasswordChange,
    confirmPassword,
    onConfirmPasswordChange,
    isNewPasswordVisible,
    onToggleNewPasswordVisibility,
    isConfirmPasswordVisible,
    onToggleConfirmPasswordVisibility,
    isNextDisabled,
    isNextLoading,
    onBackPress,
    onNext,
    passwordStrengthFeedback,
    inputError,
  } = useOnboardingDesktopLogin(props);

  return (
    <OnboardingDesktopLoginTemplate
      headerTitle={headerTitle}
      newPasswordLabel={newPasswordLabel}
      confirmPasswordLabel={confirmPasswordLabel}
      nextButtonLabel={nextButtonLabel}
      newPassword={newPassword}
      onNewPasswordChange={onNewPasswordChange}
      confirmPassword={confirmPassword}
      onConfirmPasswordChange={onConfirmPasswordChange}
      isNewPasswordVisible={isNewPasswordVisible}
      onToggleNewPasswordVisibility={onToggleNewPasswordVisibility}
      isConfirmPasswordVisible={isConfirmPasswordVisible}
      onToggleConfirmPasswordVisibility={onToggleConfirmPasswordVisibility}
      isNextDisabled={isNextDisabled}
      isNextLoading={isNextLoading}
      onBackPress={onBackPress}
      onNext={onNext}
      passwordStrengthFeedback={passwordStrengthFeedback}
      inputError={inputError}
    />
  );
};
