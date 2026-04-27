import { useAnalytics } from '@lace-contract/analytics';
import {
  availableLanguages,
  getSystemLanguage,
  useTranslation,
} from '@lace-contract/i18n';
import { NavigationControls } from '@lace-lib/navigation';
import { useCallback, useMemo, useState } from 'react';

import { useDispatchLaceAction, useLaceSelector } from '../../hooks';

import type { SupportedLanguage } from '@lace-contract/i18n';

export const useLanguageSheet = () => {
  const { t } = useTranslation();
  const { trackEvent } = useAnalytics();
  const storedLanguage = useLaceSelector('views.selectLanguage');
  const hasExplicitPreference = useLaceSelector(
    'views.selectHasExplicitLanguagePreference',
  );
  const setLanguage = useDispatchLaceAction('views.setLanguage');

  // Derive the effective language (what's actually being used by the app)
  const selectedLanguage = hasExplicitPreference
    ? storedLanguage
    : getSystemLanguage();

  const [temporarySelectedLanguage, setTemporarySelectedLanguage] =
    useState<SupportedLanguage>(selectedLanguage);

  const handleLanguageSelect = useCallback(
    (language: string) => {
      trackEvent('language selection | language | press', { language });
      setTemporarySelectedLanguage(language as SupportedLanguage);
    },
    [trackEvent],
  );

  const handleCancel = useCallback(() => {
    trackEvent('language selection | cancel | press');
    setTemporarySelectedLanguage(selectedLanguage);
    NavigationControls.sheets.close();
  }, [selectedLanguage, trackEvent]);

  const onConfirm = useCallback(() => {
    setLanguage(temporarySelectedLanguage);
    trackEvent('language selection | confirm | press', {
      language: temporarySelectedLanguage,
    });
    NavigationControls.sheets.close();
  }, [temporarySelectedLanguage, setLanguage, trackEvent]);

  const title = t('v2.pages.settings.options.language');
  const description = t('v2.pages.settings.options.language.description');
  const cancelLabel = t('v2.sheets.language.cancel');
  const confirmLabel = t('v2.sheets.language.confirm');
  const radioOptions = useMemo(
    () =>
      availableLanguages.map(language => ({
        label: language.name,
        value: language.code,
      })),
    [],
  );

  return {
    title,
    description,
    radioOptions,
    value: temporarySelectedLanguage,
    onChange: handleLanguageSelect,
    onClose: handleCancel,
    onConfirm,
    cancelLabel,
    confirmLabel,
  };
};
