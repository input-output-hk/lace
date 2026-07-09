import { NetworkSelectionSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useNetworkSheet } from './useNetworkSheet';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const NetworkSheet = ({
  navigation,
}: SheetScreenProps<SheetRoutes.NetworkSelection>) => {
  const networkSheetProps = useNetworkSheet();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={networkSheetProps.title}
          testID="network-selection-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: networkSheetProps.cancelLabel,
            onPress: networkSheetProps.onClose,
            testID: 'network-selection-sheet-cancel-button',
          }}
          primaryButton={{
            label: networkSheetProps.confirmLabel,
            onPress: networkSheetProps.onConfirm,
            testID: 'network-selection-sheet-confirm-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    networkSheetProps.title,
    networkSheetProps.cancelLabel,
    networkSheetProps.confirmLabel,
    networkSheetProps.onClose,
    networkSheetProps.onConfirm,
  ]);

  return <NetworkSelectionSheet {...networkSheetProps} />;
};
