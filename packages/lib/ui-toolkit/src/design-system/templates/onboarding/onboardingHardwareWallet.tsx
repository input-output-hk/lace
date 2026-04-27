import React from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { Logos } from '../../atoms/icons/customIcons';
import { NavigationHeader } from '../../molecules';

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
}: OnboardingHardwareWalletProps) => {
  const styles = createStyles();

  return (
    <OnboardingLayout>
      <View style={styles.container}>
        <NavigationHeader title={title} onBackPress={onBackPress} />

        <View style={styles.content}>
          {/* Subtitle */}
          <View style={styles.subtitleContainer}>
            <Text.S
              variant="primary"
              style={styles.subtitle}
              testID="onboarding-hw-subtitle">
              {subtitle}
            </Text.S>
          </View>

          {/* Supported Devices */}
          <View style={styles.devicesContainer}>
            {supportedDevices.map(device => {
              const DeviceLogo = device.logo ? Logos[device.logo] : null;

              return (
                <View style={styles.deviceOption} key={device.id}>
                  {DeviceLogo && (
                    <DeviceLogo
                      style={styles.deviceLogo}
                      testID={`hardware-wallet-device-logo-${device.id}`}
                    />
                  )}
                  <View style={styles.deviceInfo}>
                    <Text.S
                      variant="primary"
                      testID={`hardware-wallet-device-models-${device.id}`}>
                      {device.models.join(', ')}
                    </Text.S>
                  </View>
                </View>
              );
            })}
          </View>

          {/* Instructions */}
          <View style={styles.instructionContainer}>
            <Text.S
              variant="primary"
              style={styles.instructionText}
              testID="onboarding-hw-instructions">
              {instructionText}
            </Text.S>
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

const createStyles = () =>
  StyleSheet.create({
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
    subtitle: {
      textAlign: 'center',
    },
    devicesContainer: {
      flex: 1,
      gap: spacing.XXL,
      marginBottom: spacing.XL,
      justifyContent: 'center',
      alignItems: 'center',
    },
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
    instructionContainer: {
      marginBottom: spacing.XL,
      paddingHorizontal: spacing.S,
    },
    instructionText: {
      textAlign: 'center',
    },
  });
