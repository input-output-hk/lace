import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { spacing, useTheme } from '../../../../design-tokens';
import { Text, Icon, Loader } from '../../../atoms';
import { footerHeight, Sheet } from '../../../organisms';

import type { Theme } from '../../../../design-tokens/theme/types';
import type { IconName } from '../../../atoms/icons/Icon';

interface HardwareWalletDevice {
  id: string;
  name: string;
  icon: IconName;
}

interface HardwareWalletDiscoveryResultsProps {
  devices: HardwareWalletDevice[];
  onDeviceSelect: (device: HardwareWalletDevice) => void;
  statusText: string;
  instructionText: string;
  detailText: string;
  linkText: string;
  onCancel?: () => void;
  testID?: string;
}

export const HardwareWalletDiscoveryResults = ({
  devices,
  onDeviceSelect,
  statusText,
  instructionText,
  detailText,
  linkText,
  onCancel,
  testID = 'hardware-wallet-discovery-results-sheet',
}: HardwareWalletDiscoveryResultsProps) => {
  const { theme } = useTheme();
  const styles = useMemo(
    () => getStyles(theme, onCancel ? footerHeight.horizontal : 0),
    [theme, onCancel, footerHeight],
  );

  return (
    <Sheet.Scroll
      testID={testID}
      contentContainerStyle={styles.contentContainer}>
      <View style={styles.content}>
        {devices.length > 0 && (
          <View style={styles.deviceList}>
            {devices.map(device => (
              <Pressable
                key={device.id}
                onPress={() => {
                  onDeviceSelect(device);
                }}
                testID={`device-${device.id}`}
                style={styles.deviceRow}>
                <View style={styles.deviceIcon}>
                  <Icon name={device.icon} size={24} />
                </View>
                <Text.M style={styles.deviceName}>{device.name}</Text.M>
                <Icon name="CaretRight" size={16} />
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.searchingSection}>
          <Loader size={48} color={theme.text.primary} />
          <Text.M style={styles.statusText}>{statusText}</Text.M>
          <View style={styles.instructionContainer}>
            <Icon name="InformationCircle" size={16} />
            <Text.S style={styles.instructionText}>{instructionText}</Text.S>
          </View>
          <Text.S style={styles.detailText}>
            {detailText} <Text.S style={styles.linkText}>{linkText}</Text.S>
          </Text.S>
        </View>
      </View>
    </Sheet.Scroll>
  );
};

const getStyles = (theme: Theme, paddingBottom: number) =>
  StyleSheet.create({
    contentContainer: {
      paddingBottom,
    },
    content: {
      flex: 1,
      gap: spacing.L,
    },
    deviceList: {
      gap: spacing.S,
    },
    deviceRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.S,
      paddingHorizontal: spacing.M,
      paddingVertical: spacing.M,
    },
    deviceIcon: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    deviceName: {
      flex: 1,
    },
    searchingSection: {
      alignItems: 'center',
      gap: spacing.M,
      paddingTop: spacing.L,
    },
    statusText: {
      textAlign: 'center',
    },
    instructionContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.XS,
    },
    instructionText: {
      textAlign: 'center',
    },
    detailText: {
      textAlign: 'center',
      paddingHorizontal: spacing.M,
    },
    linkText: {
      color: theme.brand.ascending,
    },
  });
