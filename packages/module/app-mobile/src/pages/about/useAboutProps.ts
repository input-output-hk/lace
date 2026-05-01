import { useConfig, useUICustomisation } from '@lace-contract/app';
import { useTranslation } from '@lace-contract/i18n';
import { TabRoutes as NavigationTabRoutes } from '@lace-lib/navigation';
import { openUrl } from '@lace-lib/ui-toolkit';
import { nativeApplicationVersion, nativeBuildVersion } from 'expo-application';
import { useMemo, useCallback } from 'react';

import type { ListOptionType } from '../common';
import type { TabRoutes, TabScreenProps } from '@lace-lib/navigation';

const TERMS_AND_CONDITIONS_URL =
  process.env.EXPO_PUBLIC_TERMS_AND_CONDITIONS_URL;
const PRIVACY_POLICY_URL = process.env.EXPO_PUBLIC_PRIVACY_POLICY_URL;
const COOKIE_POLICY_URL = process.env.EXPO_PUBLIC_COOKIE_POLICY_URL;
const LACE_PAGE_URL = process.env.EXPO_PUBLIC_URL_LACE_PAGE;

export const useAboutProps = ({
  navigation,
}: TabScreenProps<TabRoutes.About>) => {
  const { t } = useTranslation();
  const { appConfig } = useConfig();

  const title = t('v2.pages.about.title');
  const subtitle = `${String(t('v2.pages.about.subtitle'))} v${String(
    nativeApplicationVersion ?? '0',
  )}.${String(nativeBuildVersion ?? '0')}`;

  const aboutPageUICustomisations = useUICustomisation(
    'addons.loadAboutPageUICustomisations',
  );

  const handleAccountManagement = useCallback(() => {
    navigation.navigate(NavigationTabRoutes.AccountCenter);
  }, []);

  const handleWebsite = useCallback(() => {
    if (!LACE_PAGE_URL) {
      return;
    }

    void openUrl({
      url: LACE_PAGE_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [LACE_PAGE_URL]);

  const handleTermsAndConditions = useCallback(() => {
    if (!TERMS_AND_CONDITIONS_URL) {
      return;
    }

    void openUrl({
      url: TERMS_AND_CONDITIONS_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [TERMS_AND_CONDITIONS_URL]);

  const handlePrivacyPolicy = useCallback(() => {
    if (!PRIVACY_POLICY_URL) {
      return;
    }

    void openUrl({
      url: PRIVACY_POLICY_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [PRIVACY_POLICY_URL]);

  const handleCookiePolicy = useCallback(() => {
    if (!COOKIE_POLICY_URL) {
      return;
    }

    void openUrl({
      url: COOKIE_POLICY_URL,
      onError: () => {
        // Error handling is done in the openUrl utility
      },
    });
  }, [COOKIE_POLICY_URL]);

  const aboutOptions: ListOptionType[] = useMemo(
    () => [
      {
        id: 'account-management',
        titleKey: t('v2.pages.about.options.account.title'),
        icon: 'Account',
        onPress: handleAccountManagement,
      },
      {
        id: 'website',
        titleKey: t('v2.pages.about.options.website.title'),
        icon: 'Link',
        onPress: handleWebsite,
      },
      {
        id: 'terms',
        titleKey: t('v2.pages.about.options.terms.title'),
        icon: 'Brochure',
        onPress: handleTermsAndConditions,
      },
      {
        id: 'privacy',
        titleKey: t('v2.pages.about.options.privacy.title'),
        icon: 'LockKey',
        onPress: handlePrivacyPolicy,
      },
      {
        id: 'cookie',
        titleKey: t('v2.pages.about.options.cookie.title'),
        icon: 'Settings',
        onPress: handleCookiePolicy,
      },
      ...(aboutPageUICustomisations?.flatMap(c =>
        c.options.map(option => ({
          ...option,
          titleKey: t(option.titleKey),
          onPress:
            option.onPress ??
            (() => {
              if (option.configKey) {
                const url = appConfig?.[option.configKey];
                if (typeof url === 'string' && url) {
                  void openUrl({ url, onError: () => {} });
                }
              }
            }),
        })),
      ) ?? []),
    ],
    [
      handleAccountManagement,
      handleWebsite,
      handleTermsAndConditions,
      handlePrivacyPolicy,
      handleCookiePolicy,
      aboutPageUICustomisations,
      t,
    ],
  );

  return {
    aboutOptions,
    title,
    subtitle,
  };
};
