import { type SheetScreenProps } from '@lace-lib/navigation';
import { FilterSheet, Sheet } from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useFiltersSheet } from './useFiltersSheet';

import type { SheetRoutes } from '@lace-lib/navigation';

export const DappExplorerFilters = ({
  navigation,
}: SheetScreenProps<SheetRoutes.DappFilterControls>) => {
  const sheetProps = useFiltersSheet();
  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={sheetProps.title}
          testID={`${sheetProps.testID ?? 'filter-sheet'}-header`}
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: sheetProps.cancelButtonLabel,
            onPress: sheetProps.onCancel,
            testID: `${sheetProps.testID ?? 'filter-sheet'}-cancel`,
          }}
          primaryButton={{
            label: sheetProps.confirmButtonLabel,
            onPress: sheetProps.onConfirm,
            testID: `${sheetProps.testID ?? 'filter-sheet'}-confirm`,
          }}
        />
      ),
    });
  }, [navigation, sheetProps]);

  return <FilterSheet {...sheetProps} />;
};
