import { useAnalytics } from '@lace-contract/analytics';
import { useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import {
  TabRoutes as NavigationTabRoutes,
  NavigationControls,
  SheetRoutes,
} from '@lace-lib/navigation';
import { useMemo, useCallback } from 'react';

import type { ListOptionType } from '../common';
import type { SettingsOption } from '@lace-contract/app';
import type { TabRoutes, TabScreenProps } from '@lace-lib/navigation';

export const useSettingsProps = ({
  navigation,
}: TabScreenProps<TabRoutes.Settings>) => {
  const { t } = useTranslation();
  const title = t('v2.pages.settings.title');
  const subtitle = t('v2.pages.settings.subtitle');
  const { trackEvent } = useAnalytics();

  const settingsCustomisations = useUICustomisation(
    'addons.loadSettingsPageUICustomisations',
  );

  const featureNames = {
    currency: t('v2.pages.settings.options.currency'),
    authorizedDapps: t('v2.pages.settings.options.authorized-dapps'),
  };

  const { currency, authorizedDapps } = featureNames;

  const handleAccountManagement = useCallback(() => {
    trackEvent('settings | account management | press');
    navigation.navigate(NavigationTabRoutes.AccountCenter);
  }, [navigation, trackEvent]);

  const handleTheme = useCallback(() => {
    trackEvent('settings | theme | press');
    NavigationControls.sheets.navigate(SheetRoutes.ThemeSelection);
  }, [trackEvent]);

  const handleNetwork = useCallback(() => {
    trackEvent('settings | network | press');
    NavigationControls.sheets.navigate(SheetRoutes.NetworkSelection);
  }, [trackEvent]);

  const handleLanguage = useCallback(() => {
    trackEvent('settings | language | press');
    NavigationControls.sheets.navigate(SheetRoutes.Language);
  }, [trackEvent]);

  const handleCurrency = useCallback(() => {
    trackEvent('settings | currency | press');
    NavigationControls.sheets.navigate(SheetRoutes.FiatCurrencySheet, {
      featureName: currency,
    });
  }, [currency, trackEvent]);

  const handleAuthorizedDApps = useCallback(() => {
    trackEvent('settings | authorized dapps | press');
    NavigationControls.sheets.navigate(SheetRoutes.AuthorizedDApps, {
      featureName: authorizedDapps,
    });
  }, [authorizedDapps, trackEvent]);

  const settingsOptionsFromCustomisations: SettingsOption[] = useMemo(
    () =>
      settingsCustomisations.flatMap(
        (customisation): SettingsOption[] =>
          customisation.SettingsOptions ?? [],
      ),
    [settingsCustomisations],
  );

  const settingsOptions = useMemo<ListOptionType[]>(() => {
    const options: ListOptionType[] = [
      {
        id: 'account',
        titleKey: t('v2.pages.settings.options.account.title'),
        subtitleKey: t('v2.pages.settings.options.account.subtitle'),
        icon: 'CarouselHorizontal',
        onPress: handleAccountManagement,
      },
      {
        id: 'theme',
        titleKey: t('v2.pages.settings.options.theme'),
        icon: 'PaintBucket',
        onPress: handleTheme,
      },
      {
        id: 'network',
        titleKey: t('v2.pages.settings.options.network'),
        icon: 'CellularNetwork',
        onPress: handleNetwork,
      },
      {
        id: 'language',
        titleKey: t('v2.pages.settings.options.language'),
        icon: 'Language',
        onPress: handleLanguage,
      },
      {
        id: 'currency',
        titleKey: t('v2.pages.settings.options.currency'),
        icon: 'Money',
        onPress: handleCurrency,
      },
      {
        id: 'authorized-dapps',
        titleKey: t('v2.pages.settings.options.authorized-dapps'),
        icon: 'Dashboard',
        onPress: handleAuthorizedDApps,
      },
    ];

    options.push(
      ...settingsOptionsFromCustomisations.map(option => ({
        id: option.id,
        titleKey: t(option.titleKey),
        subtitleKey: option.subtitleKey ? t(option.subtitleKey) : undefined,
        icon: option.icon,
        onPress: option.onPress,
      })),
    );

    return options;
  }, [
    handleAccountManagement,
    handleTheme,
    handleNetwork,
    handleLanguage,
    handleCurrency,
    handleAuthorizedDApps,
    settingsOptionsFromCustomisations,
    t,
  ]);

  return {
    settingsOptions,
    title,
    subtitle,
  };
};
