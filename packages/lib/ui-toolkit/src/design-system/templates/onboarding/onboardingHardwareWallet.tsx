import React, { useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { spacing, useTheme } from '../../../design-tokens';
import { Button, Text } from '../../atoms';
import { Blockchains, Logos } from '../../atoms/icons/customIcons';
import { NavigationHeader } from '../../molecules';
import { footerHeight, Sheet } from '../../organisms';

import { OnboardingLayout } from './OnboardingLayout';

import type {
  BlockchainIconName,
  LogoIconName,
} from '../../atoms/icons/customIcons';

export interface HardwareWalletDevice {
  id: string;
  name: string;
  models: string[];
  logo?: BlockchainIconName | LogoIconName;
}

export interface OnboardingHardwareWalletProps {
  title: string;
  subtitle: string;
  supportedDevices: HardwareWalletDevice[];
  instructionText: string;
  onBackPress: () => void;
  onConnect: () => void;
  /**
   * When provided, each listed device is pressable and selecting one routes by
   * device id (wired devices run the scan, air-gapped devices skip it).
   */
  onSelectDevice?: (deviceId: string) => void;
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
  onSelectDevice,
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
        onSelectDevice={onSelectDevice}
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
            <DeviceList
              supportedDevices={supportedDevices}
              onSelectDevice={onSelectDevice}
            />
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

/**
 * Sheet-hosted variant. Errors render above the device list because the list
 * can outgrow the sheet viewport, which would push a bottom-anchored error
 * below the fold; regular instructions keep the bottom slot.
 */
const EmbeddedHardwareWallet = ({
  subtitle,
  supportedDevices,
  instructionText,
  isError = false,
  onSelectDevice,
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

  const instruction = (
    <InstructionText
      variant="primary"
      style={instructionStyle}
      testID="onboarding-hw-instructions">
      {instructionText}
    </InstructionText>
  );

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

      {isError && instruction}

      <View style={styles.devicesContainer}>
        <DeviceList
          supportedDevices={supportedDevices}
          onSelectDevice={onSelectDevice}
        />
      </View>

      <View style={styles.spacer} />

      {!isError && instruction}
    </Sheet.Scroll>
  );
};

const DeviceList = ({
  supportedDevices,
  onSelectDevice,
}: {
  supportedDevices: HardwareWalletDevice[];
  onSelectDevice?: (deviceId: string) => void;
}) => (
  <>
    {supportedDevices.map(device => {
      const DeviceLogo = device.logo
        ? { ...Logos, ...Blockchains }[device.logo]
        : null;
      const content = (
        <>
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
        </>
      );

      if (onSelectDevice) {
        return (
          <Pressable
            style={deviceStyles.deviceOption}
            key={device.id}
            onPress={() => {
              onSelectDevice(device.id);
            }}
            testID={`hardware-wallet-device-select-${device.id}`}>
            {content}
          </Pressable>
        );
      }

      return (
        <View style={deviceStyles.deviceOption} key={device.id}>
          {content}
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
