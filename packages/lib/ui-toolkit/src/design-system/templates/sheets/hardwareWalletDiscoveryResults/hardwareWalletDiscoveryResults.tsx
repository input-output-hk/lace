import React, { useMemo } from 'react';
import { StyleSheet, View, Pressable } from 'react-native';

import { spacing } from '../../../../design-tokens';
import { Text, Icon } from '../../../atoms';
import { SheetFooter, SheetHeader, useFooterHeight } from '../../../molecules';
import { Sheet } from '../../../organisms';

import type { IconName } from '../../../atoms/icons/Icon';

interface HardwareWalletDevice {
  id: string;
  name: string;
  icon: IconName;
}

interface HardwareWalletDiscoveryResultsProps {
  title: string;
  devices: HardwareWalletDevice[];
  onDeviceSelect: (device: HardwareWalletDevice) => void;
  onClose?: () => void;
  closeButtonLabel?: string;
  testID?: string;
  closeButtonTestID?: string;
}

export const HardwareWalletDiscoveryResults = ({
  title,
  devices,
  onDeviceSelect,
  onClose,
  closeButtonLabel = 'Close',
  testID = 'hardware-wallet-discovery-results-sheet',
  closeButtonTestID = 'hardware-wallet-discovery-results-close-button',
}: HardwareWalletDiscoveryResultsProps) => {
  const footerHeight = useFooterHeight();
  const styles = useMemo(
    () => getStyles(onClose ? footerHeight : 0),
    [onClose, footerHeight],
  );

  return (
    <>
      <SheetHeader title={title} />
      <Sheet.Scroll
        testID={testID}
        contentContainerStyle={styles.contentContainer}>
        <View style={styles.content}>
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
        </View>
      </Sheet.Scroll>
      {onClose && (
        <SheetFooter
          secondaryButton={{
            label: closeButtonLabel,
            onPress: onClose,
            testID: closeButtonTestID,
          }}
        />
      )}
    </>
  );
};

const getStyles = (paddingBottom: number) =>
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
  });
