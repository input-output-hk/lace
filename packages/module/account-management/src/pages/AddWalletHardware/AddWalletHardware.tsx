import {
  OnboardingHardwareWallet as OnboardingHardwareWalletTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useAddWalletHardware } from './useAddWalletHardware';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const AddWalletHardware = ({
  navigation,
}: SheetScreenProps<SheetRoutes.AddWalletHardware>) => {
  const {
    title,
    subtitle,
    supportedDevices,
    instructionText,
    onBackPress,
    onConnect,
    onSelectDevice,
    connectButtonLabel,
    isConnecting,
    error,
    isError,
  } = useAddWalletHardware();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          showDivider={false}
          primaryButton={{
            label: connectButtonLabel,
            onPress: onConnect,
            testID: 'onboarding-hw-connect-button',
          }}
        />
      ),
    });
  }, [navigation, title, onConnect, connectButtonLabel]);

  return (
    <OnboardingHardwareWalletTemplate
      embedded
      title={title}
      subtitle={subtitle}
      supportedDevices={supportedDevices}
      instructionText={error ?? instructionText}
      onBackPress={onBackPress}
      onConnect={onConnect}
      onSelectDevice={onSelectDevice}
      connectButtonLabel={connectButtonLabel}
      isLoading={isConnecting}
      isError={isError}
    />
  );
};
