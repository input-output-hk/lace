import { OnboardingHardwareWallet as OnboardingHardwareWalletTemplate } from '@lace-lib/ui-toolkit';
import React, { useMemo } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';

import { useAddWalletHardware } from './useAddWalletHardware';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

const SHEET_HEIGHT_RATIO = 0.9;

export const AddWalletHardware = (
  _props: SheetScreenProps<SheetRoutes.AddWalletHardware>,
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
  } = useAddWalletHardware();
  const { height: windowHeight } = useWindowDimensions();

  const containerStyle = useMemo(
    () => [styles.container, { height: windowHeight * SHEET_HEIGHT_RATIO }],
    [windowHeight],
  );

  return (
    <View style={containerStyle}>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
