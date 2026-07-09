import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { Logos } from '../../atoms/icons/customIcons';
import { NavigationHeader } from '../../molecules';
import { footerHeight, Sheet } from '../../organisms';

import { OnboardingLayout } from './OnboardingLayout';

import type { LogoIconName } from '../../atoms/icons/customIcons';

export interface HardwareWalletDevice {
  id: string;
  name: string;
  models: string[];
  logo?: LogoIconName;
}

export interface OnboardingHardwareWalletProps {
  title: string;
  subtitle: string;
  supportedDevices: HardwareWalletDevice[];
  instructionText: string;
  onBackPress: () => void;
  onConnect: () => void;
  connectButtonLabel: string;
  isLoading?: boolean;
  isError?: boolean;
  // Use the sheet layout (SheetHeader + scroll + anchored SheetFooter) instead
  // of the full-screen OnboardingLayout. Set when hosting inside a sheet.
  embedded?: boolean;
}

export const OnboardingHardwareWallet = ({
  title,
  subtitle,
  supportedDevices,
  instructionText,
  onBackPress,
  onConnect,
  connectButtonLabel,
  isLoading = false,
  isError = false,
  embedded = false,
}: OnboardingHardwareWalletProps) => {
  const { theme } = useTheme();

  if (embedded) {
    return (
      <EmbeddedHardwareWallet
        subtitle={subtitle}
        supportedDevices={supportedDevices}
        instructionText={instructionText}
        isError={isError}
      />
    );
  }

  const InstructionText = isError ? Text.M : Text.S;
  const instructionStyle = isError
    ? [fullScreenStyles.centered, { color: theme.data.negative }]
    : fullScreenStyles.centered;

  return (
    <OnboardingLayout>
      <View style={fullScreenStyles.container}>
        <NavigationHeader title={title} onBackPress={onBackPress} />

        <View style={fullScreenStyles.content}>
          <View style={fullScreenStyles.subtitleContainer}>
            <Text.S
              variant="primary"
              style={fullScreenStyles.centered}
              testID="onboarding-hw-subtitle">
              {subtitle}
            </Text.S>
          </View>

          <View style={fullScreenStyles.devicesContainer}>
            <DeviceList supportedDevices={supportedDevices} />
          </View>

          <View style={fullScreenStyles.instructionContainer}>
            <InstructionText
              variant="primary"
              style={instructionStyle}
              testID="onboarding-hw-instructions">
              {instructionText}
            </InstructionText>
          </View>

          <Button.Primary
            label={connectButtonLabel}
            onPress={onConnect}
            disabled={isLoading}
            testID="onboarding-hw-connect-button"
          />
        </View>
      </View>
    </OnboardingLayout>
  );
};

type EmbeddedProps = Omit<
  OnboardingHardwareWalletProps,
  | 'connectButtonLabel'
  | 'embedded'
  | 'isLoading'
  | 'onBackPress'
  | 'onConnect'
  | 'title'
>;

const EmbeddedHardwareWallet = ({
  subtitle,
  supportedDevices,
  instructionText,
  isError = false,
}: EmbeddedProps) => {
  const { theme } = useTheme();
  const styles = useMemo(
    () => embeddedStyles(footerHeight.horizontal),
    [footerHeight],
  );

  const InstructionText = isError ? Text.M : Text.S;
  const instructionStyle = isError
    ? [styles.centered, { color: theme.data.negative }]
    : styles.centered;

  return (
    <Sheet.Scroll
      testID="onboarding-hw-sheet"
      contentContainerStyle={styles.contentContainer}>
      <Text.S
        variant="primary"
        style={styles.centered}
        testID="onboarding-hw-subtitle">
        {subtitle}
      </Text.S>

      <View style={styles.devicesContainer}>
        <DeviceList supportedDevices={supportedDevices} />
      </View>

      <View style={styles.spacer} />

      <InstructionText
        variant="primary"
        style={instructionStyle}
        testID="onboarding-hw-instructions">
        {instructionText}
      </InstructionText>
    </Sheet.Scroll>
  );
};

const DeviceList = ({
  supportedDevices,
}: {
  supportedDevices: HardwareWalletDevice[];
}) => (
  <>
    {supportedDevices.map(device => {
      const DeviceLogo = device.logo ? Logos[device.logo] : null;
      return (
        <View style={deviceStyles.deviceOption} key={device.id}>
          {DeviceLogo && (
            <DeviceLogo
              style={deviceStyles.deviceLogo}
              testID={`hardware-wallet-device-logo-${device.id}`}
            />
          )}
          <View style={deviceStyles.deviceInfo}>
            <Text.S
              variant="primary"
              testID={`hardware-wallet-device-models-${device.id}`}>
              {device.models.join(', ')}
            </Text.S>
          </View>
        </View>
      );
    })}
  </>
);

const fullScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: spacing.L,
  },
  subtitleContainer: {
    marginBottom: spacing.XL,
  },
  centered: {
    textAlign: 'center',
  },
  devicesContainer: {
    flex: 1,
    gap: spacing.XXL,
    marginBottom: spacing.XL,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionContainer: {
    marginBottom: spacing.XL,
    paddingHorizontal: spacing.S,
  },
});

const embeddedStyles = (footerHeight: number) =>
  StyleSheet.create({
    contentContainer: {
      flexGrow: 1,
      paddingBottom: footerHeight,
      gap: spacing.XL,
      alignItems: 'center',
    },
    centered: {
      textAlign: 'center',
      paddingHorizontal: spacing.S,
    },
    devicesContainer: {
      gap: spacing.XXL,
      alignItems: 'center',
      paddingVertical: spacing.M,
    },
    spacer: {
      flex: 1,
    },
  });

const deviceStyles = StyleSheet.create({
  deviceOption: {
    marginBottom: spacing.M,
    alignItems: 'center',
  },
  deviceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.M,
  },
  deviceLogo: {
    width: 120,
    height: 40,
  },
});
