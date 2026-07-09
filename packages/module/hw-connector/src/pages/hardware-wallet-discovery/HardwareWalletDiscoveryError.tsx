import {
  HardwareWalletDiscoveryError as HardwareWalletDiscoveryErrorTemplate,
  Sheet,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useHardwareWalletDiscoveryError } from './useHardwareWalletDiscoveryError';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const HardwareWalletDiscoveryError = ({
  navigation,
}: SheetScreenProps<SheetRoutes.HardwareWalletDiscoveryError>) => {
  const {
    title,
    errorMessage,
    instructionText,
    detailText,
    linkText,
    retryButtonLabel,
    cancelButtonLabel,
    onRetry,
    onClose,
  } = useHardwareWalletDiscoveryError();

  useEffect(() => {
    navigation.setOptions({
      header: <Sheet.Header title={title} />,
      footer: (
        <Sheet.Footer
          primaryButton={{
            label: retryButtonLabel,
            onPress: onRetry,
            testID: 'hardware-wallet-discovery-error-retry-button',
          }}
          secondaryButton={
            onClose
              ? {
                  label: cancelButtonLabel,
                  onPress: onClose,
                  testID: 'hardware-wallet-discovery-error-close-button',
                }
              : undefined
          }
        />
      ),
    });
  }, [navigation, title]);

  return (
    <HardwareWalletDiscoveryErrorTemplate
      errorMessage={errorMessage}
      instructionText={instructionText}
      detailText={detailText}
      linkText={linkText}
    />
  );
};
