import {
  Sheet,
  ThemeSelection as ThemeSelectionTemplate,
} from '@lace-lib/ui-toolkit';
import React, { useEffect } from 'react';

import { useThemeSelection } from './useThemeSelection';

import type { SheetRoutes, SheetScreenProps } from '@lace-lib/navigation';

export const ThemeSelection = ({
  navigation,
}: SheetScreenProps<SheetRoutes.ThemeSelection>) => {
  const {
    selectedTheme,
    options,
    onClose,
    onConfirm,
    handleThemeChange,
    confirmButtonText,
    cancelButtonText,
    sheetHeaderTitle,
  } = useThemeSelection();

  useEffect(() => {
    navigation.setOptions({
      header: (
        <Sheet.Header
          title={sheetHeaderTitle}
          testID="theme-selection-sheet-header"
        />
      ),
      footer: (
        <Sheet.Footer
          secondaryButton={{
            label: cancelButtonText,
            onPress: onClose,
            testID: 'theme-selection-sheet-cancel-button',
          }}
          primaryButton={{
            label: confirmButtonText,
            onPress: onConfirm,
            testID: 'theme-selection-sheet-confirm-button',
          }}
        />
      ),
    });
  }, [
    navigation,
    sheetHeaderTitle,
    cancelButtonText,
    confirmButtonText,
    onClose,
    onConfirm,
  ]);

  return (
    <ThemeSelectionTemplate
      options={options}
      selectedTheme={selectedTheme}
      handleThemeChange={handleThemeChange}
    />
  );
};
