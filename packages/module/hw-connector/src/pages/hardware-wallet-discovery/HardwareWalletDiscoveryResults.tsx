import {
  HardwareWalletDiscoveryResults as HardwareWalletDiscoveryResultsTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useHardwareWalletDiscoveryResults } from './useHardwareWalletDiscoveryResults';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const HardwareWalletDiscoveryResults = ({
  navigation,
}: SheetScreenProps<SheetRoutes.HardwareWalletDiscoveryResults>) => {
  const {
    title,
    devices,
    onDeviceSelect,
    onCancel,
    statusText,
    instructionText,
    detailText,
    linkText,
    cancelButtonLabel,
  } = useHardwareWalletDiscoveryResults();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: onCancel && (
        <Sheet.Footer
          secondaryButton={{
            label: cancelButtonLabel,
            onPress: onCancel,
            testID: 'hardware-wallet-discovery-results-cancel-button',
          }}
        />
      ),
    });
  }, [navigation, title]);

  return (
    <HardwareWalletDiscoveryResultsTemplate
      devices={devices}
      onDeviceSelect={onDeviceSelect}
      onCancel={onCancel}
      statusText={statusText}
      instructionText={instructionText}
      detailText={detailText}
      linkText={linkText}
    />
  );
};
