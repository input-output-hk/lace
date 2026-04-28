import { OnboardingHardwareWallet as OnboardingHardwareWalletTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useOnboardingHardwareWallet } from './useOnboardingHardwareWallet';

import type { StackScreenProps, StackRoutes } from '@lace-lib/navigation';

export const OnboardingHardwareWallet = (
  props: StackScreenProps<StackRoutes.OnboardingHardware>,
) => {
  const {
    title,
    subtitle,
    supportedDevices,
    instructionText,
    onBackPress,
    onConnect,
    connectButtonLabel,
    isConnecting,
    error,
  } = useOnboardingHardwareWallet(props);

  return (
    <OnboardingHardwareWalletTemplate
      title={title}
      subtitle={subtitle}
      supportedDevices={supportedDevices}
      instructionText={error ?? instructionText}
      onBackPress={onBackPress}
      onConnect={onConnect}
      connectButtonLabel={connectButtonLabel}
      isLoading={isConnecting}
    />
  );
};
