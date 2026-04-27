import { ThemeSelection as ThemeSelectionTemplate } from '@lace-lib/ui-toolkit';
import React from 'react';

import { useThemeSelection } from './useThemeSelection';

export const ThemeSelection = () => {
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
  return (
    <ThemeSelectionTemplate
      options={options}
      selectedTheme={selectedTheme}
      handleThemeChange={handleThemeChange}
      onClose={onClose}
      onConfirm={onConfirm}
      confirmButtonText={confirmButtonText}
      cancelButtonText={cancelButtonText}
      sheetHeaderTitle={sheetHeaderTitle}
    />
  );
};
