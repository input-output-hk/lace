import { useTranslation } from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useState, useCallback, useEffect } from 'react';

import { useLaceSelector, useDispatchLaceAction } from '../../hooks';

import type { ThemePreference } from '../../store/slice';
import type { IconName } from '@lace-lib/ui-toolkit';

export const useThemeSelection = () => {
  const { t } = useTranslation();

  const currentThemePreference = useLaceSelector('ui.getThemePreference');
  const setThemePreference = useDispatchLaceAction('ui.setThemePreference');

  const [selectedTheme, setSelectedTheme] = useState<ThemePreference>(
    currentThemePreference,
  );

  const confirmButtonText = t('v2.sheets.theme.confirm');
  const cancelButtonText = t('v2.sheets.theme.cancel');
  const sheetHeaderTitle = t('v2.sheets.theme.title');

  useEffect(() => {
    setSelectedTheme(currentThemePreference);
  }, [currentThemePreference]);

  const options = [
    {
      label: t('v2.sheets.theme.system'),
      value: 'system',
      preIcon: 'SmartPhone' as IconName,
    },
    {
      label: t('v2.sheets.theme.light'),
      value: 'light',
      preIcon: 'Sun' as IconName,
    },
    {
      label: t('v2.sheets.theme.dark'),
      value: 'dark',
      preIcon: 'Moon' as IconName,
    },
  ];

  const onClose = useCallback(() => {
    NavigationControls.sheets.close();
  }, []);

  const onConfirm = useCallback(() => {
    if (selectedTheme !== currentThemePreference) {
      setThemePreference(selectedTheme);
    }
    NavigationControls.sheets.close();
  }, [selectedTheme, currentThemePreference, setThemePreference]);

  const handleThemeChange = useCallback((value: string) => {
    setSelectedTheme(value as ThemePreference);
  }, []);

  return {
    selectedTheme,
    options,
    onClose,
    onConfirm,
    handleThemeChange,
    t,
    confirmButtonText,
    cancelButtonText,
    sheetHeaderTitle,
  };
};
